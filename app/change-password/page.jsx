"use client";
import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { toast } from "sonner";
import { clientAuth } from "@/lib/firebase/client";
import { api } from "@/lib/client";
import { AuthShell, PreviewPanel } from "@/components/auth-shell";
import { Button, Field, Input } from "@/components/ui";
import { useAuth, HOME } from "@/components/auth-provider";

export default function ChangePassword() {
  const { user, logout } = useAuth();
  const [f, setF] = useState({ a: "", b: "" });
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (f.a !== f.b) return toast.error("Passwords don't match");
    setBusy(true);
    try {
      await updatePassword(clientAuth().currentUser, f.a);
      await api("/api/me", { method: "POST" });
      toast.success("Password updated");
      window.location.href = HOME[user?.role] ?? "/";
    } catch (err) {
      toast.error(String(err.code).includes("recent") ? "Please sign in again, then change your password." : err.message);
      setBusy(false);
    }
  }

  return (
    <AuthShell step="Security" title="Choose a new password." desc="You signed in with a temporary password. Set your own to continue." aside={<PreviewPanel />}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="New password" hint="At least 8 characters."><Input required minLength={8} type="password" value={f.a} onChange={(e) => setF({ ...f, a: e.target.value })} autoFocus /></Field>
        <Field label="Confirm password"><Input required minLength={8} type="password" value={f.b} onChange={(e) => setF({ ...f, b: e.target.value })} /></Field>
        <Button variant="dark" size="lg" className="w-full mt-2" loading={busy}>Save and continue</Button>
        <button type="button" onClick={logout} className="w-full text-[12px] text-muted hover:text-fg">Sign out</button>
      </form>
    </AuthShell>
  );
}
