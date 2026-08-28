import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('reporting branch scope routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let terminalAId: string;

  beforeEach(async () => {
    ({ app, branchAId, businessAId, businessBId, loginAs, terminalAId } =
      await createCatalogTestContext());
  });

  it('keeps sales summary reports inside assigned branch scope within the same business', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const branch = await createBranch(app, ownerAccess, {
      address: 'South Road',
      businessId: businessAId,
      code: 'BR-A2',
      name: 'Store A South'
    });
    const terminal = await createTerminal(app, ownerAccess, {
      branchId: branch.body.data.id,
      code: 'TERM-A2',
      name: 'South Counter'
    });
    const product = await createProduct(app, ownerAccess, {
      businessId: businessAId,
      name: 'Scoped Cola',
      sellingPrice: 2000
    });
    const reportDate = new Date(2026, 7, 28, 10, 0, 0, 0);
    const reportDay = formatLocalDate(reportDate);

    await createSale(app, ownerAccess, {
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 2 }],
      occurredAt: reportDate.toISOString(),
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });
    await createSale(app, ownerAccess, {
      branchId: branch.body.data.id,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      occurredAt: reportDate.toISOString(),
      payment: { method: 'CASH' },
      terminalId: terminal.body.data.id
    });

    const [summary, branches] = await Promise.all([
      request(app)
        .get('/api/v1/reports/sales/summary')
        .query({ businessId: businessAId, dateFrom: reportDay, dateTo: reportDay })
        .set(managerAccess),
      request(app)
        .get('/api/v1/reports/sales/by-branch')
        .query({ businessId: businessAId, dateFrom: reportDay, dateTo: reportDay })
        .set(managerAccess)
    ]);

    expect(summary.status).toBe(200);
    expect(summary.body.data).toMatchObject({
      businessCount: 1,
      businessId: businessAId,
      dateFrom: reportDay,
      dateTo: reportDay,
      reportType: 'DATE_RANGE',
      saleCount: 1,
      totalAmount: 4000,
      totalQuantity: 2
    });
    expect(branches.status).toBe(200);
    expect(branches.body.data.rows).toEqual([
      expect.objectContaining({
        branchId: branchAId,
        saleCount: 1,
        totalAmount: 4000,
        totalQuantity: 2
      })
    ]);
  });

  it('validates grouped report scope and top-product limits', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const ownerAccess = await loginAs('owner@example.com');
    const [scopeDenied, invalidLimit] = await Promise.all([
      request(app)
        .get('/api/v1/reports/sales/by-terminal')
        .query({ businessId: businessBId })
        .set(managerAccess),
      request(app)
        .get('/api/v1/reports/sales/top-products')
        .query({ limit: 0 })
        .set(ownerAccess)
    ]);

    expect(scopeDenied.status).toBe(403);
    expect(scopeDenied.body.code).toBe('BRANCH_ACCESS_DENIED');
    expect(invalidLimit.status).toBe(400);
    expect(invalidLimit.body.code).toBe('VALIDATION_ERROR');
  });
});

const createBranch = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/branches').set(access).send(body);

const createTerminal = (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  access: { authorization: string },
  body: Record<string, unknown>
) => request(app).post('/api/v1/terminals').set(access).send(body);

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

const formatLocalDate = (value: Date) => {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};
