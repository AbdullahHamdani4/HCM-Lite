import { db } from "@/lib/firebase/admin";
import { route, body } from "@/lib/auth/guard";
import { getSettings } from "@/lib/services/org";
import { updateEmployee } from "@/lib/services/employees";

const ALL = ["admin", "hr", "employee"];

export const GET = route(ALL, async (ctx) => {
  const [u, s] = await Promise.all([db().collection("users").doc(ctx.uid).get(), getSettings()]);
  return { ...ctx, mustChangePassword: !!u.data()?.mustChangePassword, companyName: s.companyName };
});

export const POST = route(ALL, async (ctx) => {
  await db().collection("users").doc(ctx.uid).update({ mustChangePassword: false });
  return { ok: true };
});

export const PATCH = route(["employee"], async (ctx, req) => updateEmployee(ctx, ctx.employeeId, await body(req)));
