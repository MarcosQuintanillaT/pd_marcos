"use client";

import { useId, useRef, useState } from "react";
import { Archive, CalendarPlus, RotateCcw, Save, Settings2, X } from "lucide-react";
import { AccessibleDialog } from "@/components/accessible-dialog";
import { usePortfolio } from "@/components/portfolio-provider";
import type { Rol } from "@/lib/types";

export function PortfolioSettings({ role }: { role: Rol }) {
  const { portfolios, selected, selectedId, select, create, update } = usePortfolio();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"edit" | "new">("edit");
  const [year, setYear] = useState(new Date().getFullYear());
  const [area, setArea] = useState("");
  const [shift, setShift] = useState("");
  const [institution, setInstitution] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const firstInput = useRef<HTMLInputElement>(null);

  function openForm(nextMode: "edit" | "new") {
    setMode(nextMode);
    setError("");
    setYear(nextMode === "new" ? (selected?.anio_lectivo ?? new Date().getFullYear()) + 1 : selected?.anio_lectivo ?? new Date().getFullYear());
    setArea(selected?.area ?? "Informática");
    setShift(selected?.jornada ?? "Matutina");
    setInstitution(selected?.institucion ?? "");
    setOpen(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!area.trim() || !shift.trim()) return setError("Completa el área y la jornada");
    setSaving(true);
    setError("");
    const message = mode === "new"
      ? await create({ anio_lectivo: year, area: area.trim(), jornada: shift.trim(), institucion: institution.trim() || null })
      : selected
        ? await update(selected.id, { area: area.trim(), jornada: shift.trim(), institucion: institution.trim() || null })
        : "No hay un portafolio seleccionado";
    setSaving(false);
    if (message) setError(message);
    else setOpen(false);
  }

  async function archiveCurrent() {
    if (!selected) return;
    setSaving(true);
    const message = await update(selected.id, { estado: "Archivado" });
    setSaving(false);
    if (message) setError(message);
    else setOpen(false);
  }

  async function reactivateCurrent() {
    if (!selected) return;
    setSaving(true);
    setError("");
    const message = await update(selected.id, { estado: "Activo" });
    setSaving(false);
    if (message) setError(message);
    else setOpen(false);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor="portfolio-year">Año lectivo</label>
      <select id="portfolio-year" value={selectedId} onChange={(event) => select(event.target.value)} className="h-11 rounded-xl border border-white/15 bg-white/10 px-3 text-base font-bold text-white outline-none sm:text-sm">
        {portfolios.map((item) => <option key={item.id} value={item.id} className="text-[#173732]">{item.anio_lectivo}{item.estado === "Archivado" ? " · Archivado" : ""}</option>)}
      </select>
      {role === "docente" && (
        <>
          <button type="button" onClick={() => openForm("edit")} disabled={!selected} className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15" aria-label="Editar datos del portafolio"><Settings2 size={17} /></button>
          <button type="button" onClick={() => openForm("new")} className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15" aria-label="Crear nuevo año lectivo"><CalendarPlus size={17} /></button>
        </>
      )}

      <AccessibleDialog open={open} onClose={() => !saving && setOpen(false)} labelledBy={titleId} initialFocusRef={firstInput} closeOnBackdrop={!saving} panelClassName="grid h-full overflow-y-auto p-4">
        <form onSubmit={save} className="my-auto w-full max-w-lg justify-self-center rounded-3xl bg-[#fffdf8] p-6 shadow-2xl sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div><p className="eyebrow mb-2">Configuración académica</p><h2 id={titleId} className="text-xl font-bold text-[#24413c]">{mode === "new" ? "Nuevo año lectivo" : `Editar portafolio ${selected?.anio_lectivo ?? ""}`}</h2></div>
            <button type="button" onClick={() => setOpen(false)} disabled={saving} className="grid size-11 place-items-center rounded-xl bg-[#efede5] text-[#536a64]" aria-label="Cerrar configuración"><X size={18} /></button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-bold text-[#34544e]">Año lectivo<input ref={firstInput} type="number" min={2000} max={2100} value={year} onChange={(event) => setYear(Number(event.target.value))} disabled={mode === "edit"} className="mt-2 h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 text-base disabled:bg-[#efede5] sm:text-sm" /></label>
            <label className="text-xs font-bold text-[#34544e]">Jornada<input value={shift} onChange={(event) => setShift(event.target.value)} maxLength={80} className="mt-2 h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 text-base sm:text-sm" /></label>
            <label className="text-xs font-bold text-[#34544e] sm:col-span-2">Área<input value={area} onChange={(event) => setArea(event.target.value)} maxLength={120} className="mt-2 h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 text-base sm:text-sm" /></label>
            <label className="text-xs font-bold text-[#34544e] sm:col-span-2">Institución<input value={institution} onChange={(event) => setInstitution(event.target.value)} maxLength={180} placeholder="Nombre de la institución" className="mt-2 h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 text-base sm:text-sm" /></label>
          </div>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p>}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {mode === "edit" && selected?.estado === "Activo" ? (
              <button type="button" onClick={() => void archiveCurrent()} disabled={saving} className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-[#9a5048] hover:bg-red-50"><Archive size={15} />Archivar año</button>
            ) : mode === "edit" && selected?.estado === "Archivado" ? (
              <button type="button" onClick={() => void reactivateCurrent()} disabled={saving} className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs font-bold text-[#2f7568] hover:bg-[#e8f2ee]"><RotateCcw size={15} />Reactivar año</button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={() => setOpen(false)} disabled={saving} className="min-h-11 rounded-xl px-4 text-xs font-bold text-[#536a64]">Cancelar</button><button disabled={saving} className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 text-xs font-bold text-white"><Save size={15} />{saving ? "Guardando…" : "Guardar"}</button></div>
          </div>
        </form>
      </AccessibleDialog>
    </div>
  );
}
