import { Store } from 'lucide-react';
import { useState } from 'react';
import type { ClientTerminalSettings } from '@smart-pos/client-data';

import { usePosContext } from '../../state/use-pos-context.js';
import { usePinnedTopBarEntries } from '../../state/use-pinned-topbar-entries.js';
import { CalculatorButton } from '../calculator/CalculatorButton.js';
import { IconButton } from '../common/IconButton.js';
import { BusinessDetailsModal } from '../settings/BusinessDetailsModal.js';
import { PrinterStatusButton } from '../settings/PrinterStatusButton.js';
import { CashierMenuButton } from './CashierMenuButton.js';
import { EditNameModal } from './EditNameModal.js';
import { LiveClock } from './LiveClock.js';
import { MoreMenuButton } from './MoreMenuButton.js';
import { useTopBarMenuEntries } from './topbar-menu-entries.js';

type TopBarProps = {
  onProductSaved: () => void;
  onTerminalSettingsSaved: () => void;
  terminalSettings: ClientTerminalSettings;
};

export const TopBar = ({ onProductSaved, onTerminalSettingsSaved, terminalSettings }: TopBarProps) => {
  const { logout, renameCashier, settings, terminalContext } = usePosContext();
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);

  const entries = useTopBarMenuEntries({ onProductSaved, onTerminalSettingsSaved, terminalSettings });
  const { isPinned, pinnedIds, togglePinned } = usePinnedTopBarEntries(entries.map((entry) => entry.id));
  const pinnedEntries = entries.filter((entry) => pinnedIds.includes(entry.id));

  return (
    <header className="flex h-20 shrink-0 items-center justify-between gap-3 overflow-x-auto border-b border-line bg-surface-raised px-3 lg:px-6">
      <button
        className="flex min-w-0 shrink-0 items-center gap-3 rounded-2xl text-left transition-opacity active:opacity-70"
        onClick={() => setProfileOpen(true)}
        type="button"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white">
          <Store size={22} />
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-base font-bold text-ink">{settings.businessName}</p>
          <p className="truncate text-xs font-medium text-ink-faint">
            {terminalContext.branchName} · {terminalContext.terminalName ?? terminalContext.terminalCode}
          </p>
        </div>
      </button>
      <BusinessDetailsModal onClose={() => setProfileOpen(false)} open={profileOpen} />

      <div className="flex shrink-0 items-center gap-2 lg:gap-5">
        <CalculatorButton />
        <PrinterStatusButton />

        {pinnedEntries.map((entry) => (
          <IconButton key={entry.id} label={entry.label} onClick={() => setActiveEntryId(entry.id)} tone="neutral">
            {entry.icon}
          </IconButton>
        ))}

        <div className="hidden lg:block">
          <LiveClock />
        </div>

        <CashierMenuButton
          cashierName={terminalContext.cashierName ?? 'Cashier'}
          onEditName={() => setEditNameOpen(true)}
          onSignOut={logout}
        />

        <MoreMenuButton
          entries={entries}
          isPinned={isPinned}
          onOpenEntry={setActiveEntryId}
          togglePinned={togglePinned}
        />
      </div>

      <EditNameModal
        currentName={terminalContext.cashierName ?? ''}
        onClose={() => setEditNameOpen(false)}
        onSave={renameCashier}
        open={editNameOpen}
      />

      {entries.map((entry) => (
        <span key={entry.id}>{entry.renderModal(activeEntryId === entry.id, () => setActiveEntryId(null))}</span>
      ))}
    </header>
  );
};
