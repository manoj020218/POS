export type FetchResponseLike = {
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
  text(): Promise<string>;
};

export type FetchLike = (
  input: string,
  init?: { body?: string; headers?: Record<string, string>; method?: string }
) => Promise<FetchResponseLike>;

export const ensureFetch = (fetchImpl?: FetchLike) => {
  const resolved = fetchImpl ?? (globalThis.fetch as FetchLike | undefined);
  if (!resolved) {
    throw new Error('Fetch implementation is not available');
  }

  return resolved;
};

export const buildApiUrl = (
  baseUrl: string,
  path: string,
  query: Record<string, string | number | undefined> = {}
) => {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(path.replace(/^\//, ''), normalizedBaseUrl);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });

  return url.toString();
};

export class HttpRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HttpRequestError';
    this.status = status;
  }
}

const readErrorMessage = async (response: FetchResponseLike) => {
  try {
    const body = (await response.json()) as { error?: { message?: string }; message?: string };
    return body.message ?? body.error?.message ?? `Request failed with status ${response.status}`;
  } catch {
    const text = await response.text();
    return text || `Request failed with status ${response.status}`;
  }
};

export const requestJson = async <T>(
  fetchImpl: FetchLike,
  url: string,
  init: { body?: string; headers?: Record<string, string>; method?: string } = {}
): Promise<T> => {
  const response = await fetchImpl(url, init);

  if (!response.ok) {
    throw new HttpRequestError(await readErrorMessage(response), response.status);
  }

  const payload = (await response.json()) as Partial<{ data: T }>;
  if (!('data' in payload)) {
    throw new Error('Remote API response missing data payload');
  }

  return payload.data as T;
};

export const requestJsonEnvelope = async <T, M>(
  fetchImpl: FetchLike,
  url: string,
  init: { body?: string; headers?: Record<string, string>; method?: string } = {}
): Promise<{ data: T; meta: M }> => {
  const response = await fetchImpl(url, init);

  if (!response.ok) {
    throw new HttpRequestError(await readErrorMessage(response), response.status);
  }

  const payload = (await response.json()) as Partial<{ data: T; meta: M }>;
  if (!('data' in payload)) {
    throw new Error('Remote API response missing data payload');
  }

  return { data: payload.data as T, meta: payload.meta as M };
};
