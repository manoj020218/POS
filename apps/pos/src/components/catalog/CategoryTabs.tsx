import { allCategoryFilter } from '../../state/use-product-catalog.js';

type CategoryTabsProps = {
  categories: { code: string; name: string }[];
  onSelect: (code: string) => void;
  selected: string;
};

export const CategoryTabs = ({ categories, onSelect, selected }: CategoryTabsProps) => {
  const tabs = [{ code: allCategoryFilter, name: 'All items' }, ...categories];

  return (
    <div className="flex shrink-0 gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const active = tab.code === selected;
        return (
          <button
            className={`h-11 shrink-0 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors ${
              active
                ? 'bg-brand-500 text-white shadow-kiosk'
                : 'bg-surface-raised text-ink-muted border border-line active:bg-surface-sunken'
            }`}
            key={tab.code}
            onClick={() => onSelect(tab.code)}
            type="button"
          >
            {tab.name}
          </button>
        );
      })}
    </div>
  );
};
