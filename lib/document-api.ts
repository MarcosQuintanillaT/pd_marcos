import type { SupabaseClient } from "@supabase/supabase-js";
import { safeFilename, SIGNED_URL_TTL_SECONDS } from "@/lib/documents";
import { getFileExtension } from "@/lib/file-types";
import { BUCKET_DOCUMENTOS } from "@/lib/portfolio";
import type { Documento } from "@/lib/types";

export const DOCUMENT_COLUMNS = [
  "id",
  "portafolio_id",
  "seccion_codigo",
  "subseccion_codigo",
  "seccion",
  "subseccion",
  "parcial",
  "titulo",
  "archivo_url",
  "estado",
  "subido_por",
  "fecha_subida",
  "actualizado_en",
  "eliminado_en",
  "eliminado_por",
  "mime_type",
  "tamano_bytes",
  "nombre_original",
  "version_actual",
  "revisado_por",
  "revisado_en",
  "comentario_supervisor",
].join(",");

export function pagination(searchParams: URLSearchParams) {
  const page = Math.max(1, Number.parseInt(searchParams.get("pagina") ?? "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limite") ?? "24", 10) || 24));
  return { page, limit, from: (page - 1) * limit, to: page * limit - 1 };
}

export async function signDocumentAccess(
  supabase: SupabaseClient,
  document: Pick<Documento, "archivo_url" | "titulo">,
  download: boolean,
) {
  const extension = getFileExtension(document.archivo_url) || "bin";
  const filename = `${safeFilename(document.titulo)}.${extension}`;
  return supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(
      document.archivo_url,
      SIGNED_URL_TTL_SECONDS,
      download ? { download: filename } : undefined,
    );
}
