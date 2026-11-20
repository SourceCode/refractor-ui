import { createRef } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { OpticalCharts, type ChartPoint } from './OpticalCharts';

const METRICS: ChartPoint[] = [
  { label: 'Buttons', value: 400 },
  { label: 'Inputs', value: 300 },
  { label: 'Data Grid', value: 300 },
];

describe('OpticalCharts', () => {
  it('renders bar chart by default, switches active metric on click/hover, and forwards ref', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <OpticalCharts
        ref={ref}
        data={METRICS}
        className="custom-charts"
        data-testid="charts"
      />
    );

    const root = screen.getByTestId('charts');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-optical-charts', 'prism-slab', 'custom-charts');
    expect(root).toHaveAttribute('data-mode', 'bar');
    expect(screen.getByText(/Focused metric: Buttons · 400 imports\/wk/)).toBeInTheDocument();

    const inputsBar = screen.getByRole('button', { name: /Inputs/ });
    fireEvent.mouseEnter(inputsBar);
    expect(screen.getByText(/Focused metric: Inputs · 300 imports\/wk/)).toBeInTheDocument();

    const gridBar = screen.getByRole('button', { name: /Data Grid/ });
    fireEvent.click(gridBar);
    expect(screen.getByText(/Focused metric: Data Grid · 300 imports\/wk/)).toBeInTheDocument();
  });

  it('switches to line and donut modes using only semantic --prism-* tokens (zero raw hex colors)', () => {
    render(
      <PrismThemeProvider
        theme={{
          components: { OpticalCharts: { className: 'theme-charts', style: { maxWidth: '620px' } } },
        }}
      >
        <OpticalCharts data={METRICS} className="local-charts" data-testid="token-charts" />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('token-charts');
    expect(root).toHaveClass('refractor-optical-charts', 'theme-charts', 'local-charts');
    expect(root).toHaveStyle({ maxWidth: '620px' });

    fireEvent.click(screen.getByRole('button', { name: 'line' }));
    expect(root).toHaveAttribute('data-mode', 'line');
    const lineSvg = screen.getByRole('img', { name: 'Component Adoption Telemetry line chart' });
    expect(lineSvg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(lineSvg.innerHTML).toContain('var(--prism-success-main)');
    expect(lineSvg.innerHTML).toContain('var(--prism-success-dark)');
    expect(lineSvg.innerHTML).toContain('var(--prism-primary-main)');

    const pointGroups = lineSvg.querySelectorAll('g');
    const secondPoint = pointGroups.item(1);
    const thirdPoint = pointGroups.item(2);
    expect(secondPoint).not.toBeNull();
    expect(thirdPoint).not.toBeNull();
    fireEvent.mouseEnter(secondPoint as SVGGElement);
    expect(screen.getByText(/Focused metric: Inputs · 300 imports\/wk/)).toBeInTheDocument();
    fireEvent.click(thirdPoint as SVGGElement);
    expect(screen.getByText(/Focused metric: Data Grid · 300 imports\/wk/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'donut' }));
    expect(root).toHaveAttribute('data-mode', 'donut');
    const donutSvg = screen.getByRole('img', { name: 'Component Adoption Telemetry donut chart' });
    expect(donutSvg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(donutSvg.innerHTML).toContain('var(--prism-primary-main)');

    const circles = donutSvg.querySelectorAll('circle');
    const firstCircle = circles.item(0);
    expect(firstCircle).not.toBeNull();
    fireEvent.click(firstCircle as SVGCircleElement);
    expect(screen.getByText(/Focused metric: Buttons · 400 imports\/wk/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Inputs\s*30%/ }));
    expect(screen.getByText(/Focused metric: Inputs · 300 imports\/wk/)).toBeInTheDocument();
  });

  it('handles adversarial zero-value, negative, NaN, single-point, and empty datasets without NaN', () => {
    const zeroData: ChartPoint[] = [
      { label: 'ZeroA', value: 0 },
      { label: 'NegB', value: -50 },
      { label: 'InvalidC', value: Number.NaN },
    ];

    const { rerender } = render(<OpticalCharts data={zeroData} defaultMode="donut" />);
    expect(screen.getAllByText('0%')).toHaveLength(3);
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    fireEvent.click(screen.getByRole('button', { name: 'line' }));
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    rerender(<OpticalCharts data={[{ label: 'Solo', value: 42 }]} defaultMode="line" />);
    expect(screen.getByRole('img').innerHTML).not.toContain('NaN');

    rerender(<OpticalCharts data={[]} data-testid="empty-charts" />);
    expect(screen.getByTestId('empty-charts')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByText('No telemetry points available')).toBeInTheDocument();
    expect(screen.getByText('No chart data to display.')).toBeInTheDocument();
  });

  it('safely renders adversarial XSS payloads in chart title and labels as literal text', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<OpticalCharts title={payload} data={[{ label: payload, value: 10 }]} />);
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(screen.getByText(payload, { selector: 'span' })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
