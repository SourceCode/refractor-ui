import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ScrollShadowArea,
  type ScrollShadowAxis,
  type ScrollShadowEdgeState,
} from './index';

interface ScrollMetrics {
  scrollTop?: number;
  scrollLeft?: number;
  scrollHeight?: number;
  scrollWidth?: number;
  clientHeight?: number;
  clientWidth?: number;
}

function mockScrollMetrics(element: HTMLElement, metrics: ScrollMetrics): void {
  const entries: Array<[keyof ScrollMetrics, number | undefined]> = [
    ['scrollTop', metrics.scrollTop],
    ['scrollLeft', metrics.scrollLeft],
    ['scrollHeight', metrics.scrollHeight],
    ['scrollWidth', metrics.scrollWidth],
    ['clientHeight', metrics.clientHeight],
    ['clientWidth', metrics.clientWidth],
  ];

  for (const [key, value] of entries) {
    if (value !== undefined) {
      Object.defineProperty(element, key, {
        configurable: true,
        writable: true,
        value,
      });
    }
  }
}

const originalResizeObserver = globalThis.ResizeObserver;

describe('ScrollShadowArea', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    if (originalResizeObserver) {
      globalThis.ResizeObserver = originalResizeObserver;
    } else {
      Reflect.deleteProperty(globalThis, 'ResizeObserver');
    }
  });

  it('renders sculpted prism-slab/prism-well structure, forwards React 19 ref, merges theme overrides, and sets default attributes', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ScrollShadowArea: {
              className: 'theme-scroll-area',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <ScrollShadowArea
          ref={ref}
          className="local-scroll-area"
          xstyle={{ '--prism-slab-blur-px': '20px' }}
          style={{ marginTop: '8px' }}
          data-testid="scroll-root"
        >
          <p>Optical glass content</p>
        </ScrollShadowArea>
      </PrismThemeProvider>
    );

    expect(ScrollShadowArea.displayName).toBe('ScrollShadowArea');

    const root = screen.getByTestId('scroll-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-scroll-shadow-area',
      'prism-slab',
      'relative',
      'overflow-hidden',
      'min-w-0',
      'max-w-full',
      'theme-scroll-area',
      'local-scroll-area'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.2px', marginTop: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('20px');
    expect(root.style.getPropertyValue('--prism-scroll-shadow-size')).toBe('28px');

    expect(root).toHaveAttribute('data-axis', 'vertical');
    expect(root).toHaveAttribute('data-shadow-top', 'false');
    expect(root).toHaveAttribute('data-shadow-bottom', 'false');
    expect(root).toHaveAttribute('data-shadow-left', 'false');
    expect(root).toHaveAttribute('data-shadow-right', 'false');

    const viewport = screen.getByRole('region', { name: 'Scrollable content region' });
    expect(viewport).toHaveAttribute('tabindex', '0');
    expect(viewport).toHaveClass(
      'refractor-scroll-shadow-area__viewport',
      'prism-focus-ring',
      'overflow-y-auto',
      'overflow-x-hidden'
    );
    expect(viewport).toHaveStyle({ maxHeight: '260px' });
    expect(screen.getByText('Optical glass content')).toBeInTheDocument();

    const topOverlay = root.querySelector('[data-edge="top"]') as HTMLElement | null;
    const bottomOverlay = root.querySelector('[data-edge="bottom"]') as HTMLElement | null;
    expect(topOverlay).not.toBeNull();
    expect(bottomOverlay).not.toBeNull();
    expect(topOverlay).toHaveAttribute('aria-hidden', 'true');
    expect(topOverlay).toHaveClass('pointer-events-none');
    expect(topOverlay?.style.height).toBe('28px');
    expect(topOverlay?.style.opacity).toBe('0');
    expect(topOverlay?.style.backgroundImage).toContain('var(--prism-bg-start)');
    expect(topOverlay?.style.backgroundImage).toContain('var(--prism-divider)');
    expect(root.querySelector('[data-edge="left"]')).toBeNull();
    expect(root.querySelector('[data-edge="right"]')).toBeNull();
  });

  it('tracks vertical overflow edges across mount, scroll, and bottom reach while deduplicating onEdgeChange calls', () => {
    const onEdgeChange = vi.fn<(edges: ScrollShadowEdgeState) => void>();

    render(
      <ScrollShadowArea
        data-testid="vertical-root"
        viewportLabel="Audit log feed"
        onEdgeChange={onEdgeChange}
      >
        <div>Log entries</div>
      </ScrollShadowArea>
    );

    const root = screen.getByTestId('vertical-root');
    const viewport = screen.getByRole('region', { name: 'Audit log feed' });

    // Simulate vertical overflow at scrollTop = 0
    mockScrollMetrics(viewport, {
      scrollHeight: 600,
      clientHeight: 200,
      scrollTop: 0,
      scrollWidth: 800,
      clientWidth: 300,
      scrollLeft: 50,
    });
    fireEvent(window, new Event('resize'));

    expect(root).toHaveAttribute('data-shadow-top', 'false');
    expect(root).toHaveAttribute('data-shadow-bottom', 'true');
    expect(root).toHaveAttribute('data-shadow-left', 'false');
    expect(root).toHaveAttribute('data-shadow-right', 'false');
    expect(onEdgeChange).toHaveBeenCalledTimes(1);
    expect(onEdgeChange).toHaveBeenLastCalledWith({
      top: false,
      bottom: true,
      left: false,
      right: false,
    });

    const topOverlay = root.querySelector('[data-edge="top"]') as HTMLElement;
    const bottomOverlay = root.querySelector('[data-edge="bottom"]') as HTMLElement;
    expect(topOverlay.style.opacity).toBe('0');
    expect(bottomOverlay.style.opacity).toBe('1');
    expect(bottomOverlay).toHaveAttribute('data-active', 'true');

    // Scroll to middle -> both top & bottom active
    mockScrollMetrics(viewport, { scrollTop: 140 });
    fireEvent.scroll(viewport);

    expect(root).toHaveAttribute('data-shadow-top', 'true');
    expect(root).toHaveAttribute('data-shadow-bottom', 'true');
    expect(topOverlay.style.opacity).toBe('1');
    expect(bottomOverlay.style.opacity).toBe('1');
    expect(onEdgeChange).toHaveBeenCalledTimes(2);
    expect(onEdgeChange).toHaveBeenLastCalledWith({
      top: true,
      bottom: true,
      left: false,
      right: false,
    });

    // Scroll slightly inside middle -> edge state unchanged, callback NOT duplicated
    mockScrollMetrics(viewport, { scrollTop: 185 });
    fireEvent.scroll(viewport);
    expect(onEdgeChange).toHaveBeenCalledTimes(2);

    // Scroll to exact bottom -> only top active
    mockScrollMetrics(viewport, { scrollTop: 400 });
    fireEvent.scroll(viewport);

    expect(root).toHaveAttribute('data-shadow-top', 'true');
    expect(root).toHaveAttribute('data-shadow-bottom', 'false');
    expect(topOverlay.style.opacity).toBe('1');
    expect(bottomOverlay.style.opacity).toBe('0');
    expect(onEdgeChange).toHaveBeenCalledTimes(3);
    expect(onEdgeChange).toHaveBeenLastCalledWith({
      top: true,
      bottom: false,
      left: false,
      right: false,
    });
  });

  it('supports horizontal and both axes with accurate left/right/top/bottom shadow overlays', () => {
    const onEdgeChange = vi.fn<(edges: ScrollShadowEdgeState) => void>();

    const { rerender } = render(
      <ScrollShadowArea
        axis="horizontal"
        data-testid="axis-root"
        onEdgeChange={onEdgeChange}
      >
        <div>Wide horizontal strip</div>
      </ScrollShadowArea>
    );

    const root = screen.getByTestId('axis-root');
    const viewport = screen.getByRole('region', { name: 'Scrollable content region' });

    expect(root).toHaveAttribute('data-axis', 'horizontal');
    expect(viewport).toHaveClass('overflow-x-auto', 'overflow-y-hidden');
    expect(root.querySelector('[data-edge="top"]')).toBeNull();
    expect(root.querySelector('[data-edge="bottom"]')).toBeNull();
    expect(root.querySelector('[data-edge="left"]')).not.toBeNull();
    expect(root.querySelector('[data-edge="right"]')).not.toBeNull();

    // Horizontal overflow at scrollLeft = 0 (vertical overflow intentionally ignored on horizontal axis)
    mockScrollMetrics(viewport, {
      scrollWidth: 900,
      clientWidth: 300,
      scrollLeft: 0,
      scrollHeight: 800,
      clientHeight: 200,
      scrollTop: 100,
    });
    fireEvent.scroll(viewport);

    expect(root).toHaveAttribute('data-shadow-top', 'false');
    expect(root).toHaveAttribute('data-shadow-bottom', 'false');
    expect(root).toHaveAttribute('data-shadow-left', 'false');
    expect(root).toHaveAttribute('data-shadow-right', 'true');

    const leftOverlay = root.querySelector('[data-edge="left"]') as HTMLElement;
    const rightOverlay = root.querySelector('[data-edge="right"]') as HTMLElement;
    expect(leftOverlay.style.opacity).toBe('0');
    expect(rightOverlay.style.opacity).toBe('1');
    expect(rightOverlay.style.backgroundImage).toContain('var(--prism-bg-start)');

    // Scroll horizontally to middle
    mockScrollMetrics(viewport, { scrollLeft: 250 });
    fireEvent.scroll(viewport);
    expect(root).toHaveAttribute('data-shadow-left', 'true');
    expect(root).toHaveAttribute('data-shadow-right', 'true');
    expect(leftOverlay.style.opacity).toBe('1');
    expect(rightOverlay.style.opacity).toBe('1');

    // Scroll horizontally to right end
    mockScrollMetrics(viewport, { scrollLeft: 600 });
    fireEvent.scroll(viewport);
    expect(root).toHaveAttribute('data-shadow-left', 'true');
    expect(root).toHaveAttribute('data-shadow-right', 'false');

    // Switch to axis="both" -> all 4 overlays mount and evaluate simultaneously
    const bothAxis: ScrollShadowAxis = 'both';
    rerender(
      <ScrollShadowArea
        axis={bothAxis}
        data-testid="axis-root"
        onEdgeChange={onEdgeChange}
      >
        <div>2D grid content</div>
      </ScrollShadowArea>
    );

    expect(root).toHaveAttribute('data-axis', 'both');
    expect(viewport).toHaveClass('overflow-auto');
    expect(root.querySelector('[data-edge="top"]')).not.toBeNull();
    expect(root.querySelector('[data-edge="bottom"]')).not.toBeNull();
    expect(root.querySelector('[data-edge="left"]')).not.toBeNull();
    expect(root.querySelector('[data-edge="right"]')).not.toBeNull();

    // scrollTop=100 of 800/200 -> top & bottom true; scrollLeft=600 of 900/300 -> left true, right false
    expect(root).toHaveAttribute('data-shadow-top', 'true');
    expect(root).toHaveAttribute('data-shadow-bottom', 'true');
    expect(root).toHaveAttribute('data-shadow-left', 'true');
    expect(root).toHaveAttribute('data-shadow-right', 'false');
  });

  it('clamps shadowSizePx to 12..64, normalizes maxHeight edge cases, and falls back blank viewportLabel', () => {
    const { rerender } = render(
      <ScrollShadowArea
        data-testid="clamp-root"
        shadowSizePx={4}
        maxHeight="18rem"
        viewportLabel="   "
      >
        <div>Clamped low</div>
      </ScrollShadowArea>
    );

    const root = screen.getByTestId('clamp-root');
    const viewport = screen.getByRole('region', { name: 'Scrollable content region' });
    expect(root.style.getPropertyValue('--prism-scroll-shadow-size')).toBe('12px');
    expect((root.querySelector('[data-edge="top"]') as HTMLElement).style.height).toBe('12px');
    expect(viewport.style.maxHeight).toBe('18rem');

    // Above 64 clamps to 64; negative numeric maxHeight falls back to 260px
    rerender(
      <ScrollShadowArea data-testid="clamp-root" shadowSizePx={150} maxHeight={-40}>
        <div>Clamped high</div>
      </ScrollShadowArea>
    );
    expect(root.style.getPropertyValue('--prism-scroll-shadow-size')).toBe('64px');
    expect((root.querySelector('[data-edge="bottom"]') as HTMLElement).style.height).toBe('64px');
    expect(viewport).toHaveStyle({ maxHeight: '260px' });

    // Non-finite shadowSizePx -> 28px; empty string maxHeight -> 260px
    rerender(
      <ScrollShadowArea data-testid="clamp-root" shadowSizePx={Number.NaN} maxHeight="   ">
        <div>NaN fallback</div>
      </ScrollShadowArea>
    );
    expect(root.style.getPropertyValue('--prism-scroll-shadow-size')).toBe('28px');
    expect(viewport).toHaveStyle({ maxHeight: '260px' });

    // Fractional shadowSizePx rounds cleanly; positive numeric maxHeight formats as px
    rerender(
      <ScrollShadowArea data-testid="clamp-root" shadowSizePx={35.6} maxHeight={340}>
        <div>Rounded</div>
      </ScrollShadowArea>
    );
    expect(root.style.getPropertyValue('--prism-scroll-shadow-size')).toBe('36px');
    expect(viewport).toHaveStyle({ maxHeight: '340px' });
  });

  it('renders optional Back-to-Top / Jump-to-End pill only when vertical overflow exists and scrolls via fallback or scrollTo', () => {
    const { rerender } = render(
      <ScrollShadowArea data-testid="buttons-root" showScrollButtons>
        <div>Long vertical list</div>
      </ScrollShadowArea>
    );

    const root = screen.getByTestId('buttons-root');
    const viewport = screen.getByRole('region', { name: 'Scrollable content region' });

    // No overflow yet -> pill hidden
    expect(screen.queryByTestId('scroll-shadow-controls')).toBeNull();
    expect(root).toHaveAttribute('data-scroll-buttons', 'true');

    // Create vertical overflow at top (no Element.scrollTo in JSDOM -> exercises direct scrollTop fallback)
    mockScrollMetrics(viewport, {
      scrollHeight: 700,
      clientHeight: 200,
      scrollTop: 0,
    });
    fireEvent.scroll(viewport);

    const controls = screen.getByTestId('scroll-shadow-controls');
    expect(controls).toHaveClass('prism-crystal');
    const topBtn = screen.getByRole('button', { name: 'Back to top' });
    const endBtn = screen.getByRole('button', { name: 'Jump to end' });

    expect(topBtn).toBeDisabled();
    expect(topBtn).toHaveClass('disabled:cursor-not-allowed');
    expect(endBtn).toBeEnabled();

    // Click Jump to end -> sets scrollTop to 500 via fallback and updates shadow states
    fireEvent.click(endBtn);
    expect(viewport.scrollTop).toBe(500);
    expect(root).toHaveAttribute('data-shadow-top', 'true');
    expect(root).toHaveAttribute('data-shadow-bottom', 'false');
    expect(topBtn).toBeEnabled();
    expect(endBtn).toBeDisabled();

    // Click Back to top -> sets scrollTop to 0 via fallback
    fireEvent.click(topBtn);
    expect(viewport.scrollTop).toBe(0);
    expect(root).toHaveAttribute('data-shadow-top', 'false');
    expect(root).toHaveAttribute('data-shadow-bottom', 'true');

    // Now provide native viewport.scrollTo spy -> verifies smooth scroll call path
    const scrollToSpy = vi.fn((options?: ScrollToOptions) => {
      if (options && typeof options.top === 'number') {
        viewport.scrollTop = options.top;
      }
    });
    Object.defineProperty(viewport, 'scrollTo', {
      configurable: true,
      writable: true,
      value: scrollToSpy,
    });

    fireEvent.click(endBtn);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 500, behavior: 'smooth' });
    expect(root).toHaveAttribute('data-shadow-top', 'true');
    expect(root).toHaveAttribute('data-shadow-bottom', 'false');

    fireEvent.click(topBtn);
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(root).toHaveAttribute('data-shadow-top', 'false');
    expect(root).toHaveAttribute('data-shadow-bottom', 'true');

    // Horizontal axis never displays vertical jump buttons even with showScrollButtons
    rerender(
      <ScrollShadowArea axis="horizontal" data-testid="buttons-root" showScrollButtons>
        <div>Horizontal strip</div>
      </ScrollShadowArea>
    );
    expect(screen.queryByTestId('scroll-shadow-controls')).toBeNull();
  });

  it('observes window resize and ResizeObserver when available, and cleanly tears down all listeners on unmount', () => {
    const observeMock = vi.fn<(target: Element) => void>();
    const disconnectMock = vi.fn<() => void>();
    let capturedCallback: ResizeObserverCallback | null = null;

    class MockResizeObserver implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        capturedCallback = callback;
      }
      observe(target: Element): void {
        observeMock(target);
      }
      unobserve(): void {
        // noop
      }
      disconnect(): void {
        disconnectMock();
      }
    }

    globalThis.ResizeObserver = MockResizeObserver;

    const addListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <ScrollShadowArea data-testid="observer-root">
        <div>Dynamic container</div>
      </ScrollShadowArea>
    );

    const root = screen.getByTestId('observer-root');
    const viewport = screen.getByRole('region', { name: 'Scrollable content region' });

    expect(observeMock).toHaveBeenCalledWith(viewport);
    const resizeRegistration = addListenerSpy.mock.calls.find(([event]) => event === 'resize');
    expect(resizeRegistration).toBeDefined();

    // Simulate container shrink via ResizeObserver callback
    mockScrollMetrics(viewport, {
      scrollHeight: 500,
      clientHeight: 180,
      scrollTop: 0,
    });
    act(() => {
      capturedCallback?.([], new MockResizeObserver(() => undefined));
    });
    expect(root).toHaveAttribute('data-shadow-bottom', 'true');

    unmount();

    expect(disconnectMock).toHaveBeenCalledTimes(1);
    const resizeRemoval = removeListenerSpy.mock.calls.find(
      ([event, handler]) => event === 'resize' && handler === resizeRegistration?.[1]
    );
    expect(resizeRemoval).toBeDefined();
  });

  it('renders adversarial XSS strings in viewportLabel and children as literal escaped text', () => {
    const payload = '<script>window.__scrollXss=1</script><img src=x onerror=alert(1)>';

    render(
      <ScrollShadowArea viewportLabel={payload} data-testid="xss-root">
        <div>{payload}</div>
      </ScrollShadowArea>
    );

    const viewport = screen.getByRole('region', { name: payload });
    expect(viewport).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
