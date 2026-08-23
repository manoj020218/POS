import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { InMemoryAuthRepository } from '../src/modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import type { PasswordResetTokenSink } from '../src/modules/auth/password-reset.service.js';

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

  beforeEach(async () => {
    const passwordResetTokenSink: PasswordResetTokenSink = ({ token }) => {
      resetToken = token;
    };

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
      logger: createLogger('silent')
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

    expect(changed.status).toBe(204);
    expect(requested.status).toBe(202);
    expect(confirmed.status).toBe(204);
    expect(ownerLogs.map((log) => log.action)).toContain('AUTH_PASSWORD_CHANGED');
    expect(ownerLogs[0]!).toMatchObject({
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

  const loginAs = (email: string, userPassword: string) =>
    request(app).post('/api/v1/auth/login').send({
      email,
      password: userPassword
    });
});
