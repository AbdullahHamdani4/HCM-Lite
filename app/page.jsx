"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, HOME } from "@/components/auth-provider";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (loading) return;
    (async () => {
      const { done } = await fetch("/api/setup").then((r) => r.json()).catch(() => ({ done: true }));
      if (!done) return router.replace("/setup");
      if (!user) return router.replace("/login");
      router.replace(user.mustChangePassword ? "/change-password" : HOME[user.role]);
    })();
  }, [user, loading, router]);
  return <div className="min-h-dvh grid place-items-center"><div className="skeleton size-6 rounded-full" /></div>;
}
