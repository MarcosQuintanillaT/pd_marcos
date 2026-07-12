import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_DOCUMENTOS } from "@/lib/portfolio";
import type { Documento } from "@/lib/types";

export const MAX_PDF_BYTES =
  (Number(process.env.MAX_PDF_SIZE_MB) || 10) * 1024 * 1024;
export const SIGNED_URL_TTL_SECONDS = 600;

export function validatePdf(file: File) {
  if (!file || file.size === 0) return "Selecciona un archivo PDF";
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf || !file.name.toLowerCase().endsWith(".pdf"))
    return "Solo se permiten archivos PDF";
  if (file.size > MAX_PDF_BYTES)
    return `El PDF supera el límite de ${Math.round(MAX_PDF_BYTES / 1024 / 1024)} MB`;
  return null;
}

export function safeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 70) || "documento";
}

export async function withSignedUrls(
  supabase: SupabaseClient,
  documents: Documento[],
) {
  return Promise.all(
    documents.map(async (document) => {
      const [view, download] = await Promise.all([
        supabase.storage
          .from(BUCKET_DOCUMENTOS)
          .createSignedUrl(document.archivo_url, SIGNED_URL_TTL_SECONDS),
        supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(
          document.archivo_url,
          SIGNED_URL_TTL_SECONDS,
          { download: `${safeFilename(document.titulo)}.pdf` },
        ),
      ]);
      return {
        ...document,
        signed_url: view.data?.signedUrl ?? null,
        download_url: download.data?.signedUrl ?? null,
      };
    }),
  );
}
