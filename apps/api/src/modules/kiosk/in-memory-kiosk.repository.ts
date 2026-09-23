import { randomUUID } from 'node:crypto';

import type { KioskRepository } from './kiosk.repository.js';
import type {
  CreateKioskOrderInput,
  KioskOrderRecord,
  SaveTerminalSettingsInput,
  TerminalSettingsRecord,
  UpdateKioskOrderInput
} from './kiosk.types.js';

export class InMemoryKioskRepository implements KioskRepository {
  private readonly kioskOrders = new Map<string, KioskOrderRecord>();
  private readonly terminalSettings = new Map<string, TerminalSettingsRecord>();
  private readonly tokenSequences = new Map<string, number>();

  async allocateTokenNumber(tenantId: string, terminalId: string, sequenceDate: string) {
    void tenantId;
    const key = `${terminalId}:${sequenceDate}`;
    const next = (this.tokenSequences.get(key) ?? 0) + 1;
    this.tokenSequences.set(key, next);
    return { sequence: next };
  }

  async createKioskOrder(
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
  ) {
    const now = new Date();
    const record: KioskOrderRecord = {
      branchId: input.branchId,
      businessId: input.businessId,
      createdAt: now,
      createdByUserId: input.createdByUserId,
      id: randomUUID(),
      items: input.items,
      status: 'UNPAID_TOKEN',
      tenantId: input.tenantId,
      terminalId: input.terminalId,
      tokenNumber: input.tokenNumber,
      tokenSequence: input.tokenSequence,
      tokenSequenceDate: input.tokenSequenceDate,
      totalAmount: input.totalAmount,
      updatedAt: now
    };
    this.kioskOrders.set(record.id, record);
    return record;
  }

  async findKioskOrderById(id: string) {
    return this.kioskOrders.get(id) ?? null;
  }

  async findKioskOrderByGatewayOrderId(gatewayOrderId: string) {
    return [...this.kioskOrders.values()].find((order) => order.gatewayOrderId === gatewayOrderId) ?? null;
  }

  async findTerminalSettings(tenantId: string, terminalId: string) {
    const record = this.terminalSettings.get(terminalId);
    return record?.tenantId === tenantId ? record : null;
  }

  async listActiveKioskOrders(tenantId: string, businessIds: string[]) {
    const allowed = new Set(businessIds);
    return [...this.kioskOrders.values()]
      .filter(
        (order) =>
          order.tenantId === tenantId &&
          allowed.has(order.businessId) &&
          (order.status === 'AWAITING_PAYMENT' || order.status === 'UNPAID_TOKEN')
      )
      .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  }

  async listExpiredAwaitingPayment(tenantId: string, before: Date) {
    return [...this.kioskOrders.values()].filter(
      (order) =>
        order.tenantId === tenantId &&
        order.status === 'AWAITING_PAYMENT' &&
        order.expiresAt !== undefined &&
        order.expiresAt <= before
    );
  }

  async updateKioskOrder(id: string, tenantId: string, input: UpdateKioskOrderInput) {
    const existing = this.kioskOrders.get(id);
    if (!existing || existing.tenantId !== tenantId) {
      return null;
    }

    const updated: KioskOrderRecord = { ...existing, ...input, updatedAt: new Date() };
    this.kioskOrders.set(id, updated);
    return updated;
  }

  async upsertTerminalSettings(input: SaveTerminalSettingsInput) {
    const existing = this.terminalSettings.get(input.terminalId);
    const now = new Date();
    const record: TerminalSettingsRecord = {
      createdAt: existing?.createdAt ?? now,
      gatewayTimeoutMinutes: input.gatewayTimeoutMinutes,
      id: existing?.id ?? randomUUID(),
      kioskCollectsPayment: input.kioskCollectsPayment,
      mode: input.mode,
      printDualTokens: input.printDualTokens,
      showWalkInCustomer: input.showWalkInCustomer,
      tenantId: input.tenantId,
      terminalId: input.terminalId,
      updatedAt: now
    };
    this.terminalSettings.set(input.terminalId, record);
    return record;
  }
}
