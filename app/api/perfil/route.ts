import {
  getAuthContext,
  isSupabaseServerConfigured,
  unauthorized,
  unconfigured,
} from "@/lib/auth";

export async function GET() {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  return Response.json({ perfil: auth.perfil });
}
