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
import { DOCUMENT_COLUMNS } from "@/lib/document-api";
import { safeFilename } from "@/lib/documents";
import {
  describePortfolioFile,
  validateFileSignature,
  validatePortfolioFile,
} from "@/lib/file-types";
import { BUCKET_DOCUMENTOS } from "@/lib/portfolio";
import type { Documento, EstadoDocumento } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };
const ESTADOS: EstadoDocumento[] = ["Pendiente", "Revisado", "Aprobado"];

export async function PATCH(request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return privateJson({ error: "Datos no válidos" }, { status: 400 });

  const updates: Record<string, string | null> = {};
  if (auth.rol === "supervisor") {
    if (!ESTADOS.includes(body.estado as EstadoDocumento)) {
      return privateJson({ error: "Estado no válido" }, { status: 400 });
    }
    updates.estado = body.estado as string;
    updates.comentario_supervisor = String(body.comentario_supervisor ?? "").trim().slice(0, 2000) || null;
  } else {
    if (typeof body.titulo === "string") {
      const titulo = body.titulo.trim();
      if (!titulo || titulo.length > 160) {
        return privateJson({ error: "Título no válido" }, { status: 400 });
      }
      updates.titulo = titulo;
    }
    if (body.estado && ESTADOS.includes(body.estado as EstadoDocumento)) {
      updates.estado = body.estado as string;
    }
    if ("comentario_supervisor" in body) {
      updates.comentario_supervisor = String(body.comentario_supervisor ?? "").trim().slice(0, 2000) || null;
    }
  }
  if (!Object.keys(updates).length) {
    return privateJson({ error: "No hay cambios válidos" }, { status: 400 });
  }

  const result = await auth.supabase
    .from("documentos")
    .update(updates)
    .eq("id", id)
    .is("eliminado_en", null)
    .select(DOCUMENT_COLUMNS)
    .single();
  if (result.error) {
    return result.error.code === "PGRST116"
      ? privateJson({ error: "Documento no encontrado" }, { status: 404 })
      : internalServerError(result.error, result.error.message);
  }
  return privateJson({ documento: result.data as unknown as Documento });
}

/** Compatibilidad para reemplazos pequeños; la UI usa carga directa firmada. */
export async function PUT(request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const { id } = await context.params;
  const form = await request.formData().catch(() => null);
  const file = form?.get("archivo");
  if (!(file instanceof File)) return privateJson({ error: "Archivo requerido" }, { status: 400 });
  const validationError = validatePortfolioFile(file);
  if (validationError) return privateJson({ error: validationError }, { status: 400 });
  const description = describePortfolioFile(file);
  if (!description) return privateJson({ error: "Tipo de archivo no permitido" }, { status: 400 });
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validateFileSignature(bytes, description)) {
    return privateJson({ error: "El contenido no coincide con el formato declarado" }, { status: 400 });
  }

  const currentResult = await auth.supabase
    .from("documentos")
    .select(DOCUMENT_COLUMNS)
    .eq("id", id)
    .is("eliminado_en", null)
    .single();
  const current = currentResult.data as unknown as Documento | null;
  if (!current) return privateJson({ error: "Documento no encontrado" }, { status: 404 });
  const titulo = String(form?.get("titulo") ?? current.titulo).trim().slice(0, 160) || current.titulo;
  const folder = current.archivo_url.split("/").slice(0, -1).join("/");
  const objectId = randomUUID().replace(/-/g, "").slice(0, 6);
  const path = `${folder}/${safeFilename(titulo)}_${objectId}.${description.extension}`;
  const uploaded = await auth.supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, bytes, { contentType: description.contentType, upsert: false });
  if (uploaded.error) return internalServerError(uploaded.error, uploaded.error.message);

  const updated = await auth.supabase
    .from("documentos")
    .update({
      archivo_url: path,
      titulo,
      fecha_subida: new Date().toISOString(),
      estado: "Pendiente",
      mime_type: description.contentType,
      tamano_bytes: file.size,
      nombre_original: file.name.slice(0, 255),
    })
    .eq("id", id)
    .select(DOCUMENT_COLUMNS)
    .single();
  if (updated.error) {
    await auth.supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return internalServerError(updated.error, updated.error.message);
  }
  return privateJson({ documento: updated.data as unknown as Documento });
}

export async function DELETE(request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const { id } = await context.params;
  const permanent = new URL(request.url).searchParams.get("permanente") === "true";

  if (!permanent) {
    const result = await auth.supabase
      .from("documentos")
      .update({ eliminado_en: new Date().toISOString(), eliminado_por: auth.user.id })
      .eq("id", id)
      .is("eliminado_en", null)
      .select("id")
      .single();
    if (result.error) {
      return result.error.code === "PGRST116"
        ? privateJson({ error: "Documento no encontrado" }, { status: 404 })
        : internalServerError(result.error, result.error.message);
    }
    return privateJson({ ok: true, papelera: true });
  }

  const current = await auth.supabase
    .from("documentos")
    .select("id,archivo_url")
    .eq("id", id)
    .not("eliminado_en", "is", null)
    .single();
  if (current.error || !current.data) {
    return privateJson({ error: "El documento debe estar en la papelera" }, { status: 409 });
  }
  const versions = await auth.supabase
    .from("documento_versiones")
    .select("archivo_url")
    .eq("documento_id", id);
  const paths = [current.data.archivo_url, ...(versions.data ?? []).map((item) => item.archivo_url)];
  const deleted = await auth.supabase.from("documentos").delete().eq("id", id);
  if (deleted.error) return internalServerError(deleted.error, deleted.error.message);
  const removed = await auth.supabase.storage.from(BUCKET_DOCUMENTOS).remove(paths);
  if (removed.error) console.error("Storage cleanup pending", { documentId: id, paths, error: removed.error });
  return privateJson({ ok: true, permanente: true, limpiezaPendiente: Boolean(removed.error) });
}
