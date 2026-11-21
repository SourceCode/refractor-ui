import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { FunnelChart, type FunnelStage } from './FunnelChart';

const SAMPLE_STAGES: FunnelStage[] = [
  { id: 'visit', label: 'Product Visit', value: 1000, tone: 'primary' },
  { id: 'cart', label: 'Added to Cart', value: 658, tone: 'secondary' },
  { id: 'checkout', label: 'Checkout Started', value: 320.5, tone: 'amber' },
  { id: 'purchase', label: 'Order Completed', value: 50, tone: 'emerald' },
];

describe('FunnelChart', () => {
  it('renders centered narrowing stages with clamped widths, drop-off badges, ref forwarding, theme overrides, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            FunnelChart: { className: 'theme-funnel', style: { maxWidth: '640px' } },
          },
        }}
      >
        <FunnelChart
          ref={ref}
          stages={SAMPLE_STAGES}
          valueUnit=" users"
          className="consumer-funnel"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="funnel-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('funnel-root');
    expect(ref.current).toBe(root);
    expect(FunnelChart.displayName).toBe('FunnelChart');
    expect(root).toHaveClass(
      'refractor-funnel-chart',
      'prism-slab',
      'theme-funnel',
      'consumer-funnel'
    );
    expect(root).toHaveStyle({ maxWidth: '640px' });
    expect(root).toHaveAttribute('data-dropoff', 'true');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(root.innerHTML).toContain('var(--prism-primary-main)');
    expect(root.innerHTML).toContain('var(--prism-secondary-main)');
    expect(root.innerHTML).toContain('var(--prism-warning-main)');
    expect(root.innerHTML).toContain('var(--prism-success-main)');

    // End-to-end badge shows 5% (50 / 1000)
    expect(screen.getByTestId('funnel-overall-badge')).toHaveTextContent('5% end-to-end');

    // Rendered widths clamp between 18% and 100%
    expect(screen.getByTestId('funnel-bar-visit')).toHaveAttribute('data-width-pct', '100');
    expect(screen.getByTestId('funnel-bar-cart')).toHaveAttribute('data-width-pct', '65.8');
    expect(screen.getByTestId('funnel-bar-checkout')).toHaveAttribute('data-width-pct', '32.1');
    // 50 / 1000 = 5% -> clamped to 18%
    expect(screen.getByTestId('funnel-bar-purchase')).toHaveAttribute('data-width-pct', '18');

    // Stage-to-stage drop-off badges render for stages > 0
    expect(screen.queryByTestId('funnel-dropoff-visit')).toBeNull();
    expect(screen.getByTestId('funnel-dropoff-cart')).toHaveTextContent('-34.2% drop');
    expect(screen.getByTestId('funnel-dropoff-checkout')).toHaveTextContent('-51.3% drop');
    expect(screen.getByTestId('funnel-dropoff-purchase')).toHaveTextContent('-84.4% drop');

    // Summary footer starts with instructional prompt
    const summary = screen.getByTestId('funnel-summary');
    expect(summary).toHaveClass('prism-well');
    expect(summary).toHaveTextContent(
      'Select any funnel stage to inspect volume, overall conversion, and step retention.'
    );
  });

  it('highlights selected stage, invokes onSelectStage via click & IME-safe keyboard, and updates recessed summary footer', () => {
    const onSelectStage = vi.fn();
    render(
      <FunnelChart
        stages={SAMPLE_STAGES}
        title="Checkout Pipeline"
        valueUnit="k"
        onSelectStage={onSelectStage}
      />
    );

    const cartBtn = screen.getByRole('button', {
      name: 'Added to Cart: 658k (65.8% overall)',
    });
    fireEvent.click(cartBtn);

    expect(onSelectStage).toHaveBeenCalledWith(SAMPLE_STAGES[1], 65.8, 65.8);
    expect(cartBtn).toHaveAttribute('aria-pressed', 'true');
    expect(cartBtn).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('funnel-summary')).toHaveTextContent(
      'Added to Cart: 658k · 65.8% overall · 65.8% step conversion'
    );

    // IME composing Enter must be ignored
    const checkoutBtn = screen.getByRole('button', {
      name: 'Checkout Started: 320.5k (32.1% overall)',
    });
    fireEvent.keyDown(checkoutBtn, { key: 'Enter', isComposing: true });
    expect(onSelectStage).toHaveBeenCalledTimes(1);

    // Non-activation key ignored
    fireEvent.keyDown(checkoutBtn, { key: 'Escape' });
    expect(onSelectStage).toHaveBeenCalledTimes(1);

    // Keyboard Enter activates stage
    fireEvent.keyDown(checkoutBtn, { key: 'Enter' });
    expect(onSelectStage).toHaveBeenLastCalledWith(SAMPLE_STAGES[2], 32.1, 48.7);
    expect(screen.getByTestId('funnel-summary')).toHaveTextContent(
      'Checkout Started: 320.5k · 32.1% overall · 48.7% step conversion'
    );

    // Keyboard Space activates final stage
    const purchaseBtn = screen.getByRole('button', {
      name: 'Order Completed: 50k (5% overall)',
    });
    fireEvent.keyDown(purchaseBtn, { key: ' ' });
    expect(onSelectStage).toHaveBeenLastCalledWith(SAMPLE_STAGES[3], 5, 15.6);
    expect(screen.getByTestId('funnel-summary')).toHaveTextContent(
      'Order Completed: 50k · 5% overall · 15.6% step conversion'
    );
  });

  it('supports showDropoff={false}, auto-cycles tones, sanitizes invalid/zero/growth stages, and resets selection if stage removed', () => {
    const edgeStages: FunnelStage[] = [
      { id: 's1', label: 'Lead', value: -20 }, // sanitized -> 0
      { id: 's2', label: 'Qualified', value: 100 }, // prev=0 -> stepPct 0, dropoff 0
      { id: 's3', label: 'Expanded', value: 125 }, // gain +25%
      { id: 's4', label: 'Flat', value: 125 }, // 0% drop
      { id: 's5', label: 'Closed', value: Number.NaN }, // sanitized -> 0
    ];

    const { rerender } = render(
      <FunnelChart stages={edgeStages} showDropoff={true} data-testid="edge-funnel" />
    );

    const root = screen.getByTestId('edge-funnel');
    expect(root.innerHTML).not.toContain('NaN');
    expect(root.innerHTML).toContain('var(--prism-error-main)');

    // Max finite value (125) becomes 100% width reference when top stage is 0
    expect(screen.getByTestId('funnel-bar-s1')).toHaveAttribute('data-width-pct', '18');
    expect(screen.getByTestId('funnel-bar-s2')).toHaveAttribute('data-width-pct', '80');
    expect(screen.getByTestId('funnel-bar-s3')).toHaveAttribute('data-width-pct', '100');
    expect(screen.getByTestId('funnel-bar-s5')).toHaveAttribute('data-width-pct', '18');

    // Dropoff badges handle 0% drop and +25% gain cleanly
    expect(screen.getByTestId('funnel-dropoff-s2')).toHaveTextContent('0% drop');
    expect(screen.getByTestId('funnel-dropoff-s3')).toHaveTextContent('+25% gain');
    expect(screen.getByTestId('funnel-dropoff-s4')).toHaveTextContent('0% drop');
    expect(screen.getByTestId('funnel-dropoff-s5')).toHaveTextContent('-100% drop');

    // Select s3 then remove s3 in rerender with showDropoff={false} and all-zero stages
    fireEvent.click(screen.getByRole('button', { name: 'Expanded: 125 (100% overall)' }));
    expect(screen.getByTestId('funnel-summary')).toHaveTextContent('Expanded: 125');

    rerender(
      <FunnelChart
        stages={[
          { id: 'z1', label: 'Zero 1', value: 0 },
          { id: 'z2', label: 'Zero 2', value: Number.POSITIVE_INFINITY },
        ]}
        showDropoff={false}
        data-testid="edge-funnel"
      />
    );

    expect(screen.getByTestId('edge-funnel')).not.toHaveAttribute('data-dropoff');
    expect(screen.queryByTestId('funnel-dropoff-z2')).toBeNull();
    expect(screen.getByTestId('funnel-bar-z1')).toHaveAttribute('data-width-pct', '18');
    expect(screen.getByTestId('funnel-bar-z2')).toHaveAttribute('data-width-pct', '18');
    expect(screen.getByTestId('funnel-overall-badge')).toHaveTextContent('0% end-to-end');
    expect(screen.getByTestId('funnel-summary')).toHaveTextContent(
      'Select any funnel stage to inspect volume, overall conversion, and step retention.'
    );
  });

  it('renders clean empty state when stages is empty and neutralizes XSS strings', () => {
    const { rerender } = render(<FunnelChart stages={[]} data-testid="empty-funnel" />);

    expect(screen.getByTestId('empty-funnel')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('funnel-empty')).toHaveTextContent('No funnel stages to display.');
    expect(screen.queryByTestId('funnel-summary')).toBeNull();
    expect(screen.queryByTestId('funnel-overall-badge')).toBeNull();

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <FunnelChart
        title={payload}
        stages={[{ id: 'xss', label: payload, value: 42 }]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
