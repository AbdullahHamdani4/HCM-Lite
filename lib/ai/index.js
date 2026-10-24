import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/auth/guard";
import { pkNow, addDays } from "@/lib/time";
import { listOrg } from "@/lib/services/org";
import { searchEmployees } from "@/lib/services/employees";
import { balances } from "@/lib/services/leave";
import { listPayslips } from "@/lib/services/payroll";
import { headcount, attendanceSummary, lateComers, leaveSummary, payrollSummary, defaultRange } from "@/lib/services/analytics";

const MODEL = "gemini-2.5-flash";
const ai = () => new GoogleGenAI({ apiKey: process.env.AI_API_KEY });

const POLICY = `Company policy (answer policy questions ONLY from this; otherwise say you don't know):
- Office starts 09:00 with 15 min grace; check-in after 09:15 is late. Under 5 hours worked is a half day. Weekend is Saturday and Sunday.
- No check-out = missing checkout. No record and no approved leave on a working day = absent. One check-in per day; time is stamped by the server.
- Leave counts working days only (weekends and public holidays skipped). Yearly quotas: annual 14, sick 8, casual 10; unpaid is unlimited. Overlapping or over-balance requests are rejected. HR approves or rejects; employees can cancel while pending.
- Payroll: gross = 1.5 x basic (HRA 40% + medical 10% of basic). Per-day = gross / working days. Deductions = (absent + unpaid leave + 0.5 x half days) x per-day. Joiners and leavers are prorated.
- Tax on annual gross: 0 up to 600k; 5% of the amount over 600k up to 1.2M; 30k + 15% over 1.2M up to 2.4M; 210k + 25% over 2.4M up to 3.6M; 510k + 35% above. Admin finalizes payroll; finalized months are locked.`;

const range = { from: { type: Type.STRING, description: "YYYY-MM-DD" }, to: { type: Type.STRING, description: "YYYY-MM-DD" }, department: { type: Type.STRING, description: "Department name" } };

const TOOLS = {
  get_headcount: { roles: ["admin", "hr"], description: "Active employee count, total and by department", params: { department: range.department } },
  get_attendance_summary: { roles: ["admin", "hr"], description: "Attendance counts, attendance rate and late % for a date range (defaults to this month)", params: range },
  get_late_comers: { roles: ["admin", "hr"], description: "Employees who came late most often in a range", params: range },
  get_leave_summary: { roles: ["admin", "hr"], description: "Pending requests, who is on leave today, approved days by type", params: range },
  get_my_leave_balance: { roles: ["employee"], description: "The current user's own leave balances this year", params: {} },
  get_my_attendance: { roles: ["employee"], description: "The current user's own attendance counts for a range", params: { from: range.from, to: range.to } },
  get_payroll_summary: { roles: ["admin", "hr", "employee"], description: "Admin/HR: payroll totals for a month. Employee: ONLY their own payslips.", params: { month: { type: Type.STRING, description: "YYYY-MM" } } },
  search_employees: { roles: ["admin", "hr"], description: "Find employees by name, email or code", params: { query: { type: Type.STRING } } },
};

async function deptId(name) {
  if (!name) return undefined;
  const d = (await listOrg("departments")).find((x) => x.name.toLowerCase() === String(name).toLowerCase());
  return d?.id ?? "__none__";
}

/** Tools reuse the same services and scope as the REST API. */
async function runTool(ctx, name, args) {
  const t = TOOLS[name];
  if (!t || !t.roles.includes(ctx.role)) return { error: "Not allowed for your role" };
  const { from, to } = defaultRange(args.from, args.to);
  const dept = await deptId(args.department);
  switch (name) {
    case "get_headcount": return headcount({ dept });
    case "get_attendance_summary": { const s = await attendanceSummary({ from, to, dept }); delete s.rows; return s; }
    case "get_late_comers": return lateComers({ from, to, dept });
    case "get_leave_summary": return leaveSummary({ from, to, dept });
    case "get_my_leave_balance": return balances(ctx.employeeId);
    case "get_my_attendance": { const s = await attendanceSummary({ from, to }); return { counts: s.rows.filter((r) => r.employeeId === ctx.employeeId).reduce((c, r) => ((c[r.status] = (c[r.status] || 0) + 1), c), {}) }; }
    case "get_payroll_summary":
      if (ctx.role === "employee") return { myPayslips: (await listPayslips(ctx)).map(({ month, gross, deduction, tax, net }) => ({ month, gross, deduction, tax, net })) };
      return payrollSummary({ month: args.month });
    case "search_employees": return (await searchEmployees(ctx, { q: args.query, size: 10 })).items.map(({ code, name, email, departmentId, status }) => ({ code, name, email, departmentId, status }));
  }
}

async function rateLimit(ctx) {
  const since = new Date(Date.now() - 3600_000).toISOString();
  const snap = await db().collection("aiLogs").where("uid", "==", ctx.uid).get();
  if (snap.docs.filter((d) => d.data().at > since).length >= 20) throw new HttpError(429, "You've hit the AI limit (20 per hour). Try again later.");
}

const log = (ctx, kind, input, output, ok) =>
  db().collection("aiLogs").add({ uid: ctx.uid, role: ctx.role, kind, input, output: String(output).slice(0, 2000), ok, at: new Date().toISOString() });

const withTimeout = (p, ms = 15000) => Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error("timeout")), ms))]);

export async function chat(ctx, messages) {
  await rateLimit(ctx);
  const today = pkNow().date;
  const system = `You are the HCM Lite assistant. Today is ${today}. The user is ${ctx.name}, role: ${ctx.role}.
Use tools for ANY number; never invent data. Keep answers short and plain. Use PKR for money.
${ctx.role === "employee" ? "This user is an Employee: they may only see their OWN data. If they ask about another person's salary, attendance or leave, politely refuse and explain it's private." : ""}
${POLICY}`;
  const decls = Object.entries(TOOLS).filter(([, t]) => t.roles.includes(ctx.role)).map(([name, t]) => ({
    name, description: t.description, parameters: { type: Type.OBJECT, properties: t.params },
  }));
  const contents = messages.slice(-10).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.content }] }));
  const input = messages.at(-1)?.content ?? "";
  try {
    for (let i = 0; i < 4; i++) {
      const res = await withTimeout(ai().models.generateContent({ model: MODEL, contents, config: { systemInstruction: system, tools: [{ functionDeclarations: decls }] } }));
      const calls = res.functionCalls ?? [];
      if (!calls.length) {
        await log(ctx, "chat", input, res.text, true);
        return { answer: res.text ?? "I couldn't find an answer." };
      }
      contents.push(res.candidates[0].content);
      const parts = [];
      for (const c of calls) parts.push({ functionResponse: { name: c.name, response: { result: await runTool(ctx, c.name, c.args ?? {}) } } });
      contents.push({ role: "user", parts });
    }
    return { answer: "That took too many steps. Try a simpler question." };
  } catch (e) {
    await log(ctx, "chat", input, e.message, false);
    if (e instanceof HttpError) throw e;
    return { answer: "The assistant is unavailable right now. Please use the dashboard, or try again in a moment.", fallback: true };
  }
}

export async function summarize(ctx, kpis) {
  await rateLimit(ctx);
  try {
    const res = await withTimeout(ai().models.generateContent({
      model: MODEL,
      contents: `Write 3 to 5 short insight bullets for an HR manager using ONLY these numbers. No invented figures. Plain text, each line starting with "- ".\n${JSON.stringify(kpis)}`,
    }));
    await log(ctx, "summary", "kpis", res.text, true);
    return { bullets: res.text.split("\n").map((l) => l.replace(/^[-*•]\s*/, "").trim()).filter(Boolean).slice(0, 5) };
  } catch (e) {
    await log(ctx, "summary", "kpis", e.message, false);
    return { bullets: [], fallback: true };
  }
}

const SmartLeave = z.object({
  type: z.enum(["annual", "sick", "casual", "unpaid"]),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1),
});

/** Sentence → validated JSON. Never saves; the user confirms the pre-filled form. */
export async function smartLeave(ctx, text) {
  await rateLimit(ctx);
  const today = pkNow().date;
  const weekday = new Date(today + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
  const next7 = Array.from({ length: 14 }, (_, i) => { const d = addDays(today, i + 1); return `${d} ${new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" })}`; }).join(", ");
  const prompt = `Today is ${today} (${weekday}). Upcoming dates: ${next7}.
Extract a leave request from the text. Types: annual (vacation/planned), sick (illness), casual (personal events like weddings, errands), unpaid (if stated).
The text may be English or Roman Urdu. Return JSON {type, start, end, reason} with dates as YYYY-MM-DD.
Text: "${text}"`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await withTimeout(ai().models.generateContent({ model: MODEL, contents: prompt, config: { responseMimeType: "application/json" } }));
      const parsed = SmartLeave.parse(JSON.parse(res.text));
      if (parsed.end < parsed.start) parsed.end = parsed.start;
      const t = (await listOrg("leaveTypes")).find((x) => x.code === parsed.type);
      await log(ctx, "smart_leave", text, res.text, true);
      return { ...parsed, typeId: t?.id ?? "" };
    } catch (e) {
      if (attempt === 1) {
        await log(ctx, "smart_leave", text, e.message, false);
        return { fallback: true };
      }
    }
  }
}
