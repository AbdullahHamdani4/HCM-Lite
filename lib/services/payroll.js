import { db } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/auth/guard";
import { eachDay, monthRange } from "@/lib/time";
import { getSettings, holidaySet, isWorkingDay, audit, notify } from "./org";
import { allEmployees } from "./employees";
import { computeDays } from "./attendance";

/** Illustrative slab on annual gross. */
export function annualTax(annual) {
  if (annual <= 600000) return 0;
  if (annual <= 1200000) return (annual - 600000) * 0.05;
  if (annual <= 2400000) return 30000 + (annual - 1200000) * 0.15;
  if (annual <= 3600000) return 210000 + (annual - 2400000) * 0.25;
  return 510000 + (annual - 3600000) * 0.35;
}

export function salaryBreakup(basic) {
  return { basic, hra: basic * 0.4, medical: basic * 0.1, gross: basic * 1.5 };
}

const r2 = (n) => Math.round(n * 100) / 100;

/** HR creates (or re-creates) the draft for a month. Locked once finalized. */
export async function createDraft(ctx, month) {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new HttpError(400, "Month must be YYYY-MM");
  const runRef = db().collection("payrollRuns").doc(month);
  const existing = (await runRef.get()).data();
  if (existing?.status === "finalized") throw new HttpError(423, "This month is finalized and locked");

  const { from, to } = monthRange(month);
  const [s, h, emps, days] = await Promise.all([getSettings(), holidaySet(), allEmployees(), computeDays({ from, to })]);
  const monthWorking = eachDay(from, to).filter((d) => isWorkingDay(d, s, h));

  const batch = db().batch();
  const slips = [];
  for (const e of emps) {
    if (e.joinDate > to || (e.exitDate && e.exitDate < from)) continue;
    if (e.status === "inactive" && !e.exitDate) continue;
    const employed = monthWorking.filter((d) => d >= e.joinDate && (!e.exitDate || d <= e.exitDate)).length;
    const mine = days.filter((r) => r.employeeId === e.id);
    const absent = mine.filter((r) => r.status === "absent").length;
    const unpaid = mine.filter((r) => r.status === "on_leave" && r.unpaid).length;
    const halfDays = mine.filter((r) => r.status === "half_day").length;
    const b = salaryBreakup(e.basic);
    const perDay = b.gross / monthWorking.length;
    const prorated = perDay * employed;
    const deduction = perDay * (absent + unpaid + 0.5 * halfDays);
    const tax = annualTax(b.gross * 12) / 12;
    const net = Math.max(0, prorated - deduction - tax);
    const slip = {
      month, employeeId: e.id, uid: e.uid, name: e.name, code: e.code, departmentId: e.departmentId,
      ...Object.fromEntries(Object.entries(b).map(([k, v]) => [k, r2(v)])),
      workingDays: monthWorking.length, employedDays: employed, absent, unpaid, halfDays,
      perDay: r2(perDay), proratedGross: r2(prorated), deduction: r2(deduction), tax: r2(tax), net: r2(net), status: "draft",
    };
    slips.push(slip);
    batch.set(db().collection("payslips").doc(`${month}_${e.id}`), slip);
  }
  const run = {
    month, status: "draft", employees: slips.length,
    totalGross: r2(slips.reduce((a, x) => a + x.proratedGross, 0)),
    totalNet: r2(slips.reduce((a, x) => a + x.net, 0)),
    totalTax: r2(slips.reduce((a, x) => a + x.tax, 0)),
    createdBy: ctx.name, createdAt: new Date().toISOString(),
  };
  batch.set(runRef, run);
  await batch.commit();
  await audit(ctx, existing ? "regenerate" : "create", "payroll", month, existing ?? null, run);
  return { run, slips };
}

export async function finalizeRun(ctx, month) {
  const runRef = db().collection("payrollRuns").doc(month);
  const run = (await runRef.get()).data();
  if (!run) throw new HttpError(404, "No draft for this month");
  if (run.status === "finalized") throw new HttpError(423, "Already finalized");
  const slips = await db().collection("payslips").where("month", "==", month).get();
  const batch = db().batch();
  slips.docs.forEach((d) => batch.update(d.ref, { status: "finalized" }));
  const patch = { status: "finalized", finalizedBy: ctx.name, finalizedAt: new Date().toISOString() };
  batch.update(runRef, patch);
  await batch.commit();
  await audit(ctx, "finalize", "payroll", month, run, { ...run, ...patch });
  await Promise.all(slips.docs.map((d) => notify(d.data().uid, `Your payslip for ${month} is ready`)));
  return { ok: true };
}

export async function listRuns() {
  const snap = await db().collection("payrollRuns").get();
  return snap.docs.map((d) => d.data()).sort((a, b) => (a.month < b.month ? 1 : -1));
}

/** Employees only see their own finalized payslips. */
export async function listPayslips(ctx, { month } = {}) {
  let q = db().collection("payslips");
  q = ctx.role === "employee" ? q.where("employeeId", "==", ctx.employeeId) : month ? q.where("month", "==", month) : q;
  let rows = (await q.get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  if (ctx.role === "employee") rows = rows.filter((r) => r.status === "finalized");
  if (month) rows = rows.filter((r) => r.month === month);
  return rows.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : a.code > b.code ? 1 : -1));
}

export async function getPayslip(ctx, id) {
  const d = (await db().collection("payslips").doc(id).get()).data();
  if (!d) throw new HttpError(404, "Payslip not found");
  if (ctx.role === "employee" && (d.employeeId !== ctx.employeeId || d.status !== "finalized"))
    throw new HttpError(403, "You can only download your own payslips");
  return { id, ...d };
}
