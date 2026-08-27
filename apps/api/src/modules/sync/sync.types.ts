export const syncEventStates = ['RECEIVED', 'APPLIED', 'FAILED'] as const;
export type SyncEventState = (typeof syncEventStates)[number];
export type SyncEventPayload = Record<string, unknown>;
export type SyncPushDisposition = 'accepted' | 'duplicate';

export type SyncPushEventInput = {
  branchId: string;
  createdAt: Date;
  deviceId: string;
  entityId: string;
  eventId: string;
  payload: SyncEventPayload;
  type: string;
};

export type SyncPushRequest = {
  events: SyncPushEventInput[];
};

export type CreateSyncEventInput = Omit<SyncPushEventInput, 'createdAt'> & {
  eventCreatedAt: Date;
  tenantId: string;
};

export type SyncEventRecord = CreateSyncEventInput & {
  id: string;
  receivedAt: Date;
  state: SyncEventState;
};

export type SyncPushEventResult = Pick<SyncPushEventInput, 'branchId' | 'entityId' | 'eventId' | 'type'> & {
  receivedAt: string;
  result: SyncPushDisposition;
  state: SyncEventState;
};

export type SyncPushResult = {
  acceptedCount: number;
  duplicateCount: number;
  events: SyncPushEventResult[];
};
