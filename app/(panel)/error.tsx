"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Panel render error", { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="grid min-h-[calc(100vh-72px)] place-items-center p-6">
      <section className="paper-card w-full max-w-lg rounded-3xl p-7 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-[#a64f46]"><AlertTriangle size={25} /></span>
        <h1 className="mt-5 text-xl font-bold text-[#24413c]">No pudimos mostrar esta página</h1>
        <p className="mt-2 text-sm leading-6 text-[#5f716c]">El incidente quedó registrado. Puedes volver a intentar sin cerrar tu sesión.</p>
        {error.digest && <p className="mt-3 text-xs text-[#667773]">Referencia: {error.digest}</p>}
        <button type="button" onClick={reset} className="mx-auto mt-6 flex min-h-11 items-center gap-2 rounded-xl bg-[#123b35] px-5 text-xs font-bold text-white"><RefreshCw size={15} />Intentar nuevamente</button>
      </section>
    </div>
  );
}
