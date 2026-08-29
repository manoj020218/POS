export const clientSyncEventStates = ['PENDING', 'APPLIED', 'FAILED'] as const;

export type ClientSyncEventState = (typeof clientSyncEventStates)[number];

export type ClientSyncFailure = {
  code: string;
  failedAt: Date;
  message: string;
  statusCode: number;
};

export type ClientSyncEventRecord = {
  branchId: string;
  createdAt: Date;
  deviceId: string;
  entityId: string;
  eventId: string;
  failure: ClientSyncFailure | null;
  payload: Record<string, unknown>;
  receivedAt?: Date;
  state: ClientSyncEventState;
  type: string;
  updatedAt: Date;
};

export interface SyncRepository {
  enqueueEvent(
    event: Omit<ClientSyncEventRecord, 'failure' | 'receivedAt' | 'state' | 'updatedAt'>
  ): Promise<ClientSyncEventRecord>;
  findEventById(eventId: string): Promise<ClientSyncEventRecord | null>;
  getPullCursor(): Promise<string | null>;
  listPushableEvents(limit: number): Promise<ClientSyncEventRecord[]>;
  markEventApplied(eventId: string, receivedAt: Date, updatedAt?: Date): Promise<void>;
  markEventFailed(eventId: string, failure: ClientSyncFailure, updatedAt?: Date): Promise<void>;
  savePullCursor(cursor: string | null): Promise<void>;
}
