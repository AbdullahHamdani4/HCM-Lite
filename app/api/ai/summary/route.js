import { route, body } from "@/lib/auth/guard";
import { summarize } from "@/lib/ai";

export const maxDuration = 60;
export const POST = route(["admin", "hr"], async (ctx, req) => summarize(ctx, (await body(req)).kpis ?? {}));
