'use client';

import { useId, useMemo, useState } from 'react';
import { AlertCircle, Check, CheckCircle2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber, isSafeObjectKey, sanitizeUrl } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, formatUsNumber } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type VariantKind = 'color' | 'size' | 'material';

export type VariantSwatchTone =
  | 'primary'
  | 'secondary'
  | 'emerald'
  | 'cobalt'
  | 'obsidian'
  | 'alabaster';

export interface VariantSwatchOption {
  /** Unique option identifier within its variant group. */
  id: string;
  /** Human-readable option label (e.g., 'Solar Amber', 'Large', 'Brushed Titanium'). */
  label: string;
  /** Visual rendering kind for this option ('color' | 'size' | 'material'). */
  kind: VariantKind;
  /** Semantic optical token tone used for color swatch orbs (zero raw hex literals). */
  swatchTone?: VariantSwatchTone;
  /** Whether this variant option is currently in stock and selectable (defaults to true). */
  available?: boolean;
  /** Optional price delta added to basePrice when this option is selected. */
  priceDelta?: number;
  /** Optional thumbnail preview image URL validated via sanitizeUrl(src, true). */
  previewImageSrc?: string;
}

export interface VariantGroup {
  /** Unique group identifier (e.g., 'color', 'size', 'material'). */
  id: string;
  /** Display heading for the attribute group (e.g., 'Finish', 'Size', 'Material'). */
  label: string;
  /** Ordered selectable variant options within this group. */
  options: ReadonlyArray<VariantSwatchOption>;
}

type ProductVariantSelectorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface ProductVariantSelectorProps extends ProductVariantSelectorBaseProps {
  /** Ordered variant attribute groups rendered inside the optical slab selector. */
  groups: ReadonlyArray<VariantGroup>;
  /** Controlled mapping of group ID to selected option ID. */
  selected?: Readonly<Record<string, string>>;
  /** Initial selection mapping for uncontrolled mode (unspecified groups default to first available option). */
  defaultSelected?: Readonly<Record<string, string>>;
  /** Callback fired with a clean prototype-safe selection record whenever a variant changes. */
  onChange?: (next: Record<string, string>) => void;
  /** Base unit price before applying selected option priceDelta adjustments (defaults to 129). */
  basePrice?: number;
  /** Currency prefix symbol for price displays (defaults to '$'). */
  currencySymbol?: string;
}

const MAX_VARIANT_PRICE = 1_000_000_000;

function getSwatchToken(tone: VariantSwatchTone = 'primary'): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'cobalt':
      return 'var(--prism-info-main)';
    case 'obsidian':
      return 'var(--prism-text-primary)';
    case 'alabaster':
      return 'var(--prism-bg-start)';
  }
}

function formatCurrencyAmount(value: number, currencySymbol: string): string {
  const clamped = clampNumber(value, 0, MAX_VARIANT_PRICE, 0);
  const rounded = Math.round(clamped * 100) / 100;
  const formatted = Number.isInteger(rounded)
    ? formatUsNumber(rounded)
    : rounded.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${currencySymbol}${formatted}`;
}

function formatPriceDelta(
  delta: number | undefined,
  currencySymbol: string
): string | null {
  if (delta === undefined || !Number.isFinite(delta) || delta === 0) {
    return null;
  }
  const sign = delta > 0 ? '+' : '-';
  return `${sign}${formatCurrencyAmount(Math.abs(delta), currencySymbol)}`;
}

function recordToSafeMap(
  record: Readonly<Record<string, string>> | undefined
): Map<string, string> {
  const map = new Map<string, string>();
  if (!record) {
    return map;
  }
  for (const [key, value] of Object.entries(record)) {
    if (isSafeObjectKey(key)) {
      map.set(key, value);
    }
  }
  return map;
}

function safeMapToRecord(map: ReadonlyMap<string, string>): Record<string, string> {
  const entries: Array<[string, string]> = [];
  for (const [key, value] of map.entries()) {
    if (isSafeObjectKey(key)) {
      entries.push([key, value]);
    }
  }
  return Object.fromEntries(entries);
}

interface ResolvedSelection {
  idMap: Map<string, string>;
  optionMap: Map<string, VariantSwatchOption>;
}

function resolveSelection(
  groups: ReadonlyArray<VariantGroup>,
  source: ReadonlyMap<string, string>
): ResolvedSelection {
  const idMap = new Map<string, string>();
  const optionMap = new Map<string, VariantSwatchOption>();
  for (const group of groups) {
    const candidateId = source.get(group.id);
    const matched =
      candidateId !== undefined
        ? group.options.find((opt) => opt.id === candidateId)
        : undefined;
    if (matched) {
      idMap.set(group.id, matched.id);
      optionMap.set(group.id, matched);
      continue;
    }
    const firstAvailable = group.options.find((opt) => opt.available !== false);
    if (firstAvailable) {
      idMap.set(group.id, firstAvailable.id);
      optionMap.set(group.id, firstAvailable);
    }
  }
  return { idMap, optionMap };
}

function ProductVariantSelectorInner({
  groups,
  selected,
  defaultSelected,
  onChange,
  basePrice = 129,
  currencySymbol = '$',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ProductVariantSelectorProps) {
  const override = useComponentOverride('ProductVariantSelector');
  const selectorId = useId();

  const [uncontrolledMap, setUncontrolledMap] = useState<Map<string, string>>(
    () => resolveSelection(groups, recordToSafeMap(defaultSelected)).idMap
  );

  const isControlled = selected !== undefined;

  const { idMap: activeSelectionMap, optionMap: selectedOptionMap } = useMemo(() => {
    const source = isControlled ? recordToSafeMap(selected) : uncontrolledMap;
    return resolveSelection(groups, source);
  }, [groups, isControlled, selected, uncontrolledMap]);

  const selectedOptions = Array.from(selectedOptionMap.values());
  const isEmpty = groups.length === 0;
  const isConfigurationAvailable =
    !isEmpty &&
    selectedOptions.length === groups.length &&
    selectedOptions.every((opt) => opt.available !== false);

  const safeBasePrice = clampNumber(basePrice, 0, MAX_VARIANT_PRICE, 0);
  let deltaTotal = 0;
  for (const option of selectedOptions) {
    if (option.priceDelta !== undefined && Number.isFinite(option.priceDelta)) {
      deltaTotal += option.priceDelta;
    }
  }
  const formattedTotalPrice = formatCurrencyAmount(
    Math.max(0, safeBasePrice + deltaTotal),
    currencySymbol
  );

  let previewImage: { src: string; alt: string } | null = null;
  for (const option of selectedOptions) {
    if (option.previewImageSrc) {
      const safeSrc = sanitizeUrl(option.previewImageSrc, true);
      if (safeSrc) {
        previewImage = { src: safeSrc, alt: option.label };
        break;
      }
    }
  }

  const selectionSummary =
    selectedOptions.length > 0
      ? selectedOptions.map((opt) => opt.label).join(' · ')
      : 'No configuration selected';

  const handleSelectOption = (groupId: string, optionId: string) => {
    const nextMap = new Map(activeSelectionMap);
    nextMap.set(groupId, optionId);
    if (!isControlled) {
      setUncontrolledMap(nextMap);
    }
    onChange?.(safeMapToRecord(nextMap));
  };

  const merged = mergeProps({
    themeTarget: themeProps('product-variant-selector', {
      available: isConfigurationAvailable,
      empty: isEmpty,
    }),
    baseClassName: 'prism-slab p-6 flex flex-col gap-5 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      {isEmpty ? (
        <div
          data-testid="variant-empty-state"
          className="prism-well rounded-2xl py-8 px-4 text-center text-sm"
          style={STYLE_TEXT_SECONDARY}
        >
          No product variants available.
        </div>
      ) : (
        <>
          <div className="prism-well rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 flex items-center gap-3.5">
              {previewImage ? (
                <div className="prism-crystal w-16 h-16 rounded-2xl overflow-hidden shrink-0">
                  <img
                    src={previewImage.src}
                    alt={`${previewImage.alt} preview`}
                    data-testid="variant-preview-image"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}

              <div className="min-w-0 flex flex-col gap-0.5">
                <span
                  data-testid="variant-total-price"
                  className="text-2xl font-bold tracking-tight tabular-nums"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {formattedTotalPrice}
                </span>
                <span
                  data-testid="variant-selection-summary"
                  className="text-xs font-medium truncate"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {selectionSummary}
                </span>
              </div>
            </div>

            <span
              role="status"
              aria-live="polite"
              data-testid="variant-availability-badge"
              data-available={isConfigurationAvailable ? 'true' : 'false'}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-tight shrink-0 ${
                isConfigurationAvailable ? 'prism-emerald' : 'prism-crystal'
              }`}
              style={
                isConfigurationAvailable
                  ? undefined
                  : STYLE_ERROR_MAIN
              }
            >
              {isConfigurationAvailable ? (
                <>
                  <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>In stock</span>
                </>
              ) : (
                <>
                  <AlertCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>Out of stock</span>
                </>
              )}
            </span>
          </div>

          <div className="flex flex-col gap-5">
            {groups.map((group) => {
              const groupHeadingId = `${selectorId}-group-${group.id}`;
              const selectedInGroup = selectedOptionMap.get(group.id);
              const selectedId = selectedInGroup?.id;

              return (
                <div
                  key={group.id}
                  data-group-id={group.id}
                  className="flex flex-col gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      id={groupHeadingId}
                      className="text-xs font-semibold uppercase tracking-wider"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {group.label}
                    </span>
                    <span
                      data-testid={`variant-group-selected-${group.id}`}
                      className="text-xs font-semibold"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {selectedInGroup ? selectedInGroup.label : 'Unavailable'}
                    </span>
                  </div>

                  <div
                    role="radiogroup"
                    aria-labelledby={groupHeadingId}
                    className="flex flex-wrap items-center gap-2.5"
                  >
                    {group.options.map((option) => {
                      const isSelected = selectedId === option.id;
                      const isUnavailable = option.available === false;
                      const deltaLabel = formatPriceDelta(
                        option.priceDelta,
                        currencySymbol
                      );

                      if (option.kind === 'color') {
                        const tone: VariantSwatchTone = option.swatchTone ?? 'primary';
                        const swatchToken = getSwatchToken(tone);
                        const checkColor =
                          tone === 'alabaster'
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-primary-contrast)';

                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={
                              isUnavailable
                                ? `${option.label} (Unavailable)`
                                : option.label
                            }
                            disabled={isUnavailable}
                            data-option-kind="color"
                            data-swatch-tone={tone}
                            data-selected={isSelected ? 'true' : undefined}
                            data-testid={`variant-option-${group.id}-${option.id}`}
                            onClick={
                              isUnavailable
                                ? undefined
                                : () => handleSelectOption(group.id, option.id)
                            }
                            className={`prism-crystal prism-focus-ring relative w-10 h-10 rounded-full inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] ${
                              isSelected
                                ? 'ring-2 ring-[var(--prism-primary-main)]'
                                : ''
                            } ${isUnavailable ? 'opacity-45 line-through' : ''}`}
                          >
                            <span
                              data-testid={`variant-swatch-orb-${group.id}-${option.id}`}
                              className="w-6 h-6 rounded-full inline-flex items-center justify-center relative overflow-hidden"
                              style={{
                                backgroundColor: swatchToken,
                                borderColor: 'var(--prism-divider)',
                                borderWidth: '1px',
                                borderStyle: 'solid',
                              }}
                            >
                              {isSelected && !isUnavailable ? (
                                <Check
                                  aria-hidden="true"
                                  className="w-3.5 h-3.5 shrink-0"
                                  style={{ color: checkColor }}
                                />
                              ) : null}
                              {isUnavailable ? (
                                <span
                                  aria-hidden="true"
                                  className="absolute w-7 h-0.5 -rotate-45"
                                  style={{
                                    backgroundColor: 'var(--prism-text-primary)',
                                  }}
                                />
                              ) : null}
                            </span>
                          </button>
                        );
                      }

                      return (
                        <button
                          key={option.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          disabled={isUnavailable}
                          data-option-kind={option.kind}
                          data-selected={isSelected ? 'true' : undefined}
                          data-testid={`variant-option-${group.id}-${option.id}`}
                          onClick={
                            isUnavailable
                              ? undefined
                              : () => handleSelectOption(group.id, option.id)
                          }
                          className={`prism-focus-ring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] ${
                            isSelected && !isUnavailable
                              ? 'prism-btn-primary'
                              : 'prism-crystal'
                          } ${isUnavailable ? 'opacity-50 line-through' : ''}`}
                          style={
                            isSelected && !isUnavailable
                              ? undefined
                              : STYLE_TEXT_PRIMARY
                          }
                        >
                          <span>{option.label}</span>
                          {deltaLabel ? (
                            <span className="tabular-nums opacity-80">
                              ({deltaLabel})
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export const ProductVariantSelector = /*#__PURE__*/ memoWithDisplayName(ProductVariantSelectorInner, 'ProductVariantSelector');
