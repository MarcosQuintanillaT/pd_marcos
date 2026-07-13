import assert from "node:assert/strict";
import test from "node:test";

import {
  TRASH_RETENTION_DAYS,
  trashCutoff,
  trashRetentionInfo,
} from "../lib/trash-retention.ts";

test("la papelera conserva documentos durante 30 días", () => {
  assert.equal(TRASH_RETENTION_DAYS, 30);
  const deletedAt = new Date("2026-07-01T12:00:00.000Z");
  const info = trashRetentionInfo(deletedAt, new Date("2026-07-02T12:00:00.000Z"));
  assert.ok(info);
  assert.equal(info.daysRemaining, 29);
  assert.equal(info.expired, false);
  assert.equal(info.purgeAt.toISOString(), "2026-07-31T12:00:00.000Z");
});

test("marca como vencido al cumplir exactamente 30 días", () => {
  const info = trashRetentionInfo(
    "2026-07-01T12:00:00.000Z",
    new Date("2026-07-31T12:00:00.000Z"),
  );
  assert.ok(info);
  assert.equal(info.daysRemaining, 0);
  assert.equal(info.expired, true);
});

test("redondea hacia arriba los días restantes y limita vencidos a cero", () => {
  const almostExpired = trashRetentionInfo(
    "2026-07-01T12:00:00.000Z",
    new Date("2026-07-31T11:59:59.000Z"),
  );
  const expired = trashRetentionInfo(
    "2026-07-01T12:00:00.000Z",
    new Date("2026-08-01T12:00:00.000Z"),
  );
  assert.equal(almostExpired?.daysRemaining, 1);
  assert.equal(expired?.daysRemaining, 0);
  assert.equal(expired?.expired, true);
});

test("calcula el corte de retención desde una fecha controlada", () => {
  assert.equal(
    trashCutoff(new Date("2026-08-15T00:00:00.000Z")).toISOString(),
    "2026-07-16T00:00:00.000Z",
  );
});

test("rechaza fechas de eliminación inválidas", () => {
  assert.equal(trashRetentionInfo("fecha-inválida"), null);
});
