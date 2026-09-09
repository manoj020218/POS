import type {
  CreateKioskOrderInput,
  KioskOrderRecord,
  SaveTerminalSettingsInput,
  TerminalSettingsRecord,
  UpdateKioskOrderInput
} from './kiosk.types.js';

export interface KioskRepository {
  allocateTokenNumber(
    tenantId: string,
    terminalId: string,
    sequenceDate: string
  ): Promise<{ sequence: number }>;
  createKioskOrder(
    input: CreateKioskOrderInput & {
      businessId: string;
      createdByUserId: string;
      items: KioskOrderRecord['items'];
      tenantId: string;
      tokenNumber: string;
      tokenSequence: number;
      tokenSequenceDate: string;
      totalAmount: number;
    }
  ): Promise<KioskOrderRecord>;
  findKioskOrderById(id: string): Promise<KioskOrderRecord | null>;
  findKioskOrderByGatewayOrderId(gatewayOrderId: string): Promise<KioskOrderRecord | null>;
  findTerminalSettings(tenantId: string, terminalId: string): Promise<TerminalSettingsRecord | null>;
  listActiveKioskOrders(tenantId: string, businessIds: string[]): Promise<KioskOrderRecord[]>;
  listExpiredAwaitingPayment(tenantId: string, before: Date): Promise<KioskOrderRecord[]>;
  updateKioskOrder(
    id: string,
    tenantId: string,
    input: UpdateKioskOrderInput
  ): Promise<KioskOrderRecord | null>;
  upsertTerminalSettings(input: SaveTerminalSettingsInput): Promise<TerminalSettingsRecord>;
}
