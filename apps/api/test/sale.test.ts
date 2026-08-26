import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('sale routes', () => {
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

  it('creates a sale with trusted server-side totals and optional customer support', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const saleProduct = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Counter Cola',
      sellingPrice: 4000
    });
    const created = await request(app).post('/api/v1/sales').set(cashierAccess).send({
      branchId: branchAId,
      items: [
        {
          discountAmount: 100,
          productId: saleProduct.body.data.id,
          quantity: 2,
          taxAmount: 36
        }
      ],
      payment: {
        method: 'CASH',
        tenderedAmount: 8000
      },
      terminalId: terminalAId
    });

    expect(saleProduct.status).toBe(201);
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      branchId: branchAId,
      changeAmount: 64,
      discountAmount: 100,
      invoiceNumber: 'INV-BR-A1-TERM-A1-000001',
      invoiceSequence: 1,
      paymentMethod: 'CASH',
      subtotalAmount: 8000,
      taxAmount: 36,
      tenderedAmount: 8000,
      terminalId: terminalAId,
      totalAmount: 7936
    });
    expect(created.body.data.items).toEqual([
      expect.objectContaining({
        discountAmount: 100,
        productId: saleProduct.body.data.id,
        productName: 'Counter Cola',
        quantity: 2,
        subtotalAmount: 8000,
        taxAmount: 36,
        totalAmount: 7936,
        unitPrice: 4000
      })
    ]);
  });

  it('allows attaching an optional customer and defaults non-cash tendered amounts to the computed total', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Ledger Chips',
      sellingPrice: 1500
    });
    const customer = await request(app).post('/api/v1/customers').set(managerAccess).send({
      mobile: '9000000001'
    });
    const created = await request(app).post('/api/v1/sales').set(managerAccess).send({
      branchId: branchAId,
      customerId: customer.body.data.id,
      items: [
        {
          productId: product.body.data.id,
          quantity: 3
        }
      ],
      payment: {
        method: 'UPI'
      },
      terminalId: terminalAId
    });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      customerId: customer.body.data.id,
      customerName: '9000000001',
      paymentMethod: 'UPI',
      subtotalAmount: 4500,
      tenderedAmount: 4500,
      totalAmount: 4500
    });
  });

  it('allocates invoice numbers per terminal sequence', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const productA = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Invoice Cola',
      sellingPrice: 2500
    });
    const productB = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Invoice Soda',
      sellingPrice: 1800
    });

    const first = await request(app).post('/api/v1/sales').set(ownerAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: productA.body.data.id,
          quantity: 1
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalAId
    });
    const second = await request(app).post('/api/v1/sales').set(ownerAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: productA.body.data.id,
          quantity: 2
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalAId
    });
    const third = await request(app).post('/api/v1/sales').set(ownerAccess).send({
      branchId: branchBId,
      items: [
        {
          productId: productB.body.data.id,
          quantity: 1
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalBId
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(third.status).toBe(201);
    expect(first.body.data).toMatchObject({
      invoiceNumber: 'INV-BR-A1-TERM-A1-000001',
      invoiceSequence: 1
    });
    expect(second.body.data).toMatchObject({
      invoiceNumber: 'INV-BR-A1-TERM-A1-000002',
      invoiceSequence: 2
    });
    expect(third.body.data).toMatchObject({
      invoiceNumber: 'INV-BR-B1-TERM-B1-000001',
      invoiceSequence: 1
    });
  });

  it('rejects sales outside the caller branch scope', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const ownerAccess = await loginAs('owner@example.com');
    const product = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Other Branch Product',
      sellingPrice: 2000
    });
    const created = await request(app).post('/api/v1/sales').set(cashierAccess).send({
      branchId: branchBId,
      items: [
        {
          productId: product.body.data.id,
          quantity: 1
        }
      ],
      payment: {
        method: 'CARD'
      },
      terminalId: terminalBId
    });

    expect(product.status).toBe(201);
    expect(created.status).toBe(403);
    expect(created.body.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('rejects non-cash payment mismatches and duplicate sale items', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Duplicate Test',
      sellingPrice: 1000
    });

    const mismatched = await request(app).post('/api/v1/sales').set(cashierAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: product.body.data.id,
          quantity: 2
        }
      ],
      payment: {
        method: 'CARD',
        tenderedAmount: 3000
      },
      terminalId: terminalAId
    });
    const duplicate = await request(app).post('/api/v1/sales').set(cashierAccess).send({
      branchId: branchAId,
      items: [
        {
          productId: product.body.data.id,
          quantity: 1
        },
        {
          productId: product.body.data.id,
          quantity: 1
        }
      ],
      payment: {
        method: 'CASH',
        tenderedAmount: 2000
      },
      terminalId: terminalAId
    });

    expect(mismatched.status).toBe(400);
    expect(mismatched.body.code).toBe('PAYMENT_AMOUNT_MISMATCH');
    expect(duplicate.status).toBe(400);
    expect(duplicate.body.code).toBe('DUPLICATE_SALE_PRODUCT');
  });
});
