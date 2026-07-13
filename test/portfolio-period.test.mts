import assert from "node:assert/strict";
import test from "node:test";

import {
  findByCode,
  resolveDocumentPeriod,
  storageFolder,
} from "../lib/portfolio.ts";

test("4.5, 4.7 y 4.8 admiten General/Anual y los cuatro parciales", () => {
  for (const code of ["4.5", "4.7", "4.8"]) {
    const found = findByCode(code);
    assert.ok(found, `Debe existir ${code}`);
    assert.equal(found.subsection.supportsParcial, true);
    assert.equal(found.subsection.allowsGeneral, true);

    assert.deepEqual(resolveDocumentPeriod(found.subsection, null, true), {
      parcial: null,
      general: true,
      error: null,
    });
    assert.deepEqual(resolveDocumentPeriod(found.subsection, "III", false), {
      parcial: "III",
      general: false,
      error: null,
    });
  }
});

test("General/Anual y un parcial no pueden seleccionarse simultáneamente", () => {
  const subsection = findByCode("4.5")!.subsection;
  const result = resolveDocumentPeriod(subsection, "I", true);
  assert.equal(result.parcial, null);
  assert.equal(result.general, false);
  assert.match(result.error ?? "", /único período/);
});

test("General se guarda en su carpeta controlada y los parciales en parcial-N", () => {
  const subsection = findByCode("4.7")!.subsection;
  assert.equal(
    storageFolder(subsection, null, true),
    "04-filosofia-ensenanza/planes-de-clase/general-anual",
  );
  assert.equal(
    storageFolder(subsection, "IV", false),
    "04-filosofia-ensenanza/planes-de-clase/parcial-4",
  );
});

test("una subsección sin períodos rechaza General y parciales", () => {
  const subsection = findByCode("4.6")!.subsection;
  assert.match(
    resolveDocumentPeriod(subsection, null, true).error ?? "",
    /no se organiza por parcial/,
  );
  assert.match(
    resolveDocumentPeriod(subsection, "II", false).error ?? "",
    /no se organiza por parcial/,
  );
});
