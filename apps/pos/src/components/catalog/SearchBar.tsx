import { Search, X } from 'lucide-react';

type SearchBarProps = {
  onChange: (value: string) => void;
  value: string;
};

export const SearchBar = ({ onChange, value }: SearchBarProps) => (
  <div className="flex h-14 shrink-0 items-center gap-3 rounded-2xl border border-line bg-surface-raised px-4 shadow-kiosk">
    <Search size={20} className="shrink-0 text-ink-faint" />
    <input
      className="h-full flex-1 bg-transparent text-base font-medium text-ink placeholder:text-ink-faint focus:outline-none"
      inputMode="search"
      onChange={(event) => onChange(event.target.value)}
      placeholder="Search products, SKU or scan barcode"
      value={value}
    />
    {value.length > 0 && (
      <button
        aria-label="Clear search"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted active:bg-line"
        onClick={() => onChange('')}
        type="button"
      >
        <X size={18} />
      </button>
    )}
  </div>
);
