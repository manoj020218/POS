import { buildApiUrl, ensureFetch, requestJson, type FetchLike } from './http-fetch-helpers.js';

export type ClientAuthTokens = {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
};

export type ClientAuthUser = {
  displayName: string;
  email: string;
  id: string;
  permissions: string[];
  role: string;
  tenantId: string;
};

export type ClientAuthResult = ClientAuthTokens & {
  session: {
    createdAt: string;
    deviceInstallationId?: string;
    deviceName?: string;
    expiresAt: string;
    id: string;
    lastRefreshedAt: string;
  };
  user: ClientAuthUser;
};

export type ClientLoginInput = {
  deviceInstallationId?: string;
  deviceName?: string;
  email: string;
  password: string;
};

export interface ClientAuthClient {
  login(input: ClientLoginInput): Promise<ClientAuthResult>;
  logout(refreshToken: string): Promise<void>;
  refresh(refreshToken: string): Promise<ClientAuthResult>;
}

export type HttpAuthClientOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
};

export const createHttpAuthClient = (options: HttpAuthClientOptions): ClientAuthClient => {
  const fetchImpl = ensureFetch(options.fetchImpl);
  const jsonHeaders = { 'Content-Type': 'application/json' };

  return {
    login: (input) =>
      requestJson<ClientAuthResult>(fetchImpl, buildApiUrl(options.baseUrl, '/auth/login'), {
        body: JSON.stringify(input),
        headers: jsonHeaders,
        method: 'POST'
      }),
    logout: async (refreshToken) => {
      const response = await fetchImpl(buildApiUrl(options.baseUrl, '/auth/logout'), {
        body: JSON.stringify({ refreshToken }),
        headers: jsonHeaders,
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Logout failed with status ${response.status}`);
      }
    },
    refresh: (refreshToken) =>
      requestJson<ClientAuthResult>(fetchImpl, buildApiUrl(options.baseUrl, '/auth/refresh'), {
        body: JSON.stringify({ refreshToken }),
        headers: jsonHeaders,
        method: 'POST'
      })
  };
};
