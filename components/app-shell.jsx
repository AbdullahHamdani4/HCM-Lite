"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Settings2, Users, UserCog, CalendarCheck, CalendarDays, Wallet, ScrollText, Megaphone,
  FileText, User, Search, Sun, Moon, LogOut, Bell, Menu, X, Sparkles, Command,
} from "lucide-react";
import { useAuth, HOME } from "./auth-provider";
import { AiPanel } from "./ai-panel";
import { cx } from "./ui";
import { api } from "@/lib/client";

export const NAV = {
  admin: [
    { group: "Overview", items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
    { group: "Company", items: [
      { href: "/admin/settings", label: "Setup", icon: Settings2 },
      { href: "/admin/users", label: "Logins", icon: UserCog },
    ] },
    { group: "People", items: [
      { href: "/admin/employees", label: "Employees", icon: Users },
      { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/admin/payroll", label: "Payroll", icon: Wallet },
    ] },
    { group: "Records", items: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
    ] },
  ],
  hr: [
    { group: "Overview", items: [{ href: "/hr", label: "Dashboard", icon: LayoutDashboard }] },
    { group: "People", items: [
      { href: "/hr/employees", label: "Employees", icon: Users },
      { href: "/hr/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/hr/leave", label: "Leave", icon: CalendarDays },
    ] },
    { group: "Pay", items: [{ href: "/hr/payroll", label: "Payroll", icon: Wallet }] },
    { group: "Comms", items: [{ href: "/hr/announcements", label: "Announcements", icon: Megaphone }] },
  ],
  employee: [
    { group: "Me", items: [
      { href: "/me", label: "Home", icon: LayoutDashboard },
      { href: "/me/attendance", label: "Attendance", icon: CalendarCheck },
      { href: "/me/leave", label: "Leave", icon: CalendarDays },
      { href: "/me/payslips", label: "Payslips", icon: FileText },
      { href: "/me/profile", label: "Profile", icon: User },
    ] },
  ],
};

const ROLE_LABEL = { admin: "Admin", hr: "HR", employee: "Employee" };

function Sidebar({ role, user, onNavigate }) {
  const path = usePathname();
  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
        <span className="size-6 rounded-[6px] bg-fg text-bg grid place-items-center text-[11px] num font-medium">{(user.companyName || "H")[0]}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium truncate leading-tight">{user.companyName || "HCM Lite"}</p>
          <p className="text-[11px] text-muted leading-tight">{ROLE_LABEL[role]} workspace</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-5">
        {NAV[role].map((g) => (
          <div key={g.group}>
            <p className="px-2 mb-1 text-[11px] text-muted">{g.group}</p>
            {g.items.map(({ href, label, icon: Icon }) => {
              const active = href === HOME[role] ? path === href : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  className={cx(
                    "relative flex items-center gap-2.5 h-8 px-2 rounded-[6px] text-[13px] transition-colors",
                    active ? "bg-subtle text-fg font-medium" : "text-muted hover:text-fg hover:bg-subtle/60",
                  )}
                >
                  {active && <span className="absolute -left-2 top-1.5 bottom-1.5 w-[2px] rounded-full bg-accent" />}
                  <Icon size={16} strokeWidth={1.5} />
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <UserCard user={user} />
    </div>
  );
}

function UserCard({ user }) {
  const { logout } = useAuth();
  const initials = user.name?.split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="border-t border-border p-3 flex items-center gap-2.5">
      <span className="size-8 rounded-full bg-subtle border border-border grid place-items-center text-[11px] font-medium">{initials}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] truncate leading-tight">{user.name}</p>
        <p className="text-[11px] text-muted truncate leading-tight">{user.email}</p>
      </div>
      <button onClick={logout} title="Sign out" className="p-1.5 rounded-[6px] text-muted hover:text-fg hover:bg-subtle"><LogOut size={15} strokeWidth={1.5} /></button>
    </div>
  );
}

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.theme = next ? "dark" : "light"; } catch {}
  };
  return (
    <button onClick={toggle} title="Toggle theme" className="size-8 grid place-items-center rounded-[6px] text-muted hover:text-fg hover:bg-subtle">
      {dark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
    </button>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  useEffect(() => { api("/api/notifications").then(setItems).catch(() => {}); }, []);
  const unread = items.filter((n) => !n.read).length;
  const toggle = () => {
    setOpen(!open);
    if (!open && unread) api("/api/notifications", { method: "POST" }).then(() => setItems(items.map((n) => ({ ...n, read: true })))).catch(() => {});
  };
  return (
    <div className="relative">
      <button onClick={toggle} title="Notifications" className="relative size-8 grid place-items-center rounded-[6px] text-muted hover:text-fg hover:bg-subtle">
        <Bell size={16} strokeWidth={1.5} />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-accent" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 z-40 rounded-[10px] border border-border bg-surface rise overflow-hidden">
            <p className="px-4 h-10 flex items-center text-[12px] text-muted border-b border-border">Notifications</p>
            {items.length === 0 ? <p className="p-4 text-[13px] text-muted">You&apos;re all caught up.</p> : (
              <div className="max-h-80 overflow-y-auto divide-y divide-border">
                {items.map((n) => (
                  <div key={n.id} className="px-4 py-3 text-[13px]">
                    <p>{n.text}</p>
                    <p className="text-[11px] text-muted mt-1 num">{new Date(n.at).toLocaleString("en-GB")}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CommandPalette({ role, open, setOpen, openAi }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const items = [
    ...NAV[role].flatMap((g) => g.items.map((it) => ({ ...it, group: g.group, run: () => router.push(it.href) }))),
    { label: "Ask the assistant", icon: Sparkles, group: "AI", run: openAi },
  ].filter((x) => x.label.toLowerCase().includes(q.toLowerCase()));

  useEffect(() => { setI(0); }, [q]);
  useEffect(() => { if (!open) setQ(""); }, [open]);
  if (!open) return null;

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setI((i + 1) % items.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setI((i - 1 + items.length) % items.length); }
    if (e.key === "Enter" && items[i]) { items[i].run(); setOpen(false); }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="absolute inset-0 bg-black/20 dark:bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg rounded-[12px] border border-border bg-surface overflow-hidden rise">
        <div className="flex items-center gap-2 px-4 h-12 border-b border-border">
          <Search size={16} strokeWidth={1.5} className="text-muted" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Jump to…" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted" />
          <kbd className="num text-[11px] text-muted border border-border rounded px-1.5">esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {items.length === 0 && <p className="p-3 text-[13px] text-muted">No matches.</p>}
          {items.map((it, idx) => (
            <button
              key={it.label}
              onMouseEnter={() => setI(idx)}
              onClick={() => { it.run(); setOpen(false); }}
              className={cx("w-full flex items-center gap-3 h-9 px-2.5 rounded-[6px] text-[13px] text-left", idx === i ? "bg-subtle" : "")}
            >
              <it.icon size={16} strokeWidth={1.5} className="text-muted" />
              <span className="flex-1">{it.label}</span>
              <span className="text-[11px] text-muted">{it.group}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ role, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [mobile, setMobile] = useState(false);
  const [palette, setPalette] = useState(false);
  const [ai, setAi] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/change-password");
    else if (user.role !== role) router.replace(HOME[user.role]);
  }, [user, loading, role, router]);

  useEffect(() => {
    const k = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette((p) => !p); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") { e.preventDefault(); setAi((p) => !p); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  if (loading || !user || user.role !== role) {
    return <div className="min-h-dvh grid place-items-center"><div className="skeleton size-6 rounded-full" /></div>;
  }

  const crumbs = path.split("/").filter(Boolean);
  const current = NAV[role].flatMap((g) => g.items).find((it) => it.href === path)?.label ?? crumbs.at(-1);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden lg:block sticky top-0 h-dvh border-r border-border bg-surface">
        <Sidebar role={role} user={user} />
      </aside>
      {mobile && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobile(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-surface border-r border-border rise">
            <button onClick={() => setMobile(false)} className="absolute right-2 top-3 p-1.5 text-muted"><X size={16} /></button>
            <Sidebar role={role} user={user} onNavigate={() => setMobile(false)} />
          </div>
        </div>
      )}
      <div className="min-w-0 flex flex-col">
        <header className="sticky top-0 z-20 h-14 flex items-center gap-2 px-4 sm:px-6 border-b border-border bg-bg/85 backdrop-blur">
          <button onClick={() => setMobile(true)} className="lg:hidden p-1.5 -ml-1.5 text-muted"><Menu size={18} strokeWidth={1.5} /></button>
          <div className="flex items-center gap-1.5 text-[13px] min-w-0">
            <span className="text-muted hidden sm:inline">{ROLE_LABEL[role]}</span>
            <span className="text-border-strong hidden sm:inline">/</span>
            <span className="truncate capitalize">{current}</span>
          </div>
          <div className="flex-1" />
          <button onClick={() => setPalette(true)} className="hidden sm:flex items-center gap-2 h-8 pl-2.5 pr-1.5 w-56 rounded-[6px] border border-border bg-surface text-[13px] text-muted hover:border-border-strong">
            <Search size={14} strokeWidth={1.5} />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="num text-[11px] border border-border rounded px-1 flex items-center gap-0.5"><Command size={10} />K</kbd>
          </button>
          <button onClick={() => setAi(true)} className="flex items-center gap-1.5 h-8 px-2.5 rounded-[6px] border border-border bg-surface text-[13px] hover:bg-subtle">
            <Sparkles size={14} strokeWidth={1.5} className="text-accent" />
            <span className="hidden sm:inline">Ask</span>
          </button>
          <Notifications />
          <ThemeToggle />
        </header>
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-[1280px] w-full">{children}</main>
      </div>
      <CommandPalette role={role} open={palette} setOpen={setPalette} openAi={() => setAi(true)} />
      <AiPanel open={ai} onClose={() => setAi(false)} role={role} />
    </div>
  );
}
