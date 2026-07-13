import { timingSafeEqual } from "node:crypto";
import {
  forbidden,
  getAuthContext,
  privateJson,
  unauthorized,
} from "@/lib/auth";
import { portfolioIdFrom, resolvePortfolio } from "@/lib/active-portfolio";
import { createAdminClient } from "@/lib/supabase/admin";
import { purgeExpiredTrash } from "@/lib/trash-purge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isCronRequestAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(authorization);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export async function GET(request: Request) {
  if (!isCronRequestAuthorized(request)) return unauthorized("Cron no autorizado");
  const admin = createAdminClient();
  if (!admin) {
    return privateJson(
      { error: "La purga automática no está configurada" },
      { status: 503 },
    );
  }

  const result = await purgeExpiredTrash(admin);
  return privateJson(
    { ok: result.failures.length === 0, retentionDays: 30, ...result },
    { status: result.failures.length ? 500 : 200 },
  );
}

export async function POST(request: Request) {
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  if (auth.rol !== "docente") return forbidden();
  const { portfolio, error } = await resolvePortfolio(auth, portfolioIdFrom(request));
  if (error) return privateJson({ error: "No se pudo validar el portafolio" }, { status: 500 });
  if (!portfolio) return privateJson({ error: "Portafolio no encontrado" }, { status: 404 });

  const result = await purgeExpiredTrash(auth.supabase, { portfolioId: portfolio.id });
  return privateJson(
    { ok: result.failures.length === 0, retentionDays: 30, ...result },
    { status: result.failures.length ? 502 : 200 },
  );
}
