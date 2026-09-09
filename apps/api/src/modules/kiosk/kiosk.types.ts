import type { KioskOrderLineSnapshot, KioskOrderStatus } from '../../db/schema/kiosk-order.js';
import type { TerminalMode } from '../../db/schema/terminal-setting.js';

export type { KioskOrderLineSnapshot, KioskOrderStatus, TerminalMode };

export type KioskOrderRecord = {
  branchId: string;
  businessId: string;
  createdAt: Date;
  createdByUserId: string;
  expiresAt?: Date;
  gatewayOrderId?: string;
  gatewayPaymentRef?: string;
  id: string;
  items: KioskOrderLineSnapshot[];
  saleId?: string;
  status: KioskOrderStatus;
  tenantId: string;
  terminalId: string;
  tokenNumber: string;
  tokenSequence: number;
  tokenSequenceDate: string;
  totalAmount: number;
  updatedAt: Date;
};

export type CreateKioskOrderItemInput = {
  productId: string;
  quantity: number;
};

export type CreateKioskOrderInput = {
  branchId: string;
  items: CreateKioskOrderItemInput[];
  terminalId: string;
};

export type UpdateKioskOrderInput = Partial<
  Pick<KioskOrderRecord, 'expiresAt' | 'gatewayOrderId' | 'gatewayPaymentRef' | 'saleId' | 'status'>
>;

export type TerminalSettingsRecord = {
  createdAt: Date;
  gatewayTimeoutMinutes: number;
  id: string;
  kioskCollectsPayment: boolean;
  mode: TerminalMode;
  printDualTokens: boolean;
  tenantId: string;
  terminalId: string;
  updatedAt: Date;
};

export type SaveTerminalSettingsInput = {
  gatewayTimeoutMinutes: number;
  kioskCollectsPayment: boolean;
  mode: TerminalMode;
  printDualTokens: boolean;
  tenantId: string;
  terminalId: string;
};

export type UpdateTerminalSettingsInput = Partial<
  Pick<SaveTerminalSettingsInput, 'gatewayTimeoutMinutes' | 'kioskCollectsPayment' | 'mode' | 'printDualTokens'>
>;

export type KioskOrderView = {
  businessId: string;
  createdAt: string;
  expiresAt?: string;
  id: string;
  items: KioskOrderLineSnapshot[];
  paidStamp: boolean;
  paymentReference?: string;
  status: KioskOrderStatus;
  tokenNumber: string;
  totalAmount: number;
};

export type KioskOrderCreatedView = KioskOrderView & {
  gatewayQrImageUrl?: string;
};

export type TerminalSettingsView = {
  gatewayTimeoutMinutes: number;
  kioskCollectsPayment: boolean;
  mode: TerminalMode;
  printDualTokens: boolean;
  terminalId: string;
};
