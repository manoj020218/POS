import type { PrinterDevice } from '@jenix/cap-thermal-printer';
import type { ReceiptPrinterProfile } from '@smart-pos/printer';
import { Check, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { usePrinterSettings } from '../../state/use-printer-settings.js';
import { Modal } from '../common/Modal.js';

type PrinterSettingsModalProps = {
  onClose: () => void;
  open: boolean;
};

const paperWidths: ReceiptPrinterProfile['paperWidth'][] = ['58mm', '80mm'];

export const PrinterSettingsModal = ({ onClose, open }: PrinterSettingsModalProps) => {
  const { currentProfile, devices, error, pair, saving, scan, scanning, unpair } = usePrinterSettings();
  const [paperWidth, setPaperWidth] = useState<ReceiptPrinterProfile['paperWidth']>(
    currentProfile?.paperWidth ?? '80mm'
  );

  const busy = scanning || saving;

  return (
    <Modal onClose={onClose} open={open} title="Receipt printer">
      <div className="space-y-4">
        {currentProfile ? (
          <div className="flex items-center justify-between rounded-2xl border border-brand-500 bg-brand-50 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-ink">{currentProfile.name}</p>
              <p className="text-xs text-ink-faint">
                {currentProfile.connectionType} · {currentProfile.paperWidth} · paired
              </p>
            </div>
            <button
              className="text-sm font-semibold text-danger-600 disabled:opacity-40"
              disabled={busy}
              onClick={() => void unpair()}
              type="button"
            >
              Remove
            </button>
          </div>
        ) : (
          <p className="text-sm text-ink-faint">No printer paired yet. Scan and pick one below.</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {paperWidths.map((width) => (
              <button
                className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                  paperWidth === width ? 'border-brand-500 bg-brand-50 text-brand-600' : 'border-line text-ink-faint'
                }`}
                key={width}
                onClick={() => setPaperWidth(width)}
                type="button"
              >
                {width}
              </button>
            ))}
          </div>
          <button
            className="flex items-center gap-2 rounded-xl bg-surface-sunken px-3 py-2 text-sm font-semibold text-ink disabled:opacity-40"
            disabled={busy}
            onClick={() => void scan()}
            type="button"
          >
            <RefreshCw className={scanning ? 'animate-spin' : ''} size={16} />
            {scanning ? 'Scanning…' : 'Scan for printers'}
          </button>
        </div>

        {error && <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-600">{error}</p>}

        <div className="space-y-2">
          {devices.map((device: PrinterDevice) => {
            const selected = currentProfile?.target === device.id;
            return (
              <button
                className={`flex h-16 w-full items-center gap-3 rounded-2xl border px-4 text-left disabled:opacity-40 ${
                  selected ? 'border-brand-500 bg-brand-50' : 'border-line bg-surface-raised active:bg-surface-sunken'
                }`}
                disabled={busy}
                key={device.id}
                onClick={() => void pair(device, paperWidth)}
                type="button"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{device.name ?? device.id}</p>
                  <p className="truncate text-xs text-ink-faint">{device.transport.toUpperCase()} · {device.id}</p>
                </div>
                {selected && <Check size={20} className="shrink-0 text-brand-500" />}
              </button>
            );
          })}
          {devices.length === 0 && !scanning && (
            <p className="py-6 text-center text-sm text-ink-faint">No printers found yet.</p>
          )}
        </div>
      </div>
    </Modal>
  );
};
