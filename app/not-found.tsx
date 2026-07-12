import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center p-6"><div className="paper-card max-w-md rounded-3xl p-9 text-center"><FileQuestion className="mx-auto mb-4 text-[#c98b3c]" size={42} /><h1 className="text-2xl font-bold">Esta sección no existe</h1><p className="mt-3 text-sm leading-6 text-[#687873]">Regresa al resumen y elige una opción del índice oficial.</p><Link href="/portafolio" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#123b35] px-5 py-3 text-sm font-bold text-white"><ArrowLeft size={16} />Volver al portafolio</Link></div></main>;
}

