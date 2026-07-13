"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  BookOpenCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Camera,
  ChartColumn,
  ChartPie,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Database,
  Eye,
  FileChartColumn,
  FileCheck2,
  FileSearch,
  FileUser,
  Files,
  Film,
  FolderOpen,
  Goal,
  GraduationCap,
  HeartHandshake,
  History,
  IdCard,
  Images,
  Landmark,
  LayoutGrid,
  ListChecks,
  NotebookPen,
  Paperclip,
  Presentation,
  RefreshCw,
  TableProperties,
  Target,
  User,
  UserRound,
  Users,
  UsersRound,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DocumentCard } from "@/components/document-card";
import { UploadForm } from "@/components/upload-form";
import { DEMO_DOCUMENTS } from "@/lib/demo-data";
import { PARCIALES, sectionHref, sectionLabel, subsectionLabel } from "@/lib/portfolio";
import type { Documento, Parcial, Seccion, Subseccion } from "@/lib/types";

const SECTION_ICONS: Record<string, LucideIcon> = {
  "1": IdCard,
  "2": User,
  "3": Building2,
  "4": BookOpen,
  "5": LayoutGrid,
  "6": ClipboardList,
  "7": CalendarCheck,
  "8": Paperclip,
};

const SUBSECTION_ICONS: Record<string, LucideIcon> = {
  "1.1": BriefcaseBusiness,
  "1.2": UserRound,
  "1.3": Clock3,
  "1.4": BadgeCheck,
  "2.1": Camera,
  "2.2": GraduationCap,
  "2.3": ChartPie,
  "2.4": FileUser,
  "3.1": Landmark,
  "3.2": History,
  "3.3": Target,
  "3.4": Eye,
  "3.5": HeartHandshake,
  "4.1": Presentation,
  "4.2": Database,
  "4.3": UsersRound,
  "4.4": FileCheck2,
  "4.5": Goal,
  "4.6": CalendarRange,
  "4.7": NotebookPen,
  "4.8": TableProperties,
  "5.1": Images,
  "5.1.1": Award,
  "5.1.2": Users,
  "5.1.3": Workflow,
  "6.1": ClipboardCheck,
  "6.2": ClipboardCheck,
  "6.3": ClipboardCheck,
  "6.4": ClipboardCheck,
  "6.5": ChartColumn,
  "7.1": ListChecks,
  "7.2": CalendarDays,
  "8.1": Files,
  "8.2": FileChartColumn,
  "8.3": Film,
};

function PortfolioIcon({ code, size = 21 }: { code: string; size?: number }) {
  const Icon = SUBSECTION_ICONS[code] ?? SECTION_ICONS[code] ?? FolderOpen;
  return <Icon aria-hidden="true" size={size} strokeWidth={1.8} />;
}
export function SectionView({ section, subsection }: { section: Seccion; subsection?: Subseccion }) {
  const { configured, demoMode, role } = useAuth();
  const isLeaf = Boolean(subsection && !subsection.children?.length);
  const isCoverOverview = section.code === "1" && !subsection;
  const [partial, setPartial] = useState<Parcial | null>(subsection?.fixedParcial ?? (subsection?.supportsParcial ? "I" : null));
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(configured && !demoMode);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    if (demoMode) {
      const matches = DEMO_DOCUMENTS.filter((d) => d.seccion === sectionLabel(section) && (!isLeaf || d.subseccion === subsectionLabel(subsection!)) && (!partial || d.parcial === partial));
      setDocuments(matches); setLoading(false); return;
    }
    if (!configured) {
      setDocuments([]);
      setError(
        process.env.NODE_ENV !== "production"
          ? "Supabase no está configurado. Completa .env.local."
          : "Servicio temporalmente no disponible.",
      );
      setLoading(false);
      return;
    }
    const query = new URLSearchParams(isLeaf ? { subseccion: subsection!.code } : { seccion: section.code });
    if (partial) query.set("parcial", partial);
    const response = await fetch(`/api/documentos?${query}`, { cache: "no-store" });
    const json = await response.json().catch(() => ({}));
    if (response.ok) setDocuments(json.documentos ?? []); else setError(json.error ?? "No se pudieron cargar los documentos");
    setLoading(false);
  }
  useEffect(() => {
    if (isCoverOverview) return;
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // load depends on the explicit route/filter values below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, demoMode, isCoverOverview, section.code, subsection?.code, partial]);

  const navigationItems = useMemo(() => {
    if (subsection?.children?.length) return subsection.children;
    if (!subsection) return section.subsections;
    return [];
  }, [section, subsection]);
  const countFor = (item: Subseccion) => {
    const labels = item.children?.length ? item.children.map(subsectionLabel) : [subsectionLabel(item)];
    return documents.filter((d) => labels.includes(d.subseccion)).length;
  };
  const activePartial = subsection?.fixedParcial ?? partial;

  return (
    <div className="animate-enter px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
      <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-[#7c8985]" aria-label="Migas de pan"><Link href="/portafolio" className="hover:text-[#315b53]">Portafolio</Link><ChevronRight size={13} /><Link href={sectionHref(section)} className="hover:text-[#315b53]">{section.code}. {section.title}</Link>{subsection && <><ChevronRight size={13} /><span className="text-[#3b5e57]">{subsection.code}.</span></>}</nav>

      <header className="paper-card relative overflow-hidden rounded-[1.7rem] p-6 sm:p-8">
        <div className="absolute right-0 top-0 h-full w-2" style={{ backgroundColor: section.color }} />
        <div className="flex flex-wrap items-start justify-between gap-5 pr-2">
          <div className="max-w-3xl"><div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl text-white" style={{ backgroundColor: section.color }}><PortfolioIcon code={subsection?.code ?? section.code} /></span><span className="eyebrow">Sección {section.code} de 8</span></div><h1 className="text-2xl font-semibold leading-tight tracking-[-.03em] text-[#173732] sm:text-3xl">{subsection ? <><span className="text-[#8c7658]">{subsection.code}.</span> {subsection.title}</> : `${section.code}. ${section.title}`}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6d7d78]">{subsection ? `Archivos correspondientes a ${subsection.title.toLowerCase()}.` : section.description}</p></div>
          {role === "docente" && isLeaf && <UploadForm section={section} subsection={subsection!} parcial={activePartial} onCreated={(d) => setDocuments((items) => [d, ...items])} />}
        </div>
      </header>

      {subsection?.supportsParcial && <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#dedbd0] bg-[#fffdf8]/80 p-3"><span className="mr-1 px-2 text-[11px] font-extrabold uppercase tracking-wide text-[#6d7d78]">Filtrar por parcial</span>{PARCIALES.map((item) => <button key={item} onClick={() => setPartial(item)} className={`rounded-lg px-3.5 py-2 text-xs font-bold ${partial === item ? "bg-[#123b35] text-white" : "bg-[#ece9e1] text-[#5d706a] hover:bg-[#e3ded2]"}`}>{item} Parcial</button>)}</div>}

      {isCoverOverview && <section className="relative mt-8 flex min-h-[calc(100vh-290px)] items-center justify-center overflow-hidden rounded-[2rem] border border-[#d7d1c4] bg-[#ebe7dc] p-4 shadow-[0_20px_55px_rgba(35,55,49,.10)] sm:p-8">
        <div className="pointer-events-none absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#c98b3c] to-transparent" />
        <figure className="relative w-full max-w-3xl rounded-[2rem] bg-[linear-gradient(135deg,#123b35_0%,#d7a452_48%,#123b35_100%)] p-[3px] shadow-[0_28px_70px_rgba(18,59,53,.22)]">
          <div className="relative overflow-hidden rounded-[calc(2rem-3px)] border border-white/70 bg-[#fffdf8] p-3 sm:p-5">
            <span className="pointer-events-none absolute left-3 top-3 z-20 size-10 rounded-tl-xl border-l-2 border-t-2 border-[#c98b3c]/70" />
            <span className="pointer-events-none absolute right-3 top-3 z-20 size-10 rounded-tr-xl border-r-2 border-t-2 border-[#c98b3c]/70" />
            <span className="pointer-events-none absolute bottom-3 left-3 z-20 size-10 rounded-bl-xl border-b-2 border-l-2 border-[#123b35]/55" />
            <span className="pointer-events-none absolute bottom-3 right-3 z-20 size-10 rounded-br-xl border-b-2 border-r-2 border-[#123b35]/55" />
            <div className="relative rounded-[1.45rem] border border-[#ded2bd] bg-white p-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,.8),0_12px_32px_rgba(45,59,54,.12)] sm:p-3">
              <Image src="/logo/pd_logo.png" alt="Portada del portafolio docente" width={1254} height={1254} className="h-auto max-h-[70vh] w-full rounded-[1.1rem] object-contain" priority />
            </div>
          </div>
        </figure>
      </section>}

      {navigationItems.length > 0 && !isCoverOverview && <section className="mt-8">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-[#294740]">{subsection ? "Categorías de la galería" : "Contenido de la sección"}</h2><span className="text-[11px] text-[#81908b]">Selecciona una subsección</span></div>
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">{navigationItems.map((item) => {
          const documentCount = countFor(item);
          return <Link key={item.code} href={sectionHref(section, item)} className="paper-card group relative flex min-h-32 items-center gap-4 overflow-hidden rounded-2xl border border-[#d9d4c8] bg-[#fffdf8] p-5 shadow-[0_8px_24px_rgba(35,55,49,.06)] transition duration-200 hover:-translate-y-1 hover:border-[#cbb992] hover:shadow-[0_18px_38px_rgba(35,55,49,.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c98b3c] focus-visible:ring-offset-2">
            <span className="absolute inset-x-0 top-0 h-1 opacity-80" style={{ backgroundColor: section.color }} />
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl border" style={{ color: section.color, backgroundColor: `${section.color}12`, borderColor: `${section.color}28` }}><PortfolioIcon code={item.code} size={22} /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm leading-5 text-[#34504a]"><span className="text-[#a37334]">{item.code}.</span> {item.title}</strong><small className="mt-3 inline-flex rounded-full border border-[#ded9cd] bg-[#f3f0e8] px-2.5 py-1 text-[10px] font-bold text-[#71817c]">{documentCount} {documentCount === 1 ? "documento" : "documentos"}</small></span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#f0ede5] text-[#91a09b] transition duration-200 group-hover:bg-[#123b35] group-hover:text-white"><ArrowRight size={16} className="transition group-hover:translate-x-0.5" /></span>
          </Link>;
        })}</div>
      </section>}

      {isLeaf && <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#294740]">{isLeaf ? "Documentos de esta subsección" : "Documentos recientes"}</h2><p className="mt-1 text-xs text-[#83908c]">{documents.length} {documents.length === 1 ? "archivo" : "archivos"}{partial ? ` · ${partial} Parcial` : ""}</p></div>{error && <button onClick={load} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><RefreshCw size={14} />Reintentar</button>}</div>
        {loading ? <div className="grid gap-3"><div className="h-40 animate-pulse rounded-2xl bg-[#e7e3da]" /><div className="h-40 animate-pulse rounded-2xl bg-[#ebe7de]" /></div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : documents.length ? <div className="grid gap-4 2xl:grid-cols-2">{documents.map((document) => <DocumentCard key={document.id} document={document} onUpdated={(updated) => setDocuments((items) => items.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => setDocuments((items) => items.filter((item) => item.id !== id))} />)}</div> : <div className="paper-card grid min-h-64 place-items-center rounded-2xl p-7 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eeeae0] text-[#9d7844]">{isLeaf ? <FileSearch size={25} /> : <FolderOpen size={25} />}</span><h3 className="mt-4 font-bold text-[#34504a]">Aún no hay documentos aquí</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#7b8884]">{role === "docente" && isLeaf ? "Usa “Subir nuevo archivo” para agregar la primera evidencia de esta subsección." : role === "supervisor" ? "El docente todavía no ha publicado documentos en esta ubicación." : "Abre una subsección del índice para agregar sus documentos."}</p></div></div>}
      </section>}

      {!isCoverOverview && !isLeaf && <div className="mt-8 flex gap-3 rounded-2xl border border-[#dad6ca] bg-[#ebe7dc] p-4 text-xs leading-5 text-[#65756f]"><BookOpenCheck size={18} className="mt-0.5 shrink-0 text-[#4f8e7d]" /><span>La numeración y los nombres mostrados corresponden al índice oficial del portafolio docente.</span></div>}
    </div>
  );
}
