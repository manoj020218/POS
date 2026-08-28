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
const otherTenantId = '22222222-2222-4222-8222-222222222222';
const ownerId = '33333333-3333-4333-8333-333333333333';
const cashierId = '44444444-4444-4444-8444-444444444444';

describe('auth user branch access', () => {
  let app: ReturnType<typeof createApp>;
  let tenantRepository: InMemoryTenantCoreRepository;

  beforeEach(async () => {
    tenantRepository = new InMemoryTenantCoreRepository();
    await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    await tenantRepository.createTenant({
      id: otherTenantId,
      name: 'Tenant B',
      slug: 'tenant-b'
    });
    const business = await tenantRepository.createBusiness({
      code: 'STORE-A',
      name: 'Store A',
      tenantId
    });
    await tenantRepository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'BR-A1',
      name: 'Main',
      tenantId
    });
    await tenantRepository.createBranch({
      address: 'Market Road',
      businessId: business.id,
      code: 'BR-A2',
      name: 'Annex',
      tenantId
    });
    const otherBusiness = await tenantRepository.createBusiness({
      code: 'STORE-B',
      name: 'Store B',
      tenantId: otherTenantId
    });
    await tenantRepository.createBranch({
      address: 'Cross Road',
      businessId: otherBusiness.id,
      code: 'BR-B1',
      name: 'Other',
      tenantId: otherTenantId
    });

    app = createApp({
      authConfig,
      authRepository: new InMemoryAuthRepository([
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
        },
        {
          displayName: 'Other Owner',
          email: 'other-owner@example.com',
          id: '55555555-5555-4555-8555-555555555555',
          isActive: true,
          passwordHash: await hashPassword(password),
          permissions: [],
          role: 'BUSINESS_OWNER',
          tenantId: otherTenantId
        }
      ]),
      logger: createLogger('silent'),
      tenantCoreRepository: tenantRepository
    });
  });

  it('replaces and lists branch assignments for a tenant user', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const tenantBranches = await tenantRepository.listBranches(tenantId);
    const [firstBranch, secondBranch] = tenantBranches;

    expect(firstBranch).toBeDefined();
    expect(secondBranch).toBeDefined();

    const assigned = await request(app)
      .put(`/api/v1/auth/users/${cashierId}/branches`)
      .set(ownerAccess)
      .send({
        branchIds: [secondBranch!.id, firstBranch!.id, secondBranch!.id]
      });
    const listed = await request(app)
      .get(`/api/v1/auth/users/${cashierId}/branches`)
      .set(ownerAccess);
    const replaced = await request(app)
      .put(`/api/v1/auth/users/${cashierId}/branches`)
      .set(ownerAccess)
      .send({ branchIds: [firstBranch!.id] });

    expect(assigned.status).toBe(200);
    expect(assigned.body.data.map((branch: { branchId: string }) => branch.branchId)).toEqual([
      secondBranch!.id,
      firstBranch!.id
    ]);
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((branch: { branchId: string }) => branch.branchId).sort()).toEqual(
      [firstBranch!.id, secondBranch!.id].sort()
    );
    expect(replaced.status).toBe(200);
    expect(replaced.body.data).toHaveLength(1);
    expect(replaced.body.data[0].branchId).toBe(firstBranch!.id);
  });

  it('rejects assigning a branch from another tenant', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const [otherBranch] = await tenantRepository.listBranches(otherTenantId);

    expect(otherBranch).toBeDefined();

    const response = await request(app)
      .put(`/api/v1/auth/users/${cashierId}/branches`)
      .set(ownerAccess)
      .send({ branchIds: [otherBranch!.id] });

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('BRANCH_NOT_FOUND');
  });

  it(
    'rejects assigning branches to a user from another tenant',
    async () => {
      const ownerAccess = await loginAs('owner@example.com');
      const [tenantBranch] = await tenantRepository.listBranches(tenantId);

      expect(tenantBranch).toBeDefined();

      const response = await request(app)
        .put('/api/v1/auth/users/55555555-5555-4555-8555-555555555555/branches')
        .set(ownerAccess)
        .send({ branchIds: [tenantBranch!.id] });

      expect(response.status).toBe(404);
      expect(response.body.code).toBe('AUTH_USER_NOT_FOUND');
    },
    15000
  );

  it('requires user-manage permission for branch assignment endpoints', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const response = await request(app)
      .get(`/api/v1/auth/users/${cashierId}/branches`)
      .set(cashierAccess);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
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
