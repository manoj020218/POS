import { ChevronRight, UserCircle2 } from 'lucide-react';

type CustomerBarProps = {
  customerName: string;
  onOpen: () => void;
};

export const CustomerBar = ({ customerName, onOpen }: CustomerBarProps) => (
  <button
    className="flex h-14 w-full items-center gap-3 rounded-2xl border border-line bg-surface-raised px-4 active:bg-surface-sunken"
    onClick={onOpen}
    type="button"
  >
    <UserCircle2 size={22} className="text-brand-500" />
    <span className="flex-1 truncate text-left text-sm font-semibold text-ink">{customerName}</span>
    <ChevronRight size={18} className="text-ink-faint" />
  </button>
);
