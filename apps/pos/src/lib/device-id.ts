const storageKey = 'smart-pos-pos:device-id';

export const getOrCreateDeviceId = (): string => {
  try {
    const existing = window.localStorage.getItem(storageKey);
    if (existing) {
      return existing;
    }

    const created = crypto.randomUUID();
    window.localStorage.setItem(storageKey, created);
    return created;
  } catch {
    return crypto.randomUUID();
  }
};
