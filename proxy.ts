import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
const isDevelopment = process.env.NODE_ENV !== "production";
const demoMode =
  isDevelopment && process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (!hasSupabase) {
    if (demoMode) return NextResponse.next({ request });
    if (path.startsWith("/portafolio")) {
      const login = request.nextUrl.clone();
      login.pathname = "/login";
      login.searchParams.set(
        "error",
        isDevelopment
          ? "Configura Supabase antes de ingresar"
          : "Servicio temporalmente no disponible",
      );
      return NextResponse.redirect(login);
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies) {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Valida y renueva la sesión; no se confía en getSession() para autorización.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);

  if (!loggedIn && path.startsWith("/portafolio")) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  if (loggedIn && path === "/login") {
    const panel = request.nextUrl.clone();
    panel.pathname = "/portafolio";
    panel.search = "";
    return NextResponse.redirect(panel);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
