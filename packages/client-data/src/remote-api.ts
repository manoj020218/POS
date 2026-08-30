import type { ClientCustomerRecord } from './customer-repository.js';
import type { ClientProductRecord } from './product-repository.js';
import type { ClientBusinessSettings } from './settings-repository.js';

export type ClientRemoteSyncEventInput = {
  branchId: string;
  createdAt: string;
  deviceId: string;
  entityId: string;
  eventId: string;
  payload: Record<string, unknown>;
  type: string;
};

export type ClientRemoteSyncPushEventResult = Pick<
  ClientRemoteSyncEventInput,
  'branchId' | 'entityId' | 'eventId' | 'type'
> & {
  receivedAt: string;
  result: 'accepted' | 'duplicate';
  state: 'RECEIVED' | 'APPLIED' | 'FAILED';
};

export type ClientRemoteSyncPushResult = {
  acceptedCount: number;
  duplicateCount: number;
  events: ClientRemoteSyncPushEventResult[];
};

export type ClientRemoteProductSnapshot = Omit<ClientProductRecord, 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type ClientRemoteCustomerSnapshot = Omit<ClientCustomerRecord, 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type ClientRemoteSyncPullChange =
  | {
      branchId: string;
      changeId: string;
      changeType: 'SYNC_EVENT_APPLIED';
      record: Pick<ClientRemoteSyncEventInput, 'createdAt' | 'deviceId' | 'entityId' | 'eventId' | 'payload' | 'type'>;
      source: 'CLIENT';
      updatedAt: string;
    }
  | {
      businessId: string;
      changeId: string;
      changeType: 'PRODUCT_UPSERTED';
      record: ClientRemoteProductSnapshot;
      source: 'SERVER';
      updatedAt: string;
    }
  | {
      businessId: string;
      changeId: string;
      changeType: 'CUSTOMER_UPSERTED';
      record: ClientRemoteCustomerSnapshot;
      source: 'SERVER';
      updatedAt: string;
    }
  | {
      businessId: string;
      changeId: string;
      changeType: 'CATEGORY_UPSERTED' | 'UNIT_UPSERTED' | 'TAX_PROFILE_UPSERTED';
      record: Record<string, unknown>;
      source: 'SERVER';
      updatedAt: string;
    };

export type ClientRemoteSyncPullQuery = {
  branchId?: string;
  cursor?: string;
  limit: number;
};

export type ClientRemoteSyncPullResult = {
  changes: ClientRemoteSyncPullChange[];
  nextCursor: string | null;
  serverTime: string;
};

export type ClientRemoteBranchSummary = {
  address?: string;
  businessId: string;
  code: string;
  id: string;
  isActive: boolean;
  name: string;
};

export type ClientRemoteTerminalSummary = {
  branchId: string;
  code: string;
  id: string;
  isActive: boolean;
  name: string;
};

export interface ClientRemoteApi {
  getBusinessSettings(input?: { businessId?: string }): Promise<ClientBusinessSettings>;
  listBranches(): Promise<ClientRemoteBranchSummary[]>;
  listTerminals(input?: { branchId?: string }): Promise<ClientRemoteTerminalSummary[]>;
  pullChanges(query: ClientRemoteSyncPullQuery): Promise<ClientRemoteSyncPullResult>;
  pushEvents(input: {
    events: ClientRemoteSyncEventInput[];
  }): Promise<ClientRemoteSyncPushResult>;
}
