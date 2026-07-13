import type { AuthContext } from "@/lib/auth";
import type { Portafolio } from "@/lib/types";

const PORTFOLIO_COLUMNS =
  "id,docente_id,anio_lectivo,area,jornada,institucion,estado,creado_en,actualizado_en,cerrado_en";

export async function listVisiblePortfolios(auth: AuthContext) {
  let query = auth.supabase
    .from("portafolios")
    .select(PORTFOLIO_COLUMNS)
    .order("anio_lectivo", { ascending: false });

  if (auth.rol === "docente") query = query.eq("docente_id", auth.user.id);
  const { data, error } = await query;
  return { data: (data ?? []) as Portafolio[], error };
}

export async function resolvePortfolio(auth: AuthContext, requestedId?: string | null) {
  const { data, error } = await listVisiblePortfolios(auth);
  if (error) return { portfolio: null, error };
  const portfolio = requestedId
    ? data.find((item) => item.id === requestedId) ?? null
    : data.find((item) => item.estado === "Activo") ?? data[0] ?? null;
  return { portfolio, error: null };
}

export function portfolioIdFrom(request: Request) {
  return new URL(request.url).searchParams.get("portafolio");
}
