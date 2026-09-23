import { randomUUID } from 'node:crypto';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DrizzleKioskRepository } from '../src/modules/kiosk/drizzle-kiosk.repository.js';
import { DrizzleTenantCoreRepository } from '../src/modules/tenant-core/drizzle-tenant-core.repository.js';
import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('DrizzleKioskRepository', () => {
  let businessId: string;
  let branchId: string;
  let terminalId: string;
  let userId: string;
  let close: () => Promise<void>;
  let repository: DrizzleKioskRepository;

  beforeEach(async () => {
    const database = await createMemoryDatabase();
    close = database.close;
    repository = new DrizzleKioskRepository(database.db);

    const tenantRepository = new DrizzleTenantCoreRepository(database.db);
    const authRepository = new DrizzleAuthRepository(database.db);

    await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    const business = await tenantRepository.createBusiness({ code: 'STORE-A', name: 'Store A', tenantId });
    const branch = await tenantRepository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'BR-A1',
      name: 'Store A Main',
      tenantId
    });
    const terminal = await tenantRepository.registerTerminal({
      branchId: branch.id,
      code: 'TERM-A1',
      name: 'Terminal A1',
      tenantId
    });
    const user = await authRepository.upsertUser({
      displayName: 'Owner',
      email: 'owner@example.com',
      id: randomUUID(),
      isActive: true,
      passwordHash: await hashPassword('Password123'),
      permissions: [],
      role: 'BUSINESS_OWNER',
      tenantId
    });

    businessId = business.id;
    branchId = branch.id;
    terminalId = terminal.id;
    userId = user.id;
  }, 20000);

  afterEach(async () => {
    await close();
  });

  it('allocates sequential token numbers per terminal and resets across sequence dates', async () => {
    const first = await repository.allocateTokenNumber(tenantId, terminalId, '2026-09-09');
    const second = await repository.allocateTokenNumber(tenantId, terminalId, '2026-09-09');
    const nextDay = await repository.allocateTokenNumber(tenantId, terminalId, '2026-09-10');

    expect(first.sequence).toBe(1);
    expect(second.sequence).toBe(2);
    expect(nextDay.sequence).toBe(1);
  });

  it('persists a kiosk order and finds it by id and by gateway order id', async () => {
    const order = await repository.createKioskOrder({
      branchId,
      businessId,
      createdByUserId: userId,
      items: [{ lineTotal: 160, productId: '22222222-2222-4222-8222-222222222222', productName: 'Pani Puri', quantity: 2, unitPrice: 80 }],
      tenantId,
      terminalId,
      tokenNumber: 'K-001',
      tokenSequence: 1,
      tokenSequenceDate: '2026-09-09',
      totalAmount: 160
    });

    const found = await repository.findKioskOrderById(order.id);
    expect(found?.tokenNumber).toBe('K-001');
    expect(found?.status).toBe('UNPAID_TOKEN');

    const updated = await repository.updateKioskOrder(order.id, tenantId, {
      gatewayOrderId: 'qr_abc123',
      status: 'AWAITING_PAYMENT'
    });
    expect(updated?.status).toBe('AWAITING_PAYMENT');

    const byGateway = await repository.findKioskOrderByGatewayOrderId('qr_abc123');
    expect(byGateway?.id).toBe(order.id);
  });

  it('lists only active (awaiting payment or unpaid token) orders for the business', async () => {
    const activeOrder = await repository.createKioskOrder({
      branchId,
      businessId,
      createdByUserId: userId,
      items: [{ lineTotal: 40, productId: '33333333-3333-4333-8333-333333333333', productName: 'Vada Pav', quantity: 1, unitPrice: 40 }],
      tenantId,
      terminalId,
      tokenNumber: 'K-001',
      tokenSequence: 1,
      tokenSequenceDate: '2026-09-09',
      totalAmount: 40
    });
    const fulfilledOrder = await repository.createKioskOrder({
      branchId,
      businessId,
      createdByUserId: userId,
      items: [{ lineTotal: 40, productId: '33333333-3333-4333-8333-333333333333', productName: 'Vada Pav', quantity: 1, unitPrice: 40 }],
      tenantId,
      terminalId,
      tokenNumber: 'K-002',
      tokenSequence: 2,
      tokenSequenceDate: '2026-09-09',
      totalAmount: 40
    });
    await repository.updateKioskOrder(fulfilledOrder.id, tenantId, { status: 'FULFILLED' });

    const active = await repository.listActiveKioskOrders(tenantId, [businessId]);

    expect(active.map((order) => order.id)).toEqual([activeOrder.id]);
  });

  it('upserts terminal settings idempotently', async () => {
    const created = await repository.upsertTerminalSettings({
      gatewayTimeoutMinutes: 5,
      kioskCollectsPayment: false,
      mode: 'BILLING_POS',
      printDualTokens: false,
      showWalkInCustomer: true,
      tenantId,
      terminalId
    });
    expect(created.mode).toBe('BILLING_POS');

    const updated = await repository.upsertTerminalSettings({
      gatewayTimeoutMinutes: 10,
      kioskCollectsPayment: true,
      mode: 'SELF_SERVICE_KIOSK',
      printDualTokens: true,
      showWalkInCustomer: false,
      tenantId,
      terminalId
    });
    expect(updated.id).toBe(created.id);
    expect(updated.mode).toBe('SELF_SERVICE_KIOSK');

    const fetched = await repository.findTerminalSettings(tenantId, terminalId);
    expect(fetched).toMatchObject({ gatewayTimeoutMinutes: 10, kioskCollectsPayment: true, mode: 'SELF_SERVICE_KIOSK' });
  });
});
