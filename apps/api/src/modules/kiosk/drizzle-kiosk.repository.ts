import { randomUUID } from 'node:crypto';

import { and, asc, eq, inArray, lte, or, sql } from 'drizzle-orm';

import type { AppDatabase } from '../../db/client.js';
import { kioskOrders, kioskTokenSequences, terminalSettings } from '../../db/schema/index.js';
import type { KioskRepository } from './kiosk.repository.js';
import type {
  CreateKioskOrderInput,
  KioskOrderRecord,
  SaveTerminalSettingsInput,
  TerminalSettingsRecord,
  UpdateKioskOrderInput
} from './kiosk.types.js';

export class DrizzleKioskRepository implements KioskRepository {
  constructor(private readonly db: AppDatabase) {}

  async allocateTokenNumber(tenantId: string, terminalId: string, sequenceDate: string) {
    const [row] = await this.db
      .insert(kioskTokenSequences)
      .values({ lastValue: 1, sequenceDate, tenantId, terminalId, updatedAt: new Date() })
      .onConflictDoUpdate({
        set: { lastValue: sql`${kioskTokenSequences.lastValue} + 1`, updatedAt: new Date() },
        target: [kioskTokenSequences.terminalId, kioskTokenSequences.sequenceDate]
      })
      .returning({ lastValue: kioskTokenSequences.lastValue });

    return { sequence: row!.lastValue };
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
    const [record] = await this.db
      .insert(kioskOrders)
      .values({
        branchId: input.branchId,
        businessId: input.businessId,
        createdByUserId: input.createdByUserId,
        id: randomUUID(),
        items: input.items,
        status: 'UNPAID_TOKEN',
        tenantId: input.tenantId,
        terminalId: input.terminalId,
        tokenNumber: input.tokenNumber,
        tokenSequence: input.tokenSequence,
        tokenSequenceDate: input.tokenSequenceDate,
        totalAmount: input.totalAmount
      })
      .returning();

    return normalizeKioskOrder(record!);
  }

  async findKioskOrderById(id: string) {
    const [record] = await this.db.select().from(kioskOrders).where(eq(kioskOrders.id, id)).limit(1);
    return record ? normalizeKioskOrder(record) : null;
  }

  async findKioskOrderByGatewayOrderId(gatewayOrderId: string) {
    const [record] = await this.db
      .select()
      .from(kioskOrders)
      .where(eq(kioskOrders.gatewayOrderId, gatewayOrderId))
      .limit(1);
    return record ? normalizeKioskOrder(record) : null;
  }

  async findTerminalSettings(tenantId: string, terminalId: string) {
    const [record] = await this.db
      .select()
      .from(terminalSettings)
      .where(and(eq(terminalSettings.tenantId, tenantId), eq(terminalSettings.terminalId, terminalId)))
      .limit(1);
    return record ? normalizeTerminalSettings(record) : null;
  }

  async listActiveKioskOrders(tenantId: string, businessIds: string[]) {
    if (businessIds.length === 0) {
      return [];
    }

    const records = await this.db
      .select()
      .from(kioskOrders)
      .where(
        and(
          eq(kioskOrders.tenantId, tenantId),
          inArray(kioskOrders.businessId, businessIds),
          or(eq(kioskOrders.status, 'AWAITING_PAYMENT'), eq(kioskOrders.status, 'UNPAID_TOKEN'))
        )
      )
      .orderBy(asc(kioskOrders.createdAt));

    return records.map(normalizeKioskOrder);
  }

  async listExpiredAwaitingPayment(tenantId: string, before: Date) {
    const records = await this.db
      .select()
      .from(kioskOrders)
      .where(
        and(
          eq(kioskOrders.tenantId, tenantId),
          eq(kioskOrders.status, 'AWAITING_PAYMENT'),
          lte(kioskOrders.expiresAt, before)
        )
      );

    return records.map(normalizeKioskOrder);
  }

  async updateKioskOrder(id: string, tenantId: string, input: UpdateKioskOrderInput) {
    const [record] = await this.db
      .update(kioskOrders)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(kioskOrders.id, id), eq(kioskOrders.tenantId, tenantId)))
      .returning();

    return record ? normalizeKioskOrder(record) : null;
  }

  async upsertTerminalSettings(input: SaveTerminalSettingsInput) {
    const [record] = await this.db
      .insert(terminalSettings)
      .values({ id: randomUUID(), ...input })
      .onConflictDoUpdate({
        set: {
          gatewayTimeoutMinutes: input.gatewayTimeoutMinutes,
          kioskCollectsPayment: input.kioskCollectsPayment,
          mode: input.mode,
          printDualTokens: input.printDualTokens,
          showWalkInCustomer: input.showWalkInCustomer,
          updatedAt: new Date()
        },
        target: terminalSettings.terminalId
      })
      .returning();

    return normalizeTerminalSettings(record!);
  }
}

const normalizeKioskOrder = (record: typeof kioskOrders.$inferSelect): KioskOrderRecord => ({
  branchId: record.branchId,
  businessId: record.businessId,
  createdAt: record.createdAt,
  createdByUserId: record.createdByUserId,
  expiresAt: record.expiresAt ?? undefined,
  gatewayOrderId: record.gatewayOrderId ?? undefined,
  gatewayPaymentRef: record.gatewayPaymentRef ?? undefined,
  id: record.id,
  items: record.items,
  saleId: record.saleId ?? undefined,
  status: record.status as KioskOrderRecord['status'],
  tenantId: record.tenantId,
  terminalId: record.terminalId,
  tokenNumber: record.tokenNumber,
  tokenSequence: record.tokenSequence,
  tokenSequenceDate: record.tokenSequenceDate,
  totalAmount: record.totalAmount,
  updatedAt: record.updatedAt
});

const normalizeTerminalSettings = (
  record: typeof terminalSettings.$inferSelect
): TerminalSettingsRecord => ({
  createdAt: record.createdAt,
  gatewayTimeoutMinutes: record.gatewayTimeoutMinutes,
  id: record.id,
  kioskCollectsPayment: record.kioskCollectsPayment,
  mode: record.mode as TerminalSettingsRecord['mode'],
  printDualTokens: record.printDualTokens,
  showWalkInCustomer: record.showWalkInCustomer,
  tenantId: record.tenantId,
  terminalId: record.terminalId,
  updatedAt: record.updatedAt
});
