import { Modal } from '../common/Modal.js';

type AiAssistantModalProps = {
  onClose: () => void;
  open: boolean;
};

// Placeholder entry point only -- no credential storage, no AI wiring yet.
// Client asked for this to exist as a visible "coming soon" line item.
export const AiAssistantModal = ({ onClose, open }: AiAssistantModalProps) => (
  <Modal onClose={onClose} open={open} title="AI Assistant" widthClassName="max-w-sm">
    <div className="space-y-3 text-center">
      <p className="text-lg font-bold text-ink">Coming soon</p>
      <p className="text-sm text-ink-muted">
        AI-powered reports and data exports — sending sales data to specific people in specific formats,
        generating custom reports, and more — are on the way.
      </p>
    </div>
  </Modal>
);
