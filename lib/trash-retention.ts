export const TRASH_RETENTION_DAYS = 30;
export const TRASH_RETENTION_MS = TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000;

export type TrashRetentionInfo = {
  deletedAt: Date;
  purgeAt: Date;
  daysRemaining: number;
  expired: boolean;
};

export function trashRetentionInfo(
  eliminadoEn: string | Date,
  now: Date = new Date(),
): TrashRetentionInfo | null {
  const deletedAt = eliminadoEn instanceof Date ? eliminadoEn : new Date(eliminadoEn);
  if (Number.isNaN(deletedAt.getTime()) || Number.isNaN(now.getTime())) return null;

  const purgeAt = new Date(deletedAt.getTime() + TRASH_RETENTION_MS);
  const remaining = purgeAt.getTime() - now.getTime();
  return {
    deletedAt,
    purgeAt,
    daysRemaining: Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000))),
    expired: remaining <= 0,
  };
}

export function trashCutoff(now: Date = new Date()) {
  return new Date(now.getTime() - TRASH_RETENTION_MS);
}
