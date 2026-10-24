"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Users, ChevronLeft, ChevronRight, CalendarCheck, Download } from "lucide-react";
import { api, useApi, pkr, fmtDate, fmtTime, todayPK } from "@/lib/client";
import {
  Button, Card, CardHead, Empty, ErrorState, Field, Input, Modal, PageHeader, Select, SkeletonRows, Status, Table, Td, SecretNote, StatRow, Stat, Badge,
} from "@/components/ui";

export function useOrg() {
  const d = useApi("/api/org?kind=departments");
  const g = useApi("/api/org?kind=designations");
  const deptName = useMemo(() => Object.fromEntries((d.data ?? []).map((x) => [x.id, x.name])), [d.data]);
  const desgName = useMemo(() => Object.fromEntries((g.data ?? []).map((x) => [x.id, x.name])), [g.data]);
  return { departments: d.data ?? [], designations: g.data ?? [], deptName, desgName };
}

const blank = { name: "", email: "", phone: "", address: "", gender: "male", departmentId: "", designationId: "", joinDate: todayPK(), basic: "" };

function EmployeeForm({ open, onClose, onSaved, org, initial }) {
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  useEffect(() => { if (open) { setF(initial ?? blank); setCreated(null); } }, [open, initial]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (initial) {
        await api(`/api/employees?id=${initial.id}`, { method: "PATCH", body: f });
        toast.success("Employee updated");
        onSaved();
        onClose();
      } else {
        const r = await api("/api/employees", { method: "POST", body: f });
        setCreated({ email: f.email, password: r.tempPassword, code: r.code });
        onSaved();
      }
    } catch (err) {
      toast.error(err.message);
    }
    setBusy(false);
  }

  if (created) {
    return (
      <Modal open={open} onClose={onClose} title={`${created.code} registered`} desc="Their login is ready." footer={<Button variant="dark" onClick={onClose}>Done</Button>}>
        <SecretNote email={created.email} password={created.password} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open} onClose={onClose} wide
      title={initial ? "Edit employee" : "Register employee"}
      desc={initial ? "Changes are recorded in the audit log." : "This also creates their login with a temporary password."}
      footer={<><Button onClick={onClose}>Cancel</Button><Button variant="primary" loading={busy} form="emp-form">{initial ? "Save changes" : "Register"}</Button></>}
    >
      {org.departments.length === 0 && <p className="mb-4 text-[13px] text-warn bg-warn-bg rounded-[6px] px-3 py-2">Ask your Admin to add a department first.</p>}
      <form id="emp-form" onSubmit={save} className="grid sm:grid-cols-2 gap-4">
        <Field label="Full name"><Input required value={f.name} onChange={set("name")} /></Field>
        <Field label="Email"><Input required type="email" value={f.email} onChange={set("email")} disabled={!!initial} /></Field>
        <Field label="Department">
          <Select required value={f.departmentId} onChange={set("departmentId")}>
            <option value="">Select…</option>
            {org.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Designation">
          <Select value={f.designationId} onChange={set("designationId")}>
            <option value="">—</option>
            {org.designations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Joining date"><Input required type="date" value={f.joinDate} onChange={set("joinDate")} disabled={!!initial} /></Field>
        <Field label="Basic salary (PKR / month)" hint={f.basic ? `Gross ${pkr(f.basic * 1.5)} incl. HRA 40% + medical 10%` : "Gross = 1.5 × basic"}>
          <Input required type="number" min="1" value={f.basic} onChange={set("basic")} />
        </Field>
        <Field label="Gender">
          <Select value={f.gender} onChange={set("gender")}><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></Select>
        </Field>
        <Field label="Phone"><Input value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input value={f.address} onChange={set("address")} /></Field>
        {initial && (
          <Field label="Status">
            <Select value={f.status} onChange={set("status")}><option value="active">Active</option><option value="inactive">Inactive (exited)</option></Select>
          </Field>
        )}
        {initial && f.status === "inactive" && <Field label="Exit date"><Input type="date" value={f.exitDate ?? ""} onChange={set("exitDate")} /></Field>}
      </form>
    </Modal>
  );
}

function Employee360({ id, onClose, org }) {
  const { data, loading } = useApi(id ? `/api/employees?id=${id}` : null);
  const e = data?.employee;
  return (
    <Modal open={!!id} onClose={onClose} wide title={e?.name ?? "Employee"} desc={e ? `${e.code} · ${org.deptName[e.departmentId] ?? "—"} · ${org.desgName[e.designationId] ?? "—"}` : ""}>
      {loading || !data ? <SkeletonRows rows={6} /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-[13px]">
            {[["Email", e.email], ["Phone", e.phone || "—"], ["Joined", fmtDate(e.joinDate)], ["Basic", pkr(e.basic)]].map(([k, v]) => (
              <div key={k}><p className="text-[12px] text-muted">{k}</p><p className="mt-0.5 truncate">{v}</p></div>
            ))}
          </div>
          <div>
            <p className="text-[12px] text-muted mb-2">This month</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.attendance).filter(([, v]) => v).map(([k, v]) => <span key={k} className="flex items-center gap-1.5"><Status value={k} /><span className="num text-[12px]">{v}</span></span>)}
              {!Object.values(data.attendance).some(Boolean) && <span className="text-[13px] text-muted">No working days yet.</span>}
            </div>
          </div>
          <div>
            <p className="text-[12px] text-muted mb-2">Leave balance</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.balances.map((b) => (
                <div key={b.typeId} className="rounded-[8px] border border-border p-3">
                  <p className="text-[12px] text-muted">{b.name}</p>
                  <p className="num text-[16px] mt-1">{b.remaining ?? "∞"}<span className="text-muted text-[12px]">{b.quota != null && ` / ${b.quota}`}</span></p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[12px] text-muted mb-2">Payslips</p>
            {data.payslips.length === 0 ? <p className="text-[13px] text-muted">None yet.</p> : (
              <div className="divide-y divide-border border border-border rounded-[8px]">
                {data.payslips.map((p) => <div key={p.id} className="flex justify-between px-3 h-10 items-center text-[13px]"><span className="num">{p.month}</span><span className="num">{pkr(p.net)}</span><Status value={p.status} /></div>)}
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function EmployeesView({ canEdit }) {
  const org = useOrg();
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [dept, setDept] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ open: false, initial: null });
  const [view, setView] = useState(null);
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(1); }, 250); return () => clearTimeout(t); }, [q]);
  const { data, loading, error, reload } = useApi(`/api/employees?q=${encodeURIComponent(dq)}&dept=${dept}&page=${page}`);
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  const exportCsv = async () => {
    const all = await api(`/api/employees?q=${encodeURIComponent(dq)}&dept=${dept}&page=1&size=1000`);
    const rows = [["code", "name", "email", "department", "joinDate", "basic", "status"], ...all.items.map((e) => [e.code, e.name, e.email, org.deptName[e.departmentId] ?? "", e.joinDate, e.basic, e.status])];
    const url = URL.createObjectURL(new Blob([rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" }));
    Object.assign(document.createElement("a"), { href: url, download: "employees.csv" }).click();
  };

  return (
    <>
      <PageHeader
        eyebrow={data ? `${data.total} people` : " "}
        title="Employees"
        desc={canEdit ? "Register people, keep their details current, and open a 360° view of anyone." : "Everyone in the company, with attendance, leave and pay at a glance."}
        actions={<>
          <Button onClick={exportCsv}><Download size={14} strokeWidth={1.5} /> Export</Button>
          {canEdit && <Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus size={14} /> Register employee</Button>}
        </>}
      />
      <Card className="rise">
        <div className="flex flex-col sm:flex-row gap-2 p-3 border-b border-border">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or code" className="pl-8" />
          </div>
          <Select value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }} className="sm:w-48">
            <option value="">All departments</option>
            {org.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <SkeletonRows /> : data.items.length === 0 ? (
          <Empty icon={Users} title={dq || dept ? "No one matches" : "No employees yet"} desc={dq || dept ? "Try a different search or filter." : canEdit ? "Register your first employee to get started." : "HR hasn't registered anyone yet."}
            action={canEdit && !dq && !dept && <Button variant="primary" onClick={() => setForm({ open: true, initial: null })}><Plus size={14} /> Register employee</Button>} />
        ) : (
          <Table head={["Employee", "Code", "Department", "Joined", "Basic", "Status", ""]}>
            {data.items.map((e) => (
              <tr key={e.id} className="hover:bg-subtle/50 cursor-pointer" onClick={() => setView(e.id)}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <span className="size-7 rounded-full bg-subtle grid place-items-center text-[10px] text-muted">{e.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</span>
                    <div><p className="leading-tight">{e.name}</p><p className="text-[12px] text-muted leading-tight">{e.email}</p></div>
                  </div>
                </Td>
                <Td className="num text-muted">{e.code}</Td>
                <Td>{org.deptName[e.departmentId] ?? "—"}</Td>
                <Td className="num text-muted">{fmtDate(e.joinDate)}</Td>
                <Td className="num">{pkr(e.basic)}</Td>
                <Td><Status value={e.status} /></Td>
                <Td className="text-right">{canEdit && <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); setForm({ open: true, initial: e }); }}>Edit</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
        {data && data.total > 20 && (
          <div className="flex items-center justify-between px-4 h-11 border-t border-border text-[12px] text-muted">
            <span className="num">Page {page} of {pages}</span>
            <div className="flex gap-1">
              <Button size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={14} /></Button>
              <Button size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={14} /></Button>
            </div>
          </div>
        )}
      </Card>
      <EmployeeForm open={form.open} initial={form.initial} onClose={() => setForm({ open: false, initial: null })} onSaved={reload} org={org} />
      <Employee360 id={view} onClose={() => setView(null)} org={org} />
    </>
  );
}

export function AttendanceBoard({ canApprove }) {
  const org = useOrg();
  const [date, setDate] = useState(todayPK());
  const [dept, setDept] = useState("");
  const { data, loading, error, reload } = useApi(`/api/attendance?date=${date}&dept=${dept}`);
  const corr = useApi(canApprove ? "/api/corrections" : null);
  const pending = (corr.data ?? []).filter((c) => c.status === "pending");

  const decide = async (id, action) => {
    try {
      await api("/api/corrections", { method: "PATCH", body: { id, action } });
      toast.success(action === "approve" ? "Correction approved" : "Correction rejected");
      corr.reload(); reload();
    } catch (e) { toast.error(e.message); }
  };

  const c = data?.counts ?? {};
  return (
    <>
      <PageHeader eyebrow={fmtDate(date)} title="Attendance" desc="The daily board. Statuses follow company rules: late after grace time, half day under the minimum hours."
        actions={<>
          <Input type="date" value={date} max={todayPK()} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <Select value={dept} onChange={(e) => setDept(e.target.value)} className="w-44">
            <option value="">All departments</option>
            {org.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </>} />
      <StatRow>
        <Stat label="Present" value={(c.present ?? 0) + (c.late ?? 0)} loading={loading} />
        <Stat label="Late" value={c.late ?? 0} loading={loading} />
        <Stat label="Half day" value={c.half_day ?? 0} loading={loading} />
        <Stat label="On leave" value={c.on_leave ?? 0} loading={loading} />
        <Stat label="Absent" value={c.absent ?? 0} loading={loading} sub={date === todayPK() ? `${c.not_checked_in ?? 0} not in yet` : undefined} />
      </StatRow>
      {canApprove && pending.length > 0 && (
        <Card className="mt-6 rise">
          <CardHead title="Correction requests" desc={`${pending.length} waiting for you`} />
          <Table head={["Employee", "Date", "In", "Out", "Reason", ""]}>
            {pending.map((r) => (
              <tr key={r.id}>
                <Td>{r.name}</Td><Td className="num">{r.date}</Td><Td className="num">{r.checkIn}</Td><Td className="num">{r.checkOut || "—"}</Td>
                <Td className="max-w-60 truncate text-muted">{r.reason}</Td>
                <Td className="text-right space-x-1"><Button size="sm" onClick={() => decide(r.id, "reject")}>Reject</Button><Button size="sm" variant="dark" onClick={() => decide(r.id, "approve")}>Approve</Button></Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      <Card className="mt-6 rise">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <SkeletonRows /> : data.rows.length === 0 ? (
          <Empty icon={CalendarCheck} title="Nothing to show" desc="It's a weekend or holiday, or no one is registered yet." />
        ) : (
          <Table head={["Employee", "Department", "Check in", "Check out", "Hours", "Status"]}>
            {data.rows.map((r) => (
              <tr key={r.employeeId + r.date}>
                <Td><span>{r.name}</span><span className="num text-[12px] text-muted ml-2">{r.code}</span></Td>
                <Td className="text-muted">{org.deptName[r.departmentId] ?? "—"}</Td>
                <Td className="num">{fmtTime(r.checkIn)}</Td>
                <Td className="num">{fmtTime(r.checkOut)}</Td>
                <Td className="num text-muted">{r.workedMin ? (r.workedMin / 60).toFixed(1) : "—"}</Td>
                <Td><Status value={r.status} />{r.leaveType && <span className="text-[12px] text-muted ml-2">{r.leaveType}</span>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

export function PayrollView({ role }) {
  const runs = useApi("/api/payroll");
  const org = useOrg();
  const [month, setMonth] = useState(todayPK().slice(0, 7));
  const slips = useApi(`/api/payslips?month=${month}`);
  const [busy, setBusy] = useState(false);
  const run = (runs.data ?? []).find((r) => r.month === month);
  const locked = run?.status === "finalized";

  const act = async (fn, msg) => {
    setBusy(true);
    try { await fn(); toast.success(msg); runs.reload(); slips.reload(); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  const create = () => act(() => api("/api/payroll", { method: "POST", body: { month } }), run ? "Draft recalculated" : "Draft created");
  const finalize = () => confirm(`Finalize ${month}? This locks the month for good.`) && act(() => api("/api/payroll", { method: "PATCH", body: { month, action: "finalize" } }), "Payroll finalized and locked");

  return (
    <>
      <PageHeader eyebrow={run ? `${run.employees} employees · ${run.status}` : "No run yet"} title="Payroll"
        desc={role === "hr" ? "Prepare the monthly draft from attendance and leave. Admin finalizes it." : "Review HR's draft and finalize to lock the month and release payslips."}
        actions={<>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          {role === "hr" && <Button variant="primary" loading={busy} disabled={locked} onClick={create}>{run ? "Recalculate draft" : "Run payroll"}</Button>}
          {role === "admin" && run && !locked && <Button variant="primary" loading={busy} onClick={finalize}>Finalize & lock</Button>}
        </>} />
      <StatRow>
        <Stat label="Gross cost" value={run ? pkr(run.totalGross) : "—"} loading={runs.loading} />
        <Stat label="Net payout" value={run ? pkr(run.totalNet) : "—"} loading={runs.loading} />
        <Stat label="Tax withheld" value={run ? pkr(run.totalTax) : "—"} loading={runs.loading} />
        <Stat label="Status" value={run ? (locked ? "Locked" : "Draft") : "—"} loading={runs.loading} sub={locked ? `by ${run.finalizedBy}` : run ? `by ${run.createdBy}` : undefined} />
      </StatRow>
      <Card className="mt-6 rise">
        {slips.error ? <ErrorState message={slips.error} onRetry={slips.reload} /> : slips.loading ? <SkeletonRows /> : slips.data.length === 0 ? (
          <Empty icon={Download} title={`No payroll for ${month}`} desc={role === "hr" ? "Run payroll to calculate every payslip from this month's records." : "HR hasn't prepared this month's draft yet."} />
        ) : (
          <Table head={["Employee", "Department", "Gross", "Days", "Absent / Unpaid / Half", "Deductions", "Tax", "Net", ""]}>
            {slips.data.map((p) => (
              <tr key={p.id}>
                <Td><span>{p.name}</span><span className="num text-[12px] text-muted ml-2">{p.code}</span></Td>
                <Td className="text-muted">{org.deptName[p.departmentId] ?? "—"}</Td>
                <Td className="num">{pkr(p.proratedGross)}</Td>
                <Td className="num text-muted">{p.employedDays}/{p.workingDays}</Td>
                <Td className="num text-muted">{p.absent} / {p.unpaid} / {p.halfDays}</Td>
                <Td className="num">{pkr(p.deduction)}</Td>
                <Td className="num">{pkr(p.tax)}</Td>
                <Td className="num font-medium">{pkr(p.net)}</Td>
                <Td className="text-right"><PayslipButton slip={p} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

export function PayslipButton({ slip }) {
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      const { download } = await import("@/lib/client");
      await download(`/api/payslips?pdf=${slip.id}`, `payslip-${slip.month}-${slip.code}.pdf`);
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  return <Button size="sm" variant="ghost" loading={busy} onClick={go}><Download size={14} strokeWidth={1.5} /> PDF</Button>;
}

export function Announcements({ canPost, compact }) {
  const { data, loading, reload } = useApi("/api/announcements");
  const [f, setF] = useState({ title: "", text: "" });
  const [busy, setBusy] = useState(false);
  const post = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api("/api/announcements", { method: "POST", body: f }); setF({ title: "", text: "" }); toast.success("Posted"); reload(); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  const list = (
    <Card className="rise">
      <CardHead title="Announcements" />
      {loading ? <SkeletonRows rows={3} /> : !data?.length ? <p className="px-4 pb-4 text-[13px] text-muted">Nothing posted yet.</p> : (
        <div className="divide-y divide-border">
          {data.slice(0, compact ? 3 : 20).map((a) => (
            <div key={a.id} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3"><p className="text-[13px] font-medium">{a.title}</p><p className="num text-[11px] text-muted shrink-0">{fmtDate(a.at)}</p></div>
              {a.text && <p className="text-[13px] text-muted mt-1 whitespace-pre-wrap">{a.text}</p>}
              <p className="text-[11px] text-muted mt-1.5">{a.by} · <Badge>{a.role}</Badge></p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
  if (compact) return list;
  return (
    <>
      <PageHeader title="Announcements" desc="Posts appear on every dashboard." />
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6 items-start">
        {canPost && (
          <Card className="p-4 rise">
            <form onSubmit={post} className="space-y-3">
              <Field label="Title"><Input required value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="Message"><textarea value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} className="w-full min-h-28 rounded-[6px] border border-border bg-surface px-2.5 py-2 text-[13px] focus:outline-none focus:border-fg/40" /></Field>
              <Button variant="primary" loading={busy}>Post announcement</Button>
            </form>
          </Card>
        )}
        {list}
      </div>
    </>
  );
}
