import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Tone = 'brand' | 'danger' | 'neutral' | 'success';
type Size = 'md' | 'sm';

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-600 active:bg-brand-100',
  danger: 'bg-danger-50 text-danger-600 active:bg-danger-500 active:text-white',
  neutral: 'bg-surface-sunken text-ink active:bg-line',
  success: 'bg-success-50 text-success-600 active:bg-success-500 active:text-white'
};

const sizeClasses: Record<Size, string> = {
  md: 'h-12 w-12 rounded-xl',
  sm: 'h-9 w-9 rounded-lg'
};

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  size?: Size;
  tone?: Tone;
};

export const IconButton = ({ children, className = '', label, size = 'md', tone = 'neutral', ...rest }: IconButtonProps) => (
  <button
    aria-label={label}
    className={`inline-flex select-none items-center justify-center transition-colors disabled:pointer-events-none disabled:opacity-40 ${sizeClasses[size]} ${toneClasses[tone]} ${className}`}
    type="button"
    {...rest}
  >
    {children}
  </button>
);
