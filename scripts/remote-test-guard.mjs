const CONFIRMATION_FLAG = "--confirm-temporary-users";

function enabled(value) {
  return value === "true";
}

export function getProjectRef(supabaseUrl) {
  let hostname;

  try {
    hostname = new URL(supabaseUrl).hostname;
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no es una URL valida.");
  }

  const [projectRef, ...rest] = hostname.split(".");
  if (!projectRef || rest.join(".") !== "supabase.co") {
    throw new Error("La prueba remota requiere una URL de proyecto *.supabase.co valida.");
  }

  return projectRef;
}

export function assertRemoteTestPermission({
  env = process.env,
  argv = process.argv,
  supabaseUrl,
  confirmationFlag = CONFIRMATION_FLAG,
}) {
  if (!enabled(env.ALLOW_REMOTE_TESTS)) {
    throw new Error(
      "Pruebas remotas bloqueadas. Define ALLOW_REMOTE_TESTS=true solo en una sesion controlada.",
    );
  }

  if (!argv.includes(confirmationFlag)) {
    throw new Error(
      `Esta prueba crea y elimina datos temporales. Confirma con ${confirmationFlag}.`,
    );
  }

  const projectRef = getProjectRef(supabaseUrl);
  const allowedProjectRefs = (env.REMOTE_TEST_PROJECT_REFS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowedProjectRefs.length === 0) {
    throw new Error(
      "Define REMOTE_TEST_PROJECT_REFS con la referencia exacta del proyecto de pruebas.",
    );
  }

  if (!allowedProjectRefs.includes(projectRef)) {
    throw new Error(
      `El proyecto ${projectRef} no esta incluido en REMOTE_TEST_PROJECT_REFS.`,
    );
  }

  const target = env.REMOTE_TEST_TARGET;
  if (target !== "staging" && target !== "production") {
    throw new Error(
      "Define REMOTE_TEST_TARGET=staging. Usa production solo con autorizacion explicita.",
    );
  }

  if (target === "production" && !enabled(env.ALLOW_PRODUCTION_REMOTE_TESTS)) {
    throw new Error(
      "El destino es produccion. Define tambien ALLOW_PRODUCTION_REMOTE_TESTS=true para continuar.",
    );
  }

  return { projectRef, target };
}
