import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ChoroplethMap,
  type ChoroplethRegion,
  type ChoroplethTone,
} from './index';

const WORLD_REGIONS: ChoroplethRegion[] = [
  { id: 'na', name: 'North America', value: 400, detail: 'US-East & US-West optical hubs' },
  { id: 'sa', name: 'South America', value: 100 },
  { id: 'eu', name: 'Europe', value: 250, detail: 'Frankfurt & Dublin relays' },
  { id: 'af', name: 'Africa', value: 50 },
  { id: 'me', name: 'Middle East', value: 80 },
  { id: 'as', name: 'Asia', value: 320, detail: 'Tokyo & Singapore clusters' },
  { id: 'oc', name: 'Oceania', value: 100 },
];

describe('ChoroplethMap', () => {
  it('renders optical slab, all 7 built-in regions, graticule, 5-step intensity ramp, ref, theme override, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ChoroplethMap: { className: 'theme-choropleth', style: { maxWidth: '820px' } },
          },
        }}
      >
        <ChoroplethMap
          ref={ref}
          regions={WORLD_REGIONS}
          valueUnit="k"
          className="consumer-choropleth"
          xstyle={{ '--prism-blur-px': '16px' }}
          style={{ borderRadius: '28px' }}
          data-testid="choropleth-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('choropleth-root');
    expect(ref.current).toBe(root);
    expect(ChoroplethMap.displayName).toBe('ChoroplethMap');
    expect(root).toHaveClass(
      'refractor-choropleth-map',
      'prism-slab',
      'theme-choropleth',
      'consumer-choropleth'
    );
    expect(root).toHaveStyle({ maxWidth: '820px', borderRadius: '28px' });
    expect(root).toHaveAttribute('data-tone', 'primary');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-focused');

    expect(screen.getByRole('heading', { name: 'Regional Choropleth Map' })).toBeInTheDocument();
    expect(screen.getByTestId('choropleth-region-count')).toHaveTextContent('7 regions');

    // 5-step Low -> High legend with [min..max]{unit}
    const legend = screen.getByTestId('choropleth-legend');
    expect(within(legend).getByText('Low')).toBeInTheDocument();
    expect(within(legend).getByText('High')).toBeInTheDocument();
    expect(legend.querySelectorAll('[data-role="choropleth-legend-step"]')).toHaveLength(5);
    expect(screen.getByTestId('choropleth-legend-range')).toHaveTextContent('[50..400]k');

    // SVG viewBox, default height 260px, and subtle latitude/longitude graticule
    const svg = screen.getByTestId('choropleth-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 640 320');
    expect(svg).toHaveStyle({ height: '260px' });
    const graticuleLines = screen.getByTestId('choropleth-graticule').querySelectorAll('line');
    expect(graticuleLines).toHaveLength(8);
    expect(graticuleLines[0]).toHaveAttribute('stroke', 'var(--prism-divider)');

    // Zero raw color literals in rendered DOM
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(root.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);

    // Min value (af: 50) -> 0.16 opacity; Max value (na: 400) -> 0.9 opacity
    const minPolygon = screen.getByTestId('choropleth-region-af');
    const maxPolygon = screen.getByTestId('choropleth-region-na');
    expect(minPolygon).toHaveAttribute('data-geometry-kind', 'builtin');
    expect(minPolygon).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(minPolygon).toHaveAttribute('data-fill-opacity', '0.16');
    expect(maxPolygon).toHaveAttribute('data-fill-opacity', '0.9');

    // All 7 built-in polygons and 7 regional pills rendered
    for (const r of WORLD_REGIONS) {
      expect(screen.getByTestId(`choropleth-region-${r.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`choropleth-pill-${r.id}`)).toBeInTheDocument();
    }

    // Default recessed readout shows total
    const readout = screen.getByTestId('choropleth-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('choropleth-total')).toHaveTextContent('Total: 1300k');
  });

  it('handles polygon & pill selection, dimming, keyboard (IME-safe Enter/Space/Escape), Clear button, canvas click, and consumer onKeyDown', () => {
    const onSelectRegion = vi.fn<(region: ChoroplethRegion, sharePct: number) => void>();
    const onRootKeyDown = vi.fn();

    render(
      <ChoroplethMap
        title="Regional Revenue"
        regions={[
          { id: 'na', name: 'North America', value: 50, detail: 'Primary hub' },
          { id: 'eu', name: 'Europe', value: 150 },
        ]}
        valueUnit="M"
        onSelectRegion={onSelectRegion}
        onKeyDown={onRootKeyDown}
        data-testid="interactive-map"
      />
    );

    const root = screen.getByTestId('interactive-map');
    const naPoly = screen.getByTestId('choropleth-region-na');
    const euPoly = screen.getByTestId('choropleth-region-eu');
    const euPill = screen.getByTestId('choropleth-pill-eu');

    // Click SVG polygon -> highlights na, dims eu, fires callback, updates readout with detail
    fireEvent.click(naPoly);
    expect(root).toHaveAttribute('data-focused', 'true');
    expect(naPoly).toHaveAttribute('aria-pressed', 'true');
    expect(naPoly).toHaveAttribute('data-selected', 'true');
    expect(naPoly).toHaveAttribute('stroke', 'var(--prism-text-primary)');
    expect(euPoly).toHaveAttribute('data-dimmed', 'true');
    expect(Number(euPoly.getAttribute('data-fill-opacity'))).toBeLessThan(0.9);
    expect(onSelectRegion).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'na', value: 50 }),
      25
    );
    expect(screen.getByTestId('choropleth-readout-summary')).toHaveTextContent(
      'North America · 50M · 25% of total'
    );
    expect(screen.getByTestId('choropleth-readout-detail')).toHaveTextContent('Primary hub');

    // Click regional pill for eu (no detail) -> switches selection cleanly
    fireEvent.click(euPill);
    expect(euPill).toHaveAttribute('aria-pressed', 'true');
    expect(euPoly).toHaveAttribute('data-selected', 'true');
    expect(naPoly).toHaveAttribute('data-dimmed', 'true');
    expect(onSelectRegion).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'eu', value: 150 }),
      75
    );
    expect(screen.getByTestId('choropleth-readout-summary')).toHaveTextContent(
      'Europe · 150M · 75% of total'
    );
    expect(screen.queryByTestId('choropleth-readout-detail')).toBeNull();

    // IME composing keys are ignored on polygon and root
    fireEvent.keyDown(naPoly, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(naPoly, { key: 'Escape', isComposing: true });
    expect(onSelectRegion).toHaveBeenCalledTimes(2);
    expect(euPoly).toHaveAttribute('data-selected', 'true');

    // Non-activation key does not alter selection
    fireEvent.keyDown(naPoly, { key: 'ArrowRight' });
    expect(onSelectRegion).toHaveBeenCalledTimes(2);

    // Enter & Space select polygon; Escape on polygon clears focus
    fireEvent.keyDown(naPoly, { key: 'Enter' });
    expect(naPoly).toHaveAttribute('data-selected', 'true');
    expect(onSelectRegion).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(euPoly, { key: ' ' });
    expect(euPoly).toHaveAttribute('data-selected', 'true');
    expect(onSelectRegion).toHaveBeenCalledTimes(4);

    fireEvent.keyDown(euPoly, { key: 'Escape' });
    expect(root).not.toHaveAttribute('data-focused');
    expect(screen.queryByTestId('choropleth-readout-summary')).toBeNull();

    // Pill keyboard: IME ignored, Enter & Space select, Escape clears focus
    fireEvent.keyDown(euPill, { key: 'Enter', isComposing: true });
    expect(onSelectRegion).toHaveBeenCalledTimes(4);

    fireEvent.keyDown(euPill, { key: 'Enter' });
    expect(euPoly).toHaveAttribute('data-selected', 'true');
    expect(onSelectRegion).toHaveBeenCalledTimes(5);

    fireEvent.keyDown(screen.getByTestId('choropleth-pill-na'), { key: ' ' });
    expect(naPoly).toHaveAttribute('data-selected', 'true');
    expect(onSelectRegion).toHaveBeenCalledTimes(6);

    fireEvent.keyDown(euPill, { key: 'Escape' });
    expect(root).not.toHaveAttribute('data-focused');
    expect(screen.queryByTestId('choropleth-readout-summary')).toBeNull();

    // Clear button clears focus
    fireEvent.click(naPoly);
    expect(screen.getByTestId('choropleth-readout-summary')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear selected region' }));
    expect(screen.queryByTestId('choropleth-readout-summary')).toBeNull();

    // Clicking empty canvas background clears focus
    fireEvent.click(euPoly);
    expect(screen.getByTestId('choropleth-readout-summary')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('choropleth-canvas-frame'));
    expect(screen.queryByTestId('choropleth-readout-summary')).toBeNull();

    // Root Escape clears focus and invokes consumer onKeyDown
    fireEvent.click(naPoly);
    fireEvent.keyDown(root, { key: 'Escape' });
    expect(screen.queryByTestId('choropleth-readout-summary')).toBeNull();
    expect(onRootKeyDown).toHaveBeenCalled();
  });

  it('supports all 5 semantic tones, emerald active pill styling, height clamping, decimals, truncation, equal & all-zero values', () => {
    const toneCases: ReadonlyArray<{ tone: ChoroplethTone; token: string }> = [
      { tone: 'primary', token: 'var(--prism-primary-main)' },
      { tone: 'secondary', token: 'var(--prism-secondary-main)' },
      { tone: 'emerald', token: 'var(--prism-success-main)' },
      { tone: 'amber', token: 'var(--prism-warning-main)' },
      { tone: 'rose', token: 'var(--prism-error-main)' },
    ];

    const { rerender } = render(
      <ChoroplethMap
        regions={[{ id: 'eu', name: 'Western European Union Core Zone', value: 12.345 }]}
        tone="emerald"
        height={100}
        data-testid="tone-map"
      />
    );

    // Height clamped to minimum 180px, singular count pill, midpoint opacity 0.53, truncated SVG text
    expect(screen.getByTestId('choropleth-svg')).toHaveStyle({ height: '180px' });
    expect(screen.getByTestId('choropleth-region-count')).toHaveTextContent('1 region');
    expect(screen.getByTestId('choropleth-legend-range')).toHaveTextContent('[12.35..12.35]');
    expect(screen.getByTestId('choropleth-region-eu')).toHaveAttribute('data-fill-opacity', '0.53');
    const svgText = screen.getByTestId('choropleth-svg').querySelector('text');
    expect(svgText?.textContent).toBe('Western European …');

    // Selecting under emerald tone highlights pill with prism-emerald
    fireEvent.click(screen.getByTestId('choropleth-pill-eu'));
    expect(screen.getByTestId('choropleth-pill-eu')).toHaveClass('prism-emerald');

    // Verify all 5 tones map cleanly to semantic --prism-* CSS variables
    for (const tc of toneCases) {
      rerender(
        <ChoroplethMap
          regions={[{ id: 'eu', name: 'Europe', value: 42 }]}
          tone={tc.tone}
          height={600}
          data-testid="tone-map"
        />
      );
      expect(screen.getByTestId('tone-map')).toHaveAttribute('data-tone', tc.tone);
      expect(screen.getByTestId('choropleth-region-eu')).toHaveAttribute('fill', tc.token);
    }

    // Height clamped to max 480px and NaN fallback to 260px
    expect(screen.getByTestId('choropleth-svg')).toHaveStyle({ height: '480px' });
    rerender(
      <ChoroplethMap
        regions={[
          { id: 'na', name: 'North America', value: -0 },
          { id: 'as', name: 'Asia', value: 0 },
        ]}
        height={Number.NaN}
      />
    );
    expect(screen.getByTestId('choropleth-svg')).toHaveStyle({ height: '260px' });
    expect(screen.getByTestId('choropleth-region-na')).toHaveAttribute('data-value', '0');
    expect(screen.getByTestId('choropleth-region-na')).toHaveAttribute('data-share-pct', '0');
    expect(screen.getByTestId('choropleth-region-na')).toHaveAttribute('data-fill-opacity', '0.53');
    expect(screen.getByTestId('choropleth-total')).toHaveTextContent('Total: 0');
  });

  it('supports sanitized custom pathD, inferred path centers, uppercase built-in IDs, and hex badge fallback for unknown IDs', () => {
    const customPath = 'M 40 40 L 120 40 L 120 100 L 40 100 Z';
    const singleCoordPath = 'M 10';

    render(
      <ChoroplethMap
        regions={[
          {
            id: 'NA',
            name: 'North America Upper',
            value: 100,
            labelX: 130,
            labelY: 90,
          },
          {
            id: 'nordic',
            name: 'Nordic Zone',
            value: 80,
            pathD: customPath,
          },
          {
            id: 'custom-anchor',
            name: 'Custom Anchor',
            value: 60,
            pathD: singleCoordPath,
          },
          {
            id: 'custom-explicit',
            name: 'Custom Explicit',
            value: 70,
            pathD: customPath,
            labelX: 90,
            labelY: 75,
          },
          {
            id: 'island-a',
            name: 'Pacific Relay',
            value: 40,
          },
          {
            id: 'island-b',
            name: 'Arctic Outpost',
            value: 30,
            labelX: 300,
            labelY: 42,
          },
        ]}
      />
    );

    // Case-insensitive built-in matching
    const naPoly = screen.getByTestId('choropleth-region-NA');
    expect(naPoly).toHaveAttribute('data-geometry-kind', 'builtin');

    // Valid custom pathD rendered verbatim
    const nordicPoly = screen.getByTestId('choropleth-region-nordic');
    expect(nordicPoly).toHaveAttribute('data-geometry-kind', 'custom');
    expect(nordicPoly).toHaveAttribute('d', customPath);

    // Single-coordinate pathD safely infers fallback viewBox center (320, 160)
    const anchorPoly = screen.getByTestId('choropleth-region-custom-anchor');
    expect(anchorPoly).toHaveAttribute('data-geometry-kind', 'custom');
    const anchorText = anchorPoly.parentElement?.querySelector('text');
    expect(anchorText).toHaveAttribute('x', '320');
    expect(anchorText).toHaveAttribute('y', '160');

    // Custom pathD with explicit labelX/labelY uses provided coordinates
    const explicitPoly = screen.getByTestId('choropleth-region-custom-explicit');
    const explicitText = explicitPoly.parentElement?.querySelector('text');
    expect(explicitText).toHaveAttribute('x', '90');
    expect(explicitText).toHaveAttribute('y', '75');

    // Unknown IDs without pathD fall back to hexagon badge geometry
    const islandA = screen.getByTestId('choropleth-region-island-a');
    expect(islandA).toHaveAttribute('data-geometry-kind', 'fallback');
    expect(islandA.getAttribute('d')).toMatch(/^M .+ Z$/);

    const islandB = screen.getByTestId('choropleth-region-island-b');
    expect(islandB).toHaveAttribute('data-geometry-kind', 'fallback');
    const islandBText = islandB.parentElement?.querySelector('text');
    expect(islandBText).toHaveAttribute('x', '300');
    expect(islandBText).toHaveAttribute('y', '42');
  });

  it('defends against unsafe pathD, XSS payloads, prototype-pollution keys, invalid/duplicate regions, dataset shrink, and empty states', () => {
    const xss = '<script>window.__mapXss=1</script><img src=x onerror=alert(1)>';
    const unsafePath = 'M 0 0" onload="alert(1)';
    const onSelectRegion = vi.fn();

    const { rerender } = render(
      <ChoroplethMap
        title={xss}
        valueUnit={xss}
        regions={[
          { id: '   ', name: 'Blank ID', value: 50 },
          { id: 'neg', name: 'Negative', value: -10 },
          { id: 'nan', name: 'Not a Number', value: Number.NaN },
          { id: 'inf', name: 'Infinity', value: Number.POSITIVE_INFINITY },
          { id: 'na', name: '   ', value: 90, pathD: unsafePath, detail: '   ' },
          { id: 'na', name: 'Duplicate NA', value: 999 },
          { id: '__proto__', name: '__proto__', value: 60, pathD: 'javascript:alert(1)' },
          { id: 'constructor', name: xss, value: 40, pathD: '123 456', detail: xss },
          { id: 'prototype', name: 'prototype', value: 20, pathD: 'M' },
        ]}
        onSelectRegion={onSelectRegion}
        data-testid="adv-map"
      />
    );

    // Zero injected script/img elements
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xss })).toBeInTheDocument();

    // Only 4 valid unique regions remain
    expect(screen.getByTestId('choropleth-region-count')).toHaveTextContent('4 regions');

    // Unsafe pathD on built-in 'na' falls back safely to built-in geometry; blank name falls back to ID
    const naPoly = screen.getByTestId('choropleth-region-na');
    expect(naPoly).toHaveAttribute('data-geometry-kind', 'builtin');
    expect(naPoly.getAttribute('d')).not.toContain('onload');
    expect(screen.getByTestId('choropleth-pill-na')).toHaveTextContent('na');

    // Prototype pollution IDs with unsafe pathD fall back cleanly to hex badges and select safely
    const protoPoly = screen.getByTestId('choropleth-region-__proto__');
    expect(protoPoly).toHaveAttribute('data-geometry-kind', 'fallback');
    expect(protoPoly.getAttribute('d')).not.toContain('javascript');

    fireEvent.click(screen.getByTestId('choropleth-region-constructor'));
    expect(onSelectRegion).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'constructor', value: 40 }),
      19
    );
    expect(screen.getByTestId('choropleth-readout-detail')).toHaveTextContent(xss);

    // Ensure Object.prototype was not polluted
    const probe: Record<string, string> = {};
    expect(probe['prototype']).toBeUndefined();

    // Shrink dataset removing selected 'constructor' -> active readout clears cleanly
    rerender(
      <ChoroplethMap
        regions={[{ id: 'eu', name: 'Europe', value: 100 }]}
        data-testid="adv-map"
      />
    );
    expect(screen.queryByTestId('choropleth-readout-summary')).toBeNull();

    // All invalid regions -> clean role="status" empty state
    rerender(
      <ChoroplethMap
        regions={[
          { id: 'bad-1', name: 'Neg', value: -5 },
          { id: 'bad-2', name: 'Inf', value: Number.NEGATIVE_INFINITY },
        ]}
        data-testid="adv-map"
      />
    );
    expect(screen.getByTestId('adv-map')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('choropleth-region-count')).toHaveTextContent('0 regions');
    expect(screen.getByRole('status')).toHaveTextContent('No valid regional data to display.');
    expect(screen.queryByTestId('choropleth-svg')).toBeNull();
    expect(screen.queryByTestId('choropleth-pills')).toBeNull();
    expect(screen.queryByTestId('choropleth-readout')).toBeNull();
    expect(screen.queryByTestId('choropleth-legend-range')).toBeNull();

    // Empty array -> clean empty state
    rerender(<ChoroplethMap regions={[]} data-testid="adv-map" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
