import type React from 'react';
import type { OpticalStyleTokens } from '../BaseProps';
import type { ThemeTargetProps } from './themeProps';

export interface MergePropsInput {
  themeTarget?: ThemeTargetProps;
  baseClassName?: string;
  overrideClassName?: string;
  userClassName?: string;
  baseStyle?: OpticalStyleTokens;
  overrideStyle?: OpticalStyleTokens;
  xstyle?: OpticalStyleTokens;
  userStyle?: React.CSSProperties;
}

export type MergedStyleProps = {
  className: string;
  style?: OpticalStyleTokens;
} & Record<`data-${string}`, string | undefined>;

/**
 * Joins CSS class tokens while dropping falsy or duplicate entries.
 */
export function cx(...tokens: Array<string | false | null | undefined>): string {
  const out: string[] = [];
  for (const token of tokens) {
    if (!token) continue;
    const trimmed = token.trim();
    if (trimmed) out.push(trimmed);
  }
  return out.join(' ');
}

/**
 * Astryx-aligned prop merger ensuring theme targets, base optical glass classes,
 * theme component overrides, `xstyle`, and consumer `className`/`style` compose cleanly
 * without clobbering each other.
 */
export function mergeProps(input: MergePropsInput): MergedStyleProps {
  const dataAttrs: Record<`data-${string}`, string | undefined> = {};
  if (input.themeTarget) {
    for (const [key, value] of Object.entries(input.themeTarget)) {
      if (key.startsWith('data-') && typeof value === 'string') {
        dataAttrs[key as `data-${string}`] = value;
      }
    }
  }

  const className = cx(
    input.themeTarget?.className,
    input.baseClassName,
    input.overrideClassName,
    input.userClassName
  );

  const hasAnyStyle = Boolean(
    input.baseStyle || input.overrideStyle || input.xstyle || input.userStyle
  );

  const mergedStyle: OpticalStyleTokens | undefined = hasAnyStyle
    ? {
        ...input.baseStyle,
        ...input.overrideStyle,
        ...input.xstyle,
        ...input.userStyle,
      }
    : undefined;

  return {
    ...dataAttrs,
    className,
    ...(mergedStyle ? { style: mergedStyle } : {}),
  };
}
