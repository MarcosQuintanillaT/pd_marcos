"use client";

import { Download, FileText, Maximize2, X } from "lucide-react";

export function PdfViewer({ open, onClose, title, url, downloadUrl }: { open: boolean; onClose: () => void; title: string; url?: string | null; downloadUrl?: string | null }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0b211e]/92 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label={`Visor de ${title}`}>
      <header className="mx-auto flex w-full max-w-7xl items-center gap-3 rounded-t-2xl bg-[#fffdf8] px-4 py-3 sm:px-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#efe2cb] text-[#a36c29]"><FileText size={18} /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-[#24413c]">{title}</p><p className="text-[10px] uppercase tracking-wider text-[#81908b]">Visor PDF protegido</p></div>
        {downloadUrl && <a href={downloadUrl} aria-label="Descargar PDF" className="flex size-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#dedbd0] text-xs font-bold text-[#34544e] hover:bg-[#f1eee5] sm:w-auto sm:px-3"><Download size={16} /><span className="hidden sm:inline">Descargar</span></a>}
        <button onClick={onClose} className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#123b35] text-white" aria-label="Cerrar visor"><X size={19} /></button>
      </header>
      <div className="mx-auto min-h-0 w-full max-w-7xl flex-1 overflow-hidden rounded-b-2xl bg-[#e5e3dd]">
        {url ? <iframe src={`${url}#toolbar=1&navpanes=0&view=FitH`} title={title} className="h-full min-h-[70dvh] w-full border-0" /> : <div className="grid h-full min-h-[70dvh] place-items-center p-6 text-center"><div><Maximize2 className="mx-auto mb-4 text-[#9a7a49]" size={38} /><h3 className="font-bold text-[#294740]">Vista previa no disponible</h3><p className="mt-2 max-w-sm text-sm leading-6 text-[#6f7e79]">No fue posible generar la URL firmada. Vuelve a cargar la sección o revisa las políticas del bucket privado.</p></div></div>}
      </div>
    </div>
  );
}
