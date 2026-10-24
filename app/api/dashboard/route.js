import { route } from "@/lib/auth/guard";
import { hrDashboard, adminDashboard, employeeDashboard, defaultRange } from "@/lib/services/analytics";

export const GET = route(["admin", "hr", "employee"], async (ctx, _r, url) => {
  const p = url.searchParams;
  const { from, to } = defaultRange(p.get("from"), p.get("to"));
  const opts = { from, to, dept: p.get("dept") ?? "" };
  if (ctx.role === "admin") return { ...(await adminDashboard(opts)), from, to };
  if (ctx.role === "hr") return { ...(await hrDashboard(opts)), from, to };
  return employeeDashboard(ctx);
});
