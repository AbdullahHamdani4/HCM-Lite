import { route, body } from "@/lib/auth/guard";
import { smartLeave } from "@/lib/ai";

export const maxDuration = 30;
export const POST = route(["employee", "hr"], async (ctx, req) => smartLeave(ctx, String((await body(req)).text ?? "")));
