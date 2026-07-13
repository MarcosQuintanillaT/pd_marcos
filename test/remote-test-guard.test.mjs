import assert from "node:assert/strict";
import test from "node:test";

import {
  assertRemoteTestPermission,
  getProjectRef,
} from "../scripts/remote-test-guard.mjs";

const supabaseUrl = "https://proyecto-pruebas.supabase.co";
const confirmation = ["node", "script.mjs", "--confirm-temporary-users"];
const stagingEnv = {
  ALLOW_REMOTE_TESTS: "true",
  REMOTE_TEST_PROJECT_REFS: "otro-proyecto, proyecto-pruebas",
  REMOTE_TEST_TARGET: "staging",
};

test("extrae la referencia de una URL valida de Supabase", () => {
  assert.equal(getProjectRef(supabaseUrl), "proyecto-pruebas");
});

test("rechaza URLs que no pertenecen a un proyecto de Supabase", () => {
  assert.throws(() => getProjectRef("https://example.com"), /supabase\.co/);
});

test("bloquea pruebas remotas sin autorizacion explicita", () => {
  assert.throws(
    () =>
      assertRemoteTestPermission({
        env: { ...stagingEnv, ALLOW_REMOTE_TESTS: "false" },
        argv: confirmation,
        supabaseUrl,
      }),
    /ALLOW_REMOTE_TESTS=true/,
  );
});

test("exige confirmar la creacion de datos temporales", () => {
  assert.throws(
    () =>
      assertRemoteTestPermission({
        env: stagingEnv,
        argv: ["node", "script.mjs"],
        supabaseUrl,
      }),
    /--confirm-temporary-users/,
  );
});

test("bloquea un proyecto que no esta en la lista permitida", () => {
  assert.throws(
    () =>
      assertRemoteTestPermission({
        env: { ...stagingEnv, REMOTE_TEST_PROJECT_REFS: "otro-proyecto" },
        argv: confirmation,
        supabaseUrl,
      }),
    /no esta incluido/,
  );
});

test("permite un proyecto de staging confirmado y autorizado", () => {
  assert.deepEqual(
    assertRemoteTestPermission({
      env: stagingEnv,
      argv: confirmation,
      supabaseUrl,
    }),
    { projectRef: "proyecto-pruebas", target: "staging" },
  );
});

test("produccion necesita una segunda autorizacion", () => {
  assert.throws(
    () =>
      assertRemoteTestPermission({
        env: { ...stagingEnv, REMOTE_TEST_TARGET: "production" },
        argv: confirmation,
        supabaseUrl,
      }),
    /ALLOW_PRODUCTION_REMOTE_TESTS=true/,
  );

  assert.equal(
    assertRemoteTestPermission({
      env: {
        ...stagingEnv,
        REMOTE_TEST_TARGET: "production",
        ALLOW_PRODUCTION_REMOTE_TESTS: "true",
      },
      argv: confirmation,
      supabaseUrl,
    }).target,
    "production",
  );
});
