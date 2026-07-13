import assert from "node:assert/strict";
import test from "node:test";

import {
  findByCode,
  PARCIALES,
  resolveDocumentPeriod,
  storageFolder,
} from "../lib/portfolio.ts";

test("4.5, 4.7 y 4.8 admiten General/Anual y los cuatro parciales", () => {
  const folders = {
    "4.5": "04-filosofia-ensenanza/programacion",
    "4.7": "04-filosofia-ensenanza/planes-de-clase",
    "4.8": "04-filosofia-ensenanza/rubricas",
  } as const;

  for (const code of Object.keys(folders) as Array<keyof typeof folders>) {
    const found = findByCode(code);
    assert.ok(found, `Debe existir ${code}`);
    assert.equal(found.subsection.supportsParcial, true);
    assert.equal(found.subsection.allowsGeneral, true);

    assert.deepEqual(resolveDocumentPeriod(found.subsection, null, true), {
      parcial: null,
      general: true,
      error: null,
    });
    assert.equal(
      storageFolder(found.subsection, null, true),
      `${folders[code]}/general-anual`,
    );

    PARCIALES.forEach((parcial, index) => {
      assert.deepEqual(resolveDocumentPeriod(found.subsection, parcial, false), {
        parcial,
        general: false,
        error: null,
      });
      assert.equal(
        storageFolder(found.subsection, parcial, false),
        `${folders[code]}/parcial-${index + 1}`,
      );
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

test("una subsección académica exige elegir General/Anual o un parcial", () => {
  const result = resolveDocumentPeriod(findByCode("4.7")!.subsection, null, false);
  assert.match(result.error ?? "", /Selecciona General\/Anual o un parcial/);
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
