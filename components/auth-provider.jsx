"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { api } from "@/lib/client";

const AuthCtx = createContext(null);

export const HOME = { admin: "/admin", hr: "/hr", employee: "/me" };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, loading: true });

  const refresh = useCallback(async () => {
    try {
      setState({ user: await api("/api/me"), loading: false });
    } catch {
      setState({ user: null, loading: false });
    }
  }, []);

  useEffect(
    () => onAuthStateChanged(clientAuth(), (u) => (u ? refresh() : setState({ user: null, loading: false }))),
    [refresh],
  );

  const logout = async () => {
    await signOut(clientAuth());
    window.location.href = "/login";
  };

  return <AuthCtx.Provider value={{ ...state, refresh, logout }}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
