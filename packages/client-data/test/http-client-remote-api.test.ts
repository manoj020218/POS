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

      if (url.includes('/branches')) {
        return {
          json: async () => ({
            data: [
              {
                businessId: terminalContext.businessId,
                code: terminalContext.branchCode,
                id: terminalContext.branchId,
                isActive: true,
                name: terminalContext.branchName
              }
            ]
          }),
          ok: true,
          status: 200,
          text: async () => ''
        };
      }

      if (url.includes('/terminals')) {
        return {
          json: async () => ({
            data: [
              {
                branchId: terminalContext.branchId,
                code: terminalContext.terminalCode,
                id: terminalContext.terminalId,
                isActive: true,
                name: terminalContext.terminalName
              }
            ]
          }),
          ok: true,
          status: 200,
          text: async () => ''
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
    const branches = await api.listBranches();
    const terminals = await api.listTerminals({ branchId: terminalContext.branchId });
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
    const updatedSettings = await api.updateBusinessSettings({
      branches: [
        {
          branchId: terminalContext.branchId,
          receiptPrinterProfile: {
            connectionType: 'BLUETOOTH',
            name: 'Counter Printer',
            paperWidth: '80mm',
            target: 'AA:BB:CC:DD:EE:FF'
          }
        }
      ]
    });

    expect(fetchedSettings).toEqual(settings);
    expect(updatedSettings).toEqual(settings);
    expect(calls[5]?.url).toContain('/business-settings');
    expect(calls[5]?.init?.method).toBe('PATCH');
    expect(calls[5]?.init?.headers?.Authorization).toBe('Bearer secret-token');
    expect(calls[5]?.init?.body).toContain('AA:BB:CC:DD:EE:FF');
    expect(branches).toHaveLength(1);
    expect(branches[0]?.id).toBe(terminalContext.branchId);
    expect(terminals).toHaveLength(1);
    expect(terminals[0]?.id).toBe(terminalContext.terminalId);
    expect(pullResult.nextCursor).toBe('cursor-01');
    expect(pushResult.acceptedCount).toBe(1);
    expect(calls[0]?.url).toContain(`/business-settings?businessId=${settings.businessId}`);
    expect(calls[2]?.url).toContain(`terminals?branchId=${terminalContext.branchId}`);
    expect(calls[3]?.url).toContain(`branchId=${terminalContext.branchId}`);
    expect(calls[3]?.url).toContain('cursor=cursor-00');
    expect(calls[4]?.init?.headers?.Authorization).toBe('Bearer secret-token');
    expect(calls[4]?.init?.method).toBe('POST');
    expect(calls[4]?.init?.body).toContain('sale-created-0001');
  });
});
