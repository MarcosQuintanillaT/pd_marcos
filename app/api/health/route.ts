import { isSupabaseServerConfigured, privateJson } from "@/lib/auth";

export function GET() {
  const configured = isSupabaseServerConfigured();
  return privateJson(
    { status: configured ? "ok" : "degraded", database: configured ? "configured" : "unconfigured" },
    { status: configured ? 200 : 503 },
  );
}
