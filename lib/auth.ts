import type { SupabaseClient, User } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import type { Perfil, Rol } from "@/lib/types";

export type AuthContext = {
  user: User;
  perfil: Perfil;
  rol: Rol;
  /** Cliente autenticado con las cookies del usuario; todas las consultas aplican RLS. */
  supabase: SupabaseClient;
};

const PRIVATE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
} as const;

/** JSON response for authenticated or otherwise user-specific API data. */
export function privateJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  for (const [name, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }

  return Response.json(body, { ...init, headers });
}

/** Logs diagnostics server-side without exposing provider details to clients. */
export function internalServerError(
  error?: unknown,
  developmentMessage = "Ocurrió un error interno",
) {
  const reference = randomUUID().slice(0, 8);
  if (error) console.error("API internal error", { reference, error });

  return privateJson(
    {
      error:
        process.env.NODE_ENV === "production"
          ? "No se pudo completar la solicitud"
          : developmentMessage,
      reference,
    },
    { status: 500 },
  );
}

export function isSupabaseServerConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id,email,nombre,rol")
    .eq("id", data.user.id)
    .single();
  if (!perfil) return null;

  return {
    user: data.user,
    perfil: perfil as Perfil,
    rol: perfil.rol as Rol,
    supabase,
  };
}

export function unauthorized(message = "Debes iniciar sesión") {
  return privateJson({ error: message }, { status: 401 });
}

export function forbidden(message = "No tienes permiso para esta acción") {
  return privateJson({ error: message }, { status: 403 });
}

export function unconfigured() {
  return privateJson(
    {
      error:
        process.env.NODE_ENV !== "production"
          ? "Supabase no está configurado. Completa las variables de entorno."
          : "Servicio temporalmente no disponible",
    },
    { status: 503 },
  );
}
