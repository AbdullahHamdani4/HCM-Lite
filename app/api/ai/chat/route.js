import { route, body } from "@/lib/auth/guard";
import { chat } from "@/lib/ai";

export const maxDuration = 60;
export const POST = route(["admin", "hr", "employee"], async (ctx, req) => chat(ctx, (await body(req)).messages ?? []));
