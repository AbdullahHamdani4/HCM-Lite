import { db } from "@/lib/firebase/admin";
import { route } from "@/lib/auth/guard";

export const GET = route(["admin", "hr", "employee"], async (ctx) => {
  const snap = await db().collection("notifications").where("uid", "==", ctx.uid).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 20);
});

export const POST = route(["admin", "hr", "employee"], async (ctx) => {
  const snap = await db().collection("notifications").where("uid", "==", ctx.uid).where("read", "==", false).get();
  const batch = db().batch();
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
  return { ok: true };
});
