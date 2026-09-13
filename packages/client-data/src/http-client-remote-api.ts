import {
  buildApiUrl,
  ensureFetch,
  HttpRequestError,
  requestJson,
  requestJsonEnvelope,
  type FetchLike
} from './http-fetch-helpers.js';
import type {
  ClientCreateKioskOrderInput,
  ClientKioskOrderCreatedView,
  ClientKioskOrderView,
  ClientPaymentGatewayCard,
  ClientPaymentGatewayCode,
  ClientProductListMeta,
  ClientRemoteApi,
  ClientRemoteProductCreateInput,
  ClientRemoteProductPriceChange,
  ClientRemoteProductUpdateInput,
  ClientRemoteProductView,
  ClientRemoteSyncPullQuery,
  ClientRemoteSyncPullResult,
  ClientRemoteSyncPushResult,
  ClientRemoteTaxProfileCreateInput,
  ClientRemoteTaxProfileUpdateInput,
  ClientRemoteTaxProfileView,
  ClientRemoteUnitSummary,
  ClientTerminalSettings,
  ClientUpdateBusinessSettingsInput,
  ClientUpdatePaymentGatewayCredentialsInput,
  ClientUpdateTerminalSettingsInput
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
  // No Content-Type here — fetch sets the multipart boundary itself for FormData bodies.
  const uploadAuthHeaders = async (accessTokenOverride?: string) => ({
    Authorization: `Bearer ${accessTokenOverride ?? (await options.getAccessToken())}`
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

  const requestUploadWithAuth = <T>(url: string, formData: FormData): Promise<T> =>
    withRefresh(async (accessTokenOverride) =>
      requestJson<T>(fetchImpl, url, {
        body: formData,
        headers: await uploadAuthHeaders(accessTokenOverride),
        method: 'POST'
      })
    );

  const requestEnvelopeWithAuth = <T, M>(
    url: string,
    init: { body?: string; method?: string } = {}
  ): Promise<{ data: T; meta: M }> =>
    withRefresh(async (accessTokenOverride) =>
      requestJsonEnvelope<T, M>(fetchImpl, url, { ...init, headers: await authHeaders(accessTokenOverride) })
    );

  return {
    createKioskOrder: (input: ClientCreateKioskOrderInput) =>
      requestWithAuth<ClientKioskOrderCreatedView>(buildApiUrl(options.baseUrl, '/kiosk/orders'), {
        body: JSON.stringify(input),
        method: 'POST'
      }),
    createProduct: (input: ClientRemoteProductCreateInput) =>
      requestWithAuth<ClientRemoteProductView>(buildApiUrl(options.baseUrl, '/products'), {
        body: JSON.stringify(input),
        method: 'POST'
      }),
    createTaxProfile: (input: ClientRemoteTaxProfileCreateInput) =>
      requestWithAuth<ClientRemoteTaxProfileView>(buildApiUrl(options.baseUrl, '/tax-profiles'), {
        body: JSON.stringify(input),
        method: 'POST'
      }),
    fulfillKioskOrder: (orderId: string, saleId: string) =>
      requestWithAuth<ClientKioskOrderView>(buildApiUrl(options.baseUrl, `/kiosk/orders/${orderId}/fulfill`), {
        body: JSON.stringify({ saleId }),
        method: 'POST'
      }),
    getBusinessSettings: (input) =>
      requestWithAuth<ClientBusinessSettings>(
        buildApiUrl(options.baseUrl, '/business-settings', { businessId: input?.businessId })
      ),
    getKioskOrder: (orderId: string) =>
      requestWithAuth<ClientKioskOrderView>(buildApiUrl(options.baseUrl, `/kiosk/orders/${orderId}`)),
    getProductPriceHistory: (productId: string) =>
      requestWithAuth<ClientRemoteProductPriceChange[]>(
        buildApiUrl(options.baseUrl, `/products/${productId}/price-history`)
      ),
    getTerminalSettings: (terminalId: string) =>
      requestWithAuth<ClientTerminalSettings>(
        buildApiUrl(options.baseUrl, `/terminals/${terminalId}/kiosk-settings`)
      ),
    listBranches: () => requestWithAuth(buildApiUrl(options.baseUrl, '/branches')),
    listKioskOrders: (businessId?: string) =>
      requestWithAuth<ClientKioskOrderView[]>(
        buildApiUrl(options.baseUrl, '/kiosk/orders', { businessId })
      ),
    listPaymentGatewayCards: (businessId?: string) =>
      requestWithAuth<ClientPaymentGatewayCard[]>(
        buildApiUrl(options.baseUrl, '/payment-gateways', { businessId })
      ),
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
    listTaxProfiles: (input) =>
      requestWithAuth<ClientRemoteTaxProfileView[]>(
        buildApiUrl(options.baseUrl, '/tax-profiles', { businessId: input?.businessId })
      ),
    listTerminals: (input) =>
      requestWithAuth(buildApiUrl(options.baseUrl, '/terminals', { branchId: input?.branchId })),
    listUnits: (input) =>
      requestWithAuth<ClientRemoteUnitSummary[]>(
        buildApiUrl(options.baseUrl, '/units', { businessId: input?.businessId })
      ),
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
      }),
    updatePaymentGatewayCredentials: (
      gatewayCode: ClientPaymentGatewayCode,
      input: ClientUpdatePaymentGatewayCredentialsInput
    ) =>
      requestWithAuth<ClientPaymentGatewayCard>(
        buildApiUrl(options.baseUrl, `/payment-gateways/${gatewayCode}`),
        { body: JSON.stringify(input), method: 'PATCH' }
      ),
    updateProduct: (productId: string, input: ClientRemoteProductUpdateInput) =>
      requestWithAuth<ClientRemoteProductView>(buildApiUrl(options.baseUrl, `/products/${productId}`), {
        body: JSON.stringify(input),
        method: 'PATCH'
      }),
    updateTaxProfile: (taxProfileId: string, input: ClientRemoteTaxProfileUpdateInput) =>
      requestWithAuth<ClientRemoteTaxProfileView>(buildApiUrl(options.baseUrl, `/tax-profiles/${taxProfileId}`), {
        body: JSON.stringify(input),
        method: 'PATCH'
      }),
    updateTerminalSettings: (terminalId: string, input: ClientUpdateTerminalSettingsInput) =>
      requestWithAuth<ClientTerminalSettings>(
        buildApiUrl(options.baseUrl, `/terminals/${terminalId}/kiosk-settings`),
        { body: JSON.stringify(input), method: 'PATCH' }
      ),
    uploadProductImage: (file: Blob, filename: string) => {
      const formData = new FormData();
      formData.append('image', file, filename);
      return requestUploadWithAuth<{ url: string }>(
        buildApiUrl(options.baseUrl, '/products/image-upload'),
        formData
      );
    }
  };
};
