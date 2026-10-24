"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, HOME } from "@/components/auth-provider";

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [error, setError] = useState(null);
  useEffect(() => {
    if (loading) return;
    (async () => {
      const res = await fetch("/api/setup").then((r) => r.json()).catch(() => ({ error: "Server is not responding" }));
      if (res.error) return setError(res.error);
      if (!res.done) return router.replace("/setup");
      if (!user) return router.replace("/login");
      router.replace(user.mustChangePassword ? "/change-password" : HOME[user.role]);
    })();
  }, [user, loading, router]);
  if (error) return (
    <div className="min-h-dvh grid place-items-center px-6">
      <div className="max-w-md text-[13px]">
        <p className="serif text-[32px] leading-tight">Can&apos;t reach the database.</p>
        <p className="text-muted mt-2">Check the Firebase Admin environment variables on the server, then redeploy.</p>
        <pre className="num text-[12px] bg-bad-bg text-bad rounded-[8px] p-3 mt-4 whitespace-pre-wrap">{error}</pre>
      </div>
    </div>
  );
  return <div className="min-h-dvh grid place-items-center"><div className="skeleton size-6 rounded-full" /></div>;
}
