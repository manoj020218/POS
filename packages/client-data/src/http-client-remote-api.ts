import { buildApiUrl, ensureFetch, requestJson, type FetchLike } from './http-fetch-helpers.js';
import type {
  ClientRemoteApi,
  ClientRemoteSyncPullQuery,
  ClientRemoteSyncPullResult,
  ClientRemoteSyncPushResult
} from './remote-api.js';
import type { ClientBusinessSettings } from './settings-repository.js';

export type { FetchLike } from './http-fetch-helpers.js';

export type HttpClientRemoteApiOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
  getAccessToken: () => Promise<string> | string;
};

export const createHttpClientRemoteApi = (options: HttpClientRemoteApiOptions): ClientRemoteApi => {
  const fetchImpl = ensureFetch(options.fetchImpl);
  const authHeaders = async () => ({
    Authorization: `Bearer ${await options.getAccessToken()}`,
    'Content-Type': 'application/json'
  });

  return {
    getBusinessSettings: async (input) =>
      requestJson<ClientBusinessSettings>(
        fetchImpl,
        buildApiUrl(options.baseUrl, '/business-settings', { businessId: input?.businessId }),
        { headers: await authHeaders() }
      ),
    listBranches: async () =>
      requestJson(fetchImpl, buildApiUrl(options.baseUrl, '/branches'), { headers: await authHeaders() }),
    listTerminals: async (input) =>
      requestJson(fetchImpl, buildApiUrl(options.baseUrl, '/terminals', { branchId: input?.branchId }), {
        headers: await authHeaders()
      }),
    pullChanges: async (query: ClientRemoteSyncPullQuery) =>
      requestJson<ClientRemoteSyncPullResult>(
        fetchImpl,
        buildApiUrl(options.baseUrl, '/sync/pull', {
          branchId: query.branchId,
          cursor: query.cursor,
          limit: query.limit
        }),
        { headers: await authHeaders() }
      ),
    pushEvents: async (input) =>
      requestJson<ClientRemoteSyncPushResult>(fetchImpl, buildApiUrl(options.baseUrl, '/sync/push'), {
        body: JSON.stringify(input),
        headers: await authHeaders(),
        method: 'POST'
      })
  };
};
