import type {
  CreateSyncEventInput,
  ListSyncPullEventsInput,
  SyncEventRecord,
  UpdateSyncEventStateInput
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
  listPullEvents(input: ListSyncPullEventsInput): Promise<SyncEventRecord[]>;
  updateEventState(
    tenantId: string,
    eventId: string,
    input: UpdateSyncEventStateInput
  ): Promise<SyncEventRecord | null>;
}
