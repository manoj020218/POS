import { X } from 'lucide-react';
import type { ReactNode } from 'react';

import { IconButton } from './IconButton.js';

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
  widthClassName?: string;
};

export const Modal = ({ children, onClose, open, title, widthClassName = 'max-w-xl' }: ModalProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div
        className={`flex max-h-[90vh] w-full flex-col overflow-hidden rounded-3xl bg-surface-raised shadow-kiosk-lg ${widthClassName}`}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-xl font-bold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose} tone="neutral">
            <X size={22} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
      </div>
    </div>
  );
};
