import { Ticket } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '../common/IconButton.js';
import { KioskOrderQueueModal } from './KioskOrderQueueModal.js';

export const KioskOrderQueueButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Kiosk orders" onClick={() => setOpen(true)} tone="neutral">
        <Ticket size={20} />
      </IconButton>
      <KioskOrderQueueModal onClose={() => setOpen(false)} open={open} />
    </>
  );
};
