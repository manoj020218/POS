import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'brand' | 'danger' | 'ghost' | 'outline' | 'success';
type Size = 'lg' | 'md' | 'sm';

const variantClasses: Record<Variant, string> = {
  brand: 'bg-brand-500 text-white active:bg-brand-700 shadow-kiosk',
  danger: 'bg-danger-50 text-danger-600 active:bg-danger-500 active:text-white',
  ghost: 'bg-transparent text-ink-muted active:bg-surface-sunken',
  outline: 'bg-surface-raised text-ink border border-line active:bg-surface-sunken',
  success: 'bg-success-500 text-white active:bg-success-600 shadow-kiosk'
};

const sizeClasses: Record<Size, string> = {
  lg: 'h-16 px-6 text-lg rounded-2xl',
  md: 'h-12 px-4 text-base rounded-xl',
  sm: 'h-10 px-3 text-sm rounded-lg'
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  fullWidth?: boolean;
  icon?: ReactNode;
  size?: Size;
  variant?: Variant;
};

export const Button = ({
  children,
  className = '',
  fullWidth = false,
  icon,
  size = 'md',
  variant = 'outline',
  ...rest
}: ButtonProps) => (
  <button
    className={`inline-flex select-none items-center justify-center gap-2 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-40 ${variantClasses[variant]} ${sizeClasses[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
    type="button"
    {...rest}
  >
    {icon}
    {children}
  </button>
);
