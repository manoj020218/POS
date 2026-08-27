import { z } from 'zod';

import { createHttpError } from '../../lib/http-error.js';
import type { SyncPullCursor } from './sync.types.js';

const syncPullCursorSchema = z.object({
  changeKey: z.string().trim().min(1).max(256),
  updatedAt: z.coerce.date()
});

export const buildProductSyncPullChangeKey = (productId: string) => `product:${productId}`;

export const buildCategorySyncPullChangeKey = (categoryId: string) => `category:${categoryId}`;

export const buildSyncEventPullChangeKey = (eventId: string) => `sync-event:${eventId}`;

export const buildTaxProfileSyncPullChangeKey = (taxProfileId: string) =>
  `tax-profile:${taxProfileId}`;

export const buildUnitSyncPullChangeKey = (unitId: string) => `unit:${unitId}`;

export const buildSyncPullChangeId = (changeKey: string, updatedAt: Date) =>
  `${changeKey}@${updatedAt.toISOString()}`;

export const compareSyncPullOrder = (
  left: Pick<SyncPullCursor, 'changeKey' | 'updatedAt'>,
  right: Pick<SyncPullCursor, 'changeKey' | 'updatedAt'>
) => left.updatedAt.getTime() - right.updatedAt.getTime() || left.changeKey.localeCompare(right.changeKey);

export const decodeSyncPullCursor = (value?: string): SyncPullCursor | undefined => {
  if (!value) {
    return undefined;
  }

  try {
    const decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    return syncPullCursorSchema.parse(decoded);
  } catch {
    throw createHttpError(400, 'SYNC_CURSOR_INVALID', 'Sync cursor is invalid');
  }
};

export const encodeSyncPullCursor = (value: SyncPullCursor) =>
  Buffer.from(
    JSON.stringify({ changeKey: value.changeKey, updatedAt: value.updatedAt.toISOString() }),
    'utf8'
  ).toString('base64url');
