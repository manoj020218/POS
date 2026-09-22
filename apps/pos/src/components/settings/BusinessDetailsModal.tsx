import { useEffect, useState } from 'react';

import { usePosContext } from '../../state/use-pos-context.js';
import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

type BusinessDetailsModalProps = {
  onClose: () => void;
  open: boolean;
};

// Everything here prints on the receipt header -- business name, the
// current branch's address, and GSTIN (blank when the business isn't
// GST-registered).
export const BusinessDetailsModal = ({ onClose, open }: BusinessDetailsModalProps) => {
  const { refreshSettings, remoteApi, settings, terminalContext } = usePosContext();
  const currentBranch = settings.branches.find((branch) => branch.branchId === terminalContext.branchId);

  const [businessName, setBusinessName] = useState(settings.businessName);
  const [address, setAddress] = useState(currentBranch?.address ?? '');
  const [gstin, setGstin] = useState(settings.gstin ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setBusinessName(settings.businessName);
      setAddress(currentBranch?.address ?? '');
      setGstin(settings.gstin ?? '');
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) {
    return null;
  }

  const trimmedName = businessName.trim();
  const trimmedAddress = address.trim();
  const trimmedGstin = gstin.trim().toUpperCase();
  const addressTooShort = trimmedAddress.length > 0 && trimmedAddress.length < 4;
  const canSave = trimmedName.length >= 2 && !addressTooShort && trimmedGstin.length <= 15 && !saving;

  const save = async () => {
    if (!canSave) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: Parameters<typeof remoteApi.updateBusinessSettings>[0] = {};

      if (trimmedName !== settings.businessName) {
        payload.businessName = trimmedName;
      }
      if (trimmedGstin !== (settings.gstin ?? '')) {
        payload.gstin = trimmedGstin.length > 0 ? trimmedGstin : null;
      }
      if (trimmedAddress.length > 0 && trimmedAddress !== (currentBranch?.address ?? '')) {
        payload.branches = [{ address: trimmedAddress, branchId: terminalContext.branchId }];
      }

      if (Object.keys(payload).length > 0) {
        await remoteApi.updateBusinessSettings(payload);
        await refreshSettings();
      }

      onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save business details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} open={open} title="Business details" widthClassName="max-w-lg">
      <div className="space-y-4">
        <p className="text-xs text-ink-faint">
          Printed at the top of every receipt -- business name, this branch's address, and GSTIN (if
          registered).
        </p>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-faint" htmlFor="business-name">
            Business name
          </label>
          <input
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
            id="business-name"
            maxLength={120}
            onChange={(event) => setBusinessName(event.target.value)}
            value={businessName}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-faint" htmlFor="business-address">
            Address
          </label>
          <textarea
            className="h-20 w-full resize-none rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-brand-500"
            id="business-address"
            maxLength={240}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="Shop no., street, city, PIN"
            value={address}
          />
          {addressTooShort && <p className="text-xs font-semibold text-danger-600">At least 4 characters.</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-faint" htmlFor="business-gstin">
            GSTIN (optional)
          </label>
          <input
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold uppercase text-ink placeholder:text-ink-faint placeholder:normal-case focus:outline-none focus:ring-2 focus:ring-brand-500"
            id="business-gstin"
            maxLength={15}
            onChange={(event) => setGstin(event.target.value)}
            placeholder="Leave blank if not GST-registered"
            value={gstin}
          />
        </div>

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        <Button disabled={!canSave} fullWidth onClick={() => void save()} variant="brand">
          {saving ? 'Saving…' : 'Save business details'}
        </Button>
      </div>
    </Modal>
  );
};
