import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import {
  appPermissions,
  getPermissionsForRoles,
  hasAllPermissions,
  resolveGrantedPermissions
} from '../src/modules/auth/authorization.js';
import { requirePermissions } from '../src/http/middleware/require-permissions.js';
import { errorHandler } from '../src/http/middleware/error-handler.js';
import { createLogger } from '../src/lib/logger.js';

describe('authorization', () => {
  it('grants every declared permission to the platform admin role', () => {
    const granted = getPermissionsForRoles(['PLATFORM_ADMIN']);

    expect(granted).toHaveLength(appPermissions.length);
    expect(granted).toEqual(expect.arrayContaining([...appPermissions]));
  });

  it('keeps cashier permissions narrow', () => {
    const granted = getPermissionsForRoles(['CASHIER']);

    expect(granted).toEqual(
      expect.arrayContaining(['sale:create', 'product:view', 'customer:create'])
    );
    expect(granted).not.toContain('inventory:adjust');
    expect(granted).not.toContain('user:manage');
  });

  it('merges explicit permissions with role-derived permissions', () => {
    const granted = resolveGrantedPermissions({
      permissions: ['report:view'],
      role: 'INVENTORY_MANAGER'
    });

    expect(hasAllPermissions(granted, ['inventory:adjust', 'report:view'])).toBe(true);
  });

  it('returns 401 when a protected route has no access context', async () => {
    const app = createProtectedApp(undefined);
    const response = await request(app).get('/protected');

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('ACCESS_CONTEXT_REQUIRED');
  });

  it('returns 403 when the caller lacks a required permission', async () => {
    const app = createProtectedApp({
      role: 'CASHIER',
      tenantId: '11111111-1111-4111-8111-111111111111',
      userId: '99999999-9999-4999-8999-999999999999'
    });
    const response = await request(app).get('/protected');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('allows access when the caller has the required permission', async () => {
    const app = createProtectedApp({
      role: 'BUSINESS_ADMIN',
      tenantId: '11111111-1111-4111-8111-111111111111',
      userId: '99999999-9999-4999-8999-999999999999'
    });
    const response = await request(app).get('/protected');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });
});

const createProtectedApp = (
  accessContext:
    | {
        permissions?: Array<'business:view' | 'inventory:adjust' | 'report:view'>;
        role?: 'BUSINESS_ADMIN' | 'CASHIER' | 'INVENTORY_MANAGER';
        tenantId: string;
        userId: string;
      }
    | undefined
) => {
  const app = express();

  app.use((req, _res, next) => {
    req.accessContext = accessContext;
    next();
  });
  app.get('/protected', requirePermissions(['inventory:adjust']), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler(createLogger('silent')));

  return app;
};
