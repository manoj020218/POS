import { PackagePlus } from 'lucide-react';
import { useState } from 'react';

import { AddEditProductModal } from '../catalog/AddEditProductModal.js';
import { IconButton } from '../common/IconButton.js';

type AddProductButtonProps = {
  onProductSaved: () => void;
};

export const AddProductButton = ({ onProductSaved }: AddProductButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Add product" onClick={() => setOpen(true)} tone="neutral">
        <PackagePlus size={20} />
      </IconButton>
      {open && (
        <AddEditProductModal
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            onProductSaved();
          }}
        />
      )}
    </>
  );
};
