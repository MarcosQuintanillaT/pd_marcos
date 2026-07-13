"use client";

import { createClient } from "@/lib/supabase/client";
import type { Documento, Parcial } from "@/lib/types";

type DirectUploadInput = {
  file: File;
  title: string;
  subsectionCode: string;
  parcial: Parcial | null;
  portfolioId: string;
  replacingId?: string | null;
  onProgress?: (progress: number) => void;
};

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<Record<string, unknown>>;
}

export async function uploadPortfolioFile(input: DirectUploadInput): Promise<Documento> {
  input.onProgress?.(10);
  const metadata = {
    titulo: input.title,
    subseccion: input.subsectionCode,
    parcial: input.parcial,
    portafolio: input.portfolioId,
    nombre: input.file.name,
    mime: input.file.type,
    tamano: input.file.size,
    reemplazar_id: input.replacingId ?? null,
  };
  const prepared = await fetch("/api/documentos/preparar-subida", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
  const preparedJson = await readJson(prepared);
  if (!prepared.ok) throw new Error(String(preparedJson.error ?? "No se pudo preparar la carga"));

  const path = String(preparedJson.path ?? "");
  const token = String(preparedJson.token ?? "");
  const bucket = String(preparedJson.bucket ?? "");
  const contentType = String(preparedJson.contentType ?? input.file.type);
  const supabase = createClient();
  if (!supabase || !path || !token || !bucket) throw new Error("La carga no está configurada correctamente");
  input.onProgress?.(35);
  const uploaded = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, input.file, { contentType, upsert: false });
  if (uploaded.error) throw new Error("No se pudo transferir el archivo a Storage");
  input.onProgress?.(80);

  const confirmed = await fetch("/api/documentos/confirmar-subida", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...metadata, path, mime: contentType }),
  });
  const confirmedJson = await readJson(confirmed);
  if (!confirmed.ok) throw new Error(String(confirmedJson.error ?? "No se pudo confirmar la carga"));
  input.onProgress?.(100);
  return confirmedJson.documento as Documento;
}
