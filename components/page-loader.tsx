import { BookOpen } from "lucide-react";

export function PageLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f4f1e8]">
      <div className="text-center" role="status">
        <div className="mx-auto mb-4 grid size-14 animate-pulse place-items-center rounded-2xl bg-[#123b35] text-[#f3d6a8]"><BookOpen /></div>
        <p className="text-sm font-semibold text-[#526762]">Preparando el portafolio…</p>
      </div>
    </div>
  );
}

