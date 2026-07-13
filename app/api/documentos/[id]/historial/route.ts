import {
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await context.params;
  let existsQuery = auth.supabase.from("documentos").select("id").eq("id", id);
  if (auth.rol !== "docente") existsQuery = existsQuery.is("eliminado_en", null);
  const exists = await existsQuery.single();
  if (exists.error) return privateJson({ error: "Documento no encontrado" }, { status: 404 });

  const [reviews, versions] = await Promise.all([
    auth.supabase
      .from("documento_revisiones")
      .select("*")
      .eq("documento_id", id)
      .order("creado_en", { ascending: false }),
    auth.supabase
      .from("documento_versiones")
      .select("*")
      .eq("documento_id", id)
      .order("numero_version", { ascending: false }),
  ]);
  if (reviews.error || versions.error) {
    return internalServerError(reviews.error ?? versions.error, "No se pudo cargar el historial");
  }
  return privateJson({ revisiones: reviews.data ?? [], versiones: versions.data ?? [] });
}
