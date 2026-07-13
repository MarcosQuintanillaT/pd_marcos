import {
  forbidden,
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { resolvePortfolio } from "@/lib/active-portfolio";
import { DOCUMENT_COLUMNS } from "@/lib/document-api";
import {
  describePortfolioFile,
  maximumFileBytes,
  validateFileSignature,
} from "@/lib/file-types";
import {
  BUCKET_DOCUMENTOS,
  findByCode,
  resolveDocumentPeriod,
  sectionLabel,
  storageFolder,
  subsectionLabel,
} from "@/lib/portfolio";
import type { Documento, Parcial } from "@/lib/types";

type ConfirmRequest = {
  path?: string;
  titulo?: string;
  subseccion?: string;
  parcial?: Parcial | null;
  general?: boolean;
  portafolio?: string | null;
  nombre?: string;
  mime?: string;
  tamano?: number;
  reemplazar_id?: string | null;
};

async function removeUpload(auth: Awaited<ReturnType<typeof getAuthContext>>, path: string) {
  if (auth) await auth.supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const body = (await request.json().catch(() => null)) as ConfirmRequest | null;
  if (!body) return privateJson({ error: "Datos no válidos" }, { status: 400 });

  const path = String(body.path ?? "").replace(/\\/g, "/");
  const titulo = String(body.titulo ?? "").trim();
  const nombre = String(body.nombre ?? "").trim().slice(0, 255);
  const found = findByCode(String(body.subseccion ?? ""));
  const description = describePortfolioFile({ name: nombre, type: String(body.mime ?? "") } as File);
  if (!path || path.startsWith("/") || path.includes("..") || !titulo || !found || !description) {
    if (path) await removeUpload(auth, path);
    return privateJson({ error: "La confirmación de carga no es válida" }, { status: 400 });
  }

  const period = resolveDocumentPeriod(
    found.subsection,
    body.parcial,
    body.general === true,
  );
  if (period.error) {
    await removeUpload(auth, path);
    return privateJson({ error: period.error }, { status: 400 });
  }
  const parcial = period.parcial;

  const { portfolio, error: portfolioError } = await resolvePortfolio(auth, body.portafolio);
  if (portfolioError) return internalServerError(portfolioError, portfolioError.message);
  if (!portfolio || portfolio.estado !== "Activo") {
    await removeUpload(auth, path);
    return privateJson({ error: "Portafolio no disponible" }, { status: 409 });
  }

  let expectedFolder = storageFolder(
    found.subsection,
    parcial,
    period.general,
  );
  let current: Documento | null = null;
  if (body.reemplazar_id) {
    const currentResult = await auth.supabase
      .from("documentos")
      .select(DOCUMENT_COLUMNS)
      .eq("id", body.reemplazar_id)
      .is("eliminado_en", null)
      .single();
    current = (currentResult.data as unknown as Documento | null) ?? null;
    if (currentResult.error || !current || current.portafolio_id !== portfolio.id) {
      await removeUpload(auth, path);
      return privateJson({ error: "Documento no encontrado" }, { status: 404 });
    }
    expectedFolder = current.archivo_url.split("/").slice(0, -1).join("/");
  }
  if (!path.startsWith(`${expectedFolder}/`)) {
    await removeUpload(auth, path);
    return privateJson({ error: "Ruta de almacenamiento no válida" }, { status: 400 });
  }

  const folder = path.split("/").slice(0, -1).join("/");
  const filename = path.split("/").at(-1) ?? "";
  const listed = await auth.supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .list(folder, { search: filename, limit: 10 });
  const object = listed.data?.find((item) => item.name === filename);
  const size = Number(object?.metadata?.size ?? body.tamano ?? 0);
  if (listed.error || !object || size <= 0 || size > maximumFileBytes({ name: nombre, type: description.contentType } as File)) {
    await removeUpload(auth, path);
    return privateJson({ error: "El archivo subido no existe o supera el límite permitido" }, { status: 400 });
  }

  const access = await auth.supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUrl(path, 60);
  if (access.error || !access.data?.signedUrl) {
    await removeUpload(auth, path);
    return internalServerError(access.error, "No se pudo verificar el archivo");
  }
  const preview = await fetch(access.data.signedUrl, {
    cache: "no-store",
    headers: { Range: "bytes=0-8191" },
  }).catch(() => null);
  const signatureBytes = preview?.ok ? new Uint8Array(await preview.arrayBuffer()) : null;
  if (!signatureBytes || !validateFileSignature(signatureBytes, description)) {
    await removeUpload(auth, path);
    return privateJson({ error: "El contenido no coincide con el formato declarado" }, { status: 400 });
  }

  if (current) {
    const updated = await auth.supabase
      .from("documentos")
      .update({
        archivo_url: path,
        titulo,
        mime_type: description.contentType,
        tamano_bytes: size,
        nombre_original: nombre,
        fecha_subida: new Date().toISOString(),
        estado: "Pendiente",
      })
      .eq("id", current.id)
      .select(DOCUMENT_COLUMNS)
      .single();
    if (updated.error) {
      await removeUpload(auth, path);
      return internalServerError(updated.error, updated.error.message);
    }
    return privateJson({ documento: updated.data as unknown as Documento });
  }

  const inserted = await auth.supabase
    .from("documentos")
    .insert({
      portafolio_id: portfolio.id,
      seccion_codigo: found.section.code,
      subseccion_codigo: found.subsection.code,
      seccion: sectionLabel(found.section),
      subseccion: subsectionLabel(found.subsection),
      parcial,
      titulo,
      archivo_url: path,
      estado: "Pendiente",
      subido_por: auth.user.id,
      mime_type: description.contentType,
      tamano_bytes: size,
      nombre_original: nombre,
    })
    .select(DOCUMENT_COLUMNS)
    .single();
  if (inserted.error) {
    await removeUpload(auth, path);
    return internalServerError(inserted.error, inserted.error.message);
  }
  return privateJson({ documento: inserted.data as unknown as Documento }, { status: 201 });
}
