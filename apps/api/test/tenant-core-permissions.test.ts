import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { InMemoryAuthRepository } from '../src/modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { InMemoryTenantCoreRepository } from '../src/modules/tenant-core/in-memory-tenant-core.repository.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};

const tenantId = '11111111-1111-4111-8111-111111111111';
const password = 'Password123';

describe('tenant core write permissions', () => {
  let authRepository: InMemoryAuthRepository;
  let repository: InMemoryTenantCoreRepository;

  beforeEach(async () => {
    repository = new InMemoryTenantCoreRepository();
    await repository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    authRepository = new InMemoryAuthRepository([
      {
        displayName: 'Tenant Owner',
        email: 'owner@example.com',
        id: '99999999-9999-4999-8999-999999999999',
        isActive: true,
        passwordHash: await hashPassword(password),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId
      },
      {
        displayName: 'Reports User',
        email: 'viewer@example.com',
        id: '88888888-8888-4888-8888-888888888888',
        isActive: true,
        passwordHash: await hashPassword(password),
        permissions: [],
        role: 'REPORT_VIEWER',
        tenantId
      }
    ]);
  });

  it('rejects business writes without business permissions', async () => {
    const app = createTenantCoreApp(repository, authRepository);
    const ownerAccess = await loginAs(app, 'owner@example.com');
    const viewerAccess = await loginAs(app, 'viewer@example.com');
    const business = await repository.createBusiness({
      code: 'STORE1',
      name: 'Store 1',
      tenantId
    });

    const created = await request(app)
      .post('/api/v1/businesses')
      .set(viewerAccess)
      .send({ code: 'shop_a', name: 'Shop A' });
    const updated = await request(app)
      .patch(`/api/v1/businesses/${business.id}`)
      .set(viewerAccess)
      .send({ name: 'Shop A Prime' });
    const ownerUpdate = await request(app)
      .patch(`/api/v1/businesses/${business.id}`)
      .set(ownerAccess)
      .send({ name: 'Owner Updated Shop' });

    expect(created.status).toBe(403);
    expect(updated.status).toBe(403);
    expect(ownerUpdate.status).toBe(200);
  });

  it('rejects branch writes without branch permissions', async () => {
    const app = createTenantCoreApp(repository, authRepository);
    const viewerAccess = await loginAs(app, 'viewer@example.com');
    const business = await repository.createBusiness({
      code: 'STORE1',
      name: 'Store 1',
      tenantId
    });
    const branch = await repository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'STORE1-A',
      name: 'Main',
      tenantId
    });

    const created = await request(app)
      .post('/api/v1/branches')
      .set(viewerAccess)
      .send({ address: 'Annex', businessId: business.id, code: 'STORE1-B', name: 'Annex' });
    const updated = await request(app)
      .patch(`/api/v1/branches/${branch.id}`)
      .set(viewerAccess)
      .send({ name: 'Annex Prime' });

    expect(created.status).toBe(403);
    expect(updated.status).toBe(403);
  });

  it('rejects terminal writes without terminal permissions', async () => {
    const app = createTenantCoreApp(repository, authRepository);
    const viewerAccess = await loginAs(app, 'viewer@example.com');
    const business = await repository.createBusiness({
      code: 'STORE1',
      name: 'Store 1',
      tenantId
    });
    const branch = await repository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'STORE1-A',
      name: 'Main',
      tenantId
    });
    const terminal = await repository.registerTerminal({
      branchId: branch.id,
      code: 'POS-01',
      deviceInstallationId: 'android-tab-01',
      name: 'Front Counter',
      tenantId
    });

    const created = await request(app)
      .post('/api/v1/terminals')
      .set(viewerAccess)
      .send({
        branchId: branch.id,
        code: 'POS-02',
        deviceInstallationId: 'android-tab-02',
        name: 'Back Counter'
      });
    const disabled = await request(app)
      .patch(`/api/v1/terminals/${terminal.id}/disable`)
      .set(viewerAccess);

    expect(created.status).toBe(403);
    expect(disabled.status).toBe(403);
  });
});

const createTenantCoreApp = (
  repository: InMemoryTenantCoreRepository,
  authRepository: InMemoryAuthRepository
) =>
  createApp({
    authConfig,
    authRepository,
    logger: createLogger('silent'),
    tenantCoreRepository: repository
  });

const loginAs = async (app: ReturnType<typeof createApp>, email: string) => {
  const response = await request(app).post('/api/v1/auth/login').send({
    email,
    password
  });

  expect(response.status).toBe(200);
  return { authorization: `Bearer ${response.body.data.accessToken}` };
};
