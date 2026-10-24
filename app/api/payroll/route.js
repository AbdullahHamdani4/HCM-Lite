import { route, body, HttpError } from "@/lib/auth/guard";
import { createDraft, finalizeRun, listRuns } from "@/lib/services/payroll";

export const GET = route(["admin", "hr"], () => listRuns());

export const POST = route(["hr"], async (ctx, req) => createDraft(ctx, (await body(req)).month));

export const PATCH = route(["admin"], async (ctx, req) => {
  const { month, action } = await body(req);
  if (action !== "finalize") throw new HttpError(400, "Unknown action");
  return finalizeRun(ctx, month);
});
