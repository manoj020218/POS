import { Sparkles } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '../common/IconButton.js';
import { Modal } from '../common/Modal.js';

// Placeholder entry point only -- no credential storage, no AI wiring yet.
// Client asked for this to exist as a visible "coming soon" line item.
export const AiAssistantButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="AI Assistant (coming soon)" onClick={() => setOpen(true)} tone="neutral">
        <Sparkles size={20} />
      </IconButton>
      <Modal onClose={() => setOpen(false)} open={open} title="AI Assistant" widthClassName="max-w-sm">
        <div className="space-y-3 text-center">
          <p className="text-lg font-bold text-ink">Coming soon</p>
          <p className="text-sm text-ink-muted">
            AI-powered reports and data exports — sending sales data to specific people in specific
            formats, generating custom reports, and more — are on the way.
          </p>
        </div>
      </Modal>
    </>
  );
};
