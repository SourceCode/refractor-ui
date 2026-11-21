import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  PricingTierMatrix,
  type BillingCycle,
  type PricingTier,
} from './index';

const SAMPLE_TIERS: readonly PricingTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Essential optical glass primitives for solo builders.',
    monthlyPrice: 0,
    annualPrice: 0,
    ctaLabel: 'Start Free',
    features: [
      { text: 'Core component library', included: true },
      { text: 'Community documentation', included: true },
      { text: 'Theme studio exports', included: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'Full refraction physics and custom theme cascades.',
    monthlyPrice: 59,
    annualPrice: 49,
    popular: true,
    features: [
      { text: 'Core component library', included: true },
      { text: 'Theme studio exports', included: true },
      { text: 'Dedicated SLA support', included: false },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 199.5,
    annualPrice: 159.99,
    currencySymbol: '€',
    badge: 'Custom SLA',
    features: [
      { text: 'Core component library', included: true },
      { text: 'Theme studio exports', included: true },
      { text: 'Dedicated SLA support', included: true },
    ],
  },
];

describe('PricingTierMatrix', () => {
  it('renders annual billing by default with savings pill, popular ring/badge/CTA, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PricingTierMatrix: {
              className: 'theme-pricing-matrix',
              style: { maxWidth: '1040px' },
            },
          },
        }}
      >
        <PricingTierMatrix
          ref={ref}
          tiers={SAMPLE_TIERS}
          className="custom-pricing"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="pricing-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('pricing-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-pricing-tier-matrix',
      'theme-pricing-matrix',
      'custom-pricing'
    );
    expect(root).toHaveStyle({ maxWidth: '1040px' });
    expect(root).toHaveAttribute('data-billing-cycle', 'annual');
    expect(root).not.toHaveAttribute('data-empty');

    const toggle = screen.getByTestId('pricing-billing-toggle');
    expect(toggle).toHaveClass('prism-crystal');
    expect(screen.getByTestId('pricing-cycle-annual')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('pricing-cycle-monthly')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('pricing-annual-savings')).toHaveTextContent('Save 20%');
    expect(screen.getByTestId('pricing-annual-savings')).toHaveClass('prism-emerald');

    const grid = screen.getByTestId('pricing-tier-grid');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-3');

    const starterCard = screen.getByTestId('pricing-tier-card-starter');
    const proCard = screen.getByTestId('pricing-tier-card-pro');
    const enterpriseCard = screen.getByTestId('pricing-tier-card-enterprise');

    expect(starterCard).toHaveClass('prism-slab');
    expect(starterCard).not.toHaveAttribute('data-popular');
    expect(proCard).toHaveClass('prism-slab', 'ring-2', 'ring-[var(--prism-primary-main)]');
    expect(proCard).toHaveAttribute('data-popular', 'true');
    expect(enterpriseCard).toHaveClass('prism-slab');
    expect(enterpriseCard).not.toHaveAttribute('data-popular');

    expect(screen.getByTestId('pricing-tier-badge-pro')).toHaveTextContent('Most Popular');
    expect(screen.getByTestId('pricing-tier-badge-enterprise')).toHaveTextContent('Custom SLA');
    expect(screen.getByTestId('pricing-tier-badge-enterprise')).toHaveClass('prism-crystal');
    expect(screen.queryByTestId('pricing-tier-badge-starter')).not.toBeInTheDocument();

    expect(screen.getByTestId('pricing-tier-price-starter')).toHaveTextContent('$0');
    expect(screen.getByTestId('pricing-tier-price-pro')).toHaveTextContent('$49');
    expect(screen.getByTestId('pricing-tier-price-enterprise')).toHaveTextContent('€159.99');

    const starterCta = screen.getByTestId('pricing-tier-cta-starter');
    const proCta = screen.getByTestId('pricing-tier-cta-pro');
    const enterpriseCta = screen.getByTestId('pricing-tier-cta-enterprise');

    expect(starterCta).toHaveClass('prism-btn-secondary');
    expect(starterCta).toHaveTextContent('Start Free');
    expect(proCta).toHaveClass('prism-btn-primary');
    expect(proCta).toHaveTextContent('Choose Pro');
    expect(enterpriseCta).toHaveClass('prism-btn-secondary');
    expect(enterpriseCta).toHaveTextContent('Choose Enterprise');

    const starterList = within(starterCard).getByRole('list', { name: 'Starter features' });
    const starterItems = within(starterList).getAllByRole('listitem');
    expect(starterItems).toHaveLength(3);
    const firstStarterItem = starterItems[0];
    const thirdStarterItem = starterItems[2];
    expect(firstStarterItem).toBeDefined();
    expect(thirdStarterItem).toBeDefined();
    if (firstStarterItem && thirdStarterItem) {
      expect(firstStarterItem).toHaveAttribute('data-included', 'true');
      expect(thirdStarterItem).toHaveAttribute('data-included', 'false');
      expect(within(firstStarterItem).getByText('Included:')).toBeInTheDocument();
      expect(within(thirdStarterItem).getByText('Not included:')).toBeInTheDocument();
    }
  });

  it('switches billing cycles in uncontrolled mode, ignores redundant clicks, and invokes onSelectTier', () => {
    const onBillingCycleChange = vi.fn();
    const onSelectTier = vi.fn();

    render(
      <PricingTierMatrix
        tiers={SAMPLE_TIERS}
        defaultBillingCycle="annual"
        annualSavingsLabel="Save 25%"
        onBillingCycleChange={onBillingCycleChange}
        onSelectTier={onSelectTier}
        data-testid="pricing-uncontrolled"
      />
    );

    expect(screen.getByTestId('pricing-annual-savings')).toHaveTextContent('Save 25%');

    // Clicking already-active Annual cycle does not re-emit change
    fireEvent.click(screen.getByTestId('pricing-cycle-annual'));
    expect(onBillingCycleChange).not.toHaveBeenCalled();

    // Switch to Monthly
    fireEvent.click(screen.getByTestId('pricing-cycle-monthly'));
    expect(onBillingCycleChange).toHaveBeenCalledTimes(1);
    expect(onBillingCycleChange).toHaveBeenLastCalledWith('monthly');
    expect(screen.getByTestId('pricing-uncontrolled')).toHaveAttribute(
      'data-billing-cycle',
      'monthly'
    );
    expect(screen.getByTestId('pricing-tier-price-pro')).toHaveTextContent('$59');
    expect(screen.getByTestId('pricing-tier-price-enterprise')).toHaveTextContent('€199.50');

    // Activate popular tier CTA under monthly billing
    fireEvent.click(screen.getByTestId('pricing-tier-cta-pro'));
    expect(onSelectTier).toHaveBeenCalledTimes(1);
    expect(onSelectTier).toHaveBeenLastCalledWith(SAMPLE_TIERS[1], 'monthly');

    // Switch back to Annual
    fireEvent.click(screen.getByTestId('pricing-cycle-annual'));
    expect(onBillingCycleChange).toHaveBeenCalledTimes(2);
    expect(onBillingCycleChange).toHaveBeenLastCalledWith('annual');
    expect(screen.getByTestId('pricing-tier-price-pro')).toHaveTextContent('$49');

    fireEvent.click(screen.getByTestId('pricing-tier-cta-starter'));
    expect(onSelectTier).toHaveBeenLastCalledWith(SAMPLE_TIERS[0], 'annual');
  });

  it('supports controlled billingCycle mode and custom popular badge', () => {
    function ControlledHarness() {
      const [cycle, setCycle] = useState<BillingCycle>('monthly');
      return (
        <div>
          <button type="button" onClick={() => setCycle('annual')}>
            Force Annual
          </button>
          <PricingTierMatrix
            billingCycle={cycle}
            onBillingCycleChange={setCycle}
            annualSavingsLabel=""
            tiers={[
              {
                id: 'team',
                name: 'Team',
                monthlyPrice: 99,
                annualPrice: 79,
                popular: true,
                badge: 'Best Value',
                features: [
                  { text: 'Shared workspaces', included: true },
                  { text: 'Shared workspaces', included: true },
                ],
              },
            ]}
          />
        </div>
      );
    }

    render(<ControlledHarness />);
    expect(screen.queryByTestId('pricing-annual-savings')).not.toBeInTheDocument();
    expect(screen.getByTestId('pricing-tier-badge-team')).toHaveTextContent('Best Value');
    expect(screen.getByTestId('pricing-tier-price-team')).toHaveTextContent('$99');

    fireEvent.click(screen.getByRole('button', { name: 'Force Annual' }));
    expect(screen.getByTestId('pricing-tier-price-team')).toHaveTextContent('$79');

    fireEvent.click(screen.getByTestId('pricing-cycle-monthly'));
    expect(screen.getByTestId('pricing-tier-price-team')).toHaveTextContent('$99');
  });

  it('renders empty state when tiers array is empty (negative test)', () => {
    render(<PricingTierMatrix tiers={[]} data-testid="pricing-empty" />);

    expect(screen.getByTestId('pricing-empty')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('pricing-empty-state')).toHaveTextContent(
      'No pricing tiers configured yet.'
    );
    expect(screen.queryByTestId('pricing-tier-grid')).not.toBeInTheDocument();
  });

  it('clamps negative, NaN, and Infinity tier prices safely to finite tabular readouts (negative test)', () => {
    const edgeTiers: readonly PricingTier[] = [
      {
        id: 'neg',
        name: 'Negative',
        monthlyPrice: -50,
        annualPrice: -10,
        features: [{ text: 'Base', included: true }],
      },
      {
        id: 'nan',
        name: 'NotANumber',
        monthlyPrice: Number.NaN,
        annualPrice: Number.NaN,
        features: [{ text: 'Base', included: true }],
      },
      {
        id: 'inf',
        name: 'Infinite',
        monthlyPrice: Number.POSITIVE_INFINITY,
        annualPrice: Number.NEGATIVE_INFINITY,
        features: [{ text: 'Base', included: true }],
      },
    ];

    render(<PricingTierMatrix tiers={edgeTiers} />);

    expect(screen.getByTestId('pricing-tier-price-neg')).toHaveTextContent('$0');
    expect(screen.getByTestId('pricing-tier-price-nan')).toHaveTextContent('$0');
    expect(screen.getByTestId('pricing-tier-price-inf')).toHaveTextContent('$0');
  });

  it('renders adversarial XSS payloads strictly as literal text and resists prototype-polluting tier IDs', () => {
    const payload = '<script>window.__pricingXss=1</script><img src=x onerror=alert(1)>';
    const adversarialTiers: readonly PricingTier[] = [
      {
        id: '__proto__',
        name: payload,
        description: payload,
        monthlyPrice: 29,
        annualPrice: 19,
        popular: true,
        badge: payload,
        ctaLabel: payload,
        features: [
          { text: payload, included: true },
          { text: '__proto__', included: false },
          { text: 'constructor', included: true },
        ],
      },
    ];

    render(
      <PricingTierMatrix tiers={adversarialTiers} annualSavingsLabel={payload} />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getAllByText(payload)).toHaveLength(6);
    expect(({} as Record<string, string>)['__proto__']).not.toBe(payload);
  });
});
