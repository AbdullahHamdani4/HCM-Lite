"use client";
import { useEffect } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";

export const cx = (...c) => c.filter(Boolean).join(" ");

export function Button({ variant = "secondary", size = "md", loading, className, children, ...p }) {
  const v = {
    primary: "bg-accent text-accent-fg hover:brightness-95 border-transparent",
    secondary: "bg-surface text-fg border-border hover:bg-subtle",
    ghost: "border-transparent text-muted hover:text-fg hover:bg-subtle",
    danger: "bg-surface text-bad border-border hover:bg-bad-bg",
    dark: "bg-fg text-bg border-transparent hover:opacity-90",
  }[variant];
  const s = { sm: "h-7 px-2.5 text-[12px] gap-1.5", md: "h-8 px-3 text-[13px] gap-2", lg: "h-10 px-4 text-[14px] gap-2" }[size];
  return (
    <button
      className={cx("inline-flex items-center justify-center rounded-[6px] border font-medium transition-[background,color,filter] duration-150 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap", v, s, className)}
      disabled={loading || p.disabled}
      {...p}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

const field = "w-full h-8 rounded-[6px] border border-border bg-surface px-2.5 text-[13px] text-fg placeholder:text-muted/70 transition-colors hover:border-border-strong focus:border-fg/40 focus:outline-none";

export const Input = ({ className, ...p }) => <input className={cx(field, className)} {...p} />;
export const Textarea = ({ className, ...p }) => <textarea className={cx(field, "h-auto py-2 min-h-20 resize-y", className)} {...p} />;
export const Select = ({ className, children, ...p }) => <select className={cx(field, "pr-7", className)} {...p}>{children}</select>;

export function Field({ label, hint, children, className }) {
  return (
    <label className={cx("flex flex-col gap-1.5", className)}>
      <span className="text-[12px] font-medium text-fg">{label}</span>
      {children}
      {hint && <span className="text-[12px] text-muted">{hint}</span>}
    </label>
  );
}

export function Card({ className, children, ...p }) {
  return <div className={cx("rounded-[10px] border border-border bg-surface", className)} {...p}>{children}</div>;
}

export function CardHead({ title, desc, action }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
      <div>
        <h3 className="text-[13px] font-medium">{title}</h3>
        {desc && <p className="text-[12px] text-muted mt-0.5">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

const TONES = {
  neutral: "bg-subtle text-muted",
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-info-bg text-info",
  accent: "bg-accent/10 text-accent",
};
export function Badge({ tone = "neutral", children, className }) {
  return <span className={cx("inline-flex items-center gap-1 rounded-[4px] px-1.5 h-5 text-[11px] font-medium capitalize", TONES[tone], className)}>{children}</span>;
}

const STATUS_TONE = {
  present: "ok", late: "warn", half_day: "warn", missing_checkout: "warn", on_leave: "info", absent: "bad", not_checked_in: "neutral",
  pending: "warn", approved: "ok", rejected: "bad", cancelled: "neutral", draft: "neutral", finalized: "ok", active: "ok", inactive: "neutral",
};
export const Status = ({ value }) => <Badge tone={STATUS_TONE[value] ?? "neutral"}>{String(value ?? "").replace(/_/g, " ")}</Badge>;

export const Skeleton = ({ className, ...p }) => <div className={cx("skeleton", className)} {...p} />;

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-5" />)}
    </div>
  );
}

export function Empty({ icon: Icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && <div className="size-9 rounded-[8px] border border-border grid place-items-center text-muted mb-3"><Icon size={16} strokeWidth={1.5} /></div>}
      <p className="text-[13px] font-medium">{title}</p>
      {desc && <p className="text-[12px] text-muted mt-1 max-w-xs">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex items-center gap-3 m-4 p-3 rounded-[8px] bg-bad-bg text-bad text-[13px]">
      <AlertCircle size={16} strokeWidth={1.5} />
      <span className="flex-1">{message}</span>
      {onRetry && <Button size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}

export function PageHeader({ eyebrow, title, desc, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 rise">
      <div>
        {eyebrow && <p className="text-[12px] text-muted mb-2 num">{eyebrow}</p>}
        <h1 className="serif text-[40px] leading-[1.05]">{title}</h1>
        {desc && <p className="text-[13px] text-muted mt-2 max-w-xl">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, loading, tone }) {
  return (
    <div className="px-4 py-4 min-w-0">
      <p className="text-[12px] text-muted truncate">{label}</p>
      {loading ? <Skeleton className="h-8 w-16 mt-2" /> : (
        <p className={cx("serif text-[34px] leading-none mt-2 num", tone === "accent" && "text-accent")} style={{ fontFamily: "var(--font-serif)" }}>{value}</p>
      )}
      {sub && <p className="text-[12px] text-muted mt-1.5 truncate">{sub}</p>}
    </div>
  );
}

export function StatRow({ children }) {
  return <Card className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] divide-x divide-y md:divide-y-0 divide-border overflow-hidden rise">{children}</Card>;
}

export function Table({ head, children, className }) {
  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-border text-left">
            {head.map((h, i) => <th key={i} className="px-4 h-9 font-normal text-[12px] text-muted whitespace-nowrap">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">{children}</tbody>
      </table>
    </div>
  );
}
export const Td = ({ className, children, ...p }) => <td className={cx("px-4 h-11 whitespace-nowrap", className)} {...p}>{children}</td>;

export function Modal({ open, onClose, title, desc, children, footer, wide }) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/30 dark:bg-black/60" onClick={onClose} />
      <div className={cx("relative w-full bg-surface border border-border rounded-t-[12px] sm:rounded-[12px] rise max-h-[90vh] flex flex-col", wide ? "sm:max-w-2xl" : "sm:max-w-md")}>
        <div className="flex items-start justify-between px-5 pt-5 pb-1">
          <div>
            <h2 className="text-[16px] font-medium">{title}</h2>
            {desc && <p className="text-[13px] text-muted mt-1">{desc}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-fg p-1 -m-1"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 overflow-y-auto">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-3 border-t border-border">{footer}</div>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx("relative h-9 px-3 text-[13px] whitespace-nowrap transition-colors", value === t.value ? "text-fg" : "text-muted hover:text-fg")}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 num text-[11px] text-muted">{t.count}</span>}
          {value === t.value && <span className="absolute left-3 right-3 -bottom-px h-px bg-fg" />}
        </button>
      ))}
    </div>
  );
}

/** Shows a one-time temporary password the user must copy. */
export function SecretNote({ email, password }) {
  return (
    <div className="rounded-[8px] border border-border bg-subtle p-3 text-[13px] space-y-1">
      <p className="text-muted">Share these once. They will be asked to change the password on first sign-in.</p>
      <p>Email: <span className="num">{email}</span></p>
      <p>Temporary password: <span className="num font-medium select-all">{password}</span></p>
    </div>
  );
}
