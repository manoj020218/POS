import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('business settings routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let branchAId: string;
  let businessAId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];
  let terminalAId: string;

  beforeEach(async () => {
    ({ app, branchAId, businessAId, loginAs, terminalAId } = await createCatalogTestContext());
  });

  it('returns defaults, persists business settings, and updates branch settings', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const unit = await request(app).post('/api/v1/units').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Bottle',
      symbol: 'btl'
    });
    const taxProfile = await request(app).post('/api/v1/tax-profiles').set(ownerAccess).send({
      businessId: businessAId,
      name: 'GST 18',
      rateBasisPoints: 1800
    });
    const updated = await request(app).patch('/api/v1/business-settings').set(ownerAccess).send({
      branches: [
        {
          address: 'Updated Main Road',
          branchId: branchAId,
          receiptPrinterProfile: {
            autoPrintReceipt: true,
            connectionType: 'TCP',
            name: 'Billing Printer',
            paperWidth: '80mm',
            port: 9100,
            target: '192.168.1.55'
          }
        }
      ],
      businessId: businessAId,
      businessLogoUrl: 'https://example.com/logo.png',
      currencyCode: 'usd',
      defaultTaxProfileId: taxProfile.body.data.id,
      defaultTrackInventory: false,
      defaultUnitId: unit.body.data.id,
      invoicePrefix: 'bill',
      receiptFooter: 'Thank you for shopping',
      timezone: 'America/New_York'
    });
    const fetched = await request(app)
      .get('/api/v1/business-settings')
      .query({ businessId: businessAId })
      .set(ownerAccess);

    expect(unit.status).toBe(201);
    expect(taxProfile.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      businessId: businessAId,
      businessLogoUrl: 'https://example.com/logo.png',
      currencyCode: 'USD',
      defaultTaxProfileId: taxProfile.body.data.id,
      defaultTrackInventory: false,
      defaultUnitId: unit.body.data.id,
      invoicePrefix: 'BILL',
      receiptFooter: 'Thank you for shopping',
      timezone: 'America/New_York'
    });
    expect(updated.body.data.defaultUnit).toMatchObject({
      id: unit.body.data.id,
      name: 'Bottle'
    });
    expect(updated.body.data.defaultTaxProfile).toMatchObject({
      id: taxProfile.body.data.id,
      name: 'GST 18',
      rateBasisPoints: 1800
    });
    expect(updated.body.data.branches).toEqual([
      expect.objectContaining({
        address: 'Updated Main Road',
        branchId: branchAId,
        receiptPrinterProfile: {
          autoPrintReceipt: true,
          connectionType: 'TCP',
          name: 'Billing Printer',
          paperWidth: '80mm',
          port: 9100,
          target: '192.168.1.55'
        }
      })
    ]);
    expect(fetched.status).toBe(200);
    expect(fetched.body.data).toMatchObject(updated.body.data);
  });

  it('uses configured defaults for new products and invoice prefixes for sales', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const managerAccess = await loginAs('manager@example.com');
    const unit = await request(app).post('/api/v1/units').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Bottle'
    });
    const taxProfile = await request(app).post('/api/v1/tax-profiles').set(ownerAccess).send({
      businessId: businessAId,
      name: 'GST 5',
      rateBasisPoints: 500
    });

    await request(app).patch('/api/v1/business-settings').set(ownerAccess).send({
      businessId: businessAId,
      defaultTaxProfileId: taxProfile.body.data.id,
      defaultTrackInventory: false,
      defaultUnitId: unit.body.data.id,
      invoicePrefix: 'retail'
    });

    const product = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Settings Cola',
      sellingPrice: 4000
    });
    const sale = await request(app).post('/api/v1/sales').set(managerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });

    expect(product.status).toBe(201);
    expect(product.body.data).toMatchObject({
      name: 'Settings Cola',
      taxProfileName: 'GST 5',
      taxProfileId: taxProfile.body.data.id,
      trackInventory: false,
      unitName: 'Bottle',
      unitId: unit.body.data.id
    });
    expect(sale.status).toBe(201);
    expect(sale.body.data.invoiceNumber).toMatch(/^RETAIL-/);
  });

  it('applies the configured business timezone to report date windows', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    await request(app).patch('/api/v1/business-settings').set(ownerAccess).send({
      businessId: businessAId,
      timezone: 'America/New_York'
    });
    const product = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessAId,
      name: 'Timezone Cola',
      sellingPrice: 3000
    });

    await request(app).post('/api/v1/sales').set(ownerAccess).send({
      branchId: branchAId,
      items: [{ productId: product.body.data.id, quantity: 1 }],
      occurredAt: '2026-08-28T03:30:00.000Z',
      payment: { method: 'CARD' },
      terminalId: terminalAId
    });

    const previousDay = await request(app)
      .get('/api/v1/reports/sales/summary')
      .query({ businessId: businessAId, dateFrom: '2026-08-27', dateTo: '2026-08-27' })
      .set(ownerAccess);
    const nextDay = await request(app)
      .get('/api/v1/reports/sales/summary')
      .query({ businessId: businessAId, dateFrom: '2026-08-28', dateTo: '2026-08-28' })
      .set(ownerAccess);

    expect(previousDay.status).toBe(200);
    expect(previousDay.body.data).toMatchObject({
      businessId: businessAId,
      saleCount: 1,
      timezone: 'America/New_York',
      totalAmount: 3000
    });
    expect(nextDay.status).toBe(200);
    expect(nextDay.body.data).toMatchObject({
      businessId: businessAId,
      saleCount: 0,
      timezone: 'America/New_York',
      totalAmount: 0
    });
  });

  it('allows any terminal role to read settings but requires settings:manage to write', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const listed = await request(app)
      .get('/api/v1/business-settings')
      .query({ businessId: businessAId })
      .set(cashierAccess);
    const updated = await request(app).patch('/api/v1/business-settings').set(cashierAccess).send({
      businessId: businessAId,
      currencyCode: 'INR'
    });

    expect(listed.status).toBe(200);
    expect(updated.status).toBe(403);
    expect(updated.body.code).toBe('FORBIDDEN');
  });
});
