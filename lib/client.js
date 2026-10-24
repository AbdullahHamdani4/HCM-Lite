"use client";
import { useCallback, useEffect, useState } from "react";
import { clientAuth } from "@/lib/firebase/client";

async function token() {
  const u = clientAuth().currentUser;
  return u ? u.getIdToken() : null;
}

/** Authenticated fetch to our API. Throws Error(message) on non-2xx. */
export async function api(path, { method = "GET", body, raw } = {}) {
  const t = await token();
  const res = await fetch(path, {
    method,
    headers: { ...(t && { Authorization: `Bearer ${t}` }), ...(body && { "Content-Type": "application/json" }) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (raw && res.ok) return res;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong");
  return json;
}

export function useApi(path) {
  const [state, set] = useState({ data: null, error: null, loading: !!path });
  const load = useCallback(async () => {
    if (!path) return;
    set((s) => ({ ...s, loading: true, error: null }));
    try {
      set({ data: await api(path), error: null, loading: false });
    } catch (e) {
      set({ data: null, error: e.message, loading: false });
    }
  }, [path]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

export async function download(path, filename) {
  const res = await api(path, { raw: true });
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export const pkr = (n) => "Rs " + Math.round(Number(n || 0)).toLocaleString("en-PK");
export const num = (n) => Number(n || 0).toLocaleString("en-PK");
export const fmtDate = (d) => (d ? new Date(d.length === 10 ? d + "T00:00:00" : d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
export const fmtTime = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" }) : "—");
export const todayPK = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" });
export const thisMonth = () => todayPK().slice(0, 7);
