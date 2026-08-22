import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app.js';
import { createLogger } from '../src/lib/logger.js';
import { signToken } from '../src/modules/auth/token.js';
import { resolveGrantedPermissions } from '../src/modules/auth/authorization.js';

const authConfig = {
  jwtSecret: 'test-jwt-secret-0123456789-abcdefgh',
  refreshSecret: 'test-refresh-secret-0123456789-ab'
};

describe('auth access context resolver', () => {
  it('rejects an invalid authorization header scheme', async () => {
    const app = createApp({ authConfig, logger: createLogger('silent') });
    const response = await request(app)
      .get('/api/v1/businesses')
      .set({ authorization: 'Token not-a-bearer-token' });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_AUTHORIZATION_HEADER');
  });

  it('rejects a refresh token on protected routes', async () => {
    const app = createApp({ authConfig, logger: createLogger('silent') });
    const refresh = signToken(
      {
        jti: '11111111-1111-4111-8111-111111111111',
        sessionId: '22222222-2222-4222-8222-222222222222',
        sub: '33333333-3333-4333-8333-333333333333',
        tenantId: '44444444-4444-4444-8444-444444444444',
        type: 'refresh' as const
      },
      authConfig.refreshSecret,
      300
    );
    const response = await request(app)
      .get('/api/v1/businesses')
      .set({ authorization: `Bearer ${refresh.token}` });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('INVALID_TOKEN');
  });

  it('rejects expired access tokens', async () => {
    const app = createApp({ authConfig, logger: createLogger('silent') });
    const expired = signToken(
      {
        displayName: 'Expired User',
        email: 'expired@example.com',
        jti: '55555555-5555-4555-8555-555555555555',
        permissions: resolveGrantedPermissions({ role: 'BUSINESS_OWNER' }),
        role: 'BUSINESS_OWNER' as const,
        sessionId: '66666666-6666-4666-8666-666666666666',
        sub: '77777777-7777-4777-8777-777777777777',
        tenantId: '88888888-8888-4888-8888-888888888888',
        type: 'access' as const
      },
      authConfig.jwtSecret,
      60,
      new Date('2026-08-20T00:00:00.000Z')
    );
    const response = await request(app)
      .get('/api/v1/businesses')
      .set({ authorization: `Bearer ${expired.token}` });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('TOKEN_EXPIRED');
  });
});
