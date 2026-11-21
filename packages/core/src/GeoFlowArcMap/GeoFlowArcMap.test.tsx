import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { GeoFlowArcMap, type GeoFlowArc, type GeoHub } from './index';

const GLOBAL_HUBS: GeoHub[] = [
  { id: 'sfo', label: 'San Francisco', lat: 37.77, lng: -122.42, tone: 'primary' },
  { id: 'nyc', label: 'New York', lat: 40.71, lng: -74.01, tone: 'secondary' },
  { id: 'lon', label: 'London', lat: 51.51, lng: -0.13, tone: 'emerald' },
  { id: 'sin', label: 'Singapore', lat: 1.35, lng: 103.82, tone: 'amber' },
  { id: 'syd', label: 'Sydney', lat: -33.87, lng: 151.21, tone: 'rose' },
  { id: 'scl', label: 'Santiago', lat: -33.45, lng: -70.67, tone: 'primary' },
];

const GLOBAL_FLOWS: GeoFlowArc[] = [
  {
    id: 'f-sfo-nyc',
    origin: 'sfo',
    destination: 'nyc',
    volume: 400,
    label: 'Trans-US Optical',
  },
  {
    id: 'f-nyc-lon',
    origin: 'nyc',
    destination: 'lon',
    volume: 800,
    label: 'Transatlantic Core',
    tone: 'emerald',
  },
  {
    id: 'f-lon-sin',
    origin: 'lon',
    destination: 'sin',
    volume: 200,
  },
  {
    id: 'f-sin-syd',
    origin: 'sin',
    destination: 'syd',
    volume: 350.5,
    label: 'APAC Express',
  },
];

describe('GeoFlowArcMap', () => {
  it('renders equirectangular projection, graticule, landmasses, curved quadratic-bezier arcs with midpoint arrows, forwards ref, and uses only semantic CSS tokens', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            GeoFlowArcMap: {
              className: 'theme-geo-map',
              style: { maxWidth: '860px' },
            },
          },
        }}
      >
        <GeoFlowArcMap
          ref={ref}
          hubs={GLOBAL_HUBS}
          flows={GLOBAL_FLOWS}
          valueUnit=" Gbps"
          className="consumer-geo-map"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="geo-map-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('geo-map-root');
    expect(ref.current).toBe(root);
    expect(GeoFlowArcMap.displayName).toBe('GeoFlowArcMap');
    expect(root).toHaveClass(
      'refractor-geo-flow-arc-map',
      'prism-slab',
      'theme-geo-map',
      'consumer-geo-map'
    );
    expect(root).toHaveStyle({ maxWidth: '860px' });
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-selection');

    expect(screen.getByRole('heading', { name: 'Global Flow Arc Map' })).toBeInTheDocument();
    expect(screen.getByTestId('geo-flow-summary-pill')).toHaveClass('prism-crystal');
    expect(screen.getByTestId('geo-flow-summary-pill')).toHaveTextContent(
      '6 hubs · 4 routes · 1750.5 Gbps'
    );
    expect(screen.queryByTestId('geo-flow-clear-focus')).toBeNull();

    const svg = screen.getByRole('img', {
      name: 'Global Flow Arc Map geospatial arc map with 6 hubs and 4 routes',
    });
    expect(svg).toHaveAttribute('viewBox', '0 0 640 320');
    expect(svg).toHaveStyle({ height: '280px' });
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // Graticule grid & stylized continental landmasses
    expect(svg.querySelectorAll('line[data-role="geo-flow-lat-line"]')).toHaveLength(5);
    expect(svg.querySelectorAll('line[data-role="geo-flow-lng-line"]')).toHaveLength(5);
    const landmasses = svg.querySelectorAll('path[data-role="geo-flow-landmass"]');
    expect(landmasses.length).toBeGreaterThanOrEqual(7);
    landmasses.forEach((landmass) => {
      expect(landmass).toHaveAttribute('fill', 'var(--prism-text-secondary)');
      expect(landmass).toHaveAttribute('stroke', 'var(--prism-divider)');
    });

    // Exact equirectangular projection checks: x = ((lng + 180) / 360) * 640, y = ((90 - lat) / 180) * 320
    const sfoHub = svg.querySelector('circle[data-hub-id="sfo"]')!;
    const expectedSfoX = Number(((( -122.42 + 180) / 360) * 640).toFixed(2));
    const expectedSfoY = Number((((90 - 37.77) / 180) * 320).toFixed(2));
    expect(Number(sfoHub.getAttribute('cx'))).toBeCloseTo(expectedSfoX, 2);
    expect(Number(sfoHub.getAttribute('cy'))).toBeCloseTo(expectedSfoY, 2);
    expect(sfoHub).toHaveAttribute('fill', 'var(--prism-primary-main)');
    expect(svg.querySelector('circle[data-hub-id="nyc"]')).toHaveAttribute(
      'fill',
      'var(--prism-secondary-main)'
    );
    expect(svg.querySelector('circle[data-hub-id="lon"]')).toHaveAttribute(
      'fill',
      'var(--prism-success-main)'
    );
    expect(svg.querySelector('circle[data-hub-id="sin"]')).toHaveAttribute(
      'fill',
      'var(--prism-warning-main)'
    );
    expect(svg.querySelector('circle[data-hub-id="syd"]')).toHaveAttribute(
      'fill',
      'var(--prism-error-main)'
    );

    // Curved quadratic-bezier flow paths & directional midpoint arrows
    const arcPaths = svg.querySelectorAll('path[data-role="geo-flow-arc"]');
    expect(arcPaths).toHaveLength(4);
    arcPaths.forEach((path) => {
      const d = path.getAttribute('d') ?? '';
      expect(d).toMatch(/^M [\d.-]+,[\d.-]+ Q [\d.-]+,[\d.-]+ [\d.-]+,[\d.-]+$/);
      const match = /^M ([\d.-]+),([\d.-]+) Q ([\d.-]+),([\d.-]+) ([\d.-]+),([\d.-]+)$/.exec(d)!;
      const ctrlX = Number(match[3]);
      const ctrlY = Number(match[4]);
      expect(ctrlX).toBeGreaterThanOrEqual(8);
      expect(ctrlX).toBeLessThanOrEqual(632);
      expect(ctrlY).toBeGreaterThanOrEqual(8);
      expect(ctrlY).toBeLessThanOrEqual(312);
      expect(path.getAttribute('stroke')).toMatch(/^var\(--prism-/);
      expect(path).toHaveAttribute('opacity', '0.72');
    });

    const arrows = svg.querySelectorAll('polygon[data-role="geo-flow-arrow"]');
    expect(arrows).toHaveLength(4);
    arrows.forEach((arrow) => {
      expect(arrow.getAttribute('transform')).toMatch(
        /^translate\([\d.-]+ [\d.-]+\) rotate\([\d.-]+\)$/
      );
    });

    // Proportional stroke widths scaled to 1.5..6 & tone override vs origin fallback
    const maxArc = svg.querySelector('path[data-flow-id="f-nyc-lon"]')!;
    const minArc = svg.querySelector('path[data-flow-id="f-lon-sin"]')!;
    const midArc = svg.querySelector('path[data-flow-id="f-sfo-nyc"]')!;
    expect(Number(maxArc.getAttribute('stroke-width'))).toBe(6);
    expect(Number(minArc.getAttribute('stroke-width'))).toBe(1.5);
    expect(Number(midArc.getAttribute('stroke-width'))).toBeGreaterThan(1.5);
    expect(Number(midArc.getAttribute('stroke-width'))).toBeLessThan(6);
    expect(maxArc).toHaveAttribute('stroke', 'var(--prism-success-main)'); // explicit tone override
    expect(midArc).toHaveAttribute('stroke', 'var(--prism-primary-main)'); // inherited from sfo

    const readout = screen.getByTestId('geo-flow-arc-map-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent(
      'Select any flow arc or hub node to inspect route volume and hub throughput.'
    );
  });

  it('highlights active flow arc (0.95 vs 0.16), fires onSelectFlow, shows Clear Focus, updates prism-well readout, and handles IME-safe keyboard events', () => {
    const onSelectFlow = vi.fn();
    render(
      <GeoFlowArcMap
        title="Global Backbone"
        hubs={GLOBAL_HUBS}
        flows={GLOBAL_FLOWS}
        valueUnit=" Gbps"
        onSelectFlow={onSelectFlow}
        data-testid="geo-interactive"
      />
    );

    const labeledArc = screen.getByRole('button', {
      name: 'New York → London · 800 Gbps (Transatlantic Core)',
    });
    const unlabeledArc = screen.getByRole('button', {
      name: 'London → Singapore · 200 Gbps',
    });
    const fractionalArc = screen.getByRole('button', {
      name: 'Singapore → Sydney · 350.5 Gbps (APAC Express)',
    });

    // Click flow arc with label
    fireEvent.click(labeledArc);
    expect(onSelectFlow).toHaveBeenCalledTimes(1);
    expect(onSelectFlow).toHaveBeenCalledWith(GLOBAL_FLOWS[1], GLOBAL_HUBS[1], GLOBAL_HUBS[2]);
    expect(screen.getByTestId('geo-interactive')).toHaveAttribute('data-selection', 'flow');
    expect(labeledArc).toHaveAttribute('opacity', '0.95');
    expect(labeledArc).toHaveAttribute('data-selected', 'true');
    expect(labeledArc).toHaveAttribute('data-highlighted', 'true');
    expect(labeledArc).toHaveAttribute('aria-pressed', 'true');
    expect(unlabeledArc).toHaveAttribute('opacity', '0.16');
    expect(unlabeledArc).toHaveAttribute('data-selected', 'false');
    expect(unlabeledArc).toHaveAttribute('data-highlighted', 'false');

    const readout = screen.getByTestId('geo-flow-arc-map-readout');
    expect(readout).toHaveTextContent('New York → London · 800 Gbps');
    expect(screen.getByTestId('geo-flow-readout-label')).toHaveTextContent('Transatlantic Core');
    expect(screen.getByTestId('geo-flow-share-badge')).toHaveClass('prism-emerald');

    // Clear Focus header button restores default state
    const clearButton = screen.getByRole('button', { name: 'Clear Focus' });
    fireEvent.click(clearButton);
    expect(screen.queryByRole('button', { name: 'Clear Focus' })).toBeNull();
    expect(screen.getByTestId('geo-interactive')).not.toHaveAttribute('data-selection');
    expect(labeledArc).toHaveAttribute('opacity', '0.72');
    expect(unlabeledArc).toHaveAttribute('opacity', '0.72');

    // IME composition Enter must be ignored
    fireEvent.keyDown(unlabeledArc, { key: 'Enter', isComposing: true });
    expect(onSelectFlow).toHaveBeenCalledTimes(1);

    // Unrelated key must be ignored
    fireEvent.keyDown(unlabeledArc, { key: 'Tab' });
    expect(onSelectFlow).toHaveBeenCalledTimes(1);

    // Enter selects flow arc without optional label
    fireEvent.keyDown(unlabeledArc, { key: 'Enter' });
    expect(onSelectFlow).toHaveBeenLastCalledWith(GLOBAL_FLOWS[2], GLOBAL_HUBS[2], GLOBAL_HUBS[3]);
    expect(unlabeledArc).toHaveAttribute('opacity', '0.95');
    expect(labeledArc).toHaveAttribute('opacity', '0.16');
    expect(readout).toHaveTextContent('London → Singapore · 200 Gbps');
    expect(screen.queryByTestId('geo-flow-readout-label')).toBeNull();

    // Space selects fractional volume flow arc
    fireEvent.keyDown(fractionalArc, { key: ' ' });
    expect(onSelectFlow).toHaveBeenLastCalledWith(GLOBAL_FLOWS[3], GLOBAL_HUBS[3], GLOBAL_HUBS[4]);
    expect(readout).toHaveTextContent('Singapore → Sydney · 350.5 Gbps');

    // Escape clears selection
    fireEvent.keyDown(fractionalArc, { key: 'Escape' });
    expect(screen.getByTestId('geo-interactive')).not.toHaveAttribute('data-selection');
    expect(fractionalArc).toHaveAttribute('opacity', '0.72');
  });

  it('isolates inbound & outbound routes when clicking or keyboard-activating a hub and reports hub throughput in prism-well', () => {
    render(
      <GeoFlowArcMap
        hubs={GLOBAL_HUBS}
        flows={GLOBAL_FLOWS}
        valueUnit=" Gbps"
        data-testid="geo-hub-focus"
      />
    );

    const londonHub = screen.getByRole('button', {
      name: 'London hub: outbound 200 Gbps, inbound 800 Gbps',
    });
    const sydneyHub = screen.getByRole('button', {
      name: 'Sydney hub: outbound 0 Gbps, inbound 350.5 Gbps',
    });
    const santiagoHub = screen.getByRole('button', {
      name: 'Santiago hub: outbound 0 Gbps, inbound 0 Gbps',
    });
    const nycHub = screen.getByRole('button', {
      name: 'New York hub: outbound 800 Gbps, inbound 400 Gbps',
    });

    fireEvent.click(londonHub);
    expect(screen.getByTestId('geo-hub-focus')).toHaveAttribute('data-selection', 'hub');
    expect(londonHub).toHaveAttribute('data-selected', 'true');
    expect(londonHub).toHaveAttribute('aria-pressed', 'true');
    expect(londonHub).toHaveAttribute('opacity', '1');
    // Connected neighbor keeps elevated visibility; unrelated hub dims
    expect(nycHub).toHaveAttribute('opacity', '0.9');
    expect(santiagoHub).toHaveAttribute('opacity', '0.32');

    // Only London inbound/outbound arcs are highlighted (0.95); others dimmed (0.16)
    const svg = screen.getByRole('img');
    const arcs = Array.from(svg.querySelectorAll('path[data-role="geo-flow-arc"]'));
    for (const arc of arcs) {
      const incident =
        arc.getAttribute('data-origin') === 'lon' ||
        arc.getAttribute('data-destination') === 'lon';
      expect(arc).toHaveAttribute('opacity', incident ? '0.95' : '0.16');
      expect(arc).toHaveAttribute('data-highlighted', incident ? 'true' : 'false');
    }

    const readout = screen.getByTestId('geo-flow-arc-map-readout');
    expect(readout).toHaveTextContent('London');
    expect(readout).toHaveTextContent('51.5°N, 0.1°W');
    expect(screen.getByTestId('geo-flow-hub-outbound')).toHaveClass('prism-emerald');
    expect(screen.getByTestId('geo-flow-hub-outbound')).toHaveTextContent('Outbound: 200 Gbps');
    expect(screen.getByTestId('geo-flow-hub-inbound')).toHaveTextContent('Inbound: 800 Gbps');
    expect(screen.getByRole('button', { name: 'Clear Focus' })).toBeInTheDocument();

    // IME composition Enter on hub is ignored
    fireEvent.keyDown(sydneyHub, { key: 'Enter', isComposing: true });
    expect(londonHub).toHaveAttribute('data-selected', 'true');

    // Unrelated key on hub is ignored
    fireEvent.keyDown(sydneyHub, { key: 'ArrowLeft' });
    expect(londonHub).toHaveAttribute('data-selected', 'true');

    // Enter activates Southern/Eastern hemisphere hub
    fireEvent.keyDown(sydneyHub, { key: 'Enter' });
    expect(sydneyHub).toHaveAttribute('data-selected', 'true');
    expect(readout).toHaveTextContent('Sydney');
    expect(readout).toHaveTextContent('33.9°S, 151.2°E');
    expect(screen.getByTestId('geo-flow-hub-outbound')).toHaveTextContent('Outbound: 0 Gbps');
    expect(screen.getByTestId('geo-flow-hub-inbound')).toHaveTextContent('Inbound: 350.5 Gbps');

    // Space activates isolated hub (0 routes -> all arcs dim to 0.16, SW coordinates)
    fireEvent.keyDown(santiagoHub, { key: ' ' });
    expect(santiagoHub).toHaveAttribute('data-selected', 'true');
    expect(readout).toHaveTextContent('33.5°S, 70.7°W');
    expect(screen.getByTestId('geo-flow-hub-outbound')).toHaveTextContent('Outbound: 0 Gbps');
    expect(screen.getByTestId('geo-flow-hub-inbound')).toHaveTextContent('Inbound: 0 Gbps');
    svg.querySelectorAll('path[data-role="geo-flow-arc"]').forEach((arc) => {
      expect(arc).toHaveAttribute('opacity', '0.16');
    });

    // Escape clears hub focus
    fireEvent.keyDown(santiagoHub, { key: 'Escape' });
    expect(screen.getByTestId('geo-hub-focus')).not.toHaveAttribute('data-selection');
    expect(screen.queryByRole('button', { name: 'Clear Focus' })).toBeNull();
  });

  it('filters invalid hubs and flows, clamps coordinates & heights, handles coincident hubs, bidirectional routes, equal volumes, edge labels, and stale selection recovery', () => {
    const complexHubs: GeoHub[] = [
      { id: 'west', label: 'West Pole', lat: 120, lng: -240 }, // clamps to (90, -180) -> x=0, y=0
      { id: 'west', label: 'Duplicate West', lat: 0, lng: 0 }, // deduplicated
      { id: 'east', label: 'East Antimeridian', lat: -120, lng: 240 }, // clamps to (-90, 180) -> x=640, y=320
      { id: 'nan-hub', label: 'Bad Lat', lat: Number.NaN, lng: 10 }, // filtered out
      { id: 'nan-hub', label: 'Recovered Valid', lat: 15, lng: 20 }, // valid after NaN entry
      { id: 'inf-hub', label: 'Bad Lng', lat: 10, lng: Number.POSITIVE_INFINITY }, // filtered out
      { id: '   ', label: 'Blank ID', lat: 10, lng: 10 }, // filtered out
      { id: 'coinc-a', label: 'Coincident A', lat: 0, lng: 0 },
      { id: 'coinc-b', label: 'Coincident B', lat: 0, lng: 0 },
    ];

    const complexFlows: GeoFlowArc[] = [
      { id: 'f1', origin: 'west', destination: 'east', volume: 50 },
      { id: 'f1', origin: 'east', destination: 'west', volume: 999 }, // duplicate flow id filtered out
      { id: 'f2', origin: 'east', destination: 'west', volume: 50 }, // opposite direction bidirectional arc
      { id: 'f3', origin: 'coinc-a', destination: 'coinc-b', volume: 50 }, // dist === 0 coincident endpoints
      { id: 'f4', origin: 'nan-hub', destination: 'coinc-a', volume: 50 },
      // Invalid flows that MUST be ignored:
      { id: '   ', origin: 'west', destination: 'east', volume: 10 }, // blank flow id
      { id: 'bad-self', origin: 'west', destination: 'west', volume: 20 }, // self-loop
      { id: 'bad-zero', origin: 'west', destination: 'east', volume: 0 }, // zero volume
      { id: 'bad-neg', origin: 'west', destination: 'east', volume: -12 }, // negative volume
      { id: 'bad-nan', origin: 'west', destination: 'east', volume: Number.NaN }, // NaN volume
      { id: 'bad-inf', origin: 'west', destination: 'east', volume: Number.POSITIVE_INFINITY }, // Infinity
      { id: 'bad-orig', origin: 'missing', destination: 'east', volume: 20 }, // unknown origin
      { id: 'bad-dest', origin: 'west', destination: 'missing', volume: 20 }, // unknown destination
      { id: 'bad-inf-hub', origin: 'inf-hub', destination: 'east', volume: 20 }, // references filtered hub
    ];

    const { rerender } = render(
      <GeoFlowArcMap hubs={complexHubs} flows={complexFlows} height={100} />
    );

    const svg = screen.getByRole('img');
    // Height clamped to minimum 180
    expect(svg).toHaveStyle({ height: '180px' });
    expect(svg.innerHTML).not.toContain('NaN');

    // 5 valid unique hubs and 4 valid unique flows remain
    expect(svg.querySelectorAll('circle[data-role="geo-flow-hub"]')).toHaveLength(5);
    expect(svg.querySelectorAll('path[data-role="geo-flow-arc"]')).toHaveLength(4);
    expect(screen.queryByText('Duplicate West')).toBeNull();
    expect(screen.getByText('Recovered Valid')).toBeInTheDocument();

    // Clamped edge coordinates & label anchors
    const westCircle = svg.querySelector('circle[data-hub-id="west"]')!;
    const eastCircle = svg.querySelector('circle[data-hub-id="east"]')!;
    expect(Number(westCircle.getAttribute('cx'))).toBe(0);
    expect(Number(westCircle.getAttribute('cy'))).toBe(0);
    expect(Number(eastCircle.getAttribute('cx'))).toBe(640);
    expect(Number(eastCircle.getAttribute('cy'))).toBe(320);

    const westText = screen.getByText('West Pole');
    const eastText = screen.getByText('East Antimeridian');
    expect(westText).toHaveAttribute('text-anchor', 'start');
    expect(Number(westText.getAttribute('y'))).toBeGreaterThan(0); // placed below top edge
    expect(eastText).toHaveAttribute('text-anchor', 'end');

    // Equal volumes -> default strokeWidth 3.25
    const f1Path = svg.querySelector('path[data-flow-id="f1"]')!;
    const f2Path = svg.querySelector('path[data-flow-id="f2"]')!;
    const f3Path = svg.querySelector('path[data-flow-id="f3"]')!;
    expect(Number(f1Path.getAttribute('stroke-width'))).toBe(3.25);
    // Bidirectional routes separate into distinct Bezier curves
    expect(f1Path.getAttribute('d')).not.toBe(f2Path.getAttribute('d'));
    // Coincident endpoints produce finite Bezier curve and 0deg arrow rotation
    expect(f3Path.getAttribute('d')).toMatch(/^M 320,160 Q 320,148 320,160$/);
    expect(svg.querySelector('polygon[data-flow-id="f3"]')).toHaveAttribute(
      'transform',
      'translate(320 154) rotate(0)'
    );

    // Click flow with undefined onSelectFlow (no crash), then rerender without that flow -> resets gracefully
    fireEvent.click(f1Path);
    expect(screen.getByTestId('geo-flow-arc-map-readout')).toHaveTextContent(
      'West Pole → East Antimeridian · 50'
    );

    rerender(
      <GeoFlowArcMap
        hubs={[
          { id: 'h1', label: 'Alpha', lat: 10, lng: 10 },
          { id: 'h2', label: 'Beta', lat: 20, lng: 40 },
        ]}
        flows={[{ id: 'f-new', origin: 'h1', destination: 'h2', volume: 25 }]}
        height={900}
      />
    );
    // Height clamped to maximum 480; stale flow selection cleared
    expect(screen.getByRole('img')).toHaveStyle({ height: '480px' });
    expect(screen.getByTestId('geo-flow-arc-map-readout')).toHaveTextContent(
      'Select any flow arc or hub node'
    );

    // Select hub h2, then rerender with NaN height (falls back to 280) and remove h2 -> stale hub cleared
    fireEvent.click(screen.getByRole('button', { name: 'Beta hub: outbound 0, inbound 25' }));
    expect(screen.getByTestId('geo-flow-arc-map-readout')).toHaveTextContent('Beta');

    rerender(
      <GeoFlowArcMap
        hubs={[
          { id: 'h1', label: 'Alpha', lat: 10, lng: 10 },
          { id: 'h3', label: 'Gamma', lat: 30, lng: 60 },
        ]}
        flows={[{ id: 'f-new-2', origin: 'h1', destination: 'h3', volume: 12 }]}
        height={Number.NaN}
      />
    );
    expect(screen.getByRole('img')).toHaveStyle({ height: '280px' });
    expect(screen.getByTestId('geo-flow-arc-map-readout')).toHaveTextContent(
      'Select any flow arc or hub node'
    );
  });

  it('renders accessible role="status" empty states when fewer than 2 valid hubs or zero positive flows exist', () => {
    const { rerender } = render(
      <GeoFlowArcMap hubs={[]} flows={[]} data-testid="empty-geo" />
    );

    expect(screen.getByTestId('empty-geo')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toHaveClass('prism-well');
    expect(screen.getByTestId('geo-flow-arc-map-empty')).toHaveTextContent(
      'Provide at least two valid geographic hubs and one positive flow route to render arcs.'
    );
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByTestId('geo-flow-summary-pill')).toBeNull();
    expect(screen.queryByTestId('geo-flow-arc-map-readout')).toBeNull();

    // Only 1 valid hub (second hub has NaN lat)
    rerender(
      <GeoFlowArcMap
        hubs={[
          { id: 'a', label: 'Only Hub', lat: 10, lng: 20 },
          { id: 'b', label: 'Invalid Hub', lat: Number.NaN, lng: 30 },
        ]}
        flows={[{ id: 'f1', origin: 'a', destination: 'b', volume: 100 }]}
        data-testid="empty-geo"
      />
    );
    expect(screen.getByTestId('empty-geo')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Two valid hubs, but all flows are invalid (zero, negative, self-loop)
    rerender(
      <GeoFlowArcMap
        hubs={[
          { id: 'a', label: 'Hub A', lat: 10, lng: 20 },
          { id: 'b', label: 'Hub B', lat: 30, lng: 40 },
        ]}
        flows={[
          { id: 'f-self', origin: 'a', destination: 'a', volume: 50 },
          { id: 'f-zero', origin: 'a', destination: 'b', volume: 0 },
          { id: 'f-neg', origin: 'a', destination: 'b', volume: -5 },
        ]}
        data-testid="empty-geo"
      />
    );
    expect(screen.getByTestId('empty-geo')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('resists prototype pollution via adversarial hub/flow IDs and neutralizes XSS payloads', () => {
    const onSelectFlow = vi.fn();
    const protoHubs: GeoHub[] = [
      { id: '__proto__', label: 'Proto Origin', lat: 35, lng: -100, tone: 'primary' },
      { id: 'constructor', label: 'Constructor Hub', lat: 48, lng: 2, tone: 'secondary' },
      { id: 'prototype', label: 'Prototype Hub', lat: 35, lng: 139, tone: 'emerald' },
    ];
    const protoFlows: GeoFlowArc[] = [
      {
        id: '__proto__',
        origin: '__proto__',
        destination: 'constructor',
        volume: 120,
        label: 'Proto Route',
      },
      {
        id: 'constructor',
        origin: 'constructor',
        destination: 'prototype',
        volume: 80,
      },
    ];

    const { rerender } = render(
      <GeoFlowArcMap hubs={protoHubs} flows={protoFlows} onSelectFlow={onSelectFlow} />
    );

    expect(({} as Record<string, string>)['polluted']).toBeUndefined();
    const protoArc = screen.getByRole('button', {
      name: 'Proto Origin → Constructor Hub · 120 (Proto Route)',
    });
    fireEvent.click(protoArc);
    expect(onSelectFlow).toHaveBeenCalledWith(protoFlows[0], protoHubs[0], protoHubs[1]);
    expect(screen.getByTestId('geo-flow-arc-map-readout')).toHaveTextContent(
      'Proto Origin → Constructor Hub · 120'
    );

    const payload = '<script>window.__geoFlowXss=1</script><img src=x onerror=alert(1)>';
    rerender(
      <GeoFlowArcMap
        title={payload}
        valueUnit={payload}
        hubs={[
          { id: 'x1', label: payload, lat: 20, lng: -40 },
          { id: 'x2', label: 'Safe Destination', lat: 45, lng: 30 },
        ]}
        flows={[
          { id: 'fx', origin: 'x1', destination: 'x2', volume: 15, label: payload },
        ]}
      />
    );
    expect(screen.getByRole('heading', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
  });
});
