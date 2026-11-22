import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_PARALLEL_AXES,
  DEFAULT_PARALLEL_RECORDS,
  ParallelCoordinatesPlot,
  type ParallelAxisSpec,
  type ParallelRecord,
} from './index';

describe('ParallelCoordinatesPlot', () => {
  it('renders 5 default ML benchmark axes, 7 default models, group pills, ref, theme overrides, and semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            ParallelCoordinatesPlot: {
              className: 'theme-parallel',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <ParallelCoordinatesPlot
          ref={ref}
          className="consumer-parallel"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="parallel-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('parallel-root');
    expect(ref.current).toBe(root);
    expect(ParallelCoordinatesPlot.displayName).toBe('ParallelCoordinatesPlot');
    expect(root).toHaveClass(
      'refractor-parallel-coordinates-plot',
      'prism-slab',
      'theme-parallel',
      'consumer-parallel',
      'min-w-0',
      'max-w-full'
    );
    expect(root).toHaveStyle({ maxWidth: '720px' });
    expect(root).toHaveAttribute('data-axes-count', '5');
    expect(root).toHaveAttribute('data-record-count', '7');
    expect(root).toHaveAttribute('data-active-group', 'all');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Parallel Coordinates Analysis' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('parallel-coordinates-count-badge')).toHaveTextContent(
      '7 records · 5 axes'
    );

    // Group filter pills (All + 3 unique groups)
    const filterGroup = screen.getByTestId('parallel-coordinates-group-filters');
    expect(filterGroup).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^All\s*7$/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: /^Frontier\s*2$/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: /^Balanced\s*3$/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: /^Edge\s*2$/ })).toHaveAttribute(
      'aria-pressed',
      'false'
    );

    // Responsive 480x230 SVG inside prism-well
    const svg = screen.getByRole('img', {
      name: 'Parallel Coordinates Analysis parallel coordinates plot across 5 axes and 7 records',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 480 230');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');

    // Zero raw hex/rgb/hsl colors in SVG markup; strictly --prism-* CSS variables
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-info-main)');
    expect(svg.innerHTML).toContain('var(--prism-divider)');
    expect(svg.innerHTML).not.toContain('NaN');

    // Verify default 5 axis headers and ticks
    expect(svg).toHaveTextContent('Accuracy %');
    expect(svg).toHaveTextContent('Latency ms');
    expect(svg).toHaveTextContent('VRAM GB');
    expect(svg).toHaveTextContent('Throughput');
    expect(svg).toHaveTextContent('Cost $/1M');
    expect(svg.querySelectorAll('[data-role="axis-rail"]')).toHaveLength(5);
    expect(svg.querySelectorAll('[data-role="axis-max-tick"]')).toHaveLength(5);
    expect(svg.querySelectorAll('[data-role="axis-mid-tick"]')).toHaveLength(5);
    expect(svg.querySelectorAll('[data-role="axis-min-tick"]')).toHaveLength(5);
    expect(svg.querySelectorAll('[data-role="record-trajectory"]')).toHaveLength(7);

    // Recessed live inspector default guidance
    const inspector = screen.getByTestId('parallel-coordinates-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveTextContent('7 trajectories');
    expect(DEFAULT_PARALLEL_AXES).toHaveLength(5);
    expect(DEFAULT_PARALLEL_RECORDS).toHaveLength(7);
  });

  it('elevates clicked trajectory with strokeWidth=3 and vertex dots, dims siblings, fires onSelectRecord, and populates exact dimension badges', () => {
    const received: ParallelRecord[] = [];
    const onSelectRecord = vi.fn((record: ParallelRecord) => {
      received.push(record);
    });

    render(<ParallelCoordinatesPlot title="LLM Benchmarks" onSelectRecord={onSelectRecord} />);

    const ultraPath = screen.getByRole('button', { name: /Prism Ultra 70B \(Frontier\):/ });
    const proPath = screen.getByRole('button', { name: /Prism Pro 32B \(Frontier\):/ });

    fireEvent.click(ultraPath);

    expect(onSelectRecord).toHaveBeenCalledTimes(1);
    expect(received[0]?.id).toBe('prism-ultra');
    expect(ultraPath).toHaveAttribute('aria-pressed', 'true');
    expect(ultraPath).toHaveAttribute('data-active', 'true');
    expect(ultraPath).toHaveAttribute('data-selected', 'true');
    expect(ultraPath).toHaveAttribute('data-dimmed', 'false');

    const activeLine = ultraPath.querySelector('[data-role="record-polyline"]');
    expect(activeLine).toHaveAttribute('stroke-width', '3');
    expect(activeLine).toHaveAttribute('stroke-opacity', '1');
    expect(ultraPath.querySelectorAll('[data-role="vertex-dot"]')).toHaveLength(5);

    // Sibling path is cleanly dimmed without vertex dots
    expect(proPath).toHaveAttribute('aria-pressed', 'false');
    expect(proPath).toHaveAttribute('data-active', 'false');
    expect(proPath).toHaveAttribute('data-dimmed', 'true');
    const siblingLine = proPath.querySelector('[data-role="record-polyline"]');
    expect(siblingLine).toHaveAttribute('stroke-width', '1.25');
    expect(siblingLine).toHaveAttribute('stroke-opacity', '0.18');
    expect(proPath.querySelectorAll('[data-role="vertex-dot"]')).toHaveLength(0);

    // Inspector lists Record Name + exact Axis: Value Unit badges across all 5 dimensions
    const inspector = screen.getByTestId('parallel-coordinates-inspector');
    expect(screen.getByTestId('parallel-inspector-name')).toHaveTextContent('Prism Ultra 70B');
    expect(inspector).toHaveTextContent('Frontier');
    expect(screen.getByTestId('parallel-inspector-badge-accuracy')).toHaveTextContent(
      'Accuracy:96.4 %'
    );
    expect(screen.getByTestId('parallel-inspector-badge-latency')).toHaveTextContent(
      'Latency:92 ms'
    );
    expect(screen.getByTestId('parallel-inspector-badge-vram')).toHaveTextContent('VRAM:72 GB');
    expect(screen.getByTestId('parallel-inspector-badge-throughput')).toHaveTextContent(
      'Throughput:68'
    );
    expect(screen.getByTestId('parallel-inspector-badge-cost')).toHaveTextContent(
      'Cost:12.5 $/1M'
    );
  });

  it('supports IME-safe Enter/Space activation, ArrowUp/ArrowDown wrap-around navigation, focus/blur preview, and Escape clear', () => {
    const onSelectRecord = vi.fn();
    render(<ParallelCoordinatesPlot onSelectRecord={onSelectRecord} />);

    const ultraPath = screen.getByRole('button', { name: /Prism Ultra 70B/ });
    const proPath = screen.getByRole('button', { name: /Prism Pro 32B/ });
    const lumenPath = screen.getByRole('button', { name: /Lumen Mini 3B/ });

    // Focus previews trajectory without triggering onSelectRecord
    fireEvent.focus(proPath);
    expect(proPath).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('parallel-inspector-name')).toHaveTextContent('Prism Pro 32B');
    expect(onSelectRecord).not.toHaveBeenCalled();

    // Blur while another record is focused does not drop the new focus
    fireEvent.focus(ultraPath);
    fireEvent.blur(proPath);
    expect(screen.getByTestId('parallel-inspector-name')).toHaveTextContent('Prism Ultra 70B');

    // Blur active focused record returns to idle prompt
    fireEvent.blur(ultraPath);
    expect(screen.queryByTestId('parallel-inspector-name')).toBeNull();

    // IME composing Enter & ArrowDown must be ignored
    fireEvent.keyDown(ultraPath, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(ultraPath, { key: 'ArrowDown', isComposing: true });
    expect(onSelectRecord).not.toHaveBeenCalled();

    // Unhandled key must be ignored
    fireEvent.keyDown(ultraPath, { key: 'a' });
    expect(onSelectRecord).not.toHaveBeenCalled();

    // Enter selects Prism Ultra 70B
    fireEvent.keyDown(ultraPath, { key: 'Enter' });
    expect(onSelectRecord).toHaveBeenCalledTimes(1);
    expect(ultraPath).toHaveAttribute('data-selected', 'true');

    // ArrowDown moves to Prism Pro 32B (index 0 -> 1) and transfers focus
    fireEvent.keyDown(ultraPath, { key: 'ArrowDown' });
    expect(onSelectRecord).toHaveBeenCalledTimes(2);
    expect(proPath).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(proPath);

    // ArrowUp moves back to Prism Ultra 70B (index 1 -> 0)
    fireEvent.keyDown(proPath, { key: 'ArrowUp' });
    expect(onSelectRecord).toHaveBeenCalledTimes(3);
    expect(ultraPath).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(ultraPath);

    // ArrowUp wraps from index 0 -> last record (Lumen Mini 3B)
    fireEvent.keyDown(ultraPath, { key: 'ArrowUp' });
    expect(onSelectRecord).toHaveBeenCalledTimes(4);
    expect(lumenPath).toHaveAttribute('data-selected', 'true');
    expect(document.activeElement).toBe(lumenPath);

    // ArrowDown wraps from last record -> index 0 (Prism Ultra 70B)
    fireEvent.keyDown(lumenPath, { key: 'ArrowDown' });
    expect(onSelectRecord).toHaveBeenCalledTimes(5);
    expect(ultraPath).toHaveAttribute('data-selected', 'true');

    // Space activates Prism Pro 32B
    fireEvent.keyDown(proPath, { key: ' ' });
    expect(onSelectRecord).toHaveBeenCalledTimes(6);
    expect(proPath).toHaveAttribute('data-selected', 'true');

    // Escape clears active selection
    fireEvent.keyDown(proPath, { key: 'Escape' });
    expect(proPath).toHaveAttribute('data-selected', 'false');
    expect(screen.queryByTestId('parallel-inspector-name')).toBeNull();
  });

  it('filters highlighted trajectories via group pills, shows context lines, and resets cleanly on prop change', () => {
    const { rerender } = render(<ParallelCoordinatesPlot data-testid="filter-plot" />);

    const ultraPath = screen.getByRole('button', { name: /Prism Ultra 70B/ });
    fireEvent.click(ultraPath);
    expect(screen.getByTestId('parallel-inspector-name')).toHaveTextContent('Prism Ultra 70B');

    // Filter to Edge group (2 models, 5 context lines)
    const edgeButton = screen.getByRole('button', { name: /^Edge\s*2$/ });
    fireEvent.click(edgeButton);

    const root = screen.getByTestId('filter-plot');
    expect(root).toHaveAttribute('data-active-group', 'Edge');
    expect(root).toHaveAttribute('data-record-count', '2');
    expect(edgeButton).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('parallel-coordinates-count-badge')).toHaveTextContent(
      '2/7 records · 5 axes'
    );
    expect(screen.getByTestId('parallel-coordinates-inspector')).toHaveTextContent(
      'Edge: 2 shown'
    );

    const svg = screen.getByRole('img');
    expect(svg.querySelectorAll('[data-role="record-trajectory"]')).toHaveLength(2);
    expect(svg.querySelectorAll('[data-role="filtered-context-line"]')).toHaveLength(5);

    // Restore All trajectories
    fireEvent.click(screen.getByRole('button', { name: /^All\s*7$/ }));
    expect(root).toHaveAttribute('data-active-group', 'all');
    expect(svg.querySelectorAll('[data-role="record-trajectory"]')).toHaveLength(7);
    expect(svg.querySelectorAll('[data-role="filtered-context-line"]')).toHaveLength(0);

    // Activate Frontier and select/focus a record, then rerender with records that drop them -> falls back cleanly
    fireEvent.click(screen.getByRole('button', { name: /^Frontier\s*2$/ }));
    expect(root).toHaveAttribute('data-active-group', 'Frontier');
    const frontierUltra = screen.getByRole('button', { name: /Prism Ultra 70B/ });
    fireEvent.click(frontierUltra);
    fireEvent.focus(frontierUltra);
    expect(screen.getByTestId('parallel-inspector-name')).toHaveTextContent('Prism Ultra 70B');

    const ungroupedRecords: ParallelRecord[] = [
      { id: 'solo', label: 'Solo Model', values: [90, 25] },
    ];
    const twoAxes: ParallelAxisSpec[] = [
      { id: 'a', label: 'Score %', unit: '%' },
      { id: 'b', label: 'Very Long Dimension Metric Name', unit: 'ms' },
    ];
    rerender(
      <ParallelCoordinatesPlot
        data-testid="filter-plot"
        axes={twoAxes}
        records={ungroupedRecords}
      />
    );

    expect(root).toHaveAttribute('data-active-group', 'all');
    expect(screen.queryByTestId('parallel-inspector-name')).toBeNull();
    expect(screen.queryByTestId('parallel-coordinates-group-filters')).toBeNull();
    expect(screen.getByTestId('parallel-coordinates-count-badge')).toHaveTextContent(
      '1 record · 2 axes'
    );
    // Label already ending in unit is not duplicated ('Score %', not 'Score % %')
    expect(screen.getByRole('img')).toHaveTextContent('Score %');
    expect(screen.getByRole('img').textContent).not.toContain('Score % %');
  });

  it('auto-cycles all 5 tones, handles inferred/inverted/constant domains, partial missing values, and truncates long axis labels', () => {
    const customAxes: ParallelAxisSpec[] = [
      { id: 'inferred', label: 'Inferred Score' },
      { id: 'inverted', label: 'Inverted Bounds', min: 100, max: 0 },
      { id: 'const-nz', label: 'Constant Non-Zero' },
      { id: 'const-zero', label: 'Constant Zero' },
      { id: 'all-missing', label: 'Supercalifragilistic Dimension Label', unit: 'u' },
    ];

    const customRecords: ParallelRecord[] = [
      { id: 'r1', label: 'R1', values: [10, 20, 50, -0, Number.NaN] },
      { id: 'r2', label: 'R2', values: [30, 80, 50, 0, Number.POSITIVE_INFINITY] },
      { id: 'r3', label: 'R3', values: [20, 120, 50, 0] },
      { id: 'r4', label: 'R4', values: [40, -10, 50, 0] },
      { id: 'r5', label: 'R5', values: [50, 60, 50, 0] },
      { id: 'invalid-only', label: 'Ignored', values: [Number.NaN, Number.NaN] },
    ];

    render(<ParallelCoordinatesPlot axes={customAxes} records={customRecords} />);

    const svg = screen.getByRole('img');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.querySelectorAll('[data-role="record-trajectory"]')).toHaveLength(5);
    // All 5 semantic tone tokens cycled automatically
    expect(svg.innerHTML).toContain('var(--prism-primary-main)');
    expect(svg.innerHTML).toContain('var(--prism-secondary-main)');
    expect(svg.innerHTML).toContain('var(--prism-success-main)');
    expect(svg.innerHTML).toContain('var(--prism-warning-main)');
    expect(svg.innerHTML).toContain('var(--prism-info-main)');
    // Truncated long axis header contains ellipsis
    expect(svg.textContent).toContain('…');

    // Click R1 -> vertex dots rendered only for the 4 finite axes; 5th axis shows '—' in inspector
    const r1Path = screen.getByRole('button', { name: /R1:.*all-missing|R1:.*missing/ });
    fireEvent.click(r1Path);
    expect(r1Path.querySelectorAll('[data-role="vertex-dot"]')).toHaveLength(4);
    expect(screen.getByTestId('parallel-inspector-badge-all-missing')).toHaveTextContent(
      'Supercalifragilistic Dimension Label:—'
    );
    expect(screen.getByTestId('parallel-inspector-badge-const-zero')).toHaveTextContent(
      'Constant Zero:0'
    );
  });

  it('renders clean role="status" empty states and resists prototype-pollution keys and XSS payloads', () => {
    const { rerender } = render(
      <ParallelCoordinatesPlot
        axes={[{ id: 'only-one', label: 'Single Axis' }]}
        records={[{ id: 'r1', label: 'Only', values: [50] }]}
        data-testid="empty-plot"
      />
    );

    expect(screen.getByTestId('empty-plot')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Provide at least 2 axes to plot parallel coordinates.'
    );
    expect(screen.queryByTestId('parallel-coordinates-inspector')).toBeNull();

    // Empty records array
    rerender(<ParallelCoordinatesPlot records={[]} data-testid="empty-plot" />);
    expect(screen.getByTestId('empty-plot')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'No records available to plot parallel coordinates.'
    );

    // Records containing only non-finite values
    rerender(
      <ParallelCoordinatesPlot
        records={[
          {
            id: 'bad',
            label: 'Bad',
            values: [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
          },
        ]}
        data-testid="empty-plot"
      />
    );
    expect(screen.getByTestId('empty-plot')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'No records available to plot parallel coordinates.'
    );

    // Prototype-polluting identifiers and XSS strings rendered strictly as safe text
    const xssPayload = '<script>window.__pcpXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <ParallelCoordinatesPlot
        title={xssPayload}
        axes={[
          { id: '__proto__', label: xssPayload, min: 0, max: 100 },
          { id: 'constructor', label: 'Metric B', min: 0, max: 100 },
        ]}
        records={[
          {
            id: 'prototype',
            label: xssPayload,
            group: '__proto__',
            values: [42, 84],
          },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(({} as Record<string, string>)['__proto__']).not.toBe('polluted');
  });
});
