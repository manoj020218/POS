import { useCallback, useEffect, useState } from 'react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { usePosContext } from './use-pos-context.js';

const defaultSettings = (terminalId: string): ClientTerminalSettings => ({
  gatewayTimeoutMinutes: 5,
  kioskCollectsPayment: false,
  mode: 'BILLING_POS',
  printDualTokens: false,
  showWalkInCustomer: true,
  terminalId
});

/**
 * Per-terminal Billing POS vs Self-Service Kiosk mode, fetched once per
 * terminal session. Falls back to Billing POS with defaults if the settings
 * call fails (e.g. offline) rather than blocking the whole app.
 */
export const useTerminalMode = () => {
  const { remoteApi, terminalContext } = usePosContext();
  const [settings, setSettings] = useState<ClientTerminalSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Exposed so callers (e.g. after saving terminal settings) can force a
  // re-fetch. Not called from the mount effect below directly — see its own
  // inline fetch — since calling it there would set state synchronously
  // inside the effect body.
  const refresh = useCallback(async () => {
    try {
      const result = await remoteApi.getTerminalSettings(terminalContext.terminalId);
      setSettings(result);
    } catch {
      setSettings(defaultSettings(terminalContext.terminalId));
    } finally {
      setLoading(false);
    }
  }, [remoteApi, terminalContext.terminalId]);

  useEffect(() => {
    let cancelled = false;

    void remoteApi
      .getTerminalSettings(terminalContext.terminalId)
      .then((result) => {
        if (!cancelled) {
          setSettings(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSettings(defaultSettings(terminalContext.terminalId));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [remoteApi, terminalContext.terminalId]);

  return { loading, refresh, settings: settings ?? defaultSettings(terminalContext.terminalId) };
};
