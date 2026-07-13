"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  Building2,
  CalendarCheck,
  ChevronDown,
  ClipboardList,

  IdCard,
  LayoutGrid,
  LogOut,
  Menu,
  PanelLeftClose,
  Paperclip,
  ShieldCheck,
  User,
  UserRound,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageLoader } from "@/components/page-loader";
import { PORTFOLIO_SECTIONS, sectionHref } from "@/lib/portfolio";

const SECTION_ICONS = {
  "1": IdCard,
  "2": User,
  "3": Building2,
  "4": BookOpen,
  "5": LayoutGrid,
  "6": ClipboardList,
  "7": CalendarCheck,
  "8": Paperclip,
} as const;

export function PanelShell({ children }: { children: React.ReactNode }) {
  const { loading, role, perfil, demoMode, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(false), 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  useEffect(() => { if (!loading && !role) router.replace(`/login?next=${encodeURIComponent(pathname)}`); }, [loading, role, router, pathname]);
  if (loading || !role) return <PageLoader />;

  async function signOut() { await logout(); router.replace("/login"); router.refresh(); }

  const sidebar = (
    <aside className="flex h-full w-[310px] max-w-[calc(100vw-1rem)] flex-col bg-[#123b35] text-white">
      <div className="flex h-[86px] items-center justify-between border-b border-white/10 px-5">
        <Link href="/portafolio" className="flex min-w-0 items-center gap-3 rounded-lg">
          <span className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white/95 p-1 shadow-sm">
            <Image src="/logo/logotipo_portafolio_digital_v2.png" alt="Logotipo del portafolio docente" width={44} height={44} className="size-full object-contain" priority />
          </span>
          <span className="min-w-0"><strong className="block truncate text-sm tracking-wide">PORTAFOLIO</strong><small className="block truncate text-xs text-white/52">Docente Digital</small></span>
        </Link>
        <button onClick={() => setOpen(false)} className="grid size-10 place-items-center rounded-xl text-white/65 hover:bg-white/10 lg:hidden" aria-label="Cerrar menú"><X size={20} /></button>
      </div>

      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-5" aria-label="Índice oficial del portafolio">
        <Link href="/portafolio" aria-current={pathname === "/portafolio" ? "page" : undefined} className={`mb-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${pathname === "/portafolio" ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/8 hover:text-white"}`}>
          <span className="grid size-7 place-items-center rounded-lg bg-[#c98b3c]/20 text-xs font-black text-[#e8bb79]">⌂</span>Resumen general
        </Link>
        <p className="mb-3 px-3 text-[10px] font-black uppercase tracking-[.18em] text-white/35">Índice del portafolio</p>
        <div className="space-y-1.5">
          {PORTFOLIO_SECTIONS.map((section) => {
            const active = pathname.includes(`/${section.slug}`);
            const SectionIcon = SECTION_ICONS[section.code as keyof typeof SECTION_ICONS];
            if (section.code === "1") return (
              <Link key={section.code} href={sectionHref(section)} onClick={() => setOpen(false)} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/7 hover:text-white"}`}>
                <span className="grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold text-white" style={{ backgroundColor: section.color }}>{section.code}</span>
                <SectionIcon aria-hidden="true" size={17} strokeWidth={1.75} className="shrink-0 text-white/75" />
                <span className="min-w-0 flex-1 font-semibold leading-5">{section.title}</span>
              </Link>
            );
            return (
              <details key={section.code} className="group" open={active || undefined}>
                <summary className={`flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition [&::-webkit-details-marker]:hidden ${active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/7 hover:text-white"}`}>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg text-xs font-extrabold text-white" style={{ backgroundColor: section.color }}>{section.code}</span>
                  <SectionIcon aria-hidden="true" size={17} strokeWidth={1.75} className="shrink-0 text-white/75" />
                  <span className="min-w-0 flex-1 font-semibold leading-5">{section.title}</span>
                  <ChevronDown size={15} className="shrink-0 text-white/40 transition group-open:rotate-180" />
                </summary>
                <div className="ml-[26px] border-l border-white/10 py-1.5 pl-3">
                  <Link href={sectionHref(section)} className={`mb-1 block rounded-lg px-3 py-2 text-xs font-semibold transition ${pathname === sectionHref(section) ? "bg-[#c98b3c] text-white" : "text-white/45 hover:bg-white/7 hover:text-white/85"}`}>Vista de la sección</Link>
                  {section.subsections.map((subsection) => {
                    const subsectionHref = section.code === "1" ? `${sectionHref(section)}#${subsection.slug}` : sectionHref(section, subsection);
                    return <div key={subsection.code}>
                      <Link href={subsectionHref} onClick={() => setOpen(false)} className={`block rounded-lg px-3 py-2 text-xs leading-[1.15rem] transition ${section.code !== "1" && pathname === sectionHref(section, subsection) ? "bg-white/12 font-bold text-white" : "text-white/57 hover:bg-white/7 hover:text-white"}`}>
                        <span className="mr-1 font-bold text-[#d8a85f]">{subsection.code}.</span>{subsection.title}
                      </Link>
                      {subsection.children?.map((child) => (
                        <Link key={child.code} href={sectionHref(section, child)} className={`ml-2 block rounded-lg px-3 py-2 text-[11px] leading-4 transition ${pathname === sectionHref(section, child) ? "bg-white/12 font-bold text-white" : "text-white/48 hover:bg-white/7 hover:text-white"}`}>
                          <span className="mr-1 font-bold text-[#d8a85f]">{child.code}.</span>{child.title}
                        </Link>
                      ))}
                    </div>;
                  })}
                </div>
              </details>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/7 p-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#e7b66d] text-[#123b35]">{role === "docente" ? <UserRound size={18} /> : <ShieldCheck size={18} />}</span>
          <span className="min-w-0 flex-1"><strong className="block truncate text-xs">{perfil?.nombre || perfil?.email}</strong><small className="capitalize text-white/45">{role}</small></span>
          {demoMode && <span title="Modo demostración" className="status-dot size-2 rounded-full bg-[#e7b66d]" />}
        </div>
        <button onClick={signOut} className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-white/65 hover:bg-white/8 hover:text-white"><LogOut size={15} />Cerrar sesión</button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen lg:pl-[310px]">
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{sidebar}</div>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Cerrar menú" className="absolute inset-0 cursor-default bg-[#0b2824]/60 backdrop-blur-sm" onClick={() => setOpen(false)} /><div className="relative h-full animate-enter">{sidebar}</div></div>}
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[#dedbd0]/80 bg-[#f4f1e8]/88 px-4 backdrop-blur-xl sm:px-7 lg:px-10">
        <button onClick={() => setOpen(true)} className="grid size-11 place-items-center rounded-xl border border-[#d8d5ca] bg-[#fffdf8] text-[#173732] shadow-sm lg:hidden" aria-label="Abrir menú"><Menu size={21} /></button>
        <div className="hidden items-center gap-2 text-xs font-semibold text-[#6f7e79] lg:flex"><PanelLeftClose size={16} />Índice institucional · 8 secciones</div>
        <div className="flex items-center gap-3">
          {demoMode && <span className="hidden rounded-full bg-[#f1dfbf] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#845c21] sm:inline">Demostración</span>}
          <span className="rounded-full border border-[#d8d5ca] bg-[#fffdf8] px-3 py-1.5 text-xs font-bold capitalize text-[#34544e]">{role}</span>
        </div>
      </header>
      <main className="min-h-[calc(100vh-72px)]">{children}</main>
    </div>
  );
}
