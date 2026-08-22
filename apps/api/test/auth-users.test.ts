import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { InMemoryAuthRepository } from '../src/modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};

const ownerId = '11111111-1111-4111-8111-111111111111';
const cashierId = '22222222-2222-4222-8222-222222222222';
const adminId = '33333333-3333-4333-8333-333333333333';
const tenantId = '44444444-4444-4444-8444-444444444444';
const otherTenantId = '55555555-5555-4555-8555-555555555555';
const password = 'Password123';

describe('auth user management', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
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
          displayName: 'Tenant Admin',
          email: 'admin@example.com',
          id: adminId,
          isActive: true,
          passwordHash: await hashPassword(password),
          permissions: [],
          role: 'BUSINESS_ADMIN',
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
          displayName: 'Other Tenant Owner',
          email: 'other-owner@example.com',
          id: '66666666-6666-4666-8666-666666666666',
          isActive: true,
          passwordHash: await hashPassword(password),
          permissions: [],
          role: 'BUSINESS_OWNER',
          tenantId: otherTenantId
        }
      ]),
      logger: createLogger('silent')
    });
  });

  it('creates, lists, and updates tenant users', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const created = await request(app).post('/api/v1/auth/users').set(ownerAccess).send({
      displayName: 'Counter Two',
      email: 'counter.two@example.com',
      password,
      role: 'CASHIER'
    });
    const listed = await request(app).get('/api/v1/auth/users').set(ownerAccess);
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'counter.two@example.com',
      password
    });
    const updated = await request(app)
      .patch(`/api/v1/auth/users/${created.body.data.id}`)
      .set(ownerAccess)
      .send({
        displayName: 'Counter Lead',
        role: 'BRANCH_MANAGER'
      });

    expect(created.status).toBe(201);
    expect(created.body.data.permissions).toContain('sale:create');
    expect(created.body.data.customPermissions).toEqual([]);
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((user: { email: string }) => user.email)).toContain(
      'counter.two@example.com'
    );
    expect(listed.body.data.map((user: { email: string }) => user.email)).not.toContain(
      'other-owner@example.com'
    );
    expect(login.status).toBe(200);
    expect(updated.status).toBe(200);
    expect(updated.body.data.displayName).toBe('Counter Lead');
    expect(updated.body.data.permissions).toContain('report:view');
  });

  it('rejects management requests without user-manage permission', async () => {
    const cashierAccess = await loginAs('cashier@example.com');
    const response = await request(app).get('/api/v1/auth/users').set(cashierAccess);

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('prevents assigning a role with broader permissions than the actor has', async () => {
    const adminAccess = await loginAs('admin@example.com');
    const response = await request(app).post('/api/v1/auth/users').set(adminAccess).send({
      displayName: 'Escalated Owner',
      email: 'escalated@example.com',
      password,
      role: 'BUSINESS_OWNER'
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('AUTH_ROLE_ASSIGNMENT_FORBIDDEN');
  });

  it('revokes sessions when a user is disabled', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const cashierLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'cashier@example.com',
      password
    });
    const disabled = await request(app)
      .patch(`/api/v1/auth/users/${cashierId}`)
      .set(ownerAccess)
      .send({ isActive: false });
    const refreshAfterDisable = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: cashierLogin.body.data.refreshToken
    });
    const loginAfterDisable = await request(app).post('/api/v1/auth/login').send({
      email: 'cashier@example.com',
      password
    });

    expect(disabled.status).toBe(200);
    expect(refreshAfterDisable.status).toBe(401);
    expect(refreshAfterDisable.body.code).toBe('AUTH_SESSION_REVOKED');
    expect(loginAfterDisable.status).toBe(403);
    expect(loginAfterDisable.body.code).toBe('USER_DISABLED');
  });

  it('does not allow a user to disable their own account', async () => {
    const ownerAccess = await loginAs('owner@example.com');
    const response = await request(app)
      .patch(`/api/v1/auth/users/${ownerId}`)
      .set(ownerAccess)
      .send({ isActive: false });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('AUTH_SELF_DISABLE_FORBIDDEN');
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
