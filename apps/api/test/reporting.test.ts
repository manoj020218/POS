import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('reporting routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let branchBId: string;
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let terminalAId: string;
  let terminalBId: string;

  beforeEach(async () => {
    ({ app, branchAId, branchBId, businessAId, businessBId, loginAs, terminalAId, terminalBId } =
      await createCatalogTestContext());
  });

  it('returns today sales summary by default for accessible businesses only', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');
    await request(app)
      .patch('/api/v1/business-settings')
      .set(ownerAccess)
      .send({ businessId: businessAId, timezone: 'UTC' });
    const today = formatUtcDate(new Date());
    const yesterday = shiftUtcDate(today, -1);
    const todayAt = new Date(`${today}T10:00:00.000Z`);
    const yesterdayAt = new Date(`${yesterday}T10:00:00.000Z`);
    const productA = await createProduct(app, ownerAccess, {
      businessId: businessAId,
      name: 'Today Cola',
      sellingPrice: 4000
    });
    const productB = await createProduct(app, ownerAccess, {
      businessId: businessBId,
      name: 'Other Business Cola',
      sellingPrice: 1500
    });

    await createSale(app, ownerAccess, {
      branchId: branchAId,
      items: [{ productId: productA.body.data.id, quantity: 2 }],
      occurredAt: todayAt.toISOString(),
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });
    await createSale(app, ownerAccess, {
      branchId: branchAId,
      items: [{ productId: productA.body.data.id, quantity: 1 }],
      occurredAt: yesterdayAt.toISOString(),
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });
    await createSale(app, ownerAccess, {
      branchId: branchBId,
      items: [{ productId: productB.body.data.id, quantity: 3 }],
      occurredAt: todayAt.toISOString(),
      payment: { method: 'CARD' },
      terminalId: terminalBId
    });

    const summary = await request(app).get('/api/v1/reports/sales/summary').set(managerAccess);

    expect(summary.status).toBe(200);
    expect(summary.body.data).toMatchObject({
      averageSaleAmount: 8000,
      businessCount: 1,
      dateFrom: today,
      dateTo: today,
      discountAmount: 0,
      reportType: 'TODAY',
      saleCount: 1,
      subtotalAmount: 8000,
      taxAmount: 0,
      timezone: 'UTC',
      totalAmount: 8000,
      totalQuantity: 2
    });
    expect(summary.body.data.businessId).toBeUndefined();
  });

  it('returns explicit date-range sales summary for the requested business', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const product = await createProduct(app, ownerAccess, {
      businessId: businessAId,
      name: 'Range Chips',
      sellingPrice: 2500
    });

    await createSale(app, ownerAccess, {
      branchId: branchAId,
      items: [{ discountAmount: 100, productId: product.body.data.id, quantity: 2, taxAmount: 50 }],
      occurredAt: '2026-08-27T10:00:00.000Z',
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });
    await createSale(app, ownerAccess, {
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1, taxAmount: 25 }],
      occurredAt: '2026-08-28T12:00:00.000Z',
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });

    const summary = await request(app)
      .get('/api/v1/reports/sales/summary')
      .query({
        businessId: businessAId,
        dateFrom: '2026-08-27',
        dateTo: '2026-08-28'
      })
      .set(ownerAccess);

    expect(summary.status).toBe(200);
    expect(summary.body.data).toMatchObject({
      averageSaleAmount: 3738,
      businessCount: 1,
      businessId: businessAId,
      dateFrom: '2026-08-27',
      dateTo: '2026-08-28',
      discountAmount: 100,
      reportType: 'DATE_RANGE',
      saleCount: 2,
      subtotalAmount: 7500,
      taxAmount: 75,
      totalAmount: 7475,
      totalQuantity: 3
    });
  });

  it('requires report permission and validates requested date range scope', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const ownerAccess = await loginAs('owner@example.com');
    const forbidden = await request(app).get('/api/v1/reports/sales/summary').set(cashierAccess);
    const scopeDenied = await request(app)
      .get('/api/v1/reports/sales/summary')
      .query({ businessId: businessBId })
      .set(managerAccess);
    const incompleteRange = await request(app)
      .get('/api/v1/reports/sales/summary')
      .query({ dateFrom: '2026-08-28' })
      .set(ownerAccess);
    const reversedRange = await request(app)
      .get('/api/v1/reports/sales/summary')
      .query({ dateFrom: '2026-08-29', dateTo: '2026-08-28' })
      .set(ownerAccess);

    expect(forbidden.status).toBe(403);
    expect(forbidden.body.code).toBe('FORBIDDEN');
    expect(scopeDenied.status).toBe(403);
    expect(scopeDenied.body.code).toBe('BRANCH_ACCESS_DENIED');
    expect(incompleteRange.status).toBe(400);
    expect(incompleteRange.body.code).toBe('VALIDATION_ERROR');
    expect(reversedRange.status).toBe(400);
    expect(reversedRange.body.code).toBe('REPORT_DATE_RANGE_INVALID');
  });
});

const createProduct = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/products').set(access).send(body);

const createSale = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/sales').set(access).send(body);

const formatUtcDate = (value: Date) => {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${value.getUTCDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const shiftUtcDate = (value: string, days: number) => {
  const [year, month, day] = value.split('-').map(Number);
  const shifted = new Date(Date.UTC(year!, month! - 1, day! + days));
  return formatUtcDate(shifted);
};
