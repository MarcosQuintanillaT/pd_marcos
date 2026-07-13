"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, FileSearch, LoaderCircle, Search } from "lucide-react";
import { usePortfolio } from "@/components/portfolio-provider";
import { findByCode, PORTFOLIO_SECTIONS, sectionHref } from "@/lib/portfolio";
import type { Documento, EstadoDocumento, Rol } from "@/lib/types";

const STATES: Array<EstadoDocumento | "Todos"> = ["Todos", "Pendiente", "Revisado", "Aprobado"];

export function DocumentSearch({ role }: { role: Rol }) {
  const { selectedId } = usePortfolio();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EstadoDocumento | "Todos">(role === "supervisor" ? "Pendiente" : "Todos");
  const [section, setSection] = useState("Todos");
  const [page, setPage] = useState(1);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({ portafolio: selectedId, pagina: String(page), limite: "12" });
      if (query.trim()) params.set("q", query.trim());
      if (status !== "Todos") params.set("estado", status);
      if (section !== "Todos") params.set("seccion", section);
      void fetch(`/api/documentos?${params}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          const json = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(json.error ?? "No se pudo buscar");
          setDocuments(json.documentos ?? []);
          setPages(json.paginas ?? 0);
          setTotal(json.total ?? 0);
        })
        .catch((caught: unknown) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return;
          setError(caught instanceof Error ? caught.message : "No se pudo buscar");
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, query, section, selectedId, status]);

  function resetPage<T>(setter: (value: T) => void, value: T) {
    setPage(1);
    setter(value);
  }

  return (
    <section className="mt-9 rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-4 shadow-[0_8px_24px_rgba(35,55,49,.06)] sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1">Localizador de evidencias</p>
          <h2 className="text-lg font-bold text-[#294740]">{role === "supervisor" ? "Bandeja de revisión" : "Buscar documentos"}</h2>
        </div>
        <span className="text-xs font-semibold text-[#5f716c]">{total} resultados</span>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_190px_190px]">
        <label className="relative block">
          <span className="sr-only">Buscar por título</span>
          <Search className="pointer-events-none absolute left-3.5 top-3.5 text-[#74857f]" size={17} />
          <input value={query} onChange={(event) => resetPage(setQuery, event.target.value)} placeholder="Buscar por título…" className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white pl-10 pr-4 text-base text-[#294740] sm:text-sm" />
        </label>
        <label>
          <span className="sr-only">Filtrar por estado</span>
          <select value={status} onChange={(event) => resetPage(setStatus, event.target.value as EstadoDocumento | "Todos")} className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-3 text-base text-[#294740] sm:text-sm">
            {STATES.map((item) => <option key={item}>{item === "Todos" ? "Todos los estados" : item}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtrar por sección</span>
          <select value={section} onChange={(event) => resetPage(setSection, event.target.value)} className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-3 text-base text-[#294740] sm:text-sm">
            <option value="Todos">Todas las secciones</option>
            {PORTFOLIO_SECTIONS.map((item) => <option key={item.code} value={item.code}>{item.code}. {item.title}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 min-h-24">
        {loading ? (
          <p role="status" className="flex items-center gap-2 py-5 text-sm text-[#5f716c]"><LoaderCircle className="animate-spin" size={17} />Buscando documentos…</p>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : documents.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {documents.map((document) => {
              const found = findByCode(document.subseccion_codigo ?? "");
              const href = found ? sectionHref(found.section, found.subsection) : "/portafolio";
              const periodLabel = document.parcial
                ? `${document.parcial} Parcial`
                : found?.subsection.allowsGeneral
                  ? "General/Anual"
                  : "";
              return (
                <Link key={document.id} href={href} className="group flex min-h-20 items-center gap-3 rounded-xl border border-[#e1ddd3] bg-white p-3 transition hover:border-[#c7b58e] hover:shadow-sm">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1eadf] text-[#a16b2d]"><FileSearch size={18} /></span>
                  <span className="min-w-0 flex-1"><strong className="block truncate text-sm text-[#294740]">{document.titulo}</strong><small className="mt-1 block truncate text-[#667773]">{document.subseccion}{periodLabel ? ` · ${periodLabel}` : ""}</small></span>
                  <span className="rounded-full bg-[#edf0eb] px-2 py-1 text-[10px] font-bold text-[#4f6861]">{document.estado}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="py-5 text-sm text-[#667773]">No hay documentos que coincidan con estos filtros.</p>
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-end gap-2 border-t border-[#e7e3d9] pt-4" aria-label="Páginas de resultados">
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="grid size-11 place-items-center rounded-lg border border-[#d8d5ca] disabled:opacity-40" aria-label="Página anterior"><ArrowLeft size={16} /></button>
          <span className="px-2 text-xs font-semibold text-[#5f716c]">Página {page} de {pages}</span>
          <button type="button" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages} className="grid size-11 place-items-center rounded-lg border border-[#d8d5ca] disabled:opacity-40" aria-label="Página siguiente"><ArrowRight size={16} /></button>
        </nav>
      )}
    </section>
  );
}
