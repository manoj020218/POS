import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { InMemoryTenantCoreRepository } from '../src/modules/tenant-core/in-memory-tenant-core.repository.js';

const tenantA = '11111111-1111-4111-8111-111111111111';
const tenantB = '22222222-2222-4222-8222-222222222222';

const withAccess = (tenantId: string) => ({
  'x-dev-tenant-id': tenantId,
  'x-dev-user-id': '99999999-9999-4999-8999-999999999999'
});

describe('tenant core routes', () => {
  let repository: InMemoryTenantCoreRepository;

  beforeEach(async () => {
    repository = new InMemoryTenantCoreRepository();
    await repository.createTenant({ id: tenantA, name: 'Tenant A', slug: 'tenant-a' });
    await repository.createTenant({ id: tenantB, name: 'Tenant B', slug: 'tenant-b' });
  });

  it('creates, lists, and updates businesses for the active tenant', async () => {
    const app = createApp({ logger: createLogger('silent'), tenantCoreRepository: repository });
    const created = await request(app)
      .post('/api/v1/businesses')
      .set(withAccess(tenantA))
      .send({ code: 'shop_a', name: 'Shop A' });
    const list = await request(app).get('/api/v1/businesses').set(withAccess(tenantA));
    const updated = await request(app)
      .patch(`/api/v1/businesses/${created.body.data.id}`)
      .set(withAccess(tenantA))
      .send({ name: 'Shop A Prime' });

    expect(created.status).toBe(201);
    expect(list.body.data).toHaveLength(1);
    expect(updated.body.data.name).toBe('Shop A Prime');
    expect(updated.body.data.code).toBe('SHOP_A');
  });

  it('prevents one tenant from retrieving another tenant branches', async () => {
    const businessA = await repository.createBusiness({
      code: 'ALPHA',
      name: 'Alpha',
      tenantId: tenantA
    });
    const businessB = await repository.createBusiness({
      code: 'BRAVO',
      name: 'Bravo',
      tenantId: tenantB
    });

    await repository.createBranch({
      address: 'A Street',
      businessId: businessA.id,
      code: 'ALPHA-1',
      name: 'Alpha Branch',
      tenantId: tenantA
    });
    await repository.createBranch({
      address: 'B Street',
      businessId: businessB.id,
      code: 'BRAVO-1',
      name: 'Bravo Branch',
      tenantId: tenantB
    });

    const app = createApp({ logger: createLogger('silent'), tenantCoreRepository: repository });
    const response = await request(app).get('/api/v1/branches').set(withAccess(tenantA));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].tenantId).toBe(tenantA);
    expect(response.body.data[0].name).toBe('Alpha Branch');
  });

  it('registers and disables terminals within tenant scope', async () => {
    const business = await repository.createBusiness({
      code: 'STORE1',
      name: 'Store 1',
      tenantId: tenantA
    });
    const branch = await repository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'STORE1-A',
      name: 'Main',
      tenantId: tenantA
    });

    const app = createApp({ logger: createLogger('silent'), tenantCoreRepository: repository });
    const created = await request(app)
      .post('/api/v1/terminals')
      .set(withAccess(tenantA))
      .send({
        branchId: branch.id,
        code: 'POS-01',
        deviceInstallationId: 'android-tab-01',
        name: 'Front Counter'
      });
    const disabled = await request(app)
      .patch(`/api/v1/terminals/${created.body.data.id}/disable`)
      .set(withAccess(tenantA));

    expect(created.status).toBe(201);
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.isActive).toBe(false);
  });

  it('rejects protected routes without access context', async () => {
    const app = createApp({ logger: createLogger('silent'), tenantCoreRepository: repository });
    const response = await request(app).get('/api/v1/businesses');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('ACCESS_CONTEXT_REQUIRED');
  });
});
