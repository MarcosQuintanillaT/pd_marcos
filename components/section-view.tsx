"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenCheck, ChevronRight, FileSearch, FolderOpen, RefreshCw } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { DocumentCard } from "@/components/document-card";
import { UploadForm } from "@/components/upload-form";
import { DEMO_DOCUMENTS } from "@/lib/demo-data";
import { PARCIALES, sectionHref, sectionLabel, subsectionLabel } from "@/lib/portfolio";
import type { Documento, Parcial, Seccion, Subseccion } from "@/lib/types";

export function SectionView({ section, subsection }: { section: Seccion; subsection?: Subseccion }) {
  const { configured, demoMode, role } = useAuth();
  const isLeaf = Boolean(subsection && !subsection.children?.length);
  const filterableOverview = !subsection && ["4", "6", "7"].includes(section.code);
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
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
    // load depends on the explicit route/filter values below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured, demoMode, section.code, subsection?.code, partial]);

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
          <div className="max-w-3xl"><div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl text-sm font-black text-white" style={{ backgroundColor: section.color }}>{section.code}</span><span className="eyebrow">Sección {section.code} de 8</span></div><h1 className="text-2xl font-semibold leading-tight tracking-[-.03em] text-[#173732] sm:text-3xl">{subsection ? <><span className="text-[#8c7658]">{subsection.code}.</span> {subsection.title}</> : `${section.code}. ${section.title}`}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#6d7d78]">{subsection ? `Documentos PDF correspondientes a ${subsection.title.toLowerCase()}.` : section.description}</p></div>
          {role === "docente" && isLeaf && <UploadForm section={section} subsection={subsection!} parcial={activePartial} onCreated={(d) => setDocuments((items) => [d, ...items])} />}
        </div>
      </header>

      {(subsection?.supportsParcial || filterableOverview) && <div className="mt-5 flex flex-wrap items-center gap-2 rounded-2xl border border-[#dedbd0] bg-[#fffdf8]/80 p-3"><span className="mr-1 px-2 text-[11px] font-extrabold uppercase tracking-wide text-[#6d7d78]">Filtrar por parcial</span>{filterableOverview && <button onClick={() => setPartial(null)} className={`rounded-lg px-3.5 py-2 text-xs font-bold ${partial === null ? "bg-[#123b35] text-white" : "bg-[#ece9e1] text-[#5d706a]"}`}>Todos</button>}{PARCIALES.map((item) => <button key={item} onClick={() => setPartial(item)} className={`rounded-lg px-3.5 py-2 text-xs font-bold ${partial === item ? "bg-[#123b35] text-white" : "bg-[#ece9e1] text-[#5d706a] hover:bg-[#e3ded2]"}`}>{item} Parcial</button>)}</div>}

      {navigationItems.length > 0 && <section className="mt-8"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold text-[#294740]">{subsection ? "Categorías de la galería" : "Contenido de la sección"}</h2><span className="text-[11px] text-[#81908b]">Selecciona una subsección</span></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{navigationItems.map((item) => <Link key={item.code} href={sectionHref(section, item)} className="paper-card group flex min-h-28 items-center gap-4 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-[#cbb992]"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#eeeae0] font-black text-[#7b6749]">{item.code.split(".").at(-1)}</span><span className="min-w-0 flex-1"><strong className="block text-sm leading-5 text-[#34504a]"><span className="text-[#a37334]">{item.code}.</span> {item.title}</strong><small className="mt-2 block text-[#85918d]">{countFor(item)} {countFor(item) === 1 ? "documento" : "documentos"}</small></span><ArrowRight size={17} className="shrink-0 text-[#a9b1ae] transition group-hover:translate-x-1 group-hover:text-[#c98b3c]" /></Link>)}</div></section>}

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-[#294740]">{isLeaf ? "Documentos de esta subsección" : "Documentos recientes"}</h2><p className="mt-1 text-xs text-[#83908c]">{documents.length} {documents.length === 1 ? "archivo PDF" : "archivos PDF"}{partial ? ` · ${partial} Parcial` : ""}</p></div>{error && <button onClick={load} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700"><RefreshCw size={14} />Reintentar</button>}</div>
        {loading ? <div className="grid gap-3"><div className="h-40 animate-pulse rounded-2xl bg-[#e7e3da]" /><div className="h-40 animate-pulse rounded-2xl bg-[#ebe7de]" /></div> : error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div> : documents.length ? <div className="grid gap-4 2xl:grid-cols-2">{documents.map((document) => <DocumentCard key={document.id} document={document} onUpdated={(updated) => setDocuments((items) => items.map((item) => item.id === updated.id ? updated : item))} onDeleted={(id) => setDocuments((items) => items.filter((item) => item.id !== id))} />)}</div> : <div className="paper-card grid min-h-64 place-items-center rounded-2xl p-7 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eeeae0] text-[#9d7844]">{isLeaf ? <FileSearch size={25} /> : <FolderOpen size={25} />}</span><h3 className="mt-4 font-bold text-[#34504a]">Aún no hay documentos aquí</h3><p className="mx-auto mt-2 max-w-sm text-xs leading-5 text-[#7b8884]">{role === "docente" && isLeaf ? "Usa “Subir nuevo PDF” para agregar la primera evidencia de esta subsección." : role === "supervisor" ? "El docente todavía no ha publicado documentos en esta ubicación." : "Abre una subsección del índice para agregar sus documentos."}</p></div></div>}
      </section>

      {!isLeaf && <div className="mt-8 flex gap-3 rounded-2xl border border-[#dad6ca] bg-[#ebe7dc] p-4 text-xs leading-5 text-[#65756f]"><BookOpenCheck size={18} className="mt-0.5 shrink-0 text-[#4f8e7d]" /><span>La numeración y los nombres mostrados corresponden al índice oficial del portafolio docente.</span></div>}
    </div>
  );
}
