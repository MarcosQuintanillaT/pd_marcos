import Image from "next/image";

export function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f1e8]">
      <div className="text-center" role="status">
        <div className="mx-auto mb-4 grid size-16 animate-pulse place-items-center overflow-hidden rounded-2xl border border-[#d8d5ca] bg-white p-1.5 shadow-[0_12px_28px_rgba(18,59,53,.16)]"><Image src="/logo/logotipo_portafolio_digital_v2.png" alt="Logotipo del portafolio docente" width={64} height={64} className="size-full object-contain" priority /></div>
        <p className="text-sm font-semibold text-[#526762]">Preparando el portafolio…</p>
      </div>
    </div>
  );
}

