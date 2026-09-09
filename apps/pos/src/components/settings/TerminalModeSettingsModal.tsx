import { useState } from 'react';
import type { ClientTerminalMode, ClientTerminalSettings } from '@smart-pos/client-data';

import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type TerminalModeSettingsModalProps = {
  onClose: () => void;
  onSaved: () => void;
  open: boolean;
  terminalSettings: ClientTerminalSettings;
};

const modes: { description: string; label: string; value: ClientTerminalMode }[] = [
  { description: 'A cashier rings up every sale on this terminal.', label: 'Billing POS', value: 'BILLING_POS' },
  {
    description: 'Customers tap their own items and get a printed token.',
    label: 'Self-Service Kiosk',
    value: 'SELF_SERVICE_KIOSK'
  }
];

export const TerminalModeSettingsModal = ({
  onClose,
  onSaved,
  open,
  terminalSettings
}: TerminalModeSettingsModalProps) => {
  const { remoteApi, terminalContext } = usePosContext();
  const [mode, setMode] = useState<ClientTerminalMode>(terminalSettings.mode);
  const [kioskCollectsPayment, setKioskCollectsPayment] = useState(terminalSettings.kioskCollectsPayment);
  const [printDualTokens, setPrintDualTokens] = useState(terminalSettings.printDualTokens);
  const [gatewayTimeoutMinutes, setGatewayTimeoutMinutes] = useState(
    String(terminalSettings.gatewayTimeoutMinutes)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  const handleSave = async () => {
    const timeoutMinutes = Number.parseInt(gatewayTimeoutMinutes, 10);
    if (!Number.isFinite(timeoutMinutes) || timeoutMinutes < 1 || timeoutMinutes > 60) {
      setError('Gateway timeout must be between 1 and 60 minutes');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await remoteApi.updateTerminalSettings(terminalContext.terminalId, {
        gatewayTimeoutMinutes: timeoutMinutes,
        kioskCollectsPayment,
        mode,
        printDualTokens
      });
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save terminal settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Terminal mode">
      <div className="space-y-5">
        <div className="space-y-2">
          {modes.map((option) => {
            const selected = option.value === mode;
            return (
              <button
                className={`w-full rounded-2xl border px-4 py-3 text-left ${
                  selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface-raised active:bg-surface-sunken'
                }`}
                key={option.value}
                onClick={() => setMode(option.value)}
                type="button"
              >
                <p className="text-sm font-bold text-ink">{option.label}</p>
                <p className="text-xs text-ink-faint">{option.description}</p>
              </button>
            );
          })}
        </div>

        {mode === 'SELF_SERVICE_KIOSK' && (
          <div className="space-y-4 rounded-2xl bg-surface-sunken p-4">
            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-ink">Kiosk collects payment</span>
                <span className="block text-xs text-ink-faint">
                  Customers pay by UPI on this screen before the token prints. Turn this off if customers should pay
                  a cashier instead.
                </span>
              </span>
              <input
                checked={kioskCollectsPayment}
                className="mt-1 h-5 w-5 shrink-0"
                onChange={(event) => setKioskCollectsPayment(event.target.checked)}
                type="checkbox"
              />
            </label>

            {kioskCollectsPayment && (
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm font-semibold text-ink">Cancel unpaid orders after (minutes)</span>
                <input
                  className="w-20 rounded-xl border border-line bg-surface-raised px-3 py-2 text-right text-sm font-semibold text-ink"
                  inputMode="numeric"
                  onChange={(event) => setGatewayTimeoutMinutes(event.target.value)}
                  type="number"
                  value={gatewayTimeoutMinutes}
                />
              </label>
            )}

            <label className="flex items-start justify-between gap-4">
              <span>
                <span className="block text-sm font-semibold text-ink">Print 1+1 tokens</span>
                <span className="block text-xs text-ink-faint">
                  Prints two full copies of the same token instead of one, so it can be handed off through the
                  counter, then the kitchen, and still leave a copy with the customer. Turn this on only if your
                  handover needs two physical tokens per order.
                </span>
              </span>
              <input
                checked={printDualTokens}
                className="mt-1 h-5 w-5 shrink-0"
                onChange={(event) => setPrintDualTokens(event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>
        )}

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        <Button disabled={saving} fullWidth onClick={() => void handleSave()} size="lg" variant="brand">
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </Modal>
  );
};
