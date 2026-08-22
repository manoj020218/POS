import { describe, expect, it } from 'vitest';

import { tenants } from '../src/db/schema/index.js';
import { DrizzleAuthRepository } from '../src/modules/auth/drizzle-auth.repository.js';
import { hashPassword } from '../src/modules/auth/password.js';
import { createMemoryDatabase } from './helpers/memory-database.js';

const tenantId = '11111111-1111-4111-8111-111111111111';

describe('DrizzleAuthRepository', () => {
  it('upserts and finds users by id and normalized email', async () => {
    const database = await createMemoryDatabase();

    try {
      await seedTenant(database.db);
      const repository = new DrizzleAuthRepository(database.db);
      const user = await repository.upsertUser({
        displayName: 'Owner One',
        email: 'OWNER@EXAMPLE.COM',
        id: '22222222-2222-4222-8222-222222222222',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId
      });
      const byEmail = await repository.findUserByEmail('owner@example.com');
      const byId = await repository.findUserById(user.id);

      expect(user.email).toBe('owner@example.com');
      expect(byEmail?.id).toBe(user.id);
      expect(byId?.displayName).toBe('Owner One');
    } finally {
      await database.close();
    }
  }, 15000);

  it('persists session create update and revoke lifecycle', async () => {
    const database = await createMemoryDatabase();

    try {
      await seedTenant(database.db);
      const repository = new DrizzleAuthRepository(database.db);
      const user = await repository.upsertUser({
        displayName: 'Owner One',
        email: 'owner@example.com',
        id: '22222222-2222-4222-8222-222222222222',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId
      });
      const created = await repository.createSession({
        createdAt: new Date('2026-08-22T10:00:00.000Z'),
        deviceInstallationId: 'android-tab-01',
        deviceName: 'Front Counter',
        expiresAt: new Date('2026-09-21T10:00:00.000Z'),
        id: '33333333-3333-4333-8333-333333333333',
        lastRefreshedAt: new Date('2026-08-22T10:00:00.000Z'),
        refreshTokenHash: 'hash-1',
        tenantId,
        userAgent: 'vitest',
        userId: user.id
      });
      const updated = await repository.updateSession(created.id, {
        expiresAt: new Date('2026-09-22T10:00:00.000Z'),
        lastRefreshedAt: new Date('2026-08-22T11:00:00.000Z'),
        refreshTokenHash: 'hash-2',
        userAgent: 'vitest-refresh'
      });
      const listed = await repository.listSessionsForUser(user.id, tenantId);

      await repository.revokeSession(created.id, new Date('2026-08-22T12:00:00.000Z'));
      const revoked = await repository.findSessionById(created.id);

      expect(updated?.refreshTokenHash).toBe('hash-2');
      expect(listed).toHaveLength(1);
      expect(revoked?.revokedAt?.toISOString()).toBe('2026-08-22T12:00:00.000Z');
      expect(revoked?.userAgent).toBe('vitest-refresh');
    } finally {
      await database.close();
    }
  }, 15000);

  it('updates password hashes and revokes all sessions for a user', async () => {
    const database = await createMemoryDatabase();

    try {
      await seedTenant(database.db);
      const repository = new DrizzleAuthRepository(database.db);
      const user = await repository.upsertUser({
        displayName: 'Owner One',
        email: 'owner@example.com',
        id: '22222222-2222-4222-8222-222222222222',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId
      });
      await repository.createSession({
        createdAt: new Date('2026-08-22T10:00:00.000Z'),
        expiresAt: new Date('2026-09-21T10:00:00.000Z'),
        id: '33333333-3333-4333-8333-333333333333',
        lastRefreshedAt: new Date('2026-08-22T10:00:00.000Z'),
        refreshTokenHash: 'hash-1',
        tenantId,
        userId: user.id
      });

      const updated = await repository.updateUserPassword(user.id, tenantId, 'hash-2');
      await repository.revokeSessionsForUser(
        user.id,
        tenantId,
        new Date('2026-08-22T12:00:00.000Z')
      );
      const revoked = await repository.findSessionById('33333333-3333-4333-8333-333333333333');

      expect(updated?.passwordHash).toBe('hash-2');
      expect(revoked?.revokedAt?.toISOString()).toBe('2026-08-22T12:00:00.000Z');
    } finally {
      await database.close();
    }
  }, 15000);

  it('creates, finds, and marks password reset tokens used', async () => {
    const database = await createMemoryDatabase();

    try {
      await seedTenant(database.db);
      const repository = new DrizzleAuthRepository(database.db);
      const user = await repository.upsertUser({
        displayName: 'Owner One',
        email: 'owner@example.com',
        id: '22222222-2222-4222-8222-222222222222',
        isActive: true,
        passwordHash: await hashPassword('Password123'),
        permissions: [],
        role: 'BUSINESS_OWNER',
        tenantId
      });
      const created = await repository.createPasswordResetToken({
        createdAt: new Date('2026-08-22T10:00:00.000Z'),
        expiresAt: new Date('2026-08-22T10:15:00.000Z'),
        id: '44444444-4444-4444-8444-444444444444',
        tenantId,
        tokenHash: 'hash-1',
        updatedAt: new Date('2026-08-22T10:00:00.000Z'),
        userId: user.id
      });
      const found = await repository.findPasswordResetTokenByHash('hash-1');

      await repository.revokePasswordResetTokensForUser(
        user.id,
        tenantId,
        new Date('2026-08-22T10:05:00.000Z')
      );
      const revoked = await repository.findPasswordResetTokenByHash('hash-1');

      expect(created.id).toBe('44444444-4444-4444-8444-444444444444');
      expect(found?.userId).toBe(user.id);
      expect(revoked?.usedAt?.toISOString()).toBe('2026-08-22T10:05:00.000Z');
    } finally {
      await database.close();
    }
  }, 15000);
});

const seedTenant = async (db: Awaited<ReturnType<typeof createMemoryDatabase>>['db']) => {
  await db.insert(tenants).values({
    id: tenantId,
    name: 'Tenant A',
    slug: 'tenant-a'
  });
};
