export const syncEventStates = ['RECEIVED', 'APPLIED', 'FAILED'] as const;
export type SyncEventState = (typeof syncEventStates)[number];
export type SyncEventPayload = Record<string, unknown>;
export type SyncPushDisposition = 'accepted' | 'duplicate';
export type SyncEventFailure = {
  code: string;
  failedAt: Date;
  message: string;
  statusCode: number;
};
export type SyncEventCursor = {
  eventId: string;
  updatedAt: Date;
};

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
  failure: SyncEventFailure | null;
  id: string;
  receivedAt: Date;
  state: SyncEventState;
  updatedAt: Date;
};

export type UpdateSyncEventStateInput = {
  failure: SyncEventFailure | null;
  state: SyncEventState;
};

export type ListSyncPullEventsInput = {
  branchIds: string[];
  cursor?: SyncEventCursor;
  limit: number;
  tenantId: string;
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

export type SyncPullQuery = {
  branchId?: string;
  cursor?: string;
  limit: number;
};

export type SyncPullChange = Pick<
  SyncPushEventInput,
  'branchId' | 'deviceId' | 'entityId' | 'eventId' | 'payload' | 'type'
> & {
  createdAt: string;
  updatedAt: string;
};

export type SyncPullResult = {
  changes: SyncPullChange[];
  nextCursor: string | null;
  serverTime: string;
};
