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

describe('tenant core read permissions', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const repository = new InMemoryTenantCoreRepository();
    await repository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    const business = await repository.createBusiness({ code: 'STORE1', name: 'Store 1', tenantId });
    const branch = await repository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'STORE1-A',
      name: 'Main',
      tenantId
    });
    await repository.registerTerminal({
      branchId: branch.id,
      code: 'POS-01',
      deviceInstallationId: 'android-tab-01',
      name: 'Front Counter',
      tenantId
    });
    const managerId = '88888888-8888-4888-8888-888888888888';
    const cashierId = '77777777-7777-4777-8777-777777777777';
    const viewerId = '66666666-6666-4666-8666-666666666666';
    const authRepository = new InMemoryAuthRepository([
      await createUser('owner@example.com', 'BUSINESS_OWNER', '99999999-9999-4999-8999-999999999999'),
      await createUser('manager@example.com', 'BRANCH_MANAGER', managerId),
      await createUser('cashier@example.com', 'CASHIER', cashierId),
      await createUser('viewer@example.com', 'REPORT_VIEWER', viewerId)
    ]);

    await authRepository.replaceBranchAccessForUser(managerId, tenantId, [branch.id]);
    await authRepository.replaceBranchAccessForUser(cashierId, tenantId, [branch.id]);
    await authRepository.replaceBranchAccessForUser(viewerId, tenantId, [branch.id]);

    app = createApp({
      authConfig,
      authRepository,
      logger: createLogger('silent'),
      tenantCoreRepository: repository
    });
  });

  it('requires business:view to list businesses', async () => {
    const managerResponse = await request(app)
      .get('/api/v1/businesses')
      .set(await loginAs('manager@example.com'));
    const ownerResponse = await request(app)
      .get('/api/v1/businesses')
      .set(await loginAs('owner@example.com'));

    expect(managerResponse.status).toBe(403);
    expect(ownerResponse.status).toBe(200);
    expect(ownerResponse.body.data).toHaveLength(1);
  });

  it('requires branch:view to list branches', async () => {
    const cashierResponse = await request(app)
      .get('/api/v1/branches')
      .set(await loginAs('cashier@example.com'));
    const viewerResponse = await request(app)
      .get('/api/v1/branches')
      .set(await loginAs('viewer@example.com'));

    expect(cashierResponse.status).toBe(403);
    expect(viewerResponse.status).toBe(200);
    expect(viewerResponse.body.data).toHaveLength(1);
  });

  it('requires terminal:view to list terminals', async () => {
    const viewerResponse = await request(app)
      .get('/api/v1/terminals')
      .set(await loginAs('viewer@example.com'));
    const cashierResponse = await request(app)
      .get('/api/v1/terminals')
      .set(await loginAs('cashier@example.com'));

    expect(viewerResponse.status).toBe(403);
    expect(cashierResponse.status).toBe(200);
    expect(cashierResponse.body.data).toHaveLength(1);
  });

  const loginAs = async (email: string) => {
    const response = await request(app).post('/api/v1/auth/login').send({ email, password });

    expect(response.status).toBe(200);
    return { authorization: `Bearer ${response.body.data.accessToken}` };
  };
});

const createUser = async (
  email: string,
  role: 'BRANCH_MANAGER' | 'BUSINESS_OWNER' | 'CASHIER' | 'REPORT_VIEWER',
  id: string
) => ({
  displayName: email,
  email,
  id,
  isActive: true,
  passwordHash: await hashPassword(password),
  permissions: [],
  role,
  tenantId
});
