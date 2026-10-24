import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
export const DEFAULT_SETTINGS = {
    startTime: "09:00", graceMin: 15, halfDayHours: 5, weekend: [0, 6], lat: null, lng: null, radius: 150,
};
export const ORG_KINDS = ["departments", "designations", "leaveTypes", "holidays"];
export async function getSettings() {
    const s = await db().collection("settings").doc("company").get();
    return { companyName: "", ...DEFAULT_SETTINGS, ...s.data() };
}
export async function listOrg(kind) {
    const snap = await db().collection(kind).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
export async function holidaySet() {
    return new Set((await listOrg("holidays")).map((h) => h.date));
}
export function isWorkingDay(date, s, holidays) {
    return !s.weekend.includes(new Date(date + "T00:00:00Z").getUTCDay()) && !holidays.has(date);
}
/** Immutable audit trail: actor, action, entity, before/after. */
export async function audit(ctx, action, entity, entityId, before = null, after = null) {
    await db().collection("auditLogs").add({
        actorId: ctx?.uid ?? "system", actorName: ctx?.name ?? "System", actorRole: ctx?.role ?? "system",
        action, entity, entityId,
        before: before ? JSON.parse(JSON.stringify(before)) : null,
        after: after ? JSON.parse(JSON.stringify(after)) : null,
        at: FieldValue.serverTimestamp(), atIso: new Date().toISOString(),
    });
}
export async function notify(uid, text) {
    if (uid)
        await db().collection("notifications").add({ uid, text, read: false, at: new Date().toISOString() });
}
