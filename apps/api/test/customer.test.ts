import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createCatalogTestContext } from './helpers/catalog-app.js';

describe('customer routes', () => {
  let app: Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
  let businessAId: string;
  let businessBId: string;
  let loginAs: Awaited<ReturnType<typeof createCatalogTestContext>>['loginAs'];

  beforeEach(async () => {
    ({ app, businessAId, businessBId, loginAs } = await createCatalogTestContext());
  });

  it('creates a customer from a mobile-only quick-create contract', async () => {
    const cashierAccess = await loginAs('cashier@example.com');

    const created = await request(app).post('/api/v1/customers').set(cashierAccess).send({
      mobile: '9876543210'
    });

    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      businessCode: 'STORE-A',
      businessId: businessAId,
      isActive: true,
      isWalkIn: false,
      mobile: '9876543210',
      name: '9876543210'
    });
  });

  it('requires explicit business context when a tenant-wide user creates or ensures business-scoped customers', async () => {
    const ownerAccess = await loginAs('owner@example.com');

    const ambiguousCreate = await request(app).post('/api/v1/customers').set(ownerAccess).send({
      mobile: '9000000001'
    });
    const ambiguousWalkIn = await request(app)
      .post('/api/v1/customers/walk-in')
      .set(ownerAccess)
      .send({});
    const created = await request(app).post('/api/v1/customers').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Business B Customer',
      notes: 'priority'
    });

    expect(ambiguousCreate.status).toBe(400);
    expect(ambiguousCreate.body.code).toBe('BUSINESS_CONTEXT_REQUIRED');
    expect(ambiguousWalkIn.status).toBe(400);
    expect(ambiguousWalkIn.body.code).toBe('BUSINESS_CONTEXT_REQUIRED');
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({
      businessId: businessBId,
      name: 'Business B Customer',
      notes: 'priority'
    });
  });

  it('lists customers by name or mobile within the caller business scope', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const ownerAccess = await loginAs('owner@example.com');

    await request(app).post('/api/v1/customers').set(managerAccess).send({
      mobile: '9876543210'
    });
    await request(app).post('/api/v1/customers').set(ownerAccess).send({
      businessId: businessBId,
      name: 'Other Business Customer',
      mobile: '1111111111'
    });

    const managerSearch = await request(app)
      .get('/api/v1/customers')
      .query({ query: '9876543210' })
      .set(managerAccess);
    const ownerScoped = await request(app)
      .get('/api/v1/customers')
      .query({ businessId: businessBId, query: 'Other Business' })
      .set(ownerAccess);

    expect(managerSearch.status).toBe(200);
    expect(managerSearch.body.data).toHaveLength(1);
    expect(managerSearch.body.data[0]).toMatchObject({
      businessId: businessAId,
      mobile: '9876543210',
      name: '9876543210'
    });
    expect(ownerScoped.status).toBe(200);
    expect(ownerScoped.body.data).toHaveLength(1);
    expect(ownerScoped.body.data[0]).toMatchObject({
      businessId: businessBId,
      name: 'Other Business Customer'
    });
  });

  it('ensures one walk-in customer per business and protects it from deactivation', async () => {
    const managerAccess = await loginAs('manager@example.com');

    const first = await request(app)
      .post('/api/v1/customers/walk-in')
      .set(managerAccess)
      .send({});
    const second = await request(app)
      .post('/api/v1/customers/walk-in')
      .set(managerAccess)
      .send({});
    const listed = await request(app).get('/api/v1/customers').set(managerAccess);
    const deactivate = await request(app)
      .patch(`/api/v1/customers/${first.body.data.id}`)
      .set(managerAccess)
      .send({ isActive: false });

    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({
      businessId: businessAId,
      isActive: true,
      isWalkIn: true,
      name: 'Walk-in Customer'
    });
    expect(second.status).toBe(200);
    expect(second.body.data.id).toBe(first.body.data.id);
    expect(listed.status).toBe(200);
    expect(listed.body.data[0]).toMatchObject({
      id: first.body.data.id,
      isWalkIn: true
    });
    expect(deactivate.status).toBe(409);
    expect(deactivate.body.code).toBe('DEFAULT_CUSTOMER_PROTECTED');
  });

  it('lets cashiers view and create customers but not update them', async () => {
    const managerAccess = await loginAs('manager@example.com');
    const createdByManager = await request(app).post('/api/v1/customers').set(managerAccess).send({
      name: 'Counter Customer'
    });
    const cashierAccess = await loginAs('cashier@example.com');

    const listed = await request(app).get('/api/v1/customers').set(cashierAccess);
    const created = await request(app).post('/api/v1/customers').set(cashierAccess).send({
      name: 'Cashier Customer'
    });
    const updated = await request(app)
      .patch(`/api/v1/customers/${createdByManager.body.data.id}`)
      .set(cashierAccess)
      .send({ notes: 'blocked' });

    expect(listed.status).toBe(200);
    expect(created.status).toBe(201);
    expect(created.body.data.name).toBe('Cashier Customer');
    expect(updated.status).toBe(403);
    expect(updated.body.code).toBe('FORBIDDEN');
  });
});
