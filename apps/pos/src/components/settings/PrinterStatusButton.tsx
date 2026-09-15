import { Printer } from 'lucide-react';
import { useState } from 'react';

import { openBluetoothSettings } from '../../lib/bluetooth-status.js';
import { usePrinterConnectionStatus } from '../../state/use-printer-connection-status.js';
import { Button } from '../common/Button.js';
import { IconButton } from '../common/IconButton.js';
import { Modal } from '../common/Modal.js';
import { PrinterSettingsModal } from './PrinterSettingsModal.js';

const statusLabel: Record<ReturnType<typeof usePrinterConnectionStatus>, string> = {
  checking: 'Printer status: checking…',
  connected: 'Printer connected — tap to manage',
  unpaired: 'No printer paired — tap to set one up',
  unreachable: 'Printer not reachable — tap to reconnect',
  'bluetooth-off': 'Bluetooth is off — tap to turn it on'
};

// Sits next to the calculator in the top bar so a cashier can glance at it
// before starting a sale instead of only finding out the printer failed
// after checkout completes.
export const PrinterStatusButton = () => {
  const [open, setOpen] = useState(false);
  const [showBluetoothPrompt, setShowBluetoothPrompt] = useState(false);
  const status = usePrinterConnectionStatus();
  const connected = status === 'connected';
  const bluetoothOff = status === 'bluetooth-off';

  return (
    <>
      <div className="relative">
        <IconButton
          className={connected ? 'animate-pulse' : 'opacity-40'}
          label={statusLabel[status]}
          onClick={() => (bluetoothOff ? setShowBluetoothPrompt(true) : setOpen(true))}
          tone={connected ? 'success' : 'neutral'}
        >
          <Printer size={20} />
        </IconButton>
        {bluetoothOff && (
          <span className="absolute -right-1 -top-1 flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-danger-500" />
          </span>
        )}
      </div>
      <PrinterSettingsModal onClose={() => setOpen(false)} open={open} />
      <Modal onClose={() => setShowBluetoothPrompt(false)} open={showBluetoothPrompt} title="Bluetooth is off" widthClassName="max-w-sm">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-faint">
            Your printer connects over Bluetooth, but Bluetooth is currently turned off on this device.
          </p>
          <Button
            fullWidth
            onClick={() => {
              setShowBluetoothPrompt(false);
              void openBluetoothSettings();
            }}
            variant="brand"
          >
            Turn on Bluetooth
          </Button>
        </div>
      </Modal>
    </>
  );
};
