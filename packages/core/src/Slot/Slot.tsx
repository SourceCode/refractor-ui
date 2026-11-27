'use client';

import { cloneElement, isValidElement, type ReactElement, type ReactNode, type Ref } from 'react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { memoWithDisplayName } from '../utils/memo';
import { mergeProps } from '../utils/mergeProps';

export interface SlotProps extends BaseProps<HTMLElement> {
  /** Single React element onto which props, refs, className, style, and xstyle are merged. */
  children?: ReactNode;
}

interface SlottedElementProps
  extends Record<
    string,
    string | number | boolean | object | ((...args: never[]) => void) | undefined | null
  > {
  className?: string;
  style?: React.CSSProperties;
  ref?: Ref<HTMLElement>;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

const FALLBACK_CLASS = /*#__PURE__*/ stableClassName('slot');

function SlotInner({
  children,
  className,
  style,
  xstyle,
  onClick,
  ref,
  ...rest
}: SlotProps) {
  const childEl = isValidElement<SlottedElementProps>(children)
    ? (children as ReactElement<SlottedElementProps>)
    : null;
  const mergedRef = useMergedRefs<HTMLElement>(ref, childEl?.props.ref);

  if (!childEl) {
    const fallbackMerged = mergeProps({
      baseClassName: FALLBACK_CLASS,
      userClassName: className,
      xstyle,
      userStyle: style,
    });
    return (
      <span ref={ref} onClick={onClick} {...rest} {...fallbackMerged}>
        {children}
      </span>
    );
  }

  const merged = mergeProps({
    baseClassName: className,
    userClassName: childEl.props.className,
    xstyle,
    baseStyle: style as OpticalStyleTokens | undefined,
    userStyle: childEl.props.style,
  });

  const composedClick =
    onClick || childEl.props.onClick
      ? composeEventHandlers(onClick, childEl.props.onClick)
      : undefined;

  return cloneElement(childEl, {
    ...rest,
    ...childEl.props,
    ...merged,
    ...(composedClick ? { onClick: composedClick } : {}),
    ref: mergedRef,
  });
}

export const Slot = /*#__PURE__*/ memoWithDisplayName(SlotInner, 'Slot');
