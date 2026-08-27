import { randomUUID } from 'node:crypto';

import { and, asc, eq, gt, inArray, or } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { syncEvents } from '../../db/schema/index.js';
import { assertSyncEventMatches } from './sync-event-signature.js';
import type { SyncEventWriteResult, SyncRepository } from './sync.repository.js';
import type {
  CreateSyncEventInput,
  ListSyncPullEventsInput,
  SyncEventFailure,
  SyncEventRecord,
  UpdateSyncEventStateInput
} from './sync.types.js';

type SyncEventRow = typeof syncEvents.$inferSelect;

export class DrizzleSyncRepository implements SyncRepository {
  constructor(private readonly db: AppDatabase) {}

  async createReceivedEvents(input: CreateSyncEventInput[]): Promise<SyncEventWriteResult[]> {
    return this.db.transaction(async (tx) => {
      const results: SyncEventWriteResult[] = [];

      for (const event of input) {
        const [inserted] = await tx
          .insert(syncEvents)
          .values({
            branchId: event.branchId,
            deviceId: event.deviceId,
            entityId: event.entityId,
            eventCreatedAt: event.eventCreatedAt,
            eventId: event.eventId,
            eventType: event.type,
            id: randomUUID(),
            payload: event.payload,
            state: 'RECEIVED',
            tenantId: event.tenantId
          })
          .onConflictDoNothing({ target: [syncEvents.tenantId, syncEvents.eventId] })
          .returning();

        if (inserted) {
          results.push({ event: toSyncEventRecord(inserted), result: 'accepted' });
          continue;
        }

        const [existing] = await tx
          .select()
          .from(syncEvents)
          .where(and(eq(syncEvents.tenantId, event.tenantId), eq(syncEvents.eventId, event.eventId)));
        if (!existing) {
          throw new Error('Sync event missing after conflict lookup');
        }

        assertSyncEventMatches(toComparableEvent(existing), toComparableEvent(event), event.eventId);
        results.push({ event: toSyncEventRecord(existing), result: 'duplicate' });
      }

      return results;
    });
  }

  async listPullEvents(input: ListSyncPullEventsInput): Promise<SyncEventRecord[]> {
    if (input.branchIds.length === 0) {
      return [];
    }

    const rows = await this.db
      .select()
      .from(syncEvents)
      .where(buildPullWhere(input))
      .orderBy(asc(syncEvents.updatedAt), asc(syncEvents.eventId))
      .limit(input.limit);

    return rows.map(toSyncEventRecord);
  }

  async updateEventState(tenantId: string, eventId: string, input: UpdateSyncEventStateInput) {
    const [updated] = await this.db
      .update(syncEvents)
      .set({
        failedAt: input.failure?.failedAt ?? null,
        failureCode: input.failure?.code ?? null,
        failureMessage: input.failure?.message ?? null,
        failureStatusCode: input.failure?.statusCode ?? null,
        state: input.state,
        updatedAt: new Date()
      })
      .where(and(eq(syncEvents.tenantId, tenantId), eq(syncEvents.eventId, eventId)))
      .returning();

    return updated ? toSyncEventRecord(updated) : null;
  }
}

const toSyncEventRecord = (record: SyncEventRow): SyncEventRecord => ({
  branchId: record.branchId,
  deviceId: record.deviceId,
  entityId: record.entityId,
  eventCreatedAt: record.eventCreatedAt,
  eventId: record.eventId,
  failure: toSyncEventFailure(record),
  id: record.id,
  payload: record.payload,
  receivedAt: record.receivedAt,
  state: record.state as SyncEventRecord['state'],
  tenantId: record.tenantId,
  type: record.eventType,
  updatedAt: record.updatedAt
});

const buildPullWhere = (input: ListSyncPullEventsInput) => {
  const base = [
    eq(syncEvents.tenantId, input.tenantId),
    eq(syncEvents.state, 'APPLIED'),
    inArray(syncEvents.branchId, input.branchIds)
  ];

  if (!input.cursor) {
    return and(...base);
  }

  return and(
    ...base,
    or(
      gt(syncEvents.updatedAt, input.cursor.updatedAt),
      and(eq(syncEvents.updatedAt, input.cursor.updatedAt), gt(syncEvents.eventId, input.cursor.eventId))
    )
  );
};

const toSyncEventFailure = (record: SyncEventRow): SyncEventFailure | null => {
  if (!record.failedAt || !record.failureCode || !record.failureMessage || !record.failureStatusCode) {
    return null;
  }

  return {
    code: record.failureCode,
    failedAt: record.failedAt,
    message: record.failureMessage,
    statusCode: record.failureStatusCode
  };
};

const toComparableEvent = (
  event:
    | Pick<SyncEventRecord, 'branchId' | 'deviceId' | 'entityId' | 'eventCreatedAt' | 'payload' | 'type'>
    | SyncEventRow
) => ({
  branchId: event.branchId,
  deviceId: event.deviceId,
  entityId: event.entityId,
  eventCreatedAt: event.eventCreatedAt,
  payload: event.payload,
  type: 'eventType' in event ? event.eventType : event.type
});
