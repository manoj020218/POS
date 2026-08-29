import type {
  ClientBusinessSettings,
  ClientCustomerRecord,
  ClientProductRecord,
  ClientRemoteCustomerSnapshot,
  ClientRemoteProductSnapshot,
  ClientTerminalContext
} from '../src/index.js';

export const terminalContext: ClientTerminalContext = {
  branchCode: 'MAIN',
  branchId: '11111111-1111-4111-8111-111111111111',
  branchName: 'Main Branch',
  businessId: '22222222-2222-4222-8222-222222222222',
  businessName: 'Smart POS Foods',
  cashierName: 'Asha',
  cashierUserId: '33333333-3333-4333-8333-333333333333',
  deviceId: 'device-01',
  terminalCode: 'POS1',
  terminalId: '44444444-4444-4444-8444-444444444444',
  terminalName: 'Counter 1'
};

export const createSettings = (autoPrintReceipt = true): ClientBusinessSettings => ({
  branches: [
    {
      branchCode: terminalContext.branchCode,
      branchId: terminalContext.branchId,
      branchName: terminalContext.branchName,
      receiptPrinterProfile: {
        autoPrintReceipt,
        connectionType: 'SYSTEM',
        name: 'Counter Queue',
        paperWidth: '80mm'
      }
    }
  ],
  businessCode: 'SMART-POS-FOODS',
  businessId: terminalContext.businessId,
  businessName: terminalContext.businessName,
  currencyCode: 'INR',
  defaultTrackInventory: true,
  invoicePrefix: 'INV',
  receiptFooter: 'Visit again',
  timezone: 'Asia/Kolkata'
});

export const createProduct = (overrides: Partial<ClientProductRecord> = {}): ClientProductRecord => ({
  barcode: '8901234567890',
  businessCode: 'SMART-POS-FOODS',
  businessId: terminalContext.businessId,
  businessName: terminalContext.businessName,
  categoryCode: 'GENERAL',
  categoryId: '55555555-5555-4555-8555-555555555555',
  categoryName: 'General',
  id: '66666666-6666-4666-8666-666666666666',
  isActive: true,
  lowStockLevel: 2,
  name: 'Masala Dosa',
  openingStock: 10,
  sellingPrice: 12000,
  sku: 'DOSA-001',
  taxProfileCode: 'GST-5',
  taxProfileId: '77777777-7777-4777-8777-777777777777',
  taxProfileName: 'GST 5%',
  taxRateBasisPoints: 500,
  trackInventory: true,
  unitCode: 'PCS',
  unitId: '88888888-8888-4888-8888-888888888888',
  unitName: 'PCS',
  unitPrecision: 0,
  unitSymbol: 'pcs',
  updatedAt: new Date('2026-08-29T10:00:00.000Z'),
  ...overrides
});

export const createCustomer = (overrides: Partial<ClientCustomerRecord> = {}): ClientCustomerRecord => ({
  businessCode: 'SMART-POS-FOODS',
  businessId: terminalContext.businessId,
  businessName: terminalContext.businessName,
  id: '99999999-9999-4999-8999-999999999999',
  isActive: true,
  isWalkIn: false,
  mobile: '9876543210',
  name: 'Walk-in Customer',
  updatedAt: new Date('2026-08-29T10:05:00.000Z'),
  ...overrides
});

export const createRemoteProductSnapshot = (
  overrides: Partial<ClientRemoteProductSnapshot> = {}
): ClientRemoteProductSnapshot => {
  const product = createProduct();

  return {
    ...product,
    createdAt: '2026-08-29T11:00:00.000Z',
    updatedAt: '2026-08-29T11:05:00.000Z',
    ...overrides
  };
};

export const createRemoteCustomerSnapshot = (
  overrides: Partial<ClientRemoteCustomerSnapshot> = {}
): ClientRemoteCustomerSnapshot => {
  const customer = createCustomer();

  return {
    ...customer,
    createdAt: '2026-08-29T11:10:00.000Z',
    updatedAt: '2026-08-29T11:15:00.000Z',
    ...overrides
  };
};
