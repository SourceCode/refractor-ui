'use client';

import { memo, Fragment, useMemo } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type KeycapSize = 'sm' | 'md' | 'lg';

export interface KeycapBadgeProps extends BaseProps<HTMLSpanElement> {
  /** Ordered keycap labels (blank/whitespace-only entries are filtered out gracefully). */
  keys: string[];
  /** Visual size scale for keycaps and joiners ('sm' | 'md' | 'lg', defaults to 'md'). */
  size?: KeycapSize;
  /** Separator string rendered between adjacent keycaps (defaults to '+'; pass '' to omit). */
  joiner?: string;
  /** Optional shortcut description prepended to aria-label and applied as native title tooltip. */
  description?: string;
}

interface KeycapEntry {
  id: string;
  label: string;
}

interface KeycapSizeClasses {
  containerGap: string;
  keycap: string;
  joiner: string;
}

function getSizeClasses(size: KeycapSize): KeycapSizeClasses {
  switch (size) {
    case 'sm':
      return {
        containerGap: 'gap-1',
        keycap: 'min-w-[20px] h-5 px-1.5 rounded-md text-[10px] leading-none',
        joiner: 'text-[10px]',
      };
    case 'lg':
      return {
        containerGap: 'gap-2',
        keycap: 'min-w-[32px] h-8 px-2.5 rounded-xl text-sm leading-none',
        joiner: 'text-xs',
      };
    case 'md':
    default:
      return {
        containerGap: 'gap-1.5',
        keycap: 'min-w-[24px] h-6 px-2 rounded-lg text-xs leading-none',
        joiner: 'text-[11px]',
      };
  }
}

function KeycapBadgeInner({
  keys,
  size = 'md',
  joiner = '+',
  description,
  'aria-label': ariaLabelProp,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: KeycapBadgeProps) {
  const override = useComponentOverride('KeycapBadge');

  const keycapEntries = useMemo<KeycapEntry[]>(() => {
    const counts = new Map<string, number>();
    const entries: KeycapEntry[] = [];
    for (const rawKey of keys) {
      const trimmed = rawKey.trim();
      if (trimmed.length === 0) continue;
      const occurrence = (counts.get(trimmed) ?? 0) + 1;
      counts.set(trimmed, occurrence);
      entries.push({
        id: `${trimmed}::${occurrence}`,
        label: trimmed,
      });
    }
    return entries;
  }, [keys]);

  const isEmpty = keycapEntries.length === 0;
  const trimmedDescription = description?.trim() ?? '';
  const hasJoiner = joiner.trim().length > 0;
  const sizeClasses = getSizeClasses(size);

  const computedAriaLabel = isEmpty
    ? trimmedDescription || undefined
    : trimmedDescription
      ? `${trimmedDescription}: ${keycapEntries.map((entry) => entry.label).join(' + ')}`
      : keycapEntries.map((entry) => entry.label).join(' + ');

  const keyPartClass = stableClassName('keycap-badge', 'key');
  const joinerPartClass = stableClassName('keycap-badge', 'joiner');

  const merged = mergeProps({
    themeTarget: themeProps('keycap-badge', {
      size,
      empty: isEmpty,
    }),
    baseClassName: cx(
      'inline-flex items-center align-middle',
      sizeClasses.containerGap
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span
      ref={ref}
      aria-label={ariaLabelProp ?? computedAriaLabel}
      title={trimmedDescription || undefined}
      {...rest}
      {...merged}
    >
      {keycapEntries.map((entry, idx) => (
        <Fragment key={entry.id}>
          {idx > 0 && hasJoiner ? (
            <span
              aria-hidden="true"
              className={cx(
                joinerPartClass,
                sizeClasses.joiner,
                'font-mono font-medium select-none leading-none'
              )}
              style={STYLE_TEXT_SECONDARY}
            >
              {joiner}
            </span>
          ) : null}
          <kbd
            className={cx(
              keyPartClass,
              'prism-crystal border-b-2 border-[var(--prism-border-strong)] inline-flex items-center justify-center font-mono font-semibold tabular-nums select-none whitespace-nowrap',
              sizeClasses.keycap
            )}
            style={{
              color: 'var(--prism-text-primary)',
              borderBottomColor:
                'var(--prism-border-strong, var(--prism-well-border))',
            }}
          >
            {entry.label}
          </kbd>
        </Fragment>
      ))}
    </span>
  );
}

export const KeycapBadge = memo(KeycapBadgeInner);
KeycapBadge.displayName = 'KeycapBadge';
