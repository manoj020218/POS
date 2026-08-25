import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { InMemoryAuthRepository } from '../src/modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import type { AuthUserRecord } from '../src/modules/auth/auth.types.js';
import { InMemoryTenantCoreRepository } from '../src/modules/tenant-core/in-memory-tenant-core.repository.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};

const password = 'Password123';
const tenantId = '11111111-1111-4111-8111-111111111111';
const ownerId = '99999999-9999-4999-8999-999999999999';
const managerId = '88888888-8888-4888-8888-888888888888';
const cashierId = '77777777-7777-4777-8777-777777777777';
const operatorId = '66666666-6666-4666-8666-666666666666';

describe('tenant core branch scope', () => {
  let app: ReturnType<typeof createApp>;
  let authRepository: InMemoryAuthRepository;
  let mainBranchId: string;
  let annexBranchId: string;
  let mainTerminalId: string;
  let annexTerminalId: string;

  beforeEach(async () => {
    const repository = new InMemoryTenantCoreRepository();
    await repository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    const business = await repository.createBusiness({
      code: 'STORE1',
      name: 'Store 1',
      tenantId
    });
    const main = await repository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'STORE1-A',
      name: 'Main',
      tenantId
    });
    const annex = await repository.createBranch({
      address: 'Annex Road',
      businessId: business.id,
      code: 'STORE1-B',
      name: 'Annex',
      tenantId
    });
    const mainTerminal = await repository.registerTerminal({
      branchId: main.id,
      code: 'POS-01',
      deviceInstallationId: 'android-tab-01',
      name: 'Front Counter',
      tenantId
    });
    const annexTerminal = await repository.registerTerminal({
      branchId: annex.id,
      code: 'POS-02',
      deviceInstallationId: 'android-tab-02',
      name: 'Back Counter',
      tenantId
    });

    mainBranchId = main.id;
    annexBranchId = annex.id;
    mainTerminalId = mainTerminal.id;
    annexTerminalId = annexTerminal.id;
    authRepository = new InMemoryAuthRepository([
      await createUser('owner@example.com', 'BUSINESS_OWNER', ownerId),
      await createUser('manager@example.com', 'BRANCH_MANAGER', managerId),
      await createUser('cashier@example.com', 'CASHIER', cashierId),
      await createUser('operator@example.com', 'CASHIER', operatorId, [
        'branch:update',
        'terminal:create',
        'terminal:disable'
      ])
    ]);
    await authRepository.replaceBranchAccessForUser(managerId, tenantId, [mainBranchId]);
    await authRepository.replaceBranchAccessForUser(cashierId, tenantId, [mainBranchId]);
    await authRepository.replaceBranchAccessForUser(operatorId, tenantId, [mainBranchId]);

    app = createApp({
      authConfig,
      authRepository,
      logger: createLogger('silent'),
      tenantCoreRepository: repository
    });
  });

  it('lets tenant-wide roles list every branch', async () => {
    const response = await request(app)
      .get('/api/v1/branches')
      .set(await loginAs('owner@example.com'));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
  });

  it('filters branch and terminal lists to assigned branches', async () => {
    const branches = await request(app)
      .get('/api/v1/branches')
      .set(await loginAs('manager@example.com'));
    const terminals = await request(app)
      .get('/api/v1/terminals')
      .set(await loginAs('cashier@example.com'));

    expect(branches.status).toBe(200);
    expect(branches.body.data.map((branch: { id: string }) => branch.id)).toEqual([mainBranchId]);
    expect(terminals.status).toBe(200);
    expect(terminals.body.data.map((terminal: { id: string }) => terminal.id)).toEqual([
      mainTerminalId
    ]);
  });

  it('returns an empty list when a restricted user has no branch assignments', async () => {
    await authRepository.replaceBranchAccessForUser(managerId, tenantId, []);
    const response = await request(app)
      .get('/api/v1/branches')
      .set(await loginAs('manager@example.com'));

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('rejects listing terminals for an unassigned branch', async () => {
    const response = await request(app)
      .get('/api/v1/terminals')
      .query({ branchId: annexBranchId })
      .set(await loginAs('cashier@example.com'));

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('applies assignment changes on the next request without re-login', async () => {
    const access = await loginAs('manager@example.com');
    const before = await request(app).get('/api/v1/branches').set(access);
    await authRepository.replaceBranchAccessForUser(managerId, tenantId, [annexBranchId]);
    const after = await request(app).get('/api/v1/branches').set(access);

    expect(before.body.data.map((branch: { id: string }) => branch.id)).toEqual([mainBranchId]);
    expect(after.body.data.map((branch: { id: string }) => branch.id)).toEqual([annexBranchId]);
  });

  it('blocks terminal and branch writes outside the assigned branch set', async () => {
    const access = await loginAs('operator@example.com');
    const created = await request(app).post('/api/v1/terminals').set(access).send({
      branchId: annexBranchId,
      code: 'POS-03',
      deviceInstallationId: 'android-tab-03',
      name: 'Side Counter'
    });
    const updated = await request(app)
      .patch(`/api/v1/branches/${annexBranchId}`)
      .set(access)
      .send({ name: 'Annex Prime' });
    const disabled = await request(app)
      .patch(`/api/v1/terminals/${annexTerminalId}/disable`)
      .set(access);

    expect(created.status).toBe(403);
    expect(updated.status).toBe(403);
    expect(disabled.status).toBe(403);
    expect(created.body.code).toBe('BRANCH_ACCESS_DENIED');
  });

  it('allows terminal writes inside the assigned branch set', async () => {
    const access = await loginAs('operator@example.com');
    const created = await request(app).post('/api/v1/terminals').set(access).send({
      branchId: mainBranchId,
      code: 'POS-03',
      deviceInstallationId: 'android-tab-03',
      name: 'Side Counter'
    });
    const disabled = await request(app)
      .patch(`/api/v1/terminals/${mainTerminalId}/disable`)
      .set(access);

    expect(created.status).toBe(201);
    expect(created.body.data.branchId).toBe(mainBranchId);
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.isActive).toBe(false);
  });

  const loginAs = async (email: string) => {
    const response = await request(app).post('/api/v1/auth/login').send({ email, password });
    expect(response.status).toBe(200);
    return { authorization: `Bearer ${response.body.data.accessToken}` };
  };
});

const createUser = async (
  email: string,
  role: AuthUserRecord['role'],
  id: string,
  permissions: AuthUserRecord['permissions'] = []
): Promise<AuthUserRecord> => ({
  displayName: email,
  email,
  id,
  isActive: true,
  passwordHash: await hashPassword(password),
  permissions,
  role,
  tenantId
});
