"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpen, Building2, CalendarCheck, CheckCircle2, Clock3, ClipboardList, FileCheck2, Files, IdCard, LayoutGrid, Paperclip, RefreshCw, ShieldCheck, Sparkles, User, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DEMO_DOCUMENTS } from "@/lib/demo-data";
import { PORTFOLIO_SECTIONS, sectionHref, sectionLabel } from "@/lib/portfolio";
import type { Documento } from "@/lib/types";

const SECTION_ICONS = {
  "1": IdCard,
  "2": User,
  "3": Building2,
  "4": BookOpen,
  "5": LayoutGrid,
  "6": ClipboardList,
  "7": CalendarCheck,
  "8": Paperclip,
} as const;

function cleanPublicLabel(value: string) {
  if (!value.includes("\u00c3") && !value.includes("\u00c2")) return value;

  try {
    return new TextDecoder().decode(Uint8Array.from(value, (character) => character.charCodeAt(0)));
  } catch {
    return value;
  }
}

export function Dashboard() {
  const { configured, demoMode, role } = useAuth();
  const [documents, setDocuments] = useState<Documento[]>(demoMode ? DEMO_DOCUMENTS : []);
  const [loading, setLoading] = useState(configured && !demoMode);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

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

    if (response.ok) {
      setDocuments(json.documentos ?? []);
    } else {
      setError(json.error ?? "No se pudieron cargar los documentos");
    }

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
    approved: documents.filter((document) => document.estado === "Aprobado").length,
    reviewed: documents.filter((document) => document.estado === "Revisado").length,
    pending: documents.filter((document) => document.estado === "Pendiente").length,
  }), [documents]);

  const progress = stats.total
    ? Math.round(((stats.approved + stats.reviewed * 0.55) / stats.total) * 100)
    : 0;
  const overall = stats.total === 0
    ? "Sin iniciar"
    : stats.approved === stats.total
      ? "Aprobado"
      : stats.reviewed + stats.approved > 0
        ? "En revisión"
        : "Pendiente";
  const configuredTeacherName = cleanPublicLabel(
    process.env.NEXT_PUBLIC_DOCENTE_NOMBRE || "",
  ).trim();
  const teacherName = configuredTeacherName.split(/\s+/).length >= 2
    ? configuredTeacherName
    : "Marcos Quintanilla";
  const teacherArea = cleanPublicLabel(
    process.env.NEXT_PUBLIC_DOCENTE_AREA || "Inform\u00e1tica",
  );
  const teacherShift = cleanPublicLabel(
    process.env.NEXT_PUBLIC_DOCENTE_JORNADA || "Matutina",
  );
  const firstPendingSection = PORTFOLIO_SECTIONS.find((section) => {
    const sectionDocuments = documents.filter((document) => document.seccion === sectionLabel(section));
    return sectionDocuments.length === 0
      || sectionDocuments.some((document) => document.estado !== "Aprobado");
  }) ?? PORTFOLIO_SECTIONS[0];

  return (
    <div className="animate-enter px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
      <section className="relative overflow-hidden rounded-[1.8rem] bg-[#123b35] p-6 text-white shadow-[0_22px_65px_rgba(18,59,53,.18)] sm:p-8 lg:p-10">
        <div className="absolute -right-10 -top-28 size-80 rounded-full border border-white/8" />
        <div className="absolute -right-24 -top-4 size-72 rounded-full bg-[#c98b3c]/10" />
        <div className="relative grid gap-8 xl:grid-cols-[1fr_360px] xl:items-end">
          <div>
            <p className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.16em] text-[#e5b46c]">
              <Sparkles size={14} />
              Año lectivo 2026
            </p>
            <h1 className="max-w-3xl text-2xl font-semibold leading-tight tracking-[-.03em] sm:text-3xl lg:text-[2.25rem]">
              Portafolio Docente Digital
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/61 sm:text-base">
              Organiza tus evidencias, presenta tu práctica pedagógica y acompaña cada revisión desde un solo lugar.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5 text-xs">
              <span className="rounded-full bg-white/9 px-3.5 py-2">
                <strong className="text-white">Área:</strong>{" "}
                {teacherArea}
              </span>
              <span className="rounded-full bg-white/9 px-3.5 py-2">
                <strong className="text-white">Docente:</strong> {teacherName}
              </span>
              <span className="rounded-full bg-white/9 px-3.5 py-2">
                <strong className="text-white">Jornada:</strong>{" "}
                {teacherShift}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[.07] p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white/55">Estado general</span>
              <span className="rounded-full bg-[#e2b46e]/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#efc887]">
                {overall}
              </span>
            </div>
            {stats.total === 0 ? (
              <div className="mt-5">
                <strong className="block text-xl font-semibold">Sin documentos todavía</strong>
                <p className="mt-2 text-xs leading-5 text-white/48">
                  Agrega tu primera evidencia para comenzar a medir el avance.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-5 flex items-end justify-between">
                  <strong className="text-4xl font-semibold">{progress}%</strong>
                  <span className="text-xs text-white/45">avance documental</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#dca654] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center">
          <span>{error}</span>
          <button onClick={load} className="flex min-h-11 items-center gap-1 font-bold">
            <RefreshCw size={15} />
            Reintentar
          </button>
        </div>
      )}

      <section className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          {
            label: "Documentos",
            value: stats.total,
            icon: Files,
            tone: "bg-[#e7ece8] text-[#24574e]",
            accent: "#47786f",
            description: "Total registrado",
          },
          {
            label: "Aprobados",
            value: stats.approved,
            icon: CheckCircle2,
            tone: "bg-[#e1eee8] text-[#23715f]",
            accent: "#2f917b",
            description: "Proceso completado",
          },
          {
            label: "Revisados",
            value: stats.reviewed,
            icon: FileCheck2,
            tone: "bg-[#e8edf1] text-[#436b7e]",
            accent: "#5b8294",
            description: "Con revisión previa",
          },
          {
            label: "Pendientes",
            value: stats.pending,
            icon: Clock3,
            tone: "bg-[#f4e9d7] text-[#9a692c]",
            accent: "#c58a3d",
            description: "Esperan revisión",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-4 shadow-[0_8px_24px_rgba(35,55,49,.06)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(35,55,49,.12)] sm:p-5"
          >
            <span
              className="absolute inset-x-0 top-0 h-1"
              style={{ backgroundColor: item.accent }}
            />
            <div className={`mb-4 grid size-10 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${item.tone}`}>
              <item.icon aria-hidden="true" size={19} strokeWidth={1.8} />
            </div>
            <strong className="block text-3xl font-semibold tracking-[-.03em] text-[#173732] sm:text-4xl">
              {loading ? "—" : item.value}
            </strong>
            <span className="mt-1 block text-xs font-bold text-[#5f716c]">{item.label}</span>
            <span className="mt-2 block text-[11px] text-[#8a9692]">{item.description}</span>
          </div>
        ))}
      </section>

      <section className="mt-9">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="eyebrow mb-2">Índice oficial</p>
            <h2 className="text-2xl font-semibold tracking-[-.025em] text-[#173732]">
              Explora las 8 secciones
            </h2>
          </div>
          <span className="text-xs text-[#75837f]">
            {role === "docente" ? "Gestiona tus documentos" : "Consulta y revisa evidencias"}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {PORTFOLIO_SECTIONS.map((section) => {
            const sectionDocuments = documents.filter(
              (document) => document.seccion === sectionLabel(section),
            );
            const count = sectionDocuments.length;
            const approved = sectionDocuments.filter(
              (document) => document.estado === "Aprobado",
            ).length;
            const status = count === 0
              ? "Sin iniciar"
              : approved === count
                ? "Completa"
                : "En proceso";
            const SectionIcon = SECTION_ICONS[section.code as keyof typeof SECTION_ICONS];

            return (
              <Link
                key={section.code}
                href={sectionHref(section)}
                className="paper-card group relative flex min-h-64 flex-col overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-5 shadow-[0_8px_24px_rgba(35,55,49,.06)] transition duration-200 hover:-translate-y-1 hover:border-[#c8ae84] hover:shadow-[0_22px_50px_rgba(28,45,40,.13)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c98b3c] focus-visible:ring-offset-2"
              >
                <span
                  className="absolute inset-x-0 top-0 h-1 opacity-85"
                  style={{ backgroundColor: section.color }}
                />
                <div className="flex items-center justify-between">
                  <span
                    className="grid size-12 place-items-center rounded-2xl border"
                    style={{
                      color: section.color,
                      backgroundColor: `${section.color}12`,
                      borderColor: `${section.color}28`,
                    }}
                  >
                    <SectionIcon aria-hidden="true" size={22} strokeWidth={1.8} />
                  </span>
                  <span className="grid size-9 place-items-center rounded-full bg-[#f0ede5] text-[#91a09b] transition duration-200 group-hover:bg-[#123b35] group-hover:text-white">
                    <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </span>
                </div>

                <h3 className="mt-5 min-h-12 pr-3 font-bold leading-6 text-[#24413c]">
                  <span className="mr-1 text-[#a37334]">{section.code}.</span>
                  {section.title}
                </h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#78847f]">
                  {section.description}
                </p>

                <div className="mt-auto pt-5">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${
                    status === "Completa"
                      ? "border-[#c7e2d6] bg-[#e0eee7] text-[#236c59]"
                      : status === "En proceso"
                        ? "border-[#ead6b5] bg-[#f4e9d7] text-[#946225]"
                        : "border-[#ddd9cf] bg-[#f0ede6] text-[#75827e]"
                  }`}>
                    {status}
                  </span>
                  <div className="mt-4 flex items-center justify-between border-t border-[#e6e2d8] pt-4 text-[11px]">
                    <span className="font-bold text-[#667873]">
                      {count} {count === 1 ? "documento" : "documentos"}
                    </span>
                    <span className="text-[#8a9893]">{approved} aprobados</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 rounded-2xl border border-[#d9d5ca] bg-[#eee9dd] p-5 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="flex gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fffdf8] text-[#c98b3c] shadow-sm">
            {role === "docente" ? <UserRound size={20} /> : <ShieldCheck size={20} />}
          </span>
          <div>
            <strong className="text-sm text-[#294740]">
              {role === "docente"
                ? "Tu portafolio está listo para seguir creciendo"
                : "Revisión simple y trazable"}
            </strong>
            <p className="mt-1 text-xs leading-5 text-[#71807b]">
              {role === "docente"
                ? "Entra a cualquier subsección para agregar o actualizar un archivo."
                : "Entra a una subsección para visualizar, comentar y cambiar el estado."}
            </p>
          </div>
        </div>
        <Link
          href={sectionHref(firstPendingSection)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 py-3 text-xs font-bold text-white transition hover:bg-[#0d302b] active:scale-[.98]"
        >
          {stats.total === 0 ? "Comenzar" : "Continuar"} <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}