import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from './buttons';

/* 1. Modal Dialog */
export interface ModalDialogProps {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm?: () => void;
  onClose: () => void;
}

export const ModalDialog: React.FC<ModalDialogProps> = ({
  open,
  title,
  description,
  children,
  confirmLabel = 'Save changes',
  onConfirm,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 backdrop-blur-xs"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="prism-slab w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            )}
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="text-sm text-slate-700 dark:text-slate-200">{children}</div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <SecondaryButton size="sm" onClick={onClose}>
            Cancel
          </SecondaryButton>
          {onConfirm && (
            <PrimaryButton
              size="sm"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmLabel}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
};

/* 2. Popover / Contextual Card (Exact match to "Find files... / Add collaborator / Pro plan" in specimen) */
export interface ContextualPopoverProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  onClose?: () => void;
  inlineSpecimen?: boolean;
  triggerLabel?: string;
}

export const ContextualPopover: React.FC<ContextualPopoverProps> = ({
  title = 'Find files...',
  subtitle = 'Add collaborator',
  ctaLabel = 'Pro plan',
  onCtaClick,
  onClose,
  inlineSpecimen = false,
  triggerLabel = 'Open Contextual Card',
}) => {
  const [open, setOpen] = useState(inlineSpecimen);

  const cardBody = (
    <div className="prism-slab w-full max-w-[280px] p-5 space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[16px] font-medium text-slate-900 dark:text-white tracking-[-0.01em]">
            {title}
          </span>
          <button
            type="button"
            aria-label="Close contextual card"
            onClick={() => {
              if (!inlineSpecimen) setOpen(false);
              onClose?.();
            }}
            className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-0.5 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>
        <button
          type="button"
          onClick={onCtaClick}
          className="text-[14px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer block text-left"
        >
          {subtitle}
        </button>
      </div>

      <button
        type="button"
        onClick={onCtaClick}
        className="prism-btn-cobalt w-full h-11 rounded-full text-[15px] font-medium flex items-center justify-center cursor-pointer"
      >
        <span className="relative z-10">{ctaLabel}</span>
      </button>
    </div>
  );

  if (inlineSpecimen) {
    return cardBody;
  }

  return (
    <div className="relative inline-block">
      <SecondaryButton size="sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {triggerLabel}
      </SecondaryButton>
      {open && <div className="mt-2.5 z-30">{cardBody}</div>}
    </div>
  );
};

/* 3. Tooltip */
export interface TooltipProps {
  content: string;
  placement?: 'top' | 'bottom';
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, placement = 'top', children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`prism-crystal pointer-events-none absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-slate-900 dark:text-white whitespace-nowrap z-40 ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
};

/* 4. Context Menu / Dropdown Menu */
export interface ContextMenuAction {
  id: string;
  label: string;
  shortcut?: string;
  destructive?: boolean;
}

export interface ContextMenuDropdownProps {
  actions: ContextMenuAction[];
  onSelect: (action: ContextMenuAction) => void;
}

export const ContextMenuDropdown: React.FC<ContextMenuDropdownProps> = ({ actions, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={wrapperRef} className="space-y-2.5 w-full">
      <div className="flex items-center gap-3">
        <SecondaryButton
          size="sm"
          aria-expanded={open}
          onClick={() => {
            setCoords(null);
            setOpen((o) => !o);
          }}
        >
          Actions Menu
        </SecondaryButton>
        <div
          onContextMenu={(e) => {
            e.preventDefault();
            const rect = wrapperRef.current?.getBoundingClientRect();
            setCoords({
              x: rect ? e.clientX - rect.left : 0,
              y: rect ? e.clientY - rect.top : 40,
            });
            setOpen(true);
          }}
          className="prism-well flex-1 h-10 rounded-full px-4 flex items-center text-xs text-slate-600 dark:text-slate-300 select-none"
        >
          Right-click anywhere inside this crystal zone
        </div>
      </div>

      {open && (
        <div
          role="menu"
          style={coords ? { marginLeft: Math.min(coords.x, 160) } : undefined}
          className="prism-slab w-56 p-1.5 z-30"
        >
          {actions.map((act) => (
            <button
              key={act.id}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(act);
                setOpen(false);
              }}
              className={`w-full px-3.5 py-2 rounded-xl flex items-center justify-between text-xs font-medium cursor-pointer transition-colors ${
                act.destructive
                  ? 'text-red-600 dark:text-red-400 hover:bg-red-500/10'
                  : 'text-slate-800 dark:text-slate-100 hover:bg-white/60 dark:hover:bg-white/10'
              }`}
            >
              <span>{act.label}</span>
              {act.shortcut && (
                <span className="font-mono text-[11px] opacity-65">{act.shortcut}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* 5. Slide-Over Panel / Bottom Sheet */
export interface SlideOverSheetProps {
  open: boolean;
  mode?: 'right' | 'bottom';
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}

export const SlideOverSheet: React.FC<SlideOverSheetProps> = ({
  open,
  mode = 'right',
  title,
  subtitle,
  children,
  onClose,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-900/35 backdrop-blur-xs flex"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`prism-slab p-6 flex flex-col justify-between ${
          mode === 'right'
            ? 'ml-auto h-full w-full max-w-md rounded-l-[28px] rounded-r-none'
            : 'mt-auto w-full max-h-[75vh] rounded-t-[28px] rounded-b-none'
        }`}
      >
        <div className="space-y-4 overflow-y-auto">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              aria-label="Close panel"
              onClick={onClose}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-200">{children}</div>
        </div>

        <div className="pt-4 border-t border-slate-300/45 dark:border-slate-700/50 flex justify-end gap-2">
          <SecondaryButton size="sm" onClick={onClose}>
            Done
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
};
