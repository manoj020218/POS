import { CreditCard } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '../common/IconButton.js';
import { PaymentGatewaysModal } from './PaymentGatewaysModal.js';

export const PaymentGatewaysButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Payment gateways" onClick={() => setOpen(true)} tone="neutral">
        <CreditCard size={20} />
      </IconButton>
      <PaymentGatewaysModal onClose={() => setOpen(false)} open={open} />
    </>
  );
};
