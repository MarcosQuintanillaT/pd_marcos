"use client";

import {
  type DragEvent,
  type FormEvent,
  useId,
  useRef,
  useState,
} from "react";
import { FileCheck2, FileUp, Trash2, UploadCloud, X } from "lucide-react";
import { AccessibleDialog } from "@/components/accessible-dialog";
import { useAuth } from "@/components/auth-provider";
import { usePortfolio } from "@/components/portfolio-provider";
import { uploadPortfolioFile } from "@/lib/direct-upload";
import {
  FILE_INPUT_ACCEPT,
  filenameWithoutExtension,
  formatFileSize,
  validatePortfolioFile,
} from "@/lib/file-types";
import { sectionLabel, subsectionLabel } from "@/lib/portfolio";
import type { Documento, Parcial, Seccion, Subseccion } from "@/lib/types";

export function UploadForm({
  section,
  subsection,
  parcial,
  onCreated,
}: {
  section: Seccion;
  subsection: Subseccion;
  parcial: Parcial | null;
  onCreated: (document: Documento) => void;
}) {
  const { demoMode, perfil } = useAuth();
  const { selectedId } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const dialogTitleId = useId();
  const helpId = useId();

  function resetForm() {
    setTitle("");
    setFile(null);
    setError("");
    setDragging(false);
    setProgress(0);
    if (input.current) input.current.value = "";
  }

  function closeDialog() {
    if (uploading) return;
    setOpen(false);
    resetForm();
  }

  function pick(next: File | null) {
    setError("");
    if (!next) {
      setFile(null);
      return;
    }

    const validationError = validatePortfolioFile(next);
    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }

    setFile(next);
    if (!title.trim()) setTitle(filenameWithoutExtension(next.name));
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    pick(event.dataTransfer.files?.[0] ?? null);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!file) return setError("Selecciona un archivo");
    if (!title.trim()) return setError("Escribe el título visible");
    if (subsection.supportsParcial && !parcial) {
      return setError("Selecciona el parcial antes de subir");
    }

    setUploading(true);
    try {
      if (demoMode) {
        const objectUrl = URL.createObjectURL(file);
        onCreated({
          id: `demo-${Date.now()}`,
          portafolio_id: selectedId,
          seccion_codigo: section.code,
          subseccion_codigo: subsection.code,
          seccion: sectionLabel(section),
          subseccion: subsectionLabel(subsection),
          parcial: subsection.fixedParcial ?? parcial,
          titulo: title.trim(),
          archivo_url: file.name,
          signed_url: objectUrl,
          download_url: objectUrl,
          estado: "Pendiente",
          subido_por: perfil?.id ?? "demo",
          fecha_subida: new Date().toISOString(),
          mime_type: file.type,
          tamano_bytes: file.size,
          nombre_original: file.name,
          comentario_supervisor: null,
        });
        setOpen(false);
        resetForm();
        return;
      }

      if (!selectedId) throw new Error("Selecciona un año lectivo activo");
      const document = await uploadPortfolioFile({
        file,
        title: title.trim(),
        subsectionCode: subsection.code,
        parcial: subsection.fixedParcial ?? parcial,
        portfolioId: selectedId,
        onProgress: setProgress,
      });
      onCreated(document);
      setOpen(false);
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible conectar con el servidor. Intenta nuevamente.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123b35] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#123b35]/12 transition hover:bg-[#1b5148] active:scale-[0.98] motion-reduce:transform-none"
      >
        <FileUp size={16} />
        Subir nuevo archivo
      </button>

      <AccessibleDialog
        open={open}
        onClose={closeDialog}
        labelledBy={dialogTitleId}
        initialFocusRef={titleInput}
        closeOnBackdrop={!uploading}
        panelClassName="grid h-full overflow-y-auto p-4"
      >
        <form
          onSubmit={submit}
          className="animate-enter my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg justify-self-center overflow-y-auto rounded-3xl bg-[#fffdf8] p-6 shadow-2xl sm:p-7"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">Nuevo documento</p>
              <h2 id={dialogTitleId} className="text-xl font-bold text-[#24413c]">
                Subir a {subsection.code}.
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#667773]">
                {subsection.title}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              disabled={uploading}
              className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#efede5] text-[#536a64] disabled:opacity-50"
              aria-label="Cerrar formulario de subida"
            >
              <X size={18} />
            </button>
          </div>

          <label className="mt-6 block text-xs font-bold text-[#34544e]">
            Título visible
            <input
              ref={titleInput}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              placeholder={`Ej. ${subsection.title}`}
              className="mt-2 h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 text-base font-normal sm:text-sm"
            />
          </label>

          <div className="mt-5">
            <input
              ref={input}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              className="sr-only"
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0] ?? null;
                event.currentTarget.value = "";
                pick(selected);
              }}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
                setDragging(true);
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setDragging(false);
                }
              }}
              onDrop={handleDrop}
              aria-describedby={helpId}
              className={`flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-7 text-center transition ${
                dragging
                  ? "border-[#c98b3c] bg-[#f8ead6]"
                  : "border-[#d7d3c7] bg-[#f6f3eb] hover:border-[#c98b3c]"
              }`}
            >
              {file ? (
                <FileCheck2 size={30} className="text-[#2e806f]" />
              ) : (
                <UploadCloud size={30} className="text-[#c98b3c]" />
              )}
              <strong className="mt-3 max-w-full break-all text-sm text-[#34544e]">
                {file ? file.name : "Seleccionar o arrastrar un archivo"}
              </strong>
              <span id={helpId} className="mt-1 text-[11px] text-[#6f7e79]">
                {file
                  ? `${formatFileSize(file.size)} · listo para subir`
                  : "PDF, imágenes o HTML hasta 20 MB · video MP4/WebM hasta 50 MB"}
              </span>
            </button>

            {file && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="mt-2 ml-auto flex min-h-11 items-center gap-2 rounded-lg px-3 text-xs font-bold text-[#9a5048] hover:bg-red-50"
                aria-label={`Quitar el archivo ${file.name}`}
              >
                <Trash2 size={15} />
                Quitar archivo
              </button>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
              {error}
            </p>
          )}

          {uploading && (
            <div className="mt-4" role="status" aria-live="polite">
              <div className="mb-1 flex justify-between text-[11px] font-semibold text-[#536a64]">
                <span>Subiendo de forma segura…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[#e5e1d8]">
                <div className="h-full rounded-full bg-[#2e806f] transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeDialog}
              disabled={uploading}
              className="min-h-11 rounded-xl px-4 py-2.5 text-xs font-bold text-[#536a64] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              disabled={uploading}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 py-2.5 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60"
            >
              <UploadCloud size={15} />
              {uploading ? "Subiendo…" : "Subir archivo"}
            </button>
          </div>
        </form>
      </AccessibleDialog>
    </>
  );
}
