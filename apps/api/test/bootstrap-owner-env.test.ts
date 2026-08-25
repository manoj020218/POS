import { describe, expect, it } from 'vitest';

import { loadBootstrapOwnerEnv } from '../src/config/bootstrap-owner-env.js';

describe('loadBootstrapOwnerEnv', () => {
  it('prefers explicit CLI arguments over environment values', () => {
    const config = loadBootstrapOwnerEnv(
      [
        '--tenant-id',
        '11111111-1111-4111-8111-111111111111',
        '--email',
        'owner@example.com',
        '--name',
        'Tenant Owner',
        '--password',
        'Password123',
        '--role',
        'BUSINESS_ADMIN'
      ],
      {
        BOOTSTRAP_OWNER_EMAIL: 'other@example.com',
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/smart_pos'
      }
    );

    expect(config).toMatchObject({
      displayName: 'Tenant Owner',
      email: 'owner@example.com',
      role: 'BUSINESS_ADMIN',
      tenantId: '11111111-1111-4111-8111-111111111111'
    });
  });

  it('supports environment-driven bootstrap owner configuration', () => {
    const config = loadBootstrapOwnerEnv([], {
      BOOTSTRAP_OWNER_EMAIL: 'owner@example.com',
      BOOTSTRAP_OWNER_NAME: 'Tenant Owner',
      BOOTSTRAP_OWNER_PASSWORD: 'Password123',
      BOOTSTRAP_OWNER_TENANT_ID: '11111111-1111-4111-8111-111111111111',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/smart_pos'
    });

    expect(config.role).toBe('BUSINESS_OWNER');
    expect(config.userId).toBeUndefined();
  });

  it('ignores a forwarded pnpm separator token before CLI flags', () => {
    const config = loadBootstrapOwnerEnv(
      [
        '--',
        '--tenant-id',
        '11111111-1111-4111-8111-111111111111',
        '--email',
        'owner@example.com',
        '--name',
        'Tenant Owner',
        '--password',
        'Password123'
      ],
      {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/smart_pos'
      }
    );

    expect(config.email).toBe('owner@example.com');
    expect(config.tenantId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('fails fast when required owner inputs are missing', () => {
    expect(() =>
      loadBootstrapOwnerEnv([], {
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/smart_pos'
      })
    ).toThrow('Invalid bootstrap owner configuration');
  });
});
