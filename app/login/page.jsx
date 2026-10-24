"use client";
import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";
import { clientAuth } from "@/lib/firebase/client";
import { AuthShell, PreviewPanel } from "@/components/auth-shell";
import { Button, Field, Input } from "@/components/ui";

export default function Login() {
  const [f, setF] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmailAndPassword(clientAuth(), f.email, f.password);
      window.location.href = "/";
    } catch (err) {
      const msg = String(err.code).includes("disabled") ? "This account has been deactivated." : "Email or password is incorrect.";
      toast.error(msg);
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back." desc="Sign in with the account your Admin or HR created for you." aside={<PreviewPanel />}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email"><Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoFocus /></Field>
        <Field label="Password"><Input required type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Button variant="dark" size="lg" className="w-full mt-2" loading={busy}>Sign in <ArrowRight size={14} /></Button>
      </form>
    </AuthShell>
  );
}
