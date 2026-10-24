import { db } from "@/lib/firebase/admin";
import { route, body, HttpError } from "@/lib/auth/guard";
import { ORG_KINDS, listOrg, audit } from "@/lib/services/org";

const kindOf = (url) => {
  const k = url.searchParams.get("kind");
  if (!ORG_KINDS.includes(k)) throw new HttpError(400, "Unknown kind");
  return k;
};

const clean = (kind, b) => {
  if (!String(b.name ?? "").trim()) throw new HttpError(400, "Name is required");
  if (kind === "holidays" && !/^\d{4}-\d{2}-\d{2}$/.test(b.date ?? "")) throw new HttpError(400, "Date is required");
  if (kind === "leaveTypes") return { name: b.name, code: String(b.code || b.name).toLowerCase().replace(/\s+/g, "_"), quota: b.quota === "" || b.quota == null ? null : Number(b.quota), paid: b.paid !== false };
  if (kind === "holidays") return { name: b.name, date: b.date };
  return { name: b.name.trim() };
};

export const GET = route(["admin", "hr", "employee"], async (_c, _r, url) => {
  const rows = await listOrg(kindOf(url));
  return rows.sort((a, b) => String(a.date ?? a.name).localeCompare(String(b.date ?? b.name)));
});

export const POST = route(["admin"], async (ctx, req, url) => {
  const kind = kindOf(url);
  const b = await body(req);
  const data = clean(kind, b);
  const dup = (await listOrg(kind)).find((x) => x.id !== b.id && (kind === "holidays" ? x.date === data.date : x.name.trim().toLowerCase() === data.name.trim().toLowerCase()));
  if (dup) throw new HttpError(409, `${dup.name} already exists`);
  const ref = b.id ? db().collection(kind).doc(b.id) : db().collection(kind).doc();
  await ref.set(data, { merge: true });
  await audit(ctx, b.id ? "update" : "create", kind, ref.id, null, data);
  return { id: ref.id, ...data };
});

export const DELETE = route(["admin"], async (ctx, _r, url) => {
  const kind = kindOf(url), id = url.searchParams.get("id");
  await db().collection(kind).doc(id).delete();
  await audit(ctx, "delete", kind, id);
  return { ok: true };
});
