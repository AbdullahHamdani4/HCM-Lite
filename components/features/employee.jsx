"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Sparkles, LogIn, LogOut, CalendarDays, FileText, Clock, Wand2 } from "lucide-react";
import { api, useApi, pkr, fmtDate, fmtTime, todayPK } from "@/lib/client";
import { Button, Card, CardHead, Empty, ErrorState, Field, Input, Modal, PageHeader, Select, Skeleton, SkeletonRows, Status, Table, Td, Textarea, cx } from "@/components/ui";
import { Announcements, PayslipButton } from "./people";
import { useAuth } from "@/components/auth-provider";

function Clockface() {
  const [now, setNow] = useState(null);
  useEffect(() => { setNow(new Date()); const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return <p className="serif text-[56px] leading-none num">{now ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }) : "--:--"}</p>;
}

function CheckInCard({ today, dayOff, onDone }) {
  const [busy, setBusy] = useState(false);
  const go = async (action) => {
    setBusy(true);
    try {
      const r = await api("/api/attendance", { method: "POST", body: { action } });
      toast.success(action === "in" ? (r.status === "late" ? `Checked in at ${fmtTime(r.checkIn)} — marked late` : `Checked in at ${fmtTime(r.checkIn)}`) : `Checked out · ${(r.workedMin / 60).toFixed(1)} h`);
      onDone();
    } catch (e) { toast.error(e.message); }
    setBusy(false);
  };
  const state = dayOff && !today ? "off" : !today ? "out" : today.checkOut ? "done" : "in";
  return (
    <Card className="p-5 flex flex-col justify-between gap-6 rise">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[12px] text-muted">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Karachi" })}</p>
          <div className="mt-3"><Clockface /></div>
        </div>
        {today && <Status value={today.status} />}
      </div>
      <div className="grid grid-cols-2 gap-4 text-[13px]">
        <div><p className="text-[12px] text-muted">Checked in</p><p className="num mt-0.5">{fmtTime(today?.checkIn)}</p></div>
        <div><p className="text-[12px] text-muted">Checked out</p><p className="num mt-0.5">{fmtTime(today?.checkOut)}</p></div>
      </div>
      {state === "off" && <p className="text-[13px] text-muted h-10 flex items-center">Day off — enjoy your weekend. Check-in opens on the next working day.</p>}
      {state === "out" && <Button variant="primary" size="lg" loading={busy} onClick={() => go("in")}><LogIn size={15} /> Check in</Button>}
      {state === "in" && <Button variant="dark" size="lg" loading={busy} onClick={() => go("out")}><LogOut size={15} /> Check out</Button>}
      {state === "done" && <p className="text-[13px] text-muted h-10 flex items-center">Done for today · {(today.workedMin / 60).toFixed(1)} hours</p>}
      <p className="text-[11px] text-muted -mt-3">Time is stamped by the server, not your device.</p>
    </Card>
  );
}

export function EmployeeHome() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi("/api/dashboard");
  const hours = data?.hoursThisWeek ?? 0;
  return (
    <>
      <PageHeader eyebrow={user.companyName} title={`Hi, ${user.name.split(" ")[0]}.`} desc="Your day, your time off and your pay — all in one place." />
      {error && <ErrorState message={error} onRetry={reload} />}
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
        {loading ? <Skeleton className="h-80 rounded-[10px]" /> : <CheckInCard today={data?.today} dayOff={data?.dayOff} onDone={reload} />}
        <div className="grid grid-cols-2 gap-6 content-start">
          <Card className="p-5 col-span-2 rise">
            <div className="flex items-baseline justify-between">
              <p className="text-[12px] text-muted">Hours this week</p>
              <p className="num text-[12px] text-muted">{hours} / 40 h</p>
            </div>
            <p className="serif text-[40px] leading-none mt-2 num">{loading ? "—" : hours}</p>
            <div className="h-1.5 rounded-full bg-subtle mt-4 overflow-hidden"><div className="h-full bg-fg transition-[width] duration-500" style={{ width: `${Math.min(100, (hours / 40) * 100)}%` }} /></div>
          </Card>
          <Card className="p-5 rise"><p className="text-[12px] text-muted">Late this month</p><p className="serif text-[40px] leading-none mt-2 num">{loading ? "—" : data?.lateThisMonth}</p></Card>
          <Card className="p-5 rise">
            <p className="text-[12px] text-muted">Last payslip</p>
            {data?.lastPayslip ? <>
              <p className="serif text-[28px] leading-none mt-2 num">{pkr(data.lastPayslip.net)}</p>
              <div className="flex items-center justify-between mt-2"><span className="num text-[12px] text-muted">{data.lastPayslip.month}</span><PayslipButton slip={data.lastPayslip} /></div>
            </> : <p className="text-[13px] text-muted mt-3">None yet</p>}
          </Card>
        </div>
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card className="rise">
          <CardHead title="Leave balance" desc="This year" />
          <div className="grid grid-cols-2 gap-px bg-border border-t border-border">
            {(data?.balances ?? []).map((b) => (
              <div key={b.typeId} className="bg-surface p-4">
                <p className="text-[12px] text-muted">{b.name}</p>
                <p className="num text-[20px] mt-1">{b.remaining ?? "∞"}<span className="text-[12px] text-muted">{b.quota != null && ` of ${b.quota}`}</span></p>
                {b.pending > 0 && <p className="text-[11px] text-warn mt-0.5">{b.pending} pending</p>}
              </div>
            ))}
          </div>
        </Card>
        <Announcements compact />
      </div>
    </>
  );
}

function Calendar({ month, rows }) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const by = Object.fromEntries(rows.map((r) => [r.date, r]));
  const dot = { present: "bg-ok", late: "bg-warn", half_day: "bg-warn", missing_checkout: "bg-warn", on_leave: "bg-info", absent: "bg-bad" };
  return (
    <div>
      <div className="grid grid-cols-7 text-[11px] text-muted mb-2">{["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="text-center">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: first }).map((_, i) => <span key={"b" + i} />)}
        {Array.from({ length: days }).map((_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const r = by[date];
          return (
            <div key={date} title={r ? r.status.replace(/_/g, " ") : ""} className={cx("aspect-square rounded-[6px] border flex flex-col items-center justify-center gap-1 text-[12px] num", date === todayPK() ? "border-fg" : "border-border", !r && "text-muted/60")}>
              {i + 1}
              {r && dot[r.status] && <span className={cx("size-1.5 rounded-full", dot[r.status])} />}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-3 mt-4 text-[11px] text-muted">
        {[["Present", "bg-ok"], ["Late / half / no checkout", "bg-warn"], ["Leave", "bg-info"], ["Absent", "bg-bad"]].map(([l, c]) => <span key={l} className="flex items-center gap-1.5"><span className={cx("size-1.5 rounded-full", c)} />{l}</span>)}
      </div>
    </div>
  );
}

export function MyAttendance() {
  const [month, setMonth] = useState(todayPK().slice(0, 7));
  const last = new Date(Date.UTC(+month.slice(0, 4), +month.slice(5), 0)).getUTCDate();
  const { data, loading, error, reload } = useApi(`/api/attendance?from=${month}-01&to=${month}-${last}`);
  const corr = useApi("/api/corrections");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: todayPK(), checkIn: "09:00", checkOut: "17:00", reason: "" });
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api("/api/corrections", { method: "POST", body: f }); toast.success("Sent to HR"); setOpen(false); corr.reload(); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  const c = data?.counts ?? {};
  return (
    <>
      <PageHeader title="Attendance" desc="Your month at a glance. Missed a check-in? Request a correction and HR will review it."
        actions={<><Input type="month" value={month} max={todayPK().slice(0, 7)} onChange={(e) => setMonth(e.target.value)} className="w-40" /><Button onClick={() => setOpen(true)}>Request correction</Button></>} />
      {error && <ErrorState message={error} onRetry={reload} />}
      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
        <Card className="p-5 rise">{loading ? <Skeleton className="h-72" /> : <Calendar month={month} rows={data.rows} />}</Card>
        <div className="space-y-6">
          <Card className="rise">
            <CardHead title="Summary" />
            <div className="divide-y divide-border border-t border-border">
              {["present", "late", "half_day", "missing_checkout", "on_leave", "absent"].map((k) => (
                <div key={k} className="flex items-center justify-between px-4 h-10 text-[13px]"><Status value={k} /><span className="num">{loading ? "—" : c[k] ?? 0}</span></div>
              ))}
            </div>
          </Card>
          <Card className="rise">
            <CardHead title="Correction requests" />
            {!corr.data?.length ? <p className="px-4 pb-4 text-[13px] text-muted">None yet.</p> : (
              <div className="divide-y divide-border border-t border-border">
                {corr.data.map((r) => <div key={r.id} className="flex items-center justify-between px-4 h-10 text-[13px]"><span className="num">{r.date}</span><span className="text-muted truncate max-w-32">{r.reason}</span><Status value={r.status} /></div>)}
              </div>
            )}
          </Card>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Request a correction" desc="HR approves or rejects it."
        footer={<><Button onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" form="corr" loading={busy}>Send</Button></>}>
        <form id="corr" onSubmit={submit} className="grid grid-cols-2 gap-4">
          <Field label="Date" className="col-span-2"><Input type="date" max={todayPK()} required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Check in"><Input type="time" required value={f.checkIn} onChange={(e) => setF({ ...f, checkIn: e.target.value })} /></Field>
          <Field label="Check out"><Input type="time" value={f.checkOut} onChange={(e) => setF({ ...f, checkOut: e.target.value })} /></Field>
          <Field label="Reason" className="col-span-2"><Textarea required value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} placeholder="e.g. Forgot to check in, was at a client site" /></Field>
        </form>
      </Modal>
    </>
  );
}

export function MyLeave() {
  const types = useApi("/api/org?kind=leaveTypes");
  const bal = useApi("/api/leave?balance=1");
  const list = useApi("/api/leave");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [form, setForm] = useState(null);
  const [aiFilled, setAiFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const blank = { typeId: "", start: todayPK(), end: todayPK(), reason: "" };

  const smart = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setParsing(true);
    try {
      const r = await api("/api/ai/leave", { method: "POST", body: { text } });
      if (r.fallback) { toast.error(`Couldn't fill it automatically${r.detail ? ` — ${r.detail}` : ""}. Please use the form.`, { duration: 8000 }); setForm({ ...blank, reason: text }); setAiFilled(false); }
      else { setForm({ typeId: r.typeId, start: r.start, end: r.end, reason: r.reason }); setAiFilled(true); }
    } catch (err) { toast.error(err.message); setForm(blank); }
    setParsing(false);
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api("/api/leave", { method: "POST", body: form }); toast.success("Request sent to HR"); setForm(null); setText(""); list.reload(); bal.reload(); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  const cancel = async (id) => {
    try { await api("/api/leave", { method: "PATCH", body: { id, action: "cancel" } }); toast.success("Request cancelled"); list.reload(); bal.reload(); } catch (err) { toast.error(err.message); }
  };

  return (
    <>
      <PageHeader title="Leave" desc="Describe what you need in plain words. We'll fill the form; you confirm." actions={<Button onClick={() => { setForm(blank); setAiFilled(false); }}>Use the form</Button>} />
      <Card className="p-1.5 rise">
        <form onSubmit={smart} className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent ml-2.5 shrink-0" />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Need next Monday and Tuesday off for my sister's wedding" className="flex-1 h-10 bg-transparent text-[14px] outline-none placeholder:text-muted min-w-0" />
          <Button variant="primary" loading={parsing} className="h-9"><Wand2 size={14} /> Fill form</Button>
        </form>
      </Card>
      <p className="text-[12px] text-muted mt-2 ml-1">Works in English or Roman Urdu. Nothing is submitted until you confirm.</p>

      <div className="grid sm:grid-cols-4 gap-px bg-border border border-border rounded-[10px] overflow-hidden mt-6 rise">
        {(bal.data ?? Array.from({ length: 4 })).map((b, i) => (
          <div key={b?.typeId ?? i} className="bg-surface p-4">
            {b ? <>
              <p className="text-[12px] text-muted">{b.name}</p>
              <p className="serif text-[32px] leading-none mt-2 num">{b.remaining ?? "∞"}</p>
              <p className="text-[11px] text-muted mt-1.5 num">{b.quota != null ? `${b.used} used of ${b.quota}` : `${b.used} used`}{b.pending ? ` · ${b.pending} pending` : ""}</p>
            </> : <Skeleton className="h-16" />}
          </div>
        ))}
      </div>

      <Card className="mt-6 rise">
        <CardHead title="History" />
        {list.error ? <ErrorState message={list.error} onRetry={list.reload} /> : list.loading ? <SkeletonRows rows={3} /> : !list.data.length ? (
          <Empty icon={CalendarDays} title="No requests yet" desc="Try typing a request above." />
        ) : (
          <Table head={["Type", "Dates", "Days", "Reason", "Status", ""]}>
            {list.data.map((r) => (
              <tr key={r.id}>
                <Td>{r.typeName}</Td>
                <Td className="num text-muted">{r.start === r.end ? fmtDate(r.start) : `${fmtDate(r.start)} → ${fmtDate(r.end)}`}</Td>
                <Td className="num">{r.days}</Td>
                <Td className="text-muted max-w-48 truncate">{r.reason}</Td>
                <Td><Status value={r.status} />{r.comment && <span className="text-[11px] text-muted ml-2">“{r.comment}”</span>}</Td>
                <Td className="text-right">{r.status === "pending" && <Button size="sm" variant="ghost" onClick={() => cancel(r.id)}>Cancel</Button>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={!!form} onClose={() => setForm(null)} title="Confirm leave request" desc={aiFilled ? "Pre-filled by AI from your sentence. Check the details." : "Fill in your request."}
        footer={<><Button onClick={() => setForm(null)}>Cancel</Button><Button variant="primary" form="leave" loading={busy}>Submit request</Button></>}>
        {form && (
          <form id="leave" onSubmit={submit} className="grid grid-cols-2 gap-4">
            {aiFilled && <p className="col-span-2 flex items-center gap-1.5 text-[12px] text-muted"><Sparkles size={12} className="text-accent" /> AI-generated suggestion</p>}
            <Field label="Type" className="col-span-2">
              <Select required value={form.typeId} onChange={(e) => setForm({ ...form, typeId: e.target.value })}>
                <option value="">Select…</option>
                {(types.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="From"><Input type="date" required value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} /></Field>
            <Field label="To"><Input type="date" required min={form.start} value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} /></Field>
            <Field label="Reason" className="col-span-2"><Textarea required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
            <p className="col-span-2 text-[12px] text-muted">Weekends and public holidays aren&apos;t counted.</p>
          </form>
        )}
      </Modal>
    </>
  );
}

export function MyPayslips() {
  const { data, loading, error, reload } = useApi("/api/payslips");
  return (
    <>
      <PageHeader title="Payslips" desc="Released once Admin finalizes the month." />
      <Card className="rise">
        {error ? <ErrorState message={error} onRetry={reload} /> : loading ? <SkeletonRows rows={3} /> : !data.length ? (
          <Empty icon={FileText} title="No payslips yet" desc="Your first one appears after payroll is finalized." />
        ) : (
          <Table head={["Month", "Gross", "Deductions", "Tax", "Net", ""]}>
            {data.map((p) => (
              <tr key={p.id}>
                <Td className="num">{p.month}</Td><Td className="num">{pkr(p.proratedGross)}</Td><Td className="num">{pkr(p.deduction)}</Td>
                <Td className="num">{pkr(p.tax)}</Td><Td className="num font-medium">{pkr(p.net)}</Td>
                <Td className="text-right"><PayslipButton slip={p} /></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </>
  );
}

export function MyProfile() {
  const { user } = useAuth();
  const { data, loading, reload } = useApi(user.employeeId ? `/api/employees?id=${user.employeeId}` : null);
  const [f, setF] = useState({ phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const e = data?.employee;
  useEffect(() => { if (e) setF({ phone: e.phone ?? "", address: e.address ?? "" }); }, [e]);
  const save = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    try { await api("/api/me", { method: "PATCH", body: f }); toast.success("Profile updated"); reload(); } catch (err) { toast.error(err.message); }
    setBusy(false);
  };
  return (
    <>
      <PageHeader eyebrow={e?.code} title="Profile" desc="Job details are managed by HR. You can update your contact info." />
      {loading || !e ? <Card><SkeletonRows rows={5} /></Card> : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="rise">
            <CardHead title="Job" />
            <div className="divide-y divide-border border-t border-border text-[13px]">
              {[["Name", e.name], ["Email", e.email], ["Joined", fmtDate(e.joinDate)], ["Basic salary", pkr(e.basic)], ["Status", <Status key="s" value={e.status} />]].map(([k, v]) => (
                <div key={k} className="flex justify-between px-4 h-11 items-center"><span className="text-muted">{k}</span><span>{v}</span></div>
              ))}
            </div>
          </Card>
          <Card className="p-5 rise">
            <form onSubmit={save} className="space-y-4">
              <Field label="Phone"><Input value={f.phone} onChange={(ev) => setF({ ...f, phone: ev.target.value })} /></Field>
              <Field label="Address"><Textarea value={f.address} onChange={(ev) => setF({ ...f, address: ev.target.value })} /></Field>
              <Button variant="primary" loading={busy}>Save</Button>
            </form>
          </Card>
        </div>
      )}
    </>
  );
}
