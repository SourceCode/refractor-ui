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

function fastTrim(value: string): string {
  const len = value.length;
  if (len === 0) return '';
  if (value.charCodeAt(0) > 32 && value.charCodeAt(len - 1) > 32) {
    return value;
  }
  return value.trim();
}

function joinClass4(
  a?: string,
  b?: string,
  c?: string,
  d?: string
): string {
  let out = '';
  if (a) {
    const t = fastTrim(a);
    if (t) out = t;
  }
  if (b) {
    const t = fastTrim(b);
    if (t) out = out ? `${out} ${t}` : t;
  }
  if (c) {
    const t = fastTrim(c);
    if (t) out = out ? `${out} ${t}` : t;
  }
  if (d) {
    const t = fastTrim(d);
    if (t) out = out ? `${out} ${t}` : t;
  }
  return out;
}

/**
 * Joins CSS class tokens while dropping falsy entries in a single pass
 * without allocating an intermediate array or trimming clean strings.
 */
export function cx(...tokens: Array<string | false | null | undefined>): string {
  let out = '';
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const trimmed = fastTrim(token);
    if (!trimmed) continue;
    out = out ? `${out} ${trimmed}` : trimmed;
  }
  return out;
}

/**
 * Merges theme targets, base optical glass classes, theme component overrides,
 * `xstyle`, and consumer `className`/`style` in a single allocation-minimized pass.
 * Avoids rest-array allocation in class merging and preserves referential identity
 * when at most one style object is provided.
 */
export function mergeProps(input: MergePropsInput): MergedStyleProps {
  const {
    themeTarget,
    baseClassName,
    overrideClassName,
    userClassName,
    baseStyle,
    overrideStyle,
    xstyle,
    userStyle,
  } = input;

  const className = joinClass4(
    themeTarget?.className,
    baseClassName,
    overrideClassName,
    userClassName
  );

  const result: MergedStyleProps = { className };

  if (themeTarget) {
    for (const key in themeTarget) {
      if (
        key.charCodeAt(0) === 100 && // 'd'
        key.startsWith('data-') &&
        Object.prototype.hasOwnProperty.call(themeTarget, key)
      ) {
        const value = themeTarget[key as `data-${string}`];
        if (typeof value === 'string') {
          result[key as `data-${string}`] = value;
        }
      }
    }
  }

  let styleCount = 0;
  let singleStyle: OpticalStyleTokens | undefined;
  if (baseStyle) {
    styleCount += 1;
    singleStyle = baseStyle;
  }
  if (overrideStyle) {
    styleCount += 1;
    singleStyle = overrideStyle;
  }
  if (xstyle) {
    styleCount += 1;
    singleStyle = xstyle;
  }
  if (userStyle) {
    styleCount += 1;
    singleStyle = userStyle as OpticalStyleTokens;
  }

  if (styleCount === 1) {
    result.style = singleStyle;
  } else if (styleCount > 1) {
    result.style = {
      ...baseStyle,
      ...overrideStyle,
      ...xstyle,
      ...userStyle,
    };
  }

  return result;
}
