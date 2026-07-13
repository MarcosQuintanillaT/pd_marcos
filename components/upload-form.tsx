"use client";

import { useRef, useState } from "react";
import { FileUp, UploadCloud, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { sectionLabel, subsectionLabel } from "@/lib/portfolio";
import type { Documento, Parcial, Seccion, Subseccion } from "@/lib/types";

export function UploadForm({ section, subsection, parcial, onCreated }: { section: Seccion; subsection: Subseccion; parcial: Parcial | null; onCreated: (document: Documento) => void }) {
  const { demoMode, perfil } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  function pick(next: File | null) {
    setError("");
    if (!next) return setFile(null);
    if (!next.name.toLowerCase().endsWith(".pdf") || (next.type && next.type !== "application/pdf")) return setError("Selecciona un archivo PDF válido");
    if (next.size > 4 * 1024 * 1024) return setError("El PDF no puede superar 4 MB en Vercel Hobby");
    setFile(next); if (!title) setTitle(next.name.replace(/\.pdf$/i, ""));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!file) return setError("Selecciona el PDF");
    if (!title.trim()) return setError("Escribe el título visible");
    if (subsection.supportsParcial && !parcial) return setError("Selecciona el parcial antes de subir");
    setUploading(true);
    if (demoMode) {
      onCreated({ id: `demo-${Date.now()}`, seccion: sectionLabel(section), subseccion: subsectionLabel(subsection), parcial: subsection.fixedParcial ?? parcial, titulo: title.trim(), archivo_url: file.name, signed_url: URL.createObjectURL(file), download_url: URL.createObjectURL(file), estado: "Pendiente", subido_por: perfil?.id ?? "demo", fecha_subida: new Date().toISOString(), comentario_supervisor: null });
      setUploading(false); setOpen(false); setTitle(""); setFile(null); return;
    }
    const form = new FormData(); form.set("archivo", file); form.set("titulo", title.trim()); form.set("subseccion", subsection.code); if (subsection.fixedParcial ?? parcial) form.set("parcial", (subsection.fixedParcial ?? parcial)!);
    const response = await fetch("/api/documentos", { method: "POST", body: form });
    const json = await response.json().catch(() => ({}));
    if (response.ok) { onCreated(json.documento); setOpen(false); setTitle(""); setFile(null); } else setError(json.error ?? "No se pudo subir el PDF");
    setUploading(false);
  }

  return <>
    <button onClick={() => setOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#123b35] px-4 py-3 text-xs font-bold text-white shadow-lg shadow-[#123b35]/12 hover:bg-[#1b5148]"><FileUp size={16} />Subir nuevo PDF</button>
    {open && <div className="fixed inset-0 z-[65] grid overflow-y-auto bg-[#0b2824]/65 p-4 backdrop-blur-sm"><form onSubmit={submit} className="animate-enter my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg justify-self-center overflow-y-auto rounded-3xl bg-[#fffdf8] p-6 shadow-2xl sm:p-7" role="dialog" aria-modal="true" aria-label="Subir PDF">
      <div className="flex items-start justify-between gap-4"><div><p className="eyebrow mb-2">Nuevo documento</p><h2 className="text-xl font-bold text-[#24413c]">Subir a {subsection.code}.</h2><p className="mt-1 text-xs leading-5 text-[#71807b]">{subsection.title}</p></div><button type="button" onClick={() => setOpen(false)} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#efede5] text-[#62736e]" aria-label="Cerrar"><X size={18} /></button></div>
      <label className="mt-6 block text-xs font-bold text-[#34544e]">Título visible<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder={`Ej. ${subsection.title}`} className="mt-2 h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 font-normal" /></label>
      <div className="mt-5"><input ref={input} type="file" accept="application/pdf,.pdf" className="sr-only" onChange={(e) => pick(e.target.files?.[0] ?? null)} /><button type="button" onClick={() => input.current?.click()} className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-[#d7d3c7] bg-[#f6f3eb] px-5 py-7 text-center hover:border-[#c98b3c]"><UploadCloud size={30} className="text-[#c98b3c]" /><strong className="mt-3 text-sm text-[#34544e]">{file ? file.name : "Seleccionar archivo PDF"}</strong><span className="mt-1 text-[11px] text-[#84908c]">Solo PDF · máximo 4 MB</span></button></div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-4 py-2.5 text-xs font-bold text-[#62736e]">Cancelar</button><button disabled={uploading} className="flex min-h-11 items-center gap-2 rounded-xl bg-[#123b35] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-60"><UploadCloud size={15} />{uploading ? "Subiendo…" : "Subir PDF"}</button></div>
    </form></div>}
  </>;
}
