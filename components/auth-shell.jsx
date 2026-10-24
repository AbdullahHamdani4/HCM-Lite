"use client";

/** Split layout for setup/login: quiet form on the left, editorial panel on the right. */
export function AuthShell({ step, title, desc, children, aside }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 sm:px-12 py-8">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span className="size-5 rounded-[5px] bg-fg text-bg grid place-items-center text-[11px] num">H</span>
          HCM Lite
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-sm mx-auto lg:mx-0 lg:ml-[12%] rise">
            {step && <p className="num text-[12px] text-muted mb-3">{step}</p>}
            <h1 className="serif text-[44px] leading-[1.02]">{title}</h1>
            {desc && <p className="text-[13px] text-muted mt-3 mb-8">{desc}</p>}
            {children}
          </div>
        </div>
        <p className="text-[12px] text-muted">Saylani Hackathon · 2026</p>
      </div>
      <div className="hidden lg:flex relative overflow-hidden border-l border-border bg-surface">
        <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at 60% 40%, black 20%, transparent 75%)" }} />
        <div className="relative m-auto w-[78%] max-w-lg">{aside}</div>
      </div>
    </div>
  );
}

/** A static product preview — real UI pieces, not a stock illustration. */
export function PreviewPanel() {
  const rows = [["Ayesha Khan", "Engineering", "09:02", "present"], ["Bilal Ahmed", "Finance", "09:21", "late"], ["Sana Raza", "Design", "—", "on leave"]];
  const tone = { present: "text-ok bg-ok-bg", late: "text-warn bg-warn-bg", "on leave": "text-info bg-info-bg" };
  return (
    <div className="space-y-3 rise" style={{ animationDelay: "120ms" }}>
      <div className="rounded-[10px] border border-border bg-bg p-4">
        <p className="text-[11px] text-muted uppercase tracking-wider">Who is on leave today?</p>
        <p className="text-[13px] mt-2">1 person — Sana Raza, casual leave until Friday.</p>
        <p className="text-[11px] text-muted mt-2">AI-generated · from today&apos;s records</p>
      </div>
      <div className="grid grid-cols-3 rounded-[10px] border border-border bg-bg divide-x divide-border">
        {[["Present", "42"], ["On leave", "5"], ["Late", "3"]].map(([k, v]) => (
          <div key={k} className="p-4"><p className="text-[11px] text-muted">{k}</p><p className="serif text-[32px] leading-none mt-2 num">{v}</p></div>
        ))}
      </div>
      <div className="rounded-[10px] border border-border bg-bg divide-y divide-border">
        {rows.map(([n, d, t, s]) => (
          <div key={n} className="flex items-center gap-3 px-4 h-11 text-[12px]">
            <span className="size-6 rounded-full bg-subtle grid place-items-center text-[10px] text-muted">{n.split(" ").map((x) => x[0]).join("")}</span>
            <span className="flex-1">{n}<span className="text-muted ml-2">{d}</span></span>
            <span className="num text-muted">{t}</span>
            <span className={`px-1.5 h-5 leading-5 rounded-[4px] text-[11px] ${tone[s]}`}>{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
