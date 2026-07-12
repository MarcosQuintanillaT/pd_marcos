"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, BookOpen, CheckCircle2, Eye, EyeOff, FileCheck2, GraduationCap, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { createClient } from "@/lib/supabase/client";

const SUPABASE_CONFIG_ERROR = "Configura Supabase antes de ingresar";

function LoginContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { configured, demoMode, loading, role, login, demoLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);
  const requestedError = search.get("error") ?? "";
  const [error, setError] = useState(
    configured && requestedError === SUPABASE_CONFIG_ERROR ? "" : requestedError,
  );
  const [notice, setNotice] = useState(
    search.get("password") === "updated"
      ? "Contraseña actualizada. Ya puedes iniciar sesión."
      : "",
  );
  const isDevelopment = process.env.NODE_ENV !== "production";

  const destination = search.get("next") || "/portafolio";
  useEffect(() => { if (!loading && role) router.replace(destination); }, [loading, role, router, destination]);
  useEffect(() => {
    if (!configured || requestedError !== SUPABASE_CONFIG_ERROR) return;

    const cleanSearch = new URLSearchParams(search.toString());
    cleanSearch.delete("error");
    const query = cleanSearch.toString();
    router.replace(query ? `/login?${query}` : "/login");
  }, [configured, requestedError, router, search]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true); setError(""); setNotice("");
    const message = await login(email, password);
    setSubmitting(false);
    if (message) setError(message); else router.replace(destination);
  }

  async function requestPasswordReset() {
    const normalizedEmail = email.trim().toLowerCase();
    setError("");
    setNotice("");
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setError("Escribe primero tu correo electrónico.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setError(
        isDevelopment
          ? "Supabase no está configurado."
          : "Servicio temporalmente no disponible.",
      );
      return;
    }

    setResetting(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo: `${window.location.origin}/reset-password` },
    );
    setResetting(false);
    if (resetError) {
      setError(
        resetError.message.toLowerCase().includes("rate limit")
          ? "Espera unos minutos antes de solicitar otro enlace."
          : "No se pudo enviar el enlace de recuperación.",
      );
      return;
    }

    setNotice(
      "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.",
    );
  }

  function enterDemo(nextRole: "docente" | "supervisor") {
    demoLogin(nextRole);
    router.replace(destination);
  }

  return (
    <main className="fine-grid min-h-screen px-4 py-5 sm:px-7 lg:grid lg:grid-cols-[1.02fr_.98fr] lg:p-0">
      <section className="relative hidden overflow-hidden bg-[#123b35] p-12 text-white lg:flex lg:min-h-screen lg:flex-col lg:justify-between xl:p-16">
        <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
        <div className="absolute -right-5 top-20 size-64 rounded-full border border-[#c98b3c]/25" />
        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#c98b3c] text-white"><BookOpen size={22} /></span>
          <div><p className="text-sm font-bold tracking-wide">PORTAFOLIO</p><p className="text-xs text-white/55">Docente Digital</p></div>
        </div>
        <div className="relative max-w-xl">
          <p className="eyebrow mb-5">BTP · Informática · Honduras</p>
          <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-.035em] xl:text-6xl">Tu práctica docente, organizada y lista para ser valorada.</h1>
          <p className="mt-7 max-w-lg text-lg leading-8 text-white/67">Un espacio claro y seguro para presentar cada evidencia del proceso educativo.</p>
        </div>
        <div className="relative grid grid-cols-3 gap-4 border-t border-white/10 pt-7 text-sm text-white/65">
          <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#ddb06d]" /> Acceso seguro</span>
          <span className="flex items-center gap-2"><FileCheck2 size={17} className="text-[#ddb06d]" /> PDF organizados</span>
          <span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#ddb06d]" /> Revisión simple</span>
        </div>
      </section>

      <section className="flex min-h-[calc(100vh-2.5rem)] items-center justify-center lg:min-h-screen">
        <div className="w-full max-w-[510px] animate-enter rounded-[2rem] border border-[#dedbd0] bg-[#fffdf8] p-6 shadow-[0_25px_90px_rgba(31,52,46,.12)] sm:p-10 lg:border-0 lg:bg-transparent lg:shadow-none">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <span className="grid size-11 place-items-center rounded-2xl bg-[#123b35] text-[#e6b76f]"><BookOpen size={22} /></span>
            <div><p className="text-sm font-extrabold tracking-wide text-[#123b35]">PORTAFOLIO</p><p className="text-xs text-[#667773]">Docente Digital</p></div>
          </div>
          <p className="eyebrow mb-3">Bienvenido</p>
          <h2 className="text-3xl font-semibold tracking-[-.03em] text-[#173732] sm:text-4xl">Ingresa a tu portafolio</h2>
          <p className="mt-3 text-sm leading-6 text-[#687873]">{demoMode ? "Vista de demostración habilitada por variable de entorno." : configured ? "Usa la cuenta asignada por la institución." : isDevelopment ? "Falta completar la configuración local de Supabase." : "El servicio no está disponible temporalmente."}</p>

          {!demoMode ? (
            <form onSubmit={submit} className="mt-8 space-y-5">
              <label className="block text-sm font-bold text-[#284842]">Correo electrónico
                <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nombre@institucion.edu.hn" className="mt-2 h-13 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 font-normal text-[#173732] shadow-sm placeholder:text-[#9aa6a2]" />
              </label>
              <label className="block text-sm font-bold text-[#284842]">Contraseña
                <span className="relative mt-2 block">
                  <input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-13 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 pr-12 font-normal text-[#173732] shadow-sm" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#687873] hover:bg-[#f1eee5]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </span>
              </label>
              <div className="-mt-2 flex justify-end">
                <button type="button" onClick={() => void requestPasswordReset()} disabled={resetting || !configured} className="text-xs font-bold text-[#356c61] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-50">
                  {resetting ? "Enviando enlace…" : "¿Olvidaste tu contraseña?"}
                </button>
              </div>
              {!configured && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{isDevelopment ? <><span>Configura </span><code>NEXT_PUBLIC_SUPABASE_URL</code><span> y </span><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code><span> en </span><code>.env.local</code><span>.</span></> : "Servicio temporalmente no disponible."}</p>}
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {notice && <p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Mail size={17} className="mt-0.5 shrink-0" />{notice}</p>}
              <button disabled={submitting || !configured} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 font-bold text-white shadow-lg shadow-[#123b35]/15 transition hover:bg-[#1c5148] disabled:cursor-not-allowed disabled:opacity-50"><LockKeyhole size={17} />{submitting ? "Verificando…" : "Iniciar sesión"}<ArrowRight size={17} /></button>
            </form>
          ) : (
            <div className="mt-8 space-y-3">
              <button onClick={() => enterDemo("docente")} className="group flex w-full items-center gap-4 rounded-2xl border border-[#d8d5ca] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#c98b3c] hover:shadow-lg">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#123b35] text-[#e7b66d]"><GraduationCap size={23} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-[#173732]">Entrar como docente</strong><small className="mt-1 block text-[#74817d]">Subir, reemplazar y organizar PDF</small></span><ArrowRight size={18} className="text-[#ad8a57] transition group-hover:translate-x-1" />
              </button>
              <button onClick={() => enterDemo("supervisor")} className="group flex w-full items-center gap-4 rounded-2xl border border-[#d8d5ca] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#4f8e7d] hover:shadow-lg">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#dfece7] text-[#1d5d51]"><ShieldCheck size={23} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-[#173732]">Entrar como supervisor</strong><small className="mt-1 block text-[#74817d]">Revisar, comentar y aprobar</small></span><ArrowRight size={18} className="text-[#4f8e7d] transition group-hover:translate-x-1" />
              </button>
              <div className="mt-5 flex gap-3 rounded-xl bg-[#f1eee5] p-3 text-xs leading-5 text-[#667773]"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#4f8e7d]" /><span>Modo demostración activo mediante <code>NEXT_PUBLIC_DEMO_MODE=true</code>. Los cambios no persisten.</span></div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-[#f4f1e8] text-sm font-semibold text-[#526762]">Preparando el acceso…</main>}>
      <LoginContent />
    </Suspense>
  );
}
