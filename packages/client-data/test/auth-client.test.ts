import { describe, expect, it } from 'vitest';

import { createHttpAuthClient, type FetchLike } from '../src/index.js';

const authResult = {
  accessToken: 'access-token',
  accessTokenExpiresAt: '2026-08-30T12:15:00.000Z',
  refreshToken: 'refresh-token',
  refreshTokenExpiresAt: '2026-09-06T12:00:00.000Z',
  session: {
    createdAt: '2026-08-30T12:00:00.000Z',
    expiresAt: '2026-09-06T12:00:00.000Z',
    id: 'session-1',
    lastRefreshedAt: '2026-08-30T12:00:00.000Z'
  },
  user: {
    displayName: 'Asha Rao',
    email: 'asha@example.com',
    id: 'user-1',
    permissions: ['sale:create'],
    role: 'CASHIER',
    tenantId: 'tenant-1'
  }
};

describe('createHttpAuthClient', () => {
  it('logs in, refreshes, and logs out against the auth routes', async () => {
    const calls: Array<{ init?: { body?: string; method?: string }; url: string }> = [];
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ init, url });

      if (url.endsWith('/auth/logout')) {
        return { json: async () => ({}), ok: true, status: 204, text: async () => '' };
      }

      return {
        json: async () => ({ data: authResult }),
        ok: true,
        status: 200,
        text: async () => ''
      };
    };

    const client = createHttpAuthClient({ baseUrl: 'https://example.com/api/v1', fetchImpl });

    const loginResult = await client.login({ email: 'asha@example.com', password: 'Password123' });
    const refreshResult = await client.refresh('refresh-token');
    await client.logout('refresh-token');

    expect(loginResult).toEqual(authResult);
    expect(refreshResult).toEqual(authResult);
    expect(calls[0]?.url).toBe('https://example.com/api/v1/auth/login');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(calls[0]?.init?.body).toContain('asha@example.com');
    expect(calls[1]?.url).toBe('https://example.com/api/v1/auth/refresh');
    expect(calls[2]?.url).toBe('https://example.com/api/v1/auth/logout');
  });

  it('throws when login fails', async () => {
    const fetchImpl: FetchLike = async () => ({
      json: async () => ({ error: { message: 'Invalid credentials' } }),
      ok: false,
      status: 401,
      text: async () => ''
    });

    const client = createHttpAuthClient({ baseUrl: 'https://example.com/api/v1', fetchImpl });

    await expect(client.login({ email: 'asha@example.com', password: 'wrong' })).rejects.toThrow(
      'Invalid credentials'
    );
  });
});
