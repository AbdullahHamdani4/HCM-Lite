import { db } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/auth/guard";
import { pkNow, toMin, eachDay } from "@/lib/time";
import { getSettings, holidaySet, isWorkingDay, audit } from "./org";
import { allEmployees } from "./employees";

const docId = (empId, date) => `${empId}_${date}`;

/** Server stamps the time. One record per employee per day (second check-in = 409). */
export async function checkIn(ctx, extra = {}) {
  if (!ctx.employeeId) throw new HttpError(403, "Only employees can check in");
  const s = await getSettings();
  const now = pkNow();
  const ref = db().collection("attendance").doc(docId(ctx.employeeId, now.date));
  const emp = (await db().collection("employees").doc(ctx.employeeId).get()).data();
  const late = now.minutes > toMin(s.startTime) + s.graceMin;
  const rec = {
    employeeId: ctx.employeeId, name: emp?.name ?? ctx.name, departmentId: emp?.departmentId ?? "",
    date: now.date, checkIn: now.iso, checkInMin: now.minutes, checkOut: null, workedMin: 0,
    status: late ? "late" : "present", late, source: extra.source ?? "web",
  };
  try {
    await ref.create(rec);
  } catch {
    throw new HttpError(409, "You have already checked in today");
  }
  await audit(ctx, "check_in", "attendance", ref.id, null, rec);
  return rec;
}

export async function checkOut(ctx) {
  if (!ctx.employeeId) throw new HttpError(403, "Only employees can check out");
  const s = await getSettings();
  const now = pkNow();
  const ref = db().collection("attendance").doc(docId(ctx.employeeId, now.date));
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(422, "Check in first");
  const rec = snap.data();
  if (rec.checkOut) throw new HttpError(409, "You have already checked out today");
  const workedMin = Math.max(0, Math.round((Date.now() - new Date(rec.checkIn).getTime()) / 60000));
  const status = workedMin < s.halfDayHours * 60 ? "half_day" : rec.late ? "late" : "present";
  const patch = { checkOut: now.iso, workedMin, status };
  await ref.update(patch);
  await audit(ctx, "check_out", "attendance", ref.id, rec, { ...rec, ...patch });
  return { ...rec, ...patch };
}

export async function todayRecord(ctx) {
  const snap = await db().collection("attendance").doc(docId(ctx.employeeId, pkNow().date)).get();
  return snap.exists ? snap.data() : null;
}

/**
 * The single source of truth for day statuses, used by boards, dashboards, payroll and AI.
 * Returns one row per active employee per working day in range (capped at today).
 * status: present | late | half_day | missing_checkout | on_leave | absent | not_checked_in
 */
export async function computeDays({ from, to, dept, employeeId } = {}) {
  const [s, holidays, emps, attSnap, leaveSnap] = await Promise.all([
    getSettings(), holidaySet(), allEmployees(),
    db().collection("attendance").where("date", ">=", from).where("date", "<=", to).get(),
    db().collection("leaveRequests").where("status", "==", "approved").get(),
  ]);
  const today = pkNow().date;
  const att = new Map(attSnap.docs.map((d) => [d.id, d.data()]));
  const leaves = leaveSnap.docs.map((d) => d.data()).filter((l) => l.end >= from && l.start <= to);
  const people = emps.filter((e) => (!dept || e.departmentId === dept) && (!employeeId || e.id === employeeId));
  const rows = [];
  const last = to < today ? to : today;
  for (const e of people) {
    for (const date of eachDay(from, last)) {
      if (date < e.joinDate || (e.exitDate && date > e.exitDate)) continue;
      if (e.status === "inactive" && !e.exitDate) continue;
      if (!isWorkingDay(date, s, holidays)) continue;
      const rec = att.get(docId(e.id, date));
      const leave = leaves.find((l) => l.employeeId === e.id && l.start <= date && l.end >= date);
      let status;
      if (rec) status = !rec.checkOut && date < today ? "missing_checkout" : rec.status;
      else if (leave) status = "on_leave";
      else status = date < today ? "absent" : "not_checked_in";
      rows.push({
        employeeId: e.id, name: e.name, code: e.code, departmentId: e.departmentId, date, status,
        checkIn: rec?.checkIn ?? null, checkOut: rec?.checkOut ?? null, workedMin: rec?.workedMin ?? 0,
        leaveType: leave?.typeName ?? null, unpaid: leave ? !leave.paid : false,
      });
    }
  }
  return rows;
}

/** Attendance rate per the brief. */
export function attendanceRate(rows) {
  const c = countBy(rows);
  const denom = rows.filter((r) => r.status !== "not_checked_in").length - c.on_leave;
  const num = c.present + c.late + c.missing_checkout + 0.5 * c.half_day;
  return denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;
}

export function countBy(rows) {
  const c = { present: 0, late: 0, half_day: 0, missing_checkout: 0, on_leave: 0, absent: 0, not_checked_in: 0 };
  for (const r of rows) c[r.status]++;
  return c;
}

/** Corrections: employee requests, HR approves. */
export async function requestCorrection(ctx, { date, checkIn, checkOut, reason }) {
  if (!ctx.employeeId) throw new HttpError(403, "Only employees can request corrections");
  if (!date || !reason) throw new HttpError(400, "Date and reason are required");
  const ref = await db().collection("corrections").add({
    employeeId: ctx.employeeId, name: ctx.name, date, checkIn, checkOut, reason, status: "pending", createdAt: new Date().toISOString(),
  });
  return { id: ref.id };
}

export async function decideCorrection(ctx, id, action, comment = "") {
  const ref = db().collection("corrections").doc(id);
  const c = (await ref.get()).data();
  if (!c || c.status !== "pending") throw new HttpError(404, "Request not found or already decided");
  if (action === "approve") {
    const s = await getSettings();
    const inMin = toMin(c.checkIn);
    const worked = c.checkOut ? toMin(c.checkOut) - inMin : 0;
    const late = inMin > toMin(s.startTime) + s.graceMin;
    const emp = (await db().collection("employees").doc(c.employeeId).get()).data();
    await db().collection("attendance").doc(docId(c.employeeId, c.date)).set({
      employeeId: c.employeeId, name: emp?.name, departmentId: emp?.departmentId, date: c.date,
      checkIn: `${c.date}T${c.checkIn}:00+05:00`, checkOut: c.checkOut ? `${c.date}T${c.checkOut}:00+05:00` : null,
      checkInMin: inMin, workedMin: worked, late, source: "correction",
      status: c.checkOut && worked < s.halfDayHours * 60 ? "half_day" : late ? "late" : "present",
    });
  }
  await ref.update({ status: action === "approve" ? "approved" : "rejected", comment, decidedBy: ctx.name });
  await audit(ctx, action, "correction", id, c, { ...c, status: action });
  return { ok: true };
}
