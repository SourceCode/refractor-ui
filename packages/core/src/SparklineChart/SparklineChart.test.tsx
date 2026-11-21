import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SparklineChart, type SparklineTone } from './index';

describe('SparklineChart', () => {
  it('renders default line sparkline with polyline, translucent polygon fill, endpoint dots, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLSpanElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SparklineChart: { className: 'theme-sparkline', style: { paddingRight: '4px' } },
          },
        }}
      >
        <SparklineChart
          ref={ref}
          values={[10, 50, 20]}
          ariaLabel="Weekly latency trend"
          className="custom-sparkline"
          style={{ marginLeft: '2px' }}
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="spark-root"
        />
      </PrismThemeProvider>
    );

    expect(SparklineChart.displayName).toBe('SparklineChart');

    const root = screen.getByTestId('spark-root');
    expect(ref.current).toBe(root);
    expect(root.tagName).toBe('SPAN');
    expect(root).toHaveClass(
      'refractor-sparkline-chart',
      'prism-focus-ring',
      'inline-flex',
      'items-center',
      'gap-2',
      'theme-sparkline',
      'custom-sparkline'
    );
    expect(root).toHaveStyle({ paddingRight: '4px', marginLeft: '2px' });
    expect(root).toHaveAttribute('data-variant', 'line');
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).not.toHaveAttribute('data-empty');

    const svg = screen.getByRole('img', { name: 'Weekly latency trend' });
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '32');
    expect(svg).toHaveAttribute('viewBox', '0 0 120 32');

    const polyline = svg.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline).toHaveAttribute('stroke', 'var(--prism-primary-main)');

    const polygon = svg.querySelector('polygon');
    expect(polygon).not.toBeNull();
    expect(polygon).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(polygon).toHaveAttribute('fill-opacity', '0.16');

    const dots = svg.querySelectorAll('circle');
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute('data-sparkline-dot', 'start');
    expect(dots[1]).toHaveAttribute('data-sparkline-dot', 'peak');
    expect(dots[1]).toHaveAttribute('data-sparkline-peak', 'true');
    expect(dots[2]).toHaveAttribute('data-sparkline-dot', 'end');

    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).not.toContain('Infinity');
  });

  it('maps every semantic tone to its exact --prism-* CSS variable', () => {
    const toneExpectations: ReadonlyArray<{ tone: SparklineTone; token: string }> = [
      { tone: 'primary', token: 'var(--prism-primary-main)' },
      { tone: 'secondary', token: 'var(--prism-secondary-main)' },
      { tone: 'emerald', token: 'var(--prism-success-main)' },
      { tone: 'amber', token: 'var(--prism-warning-main)' },
      { tone: 'rose', token: 'var(--prism-error-main)' },
    ];

    const { rerender } = render(
      <SparklineChart values={[12, 24, 18]} tone="primary" data-testid="tone-spark" />
    );

    for (const { tone, token } of toneExpectations) {
      rerender(<SparklineChart values={[12, 24, 18]} tone={tone} data-testid="tone-spark" />);
      const root = screen.getByTestId('tone-spark');
      expect(root).toHaveAttribute('data-tone', tone);
      const svg = screen.getByRole('img', { name: 'Trend sparkline' });
      expect(svg.querySelector('polyline')).toHaveAttribute('stroke', token);
      expect(svg.querySelector('polygon')).toHaveAttribute('fill', token);
    }
  });

  it('handles line endpoint marker positions and showEndpoints=false cleanly', () => {
    const { rerender } = render(<SparklineChart values={[50, 30, 10]} />);
    let svg = screen.getByRole('img', { name: 'Trend sparkline' });
    let dots = svg.querySelectorAll('circle');
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveAttribute('data-sparkline-dot', 'start');
    expect(dots[0]).toHaveAttribute('data-sparkline-peak', 'true');
    expect(dots[1]).toHaveAttribute('data-sparkline-dot', 'end');

    rerender(<SparklineChart values={[10, 30, 50]} />);
    svg = screen.getByRole('img', { name: 'Trend sparkline' });
    dots = svg.querySelectorAll('circle');
    expect(dots).toHaveLength(2);
    expect(dots[0]).toHaveAttribute('data-sparkline-dot', 'start');
    expect(dots[1]).toHaveAttribute('data-sparkline-dot', 'end');
    expect(dots[1]).toHaveAttribute('data-sparkline-peak', 'true');

    rerender(<SparklineChart values={[10, 50, 20]} showEndpoints={false} />);
    svg = screen.getByRole('img', { name: 'Trend sparkline' });
    expect(svg.querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders bar variant with rx=2, emphasized latest bar, and safe sizing across distributions', () => {
    const { rerender } = render(
      <SparklineChart
        values={[10, 30, 20, 50]}
        variant="bar"
        tone="secondary"
        data-testid="bar-spark"
      />
    );

    const root = screen.getByTestId('bar-spark');
    expect(root).toHaveAttribute('data-variant', 'bar');

    const svg = screen.getByRole('img', { name: 'Trend sparkline' });
    expect(svg.querySelector('polyline')).toBeNull();
    expect(svg.querySelector('polygon')).toBeNull();

    const rects = svg.querySelectorAll('rect');
    expect(rects).toHaveLength(4);
    for (const [idx, rect] of Array.from(rects).entries()) {
      expect(rect).toHaveAttribute('rx', '2');
      expect(rect).toHaveAttribute('fill', 'var(--prism-secondary-main)');
      if (idx === rects.length - 1) {
        expect(rect).toHaveAttribute('fill-opacity', '1');
        expect(rect).toHaveAttribute('data-sparkline-bar', 'latest');
      } else {
        expect(rect).toHaveAttribute('fill-opacity', '0.42');
        expect(rect).toHaveAttribute('data-sparkline-bar', 'series');
      }
    }

    // Single bar
    rerender(<SparklineChart values={[25]} variant="bar" />);
    const singleBar = screen.getByRole('img').querySelectorAll('rect');
    expect(singleBar).toHaveLength(1);
    expect(singleBar[0]).toHaveAttribute('fill-opacity', '1');
    expect(Number(singleBar[0]?.getAttribute('width'))).toBeGreaterThan(0);

    // All zeros
    rerender(<SparklineChart values={[0, 0, 0]} variant="bar" />);
    const zeroBars = screen.getByRole('img').querySelectorAll('rect');
    expect(zeroBars).toHaveLength(3);
    expect(Number(zeroBars[0]?.getAttribute('height'))).toBeGreaterThanOrEqual(2);

    // Flat non-zero values
    rerender(<SparklineChart values={[15, 15, 15]} variant="bar" />);
    const flatBars = screen.getByRole('img').querySelectorAll('rect');
    expect(flatBars).toHaveLength(3);
    expect(flatBars[0]?.getAttribute('height')).toBe(flatBars[2]?.getAttribute('height'));

    // Negative and mixed values
    rerender(<SparklineChart values={[-30, -10, 20]} variant="bar" />);
    const negSvg = screen.getByRole('img');
    const negBars = negSvg.querySelectorAll('rect');
    expect(negBars).toHaveLength(3);
    expect(Number(negBars[2]?.getAttribute('height'))).toBeGreaterThan(
      Number(negBars[0]?.getAttribute('height'))
    );
    expect(negSvg.innerHTML).not.toContain('NaN');

    // High-density bar count inside minimum clamped width (48px)
    const denseSeries = Array.from({ length: 60 }, (_, idx) => idx + 1);
    rerender(<SparklineChart values={denseSeries} variant="bar" width={48} height={16} />);
    const denseBars = screen.getByRole('img').querySelectorAll('rect');
    expect(denseBars).toHaveLength(60);
    for (const bar of Array.from(denseBars)) {
      expect(Number(bar.getAttribute('width'))).toBeGreaterThan(0);
      expect(Number(bar.getAttribute('height'))).toBeGreaterThan(0);
    }
  });

  it('displays formatted tabular delta pills for positive, negative, neutral, zero-baseline, negative-baseline, and overflow series', () => {
    const { rerender } = render(
      <SparklineChart values={[100, 114.2]} showDelta data-testid="delta-spark" />
    );

    const root = screen.getByTestId('delta-spark');
    expect(root).toHaveAttribute('data-show-delta', 'true');
    expect(root).toHaveAttribute('data-delta-direction', 'positive');
    const posPill = screen.getByText('+14.2%');
    expect(posPill).toHaveClass('prism-emerald', 'tabular-nums');
    expect(posPill).toHaveAttribute('data-sparkline-delta', 'positive');

    // Negative delta
    rerender(<SparklineChart values={[100, 95]} showDelta data-testid="delta-spark" />);
    expect(root).toHaveAttribute('data-delta-direction', 'negative');
    const negPill = screen.getByText('-5.0%');
    expect(negPill).toHaveClass('prism-crystal', 'tabular-nums');
    expect(negPill).toHaveAttribute('data-sparkline-delta', 'negative');

    // Neutral flat delta
    rerender(<SparklineChart values={[20, 20, 20]} showDelta data-testid="delta-spark" />);
    expect(root).toHaveAttribute('data-delta-direction', 'neutral');
    const flatPill = screen.getByText('0.0%');
    expect(flatPill).toHaveAttribute('data-sparkline-delta', 'neutral');

    // Division by zero baseline: [0, 0] -> 0.0%
    rerender(<SparklineChart values={[0, 0]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('0.0%')).toHaveAttribute('data-sparkline-delta', 'neutral');

    // Division by zero baseline: [0, 25] -> +100.0% (no Infinity/NaN)
    rerender(<SparklineChart values={[0, 25]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('+100.0%')).toHaveAttribute('data-sparkline-delta', 'positive');
    expect(root.textContent).not.toContain('Infinity');
    expect(root.textContent).not.toContain('NaN');

    // Division by zero baseline: [0, -25] -> -100.0%
    rerender(<SparklineChart values={[0, -25]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('-100.0%')).toHaveAttribute('data-sparkline-delta', 'negative');

    // Negative baseline increase and decrease
    rerender(<SparklineChart values={[-100, -50]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('+50.0%')).toHaveAttribute('data-sparkline-delta', 'positive');

    rerender(<SparklineChart values={[-100, -150]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('-50.0%')).toHaveAttribute('data-sparkline-delta', 'negative');

    // Tiny sub-0.05% change rounds cleanly to 0.0% neutral (never -0.0%)
    rerender(<SparklineChart values={[100000, 99999]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('0.0%')).toHaveAttribute('data-sparkline-delta', 'neutral');

    // Extreme floating-point overflow delta + span guard
    rerender(<SparklineChart values={[1e-308, 1e308]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('+100.0%')).toHaveAttribute('data-sparkline-delta', 'positive');

    rerender(<SparklineChart values={[1e-308, -1e308]} showDelta data-testid="delta-spark" />);
    expect(screen.getByText('-100.0%')).toHaveAttribute('data-sparkline-delta', 'negative');

    rerender(<SparklineChart values={[-1e308, 1e308]} showDelta data-testid="delta-spark" />);
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(screen.getByRole('img').innerHTML).not.toContain('Infinity');

    // Single finite point (or 1 finite + NaN) hides delta pill even when showDelta=true
    rerender(<SparklineChart values={[42, Number.NaN]} showDelta data-testid="delta-spark" />);
    expect(root.querySelector('[data-sparkline-delta]')).toBeNull();

    // Empty hides delta pill
    rerender(<SparklineChart values={[]} showDelta data-testid="delta-spark" />);
    expect(root.querySelector('[data-sparkline-delta]')).toBeNull();
  });

  it('clamps width (48..320) and height (16..96) and sanitizes non-finite dimensions and blank ariaLabel', () => {
    const { rerender } = render(
      <SparklineChart values={[1, 2, 3]} width={10} height={4} ariaLabel="   " />
    );

    let svg = screen.getByRole('img', { name: 'Trend sparkline' });
    expect(svg).toHaveAttribute('width', '48');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveAttribute('viewBox', '0 0 48 16');

    rerender(<SparklineChart values={[1, 2, 3]} width={999} height={500} />);
    svg = screen.getByRole('img', { name: 'Trend sparkline' });
    expect(svg).toHaveAttribute('width', '320');
    expect(svg).toHaveAttribute('height', '96');
    expect(svg).toHaveAttribute('viewBox', '0 0 320 96');

    rerender(
      <SparklineChart
        values={[1, 2, 3]}
        width={Number.NaN}
        height={Number.POSITIVE_INFINITY}
      />
    );
    svg = screen.getByRole('img', { name: 'Trend sparkline' });
    expect(svg).toHaveAttribute('width', '120');
    expect(svg).toHaveAttribute('height', '32');
  });

  it('handles empty, single-point, flat, negative, -0, and NaN/Infinity series without NaN coordinates', () => {
    const { rerender } = render(<SparklineChart values={[]} data-testid="edge-spark" />);

    const root = screen.getByTestId('edge-spark');
    expect(root).toHaveAttribute('data-empty', 'true');
    let svg = screen.getByRole('img', { name: 'Trend sparkline' });
    expect(svg.querySelector('[data-sparkline-empty="true"]')).not.toBeNull();
    expect(svg.querySelector('polyline')).toBeNull();
    expect(svg.querySelector('polygon')).toBeNull();
    expect(svg.querySelectorAll('circle')).toHaveLength(0);

    // All non-finite values -> empty state
    rerender(
      <SparklineChart
        values={[Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]}
        data-testid="edge-spark"
      />
    );
    expect(root).toHaveAttribute('data-empty', 'true');
    svg = screen.getByRole('img', { name: 'Trend sparkline' });
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).not.toContain('Infinity');

    // Mixed finite + non-finite values -> filters cleanly
    rerender(
      <SparklineChart
        values={[10, Number.NaN, 20, Number.POSITIVE_INFINITY, 30]}
        showDelta
        data-testid="edge-spark"
      />
    );
    expect(root).not.toHaveAttribute('data-empty');
    expect(screen.getByText('+200.0%')).toBeInTheDocument();
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // Single-point line mode
    rerender(<SparklineChart values={[42]} data-testid="edge-spark" />);
    svg = screen.getByRole('img');
    expect(svg.querySelector('polyline')).toHaveAttribute('points', '60,16');
    expect(svg.querySelector('polygon')).toBeNull();
    expect(svg.querySelectorAll('circle')).toHaveLength(1);

    // Flat line mode (all equal)
    rerender(<SparklineChart values={[10, 10, 10]} data-testid="edge-spark" />);
    svg = screen.getByRole('img');
    expect(svg.querySelector('polyline')).toHaveAttribute('points', '4,16 60,16 116,16');
    expect(svg.querySelectorAll('circle')).toHaveLength(2);

    // Negative values + negative zero
    rerender(<SparklineChart values={[-0, -15, -5]} showDelta data-testid="edge-spark" />);
    svg = screen.getByRole('img');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getByText('-100.0%')).toBeInTheDocument();
  });

  it('safely handles adversarial XSS payloads in ariaLabel without injecting markup', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<SparklineChart values={[1, 4, 2, 8]} ariaLabel={payload} />);

    const svg = screen.getByRole('img', { name: payload });
    expect(svg).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
