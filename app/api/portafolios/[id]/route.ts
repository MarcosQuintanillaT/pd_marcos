import {
  forbidden,
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return privateJson({ error: "Datos no válidos" }, { status: 400 });

  const updates: Record<string, string | null> = {};
  if (typeof body.area === "string") updates.area = body.area.trim().slice(0, 120);
  if (typeof body.jornada === "string") updates.jornada = body.jornada.trim().slice(0, 80);
  if ("institucion" in body) updates.institucion = String(body.institucion ?? "").trim().slice(0, 180) || null;
  if (body.estado === "Activo" || body.estado === "Archivado") updates.estado = body.estado;
  if (!Object.keys(updates).length) {
    return privateJson({ error: "No hay cambios válidos" }, { status: 400 });
  }
  if ((updates.area && updates.area.length < 2) || (updates.jornada && updates.jornada.length < 2)) {
    return privateJson({ error: "Área o jornada no válidas" }, { status: 400 });
  }

  let previousActiveIds: string[] = [];
  if (updates.estado === "Activo") {
    const previousActive = await auth.supabase
      .from("portafolios")
      .select("id")
      .eq("docente_id", auth.user.id)
      .neq("id", id)
      .eq("estado", "Activo");
    if (previousActive.error) {
      return internalServerError(previousActive.error, previousActive.error.message);
    }
    previousActiveIds = (previousActive.data ?? []).map((item) => item.id);
    const archived = await auth.supabase
      .from("portafolios")
      .update({ estado: "Archivado", cerrado_en: new Date().toISOString() })
      .eq("docente_id", auth.user.id)
      .neq("id", id)
      .eq("estado", "Activo");
    if (archived.error) return internalServerError(archived.error, archived.error.message);
    updates.cerrado_en = null;
  } else if (updates.estado === "Archivado") {
    updates.cerrado_en = new Date().toISOString();
  }

  const result = await auth.supabase
    .from("portafolios")
    .update(updates)
    .eq("id", id)
    .eq("docente_id", auth.user.id)
    .select("*")
    .single();
  if (result.error) {
    if (previousActiveIds.length) {
      await auth.supabase
        .from("portafolios")
        .update({ estado: "Activo", cerrado_en: null })
        .eq("id", previousActiveIds[0]);
    }
    return result.error.code === "PGRST116"
      ? privateJson({ error: "Portafolio no encontrado" }, { status: 404 })
      : internalServerError(result.error, result.error.message);
  }
  return privateJson({ portafolio: result.data });
}
