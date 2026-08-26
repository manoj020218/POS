import request from 'supertest';

import { createApp } from '../../src/app.js';
import { createLogger } from '../../src/lib/logger.js';
import { InMemoryAuthRepository } from '../../src/modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../../src/modules/auth/password.js';
import { InMemoryTenantCoreRepository } from '../../src/modules/tenant-core/in-memory-tenant-core.repository.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};

const password = 'Password123';
const tenantId = '11111111-1111-4111-8111-111111111111';

export const createCatalogTestContext = async () => {
  const tenantRepository = new InMemoryTenantCoreRepository();
  await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
  const businessA = await tenantRepository.createBusiness({
    code: 'STORE-A',
    name: 'Store A',
    tenantId
  });
  const businessB = await tenantRepository.createBusiness({
    code: 'STORE-B',
    name: 'Store B',
    tenantId
  });
  const branchA = await tenantRepository.createBranch({
    address: 'Main Road',
    businessId: businessA.id,
    code: 'BR-A1',
    name: 'Store A Main',
    tenantId
  });
  await tenantRepository.createBranch({
    address: 'Annex Road',
    businessId: businessB.id,
    code: 'BR-B1',
    name: 'Store B Main',
    tenantId
  });
  const branchB = (await tenantRepository.listBranches(tenantId, businessB.id))[0]!;
  const terminalA = await tenantRepository.registerTerminal({
    branchId: branchA.id,
    code: 'TERM-A1',
    name: 'Terminal A1',
    tenantId
  });
  const terminalB = await tenantRepository.registerTerminal({
    branchId: branchB.id,
    code: 'TERM-B1',
    name: 'Terminal B1',
    tenantId
  });

  const authRepository = new InMemoryAuthRepository([
    await buildUser('22222222-2222-4222-8222-222222222222', 'owner@example.com', 'Owner', 'BUSINESS_OWNER'),
    await buildUser('33333333-3333-4333-8333-333333333333', 'manager@example.com', 'Manager', 'BRANCH_MANAGER'),
    await buildUser('44444444-4444-4444-8444-444444444444', 'cashier@example.com', 'Cashier', 'CASHIER')
  ]);
  await authRepository.replaceBranchAccessForUser(
    '33333333-3333-4333-8333-333333333333',
    tenantId,
    [branchA.id]
  );
  await authRepository.replaceBranchAccessForUser(
    '44444444-4444-4444-8444-444444444444',
    tenantId,
    [branchA.id]
  );

  const app = createApp({
    authConfig,
    authRepository,
    logger: createLogger('silent'),
    tenantCoreRepository: tenantRepository
  });

  return {
    app,
    branchAId: branchA.id,
    branchBId: branchB.id,
    businessAId: businessA.id,
    businessBId: businessB.id,
    loginAs: async (email: string) => {
      const response = await request(app).post('/api/v1/auth/login').send({ email, password });
      return { authorization: `Bearer ${response.body.data.accessToken}` };
    },
    terminalAId: terminalA.id,
    terminalBId: terminalB.id
  };
};

const buildUser = async (
  id: string,
  email: string,
  displayName: string,
  role: 'BUSINESS_OWNER' | 'BRANCH_MANAGER' | 'CASHIER'
) => ({
  displayName,
  email,
  id,
  isActive: true,
  passwordHash: await hashPassword(password),
  permissions: [],
  role,
  tenantId
});
