import { buildApiUrl, ensureFetch, HttpRequestError, requestJson, type FetchLike } from './http-fetch-helpers.js';
import type {
  ClientRemoteApi,
  ClientRemoteSyncPullQuery,
  ClientRemoteSyncPullResult,
  ClientRemoteSyncPushResult,
  ClientUpdateBusinessSettingsInput
} from './remote-api.js';
import type { ClientBusinessSettings } from './settings-repository.js';

export type { FetchLike } from './http-fetch-helpers.js';

export type HttpClientRemoteApiOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
  getAccessToken: () => Promise<string> | string;
  /**
   * Called once when a request comes back 401. Should attempt a token refresh and
   * return the new access token, or null if the session could not be refreshed
   * (e.g. the refresh token itself is expired/revoked) — in which case the
   * original 401 is rethrown rather than retried.
   */
  onUnauthorized?: () => Promise<string | null>;
};

export const createHttpClientRemoteApi = (options: HttpClientRemoteApiOptions): ClientRemoteApi => {
  const fetchImpl = ensureFetch(options.fetchImpl);
  const authHeaders = async (accessTokenOverride?: string) => ({
    Authorization: `Bearer ${accessTokenOverride ?? (await options.getAccessToken())}`,
    'Content-Type': 'application/json'
  });

  const requestWithAuth = async <T>(
    url: string,
    init: { body?: string; method?: string } = {}
  ): Promise<T> => {
    try {
      return await requestJson<T>(fetchImpl, url, { ...init, headers: await authHeaders() });
    } catch (error) {
      if (!(error instanceof HttpRequestError) || error.status !== 401 || !options.onUnauthorized) {
        throw error;
      }

      const refreshedAccessToken = await options.onUnauthorized();
      if (!refreshedAccessToken) {
        throw error;
      }

      return requestJson<T>(fetchImpl, url, { ...init, headers: await authHeaders(refreshedAccessToken) });
    }
  };

  return {
    getBusinessSettings: (input) =>
      requestWithAuth<ClientBusinessSettings>(
        buildApiUrl(options.baseUrl, '/business-settings', { businessId: input?.businessId })
      ),
    listBranches: () => requestWithAuth(buildApiUrl(options.baseUrl, '/branches')),
    listTerminals: (input) =>
      requestWithAuth(buildApiUrl(options.baseUrl, '/terminals', { branchId: input?.branchId })),
    pullChanges: (query: ClientRemoteSyncPullQuery) =>
      requestWithAuth<ClientRemoteSyncPullResult>(
        buildApiUrl(options.baseUrl, '/sync/pull', {
          branchId: query.branchId,
          cursor: query.cursor,
          limit: query.limit
        })
      ),
    pushEvents: (input) =>
      requestWithAuth<ClientRemoteSyncPushResult>(buildApiUrl(options.baseUrl, '/sync/push'), {
        body: JSON.stringify(input),
        method: 'POST'
      }),
    updateBusinessSettings: (input: ClientUpdateBusinessSettingsInput) =>
      requestWithAuth<ClientBusinessSettings>(buildApiUrl(options.baseUrl, '/business-settings'), {
        body: JSON.stringify(input),
        method: 'PATCH'
      })
  };
};
