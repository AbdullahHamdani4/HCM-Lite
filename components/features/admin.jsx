"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, UserCog, ScrollText, CalendarDays, MapPin } from "lucide-react";
import { api, useApi, fmtDate } from "@/lib/client";
import {
  Button, Card, CardHead, Empty, ErrorState, Field, Input, Modal, PageHeader, Select, SkeletonRows, Status, Table, Td, Tabs, SecretNote, Badge, cx,
} from "@/components/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function CompanySettings() {
  const { data, loading, reload } = useApi("/api/settings");
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF(data); }, [data]);
  if (loading || !f) return <Card><SkeletonRows rows={6} /></Card>;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api("/api/settings", { method: "PUT", body: { ...f, lat: f.lat === "" ? null : f.lat, lng: f.lng === "" ? null : f.lng } }); toast.success("Settings saved. They apply to new records."); reload(); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  const locate = () => navigator.geolocation?.getCurrentPosition(
    (p) => setF({ ...f, lat: +p.coords.latitude.toFixed(6), lng: +p.coords.longitude.toFixed(6) }),
    () => toast.error("Couldn't read your location"),
  );

  return (
    <Card className="rise">
      <form onSubmit={save}>
        <div className="grid md:grid-cols-[200px_1fr] gap-6 p-5 border-b border-border">
          <div><p className="text-[13px] font-medium">Company</p><p className="text-[12px] text-muted mt-1">Shown across the app and on payslips.</p></div>
          <Field label="Company name"><Input required value={f.companyName} onChange={set("companyName")} /></Field>
        </div>
        <div className="grid md:grid-cols-[200px_1fr] gap-6 p-5 border-b border-border">
          <div><p className="text-[13px] font-medium">Office hours</p><p className="text-[12px] text-muted mt-1">Late after start + grace. Half day under the minimum.</p></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Start time"><Input type="time" value={f.startTime} onChange={set("startTime")} /></Field>
            <Field label="Grace (minutes)"><Input type="number" min="0" value={f.graceMin} onChange={set("graceMin")} /></Field>
            <Field label="Half day under (hours)"><Input type="number" min="1" step="0.5" value={f.halfDayHours} onChange={set("halfDayHours")} /></Field>
            <div className="sm:col-span-3">
              <p className="text-[12px] font-medium mb-1.5">Weekend</p>
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d, i) => {
                  const on = f.weekend.includes(i);
                  return (
                    <button type="button" key={d} onClick={() => setF({ ...f, weekend: on ? f.weekend.filter((x) => x !== i) : [...f.weekend, i] })}
                      className={cx("h-8 w-11 rounded-[6px] border text-[12px] transition-colors", on ? "bg-fg text-bg border-fg" : "border-border text-muted hover:text-fg")}>{d}</button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-[200px_1fr] gap-6 p-5 border-b border-border">
          <div><p className="text-[13px] font-medium">Office location</p><p className="text-[12px] text-muted mt-1">Used for camera check-in geofencing.</p></div>
          <div className="grid sm:grid-cols-3 gap-4 items-end">
            <Field label="Latitude"><Input type="number" step="any" value={f.lat ?? ""} onChange={set("lat")} /></Field>
            <Field label="Longitude"><Input type="number" step="any" value={f.lng ?? ""} onChange={set("lng")} /></Field>
            <Field label="Radius (m)"><Input type="number" min="10" value={f.radius} onChange={set("radius")} /></Field>
            <Button type="button" size="sm" variant="ghost" onClick={locate} className="justify-self-start"><MapPin size={13} /> Use my current location</Button>
          </div>
        </div>
        <div className="flex justify-end p-4"><Button variant="primary" loading={busy}>Save settings</Button></div>
      </form>
    </Card>
  );
}

const ORG_META = {
  departments: { label: "Departments", fields: [["name", "Name"]] },
  designations: { label: "Designations", fields: [["name", "Title"]] },
  leaveTypes: { label: "Leave types", fields: [["name", "Name"], ["quota", "Yearly quota (blank = unlimited)", "number"]] },
  holidays: { label: "Public holidays", fields: [["name", "Name"], ["date", "Date", "date"]] },
};

function OrgList({ kind }) {
  const meta = ORG_META[kind];
  const { data, loading, error, reload } = useApi(`/api/org?kind=${kind}`);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState(null);
  useEffect(() => setF({}), [kind]);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api(`/api/org?kind=${kind}`, { method: "POST", body: { ...f, paid: kind === "leaveTypes" ? !/unpaid/i.test(f.name ?? "") : undefined } }); setF({}); reload(); toast.success("Added"); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  const del = async (id) => {
    if (armed !== id) return setArmed(id);
    setArmed(null);
    try { await api(`/api/org?kind=${kind}&id=${id}`, { method: "DELETE" }); toast.success("Removed"); reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <Card className="rise">
      <form onSubmit={add} className="flex flex-col sm:flex-row gap-2 p-3 border-b border-border">
        {meta.fields.map(([k, label, type]) => (
          <Input key={k} required={k !== "quota"} type={type ?? "text"} placeholder={label} value={f[k] ?? ""} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        ))}
        <Button variant="dark" loading={busy} className="shrink-0"><Plus size={14} /> Add</Button>
      </form>
      {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <SkeletonRows rows={3} /> : !data.length ? (
        <Empty icon={CalendarDays} title={`No ${meta.label.toLowerCase()} yet`} desc="Add the first one above." />
      ) : (
        <div className="divide-y divide-border">
          {data.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 h-11 text-[13px] group">
              <span className="flex-1">{r.name}</span>
              {kind === "leaveTypes" && <span className="num text-muted">{r.quota == null ? "Unlimited" : `${r.quota} days / yr`}</span>}
              {kind === "leaveTypes" && !r.paid && <Badge>unpaid</Badge>}
              {kind === "holidays" && <span className="num text-muted">{fmtDate(r.date)}</span>}
              {armed === r.id
                ? <Button size="sm" variant="danger" onClick={() => del(r.id)}>Confirm remove</Button>
                : <button onClick={() => del(r.id)} title="Remove" className="p-1 text-muted sm:opacity-0 group-hover:opacity-100 hover:text-bad transition-opacity"><Trash2 size={14} strokeWidth={1.5} /></button>}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

export function SetupView() {
  const [tab, setTab] = useState("company");
  return (
    <>
      <PageHeader title="Company setup" desc="Rules here decide attendance status, leave balances and payroll. Changes apply to new records only." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "company", label: "Company & rules" }, ...Object.entries(ORG_META).map(([value, m]) => ({ value, label: m.label }))]} />
      {tab === "company" ? <CompanySettings /> : <OrgList kind={tab} />}
    </>
  );
}

export function UsersView() {
  const { data, loading, error, reload } = useApi("/api/users");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", email: "" });
  const [secret, setSecret] = useState(null);
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { const r = await api("/api/users", { method: "POST", body: f }); setSecret({ email: f.email, password: r.tempPassword }); reload(); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  const act = async (u, action) => {
    try {
      const r = await api("/api/users", { method: "PATCH", body: { uid: u.uid, action } });
      if (r.tempPassword) { setSecret({ email: u.email, password: r.tempPassword }); setOpen(true); }
      else toast.success(action === "deactivate" ? "Login deactivated" : "Login activated");
      reload();
    } catch (err) { toast.error(err.message); }
  };
  const close = () => { setOpen(false); setSecret(null); setF({ name: "", email: "" }); };

  return (
    <>
      <PageHeader eyebrow={data ? `${data.length} logins` : " "} title="Logins" desc="Create HR accounts, and deactivate or reset any login. Employee logins are created when HR registers them."
        actions={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={14} /> New HR login</Button>} />
      <Card className="rise">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <SkeletonRows /> : data.length <= 1 ? (
          <Empty icon={UserCog} title="Only you so far" desc="Create an HR login so your team can start registering employees." action={<Button variant="primary" onClick={() => setOpen(true)}><Plus size={14} /> New HR login</Button>} />
        ) : (
          <Table head={["Name", "Email", "Role", "Status", ""]}>
            {data.map((u) => (
              <tr key={u.uid}>
                <Td>{u.name}</Td><Td className="text-muted">{u.email}</Td>
                <Td><Badge tone={u.role === "admin" ? "accent" : u.role === "hr" ? "info" : "neutral"}>{u.role}</Badge></Td>
                <Td><Status value={u.active ? "active" : "inactive"} />{u.mustChangePassword && <span className="text-[11px] text-muted ml-2">temp password</span>}</Td>
                <Td className="text-right space-x-1">
                  {u.role !== "admin" && <>
                    <Button size="sm" variant="ghost" onClick={() => act(u, "reset")}>Reset password</Button>
                    <Button size="sm" variant={u.active ? "danger" : "secondary"} onClick={() => act(u, u.active ? "deactivate" : "activate")}>{u.active ? "Deactivate" : "Activate"}</Button>
                  </>}
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={open} onClose={close} title={secret ? "Login ready" : "New HR login"} desc={secret ? null : "They'll set their own password on first sign-in."}
        footer={secret ? <Button variant="dark" onClick={close}>Done</Button> : <><Button onClick={close}>Cancel</Button><Button variant="primary" form="hr-form" loading={busy}>Create login</Button></>}>
        {secret ? <SecretNote {...secret} /> : (
          <form id="hr-form" onSubmit={create} className="space-y-4">
            <Field label="Full name"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
            <Field label="Email"><Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          </form>
        )}
      </Modal>
    </>
  );
}

export function AuditView() {
  const { data, loading, error, reload } = useApi("/api/audit");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(null);
  const rows = (data ?? []).filter((a) => !q || `${a.actorName} ${a.action} ${a.entity}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <PageHeader eyebrow="Read-only" title="Audit log" desc="Every create, update, approval and finalization, with before and after. Entries can't be edited or deleted." />
      <Card className="rise">
        <div className="p-3 border-b border-border"><Input placeholder="Filter by person, action or entity" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-xs" /></div>
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <SkeletonRows /> : !rows.length ? <Empty icon={ScrollText} title="No entries" /> : (
          <Table head={["When", "Actor", "Action", "Entity", ""]}>
            {rows.map((a) => (
              <tr key={a.id}>
                <Td className="num text-muted">{new Date(a.at).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</Td>
                <Td>{a.actorName} <Badge className="ml-1">{a.actorRole}</Badge></Td>
                <Td>{a.action.replace(/_/g, " ")}</Td>
                <Td className="text-muted">{a.entity} <span className="text-fg">{a.after?.name ?? a.before?.name ?? a.after?.companyName ?? (a.entity === "payroll" ? a.entityId : "")}</span></Td>
                <Td className="text-right">{(a.before || a.after) && <Button size="sm" variant="ghost" onClick={() => setOpen(a)}>Diff</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!open} onClose={() => setOpen(null)} wide title="Change details" desc={open && `${open.actorName} · ${open.action} ${open.entity}`}>
        {open && (
          <div className="grid sm:grid-cols-2 gap-3">
            {["before", "after"].map((k) => (
              <div key={k}>
                <p className="text-[12px] text-muted mb-1.5 capitalize">{k}</p>
                <pre className="num text-[11px] bg-subtle rounded-[8px] p-3 overflow-auto max-h-80">{open[k] ? JSON.stringify(open[k], null, 2) : "—"}</pre>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}

export function LeaveInbox() {
  const [tab, setTab] = useState("pending");
  const { data, loading, error, reload } = useApi("/api/leave");
  const [deciding, setDeciding] = useState(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = (data ?? []).filter((r) => tab === "all" || r.status === tab);
  const count = (s) => (data ?? []).filter((r) => r.status === s).length;

  const decide = async (action) => {
    setBusy(true);
    try { await api("/api/leave", { method: "PATCH", body: { id: deciding.id, action, comment } }); toast.success(action === "approve" ? "Leave approved" : "Leave rejected"); setDeciding(null); setComment(""); reload(); } catch (e) { toast.error(e.message); }
    setBusy(false);
  };

  return (
    <>
      <PageHeader title="Leave" desc="Requests are checked for overlaps, holidays and balance before they reach you." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: "pending", label: "Pending", count: count("pending") }, { value: "approved", label: "Approved" }, { value: "rejected", label: "Rejected" }, { value: "all", label: "All" }]} />
      <Card className="rise">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <SkeletonRows /> : !rows.length ? (
          <Empty icon={CalendarDays} title={tab === "pending" ? "Inbox zero" : "Nothing here"} desc={tab === "pending" ? "No leave requests are waiting for a decision." : undefined} />
        ) : (
          <Table head={["Employee", "Type", "Dates", "Days", "Reason", "Status", ""]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <Td>{r.name}</Td><Td>{r.typeName}</Td>
                <Td className="num text-muted">{r.start === r.end ? fmtDate(r.start) : `${fmtDate(r.start)} → ${fmtDate(r.end)}`}</Td>
                <Td className="num">{r.days}</Td>
                <Td className="max-w-56 truncate text-muted" title={r.reason}>{r.reason}</Td>
                <Td><Status value={r.status} />{r.comment && <span className="text-[11px] text-muted ml-2" title={r.comment}>“{r.comment.slice(0, 20)}”</span>}</Td>
                <Td className="text-right">{r.status === "pending" && <Button size="sm" variant="dark" onClick={() => setDeciding(r)}>Review</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={!!deciding} onClose={() => setDeciding(null)} title="Review leave" desc={deciding && `${deciding.name} · ${deciding.typeName} · ${deciding.days} working day(s)`}
        footer={<><Button variant="danger" loading={busy} onClick={() => decide("reject")}>Reject</Button><Button variant="primary" loading={busy} onClick={() => decide("approve")}>Approve</Button></>}>
        {deciding && (
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[12px] text-muted">From</p><p className="num">{fmtDate(deciding.start)}</p></div>
              <div><p className="text-[12px] text-muted">To</p><p className="num">{fmtDate(deciding.end)}</p></div>
            </div>
            <div><p className="text-[12px] text-muted">Reason</p><p>{deciding.reason}</p></div>
            <Field label="Comment (optional)"><Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Visible to the employee" /></Field>
          </div>
        )}
      </Modal>
    </>
  );
}
