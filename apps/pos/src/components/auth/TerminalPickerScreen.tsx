import { useEffect, useMemo, useState } from 'react';
import { LogOut, MonitorSmartphone } from 'lucide-react';
import { createHttpClientRemoteApi, type ClientRemoteTerminalSummary } from '@smart-pos/client-data';

import { apiBaseUrl } from '../../lib/api-config.js';
import { LoadingScreen } from './LoadingScreen.js';

type TerminalPickerScreenProps = {
  accessToken: string;
  cashierName: string;
  onBack: () => void;
  onSelect: (terminal: ClientRemoteTerminalSummary) => void;
};

export const TerminalPickerScreen = ({ accessToken, cashierName, onBack, onSelect }: TerminalPickerScreenProps) => {
  const remoteApi = useMemo(
    () => createHttpClientRemoteApi({ baseUrl: apiBaseUrl, getAccessToken: () => accessToken }),
    [accessToken]
  );
  const [terminals, setTerminals] = useState<ClientRemoteTerminalSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    remoteApi
      .listTerminals()
      .then((results) => {
        if (!cancelled) {
          setTerminals(results.filter((terminal) => terminal.isActive));
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load terminals');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [remoteApi]);

  if (!terminals && !error) {
    return <LoadingScreen message="Loading terminals…" />;
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-8 bg-surface p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-xl font-bold text-ink">Hi {cashierName}, pick a terminal</p>
        <p className="text-sm text-ink-faint">Choose the counter you're operating from</p>
      </div>

      {error && (
        <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>
      )}

      {terminals?.length === 0 && (
        <p className="text-sm text-ink-faint">No terminals are registered for your branches yet.</p>
      )}

      <div className="grid grid-cols-2 gap-4">
        {terminals?.map((terminal) => (
          <button
            className="flex w-40 flex-col items-center gap-3 rounded-2xl border border-line bg-surface-raised p-6 shadow-kiosk active:bg-surface-sunken"
            key={terminal.id}
            onClick={() => onSelect(terminal)}
            type="button"
          >
            <MonitorSmartphone size={28} className="text-brand-500" />
            <span className="text-sm font-semibold text-ink">{terminal.name}</span>
            <span className="text-xs text-ink-faint">{terminal.code}</span>
          </button>
        ))}
      </div>

      <button className="flex items-center gap-2 text-sm font-semibold text-ink-muted" onClick={onBack} type="button">
        <LogOut size={16} />
        Sign out
      </button>
    </div>
  );
};
