"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Clock3, Download, FileClock, LoaderCircle, MessageSquareText, X } from "lucide-react";
import { AccessibleDialog } from "@/components/accessible-dialog";
import type { DocumentoRevision, DocumentoVersion } from "@/lib/types";

export function DocumentHistory({
  documentId,
  title,
  open,
  onClose,
}: {
  documentId: string;
  title: string;
  open: boolean;
  onClose: () => void;
}) {
  const headingId = useId();
  const closeButton = useRef<HTMLButtonElement>(null);
  const [reviews, setReviews] = useState<DocumentoRevision[]>([]);
  const [versions, setVersions] = useState<DocumentoVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void fetch(`/api/documentos/${documentId}/historial`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(json.error ?? "No se pudo cargar el historial");
        setReviews(json.revisiones ?? []);
        setVersions(json.versiones ?? []);
      })
      .catch((caught: unknown) => {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : "No se pudo cargar el historial");
      })
        .finally(() => setLoading(false));
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [documentId, open]);

  async function downloadVersion(version: number) {
    const response = await fetch(`/api/documentos/${documentId}/acceso?descargar=true&version=${version}`, {
      cache: "no-store",
    });
    const json = await response.json().catch(() => ({}));
    if (response.ok && json.url) window.location.assign(json.url);
    else setError(json.error ?? "No se pudo descargar la versión");
  }

  const date = (value: string) => new Intl.DateTimeFormat("es-HN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

  return (
    <AccessibleDialog
      open={open}
      onClose={onClose}
      labelledBy={headingId}
      initialFocusRef={closeButton}
      panelClassName="grid h-full overflow-y-auto p-4"
    >
      <section className="my-auto w-full max-w-2xl justify-self-center overflow-hidden rounded-3xl bg-[#fffdf8] shadow-2xl">
        <header className="flex items-start gap-4 border-b border-[#e3ded3] p-5 sm:p-6">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#e8eee9] text-[#2f675d]">
            <FileClock size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow mb-1">Trazabilidad</p>
            <h2 id={headingId} className="truncate text-lg font-bold text-[#24413c]">Historial de {title}</h2>
          </div>
          <button ref={closeButton} type="button" onClick={onClose} className="grid size-11 place-items-center rounded-xl bg-[#123b35] text-white" aria-label="Cerrar historial">
            <X size={18} />
          </button>
        </header>
        <div className="max-h-[70dvh] overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <p className="flex items-center gap-2 text-sm text-[#60736d]" role="status"><LoaderCircle className="animate-spin" size={17} />Cargando historial…</p>
          ) : error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>
          ) : (
            <div className="grid gap-7">
              <section>
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#294740]"><MessageSquareText size={17} />Revisiones</h3>
                <div className="mt-3 grid gap-3">
                  {reviews.length ? reviews.map((review) => (
                    <article key={review.id} className="rounded-xl border border-[#dedbd0] bg-white p-4 text-xs text-[#5a6e68]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <strong className="text-[#294740]">{review.estado_anterior} → {review.estado_nuevo}</strong>
                        <time>{date(review.creado_en)}</time>
                      </div>
                      {review.comentario_nuevo && <p className="mt-2 leading-5">{review.comentario_nuevo}</p>}
                    </article>
                  )) : <p className="text-xs text-[#667773]">Todavía no hay cambios de revisión registrados.</p>}
                </div>
              </section>
              <section>
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#294740]"><Clock3 size={17} />Versiones anteriores</h3>
                <div className="mt-3 grid gap-2">
                  {versions.length ? versions.map((version) => (
                    <div key={version.id} className="flex items-center gap-3 rounded-xl border border-[#dedbd0] bg-white p-3">
                      <span className="grid size-9 place-items-center rounded-lg bg-[#f1eadf] text-xs font-black text-[#9b682a]">v{version.numero_version}</span>
                      <span className="min-w-0 flex-1"><strong className="block truncate text-xs text-[#294740]">{version.titulo}</strong><small className="text-[#667773]">{date(version.creado_en)}</small></span>
                      <button type="button" onClick={() => void downloadVersion(version.numero_version)} className="grid size-11 place-items-center rounded-lg text-[#315f56] hover:bg-[#edf2ee]" aria-label={`Descargar versión ${version.numero_version}`}><Download size={16} /></button>
                    </div>
                  )) : <p className="text-xs text-[#667773]">Este archivo aún no ha sido reemplazado.</p>}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </AccessibleDialog>
  );
}
