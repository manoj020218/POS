import { describe, expect, it } from 'vitest';

import { createHttpClientRemoteApi, type FetchLike } from '../src/index.js';
import { createRemoteCustomerSnapshot, createRemoteProductSnapshot, createSettings, terminalContext } from './fixtures.js';

describe('createHttpClientRemoteApi', () => {
  it('targets the current API routes with bearer auth and JSON payloads', async () => {
    const calls: Array<{ init?: { body?: string; headers?: Record<string, string>; method?: string }; url: string }> = [];
    const settings = createSettings();
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ init, url });

      if (url.includes('/business-settings')) {
        return {
          json: async () => ({ data: settings }),
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ data: settings })
        };
      }

      if (url.includes('/sync/pull')) {
        return {
          json: async () => ({
            data: {
              changes: [
                {
                  businessId: terminalContext.businessId,
                  changeId: 'product-change',
                  changeType: 'PRODUCT_UPSERTED',
                  record: createRemoteProductSnapshot(),
                  source: 'SERVER',
                  updatedAt: '2026-08-29T14:00:00.000Z'
                },
                {
                  businessId: terminalContext.businessId,
                  changeId: 'customer-change',
                  changeType: 'CUSTOMER_UPSERTED',
                  record: createRemoteCustomerSnapshot(),
                  source: 'SERVER',
                  updatedAt: '2026-08-29T14:01:00.000Z'
                }
              ],
              nextCursor: 'cursor-01',
              serverTime: '2026-08-29T14:02:00.000Z'
            }
          }),
          ok: true,
          status: 200,
          text: async () => ''
        };
      }

      return {
        json: async () => ({
          data: {
            acceptedCount: 1,
            duplicateCount: 0,
            events: [
              {
                branchId: terminalContext.branchId,
                entityId: 'sale-1',
                eventId: 'sale-created-0001',
                receivedAt: '2026-08-29T14:03:00.000Z',
                result: 'accepted',
                state: 'APPLIED',
                type: 'SALE_CREATED'
              }
            ]
          }
        }),
        ok: true,
        status: 200,
        text: async () => ''
      };
    };

    const api = createHttpClientRemoteApi({
      baseUrl: 'https://example.com/api/v1',
      fetchImpl,
      getAccessToken: async () => 'secret-token'
    });

    const fetchedSettings = await api.getBusinessSettings({ businessId: settings.businessId });
    const pullResult = await api.pullChanges({
      branchId: terminalContext.branchId,
      cursor: 'cursor-00',
      limit: 25
    });
    const pushResult = await api.pushEvents({
      events: [
        {
          branchId: terminalContext.branchId,
          createdAt: '2026-08-29T14:03:00.000Z',
          deviceId: terminalContext.deviceId,
          entityId: 'sale-1',
          eventId: 'sale-created-0001',
          payload: { terminalId: terminalContext.terminalId },
          type: 'SALE_CREATED'
        }
      ]
    });

    expect(fetchedSettings).toEqual(settings);
    expect(pullResult.nextCursor).toBe('cursor-01');
    expect(pushResult.acceptedCount).toBe(1);
    expect(calls[0]?.url).toContain(`/business-settings?businessId=${settings.businessId}`);
    expect(calls[1]?.url).toContain(`branchId=${terminalContext.branchId}`);
    expect(calls[1]?.url).toContain('cursor=cursor-00');
    expect(calls[2]?.init?.headers?.Authorization).toBe('Bearer secret-token');
    expect(calls[2]?.init?.method).toBe('POST');
    expect(calls[2]?.init?.body).toContain('sale-created-0001');
  });
});
