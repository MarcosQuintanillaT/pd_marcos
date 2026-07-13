import {
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { portfolioIdFrom, resolvePortfolio } from "@/lib/active-portfolio";
import { DOCUMENT_COLUMNS } from "@/lib/document-api";
import { safeFilename } from "@/lib/documents";
import { getFileExtension } from "@/lib/file-types";
import { BUCKET_DOCUMENTOS } from "@/lib/portfolio";
import type { Documento } from "@/lib/types";
import { createStoredZip } from "@/lib/zip-store";

export const runtime = "nodejs";
const MAX_EXPORT_BYTES = 100 * 1024 * 1024;

function csvCell(value: unknown) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { portfolio, error: portfolioError } = await resolvePortfolio(auth, portfolioIdFrom(request));
  if (portfolioError) return internalServerError(portfolioError, portfolioError.message);
  if (!portfolio) return new Response("No existe un portafolio para exportar", { status: 404 });

  const result = await auth.supabase
    .from("documentos")
    .select(DOCUMENT_COLUMNS)
    .eq("portafolio_id", portfolio.id)
    .is("eliminado_en", null)
    .order("seccion_codigo")
    .order("subseccion_codigo")
    .order("fecha_subida");
  if (result.error) return internalServerError(result.error, result.error.message);
  const documents = (result.data ?? []) as unknown as Documento[];
  const estimated = documents.reduce((sum, item) => sum + Number(item.tamano_bytes ?? 0), 0);
  if (estimated > MAX_EXPORT_BYTES) {
    return new Response("La exportación supera 100 MB. Descarga los archivos por sección.", {
      status: 413,
      headers: { "Cache-Control": "private, no-store", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const indexRows = [
    ["Sección", "Subsección", "Título", "Estado", "Parcial", "Fecha"].map(csvCell).join(","),
    ...documents.map((item) => [
      item.seccion,
      item.subseccion,
      item.titulo,
      item.estado,
      item.parcial ?? "",
      item.fecha_subida,
    ].map(csvCell).join(",")),
  ];
  const entries: Array<{ name: string; data: Uint8Array; date?: Date }> = [{
    name: "indice-portafolio.csv",
    data: new TextEncoder().encode(`\uFEFF${indexRows.join("\r\n")}`),
  }];
  const errors: string[] = [];

  for (const document of documents) {
    const signed = await auth.supabase.storage
      .from(BUCKET_DOCUMENTOS)
      .createSignedUrl(document.archivo_url, 300);
    if (signed.error || !signed.data?.signedUrl) {
      errors.push(`${document.titulo}: no se pudo generar acceso`);
      continue;
    }
    const response = await fetch(signed.data.signedUrl, { cache: "no-store" }).catch(() => null);
    if (!response?.ok) {
      errors.push(`${document.titulo}: no se pudo descargar`);
      continue;
    }
    const data = new Uint8Array(await response.arrayBuffer());
    const extension = getFileExtension(document.archivo_url) || "bin";
    entries.push({
      name: `${document.seccion_codigo}/${document.subseccion_codigo}/${safeFilename(document.titulo)}_${document.id.slice(0, 6)}.${extension}`,
      data,
      date: new Date(document.fecha_subida),
    });
  }
  if (errors.length) {
    entries.push({ name: "archivos-no-incluidos.txt", data: new TextEncoder().encode(errors.join("\r\n")) });
  }

  const zip = createStoredZip(entries);
  return new Response(zip, {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="portafolio-${portfolio.anio_lectivo}.zip"`,
    },
  });
}
