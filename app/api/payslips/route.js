import { route } from "@/lib/auth/guard";
import { listPayslips, getPayslip } from "@/lib/services/payroll";
import { getSettings, listOrg } from "@/lib/services/org";
import { renderPayslip } from "@/lib/pdf/payslip";

export const GET = route(["admin", "hr", "employee"], async (ctx, _r, url) => {
  const pdf = url.searchParams.get("pdf");
  if (pdf) {
    const [slip, s, depts] = await Promise.all([getPayslip(ctx, pdf), getSettings(), listOrg("departments")]);
    const buf = await renderPayslip(slip, s.companyName, depts.find((d) => d.id === slip.departmentId)?.name ?? "");
    return new Response(buf, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="payslip-${slip.month}-${slip.code}.pdf"` } });
  }
  return listPayslips(ctx, { month: url.searchParams.get("month") ?? "" });
});
