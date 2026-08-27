import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('supplier routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, businessAId, businessBId, loginAs } = await createCatalogTestContext());
  });

  it('creates and lists suppliers within the caller business scope', async () => {
    const inventoryAccess = await loginAs('inventory@example.com');

    const created = await request(app).post('/api/v1/suppliers').set(inventoryAccess).send({
      mobile: '9876500000',
      name: 'Acme Supply'
    });
    const listed = await request(app)
      .get('/api/v1/suppliers')
      .query({ query: 'Acme' })
      .set(inventoryAccess);

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      businessId: businessAId,
      mobile: '9876500000',
      name: 'Acme Supply'
    });
    expect(listed.status).toBe(200);
    expect(listed.body.data).toEqual([
      expect.objectContaining({
        businessId: businessAId,
        name: 'Acme Supply'
      })
    ]);
  });

  it('requires explicit business context for tenant-wide supplier creation', async () => {
    const ownerAccess = await loginAs('owner@example.com');

    const ambiguous = await request(app).post('/api/v1/suppliers').set(ownerAccess).send({
      name: 'Ambiguous Supplier'
    });
    const created = await request(app).post('/api/v1/suppliers').set(ownerAccess).send({
      businessId: businessBId,
      email: 'supplier-b@example.com',
      name: 'Business B Supplier'
    });

    expect(ambiguous.status).toBe(400);
    expect(ambiguous.body.code).toBe('BUSINESS_CONTEXT_REQUIRED');
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      businessId: businessBId,
      email: 'supplier-b@example.com',
      name: 'Business B Supplier'
    });
  });

  it('enforces supplier permissions and business scope on updates', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierAccess = await loginAs('cashier@example.com');
    const inventoryAccess = await loginAs('inventory@example.com');
    const created = await request(app).post('/api/v1/suppliers').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Scoped Supplier'
    });

    const cashierDenied = await request(app).get('/api/v1/suppliers').set(cashierAccess);
    const scopeDenied = await request(app)
      .patch(`/api/v1/suppliers/${created.body.data.id}`)
      .set(inventoryAccess)
      .send({ notes: 'blocked' });
    const updated = await request(app)
      .patch(`/api/v1/suppliers/${created.body.data.id}`)
      .set(ownerAccess)
      .send({ isActive: false, notes: 'inactive' });

    expect(cashierDenied.status).toBe(403);
    expect(cashierDenied.body.code).toBe('FORBIDDEN');
    expect(scopeDenied.status).toBe(403);
    expect(scopeDenied.body.code).toBe('BRANCH_ACCESS_DENIED');
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      id: created.body.data.id,
      isActive: false,
      notes: 'inactive'
    });
  });
});
