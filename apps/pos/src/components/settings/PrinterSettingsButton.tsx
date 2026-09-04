import { Settings } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '../common/IconButton.js';
import { PrinterSettingsModal } from './PrinterSettingsModal.js';

export const PrinterSettingsButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Printer settings" onClick={() => setOpen(true)} tone="neutral">
        <Settings size={20} />
      </IconButton>
      <PrinterSettingsModal onClose={() => setOpen(false)} open={open} />
    </>
  );
};
