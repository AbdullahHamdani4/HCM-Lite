"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { clientAuth } from "@/lib/firebase/client";
import { AuthShell, PreviewPanel } from "@/components/auth-shell";
import { Button, Field, Input } from "@/components/ui";

export default function Setup() {
  const router = useRouter();
  const [f, setF] = useState({ companyName: "", name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    fetch("/api/setup").then((r) => r.json()).then((d) => d.done && router.replace("/login")).catch(() => {});
  }, [router]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      await signInWithEmailAndPassword(clientAuth(), f.email, f.password);
      toast.success("Company created. Welcome aboard.");
      window.location.href = "/admin/settings";
    } catch (err) {
      toast.error(err.message || "Setup failed");
      setBusy(false);
    }
  }

  return (
    <AuthShell step="01 — First run" title="Set up your company." desc="Create the company and its first Admin. Everything else starts empty and fills in as your team works." aside={<PreviewPanel />}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Company name"><Input required value={f.companyName} onChange={set("companyName")} placeholder="Acme Pvt Ltd" autoFocus /></Field>
        <div className="h-px bg-border my-6" />
        <Field label="Your name"><Input required value={f.name} onChange={set("name")} placeholder="Full name" /></Field>
        <Field label="Admin email"><Input required type="email" value={f.email} onChange={set("email")} placeholder="admin@company.com" /></Field>
        <Field label="Password" hint="At least 8 characters."><Input required minLength={8} type="password" value={f.password} onChange={set("password")} /></Field>
        <Button variant="dark" size="lg" className="w-full mt-2" loading={busy}>Create company <ArrowRight size={14} /></Button>
      </form>
    </AuthShell>
  );
}
