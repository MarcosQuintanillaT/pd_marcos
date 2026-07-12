"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, isDemoMode, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Perfil, Rol } from "@/lib/types";

type AuthValue = {
  configured: boolean;
  demoMode: boolean;
  loading: boolean;
  user: User | null;
  perfil: Perfil | null;
  role: Rol | null;
  login: (email: string, password: string) => Promise<string | null>;
  demoLogin: (role: Rol) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const demoMode = isDemoMode();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      if (demoMode) {
        const role = sessionStorage.getItem("portafolio-demo-role") as Rol | null;
        setUser(null);
        setPerfil(role ? { id: `demo-${role}`, email: `${role}@demo.local`, nombre: role === "docente" ? "Docente BTP" : "Supervisor", rol: role } : null);
        return;
      }

      if (!configured) {
        setUser(null);
        setPerfil(null);
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        setUser(null);
        setPerfil(null);
        return;
      }

      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;

      setUser(data.session?.user ?? null);
      if (!data.session) {
        setPerfil(null);
        return;
      }

      const response = await fetch("/api/perfil", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      setPerfil(response.ok ? json.perfil : null);
    } catch (error) {
      console.error("No se pudo restaurar la sesión", error);
      setUser(null);
      setPerfil(null);
    } finally {
      setLoading(false);
    }
  }, [configured, demoMode]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    if (!supabase)
      return process.env.NODE_ENV !== "production"
        ? "Supabase no está configurado"
        : "Servicio temporalmente no disponible";
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos" : error.message;
    setUser(data.user);
    setLoading(true);
    const response = await fetch("/api/perfil", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.perfil) {
      await supabase.auth.signOut();
      setLoading(false);
      return "La cuenta no tiene un perfil autorizado";
    }
    setPerfil(json.perfil);
    setLoading(false);
    return null;
  }, []);

  const demoLogin = useCallback((role: Rol) => {
    if (!demoMode) return;
    sessionStorage.setItem("portafolio-demo-role", role);
    setPerfil({ id: `demo-${role}`, email: `${role}@demo.local`, nombre: role === "docente" ? "Marcos — Docente BTP" : "Supervisor académico", rol: role });
  }, [demoMode]);

  const logout = useCallback(async () => {
    if (configured) await createClient()?.auth.signOut();
    if (demoMode) sessionStorage.removeItem("portafolio-demo-role");
    setUser(null);
    setPerfil(null);
  }, [configured, demoMode]);

  const value = useMemo<AuthValue>(() => ({ configured, demoMode, loading, user, perfil, role: perfil?.rol ?? null, login, demoLogin, logout, refresh }), [configured, demoMode, loading, user, perfil, login, demoLogin, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}
