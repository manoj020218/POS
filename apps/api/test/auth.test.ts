import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { InMemoryAuthRepository } from '../src/modules/auth/in-memory-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { accessTokenPayloadSchema } from '../src/modules/auth/auth.schemas.js';
import { verifyToken } from '../src/modules/auth/token.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};

describe('auth routes', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    const repository = new InMemoryAuthRepository([
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
        displayName: 'Disabled User',
        email: 'disabled@example.com',
        id: '33333333-3333-4333-8333-333333333333',
        isActive: false,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'CASHIER',
        tenantId: '22222222-2222-4222-8222-222222222222'
      }
    ]);

    app = createApp({
      authConfig,
      authRepository: repository,
      logger: createLogger('silent')
    });
  });

  it('logs in and returns signed tokens plus session metadata', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .set('user-agent', 'vitest')
      .send({
        deviceInstallationId: 'android-tab-01',
        deviceName: 'Front Counter',
        email: 'owner@example.com',
        password: 'Password123'
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user.role).toBe('BUSINESS_OWNER');
    expect(response.body.data.session.deviceInstallationId).toBe('android-tab-01');

    const payload = verifyToken(
      response.body.data.accessToken,
      authConfig.jwtSecret,
      accessTokenPayloadSchema
    );

    expect(payload.email).toBe('owner@example.com');
    expect(payload.permissions).toContain('sale:create');
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'bad-password'
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  it('rejects disabled users during login', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({
      email: 'disabled@example.com',
      password: 'Password123'
    });

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('USER_DISABLED');
  });

  it('refreshes a session and invalidates the previous refresh token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'Password123'
    });
    const refresh = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: login.body.data.refreshToken
    });
    const retryOldRefresh = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: login.body.data.refreshToken
    });

    expect(refresh.status).toBe(200);
    expect(refresh.body.data.refreshToken).not.toBe(login.body.data.refreshToken);
    expect(retryOldRefresh.status).toBe(401);
    expect(retryOldRefresh.body.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('logs out and revokes further refresh attempts', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'Password123'
    });
    const logout = await request(app).post('/api/v1/auth/logout').send({
      refreshToken: login.body.data.refreshToken
    });
    const refreshAfterLogout = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: login.body.data.refreshToken
    });

    expect(logout.status).toBe(204);
    expect(refreshAfterLogout.status).toBe(401);
    expect(refreshAfterLogout.body.code).toBe('AUTH_SESSION_REVOKED');
  });
});
