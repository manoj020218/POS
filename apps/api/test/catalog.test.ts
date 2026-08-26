import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('catalog routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, businessAId, businessBId, loginAs } = await createCatalogTestContext());
  });

  it('creates a product from the minimal contract and auto-provisions defaults', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const created = await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Coca Cola 500ml',
      sellingPrice: 4000
    });
    const categories = await request(app)
      .get('/api/v1/categories')
      .query({ businessId: businessAId })
      .set(managerAccess);
    const units = await request(app)
      .get('/api/v1/units')
      .query({ businessId: businessAId })
      .set(managerAccess);
    const taxProfiles = await request(app)
      .get('/api/v1/tax-profiles')
      .query({ businessId: businessAId })
      .set(managerAccess);

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      businessCode: 'STORE-A',
      businessId: businessAId,
      categoryCode: 'GENERAL',
      categoryName: 'General',
      name: 'Coca Cola 500ml',
      openingStock: 0,
      sellingPrice: 4000,
      taxProfileCode: 'NO-TAX',
      taxRateBasisPoints: 0,
      trackInventory: true,
      unitCode: 'PCS',
      unitName: 'PCS'
    });
    expect(created.body.data.sku).toMatch(/^PRD-/);
    expect(categories.body.data.map((item: { code: string }) => item.code)).toEqual(['GENERAL']);
    expect(units.body.data.map((item: { code: string }) => item.code)).toEqual(['PCS']);
    expect(taxProfiles.body.data.map((item: { code: string }) => item.code)).toEqual(['NO-TAX']);
  });

  it('requires explicit business context when a tenant-wide user can access multiple businesses', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const category = await request(app).post('/api/v1/categories').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Beverages'
    });
    const unit = await request(app).post('/api/v1/units').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Bottle',
      symbol: 'btl'
    });
    const taxProfile = await request(app).post('/api/v1/tax-profiles').set(ownerAccess).send({
      businessId: businessBId,
      name: 'GST 18',
      rateBasisPoints: 1800
    });
    const ambiguous = await request(app).post('/api/v1/products').set(ownerAccess).send({
      name: 'Water Bottle',
      sellingPrice: 1200
    });
    const created = await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      categoryId: category.body.data.id,
      name: 'Water Bottle',
      sellingPrice: 1200,
      taxProfileId: taxProfile.body.data.id,
      unitId: unit.body.data.id
    });
    const listed = await request(app)
      .get('/api/v1/products')
      .query({ businessId: businessBId })
      .set(ownerAccess);

    expect(category.status).toBe(201);
    expect(unit.status).toBe(201);
    expect(taxProfile.status).toBe(201);
    expect(ambiguous.status).toBe(400);
    expect(ambiguous.body.code).toBe('BUSINESS_CONTEXT_REQUIRED');
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      businessId: businessBId,
      categoryCode: category.body.data.code,
      taxProfileCode: taxProfile.body.data.code,
      unitCode: unit.body.data.code
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
  });

  it('allows cashiers to view products but not create them', async () => {
    const managerAccess = await loginAs('manager@example.com');
    await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Counter Gum',
      sellingPrice: 500
    });
    const cashierAccess = await loginAs('cashier@example.com');
    const listed = await request(app).get('/api/v1/products').set(cashierAccess);
    const created = await request(app).post('/api/v1/products').set(cashierAccess).send({
      name: 'Blocked Product',
      sellingPrice: 1000
    });

    expect(listed.status).toBe(200);
    expect(listed.body.data).toHaveLength(1);
    expect(created.status).toBe(403);
    expect(created.body.code).toBe('FORBIDDEN');
  });

  it('searches with exact barcode priority and returns a slim POS payload', async () => {
    const managerAccess = await loginAs('manager@example.com');
    await request(app).post('/api/v1/products').set(managerAccess).send({
      name: '8900000000012 Soda',
      sellingPrice: 3200,
      sku: 'MATCH-890'
    });
    const exactBarcode = await request(app).post('/api/v1/products').set(managerAccess).send({
      barcode: '8900000000012',
      name: 'Barcode Cola',
      sellingPrice: 4000,
      sku: 'BAR-890'
    });
    const searched = await request(app)
      .get('/api/v1/products/search')
      .query({ query: '8900000000012' })
      .set(managerAccess);

    expect(exactBarcode.status).toBe(201);
    expect(searched.status).toBe(200);
    expect(searched.body.data).toHaveLength(1);
    expect(searched.body.data[0]).toMatchObject({
      barcode: '8900000000012',
      businessCode: 'STORE-A',
      businessId: businessAId,
      id: exactBarcode.body.data.id,
      name: 'Barcode Cola',
      sellingPrice: 4000,
      sku: 'BAR-890',
      trackInventory: true,
      unitCode: 'PCS',
      unitName: 'PCS'
    });
    expect(searched.body.data[0].categoryName).toBeUndefined();
    expect(searched.body.data[0].taxProfileName).toBeUndefined();
  });

  it('searches by name and sku within the caller business scope', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const ownerAccess = await loginAs('owner@example.com');
    await request(app).post('/api/v1/products').set(managerAccess).send({
      name: 'Ginger Ale',
      sellingPrice: 2500,
      sku: 'GINGER-A'
    });
    await request(app).post('/api/v1/products').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Other Drink',
      sellingPrice: 2600,
      sku: 'GINGER-B'
    });

    const managerSearch = await request(app)
      .get('/api/v1/products/search')
      .query({ query: 'GINGER' })
      .set(managerAccess);
    const ownerBusinessSearch = await request(app)
      .get('/api/v1/products/search')
      .query({ businessId: businessBId, query: 'GINGER-B' })
      .set(ownerAccess);

    expect(managerSearch.status).toBe(200);
    expect(managerSearch.body.data).toHaveLength(1);
    expect(managerSearch.body.data[0]).toMatchObject({
      businessId: businessAId,
      name: 'Ginger Ale',
      sku: 'GINGER-A'
    });
    expect(ownerBusinessSearch.status).toBe(200);
    expect(ownerBusinessSearch.body.data).toHaveLength(1);
    expect(ownerBusinessSearch.body.data[0]).toMatchObject({
      businessId: businessBId,
      name: 'Other Drink',
      sku: 'GINGER-B'
    });
  });
});
