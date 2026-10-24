import { z } from "zod";
import { db } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/auth/guard";
import { eachDay, pkNow } from "@/lib/time";
import { getSettings, holidaySet, isWorkingDay, listOrg, audit, notify } from "./org";

export const LeaveInput = z.object({
  typeId: z.string().min(1, "Choose a leave type"),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(2, "Add a short reason"),
});

export const DEFAULT_LEAVE_TYPES = [
  { name: "Annual", code: "annual", quota: 14, paid: true },
  { name: "Sick", code: "sick", quota: 8, paid: true },
  { name: "Casual", code: "casual", quota: 10, paid: true },
  { name: "Unpaid", code: "unpaid", quota: null, paid: false },
];

export async function workingDays(start, end) {
  const [s, h] = await Promise.all([getSettings(), holidaySet()]);
  return eachDay(start, end).filter((d) => isWorkingDay(d, s, h)).length;
}

async function myRequests(employeeId) {
  const snap = await db().collection("leaveRequests").where("employeeId", "==", employeeId).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Balance per type for the current year: quota − approved days (pending shown separately). */
export async function balances(employeeId, year = pkNow().date.slice(0, 4)) {
  const [types, reqs] = await Promise.all([listOrg("leaveTypes"), myRequests(employeeId)]);
  return types.map((t) => {
    const mine = reqs.filter((r) => r.typeId === t.id && r.start.startsWith(year));
    const used = mine.filter((r) => r.status === "approved").reduce((a, r) => a + r.days, 0);
    const pending = mine.filter((r) => r.status === "pending").reduce((a, r) => a + r.days, 0);
    return { typeId: t.id, name: t.name, code: t.code, quota: t.quota, used, pending, remaining: t.quota == null ? null : t.quota - used };
  });
}

export async function applyLeave(ctx, input) {
  if (!ctx.employeeId) throw new HttpError(403, "Only employees can apply for leave");
  const data = LeaveInput.parse(input);
  if (data.end < data.start) throw new HttpError(422, "End date is before start date");
  const type = (await listOrg("leaveTypes")).find((t) => t.id === data.typeId);
  if (!type) throw new HttpError(422, "Unknown leave type");
  const days = await workingDays(data.start, data.end);
  if (days === 0) throw new HttpError(422, "These dates are all weekends or holidays");
  const reqs = await myRequests(ctx.employeeId);
  const overlap = reqs.find((r) => ["pending", "approved"].includes(r.status) && r.start <= data.end && r.end >= data.start);
  if (overlap) throw new HttpError(422, `Overlaps with your ${overlap.typeName} leave (${overlap.start} → ${overlap.end})`);
  if (type.quota != null) {
    const b = (await balances(ctx.employeeId, data.start.slice(0, 4))).find((x) => x.typeId === type.id);
    if (days > b.remaining - b.pending)
      throw new HttpError(422, `Not enough ${type.name} balance: ${b.remaining - b.pending} day(s) left, ${days} requested`);
  }
  const emp = (await db().collection("employees").doc(ctx.employeeId).get()).data();
  const rec = {
    ...data, employeeId: ctx.employeeId, uid: ctx.uid, name: emp?.name ?? ctx.name, departmentId: emp?.departmentId ?? "",
    typeName: type.name, typeCode: type.code, paid: type.paid !== false, days, status: "pending", createdAt: new Date().toISOString(),
  };
  const ref = await db().collection("leaveRequests").add(rec);
  await audit(ctx, "create", "leave", ref.id, null, rec);
  return { id: ref.id, ...rec };
}

export async function listLeave(ctx, { status } = {}) {
  let rows;
  if (ctx.role === "employee") rows = await myRequests(ctx.employeeId);
  else rows = (await db().collection("leaveRequests").get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  if (status) rows = rows.filter((r) => r.status === status);
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function decideLeave(ctx, id, action, comment = "") {
  const ref = db().collection("leaveRequests").doc(id);
  const before = (await ref.get()).data();
  if (!before) throw new HttpError(404, "Leave request not found");
  if (before.status !== "pending") throw new HttpError(422, "This request has already been decided");
  if (action === "cancel") {
    if (ctx.employeeId !== before.employeeId) throw new HttpError(403, "You can only cancel your own leave");
  } else if (ctx.role !== "hr") throw new HttpError(403, "Only HR can approve or reject leave");
  const status = { approve: "approved", reject: "rejected", cancel: "cancelled" }[action];
  if (!status) throw new HttpError(400, "Unknown action");
  const patch = { status, comment, decidedBy: ctx.name, decidedAt: new Date().toISOString() };
  await ref.update(patch);
  await audit(ctx, action, "leave", id, before, { ...before, ...patch });
  if (action !== "cancel") await notify(before.uid, `Your ${before.typeName} leave (${before.start} → ${before.end}) was ${status}`);
  return { ok: true };
}
