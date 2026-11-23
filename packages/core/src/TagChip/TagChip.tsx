'use client';

import { memo } from 'react';

import { X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export interface TagChipProps extends BaseProps<HTMLSpanElement> {
  /** Text label rendered inside the filter capsule. */
  label: string;
  /** Switches the chip surface to emerald active glass. */
  selected?: boolean;
  /** Optional click handler making the chip label an interactive toggle button. */
  onSelect?: () => void;
  /** Optional click handler displaying a trailing dismiss button. */
  onDismiss?: () => void;
}

function TagChipInner({
  label,
  selected = false,
  onSelect,
  onDismiss,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TagChipProps) {
  const override = useComponentOverride('TagChip');

  const merged = mergeProps({
    themeTarget: themeProps('tag-chip', {
      selected,
      selectable: Boolean(onSelect),
      dismissible: Boolean(onDismiss),
    }),
    baseClassName: `inline-flex items-center gap-1.5 h-8 pl-3.5 ${
      onDismiss ? 'pr-2' : 'pr-3.5'
    } rounded-full text-xs font-medium whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] ${
      selected
        ? 'prism-emerald text-white'
        : 'prism-crystal text-slate-800 dark:text-slate-100'
    }`,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span ref={ref} {...rest} {...merged}>
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="prism-focus-ring rounded-full cursor-pointer"
        >
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      {onDismiss ? (
        <button
          type="button"
          aria-label={`Remove ${label} filter`}
          onClick={onDismiss}
          className="prism-focus-ring w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
        >
          <X aria-hidden="true" className="w-3 h-3" />
        </button>
      ) : null}
    </span>
  );
}

export const TagChip = memo(TagChipInner);
TagChip.displayName = 'TagChip';
