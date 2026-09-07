import {
  buildApiUrl,
  ensureFetch,
  HttpRequestError,
  requestJson,
  requestJsonEnvelope,
  type FetchLike
} from './http-fetch-helpers.js';
import type {
  ClientProductListMeta,
  ClientRemoteApi,
  ClientRemoteProductCreateInput,
  ClientRemoteProductView,
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

  const withRefresh = async <T>(attempt: (accessToken?: string) => Promise<T>): Promise<T> => {
    try {
      return await attempt();
    } catch (error) {
      if (!(error instanceof HttpRequestError) || error.status !== 401 || !options.onUnauthorized) {
        throw error;
      }

      const refreshedAccessToken = await options.onUnauthorized();
      if (!refreshedAccessToken) {
        throw error;
      }

      return attempt(refreshedAccessToken);
    }
  };

  const requestWithAuth = <T>(url: string, init: { body?: string; method?: string } = {}): Promise<T> =>
    withRefresh(async (accessTokenOverride) =>
      requestJson<T>(fetchImpl, url, { ...init, headers: await authHeaders(accessTokenOverride) })
    );

  const requestEnvelopeWithAuth = <T, M>(
    url: string,
    init: { body?: string; method?: string } = {}
  ): Promise<{ data: T; meta: M }> =>
    withRefresh(async (accessTokenOverride) =>
      requestJsonEnvelope<T, M>(fetchImpl, url, { ...init, headers: await authHeaders(accessTokenOverride) })
    );

  return {
    createProduct: (input: ClientRemoteProductCreateInput) =>
      requestWithAuth<ClientRemoteProductView>(buildApiUrl(options.baseUrl, '/products'), {
        body: JSON.stringify(input),
        method: 'POST'
      }),
    getBusinessSettings: (input) =>
      requestWithAuth<ClientBusinessSettings>(
        buildApiUrl(options.baseUrl, '/business-settings', { businessId: input?.businessId })
      ),
    listBranches: () => requestWithAuth(buildApiUrl(options.baseUrl, '/branches')),
    listProducts: async (query) => {
      const { data, meta } = await requestEnvelopeWithAuth<ClientRemoteProductView[], ClientProductListMeta>(
        buildApiUrl(options.baseUrl, '/products', {
          businessId: query?.businessId,
          page: query?.page,
          pageSize: query?.pageSize
        })
      );

      return { items: data, meta };
    },
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
