import { db } from "@/lib/firebase/admin";
import { route, body } from "@/lib/auth/guard";
import { requestCorrection, decideCorrection } from "@/lib/services/attendance";

export const GET = route(["admin", "hr", "employee"], async (ctx) => {
  let q = db().collection("corrections");
  if (ctx.role === "employee") q = q.where("employeeId", "==", ctx.employeeId);
  return (await q.get()).docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
});

export const POST = route(["employee", "hr"], async (ctx, req) => requestCorrection(ctx, await body(req)));

export const PATCH = route(["hr"], async (ctx, req) => {
  const { id, action, comment } = await body(req);
  return decideCorrection(ctx, id, action, comment);
});
