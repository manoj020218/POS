import type {
  CreateSyncEventInput,
  SyncEventRecord,
  SyncEventState
} from './sync.types.js';

export type SyncEventWriteResult = {
  event: SyncEventRecord;
  result: 'accepted' | 'duplicate';
};

export class SyncEventConflictError extends Error {
  constructor(readonly eventId: string) {
    super(`Sync event ${eventId} conflicts with an existing event`);
    this.name = 'SyncEventConflictError';
  }
}

export interface SyncRepository {
  createReceivedEvents(input: CreateSyncEventInput[]): Promise<SyncEventWriteResult[]>;
  updateEventState(
    tenantId: string,
    eventId: string,
    state: SyncEventState
  ): Promise<SyncEventRecord | null>;
}
