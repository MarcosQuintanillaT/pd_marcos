import {
  forbidden,
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { DOCUMENT_COLUMNS } from "@/lib/document-api";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const { id } = await context.params;
  const result = await auth.supabase
    .from("documentos")
    .update({ eliminado_en: null, eliminado_por: null })
    .eq("id", id)
    .not("eliminado_en", "is", null)
    .is("purga_iniciada_en", null)
    .select(DOCUMENT_COLUMNS)
    .single();
  if (result.error) {
    return result.error.code === "PGRST116"
      ? privateJson({ error: "Documento no encontrado" }, { status: 404 })
      : internalServerError(result.error, result.error.message);
  }
  return privateJson({ documento: result.data });
}
