import assert from "node:assert/strict";
import test from "node:test";

import { safePortfolioRedirect } from "../lib/safe-redirect.ts";

test("acepta solo rutas internas del portafolio", () => {
  assert.equal(safePortfolioRedirect("/portafolio"), "/portafolio");
  assert.equal(
    safePortfolioRedirect("/portafolio/04-filosofia?parcial=I#archivo"),
    "/portafolio/04-filosofia?parcial=I#archivo",
  );
});

test("rechaza protocolos, URLs externas y rutas fuera del portafolio", () => {
  for (const value of [
    null,
    "https://malicioso.example",
    "//malicioso.example",
    "/login",
    "/portafolio-malicioso",
    "/portafolio\\..\\login",
    "/portafolio/%2e%2e/login",
  ]) {
    assert.equal(safePortfolioRedirect(value), "/portafolio");
  }
});
