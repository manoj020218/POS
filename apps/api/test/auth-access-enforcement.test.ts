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
const adminId = '22222222-2222-4222-8222-222222222222';
const cashierId = '33333333-3333-4333-8333-333333333333';
const tenantId = '44444444-4444-4444-8444-444444444444';
const password = 'Password123';

describe('auth access enforcement', () => {
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
        }
      ]),
      logger: createLogger('silent')
    });
  });

  it('rejects protected-route access tokens after logout revokes the session', async () => {
    const ownerLogin = await login('owner@example.com');
    const beforeLogout = await request(app)
      .get('/api/v1/terminals')
      .set(accessHeader(ownerLogin.accessToken));
    const logout = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: ownerLogin.refreshToken
    });
    const afterLogout = await request(app)
      .get('/api/v1/terminals')
      .set(accessHeader(ownerLogin.accessToken));

    expect(beforeLogout.status).toBe(200);
    expect(logout.status).toBe(204);
    expect(afterLogout.status).toBe(401);
    expect(afterLogout.body.code).toBe('AUTH_SESSION_REVOKED');
  });

  it('rejects protected-route access tokens immediately after the user is disabled', async () => {
    const ownerAccess = accessHeader((await login('owner@example.com')).accessToken);
    const cashierLogin = await login('cashier@example.com');
    const beforeDisable = await request(app)
      .get('/api/v1/terminals')
      .set(accessHeader(cashierLogin.accessToken));
    const disabled = await request(app)
      .patch(`/api/v1/auth/users/${cashierId}`)
      .set(ownerAccess)
      .send({ isActive: false });
    const afterDisable = await request(app)
      .get('/api/v1/terminals')
      .set(accessHeader(cashierLogin.accessToken));

    expect(beforeDisable.status).toBe(200);
    expect(disabled.status).toBe(200);
    expect(afterDisable.status).toBe(403);
    expect(afterDisable.body.code).toBe('USER_DISABLED');
  });

  it(
    'rejects protected-route access tokens immediately after a role change revokes the session',
    async () => {
    const ownerAccess = accessHeader((await login('owner@example.com')).accessToken);
    const adminLogin = await login('admin@example.com');
    const beforeRoleChange = await request(app)
      .get('/api/v1/auth/users')
      .set(accessHeader(adminLogin.accessToken));
    const roleChanged = await request(app)
      .patch(`/api/v1/auth/users/${adminId}`)
      .set(ownerAccess)
      .send({ role: 'CASHIER' });
    const afterRoleChange = await request(app)
      .get('/api/v1/auth/users')
      .set(accessHeader(adminLogin.accessToken));
    const refreshAfterRoleChange = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: adminLogin.refreshToken
    });

    expect(beforeRoleChange.status).toBe(200);
    expect(roleChanged.status).toBe(200);
    expect(afterRoleChange.status).toBe(401);
    expect(afterRoleChange.body.code).toBe('AUTH_SESSION_REVOKED');
    expect(refreshAfterRoleChange.status).toBe(401);
    expect(refreshAfterRoleChange.body.code).toBe('AUTH_SESSION_REVOKED');
    },
    15000
  );

  const login = async (email: string) => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email,
      password
    });

    expect(response.status).toBe(200);
    return response.body.data as { accessToken: string; refreshToken: string };
  };
});

const accessHeader = (accessToken: string) => ({
  authorization: `Bearer ${accessToken}`
});
