import { MoreVertical, Pin, PinOff } from 'lucide-react';
import { useState } from 'react';

import { IconButton } from '../common/IconButton.js';
import type { TopBarMenuEntry } from './topbar-menu-entries.js';

type MoreMenuButtonProps = {
  entries: TopBarMenuEntry[];
  isPinned: (id: string) => boolean;
  onOpenEntry: (id: string) => void;
  togglePinned: (id: string) => void;
};

// WhatsApp-style overflow: every settings-shaped entry lives here regardless
// of pin state, so the cashier always has one place to find (and re-pin)
// anything -- pinning just controls whether it *also* shows on the bar.
export const MoreMenuButton = ({ entries, isPinned, onOpenEntry, togglePinned }: MoreMenuButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <IconButton label="More options" onClick={() => setOpen((previous) => !previous)} tone="neutral">
        <MoreVertical size={20} />
      </IconButton>

      {open && (
        <>
          <button
            aria-label="Close menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="absolute right-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-kiosk-lg">
            <p className="border-b border-line px-4 py-2 text-xs font-semibold text-ink-faint">
              Pin the ones you use often
            </p>
            <div className="max-h-[60vh] overflow-y-auto">
              {entries.map((entry) => {
                const pinned = isPinned(entry.id);
                return (
                  <div
                    className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 active:bg-surface-sunken"
                    key={entry.id}
                  >
                    <button
                      className="flex flex-1 items-center gap-3 text-left"
                      onClick={() => {
                        setOpen(false);
                        onOpenEntry(entry.id);
                      }}
                      type="button"
                    >
                      <span className="text-ink-muted">{entry.icon}</span>
                      <span className="text-sm font-semibold text-ink">{entry.label}</span>
                    </button>
                    <button
                      aria-label={pinned ? `Unpin ${entry.label}` : `Pin ${entry.label}`}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        pinned ? 'bg-brand-50 text-brand-600' : 'text-ink-faint'
                      }`}
                      onClick={() => togglePinned(entry.id)}
                      type="button"
                    >
                      {pinned ? <Pin size={16} /> : <PinOff size={16} />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
