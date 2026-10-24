import { route, body } from "@/lib/auth/guard";
import { summarize } from "@/lib/ai";

export const maxDuration = 30;
export const POST = route(["admin", "hr"], async (ctx, req) => summarize(ctx, (await body(req)).kpis ?? {}));
