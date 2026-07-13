import { randomUUID } from "node:crypto";
import {
  getAuthContext,
  forbidden,
  isSupabaseServerConfigured,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { safeFilename, withSignedUrls } from "@/lib/documents";
import {
  describePortfolioFile,
  MAX_CLIENT_FILE_BYTES,
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
import type { Documento, Parcial } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const supabase = auth.supabase;

  const { searchParams } = new URL(request.url);
  const subsectionCode = searchParams.get("subseccion");
  const sectionCode = searchParams.get("seccion");
  const parcial = searchParams.get("parcial");

  let query = supabase.from("documentos").select("*").order("fecha_subida", { ascending: false });
  if (subsectionCode) {
    const found = findByCode(subsectionCode);
    if (!found) return Response.json({ error: "Subsección no válida" }, { status: 400 });
    query = query.eq("subseccion", subsectionLabel(found.subsection));
  } else if (sectionCode) {
    const found = findByCode(`${sectionCode}.1`) ?? findByCode(`${sectionCode}.1.1`);
    if (!found) return Response.json({ error: "Sección no válida" }, { status: 400 });
    query = query.eq("seccion", sectionLabel(found.section));
  }
  if (parcial) {
    if (!PARCIALES.includes(parcial as Parcial))
      return Response.json({ error: "Parcial no válido" }, { status: 400 });
    query = query.eq("parcial", parcial);
  }

  const { data, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const documentos = await withSignedUrls(supabase, (data ?? []) as Documento[]);
  return Response.json({ documentos, rol: auth.rol });
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const supabase = auth.supabase;

  const form = await request.formData();
  const file = form.get("archivo");
  const titulo = String(form.get("titulo") ?? "").trim();
  const code = String(form.get("subseccion") ?? "");
  const found = findByCode(code);
  if (!(file instanceof File)) return Response.json({ error: "Archivo requerido" }, { status: 400 });
  const fileError = validatePortfolioFile(file);
  if (fileError) return Response.json({ error: fileError }, { status: 400 });
  const fileDescription = describePortfolioFile(file);
  if (!fileDescription)
    return Response.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
  if (!titulo || titulo.length > 160)
    return Response.json({ error: "El título es obligatorio y admite hasta 160 caracteres" }, { status: 400 });
  if (!found || found.subsection.children?.length)
    return Response.json({ error: "Subsección no válida para documentos" }, { status: 400 });

  let parcial = (form.get("parcial") || null) as Parcial | null;
  if (found.subsection.fixedParcial) parcial = found.subsection.fixedParcial;
  if (found.subsection.supportsParcial && !parcial)
    return Response.json({ error: "Selecciona el parcial" }, { status: 400 });
  if (parcial && !PARCIALES.includes(parcial))
    return Response.json({ error: "Parcial no válido" }, { status: 400 });

  const objectId = randomUUID().replace(/-/g, "").slice(0, 6);
  const path = `${storageFolder(found.subsection, parcial)}/${safeFilename(titulo)}_${objectId}.${fileDescription.extension}`;
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > MAX_CLIENT_FILE_BYTES)
    return Response.json({ error: "Archivo demasiado grande" }, { status: 400 });

  const uploaded = await supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .upload(path, bytes, { contentType: fileDescription.contentType, upsert: false });
  if (uploaded.error)
    return Response.json({ error: `No se pudo subir el archivo: ${uploaded.error.message}` }, { status: 500 });

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      seccion: sectionLabel(found.section),
      subseccion: subsectionLabel(found.subsection),
      parcial,
      titulo,
      archivo_url: path,
      subido_por: auth.user.id,
      estado: "Pendiente",
    })
    .select("*")
    .single();

  if (error) {
    await supabase.storage.from(BUCKET_DOCUMENTOS).remove([path]);
    return Response.json({ error: error.message }, { status: 500 });
  }

  const [documento] = await withSignedUrls(supabase, [data as Documento]);
  return Response.json({ documento }, { status: 201 });
}
