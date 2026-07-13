import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET_DOCUMENTOS } from "@/lib/portfolio";
import { trashCutoff } from "@/lib/trash-retention";

const CLAIM_STALE_MS = 60 * 60 * 1000;
export const TRASH_PURGE_BATCH_SIZE = 100;

type ClaimedDocument = {
  id: string;
  archivo_url: string;
  eliminado_en: string;
  purga_iniciada_en: string;
};

export type TrashPurgeResult = {
  id: string;
  ok: boolean;
  filesRemoved: number;
  error?: string;
};

function safePurgeError(message: string) {
  return message.slice(0, 500);
}

async function releaseClaim(
  supabase: SupabaseClient,
  document: ClaimedDocument,
  message: string,
) {
  await supabase
    .from("documentos")
    .update({
      purga_iniciada_en: null,
      purga_error: safePurgeError(message),
    })
    .eq("id", document.id)
    .eq("purga_iniciada_en", document.purga_iniciada_en);
}

export async function purgeTrashDocument(
  supabase: SupabaseClient,
  documentId: string,
): Promise<TrashPurgeResult> {
  const claimedAt = new Date().toISOString();
  const staleBefore = new Date(Date.now() - CLAIM_STALE_MS).toISOString();
  const claim = await supabase
    .from("documentos")
    .update({ purga_iniciada_en: claimedAt, purga_error: null })
    .eq("id", documentId)
    .not("eliminado_en", "is", null)
    .or(`purga_iniciada_en.is.null,purga_iniciada_en.lt.${staleBefore}`)
    .select("id,archivo_url,eliminado_en,purga_iniciada_en")
    .maybeSingle();

  if (claim.error) {
    console.error("Trash purge claim failed", { documentId, error: claim.error });
    return { id: documentId, ok: false, filesRemoved: 0, error: "No se pudo iniciar la purga" };
  }
  const document = claim.data as ClaimedDocument | null;
  if (!document) {
    return {
      id: documentId,
      ok: false,
      filesRemoved: 0,
      error: "El documento está activo, no existe o ya se está eliminando",
    };
  }

  const versions = await supabase
    .from("documento_versiones")
    .select("archivo_url")
    .eq("documento_id", document.id);
  if (versions.error) {
    console.error("Trash purge versions lookup failed", { documentId, error: versions.error });
    await releaseClaim(supabase, document, "No se pudieron consultar las versiones");
    return { id: documentId, ok: false, filesRemoved: 0, error: "No se pudieron consultar las versiones" };
  }

  const paths = [...new Set([
    document.archivo_url,
    ...(versions.data ?? []).map((version) => String(version.archivo_url)),
  ].filter(Boolean))];
  const removed = await supabase.storage.from(BUCKET_DOCUMENTOS).remove(paths);
  if (removed.error) {
    console.error("Trash purge storage cleanup failed", { documentId, paths, error: removed.error });
    await releaseClaim(supabase, document, "No se pudieron borrar los archivos de Storage");
    return {
      id: documentId,
      ok: false,
      filesRemoved: 0,
      error: "No se pudieron borrar los archivos de Storage",
    };
  }

  const deleted = await supabase
    .from("documentos")
    .delete()
    .eq("id", document.id)
    .not("eliminado_en", "is", null)
    .eq("purga_iniciada_en", document.purga_iniciada_en)
    .select("id")
    .maybeSingle();
  if (deleted.error) {
    console.error("Trash purge database cleanup failed", { documentId, error: deleted.error });
    await releaseClaim(supabase, document, "Los archivos se borraron; falta retirar el registro");
    return {
      id: documentId,
      ok: false,
      filesRemoved: paths.length,
      error: "Los archivos se borraron; falta retirar el registro",
    };
  }
  if (!deleted.data) {
    const remaining = await supabase
      .from("documentos")
      .select("id")
      .eq("id", document.id)
      .maybeSingle();
    if (remaining.data) {
      await releaseClaim(supabase, document, "El registro cambió durante la purga");
      return {
        id: documentId,
        ok: false,
        filesRemoved: paths.length,
        error: "El registro cambió durante la purga",
      };
    }
  }

  return { id: documentId, ok: true, filesRemoved: paths.length };
}

export async function purgeExpiredTrash(
  supabase: SupabaseClient,
  options: { portfolioId?: string | null; now?: Date; limit?: number } = {},
) {
  const now = options.now ?? new Date();
  const staleBefore = new Date(now.getTime() - CLAIM_STALE_MS).toISOString();
  let query = supabase
    .from("documentos")
    .select("id")
    .not("eliminado_en", "is", null)
    .or(
      `eliminado_en.lt.${trashCutoff(now).toISOString()},purga_error.not.is.null,purga_iniciada_en.lt.${staleBefore}`,
    )
    .order("eliminado_en", { ascending: true })
    .limit(Math.min(TRASH_PURGE_BATCH_SIZE, Math.max(1, options.limit ?? TRASH_PURGE_BATCH_SIZE)));
  if (options.portfolioId) query = query.eq("portafolio_id", options.portfolioId);

  const candidates = await query;
  if (candidates.error) {
    console.error("Trash purge candidates lookup failed", { error: candidates.error });
    return {
      processed: 0,
      removed: 0,
      filesRemoved: 0,
      failures: [{ id: "consulta", error: "No se pudo consultar la papelera" }],
    };
  }

  const results: TrashPurgeResult[] = [];
  for (const candidate of candidates.data ?? []) {
    results.push(await purgeTrashDocument(supabase, String(candidate.id)));
  }
  return {
    processed: results.length,
    removed: results.filter((result) => result.ok).length,
    filesRemoved: results.reduce((total, result) => total + result.filesRemoved, 0),
    failures: results.filter((result) => !result.ok).map(({ id, error }) => ({ id, error })),
  };
}
