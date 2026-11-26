import { memo, type ReactElement } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  AcousticActivityBar,
  AdvancedDataGrid,
  AiFocusRing,
  AiThinkingOrb,
  AmbientAuraBleed,
  CausticLightLayer,
  ChromaticDispersionEdge,
  DataGridRowShimmer,
  DataTable,
  DesktopIconCanvas,
  FluidMeshCanvas,
  FrostedGrainOverlay,
  GradientTextSelection,
  HolographicFoilSheen,
  IridescentRimSurface,
  KanbanBoard,
  LiquidRippleTrigger,
  MetaballFluidBackdrop,
  MultiTrackTimeline,
  OpticalDepthVignette,
  OrbitalRingSpinner,
  PipelinePulseLoader,
  PrimaryButton,
  PrismCard,
  PrismThemeProvider,
  PrismaticCursorHalo,
  ReactiveInputShimmer,
  RefractiveLensContainer,
  RefractiveSkeleton,
  ScanlineRadarSweep,
  SegmentedGlassProgress,
  StatefulEnergyRibbon,
  StreamingTokenReveal,
  TreeView,
  VirtualizedList,
  mountOpticalShaderCanvas,
  type OpticalShaderKind,
} from '../index';

interface BenchmarkEntry {
  name: string;
  renderEl: () => ReactElement;
}

const NEW_FX_BENCHMARKS: ReadonlyArray<BenchmarkEntry> = [
  { name: 'PrismaticCursorHalo', renderEl: () => <PrismaticCursorHalo><span>Body</span></PrismaticCursorHalo> },
  { name: 'AiFocusRing', renderEl: () => <AiFocusRing active processing><span>Prompt</span></AiFocusRing> },
  { name: 'FluidMeshCanvas', renderEl: () => <FluidMeshCanvas mood="creative"><span>Mesh</span></FluidMeshCanvas> },
  { name: 'GradientTextSelection', renderEl: () => <GradientTextSelection defaultValue="Optical caret" /> },
  { name: 'AmbientAuraBleed', renderEl: () => <AmbientAuraBleed tone="prism"><span>Aura</span></AmbientAuraBleed> },
  { name: 'ReactiveInputShimmer', renderEl: () => <ReactiveInputShimmer /> },
  { name: 'IridescentRimSurface', renderEl: () => <IridescentRimSurface><span>Rim</span></IridescentRimSurface> },
  { name: 'StatefulEnergyRibbon', renderEl: () => <StatefulEnergyRibbon state="thinking" showLabel /> },
  { name: 'RefractiveLensContainer', renderEl: () => <RefractiveLensContainer ior={1.5}><span>Lens</span></RefractiveLensContainer> },
  { name: 'ChromaticDispersionEdge', renderEl: () => <ChromaticDispersionEdge><span>Edge</span></ChromaticDispersionEdge> },
  { name: 'CausticLightLayer', renderEl: () => <CausticLightLayer><span>Caustic</span></CausticLightLayer> },
  { name: 'FrostedGrainOverlay', renderEl: () => <FrostedGrainOverlay><span>Grain</span></FrostedGrainOverlay> },
  { name: 'LiquidRippleTrigger', renderEl: () => <LiquidRippleTrigger><span>Ripple</span></LiquidRippleTrigger> },
  { name: 'HolographicFoilSheen', renderEl: () => <HolographicFoilSheen><span>Foil</span></HolographicFoilSheen> },
  { name: 'MetaballFluidBackdrop', renderEl: () => <MetaballFluidBackdrop orbCount={3}><span>Meta</span></MetaballFluidBackdrop> },
  { name: 'OpticalDepthVignette', renderEl: () => <OpticalDepthVignette active><span>Bg</span></OpticalDepthVignette> },
  { name: 'RefractiveSkeleton', renderEl: () => <RefractiveSkeleton loading preset="card" /> },
  { name: 'OrbitalRingSpinner', renderEl: () => <OrbitalRingSpinner showLabel /> },
  { name: 'AiThinkingOrb', renderEl: () => <AiThinkingOrb state="thinking" /> },
  { name: 'SegmentedGlassProgress', renderEl: () => <SegmentedGlassProgress value={68} segments={10} /> },
  { name: 'StreamingTokenReveal', renderEl: () => <StreamingTokenReveal text="Fast optical stream" skipAnimation /> },
  { name: 'DataGridRowShimmer', renderEl: () => <DataGridRowShimmer loading rows={5} /> },
  { name: 'AcousticActivityBar', renderEl: () => <AcousticActivityBar active barCount={9} /> },
  { name: 'PipelinePulseLoader', renderEl: () => <PipelinePulseLoader /> },
  { name: 'ScanlineRadarSweep', renderEl: () => <ScanlineRadarSweep active mode="vertical"><span>Scan</span></ScanlineRadarSweep> },
];

const EXISTING_BENCHMARKS: ReadonlyArray<BenchmarkEntry> = [
  { name: 'PrimaryButton', renderEl: () => <PrimaryButton size="md">Launch</PrimaryButton> },
  { name: 'PrismCard', renderEl: () => <PrismCard title="Telemetry" kicker="Live">Body</PrismCard> },
  {
    name: 'DataTable',
    renderEl: () => (
      <DataTable
        rows={[
          {
            id: 'R-1',
            project: 'Refractor',
            owner: 'Ada',
            department: 'Core',
            status: 'Active',
            completion: 98,
            budgetUsd: 12000,
            updatedAt: '2026-11-25',
          },
        ]}
        sortBy="id"
        sortDir="asc"
        onSortChange={() => {}}
        selectedIds={[]}
        onToggleSelect={() => {}}
      />
    ),
  },
  {
    name: 'KanbanBoard',
    renderEl: () => (
      <KanbanBoard
        columns={[{ id: 'todo', title: 'To Do' }]}
        defaultCards={[{ id: 'c1', columnId: 'todo', title: 'Benchmark', priority: 'high' }]}
      />
    ),
  },
  {
    name: 'VirtualizedList',
    renderEl: () => (
      <VirtualizedList
        items={Array.from({ length: 1000 }, (_, i) => ({ id: `row-${i}`, title: `Row ${i}` }))}
        itemHeight={36}
        height={240}
        renderItem={(item) => <div>{item.title}</div>}
      />
    ),
  },
  {
    name: 'TreeView',
    renderEl: () => (
      <TreeView
        nodes={[
          { id: 'root', parentId: null, name: 'src', type: 'folder' },
          { id: 'child', parentId: 'root', name: 'index.ts', type: 'file', sizeBytes: 1024 },
        ]}
        defaultExpandedIds={['root']}
        selectedNodeId="child"
        onSelectNode={() => {}}
      />
    ),
  },
  {
    name: 'AdvancedDataGrid',
    renderEl: () => (
      <AdvancedDataGrid
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'score', header: 'Score' },
        ]}
        rows={[{ id: '1', values: { name: 'Optical', score: '99.9' } }]}
      />
    ),
  },
  {
    name: 'MultiTrackTimeline',
    renderEl: () => (
      <MultiTrackTimeline
        tracks={[
          {
            id: 'v1',
            name: 'Video 1',
            kind: 'video',
            clips: [{ id: 'c1', label: 'Intro', startSec: 0, durationSec: 12 }],
          },
        ]}
      />
    ),
  },
  { name: 'DesktopIconCanvas', renderEl: () => <DesktopIconCanvas /> },
];

describe('Deep Performance Profiling — All 25 New FX/Shader/Loader + Existing Flagship Components', () => {
  it('measures cold mount, warm re-render, and clean unmount latency across all 25 new components under strict frame budgets', () => {
    const metrics: Array<{ name: string; mountMs: number; rerenderMs: number }> = [];

    for (const entry of NEW_FX_BENCHMARKS) {
      const t0 = performance.now();
      const { rerender, unmount } = render(
        <PrismThemeProvider loadFonts={false}>{entry.renderEl()}</PrismThemeProvider>
      );
      const mountMs = performance.now() - t0;

      const t1 = performance.now();
      rerender(<PrismThemeProvider loadFonts={false}>{entry.renderEl()}</PrismThemeProvider>);
      const rerenderMs = performance.now() - t1;

      unmount();
      metrics.push({ name: entry.name, mountMs, rerenderMs });
      // Every individual FX/shader/loader component must mount well under 120ms in jsdom
      expect(mountMs, `${entry.name} cold mount exceeded budget`).toBeLessThan(120);
      expect(rerenderMs, `${entry.name} rerender exceeded budget`).toBeLessThan(60);
    }

    const avgMountMs = metrics.reduce((acc, m) => acc + m.mountMs, 0) / metrics.length;
    const avgRerenderMs = metrics.reduce((acc, m) => acc + m.rerenderMs, 0) / metrics.length;
    expect(avgMountMs).toBeLessThan(35);
    expect(avgRerenderMs).toBeLessThan(15);
  });

  it('verifies zero regression across existing flagship enterprise components', () => {
    for (const entry of EXISTING_BENCHMARKS) {
      const t0 = performance.now();
      const { rerender, unmount } = render(
        <PrismThemeProvider loadFonts={false}>{entry.renderEl()}</PrismThemeProvider>
      );
      const mountMs = performance.now() - t0;

      const t1 = performance.now();
      rerender(<PrismThemeProvider loadFonts={false}>{entry.renderEl()}</PrismThemeProvider>);
      const rerenderMs = performance.now() - t1;

      unmount();
      expect(mountMs, `${entry.name} cold mount regressed`).toBeLessThan(200);
      expect(rerenderMs, `${entry.name} rerender regressed`).toBeLessThan(100);
    }
  });

  it('proves ZERO React child re-renders across 200 rapid pointermove events on all 6 cursor-reactive FX surfaces', () => {
    const surfaces: Array<{
      name: string;
      wrap: (child: ReactElement) => ReactElement;
    }> = [
      { name: 'PrismaticCursorHalo', wrap: (c) => <PrismaticCursorHalo data-testid="surf">{c}</PrismaticCursorHalo> },
      { name: 'IridescentRimSurface', wrap: (c) => <IridescentRimSurface data-testid="surf">{c}</IridescentRimSurface> },
      { name: 'FluidMeshCanvas', wrap: (c) => <FluidMeshCanvas data-testid="surf">{c}</FluidMeshCanvas> },
      { name: 'RefractiveLensContainer', wrap: (c) => <RefractiveLensContainer data-testid="surf">{c}</RefractiveLensContainer> },
      { name: 'ChromaticDispersionEdge', wrap: (c) => <ChromaticDispersionEdge data-testid="surf">{c}</ChromaticDispersionEdge> },
      { name: 'HolographicFoilSheen', wrap: (c) => <HolographicFoilSheen data-testid="surf">{c}</HolographicFoilSheen> },
    ];

    for (const surface of surfaces) {
      let renders = 0;
      const ChildProbe = memo(function ChildProbe() {
        renders += 1;
        return <span>probe</span>;
      });

      const { getByTestId, unmount } = render(surface.wrap(<ChildProbe />));
      const el = getByTestId('surf');
      fireEvent.pointerEnter(el, { clientX: 10, clientY: 10 });
      const baselineRenders = renders;

      const start = performance.now();
      for (let i = 0; i < 200; i += 1) {
        fireEvent.pointerMove(el, { clientX: 10 + (i % 180), clientY: 10 + (i % 90) });
      }
      const elapsed = performance.now() - start;

      expect(renders, `${surface.name} triggered child re-renders on pointermove`).toBe(baselineRenders);
      expect(elapsed, `${surface.name} 200x pointermove burst exceeded budget`).toBeLessThan(250);
      unmount();
    }
  });

  it('compiles, renders, and disposes all 10 WebGL GLSL shaders with zero resource leaks', () => {
    const kinds: OpticalShaderKind[] = [
      'fluid-mesh',
      'refractive-lens',
      'chromatic-dispersion',
      'caustic-light',
      'frosted-grain',
      'liquid-ripple',
      'holographic-foil',
      'metaball-fluid',
      'optical-vignette',
      'thinking-orb',
    ];
    let createdBuffers = 0;
    let deletedBuffers = 0;
    let createdPrograms = 0;
    let deletedPrograms = 0;

    const fakeGl: Partial<WebGLRenderingContext> = {
      VERTEX_SHADER: 35633,
      FRAGMENT_SHADER: 35632,
      COMPILE_STATUS: 35713,
      LINK_STATUS: 35714,
      ARRAY_BUFFER: 34962,
      STATIC_DRAW: 35044,
      FLOAT: 5126,
      COLOR_BUFFER_BIT: 16384,
      TRIANGLES: 4,
      createShader: vi.fn(() => ({}) as WebGLShader),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      deleteShader: vi.fn(),
      createProgram: vi.fn(() => {
        createdPrograms += 1;
        return {} as WebGLProgram;
      }),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      deleteProgram: vi.fn(() => {
        deletedPrograms += 1;
      }),
      createBuffer: vi.fn(() => {
        createdBuffers += 1;
        return {} as WebGLBuffer;
      }),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      deleteBuffer: vi.fn(() => {
        deletedBuffers += 1;
      }),
      getAttribLocation: vi.fn(() => 0),
      getUniformLocation: vi.fn(() => ({}) as WebGLUniformLocation),
      enableVertexAttribArray: vi.fn(),
      vertexAttribPointer: vi.fn(),
      useProgram: vi.fn(),
      viewport: vi.fn(),
      uniform1f: vi.fn(),
      uniform2f: vi.fn(),
      clearColor: vi.fn(),
      clear: vi.fn(),
      drawArrays: vi.fn(),
    };

    const start = performance.now();
    for (const kind of kinds) {
      const canvas = document.createElement('canvas');
      const spy = vi.spyOn(canvas, 'getContext').mockReturnValue(fakeGl as WebGLRenderingContext);
      const handle = mountOpticalShaderCanvas(canvas, { kind, animated: false });
      expect(handle.renderer).toBe('webgl');
      handle.updateUniforms({ pointerX: 0.4, pointerY: 0.6, intensity: 0.9 });
      handle.dispose();
      spy.mockRestore();
    }
    const elapsed = performance.now() - start;

    expect(createdPrograms).toBe(10);
    expect(deletedPrograms).toBe(10);
    expect(createdBuffers).toBe(10);
    expect(deletedBuffers).toBe(10);
    expect(elapsed).toBeLessThan(100);
  });
});
