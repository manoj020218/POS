import type { ReceiptPrinterProfile } from '@smart-pos/printer';

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

export type ClientRemoteProductView = {
  barcode?: string;
  brand?: string;
  businessCode: string;
  businessId: string;
  businessName: string;
  categoryCode: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  hsnSac?: string;
  id: string;
  imageUrl?: string;
  isActive: boolean;
  lowStockLevel: number;
  name: string;
  openingStock: number;
  purchasePrice?: number;
  sellingPrice: number;
  sku?: string;
  taxProfileCode: string;
  taxProfileId: string;
  taxProfileName: string;
  taxRateBasisPoints: number;
  trackInventory: boolean;
  unitCode: string;
  unitId: string;
  unitName: string;
  unitPrecision: number;
  unitSymbol?: string;
};

export type ClientRemoteProductCreateInput = {
  barcode?: string;
  brand?: string;
  businessId?: string;
  categoryId?: string;
  description?: string;
  hsnSac?: string;
  imageUrl?: string;
  lowStockLevel?: number;
  name: string;
  openingStock?: number;
  purchasePrice?: number;
  sellingPrice: number;
  sku?: string;
  trackInventory?: boolean;
  unitId?: string;
};

export type ClientRemoteProductUpdateInput = Partial<ClientRemoteProductCreateInput>;

export type ClientRemoteProductPriceChange = {
  changedAt: string;
  newPrice: number;
  previousPrice: number;
};

export type ClientRemoteUnitSummary = {
  code: string;
  id: string;
  isActive: boolean;
  name: string;
  precision: number;
  symbol?: string;
};

export type ClientProductListMeta = {
  hasNextPage: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ClientUpdateBusinessSettingsInput = {
  branches?: Array<{
    address?: string;
    branchId: string;
    receiptPrinterProfile?: ReceiptPrinterProfile | null;
  }>;
  businessId?: string;
  businessLogoUrl?: string | null;
  businessType?: string;
  currencyCode?: string;
  defaultTaxProfileId?: string | null;
  defaultTrackInventory?: boolean;
  defaultUnitId?: string | null;
  invoicePrefix?: string;
  receiptFooter?: string | null;
  timezone?: string;
};

export interface ClientRemoteApi {
  createProduct(input: ClientRemoteProductCreateInput): Promise<ClientRemoteProductView>;
  getBusinessSettings(input?: { businessId?: string }): Promise<ClientBusinessSettings>;
  getProductPriceHistory(productId: string): Promise<ClientRemoteProductPriceChange[]>;
  listBranches(): Promise<ClientRemoteBranchSummary[]>;
  listProducts(query?: {
    businessId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: ClientRemoteProductView[]; meta: ClientProductListMeta }>;
  listTerminals(input?: { branchId?: string }): Promise<ClientRemoteTerminalSummary[]>;
  listUnits(input?: { businessId?: string }): Promise<ClientRemoteUnitSummary[]>;
  pullChanges(query: ClientRemoteSyncPullQuery): Promise<ClientRemoteSyncPullResult>;
  pushEvents(input: {
    events: ClientRemoteSyncEventInput[];
  }): Promise<ClientRemoteSyncPushResult>;
  updateBusinessSettings(input: ClientUpdateBusinessSettingsInput): Promise<ClientBusinessSettings>;
  updateProduct(
    productId: string,
    input: ClientRemoteProductUpdateInput
  ): Promise<ClientRemoteProductView>;
  uploadProductImage(file: Blob, filename: string): Promise<{ url: string }>;
}
