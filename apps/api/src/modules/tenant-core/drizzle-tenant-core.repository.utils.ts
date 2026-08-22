import { createHttpError } from '../../lib/http-error.js';
import { branches, terminals } from '../../db/schema/index.js';
import type { BranchRecord, TerminalRecord } from './tenant-core.types.js';

const DUPLICATE_CODE = '23505';

export const normalizeBranch = (branch: typeof branches.$inferSelect): BranchRecord => ({
  ...branch,
  address: branch.address ?? undefined
});

export const normalizeTerminal = (
  terminal: typeof terminals.$inferSelect
): TerminalRecord => ({
  ...terminal,
  deviceInstallationId: terminal.deviceInstallationId ?? undefined,
  lastSeenAt: terminal.lastSeenAt ?? undefined
});

export const requireRow = <T>(row: T | undefined, code: string, message: string): T => {
  if (!row) throw createHttpError(404, code, message);
  return row;
};

export const isDuplicateCodeError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) return false;
  if ('code' in error && error.code === DUPLICATE_CODE) return true;
  if ('cause' in error && typeof error.cause === 'object' && error.cause !== null) {
    return 'code' in error.cause && error.cause.code === DUPLICATE_CODE;
  }

  return false;
};
