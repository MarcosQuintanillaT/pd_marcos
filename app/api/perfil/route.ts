import {
  getAuthContext,
  isSupabaseServerConfigured,
  privateJson,
  unauthorized,
  unconfigured,
} from "@/lib/auth";

export async function GET() {
  if (!isSupabaseServerConfigured()) return unconfigured();
  const auth = await getAuthContext();
  if (!auth) return unauthorized();
  return privateJson({ perfil: auth.perfil });
}
