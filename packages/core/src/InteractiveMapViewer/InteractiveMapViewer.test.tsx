import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  InteractiveMapViewer,
  type MapPin,
  type MapRoute,
} from './index';

const SAMPLE_PINS: ReadonlyArray<MapPin> = [
  {
    id: 'sf',
    label: 'San Francisco Hub',
    category: 'Edge PoP',
    description: 'Primary Pacific optical transit station.',
    x: 24,
    y: 42,
  },
  {
    id: 'den',
    label: 'Denver Relay',
    category: 'Backbone',
    x: 50,
    y: 52,
  },
  {
    id: 'nyc',
    label: 'New York Metro',
    category: 'Cluster',
    description: 'High-density Atlantic ingress cluster.',
    x: 78,
    y: 36,
    clusterCount: 14,
  },
];

const SAMPLE_ROUTES: ReadonlyArray<MapRoute> = [
  { id: 'r1', fromPinId: 'sf', toPinId: 'den', label: '28ms' },
  { id: 'r2', fromPinId: 'den', toPinId: 'nyc' },
];

describe('InteractiveMapViewer', () => {
  it('renders optical glass canvas, topographic SVG, routes, pins, cluster orbs, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            InteractiveMapViewer: { className: 'theme-map', style: { maxWidth: '880px' } },
          },
        }}
      >
        <InteractiveMapViewer
          ref={ref}
          pins={SAMPLE_PINS}
          routes={SAMPLE_ROUTES}
          heightPx={420}
          className="local-map"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ borderRadius: '26px' }}
          data-testid="map-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('map-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-interactive-map-viewer',
      'prism-slab',
      'theme-map',
      'local-map'
    );
    expect(root).toHaveStyle({ height: '420px', maxWidth: '880px', borderRadius: '26px' });

    const viewport = screen.getByTestId('map-viewport');
    expect(viewport).toHaveClass('prism-studio-grid', 'refractor-interactive-map-viewer__viewport');

    expect(screen.getByTestId('map-zoom-readout')).toHaveTextContent('100%');
    expect(screen.getByTestId('map-telemetry')).toHaveTextContent('3 pins · 2 routes');

    // Topographic SVG uses semantic token --prism-divider
    const topoSvg = screen.getByTestId('map-topo-svg');
    const topoLines = topoSvg.querySelectorAll('line');
    expect(topoLines.length).toBeGreaterThanOrEqual(8);
    expect(topoLines[0]).toHaveAttribute('stroke', 'var(--prism-divider)');

    // Route lines use semantic token --prism-secondary-main by default with dashed optical path
    const route1 = screen.getByTestId('map-route-r1');
    expect(route1).toHaveAttribute('stroke', 'var(--prism-secondary-main)');
    expect(route1).toHaveAttribute('stroke-dasharray', '6 4');
    expect(screen.getByTestId('map-route-label-r1')).toHaveTextContent('28ms');

    // Cluster pin renders numbered cluster orb
    const clusterPin = screen.getByTestId('map-pin-nyc');
    expect(clusterPin).toHaveAttribute('data-cluster', 'true');
    expect(screen.getByTestId('map-pin-cluster-count-nyc')).toHaveTextContent('14');
    expect(clusterPin).toHaveAttribute('aria-label', 'New York Metro (14 clustered pins)');

    // Standard pin does not render cluster badge
    expect(screen.getByTestId('map-pin-sf')).not.toHaveAttribute('data-cluster');
    expect(screen.queryByTestId('map-pin-popup')).toBeNull();
  });

  it('selects pins, displays floating info popup with metadata, highlights connected routes, and dismisses via Close, Escape, or canvas click', () => {
    const onSelectPin = vi.fn<(pin: MapPin | null) => void>();

    render(
      <InteractiveMapViewer
        pins={SAMPLE_PINS}
        routes={SAMPLE_ROUTES}
        onSelectPin={onSelectPin}
      />
    );

    // Click cluster pin -> popup opens with label, category, cluster count, description, coords
    fireEvent.pointerDown(screen.getByTestId('map-pin-nyc'));
    fireEvent.click(screen.getByTestId('map-pin-nyc'));

    expect(onSelectPin).toHaveBeenCalledWith(expect.objectContaining({ id: 'nyc', clusterCount: 14 }));
    expect(screen.getByTestId('map-pin-nyc')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('map-pin-nyc')).toHaveAttribute('data-selected', 'true');

    const popup = screen.getByTestId('map-pin-popup');
    expect(popup).toHaveClass('prism-slab', 'refractor-interactive-map-viewer__popup');
    expect(popup).toHaveTextContent('New York Metro');
    expect(screen.getByTestId('map-pin-popup-category')).toHaveTextContent('Cluster');
    expect(screen.getByTestId('map-pin-popup-cluster')).toHaveTextContent('14 locations');
    expect(screen.getByTestId('map-pin-popup-description')).toHaveTextContent(
      'High-density Atlantic ingress cluster.'
    );
    expect(screen.getByTestId('map-pin-popup-coords')).toHaveTextContent('X 78.0% · Y 36.0%');

    // Connected route highlights with --prism-primary-main; non-connected stays --prism-secondary-main
    expect(screen.getByTestId('map-route-r2')).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(screen.getByTestId('map-route-r1')).toHaveAttribute('stroke', 'var(--prism-secondary-main)');

    // Clicking inside popup does not dismiss it
    fireEvent.pointerDown(popup);
    fireEvent.click(popup);
    expect(screen.getByTestId('map-pin-popup')).toBeInTheDocument();

    // Close button dismisses popup
    fireEvent.click(screen.getByRole('button', { name: 'Close pin details' }));
    expect(screen.queryByTestId('map-pin-popup')).toBeNull();
    expect(onSelectPin).toHaveBeenLastCalledWith(null);

    // Select pin without description -> popup renders without description element
    fireEvent.click(screen.getByTestId('map-pin-den'));
    expect(screen.getByTestId('map-pin-popup')).toHaveTextContent('Denver Relay');
    expect(screen.queryByTestId('map-pin-popup-description')).toBeNull();
    expect(screen.queryByTestId('map-pin-popup-cluster')).toBeNull();

    // IME composing Escape is ignored, standard Escape closes popup
    fireEvent.keyDown(window, { key: 'Escape', isComposing: true });
    expect(screen.getByTestId('map-pin-popup')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByTestId('map-pin-popup')).toBeNull();

    // Select pin and click viewport background to dismiss
    fireEvent.click(screen.getByTestId('map-pin-sf'));
    expect(screen.getByTestId('map-pin-popup')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('map-viewport'));
    expect(screen.queryByTestId('map-pin-popup')).toBeNull();

    // Clicking empty background when nothing is selected does not re-fire onSelectPin
    const callCount = onSelectPin.mock.calls.length;
    fireEvent.click(screen.getByTestId('map-viewport'));
    expect(onSelectPin).toHaveBeenCalledTimes(callCount);
  });

  it('supports controlled and defaultSelectedPinId selection modes', () => {
    const onSelectPin = vi.fn<(pin: MapPin | null) => void>();

    const { rerender } = render(
      <InteractiveMapViewer
        pins={SAMPLE_PINS}
        defaultSelectedPinId="sf"
        onSelectPin={onSelectPin}
      />
    );
    expect(screen.getByTestId('map-pin-popup')).toHaveTextContent('San Francisco Hub');

    // Switch to controlled mode pinned to 'den'
    rerender(
      <InteractiveMapViewer
        pins={SAMPLE_PINS}
        selectedPinId="den"
        onSelectPin={onSelectPin}
      />
    );
    expect(screen.getByTestId('map-pin-popup')).toHaveTextContent('Denver Relay');

    // Clicking 'sf' in controlled mode invokes callback but keeps 'den' until parent updates prop
    fireEvent.click(screen.getByTestId('map-pin-sf'));
    expect(onSelectPin).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'sf' }));
    expect(screen.getByTestId('map-pin-popup')).toHaveTextContent('Denver Relay');

    // Controlled null clears popup
    rerender(
      <InteractiveMapViewer
        pins={SAMPLE_PINS}
        selectedPinId={null}
        onSelectPin={onSelectPin}
      />
    );
    expect(screen.queryByTestId('map-pin-popup')).toBeNull();
  });

  it('supports zoom buttons (0.75x..2.5x step 0.25), keyboard zoom/reset, pointer panning, and unmount cleanup', () => {
    const { unmount } = render(
      <InteractiveMapViewer
        pins={SAMPLE_PINS}
        defaultSelectedPinId="sf"
      />
    );

    const viewport = screen.getByTestId('map-viewport');
    const world = screen.getByTestId('map-world');
    const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
    const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
    const resetBtn = screen.getByRole('button', { name: 'Reset map view' });
    const readout = screen.getByTestId('map-zoom-readout');

    // Zoom out to 0.75x disables zoomOutBtn
    fireEvent.click(zoomOutBtn);
    expect(readout).toHaveTextContent('75%');
    expect(zoomOutBtn).toBeDisabled();

    // Keyboard zoom in (+ and =), IME composing ignored, and zoom out (- and _)
    fireEvent.keyDown(viewport, { key: '+', isComposing: true });
    expect(readout).toHaveTextContent('75%');
    fireEvent.keyDown(viewport, { key: '+' });
    expect(readout).toHaveTextContent('100%');
    fireEvent.keyDown(viewport, { key: '=' });
    expect(readout).toHaveTextContent('125%');
    fireEvent.keyDown(viewport, { key: '-' });
    expect(readout).toHaveTextContent('100%');
    fireEvent.keyDown(viewport, { key: '_' });
    expect(readout).toHaveTextContent('75%');
    fireEvent.keyDown(viewport, { key: 'Tab' });
    expect(readout).toHaveTextContent('75%');

    // Zoom up to max 250% disables zoomInBtn
    for (let i = 0; i < 8; i += 1) {
      fireEvent.click(zoomInBtn);
    }
    expect(readout).toHaveTextContent('250%');
    expect(zoomInBtn).toBeDisabled();

    // Secondary mouse button does not pan
    fireEvent.pointerDown(viewport, { button: 2, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(window, { clientX: 90, clientY: 90 });
    expect(viewport).toHaveAttribute('data-pan-x', '0');

    // Primary drag pans canvas and updates transform, without dismissing popup on post-drag click
    fireEvent.pointerDown(viewport, { button: 0, clientX: 20, clientY: 30 });
    fireEvent.pointerMove(window, { clientX: 85, clientY: 70 });
    fireEvent.pointerUp(window);

    expect(viewport).toHaveAttribute('data-pan-x', '65');
    expect(viewport).toHaveAttribute('data-pan-y', '40');
    expect(world).toHaveStyle({ transform: 'translate3d(65px, 40px, 0) scale(2.5)' });

    fireEvent.click(viewport);
    expect(screen.getByTestId('map-pin-popup')).toBeInTheDocument();

    // Keyboard '0' resets zoom & pan
    fireEvent.keyDown(viewport, { key: '0' });
    expect(readout).toHaveTextContent('100%');
    expect(viewport).toHaveAttribute('data-pan-x', '0');
    expect(viewport).toHaveAttribute('data-pan-y', '0');

    // Pan again with micro-jitter (<= 2px does not suppress background click) and verify Reset button resets
    fireEvent.pointerDown(viewport, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { clientX: 1, clientY: 1 });
    fireEvent.pointerUp(window);
    fireEvent.click(viewport);
    expect(screen.queryByTestId('map-pin-popup')).toBeNull();

    fireEvent.pointerDown(viewport, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(window, { clientX: 40, clientY: 20 });
    fireEvent.pointerUp(window);
    expect(viewport).toHaveAttribute('data-pan-x', '41');
    fireEvent.click(resetBtn);
    expect(viewport).toHaveAttribute('data-pan-x', '0');
    expect(readout).toHaveTextContent('100%');

    // Unmount mid-pan cleans up window pointer listeners safely
    fireEvent.pointerDown(viewport, { button: 0, clientX: 10, clientY: 10 });
    unmount();
    expect(() => {
      fireEvent.pointerMove(window, { clientX: 200, clientY: 200 });
      fireEvent.pointerUp(window);
    }).not.toThrow();
  });

  it('safely handles adversarial pins, dangling/duplicate/self-loop routes, extreme heights, XSS payloads, and empty state', () => {
    const xss = '<script>window.__mapXss=1</script><img src=x onerror=alert(1)>';

    const adversarialPins: MapPin[] = [
      { id: '  ', label: 'Blank ID ignored', x: 10, y: 10 },
      {
        id: 'p1',
        label: xss,
        category: '<b>Cat</b>',
        description: xss,
        x: Number.NaN,
        y: Number.POSITIVE_INFINITY,
        clusterCount: 1,
      },
      { id: 'p1', label: 'Duplicate ID ignored', x: 90, y: 90 },
      {
        id: 'p2',
        label: 'Clamped Cluster',
        x: 500,
        y: -500,
        clusterCount: 999999,
      },
    ];

    const adversarialRoutes: MapRoute[] = [
      { id: ' ', fromPinId: 'p1', toPinId: 'p2' },
      { id: 'self', fromPinId: 'p1', toPinId: 'p1' },
      { id: 'dangling-from', fromPinId: 'missing', toPinId: 'p2' },
      { id: 'dangling-to', fromPinId: 'p1', toPinId: 'missing' },
      { id: 'valid', fromPinId: 'p1', toPinId: 'p2', label: xss },
      { id: 'valid', fromPinId: 'p2', toPinId: 'p1' },
    ];

    const { rerender } = render(
      <InteractiveMapViewer
        pins={adversarialPins}
        routes={adversarialRoutes}
        defaultSelectedPinId="p1"
        heightPx={Number.NaN}
        data-testid="adv-map"
      />
    );

    // NaN height falls back to 340px
    expect(screen.getByTestId('adv-map')).toHaveStyle({ height: '340px' });
    // Only 2 valid pins & 1 valid route rendered
    expect(screen.getByTestId('map-telemetry')).toHaveTextContent('2 pins · 1 route');

    // XSS payload rendered strictly as literal text — zero injected DOM elements
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('map-pin-popup')).toHaveTextContent(xss);
    expect(screen.getByTestId('map-route-label-valid')).toHaveTextContent(xss);

    // Coordinates clamped safely (NaN/Infinity -> 50, 500 -> 100, -500 -> 0)
    expect(screen.getByTestId('map-pin-p1')).toHaveStyle({ left: '50%', top: '50%' });
    expect(screen.getByTestId('map-pin-p2')).toHaveStyle({ left: '100%', top: '0%' });
    // Cluster count 1 is NOT treated as cluster; 999999 clamped to 9999
    expect(screen.getByTestId('map-pin-p1')).not.toHaveAttribute('data-cluster');
    expect(screen.getByTestId('map-pin-cluster-count-p2')).toHaveTextContent('9999');

    // Selecting p2 (which has no category) omits the category pill cleanly
    fireEvent.click(screen.getByTestId('map-pin-p2'));
    expect(screen.queryByTestId('map-pin-popup-category')).toBeNull();

    // Height clamping (min 200, max 700) + singular telemetry + empty state
    rerender(
      <InteractiveMapViewer
        pins={[{ id: 'solo', label: 'Single Pin', x: 30, y: 30 }]}
        heightPx={50}
        data-testid="adv-map"
      />
    );
    expect(screen.getByTestId('adv-map')).toHaveStyle({ height: '200px' });
    expect(screen.getByTestId('map-telemetry')).toHaveTextContent('1 pin · 0 routes');

    rerender(<InteractiveMapViewer pins={[]} heightPx={1800} data-testid="adv-map" />);
    expect(screen.getByTestId('adv-map')).toHaveStyle({ height: '700px' });
    expect(screen.getByTestId('map-empty-state')).toHaveTextContent('No map pins available');
  });
});
