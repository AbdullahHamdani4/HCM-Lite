import { db } from "@/lib/firebase/admin";
import { pkNow, addDays } from "@/lib/time";
import { computeDays, attendanceRate, countBy } from "./attendance";
import { allEmployees } from "./employees";
import { listOrg, getSettings, holidaySet, isWorkingDay } from "./org";
import { balances } from "./leave";
import { listRuns, listPayslips } from "./payroll";

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

export function defaultRange(from, to) {
  const today = pkNow().date;
  return { from: from || today.slice(0, 8) + "01", to: to || today };
}

export async function headcount({ dept } = {}) {
  const [emps, depts] = await Promise.all([allEmployees(), listOrg("departments")]);
  const active = emps.filter((e) => e.status === "active" && (!dept || e.departmentId === dept));
  const byDept = depts.map((d) => ({ id: d.id, name: d.name, count: active.filter((e) => e.departmentId === d.id).length }));
  return { total: active.length, byDept };
}

export async function attendanceSummary({ from, to, dept }) {
  const rows = await computeDays({ from, to, dept });
  const c = countBy(rows);
  return { from, to, counts: c, attendanceRate: attendanceRate(rows), latePercent: pct(c.late, c.present + c.late), rows };
}

export async function lateComers({ from, to, dept, limit = 5 }) {
  const rows = (await computeDays({ from, to, dept })).filter((r) => r.status === "late");
  const m = new Map();
  for (const r of rows) m.set(r.employeeId, { name: r.name, code: r.code, count: (m.get(r.employeeId)?.count ?? 0) + 1 });
  return [...m.values()].sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function leaveSummary({ from, to, dept }) {
  const snap = await db().collection("leaveRequests").get();
  const all = snap.docs.map((d) => d.data()).filter((l) => !dept || l.departmentId === dept);
  const inRange = all.filter((l) => l.start <= to && l.end >= from);
  const approved = inRange.filter((l) => l.status === "approved");
  const today = pkNow().date;
  const types = await listOrg("leaveTypes");
  const headcountN = (await headcount({ dept })).total || 1;
  return {
    pending: all.filter((l) => l.status === "pending").length,
    onLeaveToday: all.filter((l) => l.status === "approved" && l.start <= today && l.end >= today)
      .map((l) => ({ name: l.name, type: l.typeName, until: l.end })),
    byType: types.map((t) => {
      const days = approved.filter((l) => l.typeId === t.id).reduce((a, l) => a + l.days, 0);
      return { type: t.name, days, utilization: t.quota ? pct(days, t.quota * headcountN) : null };
    }),
  };
}

export async function payrollSummary({ month } = {}) {
  const runs = await listRuns();
  const run = month ? runs.find((r) => r.month === month) : runs[0];
  if (!run) return { run: null, byDept: [], avgGross: 0 };
  const slips = await listPayslips({ role: "admin" }, { month: run.month });
  const depts = await listOrg("departments");
  const byDept = depts.map((d) => {
    const s = slips.filter((x) => x.departmentId === d.id);
    return { name: d.name, gross: s.reduce((a, x) => a + x.proratedGross, 0), net: s.reduce((a, x) => a + x.net, 0) };
  });
  return { run, byDept, avgGross: slips.length ? Math.round(slips.reduce((a, x) => a + x.gross, 0) / slips.length) : 0 };
}

/** Daily attendance-rate trend for charts. */
function trend(rows, from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = rows.filter((r) => r.date === d);
    if (day.length) out.push({ date: d.slice(5), rate: attendanceRate(day), late: day.filter((r) => r.status === "late").length });
  }
  return out;
}

export async function hrDashboard({ from, to, dept }) {
  const today = pkNow().date;
  const [hc, att, todayRows, late, leave, corr] = await Promise.all([
    headcount({ dept }), attendanceSummary({ from, to, dept }), computeDays({ from: today, to: today, dept }),
    lateComers({ from, to, dept }), leaveSummary({ from, to, dept }),
    db().collection("corrections").where("status", "==", "pending").get(),
  ]);
  const t = countBy(todayRows);
  const depts = await listOrg("departments");
  const absenteeism = depts.map((d) => {
    const r = att.rows.filter((x) => x.departmentId === d.id && x.status !== "not_checked_in");
    return { name: d.name, absent: pct(r.filter((x) => x.status === "absent").length, r.length) };
  });
  return {
    kpis: {
      headcount: hc.total, presentToday: t.present + t.late + t.half_day, onLeaveToday: t.on_leave, lateToday: t.late,
      pendingApprovals: leave.pending + corr.size, attendanceRate: att.attendanceRate, latePercent: att.latePercent,
    },
    trend: trend(att.rows, from, to), absenteeism, leaveByType: leave.byType, lateComers: late, onLeaveToday: leave.onLeaveToday,
  };
}

export async function adminDashboard({ from, to, dept }) {
  const [hc, pay, emps, att, auditSnap] = await Promise.all([
    headcount({ dept }), payrollSummary(), allEmployees(), attendanceSummary({ from, to, dept }),
    db().collection("auditLogs").orderBy("atIso", "desc").limit(8).get(),
  ]);
  const exits = emps.filter((e) => e.exitDate && e.exitDate >= from.slice(0, 4) + "-01-01").length;
  const gender = ["male", "female", "other"].map((g) => ({ name: g, count: emps.filter((e) => e.status === "active" && e.gender === g).length }));
  return {
    kpis: {
      headcount: hc.total, attritionYtd: pct(exits, hc.total + exits), payrollCost: pay.run?.totalGross ?? 0,
      avgSalary: pay.avgGross, attendanceRate: att.attendanceRate, payrollMonth: pay.run?.month ?? null,
    },
    headcountByDept: hc.byDept, payrollByDept: pay.byDept, gender, trend: trend(att.rows, from, to),
    audit: auditSnap.docs.map((d) => d.data()),
  };
}

export async function employeeDashboard(ctx) {
  const today = pkNow().date;
  const weekStart = addDays(today, -((new Date(today + "T00:00:00Z").getUTCDay() + 6) % 7));
  const [s, holidays] = await Promise.all([getSettings(), holidaySet()]);
  const [week, month, bal, slips, todayRec] = await Promise.all([
    computeDays({ from: weekStart, to: today, employeeId: ctx.employeeId }),
    computeDays({ from: today.slice(0, 8) + "01", to: today, employeeId: ctx.employeeId }),
    balances(ctx.employeeId), listPayslips(ctx),
    db().collection("attendance").doc(`${ctx.employeeId}_${today}`).get(),
  ]);
  return {
    today: todayRec.exists ? todayRec.data() : null,
    dayOff: !isWorkingDay(today, s, holidays),
    hoursThisWeek: Math.round((week.reduce((a, r) => a + r.workedMin, 0) / 60) * 10) / 10,
    lateThisMonth: month.filter((r) => r.status === "late").length,
    balances: bal, lastPayslip: slips[0] ?? null,
  };
}
