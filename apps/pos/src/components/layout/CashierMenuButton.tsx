import { ChevronDown, LogOut, Pencil, User } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type CashierMenuButtonProps = {
  cashierName: string;
  onEditName: () => void;
  onSignOut: () => void;
};

export const CashierMenuButton = ({ cashierName, onEditName, onSignOut }: CashierMenuButtonProps) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ right: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      setPosition({ right: window.innerWidth - rect.right, top: rect.bottom + 8 });
    }
    setOpen(true);
  };

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-2xl bg-surface-sunken px-4 py-2 active:bg-line"
        onClick={() => (open ? setOpen(false) : openMenu())}
        ref={triggerRef}
        type="button"
      >
        <User size={18} className="text-ink-muted" />
        <span className="max-w-[8rem] truncate text-sm font-semibold text-ink">{cashierName}</span>
        <ChevronDown size={16} className="text-ink-faint" />
      </button>

      {open &&
        position &&
        createPortal(
          <>
            {/* Portal, same reasoning as MoreMenuButton -- the top bar's
                overflow-x-auto would otherwise clip this dropdown. */}
            <button
              aria-label="Close menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
              type="button"
            />
            <div
              className="fixed z-50 w-56 overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-kiosk-lg"
              style={{ right: position.right, top: position.top }}
            >
              <button
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-sunken"
                onClick={() => {
                  setOpen(false);
                  onEditName();
                }}
                type="button"
              >
                <Pencil size={18} className="text-ink-muted" />
                <span className="text-sm font-semibold text-ink">Edit name</span>
              </button>
              <button
                className="flex w-full items-center gap-3 border-t border-line px-4 py-3 text-left active:bg-danger-50"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                type="button"
              >
                <LogOut size={18} className="text-danger-600" />
                <span className="text-sm font-semibold text-danger-600">Sign out</span>
              </button>
            </div>
          </>,
          document.body
        )}
    </>
  );
};
