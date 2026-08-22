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

describe('auth password change', () => {
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
        }
      ]),
      logger: createLogger('silent')
    });
  });

  it('changes the password and revokes existing refresh sessions', async () => {
    const login = await loginAs('Password123');
    const changed = await request(app)
      .post('/api/v1/auth/password/change')
      .set('authorization', `Bearer ${login.body.data.accessToken}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'Password456'
      });
    const refreshAfterChange = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: login.body.data.refreshToken
    });
    const oldPasswordLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'Password123'
    });
    const newPasswordLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password: 'Password456'
    });

    expect(changed.status).toBe(204);
    expect(refreshAfterChange.status).toBe(401);
    expect(refreshAfterChange.body.code).toBe('AUTH_SESSION_REVOKED');
    expect(oldPasswordLogin.status).toBe(401);
    expect(newPasswordLogin.status).toBe(200);
  });

  it('rejects an invalid current password', async () => {
    const login = await loginAs('Password123');
    const response = await request(app)
      .post('/api/v1/auth/password/change')
      .set('authorization', `Bearer ${login.body.data.accessToken}`)
      .send({
        currentPassword: 'Password999',
        newPassword: 'Password456'
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_CURRENT_PASSWORD');
  });

  it('requires an authenticated access token', async () => {
    const response = await request(app).post('/api/v1/auth/password/change').send({
      currentPassword: 'Password123',
      newPassword: 'Password456'
    });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('ACCESS_CONTEXT_REQUIRED');
  });

  const loginAs = (password: string) =>
    request(app).post('/api/v1/auth/login').send({
      email: 'owner@example.com',
      password
    });
});
