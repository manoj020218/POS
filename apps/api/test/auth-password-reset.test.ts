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

describe('auth password reset', () => {
  let deliveredToken: string | undefined;
  let app: ReturnType<typeof createApp>;

  beforeEach(async () => {
    deliveredToken = undefined;
    app = createApp({
      authConfig: {
        ...authConfig,
        passwordResetTokenSink: ({ token }) => {
          deliveredToken = token;
        }
      },
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
          displayName: 'Disabled User',
          email: 'disabled@example.com',
          id: '33333333-3333-4333-8333-333333333333',
          isActive: false,
          passwordHash: await hashPassword('Password123'),
          permissions: [],
          role: 'CASHIER',
          tenantId: '22222222-2222-4222-8222-222222222222'
        }
      ]),
      logger: createLogger('silent')
    });
  });

  it('requests and confirms a password reset without leaking the token in the response', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'Password123'
    });
    const requested = await request(app).post('/api/v1/auth/password/reset/request').send({
      email: 'owner@example.com'
    });
    const confirmed = await request(app).post('/api/v1/auth/password/reset/confirm').send({
      newPassword: 'Password456',
      resetToken: deliveredToken
    });
    const refreshAfterReset = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: login.body.data.refreshToken
    });
    const newPasswordLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'Password456'
    });

    expect(requested.status).toBe(202);
    expect(requested.body).toEqual({});
    expect(deliveredToken).toBeTruthy();
    expect(confirmed.status).toBe(204);
    expect(refreshAfterReset.status).toBe(401);
    expect(refreshAfterReset.body.code).toBe('AUTH_SESSION_REVOKED');
    expect(newPasswordLogin.status).toBe(200);
  });

  it('does not disclose whether a reset email exists or is active', async () => {
    const missing = await request(app).post('/api/v1/auth/password/reset/request').send({
      email: 'missing@example.com'
    });
    const disabled = await request(app).post('/api/v1/auth/password/reset/request').send({
      email: 'disabled@example.com'
    });

    expect(missing.status).toBe(202);
    expect(disabled.status).toBe(202);
  });

  it('rejects an expired password reset token', async () => {
    let expiringToken: string | undefined;
    const expiringApp = createApp({
      authConfig: {
        ...authConfig,
        passwordResetTokenSink: ({ token }) => {
          expiringToken = token;
        },
        passwordResetTokenTtlSeconds: 0
      },
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
        }
      ]),
      logger: createLogger('silent')
    });
    await request(expiringApp).post('/api/v1/auth/password/reset/request').send({
      email: 'owner@example.com'
    });
    const response = await request(expiringApp).post('/api/v1/auth/password/reset/confirm').send({
      newPassword: 'Password456',
      resetToken: expiringToken
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('PASSWORD_RESET_TOKEN_EXPIRED');
  });
});
