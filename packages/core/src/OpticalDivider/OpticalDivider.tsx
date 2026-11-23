'use client';

import { memo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type OpticalDividerOrientation = 'horizontal' | 'vertical';
export type OpticalDividerVariant = 'seam' | 'specular' | 'dashed';
export type OpticalDividerLabelAlign = 'start' | 'center' | 'end';

export interface OpticalDividerProps extends BaseProps<HTMLDivElement> {
  /** Axis along which the optical glass seam spans (`'horizontal'` | `'vertical'`, defaults to `'horizontal'`). */
  orientation?: OpticalDividerOrientation;
  /** Visual rail finish (`'seam'` | `'specular'` | `'dashed'`, defaults to `'specular'`). */
  variant?: OpticalDividerVariant;
  /** Optional text pill or metadata chip rendered inline along the divider seam. */
  label?: ReactNode;
  /** Optional icon rendered beside `label` or standalone inside the optical seam medallion. */
  icon?: ReactNode;
  /** Alignment of the label/icon medallion along the rail axis (`'start'` | `'center'` | `'end'`, defaults to `'center'`). */
  labelAlign?: OpticalDividerLabelAlign;
  /** When `true`, marks the divider purely decorative (`role="none"` and `aria-hidden="true"` instead of `role="separator"`). */
  decorative?: boolean;
}

type RailSegment = 'full' | 'leading' | 'trailing';

function hasRenderableContent(node: ReactNode): boolean {
  if (node === null || node === undefined || typeof node === 'boolean') {
    return false;
  }
  if (typeof node === 'string') {
    return node.trim().length > 0;
  }
  return true;
}

function getRailStyle(
  variant: OpticalDividerVariant,
  orientation: OpticalDividerOrientation,
  segment: RailSegment
): CSSProperties {
  const angle = orientation === 'vertical' ? '180deg' : '90deg';

  switch (variant) {
    case 'seam':
      return {
        backgroundColor: 'var(--prism-divider)',
      };
    case 'dashed':
      return {
        backgroundImage: `repeating-linear-gradient(${angle}, var(--prism-divider) 0px, var(--prism-divider) 5px, transparent 5px, transparent 9px)`,
      };
    case 'specular':
      if (segment === 'leading') {
        return {
          backgroundImage: `linear-gradient(${angle}, transparent 0%, var(--prism-divider) 42%, color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider)) 84%, color-mix(in srgb, var(--prism-secondary-main) 34%, var(--prism-divider)) 100%)`,
        };
      }
      if (segment === 'trailing') {
        return {
          backgroundImage: `linear-gradient(${angle}, color-mix(in srgb, var(--prism-secondary-main) 34%, var(--prism-divider)) 0%, color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider)) 16%, var(--prism-divider) 58%, transparent 100%)`,
        };
      }
      return {
        backgroundImage: `linear-gradient(${angle}, transparent 0%, var(--prism-divider) 18%, color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider)) 46%, color-mix(in srgb, var(--prism-secondary-main) 40%, var(--prism-divider)) 56%, var(--prism-divider) 82%, transparent 100%)`,
      };
  }
}

function getSplitRailClass(
  orientation: OpticalDividerOrientation,
  labelAlign: OpticalDividerLabelAlign,
  segment: 'leading' | 'trailing'
): string {
  const isShort =
    (segment === 'leading' && labelAlign === 'start') ||
    (segment === 'trailing' && labelAlign === 'end');

  if (orientation === 'vertical') {
    return isShort ? 'w-px h-4 shrink-0' : 'w-px flex-1 min-h-[1rem]';
  }

  return isShort ? 'h-px w-6 shrink-0' : 'h-px flex-1 min-w-[1rem]';
}

function OpticalDividerInner({
  orientation = 'horizontal',
  variant = 'specular',
  label,
  icon,
  labelAlign = 'center',
  decorative = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: OpticalDividerProps) {
  const override = useComponentOverride('OpticalDivider');

  const isVertical = orientation === 'vertical';
  const hasLabel = hasRenderableContent(label);
  const hasIcon = hasRenderableContent(icon);
  const hasMedallion = hasLabel || hasIcon;
  const renderedLabel = typeof label === 'string' ? label.trim() : label;

  const railClass = stableClassName('optical-divider', 'rail');
  const medallionClass = stableClassName('optical-divider', 'medallion');
  const iconClass = stableClassName('optical-divider', 'icon');
  const labelClass = stableClassName('optical-divider', 'label');

  const merged = mergeProps({
    themeTarget: themeProps('optical-divider', {
      orientation,
      variant,
      labelAlign,
      hasLabel,
      hasIcon,
      decorative,
    }),
    baseClassName: isVertical
      ? 'inline-flex flex-col items-center self-stretch min-h-[2rem] min-w-0 max-w-full gap-2'
      : 'w-full max-w-full min-w-0 flex items-center gap-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      aria-hidden={decorative ? true : undefined}
      {...rest}
      {...merged}
    >
      {hasMedallion ? (
        <>
          <span
            aria-hidden="true"
            data-rail="leading"
            className={cx(railClass, getSplitRailClass(orientation, labelAlign, 'leading'))}
            style={getRailStyle(variant, orientation, 'leading')}
          />

          <div
            className={cx(
              medallionClass,
              'prism-crystal rounded-full inline-flex items-center justify-center min-w-0 max-w-full',
              hasLabel ? 'px-3 py-1 gap-1.5' : 'w-7 h-7 shrink-0'
            )}
          >
            {hasIcon ? (
              <span
                aria-hidden="true"
                className={cx(iconClass, 'inline-flex items-center justify-center shrink-0')}
                style={{
                  color:
                    variant === 'specular'
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                }}
              >
                {icon}
              </span>
            ) : null}

            {hasLabel ? (
              <span
                className={cx(
                  labelClass,
                  'text-xs font-medium tracking-wide leading-tight truncate min-w-0'
                )}
                style={STYLE_TEXT_SECONDARY}
              >
                {renderedLabel}
              </span>
            ) : null}
          </div>

          <span
            aria-hidden="true"
            data-rail="trailing"
            className={cx(railClass, getSplitRailClass(orientation, labelAlign, 'trailing'))}
            style={getRailStyle(variant, orientation, 'trailing')}
          />
        </>
      ) : (
        <span
          aria-hidden="true"
          data-rail="full"
          className={cx(railClass, isVertical ? 'w-px flex-1 min-h-[2rem]' : 'h-px flex-1 min-w-0 w-full')}
          style={getRailStyle(variant, orientation, 'full')}
        />
      )}
    </div>
  );
}

export const OpticalDivider = memo(OpticalDividerInner);
OpticalDivider.displayName = 'OpticalDivider';
