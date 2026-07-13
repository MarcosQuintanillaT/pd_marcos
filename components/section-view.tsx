"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  ChevronRight,
  FileSearch,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DocumentCard } from "@/components/document-card";
import { PortfolioIcon } from "@/components/portfolio-icons";
import { usePortfolio } from "@/components/portfolio-provider";
import { UploadForm } from "@/components/upload-form";
import { DEMO_DOCUMENTS } from "@/lib/demo-data";
import { PARCIALES, sectionHref, sectionLabel, subsectionLabel } from "@/lib/portfolio";
import type { Documento, EstadoDocumento, Parcial, Seccion, Subseccion } from "@/lib/types";

const STATES: Array<EstadoDocumento | "Todos"> = ["Todos", "Pendiente", "Revisado", "Aprobado"];
type PeriodFilter = Parcial | "General" | "Todos";

function isParcial(value: PeriodFilter): value is Parcial {
  return PARCIALES.includes(value as Parcial);
}

export function SectionView({ section, subsection }: { section: Seccion; subsection?: Subseccion }) {
  const { configured, demoMode, role } = useAuth();
  const { selected, selectedId } = usePortfolio();
  const isLeaf = Boolean(subsection && !subsection.children?.length);
  const isCoverOverview = section.code === "1" && !subsection;
  const [period, setPeriod] = useState<PeriodFilter>(subsection?.fixedParcial ?? "Todos");
  const [status, setStatus] = useState<EstadoDocumento | "Todos">("Todos");
  const [queryText, setQueryText] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(configured && !demoMode);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (isCoverOverview) return;
    setLoading(true);
    setError("");
    try {
      if (demoMode) {
        const matches = DEMO_DOCUMENTS.filter((document) =>
          document.seccion === sectionLabel(section)
          && (!isLeaf || document.subseccion === subsectionLabel(subsection!))
          && (
            period === "Todos"
            || (period === "General"
              ? document.parcial === null
              : document.parcial === period)
          )
          && (status === "Todos" || document.estado === status)
          && (!queryText.trim() || document.titulo.toLowerCase().includes(queryText.trim().toLowerCase())),
        );
        setDocuments(matches);
        setTotal(matches.length);
        setPages(matches.length ? 1 : 0);
        return;
      }
      if (!configured || !selectedId) {
        setDocuments([]);
        setTotal(0);
        return;
      }
      const params = new URLSearchParams({
        portafolio: selectedId,
        pagina: String(page),
        limite: isLeaf ? "24" : "50",
        ...(isLeaf ? { subseccion: subsection!.code } : { seccion: section.code }),
      });
      if (period === "General") params.set("periodo", "general");
      else if (isParcial(period)) params.set("parcial", period);
      if (status !== "Todos") params.set("estado", status);
      if (queryText.trim()) params.set("q", queryText.trim());
      const response = await fetch(`/api/documentos?${params}`, { cache: "no-store", signal });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudieron cargar los documentos");
      setDocuments(json.documentos ?? []);
      setTotal(json.total ?? 0);
      setPages(json.paginas ?? 0);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "No se pudieron cargar los documentos");
    } finally {
      setLoading(false);
    }
  }, [configured, demoMode, isCoverOverview, isLeaf, page, period, queryText, section, selectedId, status, subsection]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), queryText ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load, queryText]);

  const navigationItems = useMemo(() => {
    if (subsection?.children?.length) return subsection.children;
    if (!subsection) return section.subsections;
    return [];
  }, [section.subsections, subsection]);
  const countFor = (item: Subseccion) => {
    const codes = item.children?.length ? item.children.map((child) => child.code) : [item.code];
    return documents.filter((document) => codes.includes(document.subseccion_codigo ?? "")).length;
  };
  const activePartial = subsection?.fixedParcial
    ?? (isParcial(period) ? period : null);
  const generalSelected = period === "General";
  const uploadPeriodSelected = !subsection?.supportsParcial
    || Boolean(subsection.fixedParcial)
    || period !== "Todos";

  return (
    <div className="animate-enter px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-[#5f716c]" aria-label="Migas de pan">
        <Link href="/portafolio" className="hover:text-[#315b53]">Portafolio</Link><ChevronRight size={13} />
        {subsection ? <Link href={sectionHref(section)} className="hover:text-[#315b53]">{section.code}. {section.title}</Link> : <span aria-current="page" className="text-[#3b5e57]">{section.code}. {section.title}</span>}
        {subsection && <><ChevronRight size={13} /><span aria-current="page" className="text-[#3b5e57]">{subsection.code}. {subsection.title}</span></>}
      </nav>

      <header className="paper-card relative overflow-hidden rounded-[1.7rem] p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: section.color }} />
        <div className="flex flex-wrap items-start justify-between gap-5 pr-2">
          <div className="max-w-3xl"><div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl text-white" style={{ backgroundColor: section.color }}><PortfolioIcon code={subsection?.code ?? section.code} /></span><span className="eyebrow">Sección {section.code} de 8</span></div><h1 className="text-2xl font-semibold leading-tight tracking-[-.03em] text-[#173732] sm:text-3xl">{subsection ? <><span className="text-[#8c7658]">{subsection.code}.</span> {subsection.title}</> : `${section.code}. ${section.title}`}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#5f716c]">{subsection ? `Archivos correspondientes a ${subsection.title.toLowerCase()}.` : section.description}</p></div>
          {role === "docente" && isLeaf && selected?.estado === "Activo" && uploadPeriodSelected && <UploadForm section={section} subsection={subsection!} parcial={activePartial} general={generalSelected} onCreated={(document) => { setDocuments((items) => [document, ...items]); setTotal((value) => value + 1); }} />}
        </div>
      </header>

      {subsection?.supportsParcial && (
        <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#dedbd0] bg-[#fffdf8]/80 p-3" role="group" aria-label="Organizar documentos por período académico">
          <span className="mr-1 px-2 text-[11px] font-extrabold uppercase tracking-wide text-[#5f716c]">Período académico</span>
          {subsection.allowsGeneral && (
            <button type="button" aria-pressed={period === "General"} onClick={() => { setPage(1); setPeriod("General"); }} className={`rounded-lg px-3.5 py-2 text-xs font-bold ${period === "General" ? "bg-[#123b35] text-white" : "bg-[#ece9e1] text-[#5d706a] hover:bg-[#e3ded2]"}`}>
              General/Anual
            </button>
          )}
          {PARCIALES.map((item) => (
            <button type="button" key={item} aria-pressed={period === item} onClick={() => { setPage(1); setPeriod(item); }} className={`rounded-lg px-3.5 py-2 text-xs font-bold ${period === item ? "bg-[#123b35] text-white" : "bg-[#ece9e1] text-[#5d706a] hover:bg-[#e3ded2]"}`}>
              {item} Parcial
            </button>
          ))}
          <button type="button" aria-pressed={period === "Todos"} onClick={() => { setPage(1); setPeriod("Todos"); }} className={`rounded-lg px-3.5 py-2 text-xs font-bold ${period === "Todos" ? "bg-[#123b35] text-white" : "bg-[#ece9e1] text-[#5d706a] hover:bg-[#e3ded2]"}`}>
            Todos
          </button>
          {role === "docente" && period === "Todos" && (
            <span className="basis-full px-2 pt-1 text-[11px] leading-5 text-[#6a7975]">
              Selecciona {subsection.allowsGeneral ? "General/Anual o " : ""}un parcial para habilitar la subida.
            </span>
          )}
        </div>
      )}

      {isCoverOverview && <section className="relative mt-8 flex min-h-[calc(100vh-290px)] items-center justify-center overflow-hidden rounded-[2rem] border border-[#d7d1c4] bg-[#ebe7dc] p-4 shadow-[0_20px_55px_rgba(35,55,49,.10)] sm:p-8"><div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#c98b3c] to-transparent" /><figure className="relative w-full max-w-3xl rounded-[2rem] bg-[linear-gradient(135deg,#123b35_0%,#d7a452_48%,#123b35_100%)] p-[3px] shadow-[0_28px_70px_rgba(18,59,53,.22)]"><div className="relative overflow-hidden rounded-[calc(2rem-3px)] border border-white/70 bg-[#fffdf8] p-3 sm:p-5"><div className="relative rounded-[1.45rem] border border-[#ded2bd] bg-white p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.8),0_12px_32px_rgba(45,59,54,.12)] sm:p-3"><Image src="/logo/pd_logo.png" alt="Portada del portafolio docente" width={1254} height={1254} className="h-auto max-h-[70vh] w-full rounded-[1.1rem] object-contain" priority /></div></div></figure></section>}

      {navigationItems.length > 0 && !isCoverOverview && <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-[#294740]">{subsection ? "Categorías de la galería" : "Contenido de la sección"}</h2><span className="text-xs text-[#5f716c]">Selecciona una subsección</span></div><div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">{navigationItems.map((item) => { const documentCount = countFor(item); return <Link key={item.code} href={sectionHref(section, item)} className="paper-card group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-5 shadow-[0_8px_24px_rgba(35,55,49,.06)] transition hover:-translate-y-1 hover:border-[#cbb992] hover:shadow-[0_18px_38px_rgba(35,55,49,.14)]"><span className="absolute inset-x-0 top-0 h-1 opacity-80" style={{ backgroundColor: section.color }} /><span className="grid size-12 shrink-0 place-items-center rounded-2xl border" style={{ color: section.color, backgroundColor: `${section.color}12`, borderColor: `${section.color}28` }}><PortfolioIcon code={item.code} size={22} /></span><span className="min-w-0 flex-1"><strong className="block text-sm leading-5 text-[#34504a]"><span className="text-[#a37334]">{item.code}.</span> {item.title}</strong><small className="mt-3 inline-flex rounded-full border border-[#ded9cd] bg-[#f3f0e8] px-2.5 py-1 text-[10px] font-bold text-[#5f716c]">{documentCount} {documentCount === 1 ? "documento" : "documentos"}</small></span><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f0ede5] text-[#637771] transition group-hover:bg-[#123b35] group-hover:text-white"><ArrowRight size={16} /></span></Link>; })}</div></section>}

      {isLeaf && <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-bold text-[#294740]">Documentos de esta subsección</h2><p className="mt-1 text-xs text-[#5f716c]">{total} {total === 1 ? "archivo" : "archivos"}{period !== "Todos" ? ` · ${period === "General" ? "General/Anual" : `${period} Parcial`}` : ""}</p></div>{error && <button type="button" onClick={() => void load()} className="flex min-h-11 items-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-bold text-red-700"><RefreshCw size={14} />Reintentar</button>}</div>
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_190px]"><label className="relative"><span className="sr-only">Buscar en esta subsección</span><Search className="absolute left-3.5 top-3.5 text-[#71817c]" size={17} /><input value={queryText} onChange={(event) => { setPage(1); setQueryText(event.target.value); }} placeholder="Buscar por título…" className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white pl-10 pr-4 text-base sm:text-sm" /></label><label><span className="sr-only">Filtrar por estado</span><select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value as EstadoDocumento | "Todos"); }} className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-3 text-base sm:text-sm">{STATES.map((item) => <option key={item}>{item === "Todos" ? "Todos los estados" : item}</option>)}</select></label></div>
        {loading ? <div className="grid gap-3"><div className="h-40 animate-pulse rounded-2xl bg-[#e7e3da]" /><div className="h-40 animate-pulse rounded-2xl bg-[#ebe7de]" /></div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : documents.length ? <div className="grid gap-4 2xl:grid-cols-2">{documents.map((document) => <DocumentCard key={document.id} document={document} onUpdated={(updated) => setDocuments((items) => items.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => { setDocuments((items) => items.filter((item) => item.id !== id)); setTotal((value) => Math.max(0, value - 1)); }} />)}</div> : <div className="paper-card grid min-h-64 place-items-center rounded-2xl p-7 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eeeae0] text-[#9d7844]"><FileSearch size={25} /></span><h3 className="mt-4 font-bold text-[#34504a]">Aún no hay documentos aquí</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#5f716c]">{role === "docente" ? "Usa “Subir nuevo archivo” para agregar la primera evidencia." : "El docente todavía no ha publicado documentos en esta ubicación."}</p></div></div>}
        {pages > 1 && <nav className="mt-5 flex items-center justify-end gap-2" aria-label="Páginas de documentos"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="grid size-11 place-items-center rounded-xl border border-[#d8d5ca] bg-white disabled:opacity-40" aria-label="Página anterior"><ArrowLeft size={16} /></button><span className="px-2 text-xs font-semibold text-[#5f716c]">Página {page} de {pages}</span><button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page === pages} className="grid size-11 place-items-center rounded-xl border border-[#d8d5ca] bg-white disabled:opacity-40" aria-label="Página siguiente"><ArrowRight size={16} /></button></nav>}
      </section>}

      {!isCoverOverview && !isLeaf && <div className="mt-8 flex gap-3 rounded-2xl border border-[#dad6ca] bg-[#ebe7dc] p-4 text-xs leading-5 text-[#5f716c]"><BookOpenCheck size={18} className="mt-0.5 shrink-0 text-[#4f8e7d]" /><span>La numeración y los nombres mostrados corresponden al índice oficial del portafolio docente.</span></div>}
    </div>
  );
}
