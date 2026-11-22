import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  WipeCompareOverlay,
  type WipeOrientation,
  type WipeOrientationMap,
} from './index';

function mockStageRect(
  el: HTMLElement,
  left = 0,
  top = 0,
  width = 400,
  height = 225
) {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: top,
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    toJSON: () => ({}),
  });
}

describe('WipeCompareOverlay', () => {
  it('renders Astryx contracts, default optical placeholders, corner badges, status bar, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const orientationMapCheck: WipeOrientationMap = { vertical: true, horizontal: true };
    expect(orientationMapCheck.vertical && orientationMapCheck.horizontal).toBe(true);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            WipeCompareOverlay: {
              className: 'theme-wipe-overlay',
              style: { maxWidth: '840px' },
            },
          },
        }}
      >
        <WipeCompareOverlay
          ref={ref}
          defaultPositionPct={64}
          className="local-wipe-overlay"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '12px' }}
          data-testid="wipe-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('wipe-root');
    expect(ref.current).toBe(root);
    expect(WipeCompareOverlay.displayName).toBe('WipeCompareOverlay');
    expect(root).toHaveClass(
      'refractor-wipe-compare-overlay',
      'prism-slab',
      'theme-wipe-overlay',
      'local-wipe-overlay'
    );
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(root).toHaveStyle({ maxWidth: '840px', marginTop: '12px' });

    // Rich default Log-C and Prism LUT optical placeholders
    expect(screen.getByTestId('wipe-before-placeholder')).toBeInTheDocument();
    expect(screen.getByTestId('wipe-after-placeholder')).toBeInTheDocument();

    // Default floating corner badges
    expect(screen.getByTestId('wipe-before-badge')).toHaveTextContent('Original (Log-C)');
    expect(screen.getByTestId('wipe-after-badge')).toHaveTextContent('Graded (Prism LUT)');

    // Clipped before layer + vertical divider
    expect(screen.getByTestId('wipe-before-layer')).toHaveStyle({
      clipPath: 'inset(0 36% 0 0)',
    });
    expect(screen.getByTestId('wipe-divider')).toHaveStyle({ left: '64%' });

    // Slider ARIA attributes
    const slider = screen.getByRole('slider', { name: 'Compare split wipe position' });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '64');
    expect(slider).toHaveAttribute('aria-orientation', 'horizontal');
    expect(slider).toHaveAttribute('tabindex', '0');

    // Recessed aria-live="polite" status bar
    const statusBar = screen.getByTestId('wipe-status-bar');
    expect(statusBar).toHaveAttribute('aria-live', 'polite');
    expect(statusBar).toHaveTextContent('Split: 64% · Vertical');
    expect(screen.queryByTestId('wipe-bypass-indicator')).toBeNull();
  });

  it('renders custom beforeContent, afterContent, and custom labels safely as literal text', () => {
    render(
      <WipeCompareOverlay
        beforeLabel="<script>window.__xss=1</script>RAW Source"
        afterLabel="<img src=x onerror=alert(1)>Film Print"
        beforeContent={<div data-testid="custom-before">Custom Original Frame</div>}
        afterContent={<div data-testid="custom-after">Custom Graded Frame</div>}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('custom-before')).toHaveTextContent('Custom Original Frame');
    expect(screen.getByTestId('custom-after')).toHaveTextContent('Custom Graded Frame');
    expect(screen.queryByTestId('wipe-before-placeholder')).toBeNull();
    expect(screen.queryByTestId('wipe-after-placeholder')).toBeNull();
    expect(screen.getByTestId('wipe-before-badge')).toHaveTextContent(
      '<script>window.__xss=1</script>RAW Source'
    );
    expect(screen.getByTestId('wipe-after-badge')).toHaveTextContent(
      '<img src=x onerror=alert(1)>Film Print'
    );
  });

  it('toggles between Vertical and Horizontal orientations and resets split via 50 / 50 button', () => {
    const onOrientationChange = vi.fn<(orientation: WipeOrientation) => void>();
    const onPositionChange = vi.fn<(positionPct: number) => void>();

    render(
      <WipeCompareOverlay
        defaultPositionPct={30}
        onOrientationChange={onOrientationChange}
        onPositionChange={onPositionChange}
        data-testid="wipe-root"
      />
    );

    const verticalBtn = screen.getByTestId('wipe-orientation-vertical');
    const horizontalBtn = screen.getByTestId('wipe-orientation-horizontal');
    const centerBtn = screen.getByTestId('wipe-center-button');

    expect(verticalBtn).toHaveAttribute('aria-pressed', 'true');
    expect(horizontalBtn).toHaveAttribute('aria-pressed', 'false');

    // Clicking already-active orientation does not fire callback
    fireEvent.click(verticalBtn);
    expect(onOrientationChange).not.toHaveBeenCalled();

    // Switch to Horizontal
    fireEvent.click(horizontalBtn);
    expect(onOrientationChange).toHaveBeenCalledTimes(1);
    expect(onOrientationChange).toHaveBeenLastCalledWith('horizontal');
    expect(horizontalBtn).toHaveAttribute('aria-pressed', 'true');
    expect(verticalBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('wipe-root')).toHaveAttribute('data-orientation', 'horizontal');
    expect(screen.getByTestId('wipe-before-layer')).toHaveStyle({
      clipPath: 'inset(0 0 70% 0)',
    });
    expect(screen.getByTestId('wipe-divider')).toHaveStyle({ top: '30%' });
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 30% · Horizontal');
    expect(
      screen.getByRole('slider', { name: 'Compare split wipe position' })
    ).toHaveAttribute('aria-orientation', 'vertical');

    // Click 50 / 50 quick center button
    fireEvent.click(centerBtn);
    expect(onPositionChange).toHaveBeenLastCalledWith(50);
    expect(screen.getByTestId('wipe-before-layer')).toHaveStyle({
      clipPath: 'inset(0 0 50% 0)',
    });
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 50% · Horizontal');

    // Switch back to Vertical
    fireEvent.click(verticalBtn);
    expect(onOrientationChange).toHaveBeenLastCalledWith('vertical');
    expect(screen.getByTestId('wipe-before-layer')).toHaveStyle({
      clipPath: 'inset(0 50% 0 0)',
    });
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 50% · Vertical');
  });

  it('supports Hold to Compare Original via pointer down/up/cancel and blur while preserving saved split', () => {
    const onHoldCompareChange = vi.fn<(holding: boolean) => void>();
    const onPositionChange = vi.fn<(pct: number) => void>();

    render(
      <WipeCompareOverlay
        defaultPositionPct={35}
        onHoldCompareChange={onHoldCompareChange}
        onPositionChange={onPositionChange}
        data-testid="wipe-root"
      />
    );

    const holdBtn = screen.getByTestId('wipe-hold-compare');
    const stage = screen.getByTestId('wipe-stage');
    const beforeLayer = screen.getByTestId('wipe-before-layer');
    const statusBar = screen.getByTestId('wipe-status-bar');
    mockStageRect(stage, 0, 0, 400, 225);

    // Secondary mouse button ignored
    fireEvent.pointerDown(holdBtn, { button: 2 });
    expect(onHoldCompareChange).not.toHaveBeenCalled();

    // Primary pointer down engages full-frame original bypass
    fireEvent.pointerDown(holdBtn, { button: 0 });
    expect(onHoldCompareChange).toHaveBeenCalledTimes(1);
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(true);
    expect(holdBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('wipe-root')).toHaveAttribute('data-holding-original', 'true');
    expect(screen.getByTestId('wipe-bypass-indicator')).toHaveTextContent('BYPASSED · ORIGINAL');
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 0 0 0)' });
    expect(statusBar).toHaveTextContent('Holding Original Bypass');
    expect(
      screen.getByRole('slider', { name: 'Compare split wipe position' })
    ).toHaveAttribute('aria-valuetext', 'Holding Original Bypass');

    // Stage dragging is suppressed while holding original
    fireEvent.pointerDown(stage, { button: 0, clientX: 300 });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Window pointerup releases and snaps cleanly back to saved 35% split
    fireEvent.pointerUp(window);
    expect(onHoldCompareChange).toHaveBeenCalledTimes(2);
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);
    expect(holdBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByTestId('wipe-bypass-indicator')).toBeNull();
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 65% 0 0)' });
    expect(statusBar).toHaveTextContent('Split: 35% · Vertical');

    // Window pointercancel also releases cleanly
    fireEvent.pointerDown(holdBtn, { button: 0 });
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(true);
    fireEvent.pointerCancel(window);
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 65% 0 0)' });

    // Button pointercancel releases cleanly
    fireEvent.pointerDown(holdBtn, { button: 0 });
    fireEvent.pointerCancel(holdBtn);
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);

    // Button blur releases cleanly (and extra blur when not holding is a no-op)
    fireEvent.pointerDown(holdBtn, { button: 0 });
    fireEvent.blur(holdBtn);
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);
    const callCountAfterBlur = onHoldCompareChange.mock.calls.length;
    fireEvent.blur(holdBtn);
    expect(onHoldCompareChange).toHaveBeenCalledTimes(callCountAfterBlur);
  });

  it('supports Hold to Compare Original via Space, Spacebar, and Enter keys with IME & repeat guards', () => {
    const onHoldCompareChange = vi.fn<(holding: boolean) => void>();

    render(
      <WipeCompareOverlay
        defaultPositionPct={42}
        onHoldCompareChange={onHoldCompareChange}
      />
    );

    const holdBtn = screen.getByTestId('wipe-hold-compare');
    const beforeLayer = screen.getByTestId('wipe-before-layer');

    // IME composition ignored
    fireEvent.keyDown(holdBtn, { key: ' ', isComposing: true });
    expect(onHoldCompareChange).not.toHaveBeenCalled();

    // Unrelated key ignored on keydown & keyup
    fireEvent.keyDown(holdBtn, { key: 'Escape' });
    fireEvent.keyUp(holdBtn, { key: 'Escape' });
    expect(onHoldCompareChange).not.toHaveBeenCalled();

    // Holding Space engages bypass; repeated keydown or concurrent pointerdown does not double-fire
    fireEvent.keyDown(holdBtn, { key: ' ' });
    fireEvent.keyDown(holdBtn, { key: ' ', repeat: true });
    fireEvent.keyDown(holdBtn, { key: 'Enter' });
    expect(onHoldCompareChange).toHaveBeenCalledTimes(1);
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(true);
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 0 0 0)' });
    expect(screen.getByTestId('wipe-bypass-indicator')).toHaveTextContent('BYPASSED · ORIGINAL');

    // IME composing on keyUp is ignored
    fireEvent.keyUp(holdBtn, { key: ' ', isComposing: true });
    expect(onHoldCompareChange).toHaveBeenCalledTimes(1);

    // Releasing Space snaps back cleanly
    fireEvent.keyUp(holdBtn, { key: ' ' });
    expect(onHoldCompareChange).toHaveBeenCalledTimes(2);
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 58% 0 0)' });

    // Legacy Spacebar key
    fireEvent.keyDown(holdBtn, { key: 'Spacebar' });
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyUp(holdBtn, { key: 'Spacebar' });
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);

    // Enter key hold & release
    fireEvent.keyDown(holdBtn, { key: 'Enter' });
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(true);
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 0 0 0)' });
    fireEvent.keyUp(holdBtn, { key: 'Enter' });
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);
    expect(beforeLayer).toHaveStyle({ clipPath: 'inset(0 58% 0 0)' });
  });

  it('handles keyboard slider controls in vertical (±2% / Shift ±10%, Home/End) and horizontal modes with IME guard', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();

    render(
      <WipeCompareOverlay
        defaultPositionPct={50}
        defaultOrientation="vertical"
        onPositionChange={onPositionChange}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Compare split wipe position' });

    // IME composing ignored
    fireEvent.keyDown(slider, { key: 'ArrowRight', isComposing: true });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Vertical mode ignores ArrowUp/ArrowDown and unrelated keys
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Vertical: ArrowRight +2% -> 52%
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onPositionChange).toHaveBeenLastCalledWith(52);
    expect(slider).toHaveAttribute('aria-valuenow', '52');

    // Vertical: Shift+ArrowRight +10% -> 62%
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect(onPositionChange).toHaveBeenLastCalledWith(62);

    // Vertical: ArrowLeft -2% -> 60%
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onPositionChange).toHaveBeenLastCalledWith(60);

    // Vertical: Shift+ArrowLeft -10% -> 50%
    fireEvent.keyDown(slider, { key: 'ArrowLeft', shiftKey: true });
    expect(onPositionChange).toHaveBeenLastCalledWith(50);

    // Home -> 0%, End -> 100%
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onPositionChange).toHaveBeenLastCalledWith(0);
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    fireEvent.keyDown(slider, { key: 'End' });
    expect(onPositionChange).toHaveBeenLastCalledWith(100);
    expect(slider).toHaveAttribute('aria-valuenow', '100');

    // Switch to Horizontal mode and reset to 50%
    fireEvent.click(screen.getByTestId('wipe-orientation-horizontal'));
    fireEvent.click(screen.getByTestId('wipe-center-button'));
    onPositionChange.mockClear();

    // Horizontal mode ignores ArrowLeft/ArrowRight
    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Horizontal: ArrowDown +2% -> 52%
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onPositionChange).toHaveBeenLastCalledWith(52);

    // Horizontal: Shift+ArrowDown +10% -> 62%
    fireEvent.keyDown(slider, { key: 'ArrowDown', shiftKey: true });
    expect(onPositionChange).toHaveBeenLastCalledWith(62);

    // Horizontal: ArrowUp -2% -> 60%
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onPositionChange).toHaveBeenLastCalledWith(60);

    // Horizontal: Shift+ArrowUp -10% -> 50%
    fireEvent.keyDown(slider, { key: 'ArrowUp', shiftKey: true });
    expect(onPositionChange).toHaveBeenLastCalledWith(50);

    // Home & End in Horizontal mode
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onPositionChange).toHaveBeenLastCalledWith(0);
    fireEvent.keyDown(slider, { key: 'End' });
    expect(onPositionChange).toHaveBeenLastCalledWith(100);
  });

  it('supports pointer dragging in both vertical and horizontal modes with clamping and window listener cleanup', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();

    render(<WipeCompareOverlay onPositionChange={onPositionChange} />);

    const stage = screen.getByTestId('wipe-stage');
    const handle = screen.getByTestId('wipe-handle');
    mockStageRect(stage, 100, 50, 400, 200);

    // Non-primary button ignored
    fireEvent.pointerDown(stage, { button: 2, clientX: 200, clientY: 100 });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Vertical drag: clientX 200 -> (200 - 100) / 400 = 25%
    fireEvent.pointerDown(stage, { button: 0, clientX: 200, clientY: 100 });
    expect(stage).toHaveAttribute('data-dragging', 'true');
    expect(onPositionChange).toHaveBeenLastCalledWith(25);

    // Move to 75% (clientX 400)
    fireEvent.pointerMove(window, { clientX: 400, clientY: 100 });
    expect(onPositionChange).toHaveBeenLastCalledWith(75);
    expect(screen.getByTestId('wipe-divider')).toHaveStyle({ left: '75%' });

    // Overshoot past bounds clamps to 100% and 0%
    fireEvent.pointerMove(window, { clientX: 900, clientY: 100 });
    expect(onPositionChange).toHaveBeenLastCalledWith(100);
    fireEvent.pointerMove(window, { clientX: -20, clientY: 100 });
    expect(onPositionChange).toHaveBeenLastCalledWith(0);

    fireEvent.pointerUp(window);
    expect(stage).not.toHaveAttribute('data-dragging');

    // Subsequent window move does nothing after pointerup cleanup
    onPositionChange.mockClear();
    fireEvent.pointerMove(window, { clientX: 300, clientY: 100 });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Switch to horizontal and drag directly from handle
    fireEvent.click(screen.getByTestId('wipe-orientation-horizontal'));
    fireEvent.pointerDown(handle, { button: 0, clientX: 250, clientY: 100 });
    // (100 - 50) / 200 = 25%
    expect(onPositionChange).toHaveBeenLastCalledWith(25);

    fireEvent.pointerMove(window, { clientX: 250, clientY: 200 });
    // (200 - 50) / 200 = 75%
    expect(onPositionChange).toHaveBeenLastCalledWith(75);
    expect(screen.getByTestId('wipe-divider')).toHaveStyle({ top: '75%' });

    fireEvent.pointerCancel(window);
    expect(stage).not.toHaveAttribute('data-dragging');
  });

  it('guards zero-dimension stage geometry and cleans up drag & hold listeners on disable and unmount', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();
    const onHoldCompareChange = vi.fn<(holding: boolean) => void>();

    const { rerender, unmount } = render(
      <WipeCompareOverlay
        onPositionChange={onPositionChange}
        onHoldCompareChange={onHoldCompareChange}
      />
    );

    const stage = screen.getByTestId('wipe-stage');
    const holdBtn = screen.getByTestId('wipe-hold-compare');

    // Zero width in vertical mode
    mockStageRect(stage, 0, 0, 0, 200);
    fireEvent.pointerDown(stage, { button: 0, clientX: 120, clientY: 80 });
    fireEvent.pointerMove(window, { clientX: 200, clientY: 80 });
    expect(onPositionChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(window);

    // Zero height in horizontal mode
    fireEvent.click(screen.getByTestId('wipe-orientation-horizontal'));
    mockStageRect(stage, 0, 0, 400, 0);
    fireEvent.pointerDown(stage, { button: 0, clientX: 120, clientY: 80 });
    fireEvent.pointerMove(window, { clientX: 120, clientY: 140 });
    expect(onPositionChange).not.toHaveBeenCalled();

    // Flipping disabled mid-drag cleans up dragging
    expect(stage).toHaveAttribute('data-dragging', 'true');
    rerender(
      <WipeCompareOverlay
        disabled
        onPositionChange={onPositionChange}
        onHoldCompareChange={onHoldCompareChange}
      />
    );
    expect(stage).not.toHaveAttribute('data-dragging');

    // Re-enable, start Hold Compare, then disable mid-hold -> cleans up and calls onHoldCompareChange(false)
    rerender(
      <WipeCompareOverlay
        disabled={false}
        onPositionChange={onPositionChange}
        onHoldCompareChange={onHoldCompareChange}
      />
    );
    fireEvent.pointerDown(holdBtn, { button: 0 });
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(true);

    rerender(
      <WipeCompareOverlay
        disabled
        onPositionChange={onPositionChange}
        onHoldCompareChange={onHoldCompareChange}
      />
    );
    expect(onHoldCompareChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByTestId('wipe-bypass-indicator')).toBeNull();

    // Re-enable, start drag and hold, then unmount to verify zero leaked listeners
    rerender(
      <WipeCompareOverlay
        disabled={false}
        onPositionChange={onPositionChange}
        onHoldCompareChange={onHoldCompareChange}
      />
    );
    mockStageRect(stage, 0, 0, 400, 200);
    fireEvent.pointerDown(stage, { button: 0, clientX: 100, clientY: 100 });
    onPositionChange.mockClear();
    unmount();

    fireEvent.pointerMove(window, { clientX: 300, clientY: 150 });
    fireEvent.pointerUp(window);
    expect(onPositionChange).not.toHaveBeenCalled();
  });

  it('operates in controlled positionPct & orientation mode and clamps adversarial numeric inputs', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();
    const onOrientationChange = vi.fn<(orientation: WipeOrientation) => void>();

    const { rerender } = render(
      <WipeCompareOverlay
        positionPct={28}
        orientation="vertical"
        onPositionChange={onPositionChange}
        onOrientationChange={onOrientationChange}
      />
    );

    const slider = screen.getByRole('slider', { name: 'Compare split wipe position' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onPositionChange).toHaveBeenLastCalledWith(30);
    // Controlled value stays 28 until parent updates prop
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 28% · Vertical');

    fireEvent.click(screen.getByTestId('wipe-orientation-horizontal'));
    expect(onOrientationChange).toHaveBeenLastCalledWith('horizontal');
    // Controlled orientation stays vertical until parent updates prop
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 28% · Vertical');

    // Adversarial numeric props: NaN -> fallback 50, >100 -> 100, <0 -> 0
    rerender(
      <WipeCompareOverlay
        positionPct={Number.NaN}
        orientation="horizontal"
        onPositionChange={onPositionChange}
        onOrientationChange={onOrientationChange}
      />
    );
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 50% · Horizontal');

    rerender(
      <WipeCompareOverlay
        positionPct={180}
        orientation="vertical"
        onPositionChange={onPositionChange}
        onOrientationChange={onOrientationChange}
      />
    );
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 100% · Vertical');

    rerender(
      <WipeCompareOverlay
        positionPct={-40}
        orientation="vertical"
        onPositionChange={onPositionChange}
        onOrientationChange={onOrientationChange}
      />
    );
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 0% · Vertical');
  });

  it('blocks all interactions when disabled is true', () => {
    const onPositionChange = vi.fn<(pct: number) => void>();
    const onOrientationChange = vi.fn<(orientation: WipeOrientation) => void>();
    const onHoldCompareChange = vi.fn<(holding: boolean) => void>();

    render(
      <WipeCompareOverlay
        disabled
        defaultPositionPct={40}
        onPositionChange={onPositionChange}
        onOrientationChange={onOrientationChange}
        onHoldCompareChange={onHoldCompareChange}
        data-testid="wipe-root"
      />
    );

    const root = screen.getByTestId('wipe-root');
    const stage = screen.getByTestId('wipe-stage');
    const slider = screen.getByRole('slider', { name: 'Compare split wipe position' });
    const holdBtn = screen.getByTestId('wipe-hold-compare');
    const centerBtn = screen.getByTestId('wipe-center-button');
    const verticalBtn = screen.getByTestId('wipe-orientation-vertical');
    const horizontalBtn = screen.getByTestId('wipe-orientation-horizontal');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(slider).toHaveAttribute('tabindex', '-1');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(holdBtn).toBeDisabled();
    expect(centerBtn).toBeDisabled();
    expect(verticalBtn).toBeDisabled();
    expect(horizontalBtn).toBeDisabled();

    mockStageRect(stage, 0, 0, 400, 225);
    fireEvent.pointerDown(stage, { button: 0, clientX: 300, clientY: 100 });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(holdBtn, { key: ' ' });
    fireEvent.pointerDown(holdBtn, { button: 0 });
    fireEvent.click(centerBtn);
    fireEvent.click(horizontalBtn);

    expect(onPositionChange).not.toHaveBeenCalled();
    expect(onOrientationChange).not.toHaveBeenCalled();
    expect(onHoldCompareChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('wipe-status-bar')).toHaveTextContent('Split: 40% · Vertical');
  });
});
