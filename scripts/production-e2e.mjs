import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { assertRemoteTestPermission } from "./remote-test-guard.mjs";

async function loadLocalEnv() {
  const raw = await readFile(new URL("../.env.local", import.meta.url), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

await loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const appUrl = process.env.E2E_APP_URL || "http://localhost:3000";

if (!supabaseUrl || !anonKey || !serviceRoleKey) {
  throw new Error("Faltan las variables reales de Supabase en .env.local");
}

const { projectRef, target: remoteTestTarget } = assertRemoteTestPermission({
  supabaseUrl,
});
console.log(`[remote-test] Destino autorizado: ${remoteTestTarget} (${projectRef})`);

const runId = `${Date.now()}-${randomUUID().slice(0, 6)}`;
const teacherEmail = `codex-e2e-docente-${runId}@example.com`;
const supervisorEmail = `codex-e2e-supervisor-${runId}@example.com`;
const teacherPassword = `Docente!${randomUUID()}Aa1`;
const supervisorPassword = `Supervisor!${randomUUID()}Aa1`;
const updatedPassword = `Actualizada!${randomUUID()}Aa1`;

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};
const admin = createClient(supabaseUrl, serviceRoleKey, clientOptions);
const teacher = createClient(supabaseUrl, anonKey, clientOptions);
const supervisor = createClient(supabaseUrl, anonKey, clientOptions);
const recovery = createClient(supabaseUrl, anonKey, clientOptions);

const cleanup = {
  userIds: [],
  portfolioId: null,
  documentId: null,
  storagePath: null,
};
const results = [];

function check(condition, label) {
  if (!condition) throw new Error(`FALLÓ: ${label}`);
  results.push(label);
}

function sessionCookie(session) {
  const key = `sb-${projectRef}-auth-token`;
  const encoded = `base64-${Buffer.from(JSON.stringify(session), "utf8").toString("base64url")}`;
  const size = 3180;
  if (encoded.length <= size) return `${key}=${encoded}`;
  const chunks = [];
  for (let index = 0; index * size < encoded.length; index += 1) {
    chunks.push(`${key}.${index}=${encoded.slice(index * size, (index + 1) * size)}`);
  }
  return chunks.join("; ");
}

async function jsonResponse(response) {
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${response.status} ${json.error || response.statusText}`);
  }
  return json;
}

try {
  const teacherCreated = await admin.auth.admin.createUser({
    email: teacherEmail,
    password: teacherPassword,
    email_confirm: true,
    user_metadata: { nombre: "Docente E2E" },
    app_metadata: { rol: "docente" },
  });
  if (teacherCreated.error) throw teacherCreated.error;
  cleanup.userIds.push(teacherCreated.data.user.id);

  const supervisorCreated = await admin.auth.admin.createUser({
    email: supervisorEmail,
    password: supervisorPassword,
    email_confirm: true,
    user_metadata: { nombre: "Supervisor E2E" },
    app_metadata: { rol: "supervisor" },
  });
  if (supervisorCreated.error) throw supervisorCreated.error;
  cleanup.userIds.push(supervisorCreated.data.user.id);

  const profiles = await admin
    .from("perfiles")
    .select("id,rol")
    .in("id", cleanup.userIds);
  if (profiles.error) throw profiles.error;
  const roleById = new Map(profiles.data.map((profile) => [profile.id, profile.rol]));
  check(roleById.get(teacherCreated.data.user.id) === "docente", "trigger crea perfil docente desde app_metadata");
  check(roleById.get(supervisorCreated.data.user.id) === "supervisor", "trigger crea perfil supervisor desde app_metadata");

  const teacherLogin = await teacher.auth.signInWithPassword({
    email: teacherEmail,
    password: teacherPassword,
  });
  if (teacherLogin.error || !teacherLogin.data.session) throw teacherLogin.error;
  const teacherCookie = sessionCookie(teacherLogin.data.session);
  check(Boolean(teacherLogin.data.session), "login real de docente");

  const portfolioCreated = await jsonResponse(
    await fetch(`${appUrl}/api/portafolios`, {
      method: "POST",
      headers: { Cookie: teacherCookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        anio_lectivo: 2026,
        area: "InformÃ¡tica",
        jornada: "Matutina",
        institucion: "InstituciÃ³n E2E",
      }),
    }),
  );
  cleanup.portfolioId = portfolioCreated.portafolio.id;
  check(Boolean(cleanup.portfolioId), "docente crea un portafolio activo temporal");

  const pdf = Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0/Kids[]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
    "utf8",
  );
  const uploadForm = new FormData();
  uploadForm.set("titulo", "Estructura Portafolio Docente");
  uploadForm.set("subseccion", "4.7");
  uploadForm.set("general", "true");
  uploadForm.set("portafolio", cleanup.portfolioId);
  uploadForm.set("archivo", new Blob([pdf], { type: "application/pdf" }), "evidencia.pdf");
  const uploaded = await jsonResponse(
    await fetch(`${appUrl}/api/documentos`, {
      method: "POST",
      headers: { Cookie: teacherCookie },
      body: uploadForm,
    }),
  );
  cleanup.documentId = uploaded.documento.id;
  cleanup.storagePath = uploaded.documento.archivo_url;
  check(
    /^04-filosofia-ensenanza\/planes-de-clase\/general-anual\/estructura-portafolio-docente_[a-f0-9]{6}\.pdf$/.test(cleanup.storagePath),
    "nombre Storage usa slug del título e identificador corto",
  );
  check(uploaded.documento.portafolio_id === cleanup.portfolioId, "documento conserva el portafolio temporal");
  check(uploaded.documento.seccion_codigo === "4", "documento conserva el codigo de seccion");
  check(uploaded.documento.subseccion_codigo === "4.7", "documento conserva el codigo de subseccion");
  check(uploaded.documento.parcial === null, "General/Anual se persiste sin parcial");

  const viewerAccess = await jsonResponse(
    await fetch(`${appUrl}/api/documentos/${cleanup.documentId}/acceso`, {
      headers: { Cookie: teacherCookie },
      cache: "no-store",
    }),
  );
  const downloadAccess = await jsonResponse(
    await fetch(`${appUrl}/api/documentos/${cleanup.documentId}/acceso?descargar=true`, {
      headers: { Cookie: teacherCookie },
      cache: "no-store",
    }),
  );
  check(Boolean(viewerAccess.url), "visor recibe URL firmada bajo demanda");
  check(Boolean(downloadAccess.url), "descarga recibe URL firmada bajo demanda");

  const viewed = await fetch(viewerAccess.url);
  check(viewed.ok, "URL firmada del visor descarga el PDF privado");
  const downloaded = await fetch(downloadAccess.url);
  check(downloaded.ok, "URL firmada personalizada permite descargar");
  check(
    (downloaded.headers.get("content-disposition") || "").includes("estructura-portafolio-docente.pdf"),
    "descarga propone un nombre descriptivo",
  );

  const supervisorLogin = await supervisor.auth.signInWithPassword({
    email: supervisorEmail,
    password: supervisorPassword,
  });
  if (supervisorLogin.error || !supervisorLogin.data.session) throw supervisorLogin.error;
  const supervisorCookie = sessionCookie(supervisorLogin.data.session);
  check(Boolean(supervisorLogin.data.session), "login real de supervisor");

  const listed = await jsonResponse(
    await fetch(`${appUrl}/api/documentos?portafolio=${cleanup.portfolioId}&subseccion=4.7&periodo=general`, {
      headers: { Cookie: supervisorCookie },
      cache: "no-store",
    }),
  );
  check(listed.documentos.some((document) => document.id === cleanup.documentId), "supervisor ve inmediatamente el documento");

  const reviewed = await jsonResponse(
    await fetch(`${appUrl}/api/documentos/${cleanup.documentId}`, {
      method: "PATCH",
      headers: { Cookie: supervisorCookie, "Content-Type": "application/json" },
      body: JSON.stringify({
        estado: "Aprobado",
        comentario_supervisor: "Documento aprobado por la prueba E2E.",
      }),
    }),
  );
  check(reviewed.documento.estado === "Aprobado", "supervisor guarda estado");
  check(Boolean(reviewed.documento.comentario_supervisor), "supervisor guarda comentario");

  const forbiddenTitle = await supervisor
    .from("documentos")
    .update({ titulo: "Cambio no permitido" })
    .eq("id", cleanup.documentId);
  check(Boolean(forbiddenTitle.error), "trigger rechaza cambio directo de título por supervisor");
  const forbiddenFile = await supervisor
    .from("documentos")
    .update({ archivo_url: `${cleanup.storagePath}.otro` })
    .eq("id", cleanup.documentId);
  check(Boolean(forbiddenFile.error), "trigger rechaza cambio directo de archivo por supervisor");

  const teacherView = await jsonResponse(
    await fetch(`${appUrl}/api/documentos?portafolio=${cleanup.portfolioId}&subseccion=4.7&periodo=general`, {
      headers: { Cookie: teacherCookie },
      cache: "no-store",
    }),
  );
  const reviewedForTeacher = teacherView.documentos.find(
    (document) => document.id === cleanup.documentId,
  );
  check(reviewedForTeacher?.estado === "Aprobado", "docente ve la revisión persistida");

  const recoveryLink = await admin.auth.admin.generateLink({
    type: "recovery",
    email: teacherEmail,
    options: { redirectTo: `${appUrl}/reset-password` },
  });
  if (recoveryLink.error) throw recoveryLink.error;
  const actionLink = recoveryLink.data.properties?.action_link;
  check(Boolean(actionLink), "Supabase genera enlace de recuperación");
  const clickedLink = await fetch(actionLink, { redirect: "manual" });
  const recoveryLocation = clickedLink.headers.get("location");
  if (!recoveryLocation) throw new Error("El enlace no devolvió una redirección");
  const recoveryUrl = new URL(recoveryLocation);
  const expectedRecoveryUrl = new URL(`${appUrl}/reset-password`);
  check(
    recoveryUrl.origin === expectedRecoveryUrl.origin &&
      recoveryUrl.pathname === expectedRecoveryUrl.pathname,
    "enlace de recuperación redirige a /reset-password",
  );
  const recoveryHash = new URLSearchParams(recoveryUrl.hash.replace(/^#/, ""));
  const accessToken = recoveryHash.get("access_token");
  const refreshToken = recoveryHash.get("refresh_token");
  if (!accessToken || !refreshToken)
    throw new Error("La redirección de recuperación no incluyó una sesión válida");
  const verified = await recovery.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  if (verified.error) throw verified.error;
  const passwordUpdated = await recovery.auth.updateUser({ password: updatedPassword });
  if (passwordUpdated.error) throw passwordUpdated.error;
  await recovery.auth.signOut();
  const relogin = await teacher.auth.signInWithPassword({
    email: teacherEmail,
    password: updatedPassword,
  });
  check(!relogin.error && Boolean(relogin.data.session), "contraseña recuperada permite nuevo login");

  const movedToTrash = await jsonResponse(
    await fetch(`${appUrl}/api/documentos/${cleanup.documentId}`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(relogin.data.session) },
    }),
  );
  check(movedToTrash.ok === true && movedToTrash.papelera === true, "docente mueve el documento a la papelera");
  const purged = await jsonResponse(
    await fetch(`${appUrl}/api/documentos/${cleanup.documentId}?permanente=true`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie(relogin.data.session) },
    }),
  );
  check(purged.ok === true && purged.permanente === true, "docente elimina definitivamente el documento y su objeto privado");
  cleanup.documentId = null;
  cleanup.storagePath = null;

  await teacher.auth.signOut();
  await supervisor.auth.signOut();
  const protectedRoute = await fetch(`${appUrl}/portafolio`, {
    redirect: "manual",
  });
  check(
    protectedRoute.status === 307 &&
      (protectedRoute.headers.get("location") || "").startsWith("/login"),
    "ruta protegida redirige al login sin sesión",
  );

  console.log(JSON.stringify({ ok: true, checks: results }, null, 2));
} finally {
  if (cleanup.documentId) {
    await admin.from("documentos").delete().eq("id", cleanup.documentId);
  }
  if (cleanup.storagePath) {
    await admin.storage.from("portafolio-documentos").remove([cleanup.storagePath]);
  }
  if (cleanup.portfolioId) {
    await admin.from("portafolios").delete().eq("id", cleanup.portfolioId);
  }
  for (const userId of cleanup.userIds.reverse()) {
    await admin.auth.admin.deleteUser(userId);
  }
}
