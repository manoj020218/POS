import type {
  CategoryView,
  ProductView,
  TaxProfileView,
  UnitView
} from '../catalog/catalog.types.js';
import type { CustomerView } from '../customer/customer.types.js';

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
export type SyncPullCursor = {
  changeKey: string;
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
  cursor?: SyncPullCursor;
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

export type SyncPullAppliedEventRecord = Pick<
  SyncPushEventInput,
  'deviceId' | 'entityId' | 'eventId' | 'payload' | 'type'
> & {
  createdAt: string;
};

export type SyncPullProductRecord = ProductView & {
  createdAt: string;
  updatedAt: string;
};

export type SyncPullCategoryRecord = CategoryView & {
  createdAt: string;
  updatedAt: string;
};

export type SyncPullTaxProfileRecord = TaxProfileView & {
  createdAt: string;
  updatedAt: string;
};

export type SyncPullUnitRecord = UnitView & {
  createdAt: string;
  updatedAt: string;
};

export type SyncPullCustomerRecord = CustomerView & {
  createdAt: string;
  updatedAt: string;
};

export type SyncPullAppliedEventChange = {
  branchId: string;
  changeId: string;
  changeType: 'SYNC_EVENT_APPLIED';
  record: SyncPullAppliedEventRecord;
  source: 'CLIENT';
  updatedAt: string;
};

export type SyncPullProductChange = {
  businessId: string;
  changeId: string;
  changeType: 'PRODUCT_UPSERTED';
  record: SyncPullProductRecord;
  source: 'SERVER';
  updatedAt: string;
};

export type SyncPullCategoryChange = {
  businessId: string;
  changeId: string;
  changeType: 'CATEGORY_UPSERTED';
  record: SyncPullCategoryRecord;
  source: 'SERVER';
  updatedAt: string;
};

export type SyncPullTaxProfileChange = {
  businessId: string;
  changeId: string;
  changeType: 'TAX_PROFILE_UPSERTED';
  record: SyncPullTaxProfileRecord;
  source: 'SERVER';
  updatedAt: string;
};

export type SyncPullUnitChange = {
  businessId: string;
  changeId: string;
  changeType: 'UNIT_UPSERTED';
  record: SyncPullUnitRecord;
  source: 'SERVER';
  updatedAt: string;
};

export type SyncPullCustomerChange = {
  businessId: string;
  changeId: string;
  changeType: 'CUSTOMER_UPSERTED';
  record: SyncPullCustomerRecord;
  source: 'SERVER';
  updatedAt: string;
};

export type SyncPullChange =
  | SyncPullAppliedEventChange
  | SyncPullCategoryChange
  | SyncPullCustomerChange
  | SyncPullProductChange
  | SyncPullTaxProfileChange
  | SyncPullUnitChange;

export type SyncPullResult = {
  changes: SyncPullChange[];
  nextCursor: string | null;
  serverTime: string;
};
