import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { InMemoryAuthRepository } from '../src/modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import type { PasswordResetTokenSink } from '../src/modules/auth/password-reset.service.js';
import { InMemoryTenantCoreRepository } from '../src/modules/tenant-core/in-memory-tenant-core.repository.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};

const ownerId = '11111111-1111-4111-8111-111111111111';
const cashierId = '22222222-2222-4222-8222-222222222222';
const tenantId = '33333333-3333-4333-8333-333333333333';
const password = 'Password123';

describe('auth audit logging', () => {
  let app: ReturnType<typeof createApp>;
  let repository: InMemoryAuthRepository;
  let resetToken: string | undefined;
  let branchIds: string[];

  beforeEach(async () => {
    const passwordResetTokenSink: PasswordResetTokenSink = ({ token }) => {
      resetToken = token;
    };
    const tenantRepository = new InMemoryTenantCoreRepository();
    await tenantRepository.createTenant({ id: tenantId, name: 'Tenant A', slug: 'tenant-a' });
    const business = await tenantRepository.createBusiness({
      code: 'STORE-1',
      name: 'Store 1',
      tenantId
    });
    const mainBranch = await tenantRepository.createBranch({
      address: 'Main Road',
      businessId: business.id,
      code: 'STORE-1A',
      name: 'Main',
      tenantId
    });
    const annexBranch = await tenantRepository.createBranch({
      address: 'Annex Road',
      businessId: business.id,
      code: 'STORE-1B',
      name: 'Annex',
      tenantId
    });
    branchIds = [mainBranch.id, annexBranch.id];

    repository = new InMemoryAuthRepository([
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
    app = createApp({
      authConfig: { ...authConfig, passwordResetTokenSink },
      authRepository: repository,
      logger: createLogger('silent'),
      tenantCoreRepository: tenantRepository
    });
  });

  it('audits password change and password reset lifecycle events', async () => {
    const ownerLogin = await loginAs('owner@example.com', password);
    const changed = await request(app)
      .post('/api/v1/auth/password/change')
      .set('authorization', `Bearer ${ownerLogin.body.data.accessToken}`)
      .send({
        currentPassword: password,
        newPassword: 'Password456'
      });
    const requested = await request(app).post('/api/v1/auth/password/reset/request').send({
      email: 'cashier@example.com'
    });
    expect(resetToken).toBeDefined();
    const confirmed = await request(app).post('/api/v1/auth/password/reset/confirm').send({
      newPassword: 'Password789',
      resetToken: resetToken!
    });
    const ownerLogs = await repository.listAuditLogsForEntity(tenantId, 'auth_user', ownerId);
    const cashierLogs = await repository.listAuditLogsForEntity(tenantId, 'auth_user', cashierId);
    const passwordChangeLog = ownerLogs.find((log) => log.action === 'AUTH_PASSWORD_CHANGED');

    expect(changed.status).toBe(204);
    expect(requested.status).toBe(202);
    expect(confirmed.status).toBe(204);
    expect(ownerLogs.map((log) => log.action)).toContain('AUTH_PASSWORD_CHANGED');
    expect(passwordChangeLog).toMatchObject({
      action: 'AUTH_PASSWORD_CHANGED',
      actorUserId: ownerId,
      entityId: ownerId
    });
    expect(cashierLogs.map((log) => log.action)).toEqual([
      'AUTH_PASSWORD_RESET_REQUESTED',
      'AUTH_PASSWORD_RESET_COMPLETED'
    ]);
  });

  it('audits auth user create and update mutations', async () => {
    const ownerLogin = await loginAs('owner@example.com', password);
    const created = await request(app)
      .post('/api/v1/auth/users')
      .set('authorization', `Bearer ${ownerLogin.body.data.accessToken}`)
      .send({
        displayName: 'Counter Two',
        email: 'counter.two@example.com',
        password,
        role: 'CASHIER'
      });
    const updated = await request(app)
      .patch(`/api/v1/auth/users/${cashierId}`)
      .set('authorization', `Bearer ${ownerLogin.body.data.accessToken}`)
      .send({
        displayName: 'Cashier Prime',
        role: 'BRANCH_MANAGER'
      });
    const createdLogs = await repository.listAuditLogsForEntity(
      tenantId,
      'auth_user',
      created.body.data.id
    );
    const updatedLogs = await repository.listAuditLogsForEntity(tenantId, 'auth_user', cashierId);

    expect(created.status).toBe(201);
    expect(updated.status).toBe(200);
    expect(createdLogs[0]!).toMatchObject({
      action: 'AUTH_USER_CREATED',
      actorUserId: ownerId,
      entityId: created.body.data.id
    });
    expect(updatedLogs[0]!).toMatchObject({
      action: 'AUTH_USER_UPDATED',
      actorUserId: ownerId,
      entityId: cashierId,
      metadata: expect.objectContaining({
        changedFields: ['displayName', 'role'],
        nextRole: 'BRANCH_MANAGER',
        previousRole: 'CASHIER'
      })
    });
  });

  it('audits login, refresh, logout, and explicit session revocation events', async () => {
    const firstLogin = await request(app)
      .post('/api/v1/auth/login')
      .set('user-agent', 'owner-agent/1')
      .send({
        deviceInstallationId: 'owner-tab-01',
        deviceName: 'Front Counter',
        email: 'owner@example.com',
        password
      });
    const refreshed = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: firstLogin.body.data.refreshToken
    });
    const secondLogin = await request(app).post('/api/v1/auth/login').send({
      deviceInstallationId: 'owner-tab-02',
      deviceName: 'Office Desk',
      email: 'owner@example.com',
      password
    });
    const revoked = await request(app)
      .delete(`/api/v1/auth/sessions/${firstLogin.body.data.session.id}`)
      .set('authorization', `Bearer ${secondLogin.body.data.accessToken}`);
    const loggedOut = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: secondLogin.body.data.refreshToken
    });
    const ownerLogs = await repository.listAuditLogsForEntity(tenantId, 'auth_user', ownerId);
    const loginLogs = ownerLogs.filter((log) => log.action === 'AUTH_LOGIN_COMPLETED');
    const refreshLog = ownerLogs.find((log) => log.action === 'AUTH_REFRESH_COMPLETED');
    const logoutLog = ownerLogs.find((log) => log.action === 'AUTH_LOGOUT_COMPLETED');
    const revokedLog = ownerLogs.find((log) => log.action === 'AUTH_SESSION_REVOKED');

    expect(firstLogin.status).toBe(200);
    expect(refreshed.status).toBe(200);
    expect(secondLogin.status).toBe(200);
    expect(revoked.status).toBe(204);
    expect(loggedOut.status).toBe(204);
    expect(loginLogs).toHaveLength(2);
    expect(loginLogs[0]!).toMatchObject({
      action: 'AUTH_LOGIN_COMPLETED',
      actorUserId: ownerId,
      entityId: ownerId,
      metadata: expect.objectContaining({
        deviceInstallationId: 'owner-tab-01',
        deviceName: 'Front Counter',
        sessionId: firstLogin.body.data.session.id
      })
    });
    expect(refreshLog).toMatchObject({
      action: 'AUTH_REFRESH_COMPLETED',
      actorUserId: ownerId,
      entityId: ownerId,
      metadata: {
        nextExpiresAt: refreshed.body.data.refreshTokenExpiresAt,
        previousExpiresAt: firstLogin.body.data.refreshTokenExpiresAt,
        sessionId: firstLogin.body.data.session.id
      }
    });
    expect(revokedLog).toMatchObject({
      action: 'AUTH_SESSION_REVOKED',
      actorUserId: ownerId,
      entityId: ownerId,
      metadata: { sessionId: firstLogin.body.data.session.id }
    });
    expect(logoutLog).toMatchObject({
      action: 'AUTH_LOGOUT_COMPLETED',
      actorUserId: ownerId,
      entityId: ownerId,
      metadata: { sessionId: secondLogin.body.data.session.id }
    });
  });

  it('audits branch assignment replacements with safe delta metadata', async () => {
    const ownerLogin = await loginAs('owner@example.com', password);
    const assigned = await request(app)
      .put(`/api/v1/auth/users/${cashierId}/branches`)
      .set('authorization', `Bearer ${ownerLogin.body.data.accessToken}`)
      .send({
        branchIds: [branchIds[1]!, branchIds[0]!, branchIds[1]!]
      });
    const replaced = await request(app)
      .put(`/api/v1/auth/users/${cashierId}/branches`)
      .set('authorization', `Bearer ${ownerLogin.body.data.accessToken}`)
      .send({ branchIds: [branchIds[0]!] });
    const unchanged = await request(app)
      .put(`/api/v1/auth/users/${cashierId}/branches`)
      .set('authorization', `Bearer ${ownerLogin.body.data.accessToken}`)
      .send({ branchIds: [branchIds[0]!, branchIds[0]!] });
    const cashierLogs = await repository.listAuditLogsForEntity(tenantId, 'auth_user', cashierId);
    const branchAccessLogs = cashierLogs.filter(
      (log) => log.action === 'AUTH_USER_BRANCH_ACCESS_REPLACED'
    );

    expect(assigned.status).toBe(200);
    expect(replaced.status).toBe(200);
    expect(unchanged.status).toBe(200);
    expect(branchAccessLogs).toHaveLength(2);
    expect(branchAccessLogs[0]!).toMatchObject({
      action: 'AUTH_USER_BRANCH_ACCESS_REPLACED',
      actorUserId: ownerId,
      entityId: cashierId,
      metadata: {
        addedBranchIds: [...branchIds].sort(),
        nextBranchIds: [...branchIds].sort(),
        previousBranchIds: [],
        removedBranchIds: []
      }
    });
    expect(branchAccessLogs[1]!).toMatchObject({
      action: 'AUTH_USER_BRANCH_ACCESS_REPLACED',
      actorUserId: ownerId,
      entityId: cashierId,
      metadata: {
        addedBranchIds: [],
        nextBranchIds: [branchIds[0]!],
        previousBranchIds: [...branchIds].sort(),
        removedBranchIds: [branchIds[1]!]
      }
    });
  });

  const loginAs = (email: string, userPassword: string) =>
    request(app).post('/api/v1/auth/login').send({
      email,
      password: userPassword
    });
});
