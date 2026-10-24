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
        <p className="text-[12px] text-muted">© HCM Lite</p>
      </div>
      <div className="hidden lg:flex relative overflow-hidden border-l border-border bg-surface">
        <div className="absolute inset-0 opacity-[0.5]" style={{ backgroundImage: "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)", backgroundSize: "48px 48px", maskImage: "radial-gradient(ellipse at 60% 40%, black 20%, transparent 75%)" }} />
        <div className="relative m-auto w-[78%] max-w-lg">{aside}</div>
      </div>
    </div>
  );
}

/** Brand panel: what HCM Lite is, no fake numbers. */
export function PreviewPanel() {
  const points = [
    ["01", "Attendance", "Server-stamped check-in with late, half-day and absence rules."],
    ["02", "Leave", "Balances, overlap and holiday checks, one-click approvals."],
    ["03", "Payroll", "Monthly runs with tax, deductions and PDF payslips."],
    ["04", "Assistant", "Ask questions in plain words. Answers come from your own records."],
  ];
  return (
    <div className="rise" style={{ animationDelay: "120ms" }}>
      <div className="w-8 h-[3px] bg-accent mb-6" />
      <h2 className="serif text-[52px] leading-[1.02]">People operations,<br />without the paperwork.</h2>
      <p className="text-[14px] text-muted mt-4 max-w-md">One place for Admin, HR and every employee — from the first check-in to the monthly payslip.</p>
      <div className="mt-10 border-t border-border">
        {points.map(([n, t, d]) => (
          <div key={n} className="grid grid-cols-[40px_110px_1fr] gap-3 py-4 border-b border-border text-[13px]">
            <span className="num text-muted">{n}</span>
            <span className="font-medium">{t}</span>
            <span className="text-muted">{d}</span>
          </div>
        ))}
      </div>
      <p className="text-[12px] text-muted mt-6">Admin · HR · Employee</p>
    </div>
  );
}
