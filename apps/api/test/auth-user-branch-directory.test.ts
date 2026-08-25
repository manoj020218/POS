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

const password = 'Password123';
const tenantId = '11111111-1111-4111-8111-111111111111';
const ownerId = '33333333-3333-4333-8333-333333333333';
const cashierId = '44444444-4444-4444-8444-444444444444';

describe('auth user branch directory', () => {
  let app: ReturnType<typeof createApp>;
  let storeABusinessId: string;

  beforeEach(async () => {
    const tenantRepository = new InMemoryTenantCoreRepository();
    await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    const storeA = await tenantRepository.createBusiness({
      code: 'STORE-A',
      name: 'Store A',
      tenantId
    });
    const cafe = await tenantRepository.createBusiness({
      code: 'CAFE',
      name: 'Cafe',
      tenantId
    });
    await tenantRepository.createBranch({
      address: 'Main Road',
      businessId: storeA.id,
      code: 'MAIN',
      name: 'Main',
      tenantId
    });
    const annex = await tenantRepository.createBranch({
      address: 'Market Road',
      businessId: storeA.id,
      code: 'ANNEX',
      name: 'Annex',
      tenantId
    });
    const cafeCounter = await tenantRepository.createBranch({
      address: 'Cafe Road',
      businessId: cafe.id,
      code: 'CAFE-1',
      name: 'Cafe Counter',
      tenantId
    });

    storeABusinessId = storeA.id;
    const authRepository = new InMemoryAuthRepository([
      {
        displayName: 'Tenant Owner',
        email: 'owner@example.com',
        id: ownerId,
        isActive: true,
        passwordHash: await hashPassword(password),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId
      },
      {
        displayName: 'Cashier One',
        email: 'cashier@example.com',
        id: cashierId,
        isActive: true,
        passwordHash: await hashPassword(password),
        permissions: [],
        role: 'CASHIER',
        tenantId
      }
    ]);
    await authRepository.replaceBranchAccessForUser(cashierId, tenantId, [annex.id, cafeCounter.id]);

    app = createApp({
      authConfig,
      authRepository,
      logger: createLogger('silent'),
      tenantCoreRepository: tenantRepository
    });
  });

  it('lists the full branch directory with assignment state and business metadata', async () => {
    const response = await request(app)
      .get(`/api/v1/auth/users/${cashierId}/branches`)
      .query({ assignment: 'all' })
      .set(await loginAs('owner@example.com'));

    expect(response.status).toBe(200);
    expect(
      response.body.data.map(
        (branch: {
          assigned: boolean;
          branchId: string;
          businessCode: string;
          businessName: string;
          code: string;
        }) => [branch.businessCode, branch.businessName, branch.code, branch.assigned]
      )
    ).toEqual([
      ['STORE-A', 'Store A', 'MAIN', false],
      ['STORE-A', 'Store A', 'ANNEX', true],
      ['CAFE', 'Cafe', 'CAFE-1', true]
    ]);
  });

  it('filters the branch directory by business, assignment state, and search term', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const unassigned = await request(app)
      .get(`/api/v1/auth/users/${cashierId}/branches`)
      .query({ assignment: 'unassigned', businessId: storeABusinessId })
      .set(ownerAccess);
    const businessSearch = await request(app)
      .get(`/api/v1/auth/users/${cashierId}/branches`)
      .query({ assignment: 'all', search: 'cafe' })
      .set(ownerAccess);
    const branchSearch = await request(app)
      .get(`/api/v1/auth/users/${cashierId}/branches`)
      .query({ assignment: 'assigned', search: 'ann' })
      .set(ownerAccess);

    expect(unassigned.status).toBe(200);
    expect(unassigned.body.data.map((branch: { code: string }) => branch.code)).toEqual(['MAIN']);
    expect(businessSearch.status).toBe(200);
    expect(businessSearch.body.data.map((branch: { code: string }) => branch.code)).toEqual([
      'CAFE-1'
    ]);
    expect(branchSearch.status).toBe(200);
    expect(branchSearch.body.data.map((branch: { code: string }) => branch.code)).toEqual([
      'ANNEX'
    ]);
  });

  const loginAs = async (email: string) => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email,
      password
    });

    expect(response.status).toBe(200);
    return { authorization: `Bearer ${response.body.data.accessToken}` };
  };
});
