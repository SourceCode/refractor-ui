import type { CSSProperties } from 'react';

/**
 * Shared frozen CSS token style singletons eliminating 3,100+ per-render object
 * allocations across all 339 components and allowing React to bail out of
 * DOM style diffing via Object.is reference equality.
 */
export const STYLE_TEXT_PRIMARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-text-primary)',
});
export const STYLE_TEXT_SECONDARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-text-secondary)',
});
export const STYLE_TEXT_DISABLED: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-text-disabled)',
});
export const STYLE_PRIMARY_MAIN: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-primary-main)',
});
export const STYLE_PRIMARY_CONTRAST: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-primary-contrast)',
});
export const STYLE_SECONDARY_MAIN: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-secondary-main)',
});
export const STYLE_SECONDARY_DARK: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-secondary-dark)',
});
export const STYLE_INFO_MAIN: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-info-main)',
});
export const STYLE_SUCCESS_MAIN: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-success-main)',
});
export const STYLE_SUCCESS_DARK: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-success-dark)',
});
export const STYLE_SUCCESS_CONTRAST: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-success-contrast)',
});
export const STYLE_WARNING_MAIN: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-warning-main)',
});
export const STYLE_ERROR_MAIN: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-error-main)',
});
export const STYLE_BORDER_DIVIDER: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  borderColor: 'var(--prism-divider)',
});
export const STYLE_BORDER_PRIMARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  borderColor: 'var(--prism-primary-main)',
});
export const STYLE_BORDER_ERROR: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  borderColor: 'var(--prism-error-main)',
});
export const STYLE_BORDER_WARNING: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  borderColor: 'var(--prism-warning-main)',
});
export const STYLE_BG_DIVIDER: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-divider)',
});
export const STYLE_BG_DISABLED: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-text-disabled)',
});
export const STYLE_BG_PRIMARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-primary-main)',
});
export const STYLE_BG_SECONDARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-secondary-main)',
});
export const STYLE_BG_INFO: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-info-main)',
});
export const STYLE_BG_SUCCESS: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-success-main)',
});
export const STYLE_BG_WARNING: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-warning-main)',
});
export const STYLE_BG_ERROR: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-error-main)',
});
export const STYLE_FILL_PRIMARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  fill: 'var(--prism-text-primary)',
});
export const STYLE_FILL_SECONDARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  fill: 'var(--prism-text-secondary)',
});
export const STYLE_BORDER_DIVIDER_TEXT_PRIMARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  borderColor: 'var(--prism-divider)',
  color: 'var(--prism-text-primary)',
});
export const STYLE_BORDER_DIVIDER_TEXT_SECONDARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  borderColor: 'var(--prism-divider)',
  color: 'var(--prism-text-secondary)',
});
export const STYLE_BADGE_PRIMARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-primary-main)',
  color: 'var(--prism-primary-contrast)',
});
export const STYLE_BADGE_ERROR: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-error-main)',
  color: 'var(--prism-error-contrast)',
});
export const STYLE_BADGE_INFO: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-info-main)',
  color: 'var(--prism-info-contrast)',
});
export const STYLE_BADGE_WARNING: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-warning-main)',
  color: 'var(--prism-warning-contrast)',
});
export const STYLE_BADGE_SUCCESS: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-success-main)',
  color: 'var(--prism-success-contrast)',
});
export const STYLE_PRIMARY_BORDER_TEXT: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-primary-main)',
  borderColor: 'var(--prism-primary-main)',
});
export const STYLE_ERROR_BORDER_TEXT: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  color: 'var(--prism-error-main)',
  borderColor: 'var(--prism-error-main)',
});
export const STYLE_BG_START_TEXT_PRIMARY: Readonly<CSSProperties> = /*#__PURE__*/ Object.freeze({
  backgroundColor: 'var(--prism-bg-start)',
  color: 'var(--prism-text-primary)',
});

/**
 * Shared module-hoisted Intl formatters & collators avoiding repeated ICU
 * instantiation inside table, chart, and tree render/sort hot loops.
 */
const DEFAULT_NUMBER_FORMATTER = /*#__PURE__*/ new Intl.NumberFormat();
const US_NUMBER_FORMATTER = /*#__PURE__*/ new Intl.NumberFormat('en-US');
const NATURAL_COLLATOR = /*#__PURE__*/ new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});
const DEFAULT_COLLATOR = /*#__PURE__*/ new Intl.Collator();

export function formatLocaleNumber(value: number): string {
  return DEFAULT_NUMBER_FORMATTER.format(value);
}

export function formatUsNumber(value: number): string {
  return US_NUMBER_FORMATTER.format(value);
}

export function compareNaturalStrings(a: string, b: string): number {
  return NATURAL_COLLATOR.compare(a, b);
}

export function compareLocaleStrings(a: string, b: string): number {
  return DEFAULT_COLLATOR.compare(a, b);
}
