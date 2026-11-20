import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus } from 'lucide-react';

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  size = 'md',
  leadingIcon,
  trailingIcon,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'h-9 px-5 text-xs'
      : size === 'lg'
        ? 'h-14 px-9 text-base'
        : 'h-12 px-7 text-[15px]';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`prism-btn-primary inline-flex items-center justify-center gap-2.5 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
      {...rest}
    >
      {leadingIcon && <span className="relative z-10 shrink-0">{leadingIcon}</span>}
      <span className="relative z-10">{children}</span>
      {trailingIcon && <span className="relative z-10 shrink-0">{trailingIcon}</span>}
    </button>
  );
};

export interface SecondaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'crystal' | 'cobalt';
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  size = 'md',
  tone = 'crystal',
  leadingIcon,
  trailingIcon,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'h-9 px-5 text-xs'
      : size === 'lg'
        ? 'h-14 px-9 text-base'
        : 'h-12 px-7 text-[15px]';

  const toneClass = tone === 'cobalt' ? 'prism-btn-cobalt' : 'prism-btn-secondary';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${toneClass} inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${className}`}
      {...rest}
    >
      {leadingIcon && <span className="relative z-10 shrink-0">{leadingIcon}</span>}
      <span className="relative z-10">{children}</span>
      {trailingIcon && <span className="relative z-10 shrink-0">{trailingIcon}</span>}
    </button>
  );
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  'aria-label': string;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export const IconButton: React.FC<IconButtonProps> = ({
  size = 'md',
  active = false,
  children,
  className = '',
  disabled,
  ...rest
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'w-9 h-9 rounded-[13px]'
      : size === 'lg'
        ? 'w-14 h-14 rounded-[20px]'
        : 'w-12 h-12 rounded-[17px]';

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      className={`prism-crystal inline-flex items-center justify-center shrink-0 cursor-pointer text-slate-800 dark:text-slate-100 transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:opacity-50 disabled:cursor-not-allowed ${
        active ? 'ring-2 ring-orange-400/70' : ''
      } ${sizeClasses} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
};

export interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface SegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  ariaLabel = 'View selector',
}) => {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="prism-crystal inline-flex items-center p-1 rounded-full gap-1"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={`h-9 px-4 rounded-full text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-all duration-150 focus-visible:outline-2 focus-visible:outline-sky-500 ${
              selected
                ? 'prism-well text-slate-900 dark:text-white font-semibold shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export interface SplitActionItem {
  id: string;
  label: string;
  description?: string;
}

export interface SplitButtonProps {
  label: string;
  onPrimaryClick: () => void;
  actions: SplitActionItem[];
  onSelectAction: (action: SplitActionItem) => void;
  tone?: 'primary' | 'crystal';
}

export const SplitButton: React.FC<SplitButtonProps> = ({
  label,
  onPrimaryClick,
  actions,
  onSelectAction,
  tone = 'primary',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const shellClass = tone === 'primary' ? 'prism-btn-primary' : 'prism-crystal text-slate-800 dark:text-slate-100 rounded-full';

  return (
    <div ref={containerRef} className="relative inline-block">
      <div className={`${shellClass} inline-flex items-stretch h-12 overflow-hidden`}>
        <button
          type="button"
          onClick={onPrimaryClick}
          className="px-6 text-sm font-medium whitespace-nowrap shrink-0 cursor-pointer flex items-center focus-visible:outline-none"
        >
          <span className="relative z-10">{label}</span>
        </button>
        <span
          aria-hidden="true"
          className={`w-px my-2 ${tone === 'primary' ? 'bg-white/35' : 'bg-slate-400/35'}`}
        />
        <button
          type="button"
          aria-label={`More actions for ${label}`}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
          className="px-3.5 cursor-pointer flex items-center justify-center hover:bg-white/10 transition-colors focus-visible:outline-none"
        >
          <ChevronDown
            className={`w-4 h-4 relative z-10 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="prism-slab absolute right-0 mt-2 w-60 p-1.5 z-40"
        >
          {actions.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelectAction(item);
                setOpen(false);
              }}
              className="w-full text-left px-3.5 py-2.5 rounded-2xl hover:bg-white/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.label}</div>
              {item.description && (
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export interface FloatingActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ReactNode;
  tone?: 'primary' | 'cobalt' | 'crystal';
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  label,
  icon,
  tone = 'primary',
  className = '',
  ...rest
}) => {
  const toneClass =
    tone === 'primary'
      ? 'prism-btn-primary'
      : tone === 'cobalt'
        ? 'prism-btn-cobalt'
        : 'prism-crystal rounded-full text-slate-900 dark:text-white';

  return (
    <button
      type="button"
      aria-label={rest['aria-label'] || label || 'Quick create action'}
      className={`${toneClass} inline-flex items-center justify-center gap-2 ${
        label ? 'h-14 px-6' : 'w-14 h-14'
      } cursor-pointer font-medium text-sm whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${className}`}
      {...rest}
    >
      <span className="relative z-10">{icon ?? <Plus className="w-5 h-5 stroke-[2.2]" />}</span>
      {label && <span className="relative z-10">{label}</span>}
    </button>
  );
};
