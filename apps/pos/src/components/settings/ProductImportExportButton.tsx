import { Sheet } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '../common/IconButton.js';
import { ProductImportExportModal } from './ProductImportExportModal.js';

export const ProductImportExportButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Import or export products" onClick={() => setOpen(true)} tone="neutral">
        <Sheet size={20} />
      </IconButton>
      <ProductImportExportModal onClose={() => setOpen(false)} open={open} />
    </>
  );
};
