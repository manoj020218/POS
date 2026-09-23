import { ChevronRight, UserCircle2 } from 'lucide-react';

type CustomerBarProps = {
  customerName: string;
  onOpen: () => void;
};

export const CustomerBar = ({ customerName, onOpen }: CustomerBarProps) => (
  <button
    className="flex h-12 w-full min-w-0 items-center gap-2 rounded-2xl border border-line bg-surface-raised px-2.5 active:bg-surface-sunken @sm:h-14 @sm:gap-3 @sm:px-4"
    onClick={onOpen}
    type="button"
  >
    <UserCircle2 className="shrink-0 text-brand-500" size={20} />
    <span className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-ink">{customerName}</span>
    <ChevronRight className="hidden shrink-0 text-ink-faint @sm:block" size={18} />
  </button>
);
