import {
  forbidden,
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { listVisiblePortfolios } from "@/lib/active-portfolio";

function cleanText(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET() {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { data, error } = await listVisiblePortfolios(auth);
  if (error) return internalServerError(error, error.message);
  return privateJson({ portafolios: data, rol: auth.rol });
}

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return privateJson({ error: "Datos no válidos" }, { status: 400 });

  const anio = Number(body.anio_lectivo);
  const area = cleanText(body.area, 120);
  const jornada = cleanText(body.jornada, 80);
  const institucion = cleanText(body.institucion, 180) || null;
  if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
    return privateJson({ error: "Año lectivo no válido" }, { status: 400 });
  }
  if (area.length < 2 || jornada.length < 2) {
    return privateJson({ error: "Completa el área y la jornada" }, { status: 400 });
  }

  const { data: previous } = await auth.supabase
    .from("portafolios")
    .select("id")
    .eq("docente_id", auth.user.id)
    .eq("estado", "Activo");
  const previousIds = (previous ?? []).map((item) => item.id);
  if (previousIds.length) {
    const archived = await auth.supabase
      .from("portafolios")
      .update({ estado: "Archivado", cerrado_en: new Date().toISOString() })
      .in("id", previousIds);
    if (archived.error) return internalServerError(archived.error, archived.error.message);
  }

  const created = await auth.supabase
    .from("portafolios")
    .insert({
      docente_id: auth.user.id,
      anio_lectivo: anio,
      area,
      jornada,
      institucion,
      estado: "Activo",
    })
    .select("*")
    .single();

  if (created.error) {
    if (previousIds.length) {
      await auth.supabase
        .from("portafolios")
        .update({ estado: "Activo", cerrado_en: null })
        .eq("id", previousIds[0]);
    }
    const duplicate = created.error.code === "23505";
    return duplicate
      ? privateJson({ error: `Ya existe un portafolio para ${anio}` }, { status: 409 })
      : internalServerError(created.error, created.error.message);
  }

  return privateJson({ portafolio: created.data }, { status: 201 });
}
