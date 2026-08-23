import { describe, expect, it } from 'vitest';

import { branches, businesses, tenants } from '../src/db/schema/index.js';
import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('DrizzleAuthRepository branch access', () => {
  it('replaces and lists branch access for a tenant user', async () => {
    const database = await createMemoryDatabase();

    try {
      await seedTenantBranches(database.db);
      const repository = new DrizzleAuthRepository(database.db);
      await repository.upsertUser({
        displayName: 'Cashier One',
        email: 'cashier@example.com',
        id: '55555555-5555-4555-8555-555555555555',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'CASHIER',
        tenantId
      });

      const first = await repository.replaceBranchAccessForUser(
        '55555555-5555-4555-8555-555555555555',
        tenantId,
        [
          '33333333-3333-4333-8333-333333333333',
          '44444444-4444-4444-8444-444444444444'
        ]
      );
      const listed = await repository.listBranchAccessForUser(
        '55555555-5555-4555-8555-555555555555',
        tenantId
      );
      const replaced = await repository.replaceBranchAccessForUser(
        '55555555-5555-4555-8555-555555555555',
        tenantId,
        ['44444444-4444-4444-8444-444444444444']
      );

      expect(first).toHaveLength(2);
      expect(listed).toHaveLength(2);
      expect(replaced).toHaveLength(1);
      expect(replaced[0]!.branchId).toBe('44444444-4444-4444-8444-444444444444');
    } finally {
      await database.close();
    }
  }, 15000);
});

const seedTenantBranches = async (db: Awaited<ReturnType<typeof createMemoryDatabase>>['db']) => {
  await db.insert(tenants).values({
    id: tenantId,
    name: 'Tenant A',
    slug: 'tenant-a'
  });
  await db.insert(businesses).values({
    code: 'STORE-A',
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Store A',
    tenantId
  });
  await db.insert(branches).values([
    {
      businessId: '22222222-2222-4222-8222-222222222222',
      code: 'BR-A1',
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Main',
      tenantId
    },
    {
      businessId: '22222222-2222-4222-8222-222222222222',
      code: 'BR-A2',
      id: '44444444-4444-4444-8444-444444444444',
      name: 'Annex',
      tenantId
    }
  ]);
};
