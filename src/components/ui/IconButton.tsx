import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/styles';

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: ReactNode;
};

export function IconButton({
  label,
  children,
  className,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full border text-sm transition-transform duration-150 gpu-smooth active:scale-95',
        'size-[var(--header-control-size)] border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm hover:border-[var(--app-gold-border)] focus-visible:luxury-focus',
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
