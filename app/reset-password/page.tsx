"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      const timer = window.setTimeout(() => {
        setError(
          process.env.NODE_ENV !== "production"
            ? "Supabase no está configurado."
            : "Servicio temporalmente no disponible.",
        );
        setReady(true);
      }, 0);
      return () => window.clearTimeout(timer);
    }

    const client = supabase;
    let active = true;
    async function prepareRecovery() {
      const { data: current } = await client.auth.getSession();
      let session = current.session;
      const code = new URLSearchParams(window.location.search).get("code");
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");

      if (!session && accessToken && refreshToken) {
        const imported = await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (imported.error) {
          if (active) {
            setError("El enlace de recuperación venció o ya fue utilizado.");
            setReady(true);
          }
          return;
        }
        session = imported.data.session;
        window.history.replaceState({}, "", "/reset-password");
      } else if (!session && code) {
        const exchanged = await client.auth.exchangeCodeForSession(code);
        if (exchanged.error) {
          if (active) {
            setError("El enlace de recuperación venció o ya fue utilizado.");
            setReady(true);
          }
          return;
        }
        session = exchanged.data.session;
        window.history.replaceState({}, "", "/reset-password");
      }

      if (active) {
        setAuthorized(Boolean(session));
        if (!session)
          setError("Abre esta página desde el enlace enviado a tu correo.");
        setReady(true);
      }
    }

    void prepareRecovery();
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setAuthorized(true);
        setError("");
        setReady(true);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    const supabase = createClient();
    if (!supabase || !isSupabaseConfigured()) {
      setError("Servicio temporalmente no disponible.");
      return;
    }

    setSaving(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setSaving(false);
      setError("No se pudo actualizar la contraseña. Solicita un enlace nuevo.");
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?password=updated");
    router.refresh();
  }

  return (
    <main className="fine-grid grid min-h-screen place-items-center px-4 py-8 sm:px-7">
      <section className="w-full max-w-[510px] rounded-[2rem] border border-[#dedbd0] bg-[#fffdf8] p-6 shadow-[0_25px_90px_rgba(31,52,46,.12)] sm:p-10">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#123b35] text-[#e6b76f]"><KeyRound size={23} /></span>
        <p className="eyebrow mb-3 mt-7">Acceso seguro</p>
        <h1 className="text-3xl font-semibold tracking-[-.03em] text-[#173732] sm:text-4xl">Crea una nueva contraseña</h1>
        <p className="mt-3 text-sm leading-6 text-[#687873]">Usa al menos 8 caracteres y evita reutilizar una contraseña anterior.</p>

        {!ready ? (
          <p className="mt-8 rounded-xl bg-[#f1eee5] p-4 text-sm font-semibold text-[#526762]">Validando el enlace…</p>
        ) : authorized ? (
          <form onSubmit={updatePassword} className="mt-8 space-y-5">
            <label className="block text-sm font-bold text-[#284842]">Nueva contraseña
              <span className="relative mt-2 block">
                <input type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-13 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 pr-12 font-normal text-[#173732] shadow-sm" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-[#687873] hover:bg-[#f1eee5]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
              </span>
            </label>
            <label className="block text-sm font-bold text-[#284842]">Confirmar contraseña
              <input type={showPassword ? "text" : "password"} autoComplete="new-password" required minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-13 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 font-normal text-[#173732] shadow-sm" />
            </label>
            {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
            <button disabled={saving} className="flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-[#123b35] px-5 font-bold text-white shadow-lg shadow-[#123b35]/15 transition hover:bg-[#1c5148] disabled:opacity-60"><LockKeyhole size={17} />{saving ? "Actualizando…" : "Guardar nueva contraseña"}</button>
          </form>
        ) : (
          <div className="mt-8">
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{error}</p>
            <Link href="/login" className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#356c61] hover:underline"><ArrowLeft size={16} />Volver al inicio de sesión</Link>
          </div>
        )}

        {authorized && ready && <p className="mt-6 flex items-center gap-2 text-xs text-[#6d7d78]"><CheckCircle2 size={15} className="text-[#3a7a6c]" />El enlace solo puede utilizarse durante su periodo de validez.</p>}
      </section>
    </main>
  );
}
