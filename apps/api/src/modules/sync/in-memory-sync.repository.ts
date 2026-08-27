import { randomUUID } from 'node:crypto';

import { assertSyncEventMatches } from './sync-event-signature.js';
import type { SyncEventWriteResult, SyncRepository } from './sync.repository.js';
import type {
  CreateSyncEventInput,
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

      const record: SyncEventRecord = {
        ...event,
        failure: null,
        id: randomUUID(),
        receivedAt: new Date(),
        state: 'RECEIVED'
      };
      this.events.set(key, record);

      return { event: record, result: 'accepted' };
    });
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
      state: input.state
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
