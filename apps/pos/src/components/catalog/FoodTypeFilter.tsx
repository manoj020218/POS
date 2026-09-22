import type { FoodType } from '../../state/use-product-catalog.js';

type FoodTypeFilterProps = {
  active: Set<FoodType>;
  onToggle: (foodType: FoodType) => void;
};

const options: { dotClassName: string; foodType: FoodType; label: string }[] = [
  { dotClassName: 'bg-success-500', foodType: 'veg', label: 'Veg' },
  { dotClassName: 'bg-danger-500', foodType: 'non_veg', label: 'Non-veg' }
];

export const FoodTypeFilter = ({ active, onToggle }: FoodTypeFilterProps) => (
  <div className="flex shrink-0 gap-2">
    {options.map((option) => {
      const isActive = active.has(option.foodType);
      return (
        <button
          className={`flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors ${
            isActive
              ? 'bg-brand-500 text-white shadow-kiosk'
              : 'bg-surface-raised text-ink-muted border border-line active:bg-surface-sunken'
          }`}
          key={option.foodType}
          onClick={() => onToggle(option.foodType)}
          type="button"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${option.dotClassName}`} />
          {option.label}
        </button>
      );
    })}
  </div>
);
