"use client";

import { useRef, useState } from "react";
import { CalendarDays, Download, Eye, FilePenLine, FileText, MessageSquareQuote, Pencil, RefreshCw, Save, Trash2, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PdfViewer } from "@/components/pdf-viewer";
import { StatusEditor } from "@/components/status-editor";
import type { Documento } from "@/lib/types";

const statusStyles = {
  Pendiente: "bg-[#f4e9d7] text-[#946225] border-[#ead6b5]",
  Revisado: "bg-[#e7edf0] text-[#426a7a] border-[#cedce2]",
  Aprobado: "bg-[#e0eee7] text-[#236c59] border-[#c7e2d6]",
};

export function DocumentCard({ document, onUpdated, onDeleted }: { document: Documento; onUpdated: (document: Documento) => void; onDeleted: (id: string) => void }) {
  const { role, demoMode } = useAuth();
  const [viewer, setViewer] = useState(false);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(document.titulo);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const replacement = useRef<HTMLInputElement>(null);
  const date = new Intl.DateTimeFormat("es-HN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(document.fecha_subida));

  async function saveTitle() {
    if (!title.trim()) return setError("El título no puede quedar vacío");
    setBusy(true); setError("");
    if (demoMode) { onUpdated({ ...document, titulo: title.trim() }); setEditing(false); setBusy(false); return; }
    const response = await fetch(`/api/documentos/${document.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: title.trim() }) });
    const json = await response.json().catch(() => ({}));
    if (response.ok) { onUpdated(json.documento); setEditing(false); } else setError(json.error ?? "No se pudo editar");
    setBusy(false);
  }

  async function replace(file: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf") || file.size > 4 * 1024 * 1024) return setError("El reemplazo debe ser un PDF de hasta 4 MB");
    setBusy(true); setError("");
    if (demoMode) { const url = URL.createObjectURL(file); onUpdated({ ...document, archivo_url: file.name, signed_url: url, download_url: url, fecha_subida: new Date().toISOString(), estado: "Pendiente" }); setBusy(false); return; }
    const form = new FormData(); form.set("archivo", file); form.set("titulo", document.titulo);
    const response = await fetch(`/api/documentos/${document.id}`, { method: "PUT", body: form });
    const json = await response.json().catch(() => ({}));
    if (response.ok) onUpdated(json.documento); else setError(json.error ?? "No se pudo reemplazar");
    setBusy(false);
  }

  async function remove() {
    if (!window.confirm(`¿Eliminar “${document.titulo}”? Esta acción no se puede deshacer.`)) return;
    setBusy(true); setError("");
    if (demoMode) { onDeleted(document.id); return; }
    const response = await fetch(`/api/documentos/${document.id}`, { method: "DELETE" });
    const json = await response.json().catch(() => ({}));
    if (response.ok) onDeleted(document.id); else { setError(json.error ?? "No se pudo eliminar"); setBusy(false); }
  }

  return (
    <article className="paper-card overflow-hidden rounded-2xl transition hover:border-[#cfc7b7]">
      <div className="p-4 sm:p-5">
        <div className="flex gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#f2e6d1] text-[#a66d28]"><FileText size={21} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              {editing ? <div className="flex w-full gap-2"><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} className="h-11 min-w-0 flex-1 rounded-lg border border-[#cfc9bc] bg-white px-3 text-sm font-semibold" /><button onClick={saveTitle} disabled={busy} className="grid size-11 place-items-center rounded-lg bg-[#245b51] text-white" aria-label="Guardar título"><Save size={16} /></button><button onClick={() => { setEditing(false); setTitle(document.titulo); }} className="grid size-11 place-items-center rounded-lg bg-[#efede6] text-[#687873]" aria-label="Cancelar edición"><X size={16} /></button></div> : <h3 className="min-w-0 flex-1 text-[15px] font-bold leading-6 text-[#284640]">{document.titulo}</h3>}
              {!editing && <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusStyles[document.estado]}`}>{document.estado}</span>}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#7c8985]"><span className="flex items-center gap-1.5"><CalendarDays size={13} />{date}</span>{document.parcial && <span className="rounded-md bg-[#ece9e1] px-2 py-1 font-bold text-[#596d67]">{document.parcial} Parcial</span>}</div>
          </div>
        </div>

        {document.comentario_supervisor && role === "docente" && <div className="mt-4 flex gap-3 rounded-xl border border-[#dbe2df] bg-[#f1f5f2] p-3 text-xs leading-5 text-[#526a63]"><MessageSquareQuote size={17} className="mt-0.5 shrink-0 text-[#4f8e7d]" /><span><strong className="block text-[10px] uppercase tracking-wide text-[#2f6056]">Comentario del supervisor</strong>{document.comentario_supervisor}</span></div>}
        {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">{error}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#e7e3d9] pt-4">
          <button onClick={() => setViewer(true)} className="flex items-center gap-2 rounded-lg bg-[#123b35] px-3.5 py-2.5 text-xs font-bold text-white"><Eye size={15} />Ver PDF</button>
          {document.download_url ? <a href={document.download_url} className="flex items-center gap-2 rounded-lg border border-[#d8d5ca] bg-white px-3.5 py-2.5 text-xs font-bold text-[#48615b]"><Download size={15} />Descargar</a> : <button onClick={() => setViewer(true)} className="flex items-center gap-2 rounded-lg border border-[#d8d5ca] bg-white px-3.5 py-2.5 text-xs font-bold text-[#48615b]"><Download size={15} />Descargar</button>}
          {role === "docente" && <div className="ml-auto flex items-center gap-1.5"><button onClick={() => setEditing(true)} disabled={busy} title="Editar título" className="grid size-11 place-items-center rounded-lg text-[#657873] hover:bg-[#ecefe9]"><Pencil size={15} /></button><input ref={replacement} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => void replace(e.target.files?.[0] ?? null)} /><button onClick={() => replacement.current?.click()} disabled={busy} title="Reemplazar PDF" className="grid size-11 place-items-center rounded-lg text-[#657873] hover:bg-[#ecefe9]">{busy ? <RefreshCw size={15} className="animate-spin" /> : <FilePenLine size={15} />}</button><button onClick={remove} disabled={busy} title="Eliminar documento" className="grid size-11 place-items-center rounded-lg text-[#aa5c52] hover:bg-red-50"><Trash2 size={15} /></button></div>}
        </div>
        {role === "supervisor" && <StatusEditor document={document} onUpdated={onUpdated} />}
      </div>
      <PdfViewer open={viewer} onClose={() => setViewer(false)} title={document.titulo} url={document.signed_url} downloadUrl={document.download_url} />
    </article>
  );
}
