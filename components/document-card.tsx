"use client";

import { useId, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Download,
  Eye,
  FileCode2,
  FileClock,
  FilePenLine,
  FileText,
  Image as ImageIcon,
  Film,
  MessageSquareQuote,
  Pencil,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { AccessibleDialog } from "@/components/accessible-dialog";
import { useAuth } from "@/components/auth-provider";
import { FileViewer } from "@/components/pdf-viewer";
import { DocumentHistory } from "@/components/document-history";
import { usePortfolio } from "@/components/portfolio-provider";
import { StatusEditor } from "@/components/status-editor";
import { uploadPortfolioFile } from "@/lib/direct-upload";
import {
  downloadNeedsWarning,
  FILE_INPUT_ACCEPT,
  formatFileSize,
  getFileKind,
  validatePortfolioFile,
} from "@/lib/file-types";
import type { Documento } from "@/lib/types";

const statusStyles = {
  Pendiente: "bg-[#f4e9d7] text-[#946225] border-[#ead6b5]",
  Revisado: "bg-[#e7edf0] text-[#426a7a] border-[#cedce2]",
  Aprobado: "bg-[#e0eee7] text-[#236c59] border-[#c7e2d6]",
};

export function DocumentCard({
  document,
  onUpdated,
  onDeleted,
}: {
  document: Documento;
  onUpdated: (document: Documento) => void;
  onDeleted: (id: string) => void;
}) {
  const { role, demoMode } = useAuth();
  const { selectedId } = usePortfolio();
  const [viewer, setViewer] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(document.signed_url ?? null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(document.download_url ?? null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmDownload, setConfirmDownload] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(document.titulo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const replacement = useRef<HTMLInputElement>(null);
  const cancelDeleteButton = useRef<HTMLButtonElement>(null);
  const deleteTitleId = useId();
  const downloadTitleId = useId();
  const date = new Intl.DateTimeFormat("es-HN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(document.fecha_subida));
  const fileKind = getFileKind(document.archivo_url);
  const DocumentIcon =
    fileKind === "image"
      ? ImageIcon
      : fileKind === "video"
        ? Film
      : fileKind === "html"
        ? FileCode2
        : FileText;

  async function saveTitle() {
    if (!title.trim()) return setError("El título no puede quedar vacío");
    setBusy(true);
    setError("");

    try {
      if (demoMode) {
        onUpdated({ ...document, titulo: title.trim() });
        setEditing(false);
        return;
      }

      const response = await fetch(`/api/documentos/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: title.trim() }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error ?? "No se pudo editar");
        return;
      }
      onUpdated(json.documento);
      setEditing(false);
    } catch {
      setError("No fue posible conectar con el servidor. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function replace(file: File | null) {
    if (!file) return;
    const validationError = validatePortfolioFile(file);
    if (validationError) return setError(validationError);

    setBusy(true);
    setError("");
    try {
      if (demoMode) {
        const objectUrl = URL.createObjectURL(file);
        onUpdated({
          ...document,
          archivo_url: file.name,
          signed_url: objectUrl,
          download_url: objectUrl,
          fecha_subida: new Date().toISOString(),
          estado: "Pendiente",
          mime_type: file.type,
          tamano_bytes: file.size,
          nombre_original: file.name,
        });
        return;
      }

      const subsectionCode = document.subseccion_codigo
        ?? document.subseccion.match(/^([0-9]+(?:\.[0-9]+){1,2})\./)?.[1]
        ?? "";
      if (!selectedId || !subsectionCode) throw new Error("No se pudo identificar la ubicación del documento");
      const updated = await uploadPortfolioFile({
        file,
        title: document.titulo,
        subsectionCode,
        parcial: document.parcial,
        portfolioId: selectedId,
        replacingId: document.id,
      });
      setViewerUrl(null);
      setDownloadUrl(null);
      onUpdated(updated);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible conectar con el servidor. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  async function access(download: boolean) {
    if (demoMode) return download ? document.download_url : document.signed_url;
    const response = await fetch(
      `/api/documentos/${document.id}/acceso${download ? "?descargar=true" : ""}`,
      { cache: "no-store" },
    );
    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json.url) throw new Error(json.error ?? "No se pudo abrir el archivo");
    return String(json.url);
  }

  async function openViewer() {
    setBusy(true);
    setError("");
    try {
      const [view, download] = await Promise.all([access(false), access(true)]);
      setViewerUrl(view ?? null);
      setDownloadUrl(download ?? null);
      setViewer(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo abrir el archivo");
    } finally {
      setBusy(false);
    }
  }

  async function downloadFile() {
    setBusy(true);
    setError("");
    try {
      const url = await access(true);
      if (!url) throw new Error("No se pudo preparar la descarga");
      setDownloadUrl(url);
      setConfirmDownload(false);
      window.location.assign(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo descargar el archivo");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      if (demoMode) {
        onDeleted(document.id);
        return;
      }

      const response = await fetch(`/api/documentos/${document.id}`, {
        method: "DELETE",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json.error ?? "No se pudo eliminar");
        return;
      }
      setConfirmDelete(false);
      onDeleted(document.id);
    } catch {
      setError("No fue posible conectar con el servidor. Intenta nuevamente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="paper-card overflow-hidden rounded-2xl transition hover:border-[#cfc7b7]">
      <div className="p-4 sm:p-5">
        <div className="flex gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f2e6d1] text-[#a66d28]">
            <DocumentIcon size={21} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              {editing ? (
                <div className="flex w-full gap-2">
                  <input
                    autoFocus
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={160}
                    aria-label="Título del documento"
                    className="h-11 min-w-0 flex-1 rounded-lg border border-[#cfc9bc] bg-white px-3 text-base font-semibold sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveTitle}
                    disabled={busy}
                    className="grid size-11 place-items-center rounded-lg bg-[#245b51] text-white"
                    aria-label="Guardar título"
                  >
                    <Save size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setTitle(document.titulo);
                    }}
                    className="grid size-11 place-items-center rounded-lg bg-[#efede6] text-[#687873]"
                    aria-label="Cancelar edición"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-6 text-[#284640]">
                  {document.titulo}
                </h3>
              )}
              {!editing && (
                <span
                  aria-label={`Estado: ${document.estado}`}
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyles[document.estado]}`}
                >
                  {document.estado}
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#667773]">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={13} aria-hidden="true" />
                {date}
              </span>
              {document.parcial && (
                <span className="rounded-md bg-[#ece9e1] px-2 py-1 font-bold text-[#596d67]">
                  {document.parcial} Parcial
                </span>
              )}
              {document.tamano_bytes && <span>{formatFileSize(document.tamano_bytes)}</span>}
              {(document.version_actual ?? 1) > 1 && <span>Versión {document.version_actual}</span>}
            </div>
          </div>
        </div>

        {document.comentario_supervisor && role === "docente" && (
          <div className="mt-4 flex gap-3 rounded-xl border border-[#dbe2df] bg-[#f1f5f2] p-3 text-xs leading-5 text-[#526a63]">
            <MessageSquareQuote
              size={17}
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[#4f8e7d]"
            />
            <span>
              <strong className="block text-[10px] uppercase tracking-wide text-[#2f6056]">
                Comentario del supervisor
              </strong>
              {document.comentario_supervisor}
            </span>
          </div>
        )}
        {error && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e7e3d9] pt-4">
          <button
            type="button"
            onClick={() => void openViewer()}
            disabled={busy}
            aria-haspopup="dialog"
            className="flex min-h-11 items-center gap-2 rounded-lg bg-[#123b35] px-3.5 py-2.5 text-xs font-bold text-white"
          >
            <Eye size={15} />
            Ver archivo
          </button>
          <button
            type="button"
            onClick={() => downloadNeedsWarning(document.archivo_url, document.mime_type)
              ? setConfirmDownload(true)
              : void downloadFile()}
            disabled={busy}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-[#d8d5ca] bg-white px-3.5 py-2.5 text-xs font-bold text-[#48615b]"
          >
            <Download size={15} />
            Descargar
          </button>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="grid size-11 place-items-center rounded-lg border border-[#d8d5ca] bg-white text-[#48615b]"
            aria-label={`Ver historial de ${document.titulo}`}
          >
            <FileClock size={16} />
          </button>
          {role === "docente" && (
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(true)}
                disabled={busy}
                aria-label={`Editar título de ${document.titulo}`}
                className="grid size-11 place-items-center rounded-lg text-[#657873] hover:bg-[#ecefe9]"
              >
                <Pencil size={15} />
              </button>
              <input
                ref={replacement}
                type="file"
                accept={FILE_INPUT_ACCEPT}
                className="sr-only"
                onChange={(event) => {
                  const selected = event.currentTarget.files?.[0] ?? null;
                  event.currentTarget.value = "";
                  void replace(selected);
                }}
              />
              <button
                type="button"
                onClick={() => replacement.current?.click()}
                disabled={busy}
                aria-label={`Reemplazar el archivo de ${document.titulo}`}
                className="grid size-11 place-items-center rounded-lg text-[#657873] hover:bg-[#ecefe9]"
              >
                {busy ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <FilePenLine size={15} />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setConfirmDelete(true);
                }}
                disabled={busy}
                aria-label={`Eliminar ${document.titulo}`}
                aria-haspopup="dialog"
                className="grid size-11 place-items-center rounded-lg text-[#aa5c52] hover:bg-red-50"
              >
                <Trash2 size={15} />
              </button>
            </div>
          )}
        </div>
        {role === "supervisor" && (
          <StatusEditor document={document} onUpdated={onUpdated} />
        )}
      </div>

      <FileViewer
        open={viewer}
        onClose={() => setViewer(false)}
        title={document.titulo}
        filePath={document.archivo_url}
        url={viewerUrl}
        downloadUrl={fileKind === "html" ? null : downloadUrl}
      />

      <DocumentHistory
        documentId={document.id}
        title={document.titulo}
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />

      <AccessibleDialog
        open={confirmDelete}
        onClose={() => {
          if (!busy) setConfirmDelete(false);
        }}
        labelledBy={deleteTitleId}
        initialFocusRef={cancelDeleteButton}
        closeOnBackdrop={!busy}
        panelClassName="grid h-full overflow-y-auto p-4"
      >
        <div className="my-auto w-full max-w-md justify-self-center rounded-3xl bg-[#fffdf8] p-6 shadow-2xl sm:p-7">
          <span className="grid size-12 place-items-center rounded-2xl bg-red-50 text-[#a64f46]">
            <AlertTriangle size={23} aria-hidden="true" />
          </span>
          <h2 id={deleteTitleId} className="mt-4 text-xl font-bold text-[#24413c]">
            Eliminar documento
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#5d706a]">
            <strong>“{document.titulo}”</strong> se moverá a la papelera. Podrás
            restaurarlo o eliminarlo definitivamente desde allí.
          </p>
          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              ref={cancelDeleteButton}
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={busy}
              className="min-h-11 rounded-xl px-4 py-2.5 text-xs font-bold text-[#536a64] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#a64f46] px-5 py-2.5 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60"
            >
              <Trash2 size={15} />
              {busy ? "Moviendo…" : "Mover a papelera"}
            </button>
          </div>
        </div>
      </AccessibleDialog>

      <AccessibleDialog
        open={confirmDownload}
        onClose={() => setConfirmDownload(false)}
        labelledBy={downloadTitleId}
        panelClassName="grid h-full overflow-y-auto p-4"
      >
        <div className="my-auto w-full max-w-md justify-self-center rounded-3xl bg-[#fffdf8] p-6 shadow-2xl sm:p-7">
          <span className="grid size-12 place-items-center rounded-2xl bg-[#f4e9d7] text-[#946225]"><AlertTriangle size={23} /></span>
          <h2 id={downloadTitleId} className="mt-4 text-xl font-bold text-[#24413c]">Descargar archivo HTML</h2>
          <p className="mt-2 text-sm leading-6 text-[#5d706a]">Abre archivos HTML descargados únicamente si reconoces su contenido. Dentro del portafolio se muestran aislados por seguridad.</p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmDownload(false)} className="min-h-11 rounded-xl px-4 text-xs font-bold text-[#536a64]">Cancelar</button>
            <button type="button" onClick={() => void downloadFile()} disabled={busy} className="min-h-11 rounded-xl bg-[#123b35] px-5 text-xs font-bold text-white">Descargar de todos modos</button>
          </div>
        </div>
      </AccessibleDialog>
    </article>
  );
}
