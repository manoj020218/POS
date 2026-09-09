import { LayoutGrid } from 'lucide-react';
import { useState } from 'react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { IconButton } from '../common/IconButton.js';
import { TerminalModeSettingsModal } from './TerminalModeSettingsModal.js';

type TerminalModeSettingsButtonProps = {
  onTerminalSettingsSaved: () => void;
  terminalSettings: ClientTerminalSettings;
};

export const TerminalModeSettingsButton = ({
  onTerminalSettingsSaved,
  terminalSettings
}: TerminalModeSettingsButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <IconButton label="Terminal mode" onClick={() => setOpen(true)} tone="neutral">
        <LayoutGrid size={20} />
      </IconButton>
      <TerminalModeSettingsModal
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false);
          onTerminalSettingsSaved();
        }}
        open={open}
        terminalSettings={terminalSettings}
      />
    </>
  );
};
