import type {
  ClientRemoteApi,
  ClientRemoteSyncPullQuery,
  ClientRemoteSyncPullResult,
  ClientRemoteSyncPushResult
} from './remote-api.js';
import type { ClientBusinessSettings } from './settings-repository.js';

type FetchResponseLike = {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

export type FetchLike = (
  input: string,
  init?: { body?: string; headers?: Record<string, string>; method?: string }
) => Promise<FetchResponseLike>;

export type HttpClientRemoteApiOptions = {
  baseUrl: string;
  fetchImpl?: FetchLike;
  getAccessToken: () => Promise<string> | string;
};

type ApiEnvelope<T> = { data: T };

const ensureFetch = (fetchImpl?: FetchLike) => {
  const resolved = fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  if (!resolved) {
    throw new Error('Fetch implementation is not available');
  }

  return resolved;
};

const createApiUrl = (baseUrl: string, path: string, query: Record<string, string | number | undefined>) => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(path.replace(/^\//, ''), normalizedBaseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

const readErrorMessage = async (response: FetchResponseLike) => {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? `Remote API request failed with status ${response.status}`;
  } catch {
    const text = await response.text();
    return text || `Remote API request failed with status ${response.status}`;
  }
};

const requestData = async <T>(
  options: HttpClientRemoteApiOptions,
  input: { body?: string; method?: string; path: string; query?: Record<string, string | number | undefined> }
) => {
  const fetchImpl = ensureFetch(options.fetchImpl);
  const response = await fetchImpl(
    createApiUrl(options.baseUrl, input.path, input.query ?? {}),
    {
      body: input.body,
      headers: {
        Authorization: `Bearer ${await options.getAccessToken()}`,
        'Content-Type': 'application/json'
      },
      method: input.method ?? 'GET'
    }
  );

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as Partial<ApiEnvelope<T>>;
  if (!('data' in payload)) {
    throw new Error('Remote API response missing data payload');
  }

  return payload.data as T;
};

export const createHttpClientRemoteApi = (
  options: HttpClientRemoteApiOptions
): ClientRemoteApi => ({
  getBusinessSettings: (input) =>
    requestData<ClientBusinessSettings>(options, {
      path: '/business-settings',
      query: { businessId: input?.businessId }
    }),
  pullChanges: (query: ClientRemoteSyncPullQuery) =>
    requestData<ClientRemoteSyncPullResult>(options, {
      path: '/sync/pull',
      query: {
        branchId: query.branchId,
        cursor: query.cursor,
        limit: query.limit
      }
    }),
  pushEvents: (input) =>
    requestData<ClientRemoteSyncPushResult>(options, {
      body: JSON.stringify(input),
      method: 'POST',
      path: '/sync/push'
    })
});
