"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import type { Portafolio } from "@/lib/types";

type PortfolioContextValue = {
  portfolios: Portafolio[];
  selected: Portafolio | null;
  selectedId: string;
  loading: boolean;
  error: string;
  select: (id: string) => void;
  refresh: () => Promise<void>;
  create: (input: Pick<Portafolio, "anio_lectivo" | "area" | "jornada"> & { institucion?: string | null }) => Promise<string | null>;
  update: (id: string, input: Partial<Pick<Portafolio, "area" | "jornada" | "institucion" | "estado">>) => Promise<string | null>;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);
const STORAGE_KEY = "portafolio-seleccionado";

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { configured, demoMode, perfil } = useAuth();
  const [portfolios, setPortfolios] = useState<Portafolio[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(configured && !demoMode);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (demoMode) {
      const demo: Portafolio = {
        id: "demo-2026",
        docente_id: perfil?.id ?? "demo",
        anio_lectivo: 2026,
        area: process.env.NEXT_PUBLIC_DOCENTE_AREA || "Informática",
        jornada: process.env.NEXT_PUBLIC_DOCENTE_JORNADA || "Matutina",
        institucion: null,
        estado: "Activo",
        creado_en: new Date().toISOString(),
        actualizado_en: new Date().toISOString(),
        cerrado_en: null,
      };
      setPortfolios([demo]);
      setSelectedId(demo.id);
      setLoading(false);
      return;
    }
    if (!configured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/portafolios", { cache: "no-store" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudieron cargar los años lectivos");
      const next = (json.portafolios ?? []) as Portafolio[];
      setPortfolios(next);
      setSelectedId((current) => {
        const saved = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : "";
        const valid = next.find((item) => item.id === current || item.id === saved);
        return valid?.id ?? next.find((item) => item.estado === "Activo")?.id ?? next[0]?.id ?? "";
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los años lectivos");
    } finally {
      setLoading(false);
    }
  }, [configured, demoMode, perfil?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  function select(id: string) {
    if (!portfolios.some((item) => item.id === id)) return;
    setSelectedId(id);
    window.localStorage.setItem(STORAGE_KEY, id);
  }

  async function create(input: Pick<Portafolio, "anio_lectivo" | "area" | "jornada"> & { institucion?: string | null }) {
    try {
      const response = await fetch("/api/portafolios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) return json.error ?? "No se pudo crear el portafolio";
      window.localStorage.setItem(STORAGE_KEY, json.portafolio.id);
      setSelectedId(json.portafolio.id);
      await refresh();
      return null;
    } catch {
      return "No se pudo conectar con el servidor";
    }
  }

  async function update(id: string, input: Partial<Pick<Portafolio, "area" | "jornada" | "institucion" | "estado">>) {
    try {
      const response = await fetch(`/api/portafolios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) return json.error ?? "No se pudo actualizar el portafolio";
      await refresh();
      return null;
    } catch {
      return "No se pudo conectar con el servidor";
    }
  }

  const selected = portfolios.find((item) => item.id === selectedId) ?? null;
  const value = useMemo<PortfolioContextValue>(() => ({
    portfolios,
    selected,
    selectedId,
    loading,
    error,
    select,
    refresh,
    create,
    update,
  // Functions close over the current portfolio list intentionally.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [portfolios, selected, selectedId, loading, error, refresh]);

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio debe usarse dentro de PortfolioProvider");
  return context;
}

export function withPortfolioQuery(path: string, portfolioId: string) {
  if (!portfolioId) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}portafolio=${encodeURIComponent(portfolioId)}`;
}
