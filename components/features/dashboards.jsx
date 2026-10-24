"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { api, useApi, pkr, num, fmtDate, todayPK } from "@/lib/client";
import { Button, Card, CardHead, Input, PageHeader, Select, Stat, StatRow, ErrorState, Skeleton, Empty } from "@/components/ui";
import { useOrg, Announcements } from "./people";
import { useAuth } from "@/components/auth-provider";

const axis = { fontSize: 11, fill: "var(--muted)", fontFamily: "var(--font-mono)" };
const tip = { contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }, cursor: { fill: "var(--subtle)" } };

function Filters({ f, setF }) {
  const org = useOrg();
  return (
    <div className="flex flex-wrap gap-2">
      <Input type="date" value={f.from} max={f.to} onChange={(e) => setF({ ...f, from: e.target.value })} className="w-38" />
      <Input type="date" value={f.to} min={f.from} max={todayPK()} onChange={(e) => setF({ ...f, to: e.target.value })} className="w-38" />
      <Select value={f.dept} onChange={(e) => setF({ ...f, dept: e.target.value })} className="w-44">
        <option value="">All departments</option>
        {org.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </Select>
    </div>
  );
}

function useDash() {
  const t = todayPK();
  const [f, setF] = useState({ from: t.slice(0, 8) + "01", to: t, dept: "" });
  const q = useApi(`/api/dashboard?from=${f.from}&to=${f.to}&dept=${f.dept}`);
  return { f, setF, ...q };
}

function AiSummary({ kpis, extra }) {
  const [state, setState] = useState({ bullets: null, busy: false });
  const run = async () => {
    setState({ bullets: null, busy: true });
    try {
      const r = await api("/api/ai/summary", { method: "POST", body: { kpis: { ...kpis, ...extra } } });
      if (r.fallback || !r.bullets.length) toast.error(`Summary is unavailable right now. ${r.detail ?? ""}`.trim(), { duration: 8000 });
      setState({ bullets: r.bullets, busy: false });
    } catch (e) {
      toast.error(e.message);
      setState({ bullets: null, busy: false });
    }
  };
  return (
    <Card className="rise">
      <CardHead title="Insights" desc="A short read of the numbers above"
        action={<Button size="sm" onClick={run} loading={state.busy}><Sparkles size={13} className="text-accent" /> Summarize</Button>} />
      <div className="px-4 pb-4">
        {state.busy ? <div className="space-y-2">{[80, 92, 70].map((w) => <Skeleton key={w} className="h-4" style={{ width: `${w}%` }} />)}</div>
          : state.bullets?.length ? (
            <>
              <ul className="space-y-2">
                {state.bullets.map((b, i) => <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed"><span className="num text-[11px] text-muted pt-0.5">0{i + 1}</span>{b}</li>)}
              </ul>
              <p className="text-[11px] text-muted mt-3 flex items-center gap-1"><Sparkles size={10} /> AI-generated from the current filters</p>
            </>
          ) : <p className="text-[13px] text-muted">Click Summarize for 3–5 takeaways, written only from these figures.</p>}
      </div>
    </Card>
  );
}

function Trend({ data, loading }) {
  return (
    <Card className="rise">
      <CardHead title="Attendance rate" desc="Per working day, %" />
      <div className="h-56 px-2 pb-3">
        {loading ? <Skeleton className="h-full mx-2" /> : !data?.length ? <Empty title="No working days in range" /> : (
          <ResponsiveContainer>
            <AreaChart data={data} margin={{ left: -20, right: 12, top: 8 }}>
              <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--accent)" stopOpacity={0.18} /><stop offset="1" stopColor="var(--accent)" stopOpacity={0} /></linearGradient></defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="date" tick={axis} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tick={axis} tickLine={false} axisLine={false} />
              <Tooltip {...tip} />
              <Area dataKey="rate" stroke="var(--accent)" strokeWidth={1.5} fill="url(#g)" name="Rate %" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function Bars({ title, desc, data, x, y, format = num, loading }) {
  return (
    <Card className="rise">
      <CardHead title={title} desc={desc} />
      <div className="h-56 px-2 pb-3">
        {loading ? <Skeleton className="h-full mx-2" /> : !data?.some((d) => d[y]) ? <Empty title="No data yet" /> : (
          <ResponsiveContainer>
            <BarChart data={data} margin={{ left: -12, right: 12, top: 8 }}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey={x} tick={axis} tickLine={false} axisLine={false} />
              <YAxis tick={axis} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
              <Tooltip {...tip} formatter={(v) => format(v)} />
              <Bar dataKey={y} fill="var(--fg)" radius={[3, 3, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function ListCard({ title, desc, rows, empty, render }) {
  return (
    <Card className="rise">
      <CardHead title={title} desc={desc} />
      {!rows ? <div className="px-4 pb-4 space-y-2"><Skeleton className="h-5" /><Skeleton className="h-5" /></div>
        : !rows.length ? <p className="px-4 pb-4 text-[13px] text-muted">{empty}</p>
          : <div className="divide-y divide-border border-t border-border">{rows.map(render)}</div>}
    </Card>
  );
}

const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

export function HrDashboard() {
  const { user } = useAuth();
  const { f, setF, data, loading, error, reload } = useDash();
  const k = data?.kpis ?? {};
  return (
    <>
      <PageHeader eyebrow={fmtDate(todayPK())} title={`${greet()}, ${user.name.split(" ")[0]}.`} desc="Today's floor, this period's patterns, and what needs your decision." actions={<Filters f={f} setF={setF} />} />
      {error && <ErrorState message={error} onRetry={reload} />}
      <StatRow>
        <Stat label="Headcount" value={k.headcount} loading={loading} />
        <Stat label="Present today" value={k.presentToday} loading={loading} />
        <Stat label="On leave today" value={k.onLeaveToday} loading={loading} />
        <Stat label="Late today" value={k.lateToday} loading={loading} />
        <Stat label="Pending approvals" value={k.pendingApprovals} loading={loading} tone={k.pendingApprovals ? "accent" : undefined} />
        <Stat label="Attendance rate" value={loading ? "" : `${k.attendanceRate}%`} loading={loading} sub={`Late ${k.latePercent ?? 0}% of arrivals`} />
      </StatRow>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 mt-6">
        <Trend data={data?.trend} loading={loading} />
        <AiSummary kpis={k} extra={{ lateComers: data?.lateComers, leaveByType: data?.leaveByType, absenteeism: data?.absenteeism, period: `${f.from} to ${f.to}` }} />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        <Bars title="Absenteeism" desc="% of working days absent, by department" data={data?.absenteeism} x="name" y="absent" format={(v) => `${v}%`} loading={loading} />
        <Bars title="Leave by type" desc="Approved days in range" data={data?.leaveByType} x="type" y="days" loading={loading} />
        <ListCard title="Most late" desc="Top 5 in range" rows={data?.lateComers} empty="No one has been late. Nice."
          render={(r, i) => <div key={r.code} className="flex items-center gap-3 px-4 h-10 text-[13px]"><span className="num text-[11px] text-muted w-4">{i + 1}</span><span className="flex-1">{r.name}</span><span className="num">{r.count}×</span></div>} />
      </div>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <ListCard title="On leave today" rows={data?.onLeaveToday} empty="Everyone is in today."
          render={(r) => <div key={r.name} className="flex items-center gap-3 px-4 h-10 text-[13px]"><span className="flex-1">{r.name}</span><span className="text-muted">{r.type}</span><span className="num text-[12px] text-muted">until {r.until.slice(5)}</span></div>} />
        <Announcements compact />
      </div>
    </>
  );
}

export function AdminDashboard() {
  const { user } = useAuth();
  const { f, setF, data, loading, error, reload } = useDash();
  const k = data?.kpis ?? {};
  return (
    <>
      <PageHeader eyebrow={user.companyName} title="Company overview" desc="Headcount, cost and movement across the organization." actions={<Filters f={f} setF={setF} />} />
      {error && <ErrorState message={error} onRetry={reload} />}
      <StatRow>
        <Stat label="Headcount" value={k.headcount} loading={loading} />
        <Stat label="Attrition YTD" value={loading ? "" : `${k.attritionYtd}%`} loading={loading} />
        <Stat label="Payroll cost" value={k.payrollCost ? pkr(k.payrollCost) : "—"} loading={loading} sub={k.payrollMonth ?? "No run yet"} />
        <Stat label="Avg gross salary" value={k.avgSalary ? pkr(k.avgSalary) : "—"} loading={loading} />
        <Stat label="Attendance rate" value={loading ? "" : `${k.attendanceRate}%`} loading={loading} />
      </StatRow>
      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 mt-6">
        <Trend data={data?.trend} loading={loading} />
        <AiSummary kpis={k} extra={{ headcountByDept: data?.headcountByDept, payrollByDept: data?.payrollByDept, period: `${f.from} to ${f.to}` }} />
      </div>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        <Bars title="Headcount by department" data={data?.headcountByDept} x="name" y="count" loading={loading} />
        <Bars title="Payroll cost by department" desc={k.payrollMonth ?? ""} data={data?.payrollByDept} x="name" y="gross" format={pkr} loading={loading} />
        <Bars title="Gender" desc="Active employees" data={data?.gender} x="name" y="count" loading={loading} />
      </div>
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <Card className="rise">
          <CardHead title="Recent activity" action={<Link href="/admin/audit" className="text-[12px] text-muted hover:text-fg flex items-center gap-1">Audit log <ArrowUpRight size={12} /></Link>} />
          {!data ? <div className="px-4 pb-4"><Skeleton className="h-20" /></div> : !data.audit.length ? <p className="px-4 pb-4 text-[13px] text-muted">No activity yet.</p> : (
            <div className="divide-y divide-border border-t border-border">
              {data.audit.map((a, i) => (
                <div key={i} className="flex items-center gap-3 px-4 h-10 text-[13px]">
                  <span className="flex-1 truncate"><span className="font-medium">{a.actorName}</span> <span className="text-muted">{a.action.replace(/_/g, " ")}</span> {a.entity}</span>
                  <span className="num text-[11px] text-muted">{new Date(a.atIso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Announcements compact />
      </div>
    </>
  );
}
