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

describe('auth sessions', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    app = createApp({
      authConfig,
      authRepository: new InMemoryAuthRepository([
        {
          displayName: 'Owner One',
          email: 'owner@example.com',
          id: '11111111-1111-4111-8111-111111111111',
          isActive: true,
          passwordHash: await hashPassword('Password123'),
          permissions: [],
          role: 'BUSINESS_OWNER',
          tenantId: '22222222-2222-4222-8222-222222222222'
        },
        {
          displayName: 'Cashier One',
          email: 'cashier@example.com',
          id: '33333333-3333-4333-8333-333333333333',
          isActive: true,
          passwordHash: await hashPassword('Password123'),
          permissions: [],
          role: 'CASHIER',
          tenantId: '22222222-2222-4222-8222-222222222222'
        }
      ]),
      logger: createLogger('silent')
    });
  });

  it('lists only the authenticated user sessions and marks the current session', async () => {
    const firstLogin = await login('owner@example.com', 'owner-tab-01', 'Front Counter');
    await login('cashier@example.com', 'cashier-tab-01', 'Back Counter');
    const secondLogin = await login('owner@example.com', 'owner-tab-02', 'Office Desk');
    const response = await request(app)
      .get('/api/v1/auth/sessions')
      .set('authorization', `Bearer ${secondLogin.body.data.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(response.body.data[0].id).toBe(secondLogin.body.data.session.id);
    expect(response.body.data[0].isCurrent).toBe(true);
    expect(response.body.data[1].id).toBe(firstLogin.body.data.session.id);
    expect(response.body.data[1].deviceName).toBe('Front Counter');
  });

  it('revokes the targeted session and blocks refresh for that session', async () => {
    const firstLogin = await login('owner@example.com', 'owner-tab-01', 'Front Counter');
    const secondLogin = await login('owner@example.com', 'owner-tab-02', 'Office Desk');
    const revoked = await request(app)
      .delete(`/api/v1/auth/sessions/${firstLogin.body.data.session.id}`)
      .set('authorization', `Bearer ${secondLogin.body.data.accessToken}`);
    const refreshAfterRevoke = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: firstLogin.body.data.refreshToken
    });

    expect(revoked.status).toBe(204);
    expect(refreshAfterRevoke.status).toBe(401);
    expect(refreshAfterRevoke.body.code).toBe('AUTH_SESSION_REVOKED');
  });

  it('does not allow revoking another user session', async () => {
    const ownerLogin = await login('owner@example.com', 'owner-tab-01', 'Front Counter');
    const cashierLogin = await login('cashier@example.com', 'cashier-tab-01', 'Back Counter');
    const response = await request(app)
      .delete(`/api/v1/auth/sessions/${cashierLogin.body.data.session.id}`)
      .set('authorization', `Bearer ${ownerLogin.body.data.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.code).toBe('AUTH_SESSION_NOT_FOUND');
  });

  const login = (email: string, deviceInstallationId: string, deviceName: string) =>
    request(app).post('/api/v1/auth/login').send({
      deviceInstallationId,
      deviceName,
      email,
      password: 'Password123'
    });
});
