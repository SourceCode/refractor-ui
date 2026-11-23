'use client';

import { memo, useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { PrimaryButton } from '../PrimaryButton/PrimaryButton';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface ModalDialogProps extends BaseProps<HTMLDivElement> {
  /** Controls visibility of the modal dialog. */
  open: boolean;
  /** Primary heading displayed at the top of the modal slab. */
  title: string;
  /** Optional secondary description shown below the title. */
  description?: string;
  /** Modal body content. */
  children: ReactNode;
  /** Label for the optional confirmation primary action button. */
  confirmLabel?: string;
  /** When provided, renders the primary confirm CTA button and invokes it before closing. */
  onConfirm?: () => void;
  /** Callback invoked when the modal is dismissed via Escape, backdrop, Cancel, or Close icon. */
  onClose: () => void;
}

function ModalDialogInner({
  open,
  title,
  description,
  children,
  confirmLabel = 'Save changes',
  onConfirm,
  onClose,
  onClick,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ModalDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const override = useComponentOverride('ModalDialog');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const merged = mergeProps({
    themeTarget: themeProps('modal-dialog', { open }),
    baseClassName:
      'fixed inset-0 z-50 flex items-center justify-center p-4 prism-backdrop-scrim',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={composeEventHandlers(onClick, () => onClose())}
      {...rest}
      {...merged}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="prism-slab w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id={titleId} className="text-lg font-semibold text-slate-900 dark:text-white">
              {title}
            </h3>
            {description ? (
              <p
                id={descriptionId}
                className="text-xs text-slate-500 dark:text-slate-400 mt-1"
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label="Close modal"
            onClick={onClose}
            className="prism-focus-ring rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="text-sm text-slate-700 dark:text-slate-200">{children}</div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="prism-btn-secondary prism-focus-ring inline-flex items-center justify-center gap-2 font-medium tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer h-9 px-5 text-xs"
          >
            <span className="relative z-10">Cancel</span>
          </button>
          {onConfirm ? (
            <PrimaryButton
              size="sm"
              onClick={() => {
                onConfirm();
                onClose();
              }}
            >
              {confirmLabel}
            </PrimaryButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const ModalDialog = memo(ModalDialogInner);
ModalDialog.displayName = 'ModalDialog';
