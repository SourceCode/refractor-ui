'use client';

import { useId, useState, type ReactNode } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { mergeProps } from '../utils/mergeProps';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type TooltipPlacement = 'top' | 'bottom';

export interface TooltipProps extends BaseProps<HTMLSpanElement> {
  /** Text displayed inside the optical crystal tooltip pill. */
  content: string;
  /** Vertical placement relative to the trigger element. */
  placement?: TooltipPlacement;
  /** Trigger element(s) wrapped by the tooltip container. */
  children: ReactNode;
}

function TooltipInner({
  content,
  placement = 'top',
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const tooltipId = useId();
  const override = useComponentOverride('Tooltip');
  const showTooltip = visible && content.length > 0;

  const merged = mergeProps({
    themeTarget: themeProps('tooltip', { open: showTooltip, placement }),
    baseClassName: 'relative inline-flex items-center',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span
      ref={ref}
      aria-describedby={showTooltip ? tooltipId : undefined}
      onMouseEnter={composeEventHandlers(onMouseEnter, () => setVisible(true))}
      onMouseLeave={composeEventHandlers(onMouseLeave, () => setVisible(false))}
      onFocus={composeEventHandlers(onFocus, () => setVisible(true))}
      onBlur={composeEventHandlers(onBlur, () => setVisible(false))}
      onKeyDown={composeEventHandlers(onKeyDown, (e) => {
        if (e.key === 'Escape') {
          setVisible(false);
        }
      })}
      {...rest}
      {...merged}
    >
      {children}
      {showTooltip ? (
        <span
          id={tooltipId}
          role="tooltip"
          className={`prism-crystal pointer-events-none absolute left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-medium text-slate-900 dark:text-white whitespace-nowrap z-40 ${
            placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

export const Tooltip = /*#__PURE__*/ memoWithDisplayName(TooltipInner, 'Tooltip');
