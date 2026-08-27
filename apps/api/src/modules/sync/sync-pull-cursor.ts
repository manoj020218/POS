import { z } from 'zod';

import { createHttpError } from '../../lib/http-error.js';
import type { SyncEventCursor } from './sync.types.js';

const syncPullCursorSchema = z.object({
  eventId: z.string().trim().min(1).max(128),
  updatedAt: z.coerce.date()
});

export const decodeSyncPullCursor = (value?: string): SyncEventCursor | undefined => {
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

export const encodeSyncPullCursor = (value: SyncEventCursor) =>
  Buffer.from(
    JSON.stringify({ eventId: value.eventId, updatedAt: value.updatedAt.toISOString() }),
    'utf8'
  ).toString('base64url');
