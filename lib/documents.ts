import type { SupabaseClient } from "@supabase/supabase-js";
import { getFileExtension } from "@/lib/file-types";
import { BUCKET_DOCUMENTOS } from "@/lib/portfolio";
import type { Documento } from "@/lib/types";

export const SIGNED_URL_TTL_SECONDS = 600;

export function safeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
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
      const extension = getFileExtension(document.archivo_url) || "bin";
      const downloadName = `${safeFilename(document.titulo)}.${extension}`;
      const [view, download] = await Promise.all([
        supabase.storage
          .from(BUCKET_DOCUMENTOS)
          .createSignedUrl(document.archivo_url, SIGNED_URL_TTL_SECONDS),
        supabase.storage.from(BUCKET_DOCUMENTOS).createSignedUrl(
          document.archivo_url,
          SIGNED_URL_TTL_SECONDS,
          { download: downloadName },
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
