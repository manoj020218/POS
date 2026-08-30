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

const readErrorMessage = async (response: FetchResponseLike) => {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? `Request failed with status ${response.status}`;
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
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as Partial<{ data: T }>;
  if (!('data' in payload)) {
    throw new Error('Remote API response missing data payload');
  }

  return payload.data as T;
};
