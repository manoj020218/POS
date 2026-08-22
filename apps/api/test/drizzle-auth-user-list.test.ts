import { describe, expect, it } from 'vitest';

import { tenants } from '../src/db/schema/index.js';
import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

describe('DrizzleAuthRepository user listing', () => {
  it('lists only users for the requested tenant', async () => {
    const database = await createMemoryDatabase();

    try {
      await database.db.insert(tenants).values([
        { id: '11111111-1111-4111-8111-111111111111', name: 'Tenant A', slug: 'tenant-a' },
        { id: '22222222-2222-4222-8222-222222222222', name: 'Tenant B', slug: 'tenant-b' }
      ]);
      const repository = new DrizzleAuthRepository(database.db);

      await repository.upsertUser({
        displayName: 'Alpha Owner',
        email: 'alpha.owner@example.com',
        id: '33333333-3333-4333-8333-333333333333',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId: '11111111-1111-4111-8111-111111111111'
      });
      await repository.upsertUser({
        displayName: 'Bravo Cashier',
        email: 'bravo.cashier@example.com',
        id: '44444444-4444-4444-8444-444444444444',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'CASHIER',
        tenantId: '11111111-1111-4111-8111-111111111111'
      });
      await repository.upsertUser({
        displayName: 'Tenant B Owner',
        email: 'tenantb.owner@example.com',
        id: '55555555-5555-4555-8555-555555555555',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId: '22222222-2222-4222-8222-222222222222'
      });

      const users = await repository.listUsersForTenant('11111111-1111-4111-8111-111111111111');

      expect(users).toHaveLength(2);
      expect(users.map((user) => user.email)).toEqual([
        'alpha.owner@example.com',
        'bravo.cashier@example.com'
      ]);
    } finally {
      await database.close();
    }
  }, 15000);
});
