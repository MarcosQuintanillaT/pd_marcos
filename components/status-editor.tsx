"use client";

import { useState } from "react";
import { Check, MessageSquareText } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import type { Documento, EstadoDocumento } from "@/lib/types";

export function StatusEditor({ document, onUpdated }: { document: Documento; onUpdated: (document: Documento) => void }) {
  const { demoMode } = useAuth();
  const [estado, setEstado] = useState<EstadoDocumento>(document.estado);
  const [comment, setComment] = useState(document.comentario_supervisor ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true); setMessage("");
    if (demoMode) {
      onUpdated({ ...document, estado, comentario_supervisor: comment.trim() || null });
      setMessage("Revisión guardada en la demostración"); setSaving(false); return;
    }
    const response = await fetch(`/api/documentos/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ estado, comentario_supervisor: comment }) });
    const json = await response.json().catch(() => ({}));
    if (response.ok) { onUpdated(json.documento); setMessage("Revisión guardada"); } else setMessage(json.error ?? "No se pudo guardar");
    setSaving(false);
  }

  return (
    <div className="mt-4 rounded-xl border border-[#dfe3dd] bg-[#f4f6f2] p-3.5">
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#60736d]">Estado
          <select value={estado} onChange={(e) => setEstado(e.target.value as EstadoDocumento)} className="mt-1.5 h-10 w-full rounded-lg border border-[#d5dcd5] bg-white px-3 text-xs font-bold normal-case tracking-normal text-[#294740]"><option>Pendiente</option><option>Revisado</option><option>Aprobado</option></select>
        </label>
        <label className="text-[11px] font-extrabold uppercase tracking-wide text-[#60736d]">Comentario opcional
          <span className="relative mt-1.5 block"><MessageSquareText size={15} className="absolute left-3 top-3 text-[#8b9995]" /><textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={2} placeholder="Escribe una observación clara…" className="w-full resize-y rounded-lg border border-[#d5dcd5] bg-white py-2.5 pl-9 pr-3 text-xs font-normal normal-case leading-5 tracking-normal text-[#294740]" /></span>
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span aria-live="polite" className={`text-[11px] ${message.includes("guardada") ? "text-[#327261]" : "text-red-600"}`}>{message}</span><button onClick={save} disabled={saving} className="flex min-h-11 items-center gap-2 rounded-lg bg-[#245b51] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"><Check size={14} />{saving ? "Guardando…" : "Guardar revisión"}</button></div>
    </div>
  );
}
