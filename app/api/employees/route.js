import { route, body } from "@/lib/auth/guard";
import { searchEmployees, createEmployee, updateEmployee, getEmployee } from "@/lib/services/employees";
import { balances } from "@/lib/services/leave";
import { computeDays, countBy } from "@/lib/services/attendance";
import { listPayslips } from "@/lib/services/payroll";
import { pkNow } from "@/lib/time";

export const GET = route(["admin", "hr", "employee"], async (ctx, _r, url) => {
  const p = url.searchParams;
  const id = p.get("id");
  if (id) {
    // Employee 360
    const emp = await getEmployee(ctx, id);
    const today = pkNow().date;
    const [bal, days, slips] = await Promise.all([
      balances(id), computeDays({ from: today.slice(0, 8) + "01", to: today, employeeId: id }),
      listPayslips(ctx.role === "employee" ? ctx : { role: "admin" }),
    ]);
    return { employee: emp, balances: bal, attendance: countBy(days), payslips: slips.filter((s) => s.employeeId === id) };
  }
  return searchEmployees(ctx, { q: p.get("q") ?? "", dept: p.get("dept") ?? "", status: p.get("status") ?? "", page: Number(p.get("page") ?? 1), size: Math.min(1000, Number(p.get("size") ?? 20)) });
});

export const POST = route(["hr"], async (ctx, req) => createEmployee(ctx, await body(req)));

export const PATCH = route(["hr"], async (ctx, req, url) => updateEmployee(ctx, url.searchParams.get("id"), await body(req)));
