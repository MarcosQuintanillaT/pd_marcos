"use client";

import { useId, useState } from "react";
import { Check, ChevronDown, MessageSquareText } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { Documento, EstadoDocumento } from "@/lib/types";

type Feedback = { type: "success" | "error"; text: string } | null;

export function StatusEditor({
  document,
  onUpdated,
}: {
  document: Documento;
  onUpdated: (document: Documento) => void;
}) {
  const { demoMode } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [estado, setEstado] = useState<EstadoDocumento>(document.estado);
  const [comment, setComment] = useState(document.comentario_supervisor ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const editorId = useId();

  const normalizedComment = comment.trim();
  const originalComment = (document.comentario_supervisor ?? "").trim();
  const dirty =
    estado !== document.estado || normalizedComment !== originalComment;

  async function save() {
    if (!dirty || saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      if (demoMode) {
        onUpdated({
          ...document,
          estado,
          comentario_supervisor: normalizedComment || null,
        });
        setFeedback({
          type: "success",
          text: "Revisión guardada en la demostración",
        });
        return;
      }

      const response = await fetch(`/api/documentos/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado,
          comentario_supervisor: normalizedComment,
        }),
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setFeedback({
          type: "error",
          text: json.error ?? "No se pudo guardar la revisión",
        });
        return;
      }

      onUpdated(json.documento);
      setFeedback({ type: "success", text: "Revisión guardada" });
    } catch {
      setFeedback({
        type: "error",
        text: "No fue posible conectar con el servidor. Intenta nuevamente.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-[#d9e0da] bg-[#f4f6f2]">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        aria-expanded={expanded}
        aria-controls={editorId}
        className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-[#294740] hover:bg-[#ebf0eb]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <MessageSquareText size={17} className="shrink-0 text-[#4b7d70]" />
          <span className="truncate">Revisar documento</span>
          <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] uppercase tracking-wide text-[#5a7069]">
            {document.estado}
          </span>
        </span>
        <ChevronDown
          size={17}
          aria-hidden="true"
          className={`shrink-0 transition ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div id={editorId} className="border-t border-[#d9e0da] p-3.5 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
            <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#536962]">
              Estado
              <select
                value={estado}
                onChange={(event) => {
                  setEstado(event.target.value as EstadoDocumento);
                  setFeedback(null);
                }}
                className="mt-1.5 h-11 w-full rounded-lg border border-[#cbd5cd] bg-white px-3 text-base font-bold normal-case tracking-normal text-[#294740] sm:text-sm"
              >
                <option>Pendiente</option>
                <option>Revisado</option>
                <option>Aprobado</option>
              </select>
            </label>

            <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#536962]">
              Comentario opcional
              <span className="relative mt-1.5 block">
                <MessageSquareText
                  size={15}
                  aria-hidden="true"
                  className="absolute left-3 top-3 text-[#778a84]"
                />
                <textarea
                  value={comment}
                  onChange={(event) => {
                    setComment(event.target.value);
                    setFeedback(null);
                  }}
                  maxLength={2000}
                  rows={3}
                  placeholder="Escribe una observación clara…"
                  className="w-full resize-y rounded-lg border border-[#cbd5cd] bg-white py-2.5 pl-9 pr-3 text-base font-normal normal-case leading-6 tracking-normal text-[#294740] sm:text-sm"
                />
              </span>
              <span className="mt-1 block text-right text-[10px] font-medium normal-case tracking-normal text-[#667773]">
                {comment.length}/2000 caracteres
              </span>
            </label>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span
              aria-live="polite"
              className={`text-[11px] ${
                feedback?.type === "success" ? "text-[#327261]" : "text-red-600"
              }`}
            >
              {feedback?.text}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={saving || !dirty}
              className="flex min-h-11 items-center gap-2 rounded-lg bg-[#245b51] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Check size={14} />
              {saving
                ? "Guardando…"
                : dirty
                  ? "Guardar revisión"
                  : "Sin cambios"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
