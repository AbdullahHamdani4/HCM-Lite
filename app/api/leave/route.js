import { route, body } from "@/lib/auth/guard";
import { applyLeave, listLeave, decideLeave, balances } from "@/lib/services/leave";

export const GET = route(["admin", "hr", "employee"], async (ctx, _r, url) => {
  if (url.searchParams.get("balance")) return balances(ctx.employeeId);
  return listLeave(ctx, { status: url.searchParams.get("status") ?? "" });
});

export const POST = route(["employee", "hr"], async (ctx, req) => applyLeave(ctx, await body(req)));

export const PATCH = route(["hr", "employee"], async (ctx, req) => {
  const { id, action, comment } = await body(req);
  return decideLeave(ctx, id, action, comment);
});
