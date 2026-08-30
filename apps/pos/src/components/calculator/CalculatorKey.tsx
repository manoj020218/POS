import type { ReactNode } from 'react';

type Tone = 'accent' | 'muted' | 'operator';

const toneClasses: Record<Tone, string> = {
  accent: 'bg-brand-500 text-white active:bg-brand-700',
  muted: 'bg-surface-sunken text-ink active:bg-line',
  operator: 'bg-warn-50 text-warn-600 active:bg-warn-500 active:text-white'
};

type CalculatorKeyProps = {
  children: ReactNode;
  className?: string;
  onPress: () => void;
  tone?: Tone;
};

export const CalculatorKey = ({ children, className = '', onPress, tone = 'muted' }: CalculatorKeyProps) => (
  <button
    className={`h-14 rounded-2xl text-xl font-bold transition-colors ${toneClasses[tone]} ${className}`}
    onClick={onPress}
    type="button"
  >
    {children}
  </button>
);
