import { randomUUID } from 'node:crypto';

import { assertSyncEventMatches } from './sync-event-signature.js';
import { buildSyncEventPullChangeKey, compareSyncPullOrder } from './sync-pull-cursor.js';
import type { SyncEventWriteResult, SyncRepository } from './sync.repository.js';
import type {
  CreateSyncEventInput,
  ListSyncPullEventsInput,
  SyncEventRecord,
  UpdateSyncEventStateInput
} from './sync.types.js';

export class InMemorySyncRepository implements SyncRepository {
  private readonly events = new Map<string, SyncEventRecord>();

  async createReceivedEvents(input: CreateSyncEventInput[]): Promise<SyncEventWriteResult[]> {
    input.forEach((event) => {
      const existing = this.events.get(getEventKey(event.tenantId, event.eventId));
      if (existing) {
        assertSyncEventMatches(toComparableEvent(existing), toComparableEvent(event), event.eventId);
      }
    });

    return input.map((event) => {
      const key = getEventKey(event.tenantId, event.eventId);
      const existing = this.events.get(key);
      if (existing) {
        return { event: existing, result: 'duplicate' };
      }

      const now = new Date();
      const record: SyncEventRecord = {
        ...event,
        failure: null,
        id: randomUUID(),
        receivedAt: now,
        state: 'RECEIVED',
        updatedAt: now
      };
      this.events.set(key, record);

      return { event: record, result: 'accepted' };
    });
  }

  async listPullEvents(input: ListSyncPullEventsInput): Promise<SyncEventRecord[]> {
    const allowedBranchIds = new Set(input.branchIds);

    return [...this.events.values()]
      .filter(
        (event) =>
          event.tenantId === input.tenantId &&
          event.state === 'APPLIED' &&
          allowedBranchIds.has(event.branchId) &&
          isAfterCursor(event, input.cursor)
      )
      .sort(compareForPull)
      .slice(0, input.limit);
  }

  async updateEventState(tenantId: string, eventId: string, input: UpdateSyncEventStateInput) {
    const key = getEventKey(tenantId, eventId);
    const existing = this.events.get(key);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      failure: input.failure,
      state: input.state,
      updatedAt: new Date()
    };
    this.events.set(key, updated);

    return updated;
  }
}

const getEventKey = (tenantId: string, eventId: string) => `${tenantId}:${eventId}`;

const toComparableEvent = (event: Pick<SyncEventRecord, 'branchId' | 'deviceId' | 'entityId' | 'eventCreatedAt' | 'payload' | 'type'>) => ({
  branchId: event.branchId,
  deviceId: event.deviceId,
  entityId: event.entityId,
  eventCreatedAt: event.eventCreatedAt,
  payload: event.payload,
  type: event.type
});

const compareForPull = (left: SyncEventRecord, right: SyncEventRecord) =>
  compareSyncPullOrder(
    { changeKey: buildSyncEventPullChangeKey(left.eventId), updatedAt: left.updatedAt },
    { changeKey: buildSyncEventPullChangeKey(right.eventId), updatedAt: right.updatedAt }
  );

const isAfterCursor = (event: SyncEventRecord, cursor?: ListSyncPullEventsInput['cursor']) => {
  if (!cursor) {
    return true;
  }

  return (
    event.updatedAt.getTime() > cursor.updatedAt.getTime() ||
    (event.updatedAt.getTime() === cursor.updatedAt.getTime() &&
      buildSyncEventPullChangeKey(event.eventId).localeCompare(cursor.changeKey) > 0)
  );
};
