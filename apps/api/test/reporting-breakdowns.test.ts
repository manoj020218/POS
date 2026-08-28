import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('reporting breakdown routes', () => {
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

  it('returns grouped branch, terminal, cashier, payment-method, and top-product summaries', async () => {
    const seeded = await seedReportingDataset(
      app,
      branchAId,
      branchBId,
      businessAId,
      businessBId,
      loginAs,
      terminalAId,
      terminalBId
    );
    const query = { dateFrom: seeded.reportDay, dateTo: seeded.reportDay };
    const [branches, terminals, cashiers, payments, topProducts] = await Promise.all([
      request(app).get('/api/v1/reports/sales/by-branch').query(query).set(seeded.ownerAccess),
      request(app).get('/api/v1/reports/sales/by-terminal').query(query).set(seeded.ownerAccess),
      request(app).get('/api/v1/reports/sales/by-cashier').query(query).set(seeded.ownerAccess),
      request(app)
        .get('/api/v1/reports/sales/by-payment-method')
        .query(query)
        .set(seeded.ownerAccess),
      request(app)
        .get('/api/v1/reports/sales/top-products')
        .query({ ...query, limit: 2 })
        .set(seeded.ownerAccess)
    ]);

    expect(branches.status).toBe(200);
    expect(branches.body.data).toMatchObject({
      businessCount: 2,
      dateFrom: seeded.reportDay,
      dateTo: seeded.reportDay,
      reportType: 'DATE_RANGE'
    });
    expect(branches.body.data.rows).toMatchObject([
      { branchId: branchAId, branchName: 'Store A Main', saleCount: 2, totalAmount: 5000, totalQuantity: 3 },
      { branchId: branchBId, branchName: 'Store B Main', saleCount: 1, totalAmount: 4500, totalQuantity: 3 },
      { branchId: seeded.branchA2Id, branchName: 'Store A South', saleCount: 1, totalAmount: 4000, totalQuantity: 3 }
    ]);

    expect(terminals.status).toBe(200);
    expect(terminals.body.data.rows).toMatchObject([
      { terminalId: terminalAId, terminalName: 'Terminal A1', saleCount: 2, totalAmount: 5000, totalQuantity: 3 },
      { terminalId: terminalBId, terminalName: 'Terminal B1', saleCount: 1, totalAmount: 4500, totalQuantity: 3 },
      { terminalId: seeded.terminalA2Id, terminalName: 'South Counter', saleCount: 1, totalAmount: 4000, totalQuantity: 3 }
    ]);

    expect(cashiers.status).toBe(200);
    expect(cashiers.body.data.rows).toMatchObject([
      { cashierDisplayName: 'Owner', cashierEmail: 'owner@example.com', saleCount: 3, totalAmount: 9500, totalQuantity: 7 },
      { cashierDisplayName: 'Manager', cashierEmail: 'manager@example.com', saleCount: 1, totalAmount: 4000, totalQuantity: 2 }
    ]);

    expect(payments.status).toBe(200);
    expect(payments.body.data.rows).toMatchObject([
      { paymentMethod: 'CARD', saleCount: 2, totalAmount: 5000, totalQuantity: 3 },
      { paymentMethod: 'UPI', saleCount: 1, totalAmount: 4500, totalQuantity: 3 },
      { paymentMethod: 'CASH', saleCount: 1, totalAmount: 4000, totalQuantity: 3 }
    ]);

    expect(topProducts.status).toBe(200);
    expect(topProducts.body.data).toMatchObject({
      businessCount: 2,
      dateFrom: seeded.reportDay,
      dateTo: seeded.reportDay,
      limit: 2,
      reportType: 'DATE_RANGE'
    });
    expect(topProducts.body.data.rows).toMatchObject([
      { rank: 1, productId: seeded.productAId, productName: 'Report Cola', saleCount: 2, totalAmount: 6000, totalQuantity: 3 },
      { rank: 2, productId: seeded.productBId, productName: 'Report Juice', saleCount: 1, totalAmount: 4500, totalQuantity: 3 }
    ]);
  });
});

const seedReportingDataset = async (
  app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'],
  branchAId: string,
  branchBId: string,
  businessAId: string,
  businessBId: string,
  loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'],
  terminalAId: string,
  terminalBId: string
) => {
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
  const productA = await createProduct(app, ownerAccess, {
    businessId: businessAId,
    name: 'Report Cola',
    sellingPrice: 2000
  });
  const productSnack = await createProduct(app, ownerAccess, {
    businessId: businessAId,
    name: 'Report Snack',
    sellingPrice: 1000
  });
  const productB = await createProduct(app, ownerAccess, {
    businessId: businessBId,
    name: 'Report Juice',
    sellingPrice: 1500
  });
  const reportDate = new Date(2026, 7, 28, 10, 0, 0, 0);
  const reportDay = formatLocalDate(reportDate);

  await createSale(app, managerAccess, {
    branchId: branchAId,
    items: [{ productId: productA.body.data.id, quantity: 2 }],
    occurredAt: reportDate.toISOString(),
    payment: { method: 'CARD' },
    terminalId: terminalAId
  });
  await createSale(app, ownerAccess, {
    branchId: branchAId,
    items: [{ productId: productSnack.body.data.id, quantity: 1 }],
    occurredAt: reportDate.toISOString(),
    payment: { method: 'CARD' },
    terminalId: terminalAId
  });
  await createSale(app, ownerAccess, {
    branchId: branch.body.data.id,
    items: [
      { productId: productA.body.data.id, quantity: 1 },
      { productId: productSnack.body.data.id, quantity: 2 }
    ],
    occurredAt: reportDate.toISOString(),
    payment: { method: 'CASH' },
    terminalId: terminal.body.data.id
  });
  await createSale(app, ownerAccess, {
    branchId: branchBId,
    items: [{ productId: productB.body.data.id, quantity: 3 }],
    occurredAt: reportDate.toISOString(),
    payment: { method: 'UPI' },
    terminalId: terminalBId
  });

  return {
    branchA2Id: branch.body.data.id as string,
    ownerAccess,
    productAId: productA.body.data.id as string,
    productBId: productB.body.data.id as string,
    reportDay,
    terminalA2Id: terminal.body.data.id as string
  };
};

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
