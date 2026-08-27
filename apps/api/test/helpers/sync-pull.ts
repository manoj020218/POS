import request from 'supertest';

import type { createCatalogTestContext } from './catalog-app.js';

type CatalogTestApp = Awaited<ReturnType<typeof createCatalogTestContext>>['app'];
type AccessHeaders = { authorization: string };

export const buildSyncEvent = (
  branchId: string,
  eventId: string,
  entityId: string,
  type: string,
  payload: Record<string, unknown>
) => ({
  branchId,
  createdAt: '2026-08-27T09:30:00.000Z',
  deviceId: 'device-01',
  entityId,
  eventId,
  payload,
  type
});

export const pushSyncEvent = (
  app: CatalogTestApp,
  access: AccessHeaders,
  event: ReturnType<typeof buildSyncEvent>
) => request(app).post('/api/v1/sync/push').set(access).send({ events: [event] });

export const pullSyncChanges = (
  app: CatalogTestApp,
  access: AccessHeaders,
  query: Record<string, string | number | null> = {}
) => request(app).get('/api/v1/sync/pull').query(query).set(access);
