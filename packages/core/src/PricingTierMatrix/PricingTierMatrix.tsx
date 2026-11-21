'use client';

import { useId } from 'react';
import { Check, Minus, Sparkles } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type BillingCycle = 'monthly' | 'annual';

export interface PricingFeature {
  /** Human-readable description of the capability or entitlement. */
  text: string;
  /** Indicates whether this feature is included in the pricing tier. */
  included: boolean;
}

export interface PricingTier {
  /** Unique identifier for the pricing tier. */
  id: string;
  /** Display heading for the pricing tier (e.g., 'Starter', 'Pro', 'Enterprise'). */
  name: string;
  /** Optional concise positioning copy shown beneath the tier name. */
  description?: string;
  /** Monthly billing rate per month. */
  monthlyPrice: number;
  /** Effective monthly rate when billed annually. */
  annualPrice: number;
  /** Optional currency prefix symbol (defaults to '$'). */
  currencySymbol?: string;
  /** Highlights the tier with primary optical ring, badge, and primary CTA button. */
  popular?: boolean;
  /** Optional custom badge label (defaults to 'Most Popular' when popular is true). */
  badge?: string;
  /** Optional custom call-to-action label (defaults to 'Choose <name>'). */
  ctaLabel?: string;
  /** Ordered feature checklist rows rendered inside the tier card. */
  features: ReadonlyArray<PricingFeature>;
}

export interface PricingTierMatrixProps extends BaseProps<HTMLDivElement> {
  /** Ordered list of pricing tiers displayed across the responsive optical slab grid. */
  tiers: ReadonlyArray<PricingTier>;
  /** Controlled active billing cycle ('monthly' | 'annual'). */
  billingCycle?: BillingCycle;
  /** Initial billing cycle in uncontrolled mode (defaults to 'annual'). */
  defaultBillingCycle?: BillingCycle;
  /** Callback invoked when the active billing cycle changes. */
  onBillingCycleChange?: (cycle: BillingCycle) => void;
  /** Promotional savings badge text displayed beside the Annual toggle (defaults to 'Save 20%'). */
  annualSavingsLabel?: string;
  /** Callback invoked when a user activates a tier call-to-action button. */
  onSelectTier?: (tier: PricingTier, cycle: BillingCycle) => void;
}

interface KeyedPricingFeature {
  key: string;
  text: string;
  included: boolean;
}

const MAX_DISPLAY_PRICE = 1_000_000_000;

function formatTabularPrice(rawPrice: number, currencySymbol: string): string {
  const clamped = clampNumber(rawPrice, 0, MAX_DISPLAY_PRICE, 0);
  const rounded = Math.round(clamped * 100) / 100;
  const formatted = Number.isInteger(rounded)
    ? rounded.toLocaleString('en-US')
    : rounded.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
  return `${currencySymbol}${formatted}`;
}

function buildKeyedFeatures(
  tierId: string,
  features: ReadonlyArray<PricingFeature>
): KeyedPricingFeature[] {
  const seen = new Map<string, number>();
  const keyed: KeyedPricingFeature[] = [];
  for (const feature of features) {
    const signature = `${feature.included ? 'inc' : 'exc'}:${feature.text}`;
    const prevCount = seen.get(signature);
    const nextCount = prevCount === undefined ? 1 : prevCount + 1;
    seen.set(signature, nextCount);
    keyed.push({
      key: `${tierId}-${signature}-${nextCount}`,
      text: feature.text,
      included: feature.included,
    });
  }
  return keyed;
}

export function PricingTierMatrix({
  tiers,
  billingCycle,
  defaultBillingCycle = 'annual',
  onBillingCycleChange,
  annualSavingsLabel = 'Save 20%',
  onSelectTier,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PricingTierMatrixProps) {
  const override = useComponentOverride('PricingTierMatrix');
  const matrixId = useId();

  const [activeCycle, setActiveCycle] = useControllableState<BillingCycle>({
    value: billingCycle,
    defaultValue: defaultBillingCycle,
    onChange: onBillingCycleChange,
  });

  const isEmpty = tiers.length === 0;

  const handleCycleChange = (nextCycle: BillingCycle) => {
    if (nextCycle === activeCycle) {
      return;
    }
    setActiveCycle(nextCycle);
  };

  const merged = mergeProps({
    themeTarget: themeProps('pricing-tier-matrix', {
      billingCycle: activeCycle,
      empty: isEmpty,
    }),
    baseClassName: 'w-full flex flex-col gap-6',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Billing cycle"
          data-testid="pricing-billing-toggle"
          className="prism-crystal inline-flex items-center gap-1 p-1.5 rounded-full"
        >
          <button
            type="button"
            aria-pressed={activeCycle === 'monthly'}
            data-testid="pricing-cycle-monthly"
            onClick={() => handleCycleChange('monthly')}
            className={`prism-focus-ring px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:cursor-not-allowed transition-all ${
              activeCycle === 'monthly'
                ? 'prism-btn-primary'
                : 'enabled:hover:brightness-105'
            }`}
            style={
              activeCycle === 'monthly'
                ? undefined
                : { color: 'var(--prism-text-secondary)' }
            }
          >
            Monthly
          </button>

          <button
            type="button"
            aria-pressed={activeCycle === 'annual'}
            data-testid="pricing-cycle-annual"
            onClick={() => handleCycleChange('annual')}
            className={`prism-focus-ring inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:cursor-not-allowed transition-all ${
              activeCycle === 'annual'
                ? 'prism-btn-primary'
                : 'enabled:hover:brightness-105'
            }`}
            style={
              activeCycle === 'annual'
                ? undefined
                : { color: 'var(--prism-text-secondary)' }
            }
          >
            <span>Annual</span>
            {annualSavingsLabel ? (
              <span
                data-testid="pricing-annual-savings"
                className="prism-emerald inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
              >
                {annualSavingsLabel}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      {isEmpty ? (
        <div className="prism-slab p-6">
          <div
            data-testid="pricing-empty-state"
            className="prism-well rounded-2xl py-8 px-4 text-center text-sm"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            No pricing tiers configured yet.
          </div>
        </div>
      ) : (
        <div
          data-testid="pricing-tier-grid"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
        >
          {tiers.map((tier) => {
            const isPopular = tier.popular === true;
            const badgeLabel = isPopular ? (tier.badge ?? 'Most Popular') : tier.badge;
            const rawPrice = activeCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;
            const currency = tier.currencySymbol ?? '$';
            const formattedPrice = formatTabularPrice(rawPrice, currency);
            const ctaText = tier.ctaLabel ?? `Choose ${tier.name}`;
            const headingId = `${matrixId}-tier-${tier.id}`;
            const keyedFeatures = buildKeyedFeatures(tier.id, tier.features);

            return (
              <article
                key={tier.id}
                aria-labelledby={headingId}
                data-tier-id={tier.id}
                data-popular={isPopular ? 'true' : undefined}
                data-testid={`pricing-tier-card-${tier.id}`}
                className={`prism-slab p-6 flex flex-col justify-between gap-5 relative ${
                  isPopular ? 'ring-2 ring-[var(--prism-primary-main)]' : ''
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3
                        id={headingId}
                        className="text-lg font-bold tracking-tight break-words"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {tier.name}
                      </h3>
                      {tier.description ? (
                        <p
                          className="mt-1 text-xs leading-relaxed break-words"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {tier.description}
                        </p>
                      ) : null}
                    </div>

                    {badgeLabel ? (
                      <span
                        data-testid={`pricing-tier-badge-${tier.id}`}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight shrink-0 ${
                          isPopular ? '' : 'prism-crystal'
                        }`}
                        style={
                          isPopular
                            ? {
                                backgroundColor: 'var(--prism-primary-main)',
                                color: 'var(--prism-primary-contrast)',
                              }
                            : { color: 'var(--prism-text-primary)' }
                        }
                      >
                        {isPopular ? (
                          <Sparkles aria-hidden="true" className="w-3 h-3 shrink-0" />
                        ) : null}
                        <span>{badgeLabel}</span>
                      </span>
                    ) : null}
                  </div>

                  <div className="prism-well rounded-2xl p-4">
                    <div className="flex items-baseline gap-1">
                      <span
                        data-testid={`pricing-tier-price-${tier.id}`}
                        className="text-4xl font-bold tracking-tight tabular-nums"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {formattedPrice}
                      </span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        /mo
                      </span>
                    </div>
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--prism-text-secondary)' }}
                    >
                      {activeCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
                    </p>
                  </div>

                  <ul aria-label={`${tier.name} features`} className="space-y-2.5">
                    {keyedFeatures.map((feature) => (
                      <li
                        key={feature.key}
                        data-included={feature.included ? 'true' : 'false'}
                        className="flex items-start gap-2.5 text-sm leading-snug"
                      >
                        {feature.included ? (
                          <>
                            <span
                              className="mt-0.5 inline-flex items-center justify-center shrink-0"
                              style={{ color: 'var(--prism-success-main)' }}
                            >
                              <Check aria-hidden="true" className="w-4 h-4 shrink-0" />
                              <span className="sr-only">Included:</span>
                            </span>
                            <span
                              className="break-words"
                              style={{ color: 'var(--prism-text-primary)' }}
                            >
                              {feature.text}
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              className="mt-0.5 inline-flex items-center justify-center shrink-0"
                              style={{ color: 'var(--prism-text-disabled)' }}
                            >
                              <Minus aria-hidden="true" className="w-4 h-4 shrink-0" />
                              <span className="sr-only">Not included:</span>
                            </span>
                            <span
                              className="line-through break-words"
                              style={{ color: 'var(--prism-text-disabled)' }}
                            >
                              {feature.text}
                            </span>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  data-testid={`pricing-tier-cta-${tier.id}`}
                  onClick={() => onSelectTier?.(tier, activeCycle)}
                  className={`prism-focus-ring w-full py-2.5 px-4 text-sm font-semibold cursor-pointer disabled:cursor-not-allowed transition-all ${
                    isPopular ? 'prism-btn-primary' : 'prism-btn-secondary'
                  }`}
                >
                  {ctaText}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

PricingTierMatrix.displayName = 'PricingTierMatrix';
