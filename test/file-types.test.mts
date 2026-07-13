import assert from "node:assert/strict";
import test from "node:test";

import {
  describePortfolioFile,
  getFileKind,
  MAX_STANDARD_FILE_BYTES,
  MAX_VIDEO_FILE_BYTES,
  validateFileSignature,
  validatePortfolioFile,
} from "../lib/file-types.ts";

const encoder = new TextEncoder();

test("reconoce únicamente los formatos permitidos y rechaza combinaciones engañosas", () => {
  assert.equal(getFileKind("evidencia.pdf"), "pdf");
  assert.equal(getFileKind("fotografia.webp"), "image");
  assert.equal(getFileKind("sitio.html"), "html");
  assert.equal(getFileKind("clase.mp4"), "video");
  assert.equal(getFileKind("grafico.svg"), "unknown");

  assert.equal(
    describePortfolioFile(new File(["contenido"], "imagen.png", { type: "application/pdf" })),
    null,
  );
  assert.equal(
    describePortfolioFile(new File(["contenido"], "script.exe", { type: "application/octet-stream" })),
    null,
  );
});

test("valida las firmas reales de PDF, imagen, HTML y video", () => {
  const pdf = describePortfolioFile(new File(["%PDF-1.7"], "plan.pdf", { type: "application/pdf" }));
  const png = describePortfolioFile(new File([], "foto.png", { type: "image/png" }));
  const html = describePortfolioFile(new File([], "evidencia.html", { type: "text/html" }));
  const mp4 = describePortfolioFile(new File([], "clase.mp4", { type: "video/mp4" }));
  assert.ok(pdf && png && html && mp4);

  assert.equal(validateFileSignature(encoder.encode("%PDF-1.7\n"), pdf), true);
  assert.equal(
    validateFileSignature(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), png),
    true,
  );
  assert.equal(validateFileSignature(encoder.encode("<!doctype html><html></html>"), html), true);
  assert.equal(
    validateFileSignature(new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d]), mp4),
    true,
  );
  assert.equal(validateFileSignature(encoder.encode("MZ ejecutable"), pdf), false);
  assert.equal(validateFileSignature(encoder.encode("alert('x')"), html), false);
});

test("aplica 20 MB a documentos e imágenes y 50 MB a video", () => {
  const standard = {
    name: "reporte.pdf",
    type: "application/pdf",
    size: MAX_STANDARD_FILE_BYTES + 1,
  } as File;
  const video = {
    name: "evidencia.mp4",
    type: "video/mp4",
    size: MAX_VIDEO_FILE_BYTES + 1,
  } as File;

  assert.match(validatePortfolioFile(standard) ?? "", /20 MB/);
  assert.match(validatePortfolioFile(video) ?? "", /50 MB/);
});
