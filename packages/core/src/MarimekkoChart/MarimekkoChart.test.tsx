import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_MARIMEKKO_COLUMNS,
  MarimekkoChart,
  type MarimekkoColumn,
  type MarimekkoSelection,
} from './index';

describe('MarimekkoChart', () => {
  it('renders default 4 regional columns with proportional 2D geometry, ref forwarding, theme overrides, and semantic tokens only', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            MarimekkoChart: { className: 'theme-marimekko', style: { maxWidth: '760px' } },
          },
        }}
      >
        <MarimekkoChart
          ref={ref}
          className="consumer-marimekko"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="marimekko-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('marimekko-root');
    expect(ref.current).toBe(root);
    expect(MarimekkoChart.displayName).toBe('MarimekkoChart');
    expect(DEFAULT_MARIMEKKO_COLUMNS).toHaveLength(4);
    expect(root).toHaveClass(
      'refractor-marimekko-chart',
      'prism-slab',
      'theme-marimekko',
      'consumer-marimekko'
    );
    expect(root).toHaveStyle({ maxWidth: '760px' });
    expect(screen.getByRole('heading', { name: 'Market Share Marimekko' })).toBeInTheDocument();

    const totalPill = screen.getByTestId('marimekko-total-pill');
    expect(totalPill).toHaveTextContent('Total');
    expect(totalPill).toHaveTextContent('$500M');

    const svg = screen.getByRole('img', {
      name: 'Market Share Marimekko proportional marimekko chart across 4 columns',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 460 220');
    expect(svg).toHaveClass('refractor-marimekko-chart__svg', 'w-full', 'h-auto', 'select-none');
    expect(svg.parentElement).toHaveClass('prism-well');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // All 5 semantic --prism-* tones appear across default legend pills and SVG segments
    const legendGroup = screen.getByRole('group', { name: 'Segment series legend' });
    const legendButtons = legendGroup.querySelectorAll('button');
    expect(legendButtons).toHaveLength(5);
    expect(legendButtons[0]).toHaveAttribute('data-tone', 'primary');
    expect(legendButtons[1]).toHaveAttribute('data-tone', 'secondary');
    expect(legendButtons[2]).toHaveAttribute('data-tone', 'emerald');
    expect(legendButtons[3]).toHaveAttribute('data-tone', 'amber');
    expect(legendButtons[4]).toHaveAttribute('data-tone', 'info');

    const rects = svg.querySelectorAll('rect[role="button"]');
    expect(rects).toHaveLength(20);

    // Check semantic fills on first column's 5 stacked segments
    const naCloud = svg.querySelector('rect[data-column-id="na"][data-segment-id="cloud"]');
    const naAi = svg.querySelector('rect[data-column-id="na"][data-segment-id="ai"]');
    const naSec = svg.querySelector('rect[data-column-id="na"][data-segment-id="security"]');
    const naAna = svg.querySelector('rect[data-column-id="na"][data-segment-id="analytics"]');
    const naEdge = svg.querySelector('rect[data-column-id="na"][data-segment-id="edge"]');

    expect(naCloud).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(naAi).toHaveAttribute('fill', 'var(--prism-secondary-main)');
    expect(naSec).toHaveAttribute('fill', 'var(--prism-success-main)');
    expect(naAna).toHaveAttribute('fill', 'var(--prism-warning-main)');
    expect(naEdge).toHaveAttribute('fill', 'var(--prism-info-main)');

    // Verify true 2D horizontal proportionality (NA=200, EMEA=150, APAC=100, LATAM=50 -> 4:3:2:1)
    const emeaCloud = svg.querySelector('rect[data-column-id="emea"][data-segment-id="cloud"]');
    const apacCloud = svg.querySelector('rect[data-column-id="apac"][data-segment-id="cloud"]');
    const latamCloud = svg.querySelector('rect[data-column-id="latam"][data-segment-id="cloud"]');

    const naWidth = Number(naCloud?.getAttribute('width'));
    const emeaWidth = Number(emeaCloud?.getAttribute('width'));
    const apacWidth = Number(apacCloud?.getAttribute('width'));
    const latamWidth = Number(latamCloud?.getAttribute('width'));

    expect(naWidth / latamWidth).toBeCloseTo(4, 2);
    expect(emeaWidth / latamWidth).toBeCloseTo(3, 2);
    expect(apacWidth / latamWidth).toBeCloseTo(2, 2);

    // Crisp optical gap between columns
    const naX = Number(naCloud?.getAttribute('x'));
    const emeaX = Number(emeaCloud?.getAttribute('x'));
    expect(emeaX).toBeGreaterThan(naX + naWidth);

    // Vertical segments within each column sum to 100% plot height (164px)
    const naRects = Array.from(svg.querySelectorAll('rect[data-column-id="na"]'));
    const naHeightSum = naRects.reduce((sum, r) => sum + Number(r.getAttribute('height')), 0);
    expect(naHeightSum).toBeCloseTo(164, 1);

    // NA Cloud (80) vs NA AI (50) height ratio equals 80/50 = 1.6
    expect(Number(naCloud?.getAttribute('height')) / Number(naAi?.getAttribute('height'))).toBeCloseTo(
      1.6,
      2
    );

    const inspector = screen.getByTestId('marimekko-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveTextContent(
      'Select or focus any segment to inspect column share and global share.'
    );
    expect(inspector).toHaveTextContent('Total: $500M');
  });

  it('highlights focused/selected segment, dims unrelated segments, updates inspector, and invokes onSelectSegment', () => {
    const onSelectSegment = vi.fn<(selection: MarimekkoSelection) => void>();
    render(<MarimekkoChart onSelectSegment={onSelectSegment} />);

    const svg = screen.getByRole('img');
    const naCloud = svg.querySelector(
      'rect[data-column-id="na"][data-segment-id="cloud"]'
    ) as SVGRectElement;
    const emeaAi = svg.querySelector(
      'rect[data-column-id="emea"][data-segment-id="ai"]'
    ) as SVGRectElement;

    // Focus highlights without firing onSelectSegment
    fireEvent.focus(emeaAi);
    expect(onSelectSegment).not.toHaveBeenCalled();
    expect(emeaAi).toHaveAttribute('data-highlighted', 'true');
    expect(naCloud).toHaveAttribute('data-dimmed', 'true');

    const inspector = screen.getByTestId('marimekko-inspector');
    expect(inspector).toHaveTextContent('EMEA');
    expect(inspector).toHaveTextContent('AI Suite');
    expect(inspector).toHaveTextContent('$39M');
    expect(inspector).toHaveTextContent('26% Column Share');
    expect(inspector).toHaveTextContent('7.8% Global Share');

    // Blur a different element does not clear current focus
    fireEvent.blur(naCloud);
    expect(emeaAi).toHaveAttribute('data-highlighted', 'true');

    // Blur the focused element returns to idle state
    fireEvent.blur(emeaAi);
    expect(inspector).toHaveTextContent(
      'Select or focus any segment to inspect column share and global share.'
    );

    // Clicking a segment selects it and invokes onSelectSegment
    fireEvent.click(naCloud);
    expect(onSelectSegment).toHaveBeenCalledTimes(1);
    expect(onSelectSegment).toHaveBeenLastCalledWith({
      columnId: 'na',
      columnLabel: 'North America',
      segmentId: 'cloud',
      segmentLabel: 'Cloud Core',
      value: 80,
      columnSharePct: 40,
      totalSharePct: 16,
    });
    expect(naCloud).toHaveAttribute('aria-pressed', 'true');
    expect(naCloud).toHaveAttribute('data-selected', 'true');
    expect(naCloud).toHaveAttribute('data-highlighted', 'true');
    expect(emeaAi).toHaveAttribute('data-dimmed', 'true');
    expect(inspector).toHaveTextContent('North America');
    expect(inspector).toHaveTextContent('Cloud Core');
    expect(inspector).toHaveTextContent('$80M');
    expect(inspector).toHaveTextContent('40% Column Share');
    expect(inspector).toHaveTextContent('16% Global Share');
  });

  it('supports IME-safe Enter/Space activation and 2D ArrowLeft/ArrowRight/ArrowUp/ArrowDown navigation with uneven column counts', () => {
    const onSelectSegment = vi.fn<(selection: MarimekkoSelection) => void>();
    const unevenColumns: MarimekkoColumn[] = [
      {
        id: 'west',
        label: 'West',
        segments: [
          { id: 'a', label: 'Alpha', value: 50, tone: 'primary' },
          { id: 'b', label: 'Beta', value: 30, tone: 'secondary' },
          { id: 'c', label: 'Gamma', value: 20, tone: 'emerald' },
        ],
      },
      {
        id: 'east',
        label: 'East',
        segments: [{ id: 'a', label: 'Alpha', value: 100, tone: 'primary' }],
      },
    ];

    render(
      <MarimekkoChart
        columns={unevenColumns}
        valuePrefix="€"
        valueUnit="B"
        onSelectSegment={onSelectSegment}
      />
    );

    const svg = screen.getByRole('img');
    const westA = svg.querySelector('rect[data-column-id="west"][data-segment-id="a"]')!;
    const westB = svg.querySelector('rect[data-column-id="west"][data-segment-id="b"]')!;
    const westC = svg.querySelector('rect[data-column-id="west"][data-segment-id="c"]')!;
    const eastA = svg.querySelector('rect[data-column-id="east"][data-segment-id="a"]')!;

    // IME composing Enter & ArrowDown must be ignored
    fireEvent.keyDown(westA, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(westA, { key: 'ArrowDown', isComposing: true });
    expect(onSelectSegment).not.toHaveBeenCalled();

    // Unrelated key must be ignored
    fireEvent.keyDown(westA, { key: 'Tab' });
    expect(onSelectSegment).not.toHaveBeenCalled();

    // Enter activates westA
    fireEvent.keyDown(westA, { key: 'Enter' });
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'west', segmentId: 'a', value: 50 })
    );

    // Space activates westB
    fireEvent.keyDown(westB, { key: ' ' });
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'west', segmentId: 'b', value: 30 })
    );

    // ArrowDown from westB moves focus & selection to westC
    fireEvent.keyDown(westB, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(westC);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'west', segmentId: 'c', value: 20 })
    );

    // ArrowDown wraps from westC to westA
    fireEvent.keyDown(westC, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(westA);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'west', segmentId: 'a' })
    );

    // ArrowUp wraps from westA to westC
    fireEvent.keyDown(westA, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(westC);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'west', segmentId: 'c' })
    );

    // ArrowRight from westC (index 2) into east (only 1 segment) clamps safely to eastA (index 0)
    fireEvent.keyDown(westC, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(eastA);
    expect(onSelectSegment).toHaveBeenLastCalledWith({
      columnId: 'east',
      columnLabel: 'East',
      segmentId: 'a',
      segmentLabel: 'Alpha',
      value: 100,
      columnSharePct: 100,
      totalSharePct: 50,
    });

    // ArrowLeft from eastA moves back to westA
    fireEvent.keyDown(eastA, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(westA);
    expect(onSelectSegment).toHaveBeenLastCalledWith(
      expect.objectContaining({ columnId: 'west', segmentId: 'a' })
    );

    // ArrowLeft wraps from westA to eastA
    fireEvent.keyDown(westA, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(eastA);
  });

  it('toggles interactive legend pills to cross-highlight series across columns and updates live inspector', () => {
    render(<MarimekkoChart />);

    const legendGroup = screen.getByRole('group', { name: 'Segment series legend' });
    const aiLegendBtn = within(legendGroup).getByRole('button', { name: /AI Suite/i });
    const cloudLegendBtn = within(legendGroup).getByRole('button', { name: /Cloud Core/i });
    const svg = screen.getByRole('img');
    const inspector = screen.getByTestId('marimekko-inspector');

    // Toggle AI Suite legend pill ON
    fireEvent.click(aiLegendBtn);
    expect(aiLegendBtn).toHaveAttribute('aria-pressed', 'true');
    expect(cloudLegendBtn).toHaveClass('opacity-50');

    const aiRects = Array.from(svg.querySelectorAll('rect[data-segment-id="ai"]'));
    expect(aiRects).toHaveLength(4);
    for (const rect of aiRects) {
      expect(rect).toHaveAttribute('data-highlighted', 'true');
      expect(rect).toHaveAttribute('data-dimmed', 'false');
    }

    const cloudRects = Array.from(svg.querySelectorAll('rect[data-segment-id="cloud"]'));
    for (const rect of cloudRects) {
      expect(rect).toHaveAttribute('data-highlighted', 'false');
      expect(rect).toHaveAttribute('data-dimmed', 'true');
    }

    expect(inspector).toHaveTextContent('All Columns');
    expect(inspector).toHaveTextContent('AI Suite');
    expect(inspector).toHaveTextContent('$131M');
    expect(inspector).toHaveTextContent('26.2% Global Share');

    // Clicking the same legend pill toggles it OFF
    fireEvent.click(aiLegendBtn);
    expect(aiLegendBtn).toHaveAttribute('aria-pressed', 'false');
    expect(inspector).toHaveTextContent(
      'Select or focus any segment to inspect column share and global share.'
    );
  });

  it('auto-cycles tones when omitted, handles single/narrow/fractional columns, blank labels, and stale selection cleanup on rerender', () => {
    const autoToneColumns: MarimekkoColumn[] = [
      {
        id: 'c1',
        label: 'VeryLongRegionHeaderName',
        segments: [
          { id: 's1', label: 'Tier One Enterprise Product', value: 50.25 },
          { id: 's2', label: 'Tier Two', value: 25.5 },
          { id: 's3', label: 'Tier Three', value: 12.25 },
          { id: 's4', label: 'Tier Four', value: 6 },
          { id: 's5', label: 'Tier Five', value: 4 },
          { id: 's6', label: '   ', value: 2 },
        ],
      },
      {
        id: 'c2',
        label: 'Tiny',
        segments: [
          // Reuses same label without tone -> inherits primary; plus explicit tone on existing label
          { id: 's1-b', label: 'Tier One Enterprise Product', value: 2 },
          { id: 's2-b', label: 'Tier Two', value: 1, tone: 'info' },
          // Micro value tests 0% rounding guard
          { id: 'micro', label: 'Micro', value: 0.001, tone: 'emerald' },
        ],
      },
    ];

    const { rerender } = render(<MarimekkoChart columns={autoToneColumns} />);
    const svg = screen.getByRole('img');
    expect(svg.innerHTML).not.toContain('NaN');

    // Verify 5-tone cycle + wrap on 6th auto-assigned segment
    expect(svg.querySelector('rect[data-segment-id="s1"]')).toHaveAttribute('data-tone', 'primary');
    expect(svg.querySelector('rect[data-segment-id="s2"]')).toHaveAttribute('data-tone', 'secondary');
    expect(svg.querySelector('rect[data-segment-id="s3"]')).toHaveAttribute('data-tone', 'emerald');
    expect(svg.querySelector('rect[data-segment-id="s4"]')).toHaveAttribute('data-tone', 'amber');
    expect(svg.querySelector('rect[data-segment-id="s5"]')).toHaveAttribute('data-tone', 'info');
    expect(svg.querySelector('rect[data-segment-id="s6"]')).toHaveAttribute('data-tone', 'primary');

    // Reused label without explicit tone inherits 'primary'
    expect(svg.querySelector('rect[data-segment-id="s1-b"]')).toHaveAttribute('data-tone', 'primary');
    // Explicit tone on existing label applies to that segment
    expect(svg.querySelector('rect[data-segment-id="s2-b"]')).toHaveAttribute('data-tone', 'info');

    // Select and focus a segment on subsequent rerender to verify graceful stale cleanup
    const s1Rect = svg.querySelector('rect[data-segment-id="s1"]')!;
    fireEvent.focus(s1Rect);
    fireEvent.click(s1Rect);
    expect(screen.getByTestId('marimekko-inspector')).toHaveTextContent('50.25');

    // Rerender to single column without s1 -> resets selection cleanly and uses colGap = 0
    rerender(
      <MarimekkoChart
        columns={[
          {
            id: 'solo',
            label: 'Solo',
            segments: [{ id: 'only', label: 'Only', value: 100 }],
          },
        ]}
      />
    );
    const soloSvg = screen.getByRole('img');
    const soloRect = soloSvg.querySelector('rect[data-column-id="solo"]')!;
    expect(Number(soloRect.getAttribute('width'))).toBeCloseTo(436, 1);
    expect(screen.getByTestId('marimekko-inspector')).toHaveTextContent('Total: $100M');

    // Activate 'Only' legend pill, then rerender with different legend -> resets activeLegend cleanly
    const soloLegend = screen.getByRole('group', { name: 'Segment series legend' });
    fireEvent.click(within(soloLegend).getByRole('button', { name: /Only/i }));
    expect(screen.getByTestId('marimekko-inspector')).toHaveTextContent('All Columns');

    rerender(
      <MarimekkoChart
        columns={[
          {
            id: 'other',
            label: 'Other',
            segments: [{ id: 'new-seg', label: 'Fresh', value: 42 }],
          },
        ]}
      />
    );
    expect(screen.getByTestId('marimekko-inspector')).toHaveTextContent(
      'Select or focus any segment to inspect column share and global share.'
    );
  });

  it('renders clean role="status" empty state for empty/non-positive/non-finite data and neutralizes XSS payloads', () => {
    const { rerender } = render(<MarimekkoChart columns={[]} data-testid="empty-mekko" />);
    expect(screen.getByTestId('empty-mekko')).toHaveAttribute('data-empty', 'true');
    const emptyStatus = screen.getByRole('status');
    expect(emptyStatus).toHaveTextContent('No positive market share values to display.');
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('marimekko-total-pill')).toBeNull();
    expect(screen.queryByTestId('marimekko-inspector')).toBeNull();

    // All invalid / non-positive values also render empty status
    rerender(
      <MarimekkoChart
        data-testid="empty-mekko"
        columns={[
          {
            id: 'bad-1',
            label: 'Bad One',
            segments: [
              { id: 'z', label: 'Zero', value: 0 },
              { id: 'neg', label: 'Neg', value: -25 },
              { id: 'nan', label: 'NaN', value: Number.NaN },
              { id: 'inf', label: 'Inf', value: Number.POSITIVE_INFINITY },
            ],
          },
          {
            id: 'bad-2',
            label: 'Empty Col',
            segments: [],
          },
        ]}
      />
    );
    expect(screen.getByTestId('empty-mekko')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Mixed invalid + valid segments filter safely & neutralize XSS strings
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <MarimekkoChart
        title={payload}
        valuePrefix={payload}
        valueUnit={payload}
        columns={[
          {
            id: 'xss-col',
            label: payload,
            segments: [
              { id: 'drop', label: 'Drop', value: -10 },
              { id: 'keep', label: payload, value: 75 },
            ],
          },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByRole('img').querySelectorAll('rect[role="button"]')).toHaveLength(1);
  });
});
