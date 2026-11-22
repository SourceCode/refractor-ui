import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_PITCH_DEG,
  DEFAULT_SURFACE_GRID,
  DEFAULT_YAW_DEG,
  DEFAULT_ZOOM,
  MAX_PITCH_DEG,
  MAX_YAW_DEG,
  MAX_ZOOM,
  MIN_PITCH_DEG,
  MIN_YAW_DEG,
  MIN_ZOOM,
  SurfaceMesh3DPlot,
  type MeshRenderStyle,
  type MeshRenderStyleMap,
  type SurfaceMeshCell,
} from './index';

describe('SurfaceMesh3DPlot', () => {
  it('renders default 9×9 damped-sinc 3D surface with painter-sorted facets, semantic tokens, ref, and theme override', () => {
    const ref = createRef<HTMLDivElement>();
    const styleMap: MeshRenderStyleMap = {
      shaded: true,
      wireframe: true,
    };
    expect(Object.keys(styleMap)).toHaveLength(2);
    expect(DEFAULT_SURFACE_GRID).toHaveLength(9);
    expect(DEFAULT_SURFACE_GRID[0]).toHaveLength(9);
    expect(DEFAULT_YAW_DEG).toBe(38);
    expect(DEFAULT_PITCH_DEG).toBe(30);
    expect(MIN_YAW_DEG).toBe(-180);
    expect(MAX_YAW_DEG).toBe(180);
    expect(MIN_PITCH_DEG).toBe(10);
    expect(MAX_PITCH_DEG).toBe(80);
    expect(MIN_ZOOM).toBe(0.7);
    expect(MAX_ZOOM).toBe(1.6);
    expect(DEFAULT_ZOOM).toBe(1);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SurfaceMesh3DPlot: {
              className: 'theme-surface-mesh',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <SurfaceMesh3DPlot
          ref={ref}
          className="local-surface-mesh"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="surface-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('surface-root');
    expect(ref.current).toBe(root);
    expect(SurfaceMesh3DPlot.displayName).toBe('SurfaceMesh3DPlot');
    expect(root).toHaveClass(
      'refractor-surface-mesh-3d-plot',
      'prism-slab',
      'theme-surface-mesh',
      'local-surface-mesh'
    );
    expect(root).toHaveStyle({ maxWidth: '820px', marginTop: '8px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-render-style', 'shaded');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByTestId('surface-mesh-title')).toHaveTextContent('3D Surface & Mesh Plot');

    const stage = screen.getByTestId('surface-mesh-stage');
    expect(stage).toHaveClass('prism-well', 'refractor-surface-mesh-3d-plot__stage');

    const svg = screen.getByTestId('surface-mesh-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 460 280');
    expect(svg).toHaveClass('w-full', 'h-auto', 'select-none');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
    expect(svg.innerHTML).not.toContain('NaN');

    // 9×9 vertices form 8×8 = 64 quad facets
    const facets = screen.getAllByTestId('surface-mesh-facet');
    expect(facets).toHaveLength(64);

    // Verify painter's algorithm: facets strictly ordered back-to-front (ascending depth)
    const depths = facets.map((facet) => Number(facet.getAttribute('data-depth')));
    for (let i = 1; i < depths.length; i += 1) {
      expect(depths[i]!).toBeGreaterThanOrEqual(depths[i - 1]!);
    }

    // Verify all three elevation semantic tokens are represented
    const fills = new Set(facets.map((facet) => facet.getAttribute('fill')));
    expect(fills.has('var(--prism-info-main)')).toBe(true);
    expect(fills.has('var(--prism-secondary-main)')).toBe(true);
    expect(fills.has('var(--prism-primary-main)')).toBe(true);

    // Telemetry footer checks
    const telemetry = screen.getByTestId('surface-mesh-telemetry');
    expect(telemetry).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 38°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 30°');
    expect(screen.getByTestId('surface-mesh-telemetry-zoom')).toHaveTextContent('Zoom 1.0×');
    expect(screen.getByTestId('surface-mesh-telemetry-z-range')).toHaveTextContent('dB');
    expect(screen.getByTestId('surface-mesh-telemetry-active-cell')).toHaveTextContent(
      'Active Cell None'
    );
  });

  it('toggles Shaded and Wireframe render styles in both uncontrolled and controlled modes', () => {
    const { rerender } = render(<SurfaceMesh3DPlot defaultRenderStyle="shaded" />);

    const shadedBtn = screen.getByTestId('surface-mesh-style-shaded');
    const wireframeBtn = screen.getByTestId('surface-mesh-style-wireframe');

    expect(shadedBtn).toHaveAttribute('aria-pressed', 'true');
    expect(wireframeBtn).toHaveAttribute('aria-pressed', 'false');

    const firstFacetBefore = screen.getAllByTestId('surface-mesh-facet')[0]!;
    expect(firstFacetBefore).toHaveAttribute('stroke', 'var(--prism-crystal-top)');

    // Switch to wireframe
    fireEvent.click(wireframeBtn);
    expect(shadedBtn).toHaveAttribute('aria-pressed', 'false');
    expect(wireframeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('surface-mesh-stage')).toHaveAttribute(
      'data-render-style',
      'wireframe'
    );

    const firstFacetWire = screen.getAllByTestId('surface-mesh-facet')[0]!;
    expect(firstFacetWire).toHaveAttribute('fill-opacity', '0.04');
    expect(firstFacetWire.getAttribute('stroke')).toBe(firstFacetWire.getAttribute('fill'));

    // Clicking a facet in wireframe mode highlights fill-opacity and primary text stroke
    fireEvent.click(firstFacetWire);
    const selectedWireFacet = screen
      .getAllByTestId('surface-mesh-facet')
      .find((f) => f.getAttribute('data-selected') === 'true')!;
    expect(selectedWireFacet).toHaveAttribute('fill-opacity', '0.28');
    expect(selectedWireFacet).toHaveAttribute('stroke', 'var(--prism-text-primary)');

    // Switch back to shaded
    fireEvent.click(shadedBtn);
    expect(shadedBtn).toHaveAttribute('aria-pressed', 'true');
    expect(wireframeBtn).toHaveAttribute('aria-pressed', 'false');

    // Controlled mode test
    const onRenderStyleChange = vi.fn<(style: MeshRenderStyle) => void>();
    rerender(
      <SurfaceMesh3DPlot
        renderStyle="wireframe"
        onRenderStyleChange={onRenderStyleChange}
      />
    );
    expect(wireframeBtn).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(shadedBtn);
    expect(onRenderStyleChange).toHaveBeenCalledWith('shaded');
    // Still controlled at 'wireframe' until parent updates prop
    expect(wireframeBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('zooms cleanly between 0.7× and 1.6× and resets view with Reset View button', () => {
    render(<SurfaceMesh3DPlot defaultYawDeg={25} defaultPitchDeg={40} />);

    const zoomOut = screen.getByTestId('surface-mesh-zoom-out');
    const zoomIn = screen.getByTestId('surface-mesh-zoom-in');
    const zoomBadge = screen.getByTestId('surface-mesh-zoom-badge');
    const stage = screen.getByTestId('surface-mesh-stage');
    const initialPoints = screen.getAllByTestId('surface-mesh-facet')[0]!.getAttribute('points');

    // Zoom out twice: 1.0 -> 0.85 -> 0.7 (disabled at min)
    fireEvent.click(zoomOut);
    expect(zoomBadge).toHaveTextContent('0.85×');
    expect(screen.getByTestId('surface-mesh-telemetry-zoom')).toHaveTextContent('Zoom 0.85×');
    expect(zoomOut).not.toBeDisabled();

    fireEvent.click(zoomOut);
    expect(zoomBadge).toHaveTextContent('0.7×');
    expect(zoomOut).toBeDisabled();

    const zoomedOutPoints = screen.getAllByTestId('surface-mesh-facet')[0]!.getAttribute('points');
    expect(zoomedOutPoints).not.toBe(initialPoints);

    // Zoom in six times: 0.7 -> 0.85 -> 1.0 -> 1.15 -> 1.3 -> 1.45 -> 1.6 (disabled at max)
    for (let i = 0; i < 6; i += 1) {
      fireEvent.click(zoomIn);
    }
    expect(zoomBadge).toHaveTextContent('1.6×');
    expect(zoomIn).toBeDisabled();

    // Orbit via keyboard then reset via Reset View button
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    fireEvent.keyDown(stage, { key: 'ArrowUp' });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 35°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 45°');

    fireEvent.click(screen.getByTestId('surface-mesh-reset'));
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 25°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 40°');
    expect(zoomBadge).toHaveTextContent('1.0×');
    expect(zoomOut).not.toBeDisabled();
    expect(zoomIn).not.toBeDisabled();
  });

  it('supports pointer dragging to orbit Yaw and Pitch, clamps bounds, ignores right click, and cleans up on release/cancel/unmount', () => {
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<SurfaceMesh3DPlot defaultYawDeg={0} defaultPitchDeg={30} />);

    const stage = screen.getByTestId('surface-mesh-stage');

    // Secondary mouse button must be ignored
    fireEvent.pointerDown(stage, { button: 2, clientX: 100, clientY: 100 });
    expect(stage).not.toHaveAttribute('data-dragging');
    fireEvent.pointerMove(window, { clientX: 200, clientY: 150 });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 0°');

    // Left-button drag right (+100px => +60° yaw) and down (+50px => +20° pitch)
    fireEvent.pointerDown(stage, { button: 0, clientX: 100, clientY: 100 });
    expect(stage).toHaveAttribute('data-dragging', 'true');

    fireEvent.pointerMove(window, { clientX: 200, clientY: 150 });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 60°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 50°');

    // Verify painter's depth sort remains strictly ascending after rotation
    const rotatedFacets = screen.getAllByTestId('surface-mesh-facet');
    const rotatedDepths = rotatedFacets.map((f) => Number(f.getAttribute('data-depth')));
    for (let i = 1; i < rotatedDepths.length; i += 1) {
      expect(rotatedDepths[i]!).toBeGreaterThanOrEqual(rotatedDepths[i - 1]!);
    }

    // Drag beyond extreme bounds clamps yaw (-180..180) and pitch (10..80)
    fireEvent.pointerMove(window, { clientX: 2000, clientY: 2000 });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 180°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 80°');

    fireEvent.pointerMove(window, { clientX: -2000, clientY: -2000 });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw -180°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 10°');

    // pointerUp detaches listeners
    fireEvent.pointerUp(window);
    expect(stage).not.toHaveAttribute('data-dragging');
    fireEvent.pointerMove(window, { clientX: 500, clientY: 500 });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw -180°');

    // pointerCancel also releases drag cleanly
    fireEvent.pointerDown(stage, { button: 0, clientX: 100, clientY: 100 });
    expect(stage).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerCancel(window);
    expect(stage).not.toHaveAttribute('data-dragging');

    // Unmounting mid-drag removes window listeners cleanly
    fireEvent.pointerDown(stage, { button: 0, clientX: 100, clientY: 100 });
    removeListenerSpy.mockClear();
    unmount();
    expect(removeListenerSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeListenerSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    removeListenerSpy.mockRestore();
  });

  it('supports IME-safe keyboard orbit (ArrowLeft/Right ±10°, ArrowUp/Down ±5°, 0 reset) and clamps limits', () => {
    render(<SurfaceMesh3DPlot defaultYawDeg={175} defaultPitchDeg={78} />);
    const stage = screen.getByTestId('surface-mesh-stage');

    // IME composing keyDown must be ignored
    fireEvent.keyDown(stage, { key: 'ArrowLeft', isComposing: true });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 175°');

    // ArrowRight clamps at +180
    fireEvent.keyDown(stage, { key: 'ArrowRight' });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 180°');

    // ArrowLeft steps -10
    fireEvent.keyDown(stage, { key: 'ArrowLeft' });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 170°');

    // ArrowUp clamps at 80
    fireEvent.keyDown(stage, { key: 'ArrowUp' });
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 80°');

    // ArrowDown steps -5
    fireEvent.keyDown(stage, { key: 'ArrowDown' });
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 75°');

    // Unrelated key ignored
    fireEvent.keyDown(stage, { key: 'Tab' });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 170°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 75°');

    // Zoom in, then press '0' to reset yaw, pitch, and zoom
    fireEvent.click(screen.getByTestId('surface-mesh-zoom-in'));
    expect(screen.getByTestId('surface-mesh-telemetry-zoom')).toHaveTextContent('Zoom 1.15×');

    fireEvent.keyDown(stage, { key: '0' });
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 175°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 78°');
    expect(screen.getByTestId('surface-mesh-telemetry-zoom')).toHaveTextContent('Zoom 1.0×');
  });

  it('selects quad facets via click and IME-safe Enter/Space, invokes onSelectCell, and handles grid resize cleanly', () => {
    const onSelectCell = vi.fn<(cell: SurfaceMeshCell) => void>();
    const customGrid = [
      [0, 4, 8],
      [2, 6, 10],
      [4, 8, 12],
    ];

    const { rerender } = render(
      <SurfaceMesh3DPlot
        grid={customGrid}
        zUnit="mV"
        onSelectCell={onSelectCell}
      />
    );

    // 3×3 grid => 2×2 = 4 quad facets
    const facets = screen.getAllByTestId('surface-mesh-facet');
    expect(facets).toHaveLength(4);
    expect(screen.getByTestId('surface-mesh-telemetry-z-range')).toHaveTextContent(
      'Z Range 0..12 mV'
    );

    const targetFacet = facets.find(
      (f) => f.getAttribute('data-row') === '1' && f.getAttribute('data-col') === '1'
    )!;
    // Mean of [6, 10, 12, 8] = 9, normalizedZ = 9 / 12 = 0.75
    fireEvent.click(targetFacet);

    expect(onSelectCell).toHaveBeenLastCalledWith({
      row: 1,
      col: 1,
      z: 9,
      normalizedZ: 0.75,
    });
    expect(targetFacet).toHaveAttribute('aria-pressed', 'true');
    expect(targetFacet).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('surface-mesh-telemetry-active-cell')).toHaveTextContent(
      'Active Cell (1, 1, 9 mV)'
    );

    // Keyboard Enter & Space selection + IME guard on another facet
    const originFacet = facets.find(
      (f) => f.getAttribute('data-row') === '0' && f.getAttribute('data-col') === '0'
    )!;
    fireEvent.keyDown(originFacet, { key: 'Enter', isComposing: true });
    expect(onSelectCell).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(originFacet, { key: 'Tab' });
    expect(onSelectCell).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(originFacet, { key: 'Enter' });
    expect(onSelectCell).toHaveBeenLastCalledWith({
      row: 0,
      col: 0,
      z: 3,
      normalizedZ: 0.25,
    });

    const topRightFacet = facets.find(
      (f) => f.getAttribute('data-row') === '0' && f.getAttribute('data-col') === '1'
    )!;
    fireEvent.keyDown(topRightFacet, { key: ' ' });
    expect(onSelectCell).toHaveBeenLastCalledWith({
      row: 0,
      col: 1,
      z: 7,
      normalizedZ: 0.583,
    });

    // Shrinking the grid to 2×2 (only row 0, col 0 exists) safely clears out-of-bounds selection (0, 1)
    rerender(
      <SurfaceMesh3DPlot
        grid={[
          [1, 2],
          [3, 4],
        ]}
        zUnit=""
      />
    );
    expect(screen.getByTestId('surface-mesh-telemetry-active-cell')).toHaveTextContent(
      'Active Cell None'
    );
    expect(screen.getByTestId('surface-mesh-telemetry-z-range')).toHaveTextContent('Z Range 1..4');
  });

  it('renders clean role="status" empty state for grids smaller than 2×2 and sanitizes flat, ragged, and non-finite inputs', () => {
    const { rerender } = render(<SurfaceMesh3DPlot grid={[]} data-testid="empty-root" />);

    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    const emptyStatus = screen.getByTestId('surface-mesh-empty');
    expect(emptyStatus).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('surface-mesh-svg')).toBeNull();
    expect(screen.getByTestId('surface-mesh-telemetry-z-range')).toHaveTextContent('Z Range —');

    // 1 row × 3 columns is < 2×2
    rerender(<SurfaceMesh3DPlot grid={[[1, 2, 3]]} />);
    expect(screen.getByTestId('surface-mesh-empty')).toBeInTheDocument();

    // 2 rows × 1 column is < 2×2
    rerender(<SurfaceMesh3DPlot grid={[[1], [2]]} />);
    expect(screen.getByTestId('surface-mesh-empty')).toBeInTheDocument();

    // Ragged grid with a 1-column row is < 2×2
    rerender(<SurfaceMesh3DPlot grid={[[1, 2, 3], [4]]} />);
    expect(screen.getByTestId('surface-mesh-empty')).toBeInTheDocument();

    // Flat constant grid (zero Z span) + non-finite yaw/pitch/cells must produce finite SVG with zero NaN
    rerender(
      <SurfaceMesh3DPlot
        defaultYawDeg={Number.NaN}
        defaultPitchDeg={Number.POSITIVE_INFINITY}
        grid={[
          [5, 5],
          [5, 5],
        ]}
      />
    );
    const flatSvg = screen.getByTestId('surface-mesh-svg');
    expect(flatSvg.innerHTML).not.toContain('NaN');
    expect(screen.getByTestId('surface-mesh-telemetry-yaw')).toHaveTextContent('Yaw 38°');
    expect(screen.getByTestId('surface-mesh-telemetry-pitch')).toHaveTextContent('Pitch 30°');
    const flatFacet = screen.getByTestId('surface-mesh-facet');
    expect(flatFacet).toHaveAttribute('data-normalized-z', '0.5');
    expect(flatFacet).toHaveAttribute('fill', 'var(--prism-secondary-main)');

    // Non-finite cell entries + negative zero + ragged >= 2 columns sanitize cleanly
    rerender(
      <SurfaceMesh3DPlot
        defaultYawDeg={-0}
        defaultPitchDeg={-50}
        grid={[
          [Number.NaN, -0, 99],
          [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY],
        ]}
      />
    );
    const sanitizedSvg = screen.getByTestId('surface-mesh-svg');
    expect(sanitizedSvg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('surface-mesh-facet')).toHaveLength(1);
    expect(screen.getByTestId('surface-mesh-telemetry-z-range')).toHaveTextContent(
      'Z Range 0..0 dB'
    );
  });
});
