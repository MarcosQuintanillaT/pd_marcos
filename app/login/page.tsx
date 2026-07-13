"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, CircleAlert, Eye, EyeOff, FileCheck2, GraduationCap, LoaderCircle, LockKeyhole, Mail, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { safePortfolioRedirect } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/client";

const SUPABASE_CONFIG_ERROR = "Configura Supabase antes de ingresar";

function LoginContent() {
  const router = useRouter();
  const search = useSearchParams();
  const { configured, demoMode, loading, role, login, demoLogin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
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
  const normalizedEmail = email.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const emailError = emailTouched && !emailValid
    ? normalizedEmail
      ? "Escribe un correo electrónico válido."
      : "Escribe tu correo electrónico."
    : "";

  const destination = safePortfolioRedirect(search.get("next"));
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
    setEmailTouched(true);
    setRecoveryOpen(false);
    setRecoveryError("");
    setSubmitting(true); setError(""); setNotice("");
    const message = await login(normalizedEmail, password);
    setSubmitting(false);
    if (message) setError(message); else router.replace(destination);
  }

  async function requestPasswordReset() {
    setEmailTouched(true);
    setRecoveryError("");
    setError("");
    setNotice("");
    if (!emailValid) return;

    const supabase = createClient();
    if (!supabase) {
      setRecoveryError(
        isDevelopment
          ? "Supabase no está configurado."
          : "Servicio temporalmente no disponible.",
      );
      return;
    }

    setResetting(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        { redirectTo: `${window.location.origin}/reset-password` },
      );
      if (resetError) {
        setRecoveryError(
          resetError.message.toLowerCase().includes("rate limit")
            ? "Espera unos minutos antes de solicitar otro enlace."
            : "No se pudo enviar el enlace de recuperación.",
        );
        return;
      }

      setNotice(
        "Si el correo está registrado, recibirás un enlace para crear una nueva contraseña.",
      );
      setRecoveryOpen(false);
    } catch {
      setRecoveryError("No se pudo enviar el enlace de recuperación.");
    } finally {
      setResetting(false);
    }
  }

  function toggleRecoveryPanel() {
    const nextOpen = !recoveryOpen;
    setRecoveryOpen(nextOpen);
    setRecoveryError("");
    setError("");
    setNotice("");
    if (nextOpen) setEmailTouched(true);
  }

  function enterDemo(nextRole: "docente" | "supervisor") {
    demoLogin(nextRole);
    router.replace(destination);
  }

  return (
    <main className="min-h-dvh w-full overflow-x-hidden bg-[#f4f1e8] px-3 py-3 sm:px-6 sm:py-6 md:px-8 md:py-8 xl:grid xl:grid-cols-[1.02fr_.98fr] xl:p-0">
      <section className="relative hidden overflow-hidden bg-[#123b35] p-12 text-white xl:flex xl:min-h-dvh xl:flex-col xl:p-16">
        <div className="login-ambient absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
        <div className="login-ambient login-ambient-offset absolute -right-5 top-20 size-64 rounded-full border border-[#c98b3c]/25" />
        <div className="login-stagger login-stagger-1 relative flex items-center gap-3">
          <span className="grid size-11 place-items-center overflow-hidden rounded-2xl bg-white/95 p-1 shadow-sm">
            <Image src="/logo/logotipo_portafolio_digital_v2.png" alt="Logotipo del portafolio docente" width={44} height={44} className="size-full object-contain" priority />
          </span>
          <div><p className="text-sm font-bold tracking-wide">PORTAFOLIO</p><p className="text-xs text-white/55">Docente Digital</p></div>
        </div>
        <div className="relative mt-8 max-w-xl">
          <p className="login-stagger login-stagger-2 eyebrow mb-4">BTP · Informática · Honduras</p>
          <h1 className="login-stagger login-stagger-3 text-[30px] font-semibold leading-[1.15] tracking-[-.035em] xl:text-[32px]">Tu práctica docente, organizada y lista para ser valorada.</h1>
          <p className="login-stagger login-stagger-4 mt-5 max-w-[85%] text-base leading-7 text-white/67">Este portafolio contiene toda la información profesional, documentación, planificaciones y evaluaciones del año académico 2026.</p>
        </div>
        <div className="relative mt-8">
          <div aria-hidden="true" className="login-stagger login-stagger-5 border-t border-white/10" />
          <div className="login-stagger login-stagger-6 grid grid-cols-3 gap-4 pt-6 text-sm text-white/65">
            <span className="login-feature flex items-center gap-2"><ShieldCheck size={17} className="login-feature-icon" /> Acceso seguro</span>
            <span className="login-feature flex items-center gap-2"><FileCheck2 size={17} className="login-feature-icon" /> Archivos organizados</span>
            <span className="login-feature flex items-center gap-2"><CheckCircle2 size={17} className="login-feature-icon" /> Revisión simple</span>
          </div>
        </div>
      </section>

      <section className="flex min-h-[calc(100dvh-1.5rem)] w-full min-w-0 items-start justify-center sm:min-h-[calc(100dvh-3rem)] md:min-h-[calc(100dvh-4rem)] xl:min-h-dvh xl:items-center">
        <div className="w-full min-w-0 max-w-[560px] rounded-[1.5rem] border border-[#dedbd0] bg-[#fffdf8] p-5 shadow-[0_20px_70px_rgba(31,52,46,.12)] sm:rounded-[2rem] sm:p-8 md:p-10 xl:max-w-[510px] xl:border-0 xl:bg-transparent xl:shadow-none">
          <div className="mb-7 flex items-center gap-3 sm:mb-9 xl:hidden">
            <span className="grid size-11 place-items-center overflow-hidden rounded-2xl bg-white p-1 shadow-sm">
              <Image src="/logo/logotipo_portafolio_digital_v2.png" alt="Logotipo del portafolio docente" width={44} height={44} className="size-full object-contain" priority />
            </span>
            <div><p className="text-sm font-extrabold tracking-wide text-[#123b35]">PORTAFOLIO</p><p className="text-xs text-[#667773]">Docente Digital</p></div>
          </div>
          <div className="mb-5 flex justify-center">
            <Image src="/logo/logoPFF.png" alt="Logo institucional PFF" width={699} height={908} className="h-16 w-auto object-contain drop-shadow-sm sm:h-20" priority />
          </div>
          <p className="login-welcome-badge mx-auto mb-3"><Sparkles size={18} strokeWidth={1.9} aria-hidden="true" />Bienvenido</p>
          <h2 className="text-center text-[24px] font-semibold leading-[1.2] tracking-[-.03em] text-[#173732] sm:text-[30px] md:text-[32px]">Ingresa a tu portafolio</h2>
          <p className="mx-auto mt-3 max-w-md text-center text-sm leading-6 text-[#687873]">{demoMode ? "Vista de demostración habilitada por variable de entorno." : configured ? "Usa la cuenta asignada por la institución." : isDevelopment ? "Falta completar la configuración local de Supabase." : "El servicio no está disponible temporalmente."}</p>

          {!demoMode ? (
            <form onSubmit={submit} className="mt-6 min-w-0 space-y-4 sm:mt-8 sm:space-y-5" aria-busy={submitting || resetting}>
              <label className="block text-sm font-bold text-[#284842]">Correo electrónico
                <span className="relative mt-2 block">
                  <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setEmailTouched(true)} disabled={submitting || resetting} aria-invalid={Boolean(emailError)} aria-describedby={emailError ? "login-email-error" : undefined} placeholder="nombre@institucion.edu.hn" className="login-input h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 pr-11 text-base font-normal text-[#173732] shadow-sm placeholder:text-[#9aa6a2] disabled:cursor-not-allowed disabled:bg-[#f4f1e8] sm:h-13" />
                  {emailTouched && normalizedEmail && <span aria-hidden="true" className={`absolute right-3 top-1/2 -translate-y-1/2 ${emailValid ? "text-[#4f8e7d]" : "text-red-500"}`}>{emailValid ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}</span>}
                </span>
                {emailError && <span id="login-email-error" role="alert" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600"><CircleAlert size={14} />{emailError}</span>}
              </label>
              <label className="block text-sm font-bold text-[#284842]">Contraseña
                <span className="relative mt-2 block">
                  <input type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))} onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))} onBlur={() => setCapsLock(false)} disabled={submitting || resetting} aria-describedby={capsLock ? "login-caps-lock" : undefined} placeholder="••••••••" className="login-input h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 pr-12 text-base font-normal text-[#173732] shadow-sm disabled:cursor-not-allowed disabled:bg-[#f4f1e8] sm:h-13" />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} disabled={submitting || resetting} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={showPassword} title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#687873] hover:bg-[#f1eee5] disabled:cursor-not-allowed disabled:opacity-50">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </span>
                {capsLock && <span id="login-caps-lock" role="status" className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-700"><CircleAlert size={14} />Bloq Mayús está activado</span>}
              </label>
              <div className="-mt-1 flex justify-end sm:-mt-2">
                <button type="button" onClick={toggleRecoveryPanel} disabled={submitting || resetting || !configured} aria-expanded={recoveryOpen} aria-controls="password-recovery-panel" className="login-forgot-link inline-flex min-h-11 max-w-full items-center text-right text-xs font-bold text-[#356c61] underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              {recoveryOpen && <section id="password-recovery-panel" aria-label="Recuperar contraseña" className="rounded-xl border border-[#d8d5ca] bg-[#f6f3eb] p-4">
                <div className="flex gap-3"><Mail size={18} className="mt-0.5 shrink-0 text-[#c98b3c]" /><div><strong className="text-sm text-[#284842]">Recuperar contraseña</strong><p className="mt-1 text-xs leading-5 text-[#687873]">{emailValid ? <>Enviaremos el enlace a <span className="break-all font-bold text-[#34544e]">{normalizedEmail}</span>.</> : "Escribe un correo válido en el campo superior."}</p></div></div>
                {recoveryError && <p role="alert" className="mt-3 text-xs font-semibold text-red-600">{recoveryError}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void requestPasswordReset()} disabled={!emailValid || resetting} className="flex items-center gap-2 rounded-lg bg-[#123b35] px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-90 disabled:cursor-not-allowed disabled:opacity-50">{resetting && <LoaderCircle size={15} className="motion-safe:animate-spin" />}{resetting ? "Enviando…" : "Enviar enlace"}</button>
                  <button type="button" onClick={() => { setRecoveryOpen(false); setRecoveryError(""); }} disabled={resetting} className="rounded-lg border border-[#d1cdc1] bg-white px-3.5 py-2 text-xs font-bold text-[#526762] transition hover:bg-[#eeeae0] disabled:cursor-not-allowed disabled:opacity-50">Cancelar</button>
                </div>
              </section>}
              {!configured && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{isDevelopment ? <><span>Configura </span><code>NEXT_PUBLIC_SUPABASE_URL</code><span> y </span><code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code><span> en </span><code>.env.local</code><span>.</span></> : "Servicio temporalmente no disponible."}</p>}
              {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
              {notice && <p role="status" className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Mail size={17} className="mt-0.5 shrink-0" />{notice}</p>}
              <button disabled={submitting || resetting || !configured} className="login-submit flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 font-bold text-white shadow-lg shadow-[#123b35]/15 disabled:cursor-not-allowed disabled:opacity-50 sm:h-13">{submitting ? <><LoaderCircle size={17} className="motion-safe:animate-spin" />Verificando…</> : <><LockKeyhole size={17} />Iniciar sesión<ArrowRight size={17} /></>}</button>
            </form>
          ) : (
            <div className="mt-8 space-y-3">
              <button onClick={() => enterDemo("docente")} className="group flex w-full items-center gap-4 rounded-2xl border border-[#d8d5ca] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#c98b3c] hover:shadow-lg">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#123b35] text-[#e7b66d]"><GraduationCap size={23} /></span>
                <span className="min-w-0 flex-1"><strong className="block text-[#173732]">Entrar como docente</strong><small className="mt-1 block text-[#74817d]">Subir, reemplazar y organizar archivos</small></span><ArrowRight size={18} className="text-[#ad8a57] transition group-hover:translate-x-1" />
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
