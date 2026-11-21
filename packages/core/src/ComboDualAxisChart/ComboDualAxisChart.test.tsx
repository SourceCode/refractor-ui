import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ComboDualAxisChart } from './ComboDualAxisChart';

const LABELS = ['Jan', 'Feb', 'Mar', 'Apr'];
const BAR_VALUES = [120, 180, 150, 240];
const LINE_VALUES = [2.5, 4.2, 3.8, 6.0];

describe('ComboDualAxisChart', () => {
  it('renders dual-axis bars and glowing line overlay, forwards ref, merges theme overrides, and uses semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            ComboDualAxisChart: { className: 'theme-combo-chart', style: { maxWidth: '700px' } },
          },
        }}
      >
        <ComboDualAxisChart
          ref={ref}
          labels={LABELS}
          barLabel="Requests"
          barValues={BAR_VALUES}
          barUnit="k"
          lineLabel="Conversion"
          lineValues={LINE_VALUES}
          className="consumer-combo-chart"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="combo-chart"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('combo-chart');
    expect(ref.current).toBe(root);
    expect(ComboDualAxisChart.displayName).toBe('ComboDualAxisChart');
    expect(root).toHaveClass(
      'refractor-combo-dual-axis-chart',
      'prism-slab',
      'theme-combo-chart',
      'consumer-combo-chart'
    );
    expect(root).toHaveStyle({ maxWidth: '700px' });

    const svg = screen.getByRole('img', {
      name: 'Volume vs. Rate dual-axis chart comparing Requests and Conversion',
    });
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');

    // Distinct left and right Y-axis labels and tick readouts
    expect(svg.querySelector('[data-axis="left-label"]')).toHaveTextContent('Requests');
    expect(svg.querySelector('[data-axis="right-label"]')).toHaveTextContent('Conversion');
    const leftTicks = Array.from(svg.querySelectorAll('[data-axis="left-tick"]')).map(
      (el) => el.textContent
    );
    const rightTicks = Array.from(svg.querySelectorAll('[data-axis="right-tick"]')).map(
      (el) => el.textContent
    );
    expect(leftTicks).toEqual(['0k', '60k', '120k', '180k', '240k']);
    expect(rightTicks).toEqual(['0%', '1.5%', '3%', '4.5%', '6%']);

    // Bars & line path & markers
    const bars = svg.querySelectorAll('rect');
    const markers = svg.querySelectorAll('circle');
    expect(bars).toHaveLength(4);
    expect(markers).toHaveLength(4);
    bars.forEach((bar) => {
      expect(bar).toHaveAttribute('fill', 'var(--prism-secondary-main)');
      expect(bar).toHaveAttribute('rx', '4');
    });
    const linePath = svg.querySelector('[data-series="line-path"]');
    expect(linePath).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(linePath?.getAttribute('d')).toContain('M ');
    expect(linePath?.getAttribute('d')).toContain('L ');

    // Default initial correlation readout at index 0
    const readout = screen.getByTestId('combo-dual-axis-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent('Jan · Requests: 120k · Conversion: 2.5%');
  });

  it('selects X index by clicking or keyboard-activating bars and markers (IME-safe)', () => {
    const onSelectIndex = vi.fn();
    render(
      <ComboDualAxisChart
        labels={LABELS}
        barLabel="Orders"
        barValues={BAR_VALUES}
        lineLabel="Margin"
        lineValues={LINE_VALUES}
        lineUnit="%"
        onSelectIndex={onSelectIndex}
      />
    );

    // Click a bar
    const marBar = screen.getByRole('button', { name: 'Mar · Orders: 150' });
    fireEvent.click(marBar);
    expect(onSelectIndex).toHaveBeenCalledWith(2);
    expect(marBar).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('combo-dual-axis-readout')).toHaveTextContent(
      'Mar · Orders: 150 · Margin: 3.8%'
    );

    // Click a circular data marker
    const aprMarker = screen.getByRole('button', { name: 'Apr · Margin: 6%' });
    fireEvent.click(aprMarker);
    expect(onSelectIndex).toHaveBeenLastCalledWith(3);
    expect(aprMarker).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('combo-dual-axis-readout')).toHaveTextContent(
      'Apr · Orders: 240 · Margin: 6%'
    );

    // IME composing Enter must be ignored
    const febBar = screen.getByRole('button', { name: 'Feb · Orders: 180' });
    fireEvent.keyDown(febBar, { key: 'Enter', isComposing: true });
    expect(onSelectIndex).toHaveBeenCalledTimes(2);

    // Unrelated key ignored
    fireEvent.keyDown(febBar, { key: 'Tab' });
    expect(onSelectIndex).toHaveBeenCalledTimes(2);

    // Keyboard Enter on bar
    fireEvent.keyDown(febBar, { key: 'Enter' });
    expect(onSelectIndex).toHaveBeenLastCalledWith(1);
    expect(screen.getByTestId('combo-dual-axis-readout')).toHaveTextContent(
      'Feb · Orders: 180 · Margin: 4.2%'
    );

    // Keyboard Space on marker
    const janMarker = screen.getByRole('button', { name: 'Jan · Margin: 2.5%' });
    fireEvent.keyDown(janMarker, { key: ' ' });
    expect(onSelectIndex).toHaveBeenLastCalledWith(0);
    expect(screen.getByTestId('combo-dual-axis-readout')).toHaveTextContent(
      'Jan · Orders: 120 · Margin: 2.5%'
    );
  });

  it('sanitizes negative/NaN/missing values, preserves negative finite line values, and handles flat/single-point scales & height clamping', () => {
    const { rerender } = render(
      <ComboDualAxisChart
        labels={['A', 'B', 'C']}
        barLabel="Vol"
        barValues={[-50, Number.NaN]}
        lineLabel="Delta"
        lineValues={[-12, Number.POSITIVE_INFINITY, 8]}
        lineUnit="pts"
        height={80}
      />
    );

    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('viewBox', '0 0 580 140');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('combo-dual-axis-readout')).toHaveTextContent(
      'A · Vol: 0 · Delta: -12pts'
    );

    // Select index 2, then shrink labels to 1 with flat positive line value and oversized height
    fireEvent.click(screen.getByRole('button', { name: 'C · Delta: 8pts' }));
    rerender(
      <ComboDualAxisChart
        labels={['Solo']}
        barLabel="Vol"
        barValues={[50]}
        lineLabel="Rate"
        lineValues={[25]}
        height={900}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 580 520');
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('combo-dual-axis-readout')).toHaveTextContent(
      'Solo · Vol: 50 · Rate: 25%'
    );

    // Flat negative line values
    rerender(
      <ComboDualAxisChart
        labels={['X', 'Y']}
        barLabel="Vol"
        barValues={[10, 20]}
        lineLabel="Drift"
        lineValues={[-5, -5]}
        height={Number.NaN}
      />
    );
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', '0 0 580 240');
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // Decreasing line values including negative minimum occurring after index 0
    rerender(
      <ComboDualAxisChart
        labels={['A', 'B', 'C']}
        barLabel="Vol"
        barValues={[40, 20, 60]}
        lineLabel="Delta"
        lineValues={[10, -4, 2]}
        lineUnit="pts"
      />
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    // Flat all-zero line values
    rerender(
      <ComboDualAxisChart
        labels={['X', 'Y']}
        barLabel="Vol"
        barValues={[0, 0]}
        lineLabel="Drift"
        lineValues={[0, 0]}
      />
    );
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');
  });

  it('renders clean empty state when labels is empty and neutralizes XSS payloads', () => {
    const { rerender } = render(
      <ComboDualAxisChart
        labels={[]}
        barLabel="Requests"
        barValues={[]}
        lineLabel="Rate"
        lineValues={[]}
        data-testid="empty-combo"
      />
    );
    expect(screen.getByTestId('empty-combo')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('combo-dual-axis-empty')).toHaveTextContent(
      'No chart data to display.'
    );
    expect(screen.queryByTestId('combo-dual-axis-readout')).toBeNull();

    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <ComboDualAxisChart
        title={payload}
        labels={[payload]}
        barLabel={payload}
        barValues={[10]}
        lineLabel={payload}
        lineValues={[5]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
