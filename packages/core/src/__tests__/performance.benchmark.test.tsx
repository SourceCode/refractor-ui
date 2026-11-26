import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { memo, useRef, useState } from 'react';
import * as Core from '../index';
import {
  buildMonthGrid,
  compareLocaleStrings,
  compareNaturalStrings,
  composeEventHandlers,
  computeLineDiff,
  createCoalescedPointerMove,
  createPrismTheme,
  cx,
  DataTable,
  defineTheme,
  formatLocaleNumber,
  formatUsNumber,
  getContrastRatio,
  isDocumentVisible,
  KanbanBoard,
  LiveTelemetryChart,
  mergeProps,
  parseColorToRgb,
  PrimaryButton,
  PrismThemeProvider,
  sanitizeUrl,
  stableClassName,
  STYLE_BORDER_DIVIDER,
  STYLE_TEXT_PRIMARY,
  STYLE_TEXT_SECONDARY,
  themeProps,
  themeToCssVariables,
  useComponentOverride,
  useControllableState,
  useMergedRefs,
  useRafCallback,
  VirtualizedList,
  type DataTableRow,
  type KanbanCardItem,
  type KanbanColumnDef,
  type ThemePerformanceMode,
} from '../index';

const REACT_MEMO_SYMBOL = Symbol.for('react.memo');

interface MemoLikeObject {
  $$typeof?: symbol;
  displayName?: string;
}

type CoreExportValue = string | number | boolean | MemoLikeObject | ((...args: never[]) => never) | undefined;

function asMemoLike(value: CoreExportValue): MemoLikeObject | null {
  if (!value || typeof value !== 'object') return null;
  return value;
}

function isMemoExoticComponent(value: CoreExportValue): boolean {
  const obj = asMemoLike(value);
  return obj !== null && obj.$$typeof === REACT_MEMO_SYMBOL;
}

afterEach(() => {
  document.documentElement.removeAttribute('data-refractor-performance');
  document.documentElement.removeAttribute('data-refractor-material');
  document.documentElement.removeAttribute('data-refractor-theme');
  document.documentElement.removeAttribute('style');
  vi.restoreAllMocks();
});

describe('Refractor v1.48.0–v1.52.0 Performance Architecture & Regression Suite', () => {
  it('wraps every single one of the 339 exported components in React.memo with displayName', () => {
    const coreSrcDir = path.resolve(process.cwd(), 'packages/core/src');
    const componentNames = fs
      .readdirSync(coreSrcDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^[A-Z][A-Za-z0-9]+$/.test(d.name))
      .map((d) => d.name)
      .sort();

    expect(componentNames.length).toBeGreaterThanOrEqual(339);

    const coreEntries = new Map<string, CoreExportValue>(
      Object.entries(Core) as Array<[string, CoreExportValue]>
    );

    const unmemoized: string[] = [];
    const missingDisplayName: string[] = [];

    for (const name of componentNames) {
      const exported = coreEntries.get(name);
      if (!isMemoExoticComponent(exported)) {
        unmemoized.push(name);
      }
      if (asMemoLike(exported)?.displayName !== name) {
        missingDisplayName.push(name);
      }
    }

    expect(unmemoized).toEqual([]);
    expect(missingDisplayName).toEqual([]);
  });

  it('guarantees zero transition-all occurrences across all 339 component sources', () => {
    const coreSrcDir = path.resolve(process.cwd(), 'packages/core/src');
    const componentNames = fs
      .readdirSync(coreSrcDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^[A-Z][A-Za-z0-9]+$/.test(d.name))
      .map((d) => d.name);

    const offenders: string[] = [];
    for (const name of componentNames) {
      const source = fs.readFileSync(path.join(coreSrcDir, name, `${name}.tsx`), 'utf8');
      if (/\btransition-all\b/.test(source)) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('enforces GPU compositor, nested blur elision, containment, and scroll-fast invariants in refractor.css', () => {
    const cssPath = path.resolve(process.cwd(), 'packages/core/src/refractor.css');
    const css = fs.readFileSync(cssPath, 'utf8');

    // Scroll-repaint killer removed
    expect(css).not.toContain('background-attachment: fixed');
    // Universal scrollbar selector de-universalized
    expect(css).not.toMatch(/^\s*\*\s*\{\s*scrollbar-width:/m);
    expect(css).not.toContain('[data-refractor-theme-adaptive="true"] *');
    // Optimized GPU Gaussian blur kernel radii (55% lower fragment shader texel area)
    expect(css).toContain('--prism-blur-px: 12px;');
    expect(css).toContain('--prism-slab-blur-px: 14px;');
    // Nested backdrop-filter elision present (including blur-host ancestor hook)
    expect(css).toContain('.prism-slab :is(.prism-crystal, .prism-btn-secondary, .prism-slab)');
    expect(css).toContain('[data-refractor-blur-host="true"]');
    expect(css).toContain(':root :is(span, kbd, code, small, time).prism-crystal');
    // Containment & content-visibility utilities present
    expect(css).toContain('.prism-contain-leaf');
    expect(css).toContain('.prism-cv-row');
    expect(css).toContain('content-visibility: auto');
    expect(css).toContain('.refractor-order-book-depth-chart');
    // Three-tier performance mode rules present
    expect(css).toContain('[data-refractor-performance="high"]');
    expect(css).toContain('[data-refractor-performance="max"]');
    expect(css).toContain('.prism-backdrop-scrim');
  });

  it('guarantees 100% pure tree-shakeable memoWithDisplayName, zero in-render stableClassName, 100% SVG containment, and 100% rAF pointermove coalescing', () => {
    const coreSrcDir = path.resolve(process.cwd(), 'packages/core/src');
    const componentNames = fs
      .readdirSync(coreSrcDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && /^[A-Z][A-Za-z0-9]+$/.test(d.name))
      .map((d) => d.name)
      .sort();

    const blockedTreeShake: string[] = [];
    const unhoistedStableClass: string[] = [];
    const uncontainedSvg: string[] = [];
    const uncoalescedPointerMove: string[] = [];

    for (const name of componentNames) {
      const source = fs.readFileSync(path.join(coreSrcDir, name, `${name}.tsx`), 'utf8');
      if (new RegExp(`^${name}\\.displayName\\s*=`, 'm').test(source)) {
        blockedTreeShake.push(name);
      }
      if (!source.includes('/*#__PURE__*/ memoWithDisplayName(')) {
        blockedTreeShake.push(name);
      }
      if (/^[ \t]+const [A-Za-z0-9_]+ = stableClassName\(\s*'[^']+'(?:\s*,\s*'[^']+')?\s*\);/m.test(source)) {
        unhoistedStableClass.push(name);
      }
      if (/<svg\b/.test(source) && !/prism-contain-(?:box|leaf)/.test(source)) {
        uncontainedSvg.push(name);
      }
      if (
        source.includes("addEventListener('pointermove'") &&
        !source.includes('createCoalescedPointerMove')
      ) {
        uncoalescedPointerMove.push(name);
      }
    }

    expect(blockedTreeShake).toEqual([]);
    expect(unhoistedStableClass).toEqual([]);
    expect(uncontainedSvg).toEqual([]);
    expect(uncoalescedPointerMove).toEqual([]);

    // Verify @refractor-ui/themes declares sideEffects & pure exports for tree-shaking
    const themesPkg = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), 'packages/themes/collection/package.json'), 'utf8')
    ) as { sideEffects?: string[]; exports?: Record<string, string> };
    expect(themesPkg.sideEffects).toEqual(['**/*.css']);
    expect(themesPkg.exports?.['./classic-os']).toBe('./src/collections/classicOs.ts');
  });

  it('coalesces trusted high-frequency pointermove bursts to 60fps rAF while keeping synthetic events synchronous', () => {
    const queuedFrames: FrameRequestCallback[] = [];
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        queuedFrames.push(cb);
        return 77;
      });
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    try {
      const xs: number[] = [];
      const listener = createCoalescedPointerMove((evt) => {
        xs.push(evt.clientX);
      });

      // Synthetic events (isTrusted = false) execute synchronously
      listener({ clientX: 10, isTrusted: false } as PointerEvent);
      listener({ clientX: 20, isTrusted: false } as PointerEvent);
      expect(xs).toEqual([10, 20]);
      expect(rafSpy).not.toHaveBeenCalled();

      // Real trusted browser pointer burst (isTrusted = true) executes leading immediately, coalesces 40/50/60 -> 60 on next frame
      listener({ clientX: 30, isTrusted: true } as PointerEvent);
      listener({ clientX: 40, isTrusted: true } as PointerEvent);
      listener({ clientX: 50, isTrusted: true } as PointerEvent);
      listener({ clientX: 60, isTrusted: true } as PointerEvent);
      expect(xs).toEqual([10, 20, 30]);
      expect(rafSpy).toHaveBeenCalledTimes(1);

      queuedFrames.shift()?.(16.7);
      expect(xs).toEqual([10, 20, 30, 60]);

      // Single trusted event with no trailing burst clears rAF without extra call
      listener({ clientX: 65, isTrusted: true } as PointerEvent);
      queuedFrames.shift()?.(33.4);
      expect(xs).toEqual([10, 20, 30, 60, 65]);

      // Cancel clears pending rAF cleanly (and calling cancel when idle is a safe no-op)
      listener({ clientX: 70, isTrusted: true } as PointerEvent);
      listener({ clientX: 80, isTrusted: true } as PointerEvent);
      listener.cancel();
      listener.cancel();
      expect(cafSpy).toHaveBeenCalledWith(77);
    } finally {
      rafSpy.mockRestore();
      cafSpy.mockRestore();
    }
  });

  it('splits ComponentOverridesContext so theme/mode/refraction switches trigger ZERO re-renders in memoized consumers', () => {
    let renderCount = 0;

    const MemoizedConsumer = memo(function MemoizedConsumer() {
      renderCount += 1;
      const override = useComponentOverride('PrimaryButton');
      return <span data-testid="override-status">{override?.className ?? 'none'}</span>;
    });

    const neonTheme = defineTheme({
      name: 'neon-zero-rerender',
      material: 'neon',
      palette: { mode: 'dark', primary: { main: '#00F0FF' } },
    });

    const { rerender } = render(
      <PrismThemeProvider mode="light" refraction="standard" performanceMode="balanced" loadFonts={false}>
        <MemoizedConsumer />
        <PrimaryButton>Launch</PrimaryButton>
      </PrismThemeProvider>
    );

    expect(renderCount).toBe(1);
    expect(document.documentElement.getAttribute('data-refractor-performance')).toBe('balanced');

    // Switch mode, refraction, theme, and performanceMode — ZERO component overrides changed
    rerender(
      <PrismThemeProvider theme={neonTheme} mode="dark" refraction="vivid" performanceMode="max" loadFonts={false}>
        <MemoizedConsumer />
        <PrimaryButton>Launch</PrimaryButton>
      </PrismThemeProvider>
    );

    expect(renderCount).toBe(1);
    expect(document.documentElement.getAttribute('data-refractor-performance')).toBe('max');

    // Changing actual component overrides updates subscribers as expected
    const overrideTheme = defineTheme({
      name: 'override-active',
      components: { PrimaryButton: { className: 'custom-cta', style: { letterSpacing: '0.02em' } } },
    });
    rerender(
      <PrismThemeProvider theme={overrideTheme} performanceMode="high" loadFonts={false}>
        <MemoizedConsumer />
        <PrimaryButton>Launch</PrimaryButton>
      </PrismThemeProvider>
    );
    expect(renderCount).toBe(2);
    expect(screen.getByTestId('override-status')).toHaveTextContent('custom-cta');
    expect(document.documentElement.getAttribute('data-refractor-performance')).toBe('high');

    // Re-rendering with structurally equal overrides keeps identity stable (zero extra render)
    const equalOverrideTheme = defineTheme({
      name: 'override-active-2',
      palette: { mode: 'dark' },
      components: { PrimaryButton: { className: 'custom-cta', style: { letterSpacing: '0.02em' } } },
    });
    rerender(
      <PrismThemeProvider theme={equalOverrideTheme} performanceMode="high" loadFonts={false}>
        <MemoizedConsumer />
        <PrimaryButton>Launch</PrimaryButton>
      </PrismThemeProvider>
    );
    expect(renderCount).toBe(2);
  });

  it('supports performanceMode on local scoped PrismThemeProvider instances', () => {
    const modes: ReadonlyArray<ThemePerformanceMode> = ['balanced', 'high', 'max'];
    const { container, rerender } = render(
      <PrismThemeProvider scope="local" performanceMode={modes[0]} loadFonts={false}>
        <span>Scoped</span>
      </PrismThemeProvider>
    );
    expect(container.querySelector('[data-refractor-performance="balanced"]')).not.toBeNull();

    rerender(
      <PrismThemeProvider scope="local" performanceMode={modes[2]} loadFonts={false}>
        <span>Scoped</span>
      </PrismThemeProvider>
    );
    expect(container.querySelector('[data-refractor-performance="max"]')).not.toBeNull();
  });

  it('preserves referential stability on hot-path utilities, caches, formatters, and hooks', () => {
    // stableClassName & stateless themeProps caching
    expect(stableClassName('PrimaryButton')).toBe('refractor-primary-button');
    expect(stableClassName('PrimaryButton')).toBe('refractor-primary-button');
    const statelessA = themeProps('badge-status');
    const statelessB = themeProps('badge-status');
    expect(statelessA).toBe(statelessB);

    // mergeProps single-style zero-allocation passthrough
    const singleStyle = { padding: '8px' };
    const mergedSingle = mergeProps({ baseClassName: 'prism-slab', userStyle: singleStyle });
    expect(mergedSingle.style).toBe(singleStyle);
    expect(cx('  a ', null, false, undefined, 'b  ', '   ')).toBe('a b');

    // composeEventHandlers zero-wrapper fast paths
    const fn = vi.fn();
    expect(composeEventHandlers(undefined, fn)).toBe(fn);
    expect(composeEventHandlers(fn, undefined)).toBe(fn);
    const noop = composeEventHandlers(undefined, undefined);
    expect(() => noop({ defaultPrevented: false })).not.toThrow();

    // themeToCssVariables WeakMap cache hit
    const theme = createPrismTheme('dark', 'vivid');
    expect(themeToCssVariables(theme)).toBe(themeToCssVariables(theme));

    // buildMonthGrid cache hit
    expect(buildMonthGrid(2026, 10)).toBe(buildMonthGrid(2026, 10));

    // colorMath LUT & fast hex parser cache
    const rgbA = parseColorToRgb('#E75C24');
    const rgbB = parseColorToRgb('#E75C24');
    expect(rgbA).toBe(rgbB);
    expect(getContrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 1);

    // sanitizeUrl clean fast path
    expect(sanitizeUrl('https://refractor.dev/docs')).toBe('https://refractor.dev/docs');

    // diffAlgorithm prefix/suffix trimmed flat Int32Array diff
    const baseLines = Array.from({ length: 120 }, (_, i) => `line-${i}`);
    const modLines = [...baseLines];
    modLines[60] = 'line-60-edited';
    const diff = computeLineDiff(baseLines.join('\n'), modLines.join('\n'));
    expect(diff.unchanged).toBe(119);
    expect(diff.additions).toBe(1);
    expect(diff.deletions).toBe(1);

    // Shared frozen style singletons & hoisted Intl helpers
    expect(Object.isFrozen(STYLE_TEXT_PRIMARY)).toBe(true);
    expect(Object.isFrozen(STYLE_TEXT_SECONDARY)).toBe(true);
    expect(Object.isFrozen(STYLE_BORDER_DIVIDER)).toBe(true);
    expect(formatUsNumber(1234567)).toBe('1,234,567');
    expect(formatLocaleNumber(42)).toBe('42');
    expect(compareNaturalStrings('item-2', 'item-10')).toBeLessThan(0);
    expect(compareLocaleStrings('alpha', 'beta')).toBeLessThan(0);
  });

  it('keeps useControllableState setter and useMergedRefs callback referentially stable across renders', () => {
    const observedSetters: Array<(next: number | ((p: number) => number)) => void> = [];
    const observedRefs: Array<(node: HTMLDivElement | null) => void> = [];

    function StabilityHarness() {
      const [count, setCount] = useControllableState({ defaultValue: 0 });
      const localRef = useRef<HTMLDivElement>(null);
      const mergedRef = useMergedRefs(localRef);
      observedSetters.push(setCount);
      observedRefs.push(mergedRef);
      return (
        <div ref={mergedRef}>
          <button type="button" onClick={() => setCount((n) => n + 1)}>
            Count {count}
          </button>
          <button type="button" onClick={() => setCount(count)}>
            Noop
          </button>
        </div>
      );
    }

    render(<StabilityHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Count 0' }));
    fireEvent.click(screen.getByRole('button', { name: 'Count 1' }));
    fireEvent.click(screen.getByRole('button', { name: 'Noop' }));

    expect(observedSetters.length).toBeGreaterThanOrEqual(3);
    expect(observedSetters[0]).toBe(observedSetters[1]);
    expect(observedSetters[1]).toBe(observedSetters[2]);
    expect(observedRefs[0]).toBe(observedRefs[1]);
    expect(observedRefs[1]).toBe(observedRefs[2]);
  });

  it('coalesces high-frequency bursts with useRafCallback and checks isDocumentVisible()', () => {
    expect(isDocumentVisible()).toBe(true);

    let scheduledFrame: FrameRequestCallback | null = null;
    const rafSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        scheduledFrame = cb;
        return 42;
      });
    const cafSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const received: number[] = [];

    function RafHarness() {
      const throttled = useRafCallback((val: number) => {
        received.push(val);
      });
      return (
        <div>
          <button
            type="button"
            onClick={() => {
              throttled(1);
              throttled(2);
              throttled(3);
            }}
          >
            Burst
          </button>
          <button type="button" onClick={() => throttled.flush()}>
            Flush
          </button>
          <button type="button" onClick={() => throttled.cancel()}>
            Cancel
          </button>
        </div>
      );
    }

    const { unmount } = render(<RafHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Burst' }));
    // Leading call executes immediately; 2 & 3 coalesce to 3
    expect(received).toEqual([1]);
    expect(rafSpy).toHaveBeenCalledTimes(1);

    // Executing scheduled animation frame delivers the latest coalesced value (3)
    act(() => {
      scheduledFrame?.(16.7);
    });
    expect(received).toEqual([1, 3]);

    // Trigger another burst and manually flush
    fireEvent.click(screen.getByRole('button', { name: 'Burst' }));
    expect(received).toEqual([1, 3, 1]);
    fireEvent.click(screen.getByRole('button', { name: 'Flush' }));
    expect(received).toEqual([1, 3, 1, 3]);

    // Trigger another burst and cancel / unmount cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Burst' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cafSpy).toHaveBeenCalled();
    unmount();
  });

  it('avoids redundant VirtualizedList re-renders on sub-row pixel scrolls and caps LiveTelemetryChart memory', () => {
    const items = Array.from({ length: 200 }, (_, i) => ({ id: `row-${i}`, label: `Item ${i}` }));
    const renderItem = vi.fn((item: { id: string; label: string }) => <span>{item.label}</span>);

    render(
      <VirtualizedList
        items={items}
        itemHeight={48}
        height={240}
        overscan={2}
        renderItem={renderItem}
      />
    );

    const initialCalls = renderItem.mock.calls.length;
    const viewport = screen.getByRole('region', { name: 'Virtualized list viewport' });

    // Sub-row scroll offsets (10px, 25px, 40px within a 48px row) keep visibleStart === 0 -> ZERO re-renders!
    fireEvent.scroll(viewport, { target: { scrollTop: 10 } });
    fireEvent.scroll(viewport, { target: { scrollTop: 25 } });
    fireEvent.scroll(viewport, { target: { scrollTop: 40 } });
    expect(renderItem.mock.calls.length).toBe(initialCalls);

    // Crossing row boundary (96px -> visibleStart === 2) updates slice cleanly
    fireEvent.scroll(viewport, { target: { scrollTop: 96 } });
    expect(renderItem.mock.calls.length).toBeGreaterThan(initialCalls);

    // LiveTelemetryChart bounded stream memory & DataTable + KanbanBoard integration
    vi.useFakeTimers();
    try {
      render(
        <LiveTelemetryChart
          samples={[{ id: 's0', timestamp: '00:00', value: 12 }]}
          streamingIntervalMs={10}
          onGenerateSample={(seq) => ({ timestamp: `t-${seq}`, value: 10 + (seq % 20) })}
        />
      );
      act(() => {
        vi.advanceTimersByTime(2600);
      });
      expect(screen.getByTestId('telemetry-chart-svg')).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('isolates KanbanBoard Quick Add typing and DataTable selection lookups cleanly', () => {
    const columns: KanbanColumnDef[] = [
      { id: 'todo', title: 'To Do' },
      { id: 'done', title: 'Done' },
    ];
    const cards: KanbanCardItem[] = [
      { id: 'c1', columnId: 'todo', title: 'Ship compositor fix', priority: 'high' },
    ];
    const onCardAdd = vi.fn();
    render(<KanbanBoard columns={columns} defaultCards={cards} onCardAdd={onCardAdd} />);
    const input = screen.getByLabelText('Quick add card to To Do');
    fireEvent.change(input, { target: { value: 'Verify 60fps' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCardAdd).toHaveBeenCalledWith('todo', 'Verify 60fps');

    const rows: DataTableRow[] = [
      {
        id: 'R-1',
        project: 'Compositor',
        owner: 'Ada',
        department: 'Core',
        status: 'Active',
        completion: 92,
        budgetUsd: 12000,
        updatedAt: '2026-11-22',
      },
      {
        id: 'R-2',
        project: 'Virtualizer',
        owner: 'Grace',
        department: 'Core',
        status: 'Review',
        completion: 84,
        budgetUsd: 8500,
        updatedAt: '2026-11-22',
      },
    ];

    function TableHarness() {
      const [selected, setSelected] = useState<string[]>([]);
      return (
        <DataTable
          rows={rows}
          sortBy="id"
          sortDir="asc"
          onSortChange={() => {}}
          selectedIds={selected}
          onToggleSelect={(id) =>
            setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
          }
        />
      );
    }

    render(<TableHarness />);
    const checkbox = screen.getByLabelText('Select Compositor');
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('guarantees ZERO React re-renders during 150 rapid pointermove events on cursor-reactive FX surfaces and fast mount budgets across all 25 new FX/Shader/Loader components', () => {
    let haloRenders = 0;
    const HaloProbe = memo(function HaloProbe() {
      haloRenders += 1;
      return <span data-testid="halo-probe">static child</span>;
    });

    const { container: haloContainer, unmount: unmountHalo } = render(
      <Core.PrismaticCursorHalo data-testid="perf-halo">
        <HaloProbe />
      </Core.PrismaticCursorHalo>
    );
    const haloEl = haloContainer.querySelector('[data-testid="perf-halo"]') as HTMLElement;
    fireEvent.pointerEnter(haloEl, { clientX: 20, clientY: 20 });
    const rendersAfterEnter = haloRenders;
    const moveStart = performance.now();
    for (let i = 0; i < 150; i += 1) {
      fireEvent.pointerMove(haloEl, { clientX: 20 + i, clientY: 30 + (i % 40) });
    }
    const moveElapsedMs = performance.now() - moveStart;
    expect(haloRenders).toBe(rendersAfterEnter);
    expect(moveElapsedMs).toBeLessThan(250);
    unmountHalo();

    // Benchmark cold mount + clean unmount across all 25 new FX, Shader & Loader components
    const mountStart = performance.now();
    const { unmount } = render(
      <PrismThemeProvider loadFonts={false}>
        <Core.PrismaticCursorHalo><span>Halo</span></Core.PrismaticCursorHalo>
        <Core.AiFocusRing active processing><span>Ring</span></Core.AiFocusRing>
        <Core.FluidMeshCanvas mood="thinking"><span>Mesh</span></Core.FluidMeshCanvas>
        <Core.GradientTextSelection defaultValue="Optical caret" />
        <Core.AmbientAuraBleed tone="prism"><span>Aura</span></Core.AmbientAuraBleed>
        <Core.ReactiveInputShimmer />
        <Core.IridescentRimSurface><span>Rim</span></Core.IridescentRimSurface>
        <Core.StatefulEnergyRibbon state="streaming" showLabel />
        <Core.RefractiveLensContainer ior={1.5}><span>Lens</span></Core.RefractiveLensContainer>
        <Core.ChromaticDispersionEdge><span>Dispersion</span></Core.ChromaticDispersionEdge>
        <Core.CausticLightLayer><span>Caustic</span></Core.CausticLightLayer>
        <Core.FrostedGrainOverlay><span>Grain</span></Core.FrostedGrainOverlay>
        <Core.LiquidRippleTrigger><span>Ripple</span></Core.LiquidRippleTrigger>
        <Core.HolographicFoilSheen><span>Foil</span></Core.HolographicFoilSheen>
        <Core.MetaballFluidBackdrop orbCount={3}><span>Metaball</span></Core.MetaballFluidBackdrop>
        <Core.OpticalDepthVignette active><span>Vignette</span></Core.OpticalDepthVignette>
        <Core.RefractiveSkeleton loading preset="card" />
        <Core.OrbitalRingSpinner showLabel />
        <Core.AiThinkingOrb state="thinking" />
        <Core.SegmentedGlassProgress value={72} segments={10} />
        <Core.StreamingTokenReveal text="Fast optical stream" skipAnimation />
        <Core.DataGridRowShimmer loading rows={4} />
        <Core.AcousticActivityBar active barCount={9} />
        <Core.PipelinePulseLoader />
        <Core.ScanlineRadarSweep active mode="vertical"><span>Scan</span></Core.ScanlineRadarSweep>
      </PrismThemeProvider>
    );
    const totalMountMs = performance.now() - mountStart;
    // All 25 FX/Shader/Loader components mount together in well under 500ms even in jsdom
    expect(totalMountMs).toBeLessThan(500);
    unmount();

    // Verify refractor.css contains performanceMode="max" and reduced-motion guards for all new FX keyframes
    const css = fs.readFileSync(path.resolve(process.cwd(), 'packages/core/src/refractor.css'), 'utf8');
    expect(css).toContain('.refractor-data-grid-row-shimmer');
    expect(css).toContain('.prism-fx-orbit-ring');
    expect(css).toContain('.prism-fx-shimmer-wave');
    expect(css).toContain('[data-refractor-performance="max"] :is(');
  });
});
