import { Calculator } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '../common/IconButton.js';
import { CalculatorModal } from './CalculatorModal.js';

export const CalculatorButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Open calculator" onClick={() => setOpen(true)} tone="brand">
        <Calculator size={20} />
      </IconButton>
      <CalculatorModal onClose={() => setOpen(false)} open={open} />
    </>
  );
};
