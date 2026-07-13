import {
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { signDocumentAccess } from "@/lib/document-api";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const url = new URL(request.url);
  const download = url.searchParams.get("descargar") === "true";
  const version = Number.parseInt(url.searchParams.get("version") ?? "", 10);

  let currentQuery = auth.supabase
    .from("documentos")
    .select("id,titulo,archivo_url,eliminado_en")
    .eq("id", id);
  if (auth.rol !== "docente") currentQuery = currentQuery.is("eliminado_en", null);
  const current = await currentQuery.single();
  if (current.error || !current.data) {
    return privateJson({ error: "Documento no encontrado" }, { status: 404 });
  }

  let target = { titulo: current.data.titulo, archivo_url: current.data.archivo_url };
  if (Number.isInteger(version) && version > 0) {
    const history = await auth.supabase
      .from("documento_versiones")
      .select("titulo,archivo_url")
      .eq("documento_id", id)
      .eq("numero_version", version)
      .single();
    if (history.error || !history.data) {
      return privateJson({ error: "Versión no encontrada" }, { status: 404 });
    }
    target = history.data;
  }
  const signed = await signDocumentAccess(auth.supabase, target, download);
  if (signed.error || !signed.data?.signedUrl) {
    return internalServerError(signed.error, signed.error?.message);
  }
  return privateJson({ url: signed.data.signedUrl, expira_en: 600 });
}
