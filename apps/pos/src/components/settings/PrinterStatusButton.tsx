import { Printer } from 'lucide-react';
import { useState } from 'react';

import { usePrinterConnectionStatus } from '../../state/use-printer-connection-status.js';
import { IconButton } from '../common/IconButton.js';
import { PrinterSettingsModal } from './PrinterSettingsModal.js';

const statusLabel: Record<ReturnType<typeof usePrinterConnectionStatus>, string> = {
  checking: 'Printer status: checking…',
  connected: 'Printer connected — tap to manage',
  unpaired: 'No printer paired — tap to set one up',
  unreachable: 'Printer not reachable — tap to reconnect'
};

// Sits next to the calculator in the top bar so a cashier can glance at it
// before starting a sale instead of only finding out the printer failed
// after checkout completes.
export const PrinterStatusButton = () => {
  const [open, setOpen] = useState(false);
  const status = usePrinterConnectionStatus();
  const connected = status === 'connected';

  return (
    <>
      <IconButton
        className={connected ? 'animate-pulse' : 'opacity-40'}
        label={statusLabel[status]}
        onClick={() => setOpen(true)}
        tone={connected ? 'success' : 'neutral'}
      >
        <Printer size={20} />
      </IconButton>
      <PrinterSettingsModal onClose={() => setOpen(false)} open={open} />
    </>
  );
};
