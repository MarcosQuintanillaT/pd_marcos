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
import { resolvePortfolio } from "@/lib/active-portfolio";
import { safeFilename } from "@/lib/documents";
import { describePortfolioFile, maximumFileBytes } from "@/lib/file-types";
import {
  BUCKET_DOCUMENTOS,
  findByCode,
  resolveDocumentPeriod,
  storageFolder,
} from "@/lib/portfolio";
import type { Parcial } from "@/lib/types";

type UploadRequest = {
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

export async function POST(request: Request) {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const body = (await request.json().catch(() => null)) as UploadRequest | null;
  if (!body) return privateJson({ error: "Datos no válidos" }, { status: 400 });

  const titulo = String(body.titulo ?? "").trim();
  const nombre = String(body.nombre ?? "").trim();
  const size = Number(body.tamano);
  const found = findByCode(String(body.subseccion ?? ""));
  const description = describePortfolioFile({ name: nombre, type: String(body.mime ?? "") } as File);
  if (!titulo || titulo.length > 160) {
    return privateJson({ error: "El título es obligatorio y admite hasta 160 caracteres" }, { status: 400 });
  }
  if (!found || found.subsection.children?.length) {
    return privateJson({ error: "Subsección no válida" }, { status: 400 });
  }
  if (!description) return privateJson({ error: "Formato de archivo no permitido" }, { status: 400 });
  if (!Number.isFinite(size) || size <= 0 || size > maximumFileBytes({ name: nombre, type: String(body.mime ?? "") } as File)) {
    return privateJson({ error: "El tamaño del archivo no es válido" }, { status: 400 });
  }

  const period = resolveDocumentPeriod(
    found.subsection,
    body.parcial,
    body.general === true,
  );
  if (period.error) return privateJson({ error: period.error }, { status: 400 });
  const parcial = period.parcial;

  const { portfolio, error: portfolioError } = await resolvePortfolio(auth, body.portafolio);
  if (portfolioError) return internalServerError(portfolioError, portfolioError.message);
  if (!portfolio || portfolio.estado !== "Activo") {
    return privateJson({ error: "El portafolio seleccionado está archivado o no existe" }, { status: 409 });
  }

  let folder = storageFolder(found.subsection, parcial, period.general);
  if (body.reemplazar_id) {
    const current = await auth.supabase
      .from("documentos")
      .select("id,archivo_url,portafolio_id,subseccion_codigo,parcial")
      .eq("id", body.reemplazar_id)
      .is("eliminado_en", null)
      .single();
    if (current.error || current.data.portafolio_id !== portfolio.id) {
      return privateJson({ error: "Documento no encontrado" }, { status: 404 });
    }
    if (current.data.subseccion_codigo !== found.subsection.code) {
      return privateJson(
        { error: "El documento no corresponde a la subsección seleccionada" },
        { status: 409 },
      );
    }
    if (current.data.parcial !== parcial) {
      return privateJson(
        { error: "El período seleccionado no coincide con el documento que se reemplazará" },
        { status: 409 },
      );
    }
    folder = String(current.data.archivo_url).split("/").slice(0, -1).join("/");
  }

  const shortId = randomUUID().replace(/-/g, "").slice(0, 6);
  const path = `${folder}/${safeFilename(titulo)}_${shortId}.${description.extension}`;
  const signed = await auth.supabase.storage
    .from(BUCKET_DOCUMENTOS)
    .createSignedUploadUrl(path);
  if (signed.error) return internalServerError(signed.error, signed.error.message);

  return privateJson({
    bucket: BUCKET_DOCUMENTOS,
    path,
    token: signed.data.token,
    contentType: description.contentType,
    portafolio: portfolio.id,
  });
}
