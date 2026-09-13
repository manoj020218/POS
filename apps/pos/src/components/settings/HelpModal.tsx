import { Phone } from 'lucide-react';

import { Button } from '../common/Button.js';
import { Modal } from '../common/Modal.js';

const SUPPORT_PHONE = '7240226566';

type HelpModalProps = {
  onClose: () => void;
  open: boolean;
};

export const HelpModal = ({ onClose, open }: HelpModalProps) => (
  <Modal onClose={onClose} open={open} title="Help & support" widthClassName="max-w-sm">
    <div className="space-y-4 text-center">
      <p className="text-sm text-ink-muted">Need help with Smart POS? Call our support line.</p>
      <p className="text-2xl font-extrabold text-ink">{SUPPORT_PHONE}</p>
      <Button
        fullWidth
        icon={<Phone size={18} />}
        onClick={() => {
          window.location.href = `tel:${SUPPORT_PHONE}`;
        }}
        size="lg"
        variant="brand"
      >
        Call support
      </Button>
    </div>
  </Modal>
);
