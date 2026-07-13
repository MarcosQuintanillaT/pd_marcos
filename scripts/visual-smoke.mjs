import { createServer, request as httpRequest } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, readFile, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { assertRemoteTestPermission } from "./remote-test-guard.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function loadLocalEnv() {
  const raw = await readFile(resolve(root, ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

function cookieParts(projectRef, session) {
  const key = `sb-${projectRef}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  if (value.length <= 3180) return [`${key}=${value}`];
  const parts = [];
  for (let index = 0; index * 3180 < value.length; index += 1) {
    parts.push(`${key}.${index}=${value.slice(index * 3180, (index + 1) * 3180)}`);
  }
  return parts;
}

function authenticatedProxy(cookieHeader) {
  const cookies = cookieHeader.split("; ");
  return createServer((incoming, outgoing) => {
    const upstream = httpRequest(
      {
        hostname: "127.0.0.1",
        port: 3000,
        path: incoming.url,
        method: incoming.method,
        headers: {
          ...incoming.headers,
          host: "localhost:3000",
          cookie: cookieHeader,
        },
      },
      (response) => {
        const headers = { ...response.headers };
        const existing = Array.isArray(headers["set-cookie"])
          ? headers["set-cookie"]
          : headers["set-cookie"]
            ? [headers["set-cookie"]]
            : [];
        headers["set-cookie"] = [
          ...existing,
          ...cookies.map((cookie) => `${cookie}; Path=/; SameSite=Lax`),
        ];
        outgoing.writeHead(response.statusCode || 500, headers);
        response.pipe(outgoing);
      },
    );
    upstream.on("error", (error) => {
      outgoing.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
      outgoing.end(error.message);
    });
    incoming.pipe(upstream);
  });
}

async function screenshot(chrome, url, output, profile, width, height) {
  await execFileAsync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      "--virtual-time-budget=10000",
      `--screenshot=${output}`,
      url,
    ],
    { windowsHide: true, timeout: 45000 },
  );
}

async function dumpDom(chrome, url, profile, width, height) {
  const { stdout } = await execFileAsync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      "--virtual-time-budget=10000",
      "--dump-dom",
      url,
    ],
    { windowsHide: true, timeout: 45000, maxBuffer: 4 * 1024 * 1024 },
  );
  return stdout;
}

await loadLocalEnv();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Faltan variables reales de Supabase");
}

const { projectRef, target: remoteTestTarget } = assertRemoteTestPermission({
  supabaseUrl,
});
console.log(`[remote-test] Destino autorizado: ${remoteTestTarget} (${projectRef})`);

const chrome =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const outputDir = resolve(root, "artifacts", "production-smoke");
const tempRoot = resolve("C:\\tmp", `pd-marcos-visual-${Date.now()}`);
await mkdir(outputDir, { recursive: true });
await mkdir(tempRoot, { recursive: true });

const options = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
};
const admin = createClient(supabaseUrl, serviceRoleKey, options);
const supervisor = createClient(supabaseUrl, anonKey, options);
const runId = `${Date.now()}-${randomUUID().slice(0, 6)}`;
const teacherEmail = `visual-docente-${runId}@example.com`;
const supervisorEmail = `visual-supervisor-${runId}@example.com`;
const password = `Visual!${randomUUID()}Aa1`;
const cleanup = { users: [], documentId: null, path: null };
let proxy;

try {
  const teacher = await admin.auth.admin.createUser({
    email: teacherEmail,
    password,
    email_confirm: true,
    user_metadata: { nombre: "Docente Visual" },
    app_metadata: { rol: "docente" },
  });
  if (teacher.error) throw teacher.error;
  cleanup.users.push(teacher.data.user.id);

  const reviewer = await admin.auth.admin.createUser({
    email: supervisorEmail,
    password,
    email_confirm: true,
    user_metadata: { nombre: "Supervisor Visual" },
    app_metadata: { rol: "supervisor" },
  });
  if (reviewer.error) throw reviewer.error;
  cleanup.users.push(reviewer.data.user.id);

  cleanup.path = `04-filosofia-ensenanza/planes-de-clase/revision-movil_${randomUUID().replace(/-/g, "").slice(0, 6)}.pdf`;
  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
  );
  const stored = await admin.storage
    .from("portafolio-documentos")
    .upload(cleanup.path, pdf, { contentType: "application/pdf" });
  if (stored.error) throw stored.error;

  const inserted = await admin
    .from("documentos")
    .insert({
      seccion: "4. Filosofía de Enseñanza",
      subseccion: "4.7. Planes de clase (ejecución diaria)",
      parcial: null,
      titulo: "Revisión móvil del supervisor",
      archivo_url: cleanup.path,
      estado: "Pendiente",
      subido_por: teacher.data.user.id,
    })
    .select("id")
    .single();
  if (inserted.error) throw inserted.error;
  cleanup.documentId = inserted.data.id;

  const signedIn = await supervisor.auth.signInWithPassword({
    email: supervisorEmail,
    password,
  });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error;
  const sessionCookies = cookieParts(projectRef, signedIn.data.session);
  const recoveryLink = await admin.auth.admin.generateLink({
    type: "recovery",
    email: supervisorEmail,
    options: { redirectTo: "http://localhost:3000/reset-password" },
  });
  if (recoveryLink.error) throw recoveryLink.error;
  proxy = authenticatedProxy(sessionCookies.join("; "));
  await new Promise((resolveListen) => proxy.listen(0, "127.0.0.1", resolveListen));
  const proxyPort = proxy.address().port;

  const shots = [
    {
      name: "login-mobile.png",
      url: "http://localhost:3000/login",
      width: 390,
      height: 844,
    },
    {
      name: "supervisor-dashboard-mobile.png",
      url: `http://127.0.0.1:${proxyPort}/portafolio`,
      width: 390,
      height: 844,
    },
    {
      name: "supervisor-review-mobile.png",
      url: `http://127.0.0.1:${proxyPort}/portafolio/04-filosofia-ensenanza/07-planes-de-clase`,
      width: 390,
      height: 844,
    },
    {
      name: "reset-password-mobile.png",
      url: recoveryLink.data.properties.action_link,
      width: 390,
      height: 844,
    },
    {
      name: "login-desktop.png",
      url: "http://localhost:3000/login",
      width: 1366,
      height: 768,
    },
  ];

  for (let index = 0; index < shots.length; index += 1) {
    const shot = shots[index];
    await screenshot(
      chrome,
      shot.url,
      resolve(outputDir, shot.name),
      resolve(tempRoot, `profile-${index}`),
      shot.width,
      shot.height,
    );
  }

  const loginDom = await dumpDom(
    chrome,
    shots[0].url,
    resolve(tempRoot, "dom-login"),
    390,
    844,
  );
  const dashboardDom = await dumpDom(
    chrome,
    shots[1].url,
    resolve(tempRoot, "dom-dashboard"),
    390,
    844,
  );
  const reviewDom = await dumpDom(
    chrome,
    shots[2].url,
    resolve(tempRoot, "dom-review"),
    390,
    844,
  );
  const resetDom = await dumpDom(
    chrome,
    "http://localhost:3000/reset-password",
    resolve(tempRoot, "profile-3"),
    390,
    844,
  );
  const checks = {
    loginMobile:
      loginDom.includes("Ingresa a tu portafolio") &&
      loginDom.includes("¿Olvidaste tu contraseña?"),
    supervisorDashboardMobile:
      dashboardDom.includes("Portafolio Docente Digital") &&
      dashboardDom.includes("supervisor"),
    supervisorReviewMobile:
      reviewDom.includes("Revisión móvil del supervisor") &&
      reviewDom.includes("Guardar revisión") &&
      reviewDom.includes("Descargar"),
    resetPasswordMobile:
      resetDom.includes("Crea una nueva contraseña") &&
      resetDom.includes("Nueva contraseña") &&
      resetDom.includes("Guardar nueva contraseña"),
  };
  if (Object.values(checks).some((passed) => !passed)) {
    throw new Error(`Falló el smoke DOM: ${JSON.stringify(checks)}`);
  }

  const files = [];
  for (const shot of shots) {
    const path = resolve(outputDir, shot.name);
    files.push({ path, bytes: (await stat(path)).size });
  }
  console.log(JSON.stringify({ ok: true, checks, files }, null, 2));
} finally {
  if (proxy) await new Promise((resolveClose) => proxy.close(resolveClose));
  if (cleanup.documentId)
    await admin.from("documentos").delete().eq("id", cleanup.documentId);
  if (cleanup.path)
    await admin.storage.from("portafolio-documentos").remove([cleanup.path]);
  for (const userId of cleanup.users.reverse()) {
    await admin.auth.admin.deleteUser(userId);
  }
}
