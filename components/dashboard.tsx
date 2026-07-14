"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck2,
  Files,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DocumentSearch } from "@/components/document-search";
import { SECTION_ICONS } from "@/components/portfolio-icons";
import { usePortfolio, withPortfolioQuery } from "@/components/portfolio-provider";
import { PortfolioSettings } from "@/components/portfolio-settings";
import { DEMO_DOCUMENTS } from "@/lib/demo-data";
import {
  flattenSubsections,
  PORTFOLIO_SECTIONS,
  sectionHref,
} from "@/lib/portfolio";
import type { PortfolioSummary } from "@/lib/types";

function emptySummary(): PortfolioSummary {
  return {
    total: 0,
    aprobados: 0,
    revisados: 0,
    pendientes: 0,
    cobertura: 0,
    revision: 0,
    subseccionesCubiertas: [],
    portafolio: null,
    secciones: PORTFOLIO_SECTIONS.map((section) => ({
      code: section.code,
      documentos: 0,
      aprobados: 0,
      revisados: 0,
      pendientes: 0,
      subseccionesConEvidencia: 0,
      subseccionesRequeridas: flattenSubsections(section).filter((item) => !item.children?.length).length,
    })),
  };
}

function demoSummary(): PortfolioSummary {
  const summary = emptySummary();
  const covered = new Set<string>();
  for (const document of DEMO_DOCUMENTS) {
    const sectionCode = document.seccion_codigo ?? document.seccion.match(/^(\d+)\./)?.[1] ?? "";
    const subsectionCode = document.subseccion_codigo ?? document.subseccion.match(/^([0-9]+(?:\.[0-9]+){1,2})\./)?.[1] ?? "";
    covered.add(subsectionCode);
    const section = summary.secciones.find((item) => item.code === sectionCode);
    if (!section) continue;
    section.documentos += 1;
    if (document.estado === "Aprobado") section.aprobados += 1;
    if (document.estado === "Revisado") section.revisados += 1;
    if (document.estado === "Pendiente") section.pendientes += 1;
  }
  for (const section of summary.secciones) {
    section.subseccionesConEvidencia = flattenSubsections(
      PORTFOLIO_SECTIONS.find((item) => item.code === section.code)!,
    ).filter((item) => !item.children?.length && covered.has(item.code)).length;
  }
  summary.total = DEMO_DOCUMENTS.length;
  summary.aprobados = DEMO_DOCUMENTS.filter((item) => item.estado === "Aprobado").length;
  summary.revisados = DEMO_DOCUMENTS.filter((item) => item.estado === "Revisado").length;
  summary.pendientes = DEMO_DOCUMENTS.filter((item) => item.estado === "Pendiente").length;
  const required = summary.secciones.reduce((sum, item) => sum + item.subseccionesRequeridas, 0);
  summary.cobertura = required ? Math.round((covered.size / required) * 100) : 0;
  summary.revision = summary.total ? Math.round((summary.aprobados / summary.total) * 100) : 0;
  summary.subseccionesCubiertas = [...covered];
  return summary;
}

export function Dashboard() {
  const { configured, demoMode, role, perfil } = useAuth();
  const { selected, selectedId, loading: portfolioLoading, error: portfolioError } = usePortfolio();
  const [summary, setSummary] = useState<PortfolioSummary>(emptySummary);
  const [loading, setLoading] = useState(configured && !demoMode);
  const [error, setError] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    if (demoMode) {
      setSummary({ ...demoSummary(), portafolio: selected });
      setLoading(false);
      return;
    }
    if (!configured || !selectedId) {
      setSummary(emptySummary());
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(withPortfolioQuery("/api/documentos/resumen", selectedId), {
        cache: "no-store",
        signal,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudo cargar el resumen");
      setSummary(json.resumen ?? emptySummary());
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "No se pudo cargar el resumen");
    } finally {
      setLoading(false);
    }
  }, [configured, demoMode, selected, selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const overall = summary.total === 0
    ? "Sin iniciar"
    : summary.cobertura === 100 && summary.revision === 100
      ? "Aprobado"
      : summary.aprobados + summary.revisados > 0
        ? "En revisión"
        : "Pendiente";
  const teacherName = perfil?.nombre?.trim() || process.env.NEXT_PUBLIC_DOCENTE_NOMBRE || "Docente";
  const teacherArea = selected?.area || process.env.NEXT_PUBLIC_DOCENTE_AREA || "Informática";
  const teacherShift = selected?.jornada || process.env.NEXT_PUBLIC_DOCENTE_JORNADA || "Matutina";

  const firstPending = (() => {
    for (const section of PORTFOLIO_SECTIONS) {
      const leaf = flattenSubsections(section).find(
        (item) => !item.children?.length && !summary.subseccionesCubiertas.includes(item.code),
      );
      if (leaf) return { section, subsection: leaf };
    }
    const incompleteSection = summary.secciones.find(
      (item) => item.documentos > 0 && item.aprobados < item.documentos,
    );
    const section = PORTFOLIO_SECTIONS.find((item) => item.code === incompleteSection?.code) ?? PORTFOLIO_SECTIONS[0];
    return { section, subsection: flattenSubsections(section).find((item) => !item.children?.length) };
  })();

  const continueHref = firstPending.subsection
    ? sectionHref(firstPending.section, firstPending.subsection)
    : sectionHref(firstPending.section);
  const stats = [
    { label: "Documentos", value: summary.total, icon: Files, tone: "bg-[#e7ece8] text-[#24574e]", accent: "#47786f", description: "Total registrado" },
    { label: "Aprobados", value: summary.aprobados, icon: CheckCircle2, tone: "bg-[#e1eee8] text-[#23715f]", accent: "#2f917b", description: "Proceso completado" },
    { label: "Revisados", value: summary.revisados, icon: FileCheck2, tone: "bg-[#e8edf1] text-[#436b7e]", accent: "#5b8294", description: "Con revisión previa" },
    { label: "Pendientes", value: summary.pendientes, icon: Clock3, tone: "bg-[#f4e9d7] text-[#9a692c]", accent: "#c58a3d", description: "Esperan revisión" },
  ];

  return (
    <div className="animate-enter px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
      <section className="relative overflow-hidden rounded-[1.8rem] bg-[#123b35] p-6 text-white shadow-[0_22px_65px_rgba(18,59,53,.18)] sm:p-8 lg:p-10">
        <div className="absolute -right-10 -top-28 size-80 rounded-full border border-white/8" />
        <div className="absolute -right-24 -top-4 size-72 rounded-full bg-[#c98b3c]/10" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_390px] xl:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#e5b46c]"><Sparkles size={14} />Año lectivo {selected?.anio_lectivo ?? "—"}</p>
              <PortfolioSettings role={role!} />
            </div>
            <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-[-.03em] sm:text-3xl lg:text-[2.25rem]">Portafolio Docente Digital</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Organiza tus evidencias, presenta tu práctica pedagógica y acompaña cada revisión desde un solo lugar.</p>
            <div className="mt-7 flex flex-wrap gap-2.5 text-xs">
              <span className="rounded-full bg-white/10 px-3.5 py-2"><strong>Área:</strong> {teacherArea}</span>
              <span className="rounded-full bg-white/10 px-3.5 py-2"><strong>Docente:</strong> {teacherName}</span>
              <span className="rounded-full bg-white/10 px-3.5 py-2"><strong>Jornada:</strong> {teacherShift}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/12 bg-white/[.07] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-white/70">Estado general</span><span className="rounded-full bg-[#e2b46e]/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#efc887]">{overall}</span></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {[{ label: "Cobertura del índice", value: summary.cobertura }, { label: "Documentos aprobados", value: summary.revision }].map((item) => (
                <div key={item.label}>
                  <div className="flex items-end justify-between"><strong className="text-2xl font-semibold">{item.value}%</strong><span className="text-xs text-white/65">{item.label}</span></div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/12" role="progressbar" aria-label={item.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.value}><div className="h-full rounded-full bg-[#dca654] transition-[width]" style={{ width: `${item.value}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(error || portfolioError) && <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"><span>{error || portfolioError}</span><button type="button" onClick={() => void load()} className="flex min-h-11 items-center gap-2 font-bold"><RefreshCw size={15} />Reintentar</button></div>}

      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="relative overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-4 shadow-[0_8px_24px_rgba(35,55,49,.06)] sm:p-5">
            <span className="absolute inset-x-0 top-0 h-1" style={{ backgroundColor: item.accent }} />
            <div className={`mb-3 grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon aria-hidden="true" size={19} strokeWidth={1.8} /></div>
            <strong className="block text-3xl font-semibold tracking-[-.03em] text-[#173732] sm:text-4xl">{loading || portfolioLoading ? "—" : item.value}</strong>
            <span className="mt-1 block text-xs font-bold text-[#5f716c]">{item.label}</span>
            <span className="mt-2 hidden text-xs text-[#5f716c] sm:block">{item.description}</span>
          </div>
        ))}
      </section>

      <DocumentSearch key={`${role}-${selectedId ?? "sin-portafolio"}`} role={role!} />

      <section className="mt-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow mb-2">Índice oficial</p><h2 className="text-2xl font-semibold tracking-[-.025em] text-[#173732]">Explora las 8 secciones</h2></div><div className="flex flex-wrap gap-2">{role === "docente" && <Link href="/portafolio/papelera" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#d8d5ca] bg-[#fffdf8] px-4 text-xs font-bold text-[#536a64]"><Trash2 size={15} />Papelera</Link>}{summary.total > 0 && <a href={withPortfolioQuery("/api/exportar", selectedId)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#123b35] px-4 text-xs font-bold text-white"><Download size={15} />Exportar ZIP</a>}</div></div>

        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
          {PORTFOLIO_SECTIONS.map((section) => {
            const info = summary.secciones.find((item) => item.code === section.code)!;
            const complete = info.subseccionesConEvidencia === info.subseccionesRequeridas && info.documentos > 0 && info.aprobados === info.documentos;
            const status = info.documentos === 0 ? "Sin iniciar" : complete ? "Completa" : "En proceso";
            const SectionIcon = SECTION_ICONS[section.code];
            return (
              <Link key={section.code} href={sectionHref(section)} className="paper-card group relative flex min-h-36 flex-col overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-4 shadow-[0_8px_24px_rgba(35,55,49,.06)] transition hover:-translate-y-0.5 hover:border-[#c8ae84] hover:shadow-[0_18px_38px_rgba(28,45,40,.11)] sm:min-h-60 sm:p-5">
                <span className="absolute inset-x-0 top-0 h-1 opacity-85" style={{ backgroundColor: section.color }} />
                <div className="flex items-center justify-between"><span className="grid size-11 place-items-center rounded-2xl border" style={{ color: section.color, backgroundColor: `${section.color}12`, borderColor: `${section.color}28` }}><SectionIcon aria-hidden="true" size={21} strokeWidth={1.8} /></span><span className="grid size-9 place-items-center rounded-full bg-[#f0ede5] text-[#637771] transition group-hover:bg-[#123b35] group-hover:text-white"><ArrowRight size={16} /></span></div>
                <h3 className="mt-3 font-bold leading-5 text-[#24413c] sm:mt-5 sm:min-h-12 sm:leading-6"><span className="mr-1 text-[#a37334]">{section.code}.</span>{section.title}</h3>
                <p className="mt-2 hidden min-h-10 text-xs leading-5 text-[#667773] sm:line-clamp-2">{section.description}</p>
                <div className="mt-auto pt-3 sm:pt-5"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${status === "Completa" ? "border-[#c7e2d6] bg-[#e0eee7] text-[#236c59]" : status === "En proceso" ? "border-[#ead6b5] bg-[#f4e9d7] text-[#946225]" : "border-[#ddd9cf] bg-[#f0ede6] text-[#667773]"}`}>{status}</span><div className="mt-3 flex items-center justify-between border-t border-[#e6e2d8] pt-3 text-[11px] text-[#5f716c]"><strong>{info.subseccionesConEvidencia}/{info.subseccionesRequeridas} evidencias</strong><span>{info.aprobados} aprobados</span></div></div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 rounded-2xl border border-[#d9d5ca] bg-[#eee9dd] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fffdf8] text-[#c98b3c] shadow-sm">{role === "docente" ? <UserRound size={20} /> : <ShieldCheck size={20} />}</span><div><strong className="text-sm text-[#294740]">{summary.cobertura === 100 ? "La cobertura del índice está completa" : "Continúa con la siguiente evidencia pendiente"}</strong><p className="mt-1 text-xs leading-5 text-[#5f716c]">Cobertura y aprobación se miden por separado para mostrar el avance real.</p></div></div>
        <Link href={continueHref} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#0d302b] active:scale-[.98]">{summary.total === 0 ? "Comenzar" : "Continuar"}<ArrowRight size={15} /></Link>
      </section>
    </div>
  );
}
