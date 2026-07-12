"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, FileCheck2, Files, RefreshCw, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DEMO_DOCUMENTS } from "@/lib/demo-data";
import { PORTFOLIO_SECTIONS, sectionHref, sectionLabel } from "@/lib/portfolio";
import type { Documento } from "@/lib/types";

export function Dashboard() {
  const { configured, demoMode, role } = useAuth();
  const [documents, setDocuments] = useState<Documento[]>(demoMode ? DEMO_DOCUMENTS : []);
  const [loading, setLoading] = useState(configured && !demoMode);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    if (demoMode) {
      setDocuments(DEMO_DOCUMENTS);
      setLoading(false);
      return;
    }
    if (!configured) {
      setError(
        process.env.NODE_ENV !== "production"
          ? "Supabase no está configurado. Completa .env.local."
          : "Servicio temporalmente no disponible.",
      );
      setLoading(false);
      return;
    }
    const response = await fetch("/api/documentos", { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (response.ok) setDocuments(json.documentos ?? []); else setError(json.error ?? "No se pudieron cargar los documentos");
    setLoading(false);
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // load is intentionally refreshed when the environment mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, demoMode]);

  const stats = useMemo(() => ({
    total: documents.length,
    approved: documents.filter((d) => d.estado === "Aprobado").length,
    reviewed: documents.filter((d) => d.estado === "Revisado").length,
    pending: documents.filter((d) => d.estado === "Pendiente").length,
  }), [documents]);
  const progress = stats.total ? Math.round(((stats.approved + stats.reviewed * .55) / stats.total) * 100) : 0;
  const overall = stats.total > 0 && stats.approved === stats.total ? "Aprobado" : stats.reviewed + stats.approved > 0 ? "En revisión" : "Pendiente";

  return (
    <div className="animate-enter px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
      <section className="relative overflow-hidden rounded-[1.8rem] bg-[#123b35] p-6 text-white shadow-[0_22px_65px_rgba(18,59,53,.18)] sm:p-8 lg:p-10">
        <div className="absolute -right-10 -top-28 size-80 rounded-full border border-white/8" /><div className="absolute -right-24 -top-4 size-72 rounded-full bg-[#c98b3c]/10" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#e5b46c]"><Sparkles size={14} />Año lectivo 2026</p>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-[-.035em] sm:text-4xl lg:text-[2.8rem]">Portafolio Docente Digital</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/61 sm:text-base">Organiza tus evidencias, presenta tu práctica pedagógica y acompaña cada revisión desde un solo lugar.</p>
            <div className="mt-7 flex flex-wrap gap-2.5 text-xs">
              <span className="rounded-full bg-white/9 px-3.5 py-2"><strong className="text-white">Área:</strong> {process.env.NEXT_PUBLIC_DOCENTE_AREA || "Informática"}</span>
              <span className="rounded-full bg-white/9 px-3.5 py-2"><strong className="text-white">Docente:</strong> {process.env.NEXT_PUBLIC_DOCENTE_NOMBRE || "Marcos"}</span>
              <span className="rounded-full bg-white/9 px-3.5 py-2"><strong className="text-white">Jornada:</strong> {process.env.NEXT_PUBLIC_DOCENTE_JORNADA || "Matutina"}</span>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.07] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between"><span className="text-xs font-bold text-white/55">Estado general</span><span className="rounded-full bg-[#e2b46e]/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#efc887]">{overall}</span></div>
            <div className="mt-5 flex items-end justify-between"><strong className="text-4xl font-semibold">{progress}%</strong><span className="text-xs text-white/45">avance documental</span></div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#dca654] transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
      </section>

      {error && <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"><span>{error}</span><button onClick={load} className="flex min-h-11 items-center gap-1 font-bold"><RefreshCw size={15} />Reintentar</button></div>}

      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Documentos", value: stats.total, icon: Files, tone: "bg-[#e7ece8] text-[#24574e]" },
          { label: "Aprobados", value: stats.approved, icon: CheckCircle2, tone: "bg-[#e1eee8] text-[#23715f]" },
          { label: "Revisados", value: stats.reviewed, icon: FileCheck2, tone: "bg-[#e8edf1] text-[#436b7e]" },
          { label: "Pendientes", value: stats.pending, icon: Clock3, tone: "bg-[#f4e9d7] text-[#9a692c]" },
        ].map((item) => <div key={item.label} className="paper-card rounded-2xl p-4 sm:p-5"><div className={`mb-4 grid size-10 place-items-center rounded-xl ${item.tone}`}><item.icon size={19} /></div><strong className="block text-2xl font-semibold text-[#173732] sm:text-3xl">{loading ? "—" : item.value}</strong><span className="mt-1 block text-xs font-semibold text-[#74817d]">{item.label}</span></div>)}
      </section>

      <section className="mt-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="eyebrow mb-2">Índice oficial</p><h2 className="text-2xl font-semibold tracking-[-.025em] text-[#173732]">Explora las 8 secciones</h2></div><span className="text-xs text-[#75837f]">{role === "docente" ? "Gestiona tus documentos" : "Consulta y revisa evidencias"}</span></div>
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {PORTFOLIO_SECTIONS.map((section) => {
            const count = documents.filter((d) => d.seccion === sectionLabel(section)).length;
            const approved = documents.filter((d) => d.seccion === sectionLabel(section) && d.estado === "Aprobado").length;
            return <Link key={section.code} href={sectionHref(section)} className="paper-card group relative overflow-hidden rounded-2xl p-5 transition hover:-translate-y-1 hover:border-[#c8ae84] hover:shadow-[0_22px_50px_rgba(28,45,40,.13)]"><span className="absolute right-3 top-1 text-[4.5rem] font-black leading-none opacity-[.035]">{section.code}</span><div className="relative"><div className="mb-5 flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: section.color }}>{section.code}</span><ArrowRight size={18} className="text-[#9ca6a2] transition group-hover:translate-x-1 group-hover:text-[#c98b3c]" /></div><h3 className="min-h-12 pr-6 font-bold leading-6 text-[#24413c]">{section.title}</h3><p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-[#78847f]">{section.description}</p><div className="mt-5 flex items-center justify-between border-t border-[#e6e2d8] pt-4 text-[11px]"><span className="font-bold text-[#667873]">{count} {count === 1 ? "documento" : "documentos"}</span><span className="text-[#8a9893]">{approved} aprobados</span></div></div></Link>;
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center rounded-2xl border border-[#d9d5ca] bg-[#eee9dd] p-5 sm:p-6">
        <div className="flex gap-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fffdf8] text-[#c98b3c] shadow-sm">{role === "docente" ? <UserRound size={20} /> : <ShieldCheck size={20} />}</span><div><strong className="text-sm text-[#294740]">{role === "docente" ? "Tu portafolio está listo para seguir creciendo" : "Revisión simple y trazable"}</strong><p className="mt-1 text-xs leading-5 text-[#71807b]">{role === "docente" ? "Entra a cualquier subsección para agregar o actualizar un PDF." : "Entra a una subsección para visualizar, comentar y cambiar el estado."}</p></div></div>
        <Link href={sectionHref(PORTFOLIO_SECTIONS[3])} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 py-3 text-xs font-bold text-white">Continuar <ArrowRight size={15} /></Link>
      </section>
    </div>
  );
}
