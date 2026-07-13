"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, RefreshCw, RotateCcw, Trash2, X } from "lucide-react";
import { AccessibleDialog } from "@/components/accessible-dialog";
import { useAuth } from "@/components/auth-provider";
import { usePortfolio } from "@/components/portfolio-provider";
import type { Documento } from "@/lib/types";

export function TrashView() {
  const { role } = useAuth();
  const { selectedId, selected } = usePortfolio();
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [target, setTarget] = useState<Documento | null>(null);
  const titleId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (!selectedId || role !== "docente") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/documentos?portafolio=${encodeURIComponent(selectedId)}&papelera=true&limite=50`, { cache: "no-store", signal });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudo abrir la papelera");
      setDocuments(json.documentos ?? []);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "No se pudo abrir la papelera");
    } finally {
      setLoading(false);
    }
  }, [role, selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  async function restore(document: Documento) {
    setBusyId(document.id);
    setError("");
    try {
      const response = await fetch(`/api/documentos/${document.id}/restaurar`, { method: "POST" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudo restaurar");
      setDocuments((items) => items.filter((item) => item.id !== document.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo restaurar");
    } finally {
      setBusyId("");
    }
  }

  async function purge() {
    if (!target) return;
    setBusyId(target.id);
    setError("");
    try {
      const response = await fetch(`/api/documentos/${target.id}?permanente=true`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudo eliminar definitivamente");
      setDocuments((items) => items.filter((item) => item.id !== target.id));
      setTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar definitivamente");
    } finally {
      setBusyId("");
    }
  }

  if (role !== "docente") return <div className="p-8 text-sm text-[#5f716c]">La papelera solo está disponible para el docente.</div>;

  return (
    <div className="animate-enter px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
      <header className="paper-card rounded-[1.7rem] p-6 sm:p-8"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-[#f4e9d7] text-[#946225]"><Trash2 size={22} /></span><div><p className="eyebrow mb-1">Año lectivo {selected?.anio_lectivo ?? "—"}</p><h1 className="text-2xl font-semibold text-[#173732]">Papelera de documentos</h1><p className="mt-2 text-sm text-[#5f716c]">Restaura evidencias o elimínalas definitivamente junto con sus versiones.</p></div></div></header>
      {error && <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => void load()} className="grid size-11 place-items-center" aria-label="Reintentar"><RefreshCw size={16} /></button></div>}
      <section className="mt-7">
        {loading ? <div className="h-32 animate-pulse rounded-2xl bg-[#e7e3da]" /> : documents.length ? <div className="grid gap-3">{documents.map((document) => <article key={document.id} className="paper-card flex flex-col gap-4 rounded-2xl p-4 sm:flex-row sm:items-center sm:p-5"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f4e9d7] text-[#946225]"><Trash2 size={18} /></span><div className="min-w-0 flex-1"><h2 className="truncate text-sm font-bold text-[#294740]">{document.titulo}</h2><p className="mt-1 truncate text-xs text-[#5f716c]">{document.subseccion} · eliminado {document.eliminado_en ? new Intl.DateTimeFormat("es-HN", { dateStyle: "medium" }).format(new Date(document.eliminado_en)) : "recientemente"}</p></div><div className="flex gap-2"><button type="button" onClick={() => void restore(document)} disabled={busyId === document.id} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cfd8d2] bg-white px-4 text-xs font-bold text-[#315f56]"><RotateCcw size={15} />Restaurar</button><button type="button" onClick={() => setTarget(document)} disabled={busyId === document.id} className="grid size-11 place-items-center rounded-xl bg-red-50 text-[#a64f46]" aria-label={`Eliminar definitivamente ${document.titulo}`}><Trash2 size={16} /></button></div></article>)}</div> : <div className="paper-card grid min-h-52 place-items-center rounded-2xl p-6 text-center"><div><Trash2 className="mx-auto text-[#8a7660]" size={28} /><h2 className="mt-3 font-bold text-[#294740]">La papelera está vacía</h2><p className="mt-2 text-sm text-[#5f716c]">No hay documentos eliminados en este año lectivo.</p></div></div>}
      </section>

      <AccessibleDialog open={Boolean(target)} onClose={() => !busyId && setTarget(null)} labelledBy={titleId} initialFocusRef={cancelButton} closeOnBackdrop={!busyId} panelClassName="grid h-full overflow-y-auto p-4"><div className="my-auto w-full max-w-md justify-self-center rounded-3xl bg-[#fffdf8] p-6 shadow-2xl sm:p-7"><div className="flex justify-between gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-[#a64f46]"><AlertTriangle size={22} /></span><button type="button" onClick={() => setTarget(null)} className="grid size-11 place-items-center rounded-xl bg-[#efede5] text-[#536a64]" aria-label="Cerrar"><X size={17} /></button></div><h2 id={titleId} className="mt-4 text-xl font-bold text-[#24413c]">Eliminar definitivamente</h2><p className="mt-2 text-sm leading-6 text-[#5f716c]">Se borrarán <strong>“{target?.titulo}”</strong>, su archivo y todas sus versiones. Esta acción no se puede deshacer.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancelButton} type="button" onClick={() => setTarget(null)} className="min-h-11 rounded-xl px-4 text-xs font-bold text-[#536a64]">Cancelar</button><button type="button" onClick={() => void purge()} disabled={Boolean(busyId)} className="min-h-11 rounded-xl bg-[#a64f46] px-5 text-xs font-bold text-white">{busyId ? "Eliminando…" : "Eliminar definitivamente"}</button></div></div></AccessibleDialog>
    </div>
  );
}
