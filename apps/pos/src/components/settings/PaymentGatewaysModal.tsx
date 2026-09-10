import { CheckCircle2, CircleDashed } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ClientPaymentGatewayCard } from '@smart-pos/client-data';

import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type PaymentGatewaysModalProps = {
  onClose: () => void;
  open: boolean;
};

// Per-gateway field definitions — add an entry here (and to the server's
// requiredFieldsByGateway) when a second gateway adapter is actually wired up.
const CREDENTIAL_FIELDS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  razorpay: [
    { key: 'keyId', label: 'Key ID', placeholder: 'rzp_test_... or rzp_live_...' },
    { key: 'keySecret', label: 'Key Secret', placeholder: 'Leave blank to keep existing' },
    { key: 'webhookSecret', label: 'Webhook Secret', placeholder: 'Leave blank to keep existing' }
  ]
};

export const PaymentGatewaysModal = ({ onClose, open }: PaymentGatewaysModalProps) => {
  const { remoteApi, terminalContext } = usePosContext();
  const [cards, setCards] = useState<ClientPaymentGatewayCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await remoteApi.listPaymentGatewayCards(terminalContext.businessId);
        if (!cancelled) {
          setCards(result);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load payment gateways');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [open, remoteApi, terminalContext.businessId]);

  if (!open) {
    return null;
  }

  const openCard = (code: string) => {
    setExpandedCode(expandedCode === code ? null : code);
    setFieldValues({});
    setError(null);
  };

  const toggleEnabled = async (card: ClientPaymentGatewayCard) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await remoteApi.updatePaymentGatewayCredentials(card.code, {
        businessId: terminalContext.businessId,
        isEnabled: !card.isEnabled
      });
      setCards((previous) => previous.map((item) => (item.code === updated.code ? updated : item)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update this gateway');
    } finally {
      setSaving(false);
    }
  };

  const saveCredentials = async (card: ClientPaymentGatewayCard) => {
    setSaving(true);
    setError(null);
    try {
      const credentials = Object.fromEntries(
        Object.entries(fieldValues).filter(([, value]) => value.trim().length > 0)
      );
      const updated = await remoteApi.updatePaymentGatewayCredentials(card.code, {
        businessId: terminalContext.businessId,
        credentials
      });
      setCards((previous) => previous.map((item) => (item.code === updated.code ? updated : item)));
      setExpandedCode(null);
      setFieldValues({});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save credentials');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Payment gateways" widthClassName="max-w-lg">
      <div className="space-y-4">
        <p className="text-xs text-ink-faint">
          Enter your own payment gateway account details to let this business collect kiosk payments
          directly. Credentials are encrypted and never shown again once saved.
        </p>

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        {loading ? (
          <p className="py-8 text-center text-sm text-ink-faint">Loading…</p>
        ) : (
          <div className="space-y-3">
            {cards.map((card) => {
              const fields = CREDENTIAL_FIELDS[card.code] ?? [];
              const expanded = expandedCode === card.code;

              return (
                <div className="rounded-2xl border border-line bg-surface-raised p-4" key={card.code}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {card.configured ? (
                        <CheckCircle2 size={18} className="text-success-500" />
                      ) : (
                        <CircleDashed size={18} className="text-ink-faint" />
                      )}
                      <div>
                        <p className="text-sm font-bold text-ink">{card.label}</p>
                        <p className="text-xs text-ink-faint">
                          {card.configured ? 'Credentials saved' : 'Not configured yet'}
                        </p>
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink-faint">
                        {card.isEnabled ? 'Active' : 'Off'}
                      </span>
                      <input
                        checked={card.isEnabled}
                        className="h-5 w-5"
                        disabled={saving}
                        onChange={() => void toggleEnabled(card)}
                        type="checkbox"
                      />
                    </label>
                  </div>

                  <button
                    className="mt-3 text-xs font-semibold text-brand-600"
                    onClick={() => openCard(card.code)}
                    type="button"
                  >
                    {expanded ? 'Cancel' : card.configured ? 'Update credentials' : 'Add credentials'}
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-3 border-t border-line pt-3">
                      {fields.map((field) => (
                        <label className="flex flex-col gap-1" key={field.key}>
                          <span className="text-xs font-semibold text-ink-muted">{field.label}</span>
                          <input
                            className="h-11 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink"
                            onChange={(event) =>
                              setFieldValues((previous) => ({ ...previous, [field.key]: event.target.value }))
                            }
                            placeholder={field.placeholder}
                            type="password"
                            value={fieldValues[field.key] ?? ''}
                          />
                        </label>
                      ))}
                      <Button disabled={saving} fullWidth onClick={() => void saveCredentials(card)} variant="brand">
                        {saving ? 'Saving…' : 'Save credentials'}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
