import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  PointClusterMap,
  type ClusterMapTone,
  type GeoPoint,
} from './index';

// NYC (x=188.43, y=87.63) & Chicago (x=164.21, y=85.55) fall into the same 48px cell (3:1) at 1x zoom,
// and cleanly split into distinct 24px cells (7:3 and 6:3) when zoomed to 2x.
const SAMPLE_POINTS: GeoPoint[] = [
  {
    id: 'nyc',
    label: 'New York Hub',
    lat: 40.71,
    lng: -74.01,
    category: 'Americas',
    value: 142.5,
    tone: 'primary',
  },
  {
    id: 'chi',
    label: 'Chicago Relay',
    lat: 41.88,
    lng: -87.63,
    category: 'Americas',
    value: 98,
  },
  {
    id: 'lon',
    label: 'London Core',
    lat: 51.51,
    lng: -0.13,
    category: 'EMEA',
    value: 164,
    tone: 'secondary',
  },
  {
    id: 'tok',
    label: 'Tokyo Edge',
    lat: 35.68,
    lng: 139.69,
    category: 'APAC',
    tone: 'emerald',
  },
];

describe('PointClusterMap', () => {
  it('renders optical slab card, React 19 ref, theme override, equirectangular projection, graticule/landmasses, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PointClusterMap: {
              className: 'theme-cluster-map',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <PointClusterMap
          ref={ref}
          title="Global Edge Telemetry"
          points={SAMPLE_POINTS}
          className="local-cluster-map"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '10px' }}
          data-testid="cluster-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cluster-root');
    expect(ref.current).toBe(root);
    expect(PointClusterMap.displayName).toBe('PointClusterMap');
    expect(root).toHaveClass(
      'refractor-point-cluster-map',
      'prism-slab',
      'theme-cluster-map',
      'local-cluster-map'
    );
    expect(root).toHaveStyle({ maxWidth: '820px', marginTop: '10px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-zoomed');
    expect(root).not.toHaveAttribute('data-selected');

    expect(screen.getByRole('heading', { name: 'Global Edge Telemetry' })).toBeInTheDocument();
    expect(screen.getByTestId('cluster-map-telemetry')).toHaveTextContent('4 markers · 1 clusters');
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('1×');

    const svg = screen.getByRole('img', { name: 'Global Edge Telemetry' });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 320');
    expect(svg).toHaveStyle({ height: '280px' });
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\brgba?\s*\(/i);
    expect(svg.innerHTML).not.toMatch(/\bhsla?\s*\(/i);
    expect(svg.innerHTML).not.toContain('NaN');

    // Graticule lines & continental landmasses use semantic --prism-* tokens
    const graticule = screen.getByTestId('cluster-map-graticule');
    const lines = graticule.querySelectorAll('line');
    expect(lines.length).toBe(10);
    expect(lines[0]).toHaveAttribute('stroke', 'var(--prism-divider)');

    const landmasses = screen.getByTestId('cluster-map-landmasses');
    const paths = landmasses.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(7);
    expect(paths[0]).toHaveAttribute('fill', 'var(--prism-text-secondary)');
    expect(paths[0]).toHaveAttribute('stroke', 'var(--prism-divider)');

    // NYC + Chicago cluster at cell 3:1; London & Tokyo render as individual equirectangular pins
    const clusterBubble = screen.getByTestId('cluster-map-cluster-cell-3:1');
    expect(clusterBubble).toHaveAttribute('data-count', '2');
    expect(clusterBubble).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(screen.getByTestId('cluster-map-cluster-count-cell-3:1')).toHaveTextContent('2');
    expect(screen.getByTestId('cluster-map-cluster-halo-cell-3:1')).toHaveAttribute(
      'fill',
      'var(--prism-primary-main)'
    );

    const londonPin = screen.getByTestId('cluster-map-pin-lon');
    expect(Number(londonPin.getAttribute('cx'))).toBeCloseTo(((-0.13 + 180) / 360) * 640, 1);
    expect(Number(londonPin.getAttribute('cy'))).toBeCloseTo(((90 - 51.51) / 180) * 320, 1);
    expect(londonPin).toHaveAttribute('fill', 'var(--prism-secondary-main)');

    const tokyoPin = screen.getByTestId('cluster-map-pin-tok');
    expect(Number(tokyoPin.getAttribute('cx'))).toBeCloseTo(((139.69 + 180) / 360) * 640, 1);
    expect(Number(tokyoPin.getAttribute('cy'))).toBeCloseTo(((90 - 35.68) / 180) * 320, 1);
    expect(tokyoPin).toHaveAttribute('fill', 'var(--prism-success-main)');

    // Recessed inspector starts in idle state with aria-live="polite"
    const inspector = screen.getByTestId('cluster-map-inspector');
    expect(inspector).toHaveClass('prism-well');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(inspector).toHaveTextContent('Select a pin to inspect coordinates');
  });

  it('expands clusters on click/keyboard, zooms +1x to split dense markers, shows member pills, and selects individual pins from pills', () => {
    const onSelectPoint = vi.fn<(point: GeoPoint) => void>();
    const onSelectCluster = vi.fn<(points: GeoPoint[]) => void>();

    render(
      <PointClusterMap
        points={SAMPLE_POINTS}
        onSelectPoint={onSelectPoint}
        onSelectCluster={onSelectCluster}
        data-testid="interactive-root"
      />
    );

    // Click cluster of NYC + Chicago -> zooms 1x -> 2x, splits cluster into individual pins, fires callback
    const cluster = screen.getByTestId('cluster-map-cluster-cell-3:1');
    fireEvent.click(cluster);

    expect(onSelectCluster).toHaveBeenCalledTimes(1);
    expect(onSelectCluster).toHaveBeenCalledWith([
      SAMPLE_POINTS[0],
      expect.objectContaining({ id: 'chi', label: 'Chicago Relay', lat: 41.88, lng: -87.63 }),
    ]);

    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('2×');
    expect(screen.getByTestId('cluster-map-telemetry')).toHaveTextContent('4 markers · 0 clusters');
    expect(screen.getByTestId('interactive-root')).toHaveAttribute('data-zoomed', 'true');
    expect(screen.getByTestId('interactive-root')).toHaveAttribute('data-selected', 'true');

    // Both NYC and Chicago now render as individual pins
    expect(screen.getByTestId('cluster-map-pin-nyc')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-map-pin-chi')).toBeInTheDocument();

    // Inspector lists cluster member pills with prism-emerald count badge
    expect(screen.getByTestId('cluster-map-inspector-cluster-count')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('cluster-map-inspector-cluster-count')).toHaveTextContent(
      '2 clustered markers'
    );
    expect(screen.getByTestId('cluster-map-member-pill-nyc')).toHaveTextContent('New York Hub');
    expect(screen.getByTestId('cluster-map-member-pill-chi')).toHaveTextContent('Chicago Relay');

    // Clicking a member pill selects that individual pin & triggers onSelectPoint
    fireEvent.click(screen.getByTestId('cluster-map-member-pill-nyc'));
    expect(onSelectPoint).toHaveBeenCalledWith(SAMPLE_POINTS[0]);
    expect(screen.getByTestId('cluster-map-pin-nyc')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('cluster-map-pin-nyc')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('cluster-map-pin-ring-nyc')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-map-inspector-summary')).toHaveTextContent(
      'New York Hub · 40.71°, -74.01°'
    );
    expect(screen.getByTestId('cluster-map-inspector-category')).toHaveTextContent('Americas');
    expect(screen.getByTestId('cluster-map-inspector-value')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('cluster-map-inspector-value')).toHaveTextContent('142.5');

    // Selecting Tokyo (no value) omits value badge while showing category
    fireEvent.click(screen.getByTestId('cluster-map-pin-tok'));
    expect(screen.getByTestId('cluster-map-inspector-summary')).toHaveTextContent(
      'Tokyo Edge · 35.68°, 139.69°'
    );
    expect(screen.getByTestId('cluster-map-inspector-category')).toHaveTextContent('APAC');
    expect(screen.queryByTestId('cluster-map-inspector-value')).not.toBeInTheDocument();

    // Clear button resets inspector to idle
    fireEvent.click(screen.getByTestId('cluster-map-inspector-clear'));
    expect(screen.getByTestId('cluster-map-inspector')).toHaveTextContent(
      'Select a pin to inspect coordinates'
    );
    expect(screen.getByTestId('interactive-root')).not.toHaveAttribute('data-selected');
  });

  it('supports keyboard Enter/Space/Escape and IME safety on both pins and persistent clusters', () => {
    const onSelectPoint = vi.fn<(point: GeoPoint) => void>();
    const onSelectCluster = vi.fn<(points: GeoPoint[]) => void>();

    // Two co-located points stay clustered even at 4x zoom, exercising active cluster ring & Escape clearing
    const stackedPoints: GeoPoint[] = [
      { id: 'a1', label: 'Node Alpha', lat: 0, lng: 0, tone: 'primary' },
      { id: 'a2', label: 'Node Beta', lat: 0.01, lng: 0.01, tone: 'amber' },
      { id: 'solo', label: 'Polar Station', lat: -60, lng: 120, tone: 'rose' },
    ];

    render(
      <PointClusterMap
        points={stackedPoints}
        defaultZoom={4}
        onSelectPoint={onSelectPoint}
        onSelectCluster={onSelectCluster}
      />
    );

    const soloPin = screen.getByTestId('cluster-map-pin-solo');
    const clusterBubble = screen.getByRole('button', { name: /Cluster of 2 markers/i });

    // Escape when nothing is selected is a clean no-op on both pin and cluster
    fireEvent.keyDown(soloPin, { key: 'Escape' });
    fireEvent.keyDown(clusterBubble, { key: 'Escape' });
    expect(onSelectPoint).not.toHaveBeenCalled();
    expect(onSelectCluster).not.toHaveBeenCalled();

    // IME composition Enter is ignored on both pin and cluster
    const imePinEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imePinEvent, 'isComposing', { value: true });
    soloPin.dispatchEvent(imePinEvent);

    const imeClusterEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(imeClusterEvent, 'isComposing', { value: true });
    clusterBubble.dispatchEvent(imeClusterEvent);
    expect(onSelectPoint).not.toHaveBeenCalled();
    expect(onSelectCluster).not.toHaveBeenCalled();

    // Pin keyboard Enter & Space select pin; uncategorized pin omits category badge
    fireEvent.keyDown(soloPin, { key: 'Enter' });
    expect(onSelectPoint).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('cluster-map-inspector-summary')).toHaveTextContent(
      'Polar Station · -60.00°, 120.00°'
    );
    expect(screen.queryByTestId('cluster-map-inspector-category')).not.toBeInTheDocument();

    // Unrelated key does not re-trigger callback
    fireEvent.keyDown(soloPin, { key: 'ArrowUp' });
    expect(onSelectPoint).toHaveBeenCalledTimes(1);

    // Space re-selects pin; Escape clears selection
    fireEvent.keyDown(soloPin, { key: ' ' });
    expect(onSelectPoint).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(soloPin, { key: 'Escape' });
    expect(screen.getByTestId('cluster-map-inspector')).toHaveTextContent(
      'Select a pin to inspect coordinates'
    );

    // Cluster keyboard Enter selects cluster, stays clamped at 4x, shows active ring
    fireEvent.keyDown(clusterBubble, { key: 'Enter' });
    expect(onSelectCluster).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('4×');
    expect(clusterBubble).toHaveAttribute('aria-pressed', 'true');
    expect(clusterBubble).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId(`cluster-map-cluster-ring-${clusterBubble.getAttribute('data-testid')?.replace('cluster-map-cluster-', '')}`)).toBeInTheDocument();

    // Unrelated key on cluster is ignored; Space activates cluster; Escape clears cluster selection
    fireEvent.keyDown(clusterBubble, { key: 'Tab' });
    expect(onSelectCluster).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(clusterBubble, { key: ' ' });
    expect(onSelectCluster).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(clusterBubble, { key: 'Escape' });
    expect(screen.getByTestId('cluster-map-inspector')).toHaveTextContent(
      'Select a pin to inspect coordinates'
    );

    // Clear button on cluster inspector also works
    fireEvent.click(clusterBubble);
    fireEvent.click(screen.getByTestId('cluster-map-inspector-clear'));
    expect(screen.getByTestId('cluster-map-inspector')).toHaveTextContent(
      'Select a pin to inspect coordinates'
    );
  });

  it('supports Zoom Out / Reset / Zoom In controls (1x..4x, step 0.5x) and clamps defaultZoom, clusterRadius, and height', () => {
    const { rerender } = render(
      <PointClusterMap
        points={SAMPLE_POINTS}
        defaultZoom={1}
        clusterRadius={48}
        height={100}
      />
    );

    const zoomOut = screen.getByRole('button', { name: 'Zoom Out' });
    const reset = screen.getByRole('button', { name: 'Reset' });
    const zoomIn = screen.getByRole('button', { name: 'Zoom In' });
    const svg = screen.getByTestId('cluster-map-svg');

    // Height clamped to min 180
    expect(svg).toHaveStyle({ height: '180px' });
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('1×');
    expect(zoomOut).toBeDisabled();
    expect(zoomIn).not.toBeDisabled();

    // Step up 0.5x increments up to 4x
    fireEvent.click(zoomIn);
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('1.5×');
    expect(zoomOut).not.toBeDisabled();
    expect(svg).toHaveAttribute('data-effective-radius', '32');

    fireEvent.click(zoomOut);
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('1×');
    expect(zoomOut).toBeDisabled();

    // Zoom all the way to 4x (6 steps of +0.5x)
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(zoomIn);
    }
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('4×');
    expect(zoomIn).toBeDisabled();
    expect(svg).toHaveAttribute('data-effective-radius', '12');

    // Reset restores initial zoom (1x) & centered stage transform
    fireEvent.click(reset);
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('1×');
    expect(screen.getByTestId('cluster-map-stage')).toHaveAttribute(
      'transform',
      'translate(320 160) scale(1) translate(-320 -160)'
    );

    // Clamp upper bounds and NaN fallbacks for height, clusterRadius, and defaultZoom
    rerender(
      <PointClusterMap
        points={SAMPLE_POINTS}
        height={900}
        clusterRadius={400}
      />
    );
    expect(screen.getByTestId('cluster-map-svg')).toHaveStyle({ height: '480px' });
    expect(screen.getByTestId('cluster-map-svg')).toHaveAttribute('data-effective-radius', '120');

    rerender(
      <PointClusterMap
        points={SAMPLE_POINTS}
        height={Number.NaN}
        clusterRadius={4}
      />
    );
    expect(screen.getByTestId('cluster-map-svg')).toHaveStyle({ height: '280px' });
    expect(screen.getByTestId('cluster-map-svg')).toHaveAttribute('data-effective-radius', '16');

    rerender(
      <PointClusterMap
        points={SAMPLE_POINTS}
        clusterRadius={Number.NaN}
      />
    );
    expect(screen.getByTestId('cluster-map-svg')).toHaveAttribute('data-effective-radius', '48');
  });

  it('filters categories cleanly, updates telemetry & selection, displays role="status" empty state when all hidden, and restores categories', () => {
    render(
      <PointClusterMap
        points={SAMPLE_POINTS}
        data-testid="filter-root"
      />
    );

    const americasBtn = screen.getByTestId('cluster-map-category-Americas');
    const emeaBtn = screen.getByTestId('cluster-map-category-EMEA');
    const apacBtn = screen.getByTestId('cluster-map-category-APAC');

    // Select London, then hide EMEA -> selection clears cleanly
    fireEvent.click(screen.getByTestId('cluster-map-pin-lon'));
    expect(screen.getByTestId('cluster-map-inspector-summary')).toHaveTextContent('London Core');

    fireEvent.click(emeaBtn);
    expect(emeaBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('cluster-map-pin-lon')).not.toBeInTheDocument();
    expect(screen.getByTestId('cluster-map-telemetry')).toHaveTextContent('3 markers · 1 clusters');
    expect(screen.getByTestId('cluster-map-inspector')).toHaveTextContent(
      'Select a pin to inspect coordinates'
    );

    // Select Americas cluster, then hide Americas -> cluster members vanish cleanly
    fireEvent.click(screen.getByTestId('cluster-map-cluster-cell-3:1'));
    expect(screen.getByTestId('cluster-map-inspector-cluster-count')).toHaveTextContent(
      '2 clustered markers'
    );
    fireEvent.click(americasBtn);
    expect(screen.getByTestId('cluster-map-telemetry')).toHaveTextContent('1 markers · 0 clusters');
    expect(screen.getByTestId('cluster-map-inspector')).toHaveTextContent(
      'Select a pin to inspect coordinates'
    );

    // Hide final remaining category -> clean role="status" empty state
    fireEvent.click(apacBtn);
    expect(screen.getByTestId('filter-root')).toHaveAttribute('data-all-hidden', 'true');
    const emptyState = screen.getByRole('status');
    expect(emptyState).toHaveTextContent('All point categories hidden');
    expect(screen.queryByTestId('cluster-map-svg')).not.toBeInTheDocument();

    // Re-enable EMEA -> restores marker & hides empty state
    fireEvent.click(emeaBtn);
    expect(emeaBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('filter-root')).not.toHaveAttribute('data-all-hidden');
    expect(screen.getByTestId('cluster-map-pin-lon')).toBeInTheDocument();
    expect(screen.getByTestId('cluster-map-telemetry')).toHaveTextContent('1 markers · 0 clusters');
  });

  it('cycles all 5 optical tones for uncategorized & categorized points and renders no category bar when uncategorized', () => {
    const fiveSpreadPoints: GeoPoint[] = [
      { id: 'p1', label: 'P1', lat: 60, lng: -150 },
      { id: 'p2', label: 'P2', lat: 60, lng: -60 },
      { id: 'p3', label: 'P3', lat: 60, lng: 30 },
      { id: 'p4', label: 'P4', lat: 60, lng: 120 },
      { id: 'p5', label: 'P5', lat: -45, lng: 150 },
    ];
    const expectedTones: ClusterMapTone[] = ['primary', 'secondary', 'emerald', 'amber', 'rose'];
    const expectedTokens = [
      'var(--prism-primary-main)',
      'var(--prism-secondary-main)',
      'var(--prism-success-main)',
      'var(--prism-warning-main)',
      'var(--prism-error-main)',
    ];

    const { rerender } = render(<PointClusterMap points={fiveSpreadPoints} />);

    expect(screen.getByRole('heading', { name: 'Geospatial Point Cluster Map' })).toBeInTheDocument();
    expect(screen.queryByTestId('cluster-map-category-filters')).not.toBeInTheDocument();

    expectedTones.forEach((tone, idx) => {
      const pin = screen.getByTestId(`cluster-map-pin-p${idx + 1}`);
      expect(pin).toHaveAttribute('data-tone', tone);
      expect(pin).toHaveAttribute('fill', expectedTokens[idx]);
    });

    // Categorized points without explicit tones cycle through all 5 category tones
    rerender(
      <PointClusterMap
        points={fiveSpreadPoints.map((pt, idx) => ({
          ...pt,
          category: `Zone-${idx + 1}`,
        }))}
      />
    );
    expectedTones.forEach((tone, idx) => {
      expect(screen.getByTestId(`cluster-map-category-Zone-${idx + 1}`)).toHaveAttribute(
        'data-tone',
        tone
      );
    });
  });

  it('defends against XSS payloads, prototype-polluting IDs/categories, non-finite & out-of-range coords, duplicate IDs, and empty inputs', () => {
    const xss = '<script>window.__mapClusterXss=1</script><img src=x onerror=alert(1)>';
    const onSelectPoint = vi.fn<(point: GeoPoint) => void>();

    const { rerender } = render(
      <PointClusterMap
        title={xss}
        defaultZoom={Number.NaN}
        onSelectPoint={onSelectPoint}
        points={[
          { id: '   ', label: 'Blank ID skipped', lat: 0, lng: 0 },
          { id: 'nan-lat', label: 'NaN Lat', lat: Number.NaN, lng: 10 },
          { id: 'inf-lng', label: 'Inf Lng', lat: 10, lng: Number.POSITIVE_INFINITY },
          {
            id: '__proto__',
            label: xss,
            lat: 150,
            lng: -300,
            category: '__proto__',
            value: Number.NaN,
          },
          { id: '__proto__', label: 'Duplicate Proto skipped', lat: 0, lng: 0 },
          {
            id: 'constructor',
            label: 'Ctor Point',
            lat: -140,
            lng: 250,
            category: 'constructor',
            value: Number.POSITIVE_INFINITY,
          },
          {
            id: 'prototype',
            label: 'Prototype Point',
            lat: 0,
            lng: 0,
            category: '  ',
            value: 42,
          },
        ]}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xss })).toBeInTheDocument();
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('1×');
    expect(screen.getByTestId('cluster-map-telemetry')).toHaveTextContent('3 markers · 0 clusters');
    expect(screen.getByTestId('cluster-map-svg').innerHTML).not.toContain('NaN');

    // Out-of-range finite coords clamped cleanly: (150, -300) -> (90, -180) -> SVG (0, 0)
    const protoPin = screen.getByTestId('cluster-map-pin-__proto__');
    expect(Number(protoPin.getAttribute('cx'))).toBe(0);
    expect(Number(protoPin.getAttribute('cy'))).toBe(0);

    // (-140, 250) -> (-90, 180) -> SVG (640, 320)
    const ctorPin = screen.getByTestId('cluster-map-pin-constructor');
    expect(Number(ctorPin.getAttribute('cx'))).toBe(640);
    expect(Number(ctorPin.getAttribute('cy'))).toBe(320);

    // Selecting __proto__ reports safely clamped coordinates & omits NaN value, XSS stays literal text
    fireEvent.click(protoPin);
    expect(onSelectPoint).toHaveBeenCalledWith(
      expect.objectContaining({ id: '__proto__', lat: 90, lng: -180, category: '__proto__' })
    );
    expect(screen.getByTestId('cluster-map-inspector-summary')).toHaveTextContent(
      `${xss} · 90.00°, -180.00°`
    );
    expect(screen.queryByTestId('cluster-map-inspector-value')).not.toBeInTheDocument();

    // Empty / all-invalid points render role="status" empty state without SVG
    rerender(
      <PointClusterMap
        points={[
          { id: '', label: 'Blank', lat: 0, lng: 0 },
          { id: 'bad1', label: 'Bad Lat', lat: Number.NaN, lng: 0 },
          { id: 'bad2', label: 'Bad Lng', lat: 0, lng: Number.NEGATIVE_INFINITY },
        ]}
        data-testid="all-invalid-map"
      />
    );
    expect(screen.getByTestId('all-invalid-map')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('No valid geographic points available.');

    rerender(<PointClusterMap points={[]} data-testid="empty-map" />);
    expect(screen.getByTestId('empty-map')).toHaveAttribute('data-empty', 'true');
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('No valid geographic points available.');
    expect(screen.queryByTestId('cluster-map-svg')).not.toBeInTheDocument();
  });

  it('clamps defaultZoom bounds (1..4), restores defaultZoom on Reset, and computes multi-point cluster centroids accurately', () => {
    const denseCluster: GeoPoint[] = [
      { id: 'm1', label: 'Newark', lat: 40.74, lng: -74.17, category: 'East' },
      { id: 'm2', label: 'New York', lat: 40.71, lng: -74.01, category: 'East' },
      { id: 'm3', label: 'Philadelphia', lat: 39.95, lng: -75.16, category: 'East' },
    ];

    const first = render(
      <PointClusterMap points={denseCluster} defaultZoom={2.5} clusterRadius={96} />
    );
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('2.5×');
    const cluster3 = screen.getByRole('button', { name: /Cluster of 3 markers/i });
    expect(cluster3).toHaveAttribute('data-count', '3');
    const expectedCx =
      (((-74.17 + 180) / 360) * 640 +
        ((-74.01 + 180) / 360) * 640 +
        ((-75.16 + 180) / 360) * 640) /
      3;
    expect(Number(cluster3.getAttribute('cx'))).toBeCloseTo(expectedCx, 1);

    fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }));
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('3×');
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('2.5×');
    first.unmount();

    const high = render(<PointClusterMap points={denseCluster} defaultZoom={9} />);
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('4×');
    expect(screen.getByRole('button', { name: 'Zoom In' })).toBeDisabled();
    high.unmount();

    render(<PointClusterMap points={denseCluster} defaultZoom={0} />);
    expect(screen.getByTestId('cluster-map-zoom-value')).toHaveTextContent('1×');
    expect(screen.getByRole('button', { name: 'Zoom Out' })).toBeDisabled();
  });
});
