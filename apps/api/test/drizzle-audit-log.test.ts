import { describe, expect, it } from 'vitest';

import { tenants } from '../src/db/schema/index.js';
import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('DrizzleAuthRepository audit logging', () => {
  it('creates and lists audit logs for an entity', async () => {
    const database = await createMemoryDatabase();

    try {
      await database.db.insert(tenants).values({
        id: tenantId,
        name: 'Tenant A',
        slug: 'tenant-a'
      });
      const repository = new DrizzleAuthRepository(database.db);
      await repository.upsertUser({
        displayName: 'Tenant Owner',
        email: 'owner@example.com',
        id: '22222222-2222-4222-8222-222222222222',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId
      });

      await repository.createAuditLog({
        action: 'AUTH_USER_CREATED',
        actorUserId: '22222222-2222-4222-8222-222222222222',
        entityId: '33333333-3333-4333-8333-333333333333',
        entityType: 'auth_user',
        id: '44444444-4444-4444-8444-444444444444',
        metadata: { role: 'CASHIER' },
        tenantId
      });

      const logs = await repository.listAuditLogsForEntity(
        tenantId,
        'auth_user',
        '33333333-3333-4333-8333-333333333333'
      );

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        action: 'AUTH_USER_CREATED',
        actorUserId: '22222222-2222-4222-8222-222222222222',
        metadata: { role: 'CASHIER' }
      });
    } finally {
      await database.close();
    }
  }, 15000);
});
