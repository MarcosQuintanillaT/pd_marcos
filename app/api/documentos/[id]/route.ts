import { randomUUID } from "node:crypto";
import {
  getAuthContext,
  forbidden,
  isSupabaseServerConfigured,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { safeFilename, validatePdf, withSignedUrls } from "@/lib/documents";
import { BUCKET_DOCUMENTOS } from "@/lib/portfolio";
import type { Documento, EstadoDocumento } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };
const ESTADOS: EstadoDocumento[] = ["Pendiente", "Revisado", "Aprobado"];

export async function PATCH(request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const supabase = auth.supabase;
  const { id } = await context.params;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Datos no válidos" }, { status: 400 });

  const updates: Record<string, string | null> = {};
  if (auth.rol === "supervisor") {
    if (!ESTADOS.includes(body.estado as EstadoDocumento))
      return Response.json({ error: "Estado no válido" }, { status: 400 });
    updates.estado = body.estado as string;
    updates.comentario_supervisor = String(body.comentario_supervisor ?? "").trim().slice(0, 2000) || null;
  } else {
    if (typeof body.titulo === "string") {
      const titulo = body.titulo.trim();
      if (!titulo || titulo.length > 160)
        return Response.json({ error: "Título no válido" }, { status: 400 });
      updates.titulo = titulo;
    }
    if (body.estado && ESTADOS.includes(body.estado as EstadoDocumento))
      updates.estado = body.estado as string;
    if ("comentario_supervisor" in body)
      updates.comentario_supervisor = String(body.comentario_supervisor ?? "").trim().slice(0, 2000) || null;
  }
  if (!Object.keys(updates).length)
    return Response.json({ error: "No hay cambios válidos" }, { status: 400 });

  const { data, error } = await supabase.from("documentos").update(updates).eq("id", id).select("*").single();
  if (error) return Response.json({ error: error.message }, { status: 404 });
  const [documento] = await withSignedUrls(supabase, [data as Documento]);
  return Response.json({ documento });
}

export async function PUT(request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const supabase = auth.supabase;
  const { id } = await context.params;
  const form = await request.formData();
  const file = form.get("archivo");
  if (!(file instanceof File)) return Response.json({ error: "Archivo requerido" }, { status: 400 });
  const fileError = validatePdf(file);
  if (fileError) return Response.json({ error: fileError }, { status: 400 });

  const { data: current } = await supabase.from("documentos").select("*").eq("id", id).single();
  if (!current) return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  const titulo = String(form.get("titulo") ?? current.titulo).trim().slice(0, 160) || current.titulo;
  const folder = String(current.archivo_url).split("/").slice(0, -1).join("/");
  const objectId = randomUUID().replace(/-/g, "").slice(0, 6);
  const path = `${folder}/${safeFilename(titulo)}_${objectId}.pdf`;
  const uploaded = await supabase.storage.from(BUCKET_DOCUMENTOS).upload(path, await file.arrayBuffer(), {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploaded.error) return Response.json({ error: uploaded.error.message }, { status: 500 });

  const { data, error } = await supabase
    .from("documentos")
    .update({ archivo_url: path, titulo, fecha_subida: new Date().toISOString(), estado: "Pendiente" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return Response.json({ error: error.message }, { status: 500 });
  }
  await supabase.storage.from(BUCKET_DOCUMENTOS).remove([current.archivo_url]);
  const [documento] = await withSignedUrls(supabase, [data as Documento]);
  return Response.json({ documento });
}

export async function DELETE(_request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const supabase = auth.supabase;
  const { id } = await context.params;
  const { data } = await supabase.from("documentos").select("archivo_url").eq("id", id).single();
  if (!data) return Response.json({ error: "Documento no encontrado" }, { status: 404 });
  const removed = await supabase.storage.from(BUCKET_DOCUMENTOS).remove([data.archivo_url]);
  if (removed.error) return Response.json({ error: removed.error.message }, { status: 500 });
  const deleted = await supabase.from("documentos").delete().eq("id", id);
  if (deleted.error) return Response.json({ error: deleted.error.message }, { status: 500 });
  return Response.json({ ok: true });
}
