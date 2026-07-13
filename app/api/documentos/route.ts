import { randomUUID } from "node:crypto";
import {
  forbidden,
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { portfolioIdFrom, resolvePortfolio } from "@/lib/active-portfolio";
import { DOCUMENT_COLUMNS, pagination } from "@/lib/document-api";
import { safeFilename } from "@/lib/documents";
import {
  describePortfolioFile,
  validateFileSignature,
  validatePortfolioFile,
} from "@/lib/file-types";
import {
  BUCKET_DOCUMENTOS,
  findByCode,
  PARCIALES,
  sectionLabel,
  storageFolder,
  subsectionLabel,
} from "@/lib/portfolio";
import type { Documento, EstadoDocumento, Parcial } from "@/lib/types";

export const runtime = "nodejs";
const ESTADOS: EstadoDocumento[] = ["Pendiente", "Revisado", "Aprobado"];

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();

  const url = new URL(request.url);
  const { searchParams } = url;
  const { portfolio, error: portfolioError } = await resolvePortfolio(
    auth,
    portfolioIdFrom(request),
  );
  if (portfolioError) return internalServerError(portfolioError, portfolioError.message);
  if (!portfolio) {
    return privateJson({ documentos: [], total: 0, pagina: 1, paginas: 0, rol: auth.rol });
  }

  const subsectionCode = searchParams.get("subseccion");
  const sectionCode = searchParams.get("seccion");
  const parcial = searchParams.get("parcial");
  const estado = searchParams.get("estado");
  const queryText = searchParams.get("q")?.trim().slice(0, 80);
  const trash = searchParams.get("papelera") === "true";
  if (trash && auth.rol !== "docente") return forbidden();
  const range = pagination(searchParams);

  let query = auth.supabase
    .from("documentos")
    .select(DOCUMENT_COLUMNS, { count: "exact" })
    .eq("portafolio_id", portfolio.id)
    .order(trash ? "eliminado_en" : "fecha_subida", { ascending: false })
    .range(range.from, range.to);

  query = trash ? query.not("eliminado_en", "is", null) : query.is("eliminado_en", null);
  if (subsectionCode) {
    if (!findByCode(subsectionCode)) {
      return privateJson({ error: "Subsección no válida" }, { status: 400 });
    }
    query = query.eq("subseccion_codigo", subsectionCode);
  } else if (sectionCode) {
    if (!/^([1-8])$/.test(sectionCode)) {
      return privateJson({ error: "Sección no válida" }, { status: 400 });
    }
    query = query.eq("seccion_codigo", sectionCode);
  }
  if (parcial) {
    if (!PARCIALES.includes(parcial as Parcial)) {
      return privateJson({ error: "Parcial no válido" }, { status: 400 });
    }
    query = query.eq("parcial", parcial);
  }
  if (estado) {
    if (!ESTADOS.includes(estado as EstadoDocumento)) {
      return privateJson({ error: "Estado no válido" }, { status: 400 });
    }
    query = query.eq("estado", estado);
  }
  if (queryText) query = query.ilike("titulo", `%${queryText.replace(/[%_]/g, "")}%`);

  const { data, error, count } = await query;
  if (error) return internalServerError(error, error.message);
  const total = count ?? 0;
  return privateJson({
    documentos: (data ?? []) as unknown as Documento[],
    total,
    pagina: range.page,
    paginas: Math.ceil(total / range.limit),
    rol: auth.rol,
    portafolio: portfolio,
  });
}

/** Compatibilidad para archivos pequeños; la UI usa carga directa a Storage. */
export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();

  const form = await request.formData().catch(() => null);
  if (!form) return privateJson({ error: "Formulario no válido" }, { status: 400 });
  const file = form.get("archivo");
  const titulo = String(form.get("titulo") ?? "").trim();
  const code = String(form.get("subseccion") ?? "");
  const found = findByCode(code);
  if (!(file instanceof File)) return privateJson({ error: "Archivo requerido" }, { status: 400 });
  const fileError = validatePortfolioFile(file);
  if (fileError) return privateJson({ error: fileError }, { status: 400 });
  const description = describePortfolioFile(file);
  if (!description) return privateJson({ error: "Tipo de archivo no permitido" }, { status: 400 });
  if (!titulo || titulo.length > 160) {
    return privateJson({ error: "El título es obligatorio y admite hasta 160 caracteres" }, { status: 400 });
  }
  if (!found || found.subsection.children?.length) {
    return privateJson({ error: "Subsección no válida para documentos" }, { status: 400 });
  }

  let parcial = (form.get("parcial") || null) as Parcial | null;
  if (found.subsection.fixedParcial) parcial = found.subsection.fixedParcial;
  if (found.subsection.supportsParcial && !parcial) {
    return privateJson({ error: "Selecciona el parcial" }, { status: 400 });
  }
  if (parcial && !PARCIALES.includes(parcial)) {
    return privateJson({ error: "Parcial no válido" }, { status: 400 });
  }
  const { portfolio, error: portfolioError } = await resolvePortfolio(
    auth,
    String(form.get("portafolio") ?? "") || null,
  );
  if (portfolioError) return internalServerError(portfolioError, portfolioError.message);
  if (!portfolio || portfolio.estado !== "Activo") {
    return privateJson({ error: "Selecciona un portafolio activo" }, { status: 409 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validateFileSignature(bytes, description)) {
    return privateJson({ error: "El contenido del archivo no coincide con su formato" }, { status: 400 });
  }
  const objectId = randomUUID().replace(/-/g, "").slice(0, 6);
  const path = `${storageFolder(found.subsection, parcial)}/${safeFilename(titulo)}_${objectId}.${description.extension}`;
  const uploaded = await auth.supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, bytes, { contentType: description.contentType, upsert: false });
  if (uploaded.error) return internalServerError(uploaded.error, uploaded.error.message);

  const result = await auth.supabase
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
      subido_por: auth.user.id,
      estado: "Pendiente",
      mime_type: description.contentType,
      tamano_bytes: file.size,
      nombre_original: file.name.slice(0, 255),
    })
    .select(DOCUMENT_COLUMNS)
    .single();

  if (result.error) {
    await auth.supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return internalServerError(result.error, result.error.message);
  }
  return privateJson({ documento: result.data as unknown as Documento }, { status: 201 });
}
