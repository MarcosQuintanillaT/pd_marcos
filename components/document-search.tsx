"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  FileSearch,
  List,
  LoaderCircle,
  Search,
} from "lucide-react";
import { usePortfolio } from "@/components/portfolio-provider";
import { findByCode, PORTFOLIO_SECTIONS, sectionHref } from "@/lib/portfolio";
import type { Documento, EstadoDocumento, Rol } from "@/lib/types";

const STATES: Array<EstadoDocumento | "Todos"> = ["Todos", "Pendiente", "Revisado", "Aprobado"];
const RECENT_LIMIT = 6;
const PAGE_LIMIT = 12;

export function DocumentSearch({ role }: { role: Rol }) {
  const { selectedId } = usePortfolio();
  const defaultStatus: EstadoDocumento | "Todos" = role === "supervisor" ? "Pendiente" : "Todos";
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<EstadoDocumento | "Todos">(defaultStatus);
  const [section, setSection] = useState("Todos");
  const [page, setPage] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasActiveFilters =
    Boolean(query.trim()) || section !== "Todos" || status !== defaultStatus;
  const browseMode = showAll || hasActiveFilters;
  const limit = browseMode ? PAGE_LIMIT : RECENT_LIMIT;

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        portafolio: selectedId,
        pagina: String(page),
        limite: String(limit),
      });
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
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [limit, page, query, section, selectedId, status]);

  function resetPage<T>(setter: (value: T) => void, value: T) {
    setPage(1);
    setter(value);
  }

  const compactKind = role === "supervisor"
    ? total === 1 ? "pendiente" : "pendientes"
    : total === 1 ? "reciente" : "recientes";
  const resultLabel = browseMode
    ? `${total} ${total === 1 ? "resultado" : "resultados"}`
    : total > RECENT_LIMIT
      ? `${RECENT_LIMIT} de ${total} ${compactKind}`
      : `${total} ${compactKind}`;
  const showModeToggle = !hasActiveFilters && total > RECENT_LIMIT;
  const showPagination = browseMode && pages > 1;

  return (
    <section className="mt-9 min-w-0 overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-3 shadow-[0_8px_24px_rgba(35,55,49,.06)] sm:p-5">
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
        <div>
          <p className="eyebrow mb-1">Localizador de evidencias</p>
          <h2 className="text-lg font-bold text-[#294740]">{role === "supervisor" ? "Bandeja de revisión" : "Buscar documentos"}</h2>
        </div>
        <span className="inline-flex rounded-full bg-[#f0ede5] px-3 py-1.5 text-[11px] font-bold text-[#5f716c]">
          {resultLabel}
        </span>
      </div>
      <div className="mt-4 grid min-w-0 gap-2.5 sm:grid-cols-2 lg:grid-cols-[1fr_190px_190px] lg:gap-3">
        <label className="relative block min-w-0 sm:col-span-2 lg:col-span-1">
          <span className="sr-only">Buscar por título</span>
          <Search className="pointer-events-none absolute left-3.5 top-3.5 text-[#74857f]" size={17} />
          <input value={query} onChange={(event) => resetPage(setQuery, event.target.value)} placeholder="Buscar por título…" className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white pl-10 pr-4 text-base text-[#294740] sm:text-sm" />
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por estado</span>
          <select value={status} onChange={(event) => resetPage(setStatus, event.target.value as EstadoDocumento | "Todos")} className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-3 text-base text-[#294740] sm:text-sm">
            {STATES.map((item) => <option key={item}>{item === "Todos" ? "Todos los estados" : item}</option>)}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Filtrar por sección</span>
          <select value={section} onChange={(event) => resetPage(setSection, event.target.value)} className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-3 text-base text-[#294740] sm:text-sm">
            <option value="Todos">Todas las secciones</option>
            {PORTFOLIO_SECTIONS.map((item) => <option key={item.code} value={item.code}>{item.code}. {item.title}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-4 min-h-24 min-w-0">
        {loading ? (
          <p role="status" className="flex items-center gap-2 py-5 text-sm text-[#5f716c]"><LoaderCircle className="animate-spin" size={17} />Buscando documentos…</p>
        ) : error ? (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
        ) : documents.length ? (
          <div className="grid min-w-0 gap-2 md:grid-cols-2">
            {documents.map((document) => {
              const found = findByCode(document.subseccion_codigo ?? "");
              const href = found ? sectionHref(found.section, found.subsection) : "/portafolio";
              const periodLabel = document.parcial
                ? `${document.parcial} Parcial`
                : found?.subsection.allowsGeneral
                  ? "General/Anual"
                  : "";
              return (
                <Link key={document.id} href={href} className="group grid min-h-24 w-full min-w-0 grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-2 overflow-hidden rounded-xl border border-[#e1ddd3] bg-white p-3 transition hover:border-[#c7b58e] hover:shadow-sm sm:min-h-20 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:items-center">
                  <span className="row-span-2 grid size-10 shrink-0 place-items-center rounded-xl bg-[#f1eadf] text-[#a16b2d] sm:row-span-1"><FileSearch size={18} /></span>
                  <span className="min-w-0 self-center"><strong className="line-clamp-2 break-words text-sm leading-5 text-[#294740] sm:block sm:truncate">{document.titulo}</strong><small className="mt-1 line-clamp-2 break-words text-[11px] leading-4 text-[#667773] sm:block sm:truncate">{document.subseccion}{periodLabel ? ` · ${periodLabel}` : ""}</small></span>
                  <span className="col-start-2 row-start-2 justify-self-start rounded-full bg-[#edf0eb] px-2.5 py-1 text-[10px] font-bold text-[#4f6861] sm:col-start-3 sm:row-start-1 sm:self-center">{document.estado}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="py-5 text-sm text-[#667773]">No hay documentos que coincidan con estos filtros.</p>
        )}
      </div>

      {(showModeToggle || showPagination) && (
        <div className="mt-4 flex flex-col gap-3 border-t border-[#e7e3d9] pt-4 sm:flex-row sm:items-center sm:justify-between">
          {showModeToggle && (
            <button
              type="button"
              onClick={() => {
                setPage(1);
                setShowAll((current) => !current);
              }}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d8d5ca] bg-white px-4 text-xs font-bold text-[#34544e] transition hover:border-[#bda77f] hover:bg-[#f6f2e9] active:scale-[0.99] sm:w-auto"
            >
              {showAll ? <Clock3 size={16} aria-hidden="true" /> : <List size={16} aria-hidden="true" />}
              {showAll ? "Mostrar solo recientes" : `Ver todos los documentos (${total})`}
            </button>
          )}
          {showPagination && (
            <nav className="flex w-full items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:justify-end" aria-label="Páginas de resultados">
              <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#d8d5ca] bg-white disabled:opacity-40" aria-label="Página anterior"><ArrowLeft size={16} /></button>
              <span className="min-w-0 px-1 text-center text-xs font-semibold text-[#5f716c] sm:px-2">Página {page} de {pages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(pages, current + 1))} disabled={page === pages} className="grid size-11 shrink-0 place-items-center rounded-lg border border-[#d8d5ca] bg-white disabled:opacity-40" aria-label="Página siguiente"><ArrowRight size={16} /></button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}
