import { useEffect, useState } from 'react';

const STORAGE_KEY = 'smartpos.topbar.pinnedEntryIds.v1';

// Settings-style entries are used rarely; kept out of the default pinned
// set so the bar stays uncluttered until the cashier chooses to pin one
// via the 3-dot menu. Add product / kiosk orders are the two used often
// enough during a shift to earn a default spot. Terminal mode is also
// pinned by default since it's the only way to switch a terminal into
// Self-Service Kiosk view -- burying that behind the 3-dot menu made
// kiosk mode effectively undiscoverable.
const DEFAULT_PINNED_IDS = ['add-product', 'kiosk-orders', 'terminal-mode'];

const readStoredPinnedIds = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PINNED_IDS;
    }
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.every((id) => typeof id === 'string') ? parsed : DEFAULT_PINNED_IDS;
  } catch {
    return DEFAULT_PINNED_IDS;
  }
};

export const usePinnedTopBarEntries = (validEntryIds: string[]) => {
  const [pinnedIds, setPinnedIds] = useState<string[]>(readStoredPinnedIds);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // Per-device UI convenience only -- fine to lose in a private/blocked
      // storage context, nothing to surface to the cashier.
    }
  }, [pinnedIds]);

  const togglePinned = (id: string) => {
    setPinnedIds((previous) => (previous.includes(id) ? previous.filter((existing) => existing !== id) : [...previous, id]));
  };

  return {
    isPinned: (id: string) => pinnedIds.includes(id),
    pinnedIds: pinnedIds.filter((id) => validEntryIds.includes(id)),
    togglePinned
  };
};
