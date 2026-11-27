import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  animateHybrid,
  auditMotionSource,
  compileSpringToCssLinear,
  computeMomentumTarget,
  computeMotionScore,
  computeRelativeLuminance,
  computeScaleCorrectedRadius,
  computeScaleCorrectedShadow,
  createMotionTheme,
  defineTokenBundle,
  detectGpuCapabilityTier,
  evaluateFrameTimings,
  evaluateSpringAt,
  extractDominantAccents,
  getHairlineWidthPx,
  getSharedShaderPool,
  hasAccessibleActionLabel,
  isCompositorProperty,
  isHapticsSupported,
  mapScrollRange,
  measureScrollProgress,
  MOTION_THEME,
  MotionConfigProvider,
  OPTICAL_MATERIAL_PRESETS,
  OpticalShaderPool,
  PrismThemeProvider,
  readA11yPreferences,
  resolveAdaptiveInkMode,
  sampleRgbaPixelsToAccents,
  scrollProgress,
  simulateSpring,
  snapToDevicePixel,
  stepDownGpuTier,
  supportsScrollTimeline,
  supportsWaapi,
  synthesizeMicroSound,
  triggerHaptic,
  useA11yPreferences,
  useDprMetrics,
  useGpuPerformanceGuardrail,
  useHaptics,
  useHeadlessButton,
  useHeadlessDisclosure,
  useHeadlessMenu,
  useHeadlessTabs,
  useMicroAudio,
  useMotionConfig,
  usePooledOpticalShader,
  useRovingTabIndex,
  useViewportVisibilityPause,
} from '../index';

afterEach(() => {
  getSharedShaderPool().disposeAll();
  vi.restoreAllMocks();
});

describe('v1.53.0–v1.55.0 Motion, Optical Material, GPU Pool, A11y, Headless & Sensory Engines', () => {
  it('simulates spring physics, compiles CSS linear() curves, and computes scale-corrected radii/shadows', () => {
    const sim = simulateSpring({ stiffness: 360, damping: 20, mass: 1 }, 12);
    expect(sim.values[0]).toBe(0);
    expect(sim.values[sim.values.length - 1]).toBe(1);
    expect(sim.overshoot).toBeGreaterThan(0);
    expect(evaluateSpringAt(sim, 0)).toBe(0);
    expect(evaluateSpringAt(sim, 1)).toBe(1);

    const compiled = compileSpringToCssLinear({ stiffness: 450, damping: 30, mass: 1 }, 12);
    expect(compiled.easing.startsWith('linear(')).toBe(true);
    expect(compiled.durationMs).toBeGreaterThan(0);

    const radius = computeScaleCorrectedRadius(16, 2, 0.5);
    expect(radius.radiusX).toBe('8px');
    expect(radius.radiusY).toBe('32px');
    expect(radius.cssValue).toBe('8px / 32px');

    const shadow = computeScaleCorrectedShadow(16, 2, 2);
    expect(shadow).toContain('rgba(var(--prism-shadow-rgb)');
  });

  it('exposes all 5 semantic motion tokens and supports custom createMotionTheme overrides', () => {
    expect(Object.keys(MOTION_THEME)).toEqual(['snap', 'ui', 'gentle', 'lively', 'ambient']);
    const custom = createMotionTheme({ snap: { stiffness: 600, calmOpacityMs: 90 } });
    expect(custom.snap.spring.stiffness).toBe(600);
    expect(custom.snap.calmOpacityMs).toBe(90);
    expect(custom.ui.spring.stiffness).toBe(MOTION_THEME.ui.spring.stiffness);
  });

  it('runs hybrid animations with WAAPI and calm/style fallbacks', async () => {
    expect(isCompositorProperty('transform')).toBe(true);
    expect(isCompositorProperty('width')).toBe(false);
    expect(typeof supportsWaapi()).toBe('boolean');
    expect(typeof supportsScrollTimeline()).toBe('boolean');

    const el = document.createElement('div');
    const handle = animateHybrid(
      el,
      [
        { transform: 'translate3d(0, 10px, 0)', opacity: 0 },
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
      ],
      { token: 'snap', calmReducedMotion: true }
    );
    await handle.finished;
    handle.finish();
    handle.cancel();
    expect(['calm-opacity', 'style-fallback', 'waapi']).toContain(handle.backend);
  });

  it('provides MotionConfigProvider calm mode and document attribute synchronization', () => {
    function Consumer() {
      const { isCalmMotion, getToken } = useMotionConfig();
      return <span data-calm={String(isCalmMotion)}>{getToken('lively').name}</span>;
    }

    const { unmount } = render(
      <MotionConfigProvider reducedMotion="calm" syncDocumentAttribute>
        <Consumer />
      </MotionConfigProvider>
    );
    expect(screen.getByText('lively')).toHaveAttribute('data-calm', 'true');
    expect(document.documentElement.getAttribute('data-refractor-motion')).toBe('calm');
    unmount();
    expect(document.documentElement.getAttribute('data-refractor-motion')).toBeNull();
  });

  it('computes scroll ranges, scroll progress measurements, and momentum targets', () => {
    expect(mapScrollRange(0.5, [0, 1], [4, 20])).toBe(12);
    expect(mapScrollRange(0.5, [1, 1], [4, 20])).toBe(4);
    const measured = measureScrollProgress();
    expect(measured.progressY).toBeGreaterThanOrEqual(0);

    const unsub = scrollProgress(() => undefined);
    unsub();

    const momentum = computeMomentumTarget({ x: 10, y: 10 }, { x: 200, y: -100 }, 0.2, {
      minX: -40,
      maxX: 40,
      minY: -40,
      maxY: 40,
    });
    expect(momentum.targetX).toBe(40);
    expect(momentum.targetY).toBe(-10);
  });

  it('audits animation source code and evaluates runtime frame timings', () => {
    const findings = auditMotionSource('.x { transition-all; transition: left 200ms; }');
    expect(findings.length).toBeGreaterThanOrEqual(2);

    const summary = evaluateFrameTimings([16, 16.5, 25, 30]);
    expect(summary.droppedFrames).toBe(2);
    expect(summary.sampleCount).toBe(4);

    const emptySummary = evaluateFrameTimings([]);
    expect(emptySummary.estimatedFps).toBe(60);

    const warnReport = computeMotionScore({ frameDurationsMs: [16, 18, 19] });
    expect(warnReport.grade).toBe('A');
  });

  it('computes luminance, adaptive ink polarity, material presets, and ambient accents', () => {
    expect(OPTICAL_MATERIAL_PRESETS.wafer.blurPx).toBeLessThan(OPTICAL_MATERIAL_PRESETS.prism.blurPx);
    expect(computeRelativeLuminance({ r: 255, g: 255, b: 255 })).toBe(1);
    expect(computeRelativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);

    expect(resolveAdaptiveInkMode('#ffffff').inkMode).toBe('dark-ink');
    expect(resolveAdaptiveInkMode('#0b1120').inkMode).toBe('light-ink');

    const fallback = extractDominantAccents([]);
    expect(fallback.primaryHex).toBe('#e85d04');

    const pixels = new Uint8ClampedArray([255, 80, 20, 255, 20, 140, 255, 255]);
    const sampled = sampleRgbaPixelsToAccents(pixels, 1);
    expect(sampled.primaryHex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('manages single-context OpticalShaderPool slots, GPU guardrails, viewport pause, and DPR scaling', () => {
    const pool = new OpticalShaderPool();
    const canvas = document.createElement('canvas');
    const slotId = pool.register(canvas, 'caustic-light', { intensity: 0.9 });
    pool.updateUniforms(slotId, { speed: 1.4 });
    pool.setSlotActive(slotId, false);
    expect(pool.getStats().activeSlots).toBe(0);
    pool.setSlotActive(slotId, true);
    expect(pool.getStats().totalRegistered).toBe(1);
    pool.renderFrame(100);
    pool.unregister(slotId);
    expect(pool.getStats().totalRegistered).toBe(0);
    pool.disposeAll();

    function PoolHarness() {
      const ref = useRef<HTMLCanvasElement | null>(null);
      const stats = usePooledOpticalShader(ref, 'refractive-lens', true);
      const vis = useViewportVisibilityPause(ref, { pauseOnWindowBlur: true });
      return (
        <div>
          <canvas ref={ref} width={64} height={64} />
          <span data-testid="pool-mode">{stats.rendererMode}</span>
          <span data-testid="vis-run">{String(vis.shouldRun)}</span>
        </div>
      );
    }
    render(<PoolHarness />);
    expect(screen.getByTestId('pool-mode')).toBeInTheDocument();

    expect(detectGpuCapabilityTier({ saveData: true })).toBe('flat-opaque');
    expect(detectGpuCapabilityTier({ hardwareConcurrency: 2 })).toBe('css-backdrop');
    expect(detectGpuCapabilityTier({ hardwareConcurrency: 8, deviceMemoryGb: 16, webglSupported: true })).toBe(
      'webgl-refraction'
    );
    expect(stepDownGpuTier('webgl-refraction')).toBe('css-backdrop');
    expect(stepDownGpuTier('css-backdrop')).toBe('flat-opaque');

    const { result: gpuHook } = renderHook(() =>
      useGpuPerformanceGuardrail({ hardwareConcurrency: 8, webglSupported: true }, 20, 2)
    );
    act(() => {
      gpuHook.current.reportFrameTime(30);
    });
    act(() => {
      gpuHook.current.reportFrameTime(32);
    });
    expect(gpuHook.current.tier).toBe('css-backdrop');
    act(() => {
      gpuHook.current.resetTier();
    });
    expect(gpuHook.current.tier).toBe('webgl-refraction');

    expect(snapToDevicePixel(10.3, 2)).toBe(10.5);
    expect(getHairlineWidthPx(2)).toBe(0.5);
    const { result: dprHook } = renderHook(() => useDprMetrics(2));
    expect(dprHook.current.dpr).toBeGreaterThanOrEqual(1);
  });

  it('supports density, reducedTransparency, and highContrast on PrismThemeProvider + A11y hooks', () => {
    render(
      <PrismThemeProvider density="touch" reducedTransparency highContrast scope="local">
        <span data-testid="themed">Themed</span>
      </PrismThemeProvider>
    );
    const wrapper = screen.getByTestId('themed').parentElement;
    expect(wrapper).toHaveAttribute('data-refractor-density', 'touch');
    expect(wrapper).toHaveAttribute('data-refractor-reduced-transparency', 'true');
    expect(wrapper).toHaveAttribute('data-refractor-high-contrast', 'true');

    expect(typeof readA11yPreferences().prefersHighContrast).toBe('boolean');
    const { result: a11yHook } = renderHook(() => useA11yPreferences());
    expect(typeof a11yHook.current.prefersReducedTransparency).toBe('boolean');
  });

  it('supports roving tabindex, headless primitives, and strict TypeScript token contracts', () => {
    const items = [
      { id: 'alpha', label: 'Alpha' },
      { id: 'beta', label: 'Beta', disabled: true },
      { id: 'gamma', label: 'Gamma' },
    ];
    const onEscape = vi.fn();
    const { result } = renderHook(() =>
      useRovingTabIndex({ items, orientation: 'horizontal', onEscape })
    );
    expect(result.current.activeId).toBe('alpha');

    const makeKeyEvent = (key: string): React.KeyboardEvent<HTMLElement> =>
      ({
        key,
        preventDefault: vi.fn(),
        nativeEvent: { isComposing: false } as KeyboardEvent,
      }) as Partial<React.KeyboardEvent<HTMLElement>> as React.KeyboardEvent<HTMLElement>;

    // ArrowRight skips disabled beta -> gamma
    act(() => {
      result.current.getItemProps('alpha').onKeyDown(makeKeyEvent('ArrowRight'));
    });
    expect(result.current.activeId).toBe('gamma');

    act(() => {
      result.current.getItemProps('gamma').onKeyDown(makeKeyEvent('Home'));
    });
    expect(result.current.activeId).toBe('alpha');

    act(() => {
      result.current.getItemProps('alpha').onKeyDown(makeKeyEvent('End'));
    });
    expect(result.current.activeId).toBe('gamma');

    act(() => {
      result.current.getItemProps('gamma').onKeyDown(makeKeyEvent('a'));
    });
    expect(result.current.activeId).toBe('alpha');

    act(() => {
      result.current.getItemProps('alpha').onKeyDown(makeKeyEvent('Escape'));
    });
    expect(onEscape).toHaveBeenCalledTimes(1);

    const onPress = vi.fn();
    function HeadlessHarness() {
      const btn = useHeadlessButton({ onPress });
      const disc = useHeadlessDisclosure();
      const tabs = useHeadlessTabs({ tabs: items });
      const menu = useHeadlessMenu({ items });
      return (
        <div>
          <div {...btn.buttonProps} data-testid="hl-btn">
            Press
          </div>
          <button type="button" {...disc.triggerProps}>
            Toggle
          </button>
          <div {...disc.panelProps}>Panel Body</div>
          <div {...tabs.tabListProps}>
            <button type="button" {...tabs.getTabProps('alpha')}>
              Tab Alpha
            </button>
          </div>
          <div {...menu.menuProps}>
            <button type="button" {...menu.getMenuItemProps('gamma')}>
              Menu Gamma
            </button>
          </div>
        </div>
      );
    }

    render(<HeadlessHarness />);
    fireEvent.click(screen.getByTestId('hl-btn'));
    expect(onPress).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));
    expect(screen.getByText('Panel Body')).toBeVisible();

    const bundle = defineTokenBundle({
      material: 'prism',
      motion: 'snap',
      density: 'comfortable',
      accentToken: '--prism-primary',
    });
    expect(bundle.material).toBe('prism');
    expect(hasAccessibleActionLabel({ iconOnly: true, 'aria-label': 'Close' })).toBe(true);
    expect(hasAccessibleActionLabel({ label: 'Save' })).toBe(true);
  });

  it('exercises synthesized micro-audio engine and haptic feedback hooks safely', () => {
    const fakeOsc = {
      type: 'sine' as OscillatorType,
      frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
    const fakeGain = {
      gain: {
        setValueAtTime: vi.fn(),
        exponentialRampToValueAtTime: vi.fn(),
      } as Partial<AudioParam> as AudioParam,
      connect: vi.fn(),
    } as Partial<GainNode> as GainNode;
    const fakeCtx = {
      currentTime: 0,
      destination: {} as AudioDestinationNode,
      createOscillator: vi.fn(() => fakeOsc),
      createGain: vi.fn(() => fakeGain),
    };

    expect(synthesizeMicroSound(fakeCtx, 'glass-click', 0.2)).toBe(true);
    expect(synthesizeMicroSound(fakeCtx, 'chime-confirm', 0)).toBe(false);

    const { result: audioOff } = renderHook(() => useMicroAudio({ enabled: false }));
    expect(audioOff.current.playGlassClick()).toBe(false);

    const vibrateMock = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { value: vibrateMock, configurable: true });
    expect(isHapticsSupported()).toBe(true);
    expect(triggerHaptic('rigid')).toBe(true);
    expect(vibrateMock).toHaveBeenCalledWith([28]);

    const { result: haptics } = renderHook(() => useHaptics({ enabled: true }));
    expect(haptics.current.light()).toBe(true);
    expect(haptics.current.success()).toBe(true);
  });
});
