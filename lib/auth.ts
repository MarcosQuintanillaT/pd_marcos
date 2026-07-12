import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Perfil, Rol } from "@/lib/types";

export type AuthContext = {
  user: User;
  perfil: Perfil;
  rol: Rol;
  /** Cliente autenticado con las cookies del usuario; todas las consultas aplican RLS. */
  supabase: SupabaseClient;
};

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
  return Response.json({ error: message }, { status: 401 });
}

export function forbidden(message = "No tienes permiso para esta acción") {
  return Response.json({ error: message }, { status: 403 });
}

export function unconfigured() {
  return Response.json(
    {
      error:
        process.env.NODE_ENV !== "production"
          ? "Supabase no está configurado. Completa las variables de entorno."
          : "Servicio temporalmente no disponible",
    },
    { status: 503 },
  );
}
