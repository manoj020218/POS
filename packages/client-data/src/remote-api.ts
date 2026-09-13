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
  taxProfileId?: string;
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

export type ClientRemoteTaxProfileView = {
  code: string;
  id: string;
  isActive: boolean;
  name: string;
  rateBasisPoints: number;
};

export type ClientRemoteTaxProfileCreateInput = {
  businessId?: string;
  code?: string;
  isActive?: boolean;
  name: string;
  rateBasisPoints?: number;
};

export type ClientRemoteTaxProfileUpdateInput = Partial<Omit<ClientRemoteTaxProfileCreateInput, 'businessId'>>;

export type ClientProductListMeta = {
  hasNextPage: boolean;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type ClientKioskOrderLine = {
  lineTotal: number;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
};

export type ClientKioskOrderStatus = 'AWAITING_PAYMENT' | 'UNPAID_TOKEN' | 'FULFILLED' | 'EXPIRED' | 'CANCELLED';

export type ClientKioskOrderView = {
  businessId: string;
  createdAt: string;
  expiresAt?: string;
  id: string;
  items: ClientKioskOrderLine[];
  paidStamp: boolean;
  paymentReference?: string;
  status: ClientKioskOrderStatus;
  tokenNumber: string;
  totalAmount: number;
};

export type ClientKioskOrderCreatedView = ClientKioskOrderView & {
  gatewayQrImageUrl?: string;
};

export type ClientCreateKioskOrderInput = {
  branchId: string;
  items: Array<{ productId: string; quantity: number }>;
  terminalId: string;
};

export type ClientTerminalMode = 'BILLING_POS' | 'SELF_SERVICE_KIOSK';

export type ClientTerminalSettings = {
  gatewayTimeoutMinutes: number;
  kioskCollectsPayment: boolean;
  mode: ClientTerminalMode;
  printDualTokens: boolean;
  terminalId: string;
};

export type ClientUpdateTerminalSettingsInput = Partial<
  Pick<ClientTerminalSettings, 'gatewayTimeoutMinutes' | 'kioskCollectsPayment' | 'mode' | 'printDualTokens'>
>;

export type ClientPaymentGatewayCode = 'razorpay';

export type ClientPaymentGatewayCard = {
  code: ClientPaymentGatewayCode;
  configured: boolean;
  isEnabled: boolean;
  label: string;
  updatedAt?: string;
};

export type ClientUpdatePaymentGatewayCredentialsInput = {
  businessId?: string;
  credentials?: Record<string, string>;
  isEnabled?: boolean;
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
  createKioskOrder(input: ClientCreateKioskOrderInput): Promise<ClientKioskOrderCreatedView>;
  createProduct(input: ClientRemoteProductCreateInput): Promise<ClientRemoteProductView>;
  createTaxProfile(input: ClientRemoteTaxProfileCreateInput): Promise<ClientRemoteTaxProfileView>;
  fulfillKioskOrder(orderId: string, saleId: string): Promise<ClientKioskOrderView>;
  getBusinessSettings(input?: { businessId?: string }): Promise<ClientBusinessSettings>;
  getKioskOrder(orderId: string): Promise<ClientKioskOrderView>;
  getProductPriceHistory(productId: string): Promise<ClientRemoteProductPriceChange[]>;
  getTerminalSettings(terminalId: string): Promise<ClientTerminalSettings>;
  listBranches(): Promise<ClientRemoteBranchSummary[]>;
  listKioskOrders(businessId?: string): Promise<ClientKioskOrderView[]>;
  listProducts(query?: {
    businessId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: ClientRemoteProductView[]; meta: ClientProductListMeta }>;
  listPaymentGatewayCards(businessId?: string): Promise<ClientPaymentGatewayCard[]>;
  listTaxProfiles(input?: { businessId?: string }): Promise<ClientRemoteTaxProfileView[]>;
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
  updatePaymentGatewayCredentials(
    gatewayCode: ClientPaymentGatewayCode,
    input: ClientUpdatePaymentGatewayCredentialsInput
  ): Promise<ClientPaymentGatewayCard>;
  updateTaxProfile(
    taxProfileId: string,
    input: ClientRemoteTaxProfileUpdateInput
  ): Promise<ClientRemoteTaxProfileView>;
  updateTerminalSettings(
    terminalId: string,
    input: ClientUpdateTerminalSettingsInput
  ): Promise<ClientTerminalSettings>;
  uploadProductImage(file: Blob, filename: string): Promise<{ url: string }>;
}
