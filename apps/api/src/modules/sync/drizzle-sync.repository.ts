import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { syncEvents } from '../../db/schema/index.js';
import { assertSyncEventMatches } from './sync-event-signature.js';
import type { SyncEventWriteResult, SyncRepository } from './sync.repository.js';
import type {
  CreateSyncEventInput,
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

  async updateEventState(tenantId: string, eventId: string, input: UpdateSyncEventStateInput) {
    const [updated] = await this.db
      .update(syncEvents)
      .set({
        failedAt: input.failure?.failedAt ?? null,
        failureCode: input.failure?.code ?? null,
        failureMessage: input.failure?.message ?? null,
        failureStatusCode: input.failure?.statusCode ?? null,
        state: input.state
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
  type: record.eventType
});

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
