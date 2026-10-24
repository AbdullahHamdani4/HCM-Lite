import { route, body, HttpError } from "@/lib/auth/guard";
import { checkIn, checkOut, computeDays, countBy } from "@/lib/services/attendance";
import { pkNow } from "@/lib/time";

/** ?date=YYYY-MM-DD → daily board (Admin/HR). ?from&to → calendar (own for employees). */
export const GET = route(["admin", "hr", "employee"], async (ctx, _r, url) => {
  const p = url.searchParams;
  const today = pkNow().date;
  if (ctx.role === "employee") {
    const rows = await computeDays({ from: p.get("from") ?? today.slice(0, 8) + "01", to: p.get("to") ?? today, employeeId: ctx.employeeId });
    return { rows, counts: countBy(rows) };
  }
  const date = p.get("date") ?? today;
  const rows = await computeDays({ from: p.get("from") ?? date, to: p.get("to") ?? date, dept: p.get("dept") ?? "", employeeId: p.get("employeeId") ?? "" });
  return { rows, counts: countBy(rows) };
});

export const POST = route(["employee", "hr"], async (ctx, req) => {
  const { action } = await body(req);
  if (action === "in") return checkIn(ctx);
  if (action === "out") return checkOut(ctx);
  throw new HttpError(400, "Unknown action");
});
