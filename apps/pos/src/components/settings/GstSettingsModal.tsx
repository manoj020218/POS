import { useEffect, useState } from 'react';
import type { ClientRemoteTaxProfileView } from '@smart-pos/client-data';

import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type GstSettingsModalProps = {
  onClose: () => void;
  open: boolean;
};

const PRESET_PERCENTAGES = [5, 12, 18, 28];

// The default "no tax" profile every business already has (auto-created
// server-side the first time any product/tax lookup needs a fallback) --
// reused here as the target when the cashier turns GST off, rather than
// leaving defaultTaxProfileId pointing at a stale rate.
const NO_TAX_CODE = 'NO-TAX';

export const GstSettingsModal = ({ onClose, open }: GstSettingsModalProps) => {
  const { refreshSettings, remoteApi, settings, terminalContext } = usePosContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<ClientRemoteTaxProfileView[]>([]);
  const [gstApplicable, setGstApplicable] = useState(false);
  const [selectedPercent, setSelectedPercent] = useState<number>(18);
  const [customPercent, setCustomPercent] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await remoteApi.listTaxProfiles({ businessId: terminalContext.businessId });
        if (cancelled) {
          return;
        }
        setProfiles(result);

        const currentRate = settings.defaultTaxProfile?.rateBasisPoints ?? 0;
        if (currentRate > 0) {
          setGstApplicable(true);
          const percent = currentRate / 100;
          if (PRESET_PERCENTAGES.includes(percent)) {
            setSelectedPercent(percent);
            setUseCustom(false);
          } else {
            setCustomPercent(String(percent));
            setUseCustom(true);
          }
        } else {
          setGstApplicable(false);
        }
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load GST settings');
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
  }, [open, remoteApi, settings.defaultTaxProfile?.rateBasisPoints, terminalContext.businessId]);

  if (!open) {
    return null;
  }

  const activePercent = useCustom ? Number(customPercent) || 0 : selectedPercent;
  const halfPercent = (activePercent / 2).toFixed(activePercent % 1 === 0 ? 0 : 2);

  const findOrCreateProfile = async (rateBasisPoints: number, code: string, name: string) => {
    const existing = profiles.find((profile) => profile.code === code);
    if (existing) {
      return existing.rateBasisPoints === rateBasisPoints
        ? existing
        : remoteApi.updateTaxProfile(existing.id, { rateBasisPoints });
    }
    return remoteApi.createTaxProfile({
      businessId: terminalContext.businessId,
      code,
      name,
      rateBasisPoints
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (!gstApplicable) {
        const noTaxProfile = await findOrCreateProfile(0, NO_TAX_CODE, 'No Tax');
        await remoteApi.updateBusinessSettings({ defaultTaxProfileId: noTaxProfile.id });
      } else {
        if (activePercent <= 0 || activePercent > 100) {
          setError('Enter a GST percentage between 1 and 100');
          setSaving(false);
          return;
        }
        const rateBasisPoints = Math.round(activePercent * 100);
        const code = `GST${activePercent}`.replace('.', '_');
        const profile = await findOrCreateProfile(rateBasisPoints, code, `GST ${activePercent}%`);
        await remoteApi.updateBusinessSettings({ defaultTaxProfileId: profile.id });
      }
      await refreshSettings();
      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save GST settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="GST settings" widthClassName="max-w-lg">
      <div className="space-y-5">
        <p className="text-xs text-ink-faint">
          Product prices in the POS always include tax. When GST is on, the receipt shows the CGST and
          SGST collected within that price instead of the total charged changing.
        </p>

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        {loading ? (
          <p className="py-8 text-center text-sm text-ink-faint">Loading…</p>
        ) : (
          <>
            <div className="flex gap-3">
              <button
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
                  gstApplicable
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-line bg-surface-raised text-ink-faint'
                }`}
                onClick={() => setGstApplicable(true)}
                type="button"
              >
                GST Applicable
              </button>
              <button
                className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
                  !gstApplicable
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-line bg-surface-raised text-ink-faint'
                }`}
                onClick={() => setGstApplicable(false)}
                type="button"
              >
                Not Applicable
              </button>
            </div>

            {gstApplicable && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-ink-muted">GST % included in sale price</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_PERCENTAGES.map((percent) => (
                    <button
                      className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                        !useCustom && selectedPercent === percent
                          ? 'border-brand-500 bg-brand-50 text-brand-600'
                          : 'border-line bg-surface-raised text-ink'
                      }`}
                      key={percent}
                      onClick={() => {
                        setSelectedPercent(percent);
                        setUseCustom(false);
                      }}
                      type="button"
                    >
                      {percent}%
                    </button>
                  ))}
                  <button
                    className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors ${
                      useCustom ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-line bg-surface-raised text-ink'
                    }`}
                    onClick={() => setUseCustom(true)}
                    type="button"
                  >
                    Custom
                  </button>
                </div>

                {useCustom && (
                  <input
                    className="h-11 w-32 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink"
                    inputMode="decimal"
                    onChange={(event) => setCustomPercent(event.target.value)}
                    placeholder="e.g. 5.5"
                    type="number"
                    value={customPercent}
                  />
                )}

                {activePercent > 0 && (
                  <p className="rounded-xl bg-surface-sunken px-4 py-3 text-xs text-ink-faint">
                    On the receipt this will print as{' '}
                    <span className="font-bold text-ink">CGST {halfPercent}%</span> +{' '}
                    <span className="font-bold text-ink">SGST {halfPercent}%</span>, splitting the {activePercent}%
                    total tax collected within the price shown.
                  </p>
                )}
              </div>
            )}

            <Button disabled={saving} fullWidth onClick={() => void save()} variant="brand">
              {saving ? 'Saving…' : 'Save GST settings'}
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
};
