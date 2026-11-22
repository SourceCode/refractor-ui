import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  FlameGraphChart,
  type FlameFrameMetrics,
  type FlameFrameNode,
  type FlameGraphOrientation,
  type FlameGraphOrientationMap,
} from './index';

const CUSTOM_PROFILE: FlameFrameNode = {
  id: 'app-root',
  name: 'main',
  module: 'app/server.ts',
  value: 200,
  children: [
    {
      id: 'handler',
      name: 'handleRequest',
      module: 'app/http.ts',
      value: 140,
      tone: 'primary',
      children: [
        {
          id: 'db-query',
          name: 'runQuery',
          module: 'db/client.ts',
          value: 80,
          tone: 'rose',
          children: [
            {
              id: 'db-parse',
              name: 'parseRows',
              module: 'db/parser.ts',
              value: 50,
              tone: 'amber',
            },
          ],
        },
        {
          id: 'render-ssr',
          name: 'renderTree',
          module: 'ui/ssr.ts',
          value: 45,
          tone: 'secondary',
        },
      ],
    },
    {
      id: 'telemetry',
      name: 'flushMetrics',
      value: 40,
    },
  ],
};

describe('FlameGraphChart', () => {
  it('renders default Node/V8 profile in flame orientation, forwards ref, merges theme overrides, and emits only semantic --prism-* tokens', () => {
    const ref = createRef<HTMLDivElement>();
    const orientationMapCheck: FlameGraphOrientationMap = { flame: true, icicle: true };
    expect(orientationMapCheck.flame).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            FlameGraphChart: { className: 'theme-flame', style: { maxWidth: '840px' } },
          },
        }}
      >
        <FlameGraphChart
          ref={ref}
          className="consumer-flame"
          xstyle={{ '--prism-blur-px': '12px' }}
          data-testid="flame-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('flame-root');
    expect(ref.current).toBe(root);
    expect(FlameGraphChart.displayName).toBe('FlameGraphChart');
    expect(root).toHaveClass('refractor-flame-graph-chart', 'prism-slab', 'theme-flame', 'consumer-flame');
    expect(root).toHaveStyle({ maxWidth: '840px' });
    expect(root).toHaveAttribute('data-orientation', 'flame');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-zoomed');

    expect(screen.getByRole('heading', { name: 'CPU Flame / Icicle Graph' })).toBeInTheDocument();

    // No raw color literals in rendered DOM inline styles
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(root.innerHTML).not.toMatch(/\brgba?\s*\(/i);
    expect(root.innerHTML).not.toMatch(/\bhsla?\s*\(/i);

    // Flame orientation puts depth 0 (root) at the bottom row
    const canvas = screen.getByTestId('flame-graph-canvas');
    expect(canvas).toHaveClass('prism-well');
    const rows = Array.from(canvas.querySelectorAll('[data-flame-row]'));
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows[rows.length - 1]).toHaveAttribute('data-flame-row', '0');
    expect(rows[0]).toHaveAttribute('data-flame-row', String(rows.length - 1));

    // All 5 semantic tones exist in the default V8 tree
    expect(canvas.querySelector('[data-tone="primary"]')).not.toBeNull();
    expect(canvas.querySelector('[data-tone="secondary"]')).not.toBeNull();
    expect(canvas.querySelector('[data-tone="amber"]')).not.toBeNull();
    expect(canvas.querySelector('[data-tone="rose"]')).not.toBeNull();
    expect(canvas.querySelector('[data-tone="info"]')).not.toBeNull();

    // Reset Zoom starts disabled when not zoomed
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeDisabled();

    // Recessed live profiler readout displays all 6 metrics for root by default
    const readout = screen.getByTestId('flame-graph-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent('Frame:');
    expect(readout).toHaveTextContent('(root)');
    expect(readout).toHaveTextContent('Module:');
    expect(readout).toHaveTextContent('node:runtime');
    expect(readout).toHaveTextContent('Total CPU:');
    expect(readout).toHaveTextContent('1000ms');
    expect(readout).toHaveTextContent('Self CPU:');
    expect(readout).toHaveTextContent('0ms');
    expect(readout).toHaveTextContent('% of Root:');
    expect(readout).toHaveTextContent('100%');
    expect(readout).toHaveTextContent('Search Match %:');
    expect(screen.getByTestId('flame-readout-search-match')).toHaveTextContent('—');
  });

  it('toggles between Flame and Icicle orientations in both uncontrolled and controlled modes', () => {
    const onOrientationChange = vi.fn<(next: FlameGraphOrientation) => void>();
    const { rerender } = render(
      <FlameGraphChart
        root={CUSTOM_PROFILE}
        defaultOrientation="flame"
        onOrientationChange={onOrientationChange}
        data-testid="orient-flame"
      />
    );

    const flameBtn = screen.getByRole('button', { name: 'Flame' });
    const icicleBtn = screen.getByRole('button', { name: 'Icicle' });
    expect(flameBtn).toHaveAttribute('aria-pressed', 'true');
    expect(icicleBtn).toHaveAttribute('aria-pressed', 'false');

    const canvas = screen.getByTestId('flame-graph-canvas');
    let rows = Array.from(canvas.querySelectorAll('[data-flame-row]'));
    expect(rows[0]).toHaveAttribute('data-flame-row', '3');
    expect(rows[rows.length - 1]).toHaveAttribute('data-flame-row', '0');

    // Switch to Icicle -> root row moves to the TOP (first row)
    fireEvent.click(icicleBtn);
    expect(onOrientationChange).toHaveBeenLastCalledWith('icicle');
    expect(icicleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(flameBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('orient-flame')).toHaveAttribute('data-orientation', 'icicle');

    rows = Array.from(canvas.querySelectorAll('[data-flame-row]'));
    expect(rows[0]).toHaveAttribute('data-flame-row', '0');
    expect(rows[rows.length - 1]).toHaveAttribute('data-flame-row', '3');

    // Switch back to Flame
    fireEvent.click(flameBtn);
    expect(onOrientationChange).toHaveBeenLastCalledWith('flame');
    expect(flameBtn).toHaveAttribute('aria-pressed', 'true');

    // Controlled orientation mode honors external prop
    rerender(
      <FlameGraphChart
        root={CUSTOM_PROFILE}
        orientation="icicle"
        onOrientationChange={onOrientationChange}
        data-testid="orient-flame"
      />
    );
    expect(screen.getByTestId('orient-flame')).toHaveAttribute('data-orientation', 'icicle');
    fireEvent.click(flameBtn);
    expect(onOrientationChange).toHaveBeenLastCalledWith('flame');
    // Still icicle because controlled prop has not changed
    expect(screen.getByTestId('orient-flame')).toHaveAttribute('data-orientation', 'icicle');
  });

  it('zooms into clicked subtrees at 100% width, invokes onSelectFrame with exact metrics, navigates breadcrumbs, and resets zoom', () => {
    const onSelectFrame = vi.fn<(metrics: FlameFrameMetrics) => void>();
    render(<FlameGraphChart root={CUSTOM_PROFILE} onSelectFrame={onSelectFrame} data-testid="zoom-chart" />);

    const canvas = screen.getByTestId('flame-graph-canvas');
    const resetBtn = screen.getByRole('button', { name: 'Reset Zoom' });
    expect(resetBtn).toBeDisabled();

    // Clicking root frame invokes onSelectFrame without marking zoomed
    const rootFrame = canvas.querySelector('[data-frame-id="app-root"]') as HTMLElement;
    fireEvent.click(rootFrame);
    expect(onSelectFrame).toHaveBeenLastCalledWith({
      id: 'app-root',
      name: 'main',
      module: 'app/server.ts',
      totalValue: 200,
      selfValue: 20,
      rootSharePct: 100,
      depth: 0,
    });
    expect(resetBtn).toBeDisabled();

    // Click deep frame `runQuery` (depth 2) -> zooms into runQuery at 100% width
    const queryFrame = canvas.querySelector('[data-frame-id="db-query"]') as HTMLElement;
    fireEvent.click(queryFrame);
    expect(onSelectFrame).toHaveBeenLastCalledWith({
      id: 'db-query',
      name: 'runQuery',
      module: 'db/client.ts',
      totalValue: 80,
      selfValue: 30,
      rootSharePct: 40,
      depth: 2,
    });

    expect(screen.getByTestId('zoom-chart')).toHaveAttribute('data-zoomed', 'true');
    expect(resetBtn).toBeEnabled();

    // Zoomed subtree root occupies 100% width and siblings outside subtree are hidden
    const zoomedQuery = canvas.querySelector('[data-frame-id="db-query"]') as HTMLElement;
    expect(zoomedQuery).toHaveAttribute('data-zoom-root', 'true');
    expect(zoomedQuery.style.left).toBe('0%');
    expect(zoomedQuery.style.width).toBe('100%');
    expect(canvas.querySelector('[data-frame-id="telemetry"]')).toBeNull();
    expect(canvas.querySelector('[data-frame-id="db-parse"]')).not.toBeNull();

    // Breadcrumb trail shows main / handleRequest / Zoom: runQuery
    const breadcrumb = screen.getByTestId('flame-zoom-breadcrumb');
    expect(breadcrumb).toHaveTextContent('main');
    expect(breadcrumb).toHaveTextContent('handleRequest');
    expect(breadcrumb).toHaveTextContent('Zoom: runQuery');

    // Click intermediate ancestor breadcrumb (`handleRequest`) -> zooms out to depth 1
    fireEvent.click(screen.getByRole('button', { name: 'handleRequest' }));
    expect(canvas.querySelector('[data-frame-id="handler"]')).toHaveAttribute('data-zoom-root', 'true');
    expect(canvas.querySelector('[data-frame-id="render-ssr"]')).not.toBeNull();

    // Click active zoom root breadcrumb pill (`Zoom: handleRequest`) -> resets zoom to root
    fireEvent.click(screen.getByRole('button', { name: 'Zoom: handleRequest' }));
    expect(screen.queryByTestId('flame-zoom-breadcrumb')).toBeNull();
    expect(resetBtn).toBeDisabled();
    expect(canvas.querySelector('[data-frame-id="telemetry"]')).not.toBeNull();

    // Zoom again and click root breadcrumb (`main`) -> resets zoom
    fireEvent.click(canvas.querySelector('[data-frame-id="db-query"]') as HTMLElement);
    expect(screen.getByTestId('flame-zoom-breadcrumb')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'main' }));
    expect(screen.queryByTestId('flame-zoom-breadcrumb')).toBeNull();
    expect(resetBtn).toBeDisabled();

    // Zoom again and click Reset Zoom header button
    fireEvent.click(canvas.querySelector('[data-frame-id="handler"]') as HTMLElement);
    expect(resetBtn).toBeEnabled();
    fireEvent.click(resetBtn);
    expect(resetBtn).toBeDisabled();
    expect(screen.queryByTestId('flame-zoom-breadcrumb')).toBeNull();
  });

  it('supports keyboard activation (Enter/Space), IME composition guard, Escape reset, and hover/focus readout updates', () => {
    const onSelectFrame = vi.fn<(metrics: FlameFrameMetrics) => void>();
    const { rerender } = render(
      <FlameGraphChart root={CUSTOM_PROFILE} onSelectFrame={onSelectFrame} />
    );

    const canvas = screen.getByTestId('flame-graph-canvas');
    const readout = screen.getByTestId('flame-graph-readout');
    const telemetryFrame = canvas.querySelector('[data-frame-id="telemetry"]') as HTMLElement;

    // Hover and focus update the live readout; module defaults to 'runtime' when omitted
    fireEvent.mouseEnter(telemetryFrame);
    expect(readout).toHaveTextContent('flushMetrics');
    expect(readout).toHaveTextContent('runtime');
    expect(readout).toHaveTextContent('40ms');
    expect(readout).toHaveTextContent('20%');

    fireEvent.mouseLeave(telemetryFrame);
    expect(readout).toHaveTextContent('main');

    fireEvent.focus(telemetryFrame);
    expect(readout).toHaveTextContent('flushMetrics');
    fireEvent.blur(telemetryFrame);
    expect(readout).toHaveTextContent('main');

    // IME composing Enter and non-action keys are ignored
    fireEvent.keyDown(telemetryFrame, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(telemetryFrame, { key: 'Tab' });
    fireEvent.keyDown(telemetryFrame, { key: 'Escape' });
    expect(onSelectFrame).not.toHaveBeenCalled();

    // Enter activates and zooms frame
    fireEvent.keyDown(telemetryFrame, { key: 'Enter' });
    expect(onSelectFrame).toHaveBeenCalledTimes(1);
    expect(onSelectFrame).toHaveBeenLastCalledWith({
      id: 'telemetry',
      name: 'flushMetrics',
      module: 'runtime',
      totalValue: 40,
      selfValue: 40,
      rootSharePct: 20,
      depth: 1,
    });
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeEnabled();

    // Escape on focused frame resets zoom
    const zoomedTelemetry = canvas.querySelector('[data-frame-id="telemetry"]') as HTMLElement;
    fireEvent.keyDown(zoomedTelemetry, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeDisabled();

    // Space activates and zooms another frame
    const ssrFrame = canvas.querySelector('[data-frame-id="render-ssr"]') as HTMLElement;
    fireEvent.keyDown(ssrFrame, { key: ' ' });
    expect(onSelectFrame).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('flame-zoom-breadcrumb')).toHaveTextContent('Zoom: renderTree');

    // Swapping root to a smaller tree without the old pathKey safely falls back to the new root
    fireEvent.mouseEnter(canvas.querySelector('[data-frame-id="render-ssr"]') as HTMLElement);
    rerender(
      <FlameGraphChart
        root={{ id: 'fresh', name: 'freshRoot', module: 'fresh.ts', value: 50 }}
        onSelectFrame={onSelectFrame}
      />
    );
    expect(screen.queryByTestId('flame-zoom-breadcrumb')).toBeNull();
    expect(screen.getByTestId('flame-graph-readout')).toHaveTextContent('freshRoot');
  });

  it('highlights matching frames and modules via search, calculates non-overlapping match share %, and handles IME-safe Escape in search', () => {
    render(<FlameGraphChart />);

    const searchInput = screen.getByRole('searchbox', { name: 'Filter stack frames' });
    const canvas = screen.getByTestId('flame-graph-canvas');

    // Search by module prefix "db/" matches executeQueryPlan (310ms) and its two children (110 + 175ms).
    // Merged non-overlapping match share MUST be 31%, NOT double-counted 59.5%!
    fireEvent.change(searchInput, { target: { value: 'db/' } });
    expect(screen.getByTestId('flame-search-match-pill')).toHaveTextContent('31%');
    expect(screen.getByTestId('flame-readout-search-match')).toHaveTextContent('31%');
    expect(canvas.querySelector('[data-frame-id="query-exec"]')).toHaveAttribute('data-matched', 'true');
    expect(canvas.querySelector('[data-frame-id="sql-parse"]')).toHaveAttribute('data-matched', 'true');
    expect(canvas.querySelector('[data-frame-id="row-hydrate"]')).toHaveAttribute('data-matched', 'true');
    expect(canvas.querySelector('[data-frame-id="v8-gc"]')).toHaveAttribute('data-matched', 'false');

    // Search by frame name renders literal <mark> highlight elements
    fireEvent.change(searchInput, { target: { value: 'JSON' } });
    expect(screen.getByTestId('flame-search-match-pill')).toHaveTextContent('21%');
    expect(canvas.querySelectorAll('mark').length).toBeGreaterThanOrEqual(1);

    // Non-matching search reports 0%
    fireEvent.change(searchInput, { target: { value: 'nonexistent-symbol' } });
    expect(screen.getByTestId('flame-search-match-pill')).toHaveTextContent('0%');
    expect(screen.getByTestId('flame-readout-search-match')).toHaveTextContent('0%');

    // Zoom in, then verify IME composing Escape in search does nothing
    fireEvent.click(canvas.querySelector('[data-frame-id="http-server"]') as HTMLElement);
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeEnabled();
    fireEvent.keyDown(searchInput, { key: 'Escape', isComposing: true });
    expect(searchInput).toHaveValue('nonexistent-symbol');

    // Non-Escape key in search input is a no-op
    fireEvent.keyDown(searchInput, { key: 'Enter' });
    expect(searchInput).toHaveValue('nonexistent-symbol');

    // First real Escape clears search query while preserving zoom
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(searchInput).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeEnabled();

    // Second Escape while search is empty resets zoom
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeDisabled();

    // Escape when search is empty and not zoomed is a safe no-op
    fireEvent.keyDown(searchInput, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeDisabled();
  });

  it('renders clean role="status" empty states for null or non-positive roots and sanitizes invalid children, over-budget children, and decimal units', () => {
    const { rerender } = render(<FlameGraphChart root={null} data-testid="empty-chart" />);
    expect(screen.getByTestId('empty-chart')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No CPU stack profile samples available.');
    expect(screen.queryByTestId('flame-graph-canvas')).toBeNull();
    expect(screen.queryByTestId('flame-graph-readout')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reset Zoom' })).toBeDisabled();

    // Non-positive and non-finite roots also yield the empty status state
    for (const invalidVal of [0, -15, Number.NaN, Number.POSITIVE_INFINITY]) {
      rerender(
        <FlameGraphChart
          root={{ id: 'bad', name: 'badRoot', value: invalidVal }}
          data-testid="empty-chart"
        />
      );
      expect(screen.getByTestId('empty-chart')).toHaveAttribute('data-empty', 'true');
      expect(screen.getByRole('status')).toBeInTheDocument();
    }

    // Valid root with invalid children, over-budget children, decimal numbers, and blank unit
    const onSelectFrame = vi.fn<(metrics: FlameFrameMetrics) => void>();
    rerender(
      <FlameGraphChart
        unit=""
        onSelectFrame={onSelectFrame}
        root={{
          id: 'decimal-root',
          name: 'decimalRoot',
          module: '   ',
          value: 100.25,
          children: [
            { id: 'bad-0', name: 'zero', value: 0 },
            { id: 'bad-neg', name: 'neg', value: -5 },
            { id: 'bad-nan', name: 'nan', value: Number.NaN },
            { id: 'over-a', name: 'overA', value: 70.5 },
            { id: 'over-b', name: 'overB', value: 60.5 },
          ],
        }}
      />
    );

    const canvas = screen.getByTestId('flame-graph-canvas');
    expect(canvas.querySelectorAll('[role="button"]')).toHaveLength(3);

    // Over-budget children clamp parent selfValue to 0 and stay within 100% combined width
    fireEvent.click(canvas.querySelector('[data-frame-id="decimal-root"]') as HTMLElement);
    expect(onSelectFrame).toHaveBeenLastCalledWith({
      id: 'decimal-root',
      name: 'decimalRoot',
      module: 'runtime',
      totalValue: 100.25,
      selfValue: 0,
      rootSharePct: 100,
      depth: 0,
    });
    expect(screen.getByTestId('flame-graph-readout')).toHaveTextContent('100.25');

    const overA = canvas.querySelector('[data-frame-id="over-a"]') as HTMLElement;
    const overB = canvas.querySelector('[data-frame-id="over-b"]') as HTMLElement;
    const combinedWidth = parseFloat(overA.style.width) + parseFloat(overB.style.width);
    expect(combinedWidth).toBeLessThanOrEqual(100.01);
  });

  it('defends against cyclic trees, caps recursion at MAX_DEPTH = 12, handles prototype keys, and neutralizes XSS/regex payloads', () => {
    // 1. Cyclic object graph must terminate cleanly
    const cyclicRoot: FlameFrameNode & { children: FlameFrameNode[] } = {
      id: '__proto__',
      name: 'cyclicRoot',
      module: 'constructor',
      value: 100,
      children: [],
    };
    const cyclicChild: FlameFrameNode & { children: FlameFrameNode[] } = {
      id: 'prototype',
      name: 'cyclicChild',
      value: 60,
      children: [],
    };
    cyclicChild.children.push(cyclicRoot, cyclicChild);
    cyclicRoot.children.push(cyclicChild);

    const { rerender } = render(<FlameGraphChart root={cyclicRoot} />);
    const cyclicCanvas = screen.getByTestId('flame-graph-canvas');
    expect(cyclicCanvas.querySelectorAll('[role="button"]')).toHaveLength(2);
    expect(Object.prototype.hasOwnProperty.call({}, 'cyclicRoot')).toBe(false);

    // 2. 18-level deep stack must cap strictly at MAX_DEPTH = 12 (depths 0..12 => 13 frames)
    let deepNode: FlameFrameNode = { id: 'level-17', name: 'fn17', value: 10 };
    for (let depth = 16; depth >= 0; depth -= 1) {
      deepNode = {
        id: `level-${depth}`,
        name: `fn${depth}`,
        value: 10 + (17 - depth),
        children: [deepNode],
      };
    }

    rerender(<FlameGraphChart root={deepNode} />);
    const deepCanvas = screen.getByTestId('flame-graph-canvas');
    expect(deepCanvas.querySelector('[data-frame-id="level-12"]')).not.toBeNull();
    expect(deepCanvas.querySelector('[data-frame-id="level-13"]')).toBeNull();
    expect(deepCanvas.querySelectorAll('[data-flame-row]')).toHaveLength(13);

    // 3. XSS & regex-special characters in title, node, and search are safely rendered literally
    const xssPayload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    const regexPayload = '([.*+?^${}()|[\\]\\\\])';
    rerender(
      <FlameGraphChart
        title={xssPayload}
        root={{
          id: 'xss-root',
          name: `${xssPayload} ${regexPayload}`,
          module: xssPayload,
          value: 50,
        }}
      />
    );
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();

    const searchInput = screen.getByRole('searchbox', { name: 'Filter stack frames' });
    fireEvent.change(searchInput, { target: { value: regexPayload } });
    expect(screen.getByTestId('flame-search-match-pill')).toHaveTextContent('100%');
  });
});
