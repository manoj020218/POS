import { SyncEventConflictError } from './sync.repository.js';

type ComparableSyncEvent = {
  branchId: string;
  deviceId: string;
  entityId: string;
  eventCreatedAt: Date;
  payload: Record<string, unknown>;
  type: string;
};

export const assertSyncEventMatches = (
  existing: ComparableSyncEvent,
  incoming: ComparableSyncEvent,
  eventId: string
) => {
  if (buildSyncEventSignature(existing) !== buildSyncEventSignature(incoming)) {
    throw new SyncEventConflictError(eventId);
  }
};

const buildSyncEventSignature = (event: ComparableSyncEvent) =>
  [
    event.branchId,
    event.deviceId,
    event.entityId,
    event.eventCreatedAt.toISOString(),
    event.type,
    toStableJson(event.payload)
  ].join('|');

const toStableJson = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map((item) => toStableJson(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${toStableJson(item)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};
