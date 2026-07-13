"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  RefreshCw,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { AccessibleDialog } from "@/components/accessible-dialog";
import { useAuth } from "@/components/auth-provider";
import { usePortfolio } from "@/components/portfolio-provider";
import { trashRetentionInfo } from "@/lib/trash-retention";
import type { Documento } from "@/lib/types";

const PAGE_SIZE = 24;

function demoTrashDocuments(): Documento[] {
  const now = Date.now();
  const base = {
    portafolio_id: "demo-portafolio-2026",
    seccion_codigo: "4",
    seccion: "4. Filosofía de Enseñanza",
    parcial: null,
    archivo_url: "demo/archivo.pdf",
    estado: "Pendiente" as const,
    subido_por: "demo-docente",
    fecha_subida: new Date(now - 45 * 86_400_000).toISOString(),
    comentario_supervisor: null,
  };

  return [
    {
      ...base,
      id: "demo-papelera-1",
      subseccion_codigo: "4.7",
      subseccion: "4.7. Planes de clase (ejecución diaria)",
      titulo: "Plan de clase — Programación web",
      eliminado_en: new Date(now - 6 * 86_400_000).toISOString(),
    },
    {
      ...base,
      id: "demo-papelera-2",
      subseccion_codigo: "4.8",
      subseccion: "4.8. Rúbricas (métricas de evaluación)",
      titulo: "Rúbrica del proyecto final",
      eliminado_en: new Date(now - 31 * 86_400_000).toISOString(),
      purga_error: "Pendiente de reintento en la demostración",
    },
  ];
}

function retentionText(document: Documento) {
  if (document.purga_iniciada_en) return "Eliminación definitiva en proceso";
  if (document.purga_error) return "La purga falló y se reintentará automáticamente";
  const retention = document.eliminado_en
    ? trashRetentionInfo(document.eliminado_en)
    : null;
  if (!retention) return "Se conservará durante 30 días";
  if (retention.expired) return "Plazo vencido: se purgará en la próxima ejecución";
  return `Se eliminará permanentemente en ${retention.daysRemaining} ${retention.daysRemaining === 1 ? "día" : "días"}`;
}

export function TrashView() {
  const { role, demoMode } = useAuth();
  const { selectedId, selected } = usePortfolio();
  const canAccessTrash = role === "docente" || (demoMode && role === null);
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [purgingExpired, setPurgingExpired] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [target, setTarget] = useState<Documento | null>(null);
  const titleId = useId();
  const cancelButton = useRef<HTMLButtonElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    if (demoMode && canAccessTrash) {
      const demoDocuments = demoTrashDocuments();
      setDocuments(demoDocuments);
      setTotal(demoDocuments.length);
      setPages(1);
      setLoading(false);
      return;
    }
    if (!selectedId || !canAccessTrash) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        portafolio: selectedId,
        papelera: "true",
        limite: String(PAGE_SIZE),
        pagina: String(page),
      });
      const response = await fetch(`/api/documentos?${params}`, {
        cache: "no-store",
        signal,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudo abrir la papelera");
      const nextPages = Number(json.paginas ?? 0);
      if (nextPages > 0 && page > nextPages) {
        setPage(nextPages);
        return;
      }
      setDocuments(json.documentos ?? []);
      setTotal(Number(json.total ?? 0));
      setPages(nextPages);
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setError(caught instanceof Error ? caught.message : "No se pudo abrir la papelera");
    } finally {
      setLoading(false);
    }
  }, [canAccessTrash, demoMode, page, selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  const expiredOnPage = useMemo(
    () => documents.filter((document) => {
      const retention = document.eliminado_en
        ? trashRetentionInfo(document.eliminado_en)
        : null;
      return Boolean(retention?.expired || document.purga_error);
    }).length,
    [documents],
  );

  function removeFromPage(documentId: string) {
    setDocuments((items) => items.filter((item) => item.id !== documentId));
    setTotal((value) => Math.max(0, value - 1));
    if (documents.length === 1 && page > 1) setPage((value) => value - 1);
  }

  async function restore(document: Documento) {
    setBusyId(document.id);
    setError("");
    setNotice("");
    try {
      if (demoMode) {
        removeFromPage(document.id);
        setNotice(`“${document.titulo}” volvió a su sección original.`);
        return;
      }
      const response = await fetch(`/api/documentos/${document.id}/restaurar`, {
        method: "POST",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "No se pudo restaurar");
      removeFromPage(document.id);
      setNotice(`“${document.titulo}” volvió a su sección original.`);
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
    setNotice("");
    try {
      if (demoMode) {
        removeFromPage(target.id);
        setNotice(`“${target.titulo}” se eliminó definitivamente.`);
        setTarget(null);
        return;
      }
      const response = await fetch(`/api/documentos/${target.id}?permanente=true`, {
        method: "DELETE",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json.error ?? "No se pudo eliminar definitivamente");
      }
      removeFromPage(target.id);
      setNotice(`“${target.titulo}” se eliminó definitivamente.`);
      setTarget(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo eliminar definitivamente");
    } finally {
      setBusyId("");
    }
  }

  async function purgeExpired() {
    if (!selectedId) return;
    setPurgingExpired(true);
    setError("");
    setNotice("");
    try {
      if (demoMode) {
        const expiredIds = new Set(
          documents
            .filter((document) => {
              const eliminadoEn = document.eliminado_en;
              return eliminadoEn ? Boolean(trashRetentionInfo(eliminadoEn)?.expired) : false;
            })
            .map((document) => document.id),
        );
        setDocuments((items) => items.filter((document) => !expiredIds.has(document.id)));
        setTotal((value) => Math.max(0, value - expiredIds.size));
        setNotice(
          expiredIds.size > 0
            ? `Se eliminaron definitivamente ${expiredIds.size} documentos vencidos.`
            : "No hay documentos que hayan cumplido los 30 días.",
        );
        return;
      }
      const response = await fetch(
        `/api/papelera/purgar?portafolio=${encodeURIComponent(selectedId)}`,
        { method: "POST" },
      );
      const json = await response.json().catch(() => ({}));
      await load();
      if (!response.ok) {
        throw new Error(json.error ?? "Algunos documentos no pudieron purgarse");
      }
      setNotice(
        json.removed > 0
          ? `Se eliminaron definitivamente ${json.removed} documentos vencidos.`
          : "No hay documentos que hayan cumplido los 30 días.",
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo purgar la papelera");
    } finally {
      setPurgingExpired(false);
    }
  }

  if (!canAccessTrash) {
    return <div className="p-8 text-sm text-[#5f716c]">La papelera solo está disponible para el docente.</div>;
  }

  const targetRetention = target?.eliminado_en
    ? trashRetentionInfo(target.eliminado_en)
    : null;

  return (
    <div className="animate-enter px-4 py-7 sm:px-7 lg:px-10 lg:py-9 xl:px-12">
      <header className="paper-card rounded-[1.7rem] p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#f4e9d7] text-[#946225]"><Trash2 size={22} /></span>
            <div>
              <p className="eyebrow mb-1">Año lectivo {selected?.anio_lectivo ?? "—"}</p>
              <h1 className="text-2xl font-semibold text-[#173732]">Papelera de documentos</h1>
              <p className="mt-2 text-sm leading-6 text-[#5f716c]">Los documentos se conservan 30 días antes de eliminar sus archivos y versiones.</p>
            </div>
          </div>
          <div className="w-full sm:w-auto sm:max-w-xs">
            <button
              type="button"
              onClick={() => void purgeExpired()}
              disabled={purgingExpired || total === 0}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#d8b77f] bg-[#fff8ec] px-4 text-xs font-bold text-[#8a5d25] transition hover:bg-[#f7e8ce] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CalendarClock size={16} />
              {purgingExpired ? "Eliminando…" : "Eliminar vencidos definitivamente"}
            </button>
            <p className="mt-2 text-center text-[11px] leading-5 text-[#6d7e79] sm:text-right">
              Elimina permanentemente los documentos que llevan más de 30 días en la papelera.
            </p>
          </div>
        </div>
      </header>

      {notice && <div role="status" aria-live="polite" className="mt-5 rounded-xl border border-[#c8dfd4] bg-[#edf7f2] p-4 text-sm text-[#2d6758]">{notice}</div>}
      {error && <div role="alert" className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"><span>{error}</span><button type="button" onClick={() => void load()} className="grid size-11 place-items-center" aria-label="Reintentar"><RefreshCw size={16} /></button></div>}

      <section className="mt-7" aria-labelledby="trash-list-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h2 id="trash-list-title" className="text-lg font-bold text-[#294740]">Documentos eliminados</h2><p className="mt-1 text-xs text-[#6d7e79]">{total} {total === 1 ? "documento" : "documentos"} · {expiredOnPage} vencidos en esta página</p></div>
          <span className="rounded-full bg-[#f4e9d7] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#8a5d25]">Eliminación automática · 30 días</span>
        </div>

        {loading ? (
          <div className="h-32 animate-pulse rounded-2xl bg-[#e7e3da]" />
        ) : documents.length ? (
          <div className="grid gap-3">
            {documents.map((document) => {
              const retention = document.eliminado_en
                ? trashRetentionInfo(document.eliminado_en)
                : null;
              const urgent = Boolean(retention?.expired || (retention && retention.daysRemaining <= 3));
              return (
                <article key={document.id} className="paper-card flex flex-col gap-4 rounded-2xl p-4 sm:p-5 lg:flex-row lg:items-center">
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f4e9d7] text-[#946225]"><Trash2 size={18} /></span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-[#294740]">{document.titulo}</h3>
                    <p className="mt-1 text-xs leading-5 text-[#5f716c]">{document.seccion}</p>
                    <p className="text-xs leading-5 text-[#71817c]">{document.subseccion}</p>
                    <p className="mt-2 text-[11px] text-[#71817c]">Eliminado {document.eliminado_en ? new Intl.DateTimeFormat("es-HN", { dateStyle: "long", timeStyle: "short" }).format(new Date(document.eliminado_en)) : "recientemente"}</p>
                    <p className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ${urgent ? "bg-red-50 text-[#a64f46]" : "bg-[#edf3ef] text-[#3f6c60]"}`}><CalendarClock size={13} />{retentionText(document)}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" onClick={() => void restore(document)} disabled={busyId === document.id || Boolean(document.purga_iniciada_en)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#cfd8d2] bg-white px-4 text-xs font-bold text-[#315f56] disabled:opacity-50"><RotateCcw size={15} />Restaurar</button>
                    <button type="button" onClick={() => setTarget(document)} disabled={busyId === document.id || Boolean(document.purga_iniciada_en)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 text-xs font-bold text-[#a64f46] disabled:opacity-50"><Trash2 size={15} />Eliminar definitivamente</button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="paper-card grid min-h-52 place-items-center rounded-2xl p-6 text-center"><div><Trash2 className="mx-auto text-[#8a7660]" size={28} /><h2 className="mt-3 font-bold text-[#294740]">La papelera está vacía</h2><p className="mt-2 text-sm text-[#5f716c]">No hay documentos eliminados en este año lectivo.</p></div></div>
        )}

        {pages > 1 && <nav className="mt-5 flex items-center justify-end gap-2" aria-label="Páginas de la papelera"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} className="grid size-11 place-items-center rounded-xl border border-[#d8d5ca] bg-white disabled:opacity-40" aria-label="Página anterior"><ArrowLeft size={16} /></button><span className="px-2 text-xs font-semibold text-[#5f716c]">Página {page} de {pages}</span><button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page === pages} className="grid size-11 place-items-center rounded-xl border border-[#d8d5ca] bg-white disabled:opacity-40" aria-label="Página siguiente"><ArrowRight size={16} /></button></nav>}
      </section>

      <AccessibleDialog open={Boolean(target)} onClose={() => !busyId && setTarget(null)} labelledBy={titleId} initialFocusRef={cancelButton} closeOnBackdrop={!busyId} panelClassName="grid h-full overflow-y-auto p-4">
        <div className="my-auto w-full max-w-md justify-self-center rounded-3xl bg-[#fffdf8] p-6 shadow-2xl sm:p-7">
          <div className="flex justify-between gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-[#a64f46]"><AlertTriangle size={22} /></span><button type="button" onClick={() => setTarget(null)} className="grid size-11 place-items-center rounded-xl bg-[#efede5] text-[#536a64]" aria-label="Cerrar"><X size={17} /></button></div>
          <h2 id={titleId} className="mt-4 text-xl font-bold text-[#24413c]">Eliminar definitivamente</h2>
          <p className="mt-2 text-sm leading-6 text-[#5f716c]">Se borrarán <strong>“{target?.titulo}”</strong>, su archivo y todas sus versiones. Esta acción no se puede deshacer.</p>
          {targetRetention && <p className="mt-3 rounded-xl bg-[#f5eee2] p-3 text-xs leading-5 text-[#7b6244]">La purga automática está prevista para el {new Intl.DateTimeFormat("es-HN", { dateStyle: "long" }).format(targetRetention.purgeAt)}.</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button ref={cancelButton} type="button" onClick={() => setTarget(null)} className="min-h-11 rounded-xl px-4 text-xs font-bold text-[#536a64]">Cancelar</button><button type="button" onClick={() => void purge()} disabled={Boolean(busyId)} className="min-h-11 rounded-xl bg-[#a64f46] px-5 text-xs font-bold text-white">{busyId ? "Eliminando…" : "Eliminar definitivamente"}</button></div>
        </div>
      </AccessibleDialog>
    </div>
  );
}
