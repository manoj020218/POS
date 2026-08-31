import { clone } from '../in-memory-store-helpers.js';
import type { ClientSyncEventRecord, SyncRepository } from '../sync-repository.js';
import { storeNames } from './db-connection.js';
import { getAll, getOne, putOne } from './idb-helpers.js';

const pullCursorKey = 'pullCursor';

export const createIndexedDbSyncStore = (db: IDBDatabase, now: () => Date): SyncRepository => ({
  enqueueEvent: async (event) => {
    const record: ClientSyncEventRecord = { ...clone(event), failure: null, state: 'PENDING', updatedAt: now() };
    await putOne(db, storeNames.syncEvents, record);
    return clone(record);
  },
  findEventById: async (eventId) => {
    const event = await getOne<ClientSyncEventRecord>(db, storeNames.syncEvents, eventId);
    return event ? clone(event) : null;
  },
  getPullCursor: async () => {
    const record = await getOne<{ cursor: string | null; key: string }>(db, storeNames.meta, pullCursorKey);
    return record?.cursor ?? null;
  },
  listPushableEvents: async (limit) => {
    const all = await getAll<ClientSyncEventRecord>(db, storeNames.syncEvents);
    return all
      .filter((event) => event.state !== 'APPLIED')
      .sort(
        (left, right) =>
          left.createdAt.getTime() - right.createdAt.getTime() || left.eventId.localeCompare(right.eventId)
      )
      .slice(0, limit)
      .map(clone);
  },
  markEventApplied: async (eventId, receivedAt, updatedAt = now()) => {
    const event = await getOne<ClientSyncEventRecord>(db, storeNames.syncEvents, eventId);
    if (!event) {
      return;
    }
    await putOne(db, storeNames.syncEvents, { ...clone(event), failure: null, receivedAt, state: 'APPLIED', updatedAt });
  },
  markEventFailed: async (eventId, failure, updatedAt = now()) => {
    const event = await getOne<ClientSyncEventRecord>(db, storeNames.syncEvents, eventId);
    if (!event) {
      return;
    }
    await putOne(db, storeNames.syncEvents, { ...clone(event), failure: clone(failure), state: 'FAILED', updatedAt });
  },
  savePullCursor: async (cursor) => {
    await putOne(db, storeNames.meta, { cursor, key: pullCursorKey });
  }
});
