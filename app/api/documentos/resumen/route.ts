import {
  getAuthContext,
  internalServerError,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";
import { portfolioIdFrom, resolvePortfolio } from "@/lib/active-portfolio";
import { flattenSubsections, PORTFOLIO_SECTIONS } from "@/lib/portfolio";
import type { EstadoDocumento, PortfolioSummary, SectionSummary } from "@/lib/types";

type SummaryRow = {
  seccion_codigo: string;
  subseccion_codigo: string;
  estado: EstadoDocumento;
};

export async function GET(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  const { portfolio, error: portfolioError } = await resolvePortfolio(auth, portfolioIdFrom(request));
  if (portfolioError) return internalServerError(portfolioError, portfolioError.message);

  if (!portfolio) {
    const empty: PortfolioSummary = {
      total: 0,
      aprobados: 0,
      revisados: 0,
      pendientes: 0,
      cobertura: 0,
      revision: 0,
      subseccionesCubiertas: [],
      portafolio: null,
      secciones: PORTFOLIO_SECTIONS.map((section) => ({
        code: section.code,
        documentos: 0,
        aprobados: 0,
        revisados: 0,
        pendientes: 0,
        subseccionesConEvidencia: 0,
        subseccionesRequeridas: flattenSubsections(section).filter((item) => !item.children?.length).length,
      })),
    };
    return privateJson({ resumen: empty, rol: auth.rol });
  }

  const result = await auth.supabase
    .from("documentos")
    .select("seccion_codigo,subseccion_codigo,estado")
    .eq("portafolio_id", portfolio.id)
    .is("eliminado_en", null);
  if (result.error) return internalServerError(result.error, result.error.message);
  const rows = (result.data ?? []) as SummaryRow[];
  const requiredCodes = PORTFOLIO_SECTIONS.flatMap((section) =>
    flattenSubsections(section).filter((item) => !item.children?.length).map((item) => item.code),
  );
  const covered = new Set(rows.map((item) => item.subseccion_codigo).filter(Boolean));

  const secciones: SectionSummary[] = PORTFOLIO_SECTIONS.map((section) => {
    const sectionRows = rows.filter((item) => item.seccion_codigo === section.code);
    const sectionRequired = flattenSubsections(section).filter((item) => !item.children?.length);
    return {
      code: section.code,
      documentos: sectionRows.length,
      aprobados: sectionRows.filter((item) => item.estado === "Aprobado").length,
      revisados: sectionRows.filter((item) => item.estado === "Revisado").length,
      pendientes: sectionRows.filter((item) => item.estado === "Pendiente").length,
      subseccionesConEvidencia: sectionRequired.filter((item) => covered.has(item.code)).length,
      subseccionesRequeridas: sectionRequired.length,
    };
  });
  const aprobados = rows.filter((item) => item.estado === "Aprobado").length;
  const revisados = rows.filter((item) => item.estado === "Revisado").length;
  const summary: PortfolioSummary = {
    total: rows.length,
    aprobados,
    revisados,
    pendientes: rows.filter((item) => item.estado === "Pendiente").length,
    cobertura: requiredCodes.length ? Math.round((covered.size / requiredCodes.length) * 100) : 0,
    revision: rows.length ? Math.round((aprobados / rows.length) * 100) : 0,
    subseccionesCubiertas: [...covered],
    secciones,
    portafolio: portfolio,
  };
  return privateJson({ resumen: summary, rol: auth.rol });
}
