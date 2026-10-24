import { db } from "@/lib/firebase/admin";
import { route, body, HttpError } from "@/lib/auth/guard";
import { audit } from "@/lib/services/org";

export const GET = route(["admin", "hr", "employee"], async () => {
  const snap = await db().collection("announcements").orderBy("at", "desc").limit(10).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
});

export const POST = route(["admin", "hr"], async (ctx, req) => {
  const { title, text } = await body(req);
  if (!title?.trim()) throw new HttpError(400, "Title is required");
  const rec = { title, text: text ?? "", by: ctx.name, role: ctx.role, at: new Date().toISOString() };
  const ref = await db().collection("announcements").add(rec);
  await audit(ctx, "create", "announcement", ref.id, null, rec);
  return { id: ref.id, ...rec };
});
