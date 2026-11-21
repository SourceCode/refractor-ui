import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  EASING_PRESETS,
  KeyframeCurveEditor,
  type AnimationKeyframe,
  type CubicBezierTuple,
  type EasingPresetId,
  type EasingPresetMap,
} from './index';

function mockSvgRect(svg: Element, width = 260, height = 220, left = 0, top = 0): void {
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
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

describe('KeyframeCurveEditor', () => {
  it('renders default 3 keyframes, optical tokens, SVG viewBox 260x220, ref, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const presetCheck: EasingPresetMap = {
      linear: true,
      'ease-in': true,
      'ease-out': true,
      'ease-in-out': true,
      overshoot: true,
    };
    expect(Object.keys(presetCheck)).toHaveLength(5);
    expect(EASING_PRESETS).toHaveLength(5);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            KeyframeCurveEditor: {
              className: 'theme-curve-editor',
              style: { maxWidth: '640px' },
            },
          },
        }}
      >
        <KeyframeCurveEditor
          ref={ref}
          className="local-curve-editor"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="curve-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('curve-root');
    expect(ref.current).toBe(root);
    expect(KeyframeCurveEditor.displayName).toBe('KeyframeCurveEditor');
    expect(root).toHaveClass(
      'refractor-keyframe-curve-editor',
      'prism-slab',
      'theme-curve-editor',
      'local-curve-editor'
    );
    expect(root).toHaveStyle({ maxWidth: '640px', marginTop: '6px' });
    expect(root).toHaveAttribute('data-preset', 'ease-in-out');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-empty');

    expect(screen.getByTestId('keyframe-property-name')).toHaveTextContent('Opacity');
    expect(screen.getByTestId('keyframe-bezier-badge')).toHaveTextContent(
      'cubic-bezier(0.42, 0.00, 0.58, 1.00)'
    );

    // Default 3 keyframes at 0%, 50%, 100%
    const kfStart = screen.getByTestId('keyframe-marker-kf-start');
    const kfMid = screen.getByTestId('keyframe-marker-kf-mid');
    const kfEnd = screen.getByTestId('keyframe-marker-kf-end');
    expect(kfStart).toHaveAttribute('role', 'button');
    expect(kfStart).toHaveAttribute('aria-pressed', 'true');
    expect(kfStart).toHaveAttribute('data-time-pct', '0');
    expect(kfMid).toHaveAttribute('aria-pressed', 'false');
    expect(kfMid).toHaveAttribute('data-time-pct', '50');
    expect(kfEnd).toHaveAttribute('aria-pressed', 'false');
    expect(kfEnd).toHaveAttribute('data-time-pct', '100');

    // Rotated diamond visuals
    expect(screen.getByTestId('keyframe-diamond-kf-start')).toHaveClass('rotate-45');

    // SVG graph & tokens
    const svg = screen.getByTestId('keyframe-curve-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 260 220');
    expect(svg.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(svg.innerHTML).not.toContain('NaN');
    expect(screen.getAllByTestId('keyframe-curve-gridline')).toHaveLength(5);
    expect(screen.getByTestId('keyframe-curve-linear-ref')).toBeInTheDocument();

    const curvePath = screen.getByTestId('keyframe-curve-path');
    expect(curvePath).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(curvePath.getAttribute('d')).toBe('M 38,156 C 122,156 154,60 238,60');

    expect(screen.getByTestId('keyframe-tangent-p1')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('keyframe-tangent-p2')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
  });

  it('selects diamond keyframes and nudges timePct by 5% via keyboard ArrowLeft/ArrowRight/Home/End/Delete', () => {
    const onKeyframesChange = vi.fn<(keyframes: AnimationKeyframe[]) => void>();
    render(<KeyframeCurveEditor onKeyframesChange={onKeyframesChange} />);

    const kfMid = screen.getByTestId('keyframe-marker-kf-mid');
    fireEvent.click(kfMid);
    expect(kfMid).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('keyframe-bezier-badge')).toHaveTextContent(
      'cubic-bezier(0.00, 0.00, 0.58, 1.00)'
    );

    // ArrowRight nudges 50 -> 55
    fireEvent.keyDown(kfMid, { key: 'ArrowRight' });
    expect(kfMid).toHaveAttribute('data-time-pct', '55');
    expect(onKeyframesChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'kf-mid', timePct: 55 })])
    );

    // ArrowLeft nudges 55 -> 50
    fireEvent.keyDown(kfMid, { key: 'ArrowLeft' });
    expect(kfMid).toHaveAttribute('data-time-pct', '50');

    // Home jumps to 0, End jumps to 100
    fireEvent.keyDown(kfMid, { key: 'Home' });
    expect(kfMid).toHaveAttribute('data-time-pct', '0');

    // ArrowLeft at 0% clamps without emitting redundant callback
    const callsAtZero = onKeyframesChange.mock.calls.length;
    fireEvent.keyDown(kfMid, { key: 'ArrowLeft' });
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsAtZero);

    fireEvent.keyDown(kfMid, { key: 'End' });
    expect(kfMid).toHaveAttribute('data-time-pct', '100');

    // ArrowRight at 100% clamps without emitting redundant callback
    const callsAtHundred = onKeyframesChange.mock.calls.length;
    fireEvent.keyDown(kfMid, { key: 'ArrowRight' });
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsAtHundred);

    // Unrelated key and IME composing event are safely ignored
    fireEvent.keyDown(kfMid, { key: 'Escape' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    kfMid.dispatchEvent(imeEvent);
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsAtHundred);

    // Delete key removes the keyframe
    fireEvent.keyDown(kfMid, { key: 'Delete' });
    expect(screen.queryByTestId('keyframe-marker-kf-mid')).not.toBeInTheDocument();

    // Backspace removes next keyframe down to 1 remaining
    const kfEnd = screen.getByTestId('keyframe-marker-kf-end');
    fireEvent.keyDown(kfEnd, { key: 'Backspace' });
    expect(screen.queryByTestId('keyframe-marker-kf-end')).not.toBeInTheDocument();

    // Backspace on last remaining keyframe is guarded (cannot delete last keyframe)
    const callsAtOne = onKeyframesChange.mock.calls.length;
    const kfStart = screen.getByTestId('keyframe-marker-kf-start');
    fireEvent.keyDown(kfStart, { key: 'Backspace' });
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsAtOne);
    expect(screen.getByTestId('keyframe-delete-button')).toBeDisabled();
  });

  it('adds and deletes keyframes across midpoint, largest-gap, single-keyframe, and empty-state flows', () => {
    const onKeyframesChange = vi.fn<(keyframes: AnimationKeyframe[]) => void>();

    // Seed with colliding ID 'kf-1' to verify unique ID collision avoidance
    const { rerender } = render(
      <KeyframeCurveEditor
        defaultKeyframes={[
          { id: 'kf-1', timePct: 0, value: 10, easing: [0, 0, 1, 1] },
          { id: 'kf-2', timePct: 100, value: 90, easing: [0, 0, 1, 1] },
        ]}
        onKeyframesChange={onKeyframesChange}
      />
    );

    // Selected is kf-1 (0%), next is kf-2 (100%) -> inserts at midpoint 50%, value 50, skipping existing kf-1/kf-2 IDs
    fireEvent.click(screen.getByTestId('keyframe-add-button'));
    expect(screen.getByTestId('keyframe-marker-kf-3')).toHaveAttribute('data-time-pct', '50');
    expect(screen.getByTestId('keyframe-marker-kf-3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('keyframe-selected-summary')).toHaveTextContent('50% · 50%');

    // Select last keyframe (100%) -> fallback to largest adjacent gap (0..50 -> 25%)
    fireEvent.click(screen.getByTestId('keyframe-marker-kf-2'));
    fireEvent.click(screen.getByTestId('keyframe-add-button'));
    expect(screen.getByTestId('keyframe-marker-kf-4')).toHaveAttribute('data-time-pct', '25');

    // Delete via header button
    fireEvent.click(screen.getByTestId('keyframe-delete-button'));
    expect(screen.queryByTestId('keyframe-marker-kf-4')).not.toBeInTheDocument();

    // Uncontrolled empty state -> clicking Add Keyframe inserts at 0%
    rerender(
      <KeyframeCurveEditor
        key="empty-seed"
        keyframes={[]}
        propertyName="Scale"
        unit=""
        onKeyframesChange={onKeyframesChange}
        data-testid="empty-root"
      />
    );
    expect(screen.getByTestId('empty-root')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('keyframe-empty')).toHaveTextContent('No keyframes configured for Scale');
    expect(screen.getByTestId('keyframe-bezier-badge')).toHaveTextContent('No keyframes');
    expect(screen.getByTestId('keyframe-delete-button')).toBeDisabled();

    fireEvent.click(screen.getByTestId('keyframe-add-button'));
    expect(onKeyframesChange).toHaveBeenLastCalledWith([
      expect.objectContaining({ timePct: 0, value: 0 }),
    ]);

    // Single keyframe < 50% inserts at 100%
    rerender(
      <KeyframeCurveEditor
        keyframes={[{ id: 'solo-low', timePct: 20, value: 42, easing: [0, 0, 1, 1] }]}
        onKeyframesChange={onKeyframesChange}
      />
    );
    fireEvent.click(screen.getByTestId('keyframe-add-button'));
    expect(onKeyframesChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ timePct: 100, value: 42 })])
    );

    // Single keyframe >= 50% inserts at 0%
    rerender(
      <KeyframeCurveEditor
        keyframes={[{ id: 'solo-high', timePct: 80, value: 75, easing: [0, 0, 1, 1] }]}
        onKeyframesChange={onKeyframesChange}
      />
    );
    fireEvent.click(screen.getByTestId('keyframe-add-button'));
    expect(onKeyframesChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ timePct: 0, value: 75 })])
    );

    // Adjacent gap < 2% on selected keyframe falls back to largest gap
    rerender(
      <KeyframeCurveEditor
        keyframes={[
          { id: 'tight-a', timePct: 0, value: 0, easing: [0, 0, 1, 1] },
          { id: 'tight-b', timePct: 1, value: 10, easing: [0, 0, 1, 1] },
          { id: 'tight-c', timePct: 100, value: 100, easing: [0, 0, 1, 1] },
        ]}
        onKeyframesChange={onKeyframesChange}
      />
    );
    fireEvent.click(screen.getByTestId('keyframe-marker-tight-a'));
    fireEvent.click(screen.getByTestId('keyframe-add-button'));
    expect(onKeyframesChange).toHaveBeenLastCalledWith(
      expect.arrayContaining([expect.objectContaining({ timePct: 50.5, value: 55 })])
    );
  });

  it('applies all 5 one-click easing presets and updates badge, aria-pressed, and SVG curve', () => {
    const onKeyframesChange = vi.fn<(keyframes: AnimationKeyframe[]) => void>();
    render(<KeyframeCurveEditor onKeyframesChange={onKeyframesChange} data-testid="preset-root" />);

    const expectedTuples: ReadonlyArray<{ id: EasingPresetId; css: string; tuple: CubicBezierTuple }> = [
      { id: 'linear', css: 'cubic-bezier(0.00, 0.00, 1.00, 1.00)', tuple: [0, 0, 1, 1] },
      { id: 'ease-in', css: 'cubic-bezier(0.42, 0.00, 1.00, 1.00)', tuple: [0.42, 0, 1, 1] },
      { id: 'ease-out', css: 'cubic-bezier(0.00, 0.00, 0.58, 1.00)', tuple: [0, 0, 0.58, 1] },
      { id: 'overshoot', css: 'cubic-bezier(0.34, 1.50, 0.64, 1.00)', tuple: [0.34, 1.5, 0.64, 1] },
      { id: 'ease-in-out', css: 'cubic-bezier(0.42, 0.00, 0.58, 1.00)', tuple: [0.42, 0, 0.58, 1] },
    ];

    for (const preset of expectedTuples) {
      const btn = screen.getByTestId(`keyframe-preset-${preset.id}`);
      fireEvent.click(btn);
      expect(btn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('preset-root')).toHaveAttribute('data-preset', preset.id);
      expect(screen.getByTestId('keyframe-bezier-badge')).toHaveTextContent(preset.css);
      expect(onKeyframesChange).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ id: 'kf-start', easing: preset.tuple }),
        ])
      );
    }

    // Re-clicking already-active preset is a clean no-op
    const countBefore = onKeyframesChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('keyframe-preset-ease-in-out'));
    expect(onKeyframesChange).toHaveBeenCalledTimes(countBefore);
  });

  it('nudges P1 and P2 handles via keyboard ArrowLeft/Right/Up/Down in 0.05 steps with strict clamping and IME safety', () => {
    const onKeyframesChange = vi.fn<(keyframes: AnimationKeyframe[]) => void>();
    render(
      <KeyframeCurveEditor
        defaultKeyframes={[
          { id: 'k1', timePct: 0, value: 0, easing: [0.5, 0.5, 0.5, 0.5] },
          { id: 'k2', timePct: 100, value: 100, easing: [0, 0, 1, 1] },
        ]}
        onKeyframesChange={onKeyframesChange}
        data-testid="kb-root"
      />
    );

    const p1 = screen.getByTestId('keyframe-handle-p1');
    const p2 = screen.getByTestId('keyframe-handle-p2');

    expect(p1).toHaveAttribute('role', 'slider');
    expect(p2).toHaveAttribute('role', 'slider');

    // P1: Right (+0.05 x), Left (-0.05 x), Up (+0.05 y), Down (-0.05 y)
    fireEvent.keyDown(p1, { key: 'ArrowRight' });
    expect(screen.getByTestId('keyframe-p1-coords')).toHaveTextContent('(0.55, 0.50)');
    expect(screen.getByTestId('keyframe-preset-label')).toHaveTextContent('Custom');
    expect(screen.getByTestId('kb-root')).toHaveAttribute('data-preset', 'custom');

    fireEvent.keyDown(p1, { key: 'ArrowUp' });
    expect(screen.getByTestId('keyframe-p1-coords')).toHaveTextContent('(0.55, 0.55)');

    fireEvent.keyDown(p1, { key: 'ArrowLeft' });
    expect(screen.getByTestId('keyframe-p1-coords')).toHaveTextContent('(0.50, 0.55)');

    fireEvent.keyDown(p1, { key: 'ArrowDown' });
    expect(screen.getByTestId('keyframe-p1-coords')).toHaveTextContent('(0.50, 0.50)');

    // P2: Left, Right, Up, Down
    fireEvent.keyDown(p2, { key: 'ArrowLeft' });
    expect(screen.getByTestId('keyframe-p2-coords')).toHaveTextContent('(0.45, 0.50)');

    fireEvent.keyDown(p2, { key: 'ArrowDown' });
    expect(screen.getByTestId('keyframe-p2-coords')).toHaveTextContent('(0.45, 0.45)');

    fireEvent.keyDown(p2, { key: 'ArrowRight' });
    expect(screen.getByTestId('keyframe-p2-coords')).toHaveTextContent('(0.50, 0.45)');

    fireEvent.keyDown(p2, { key: 'ArrowUp' });
    expect(screen.getByTestId('keyframe-p2-coords')).toHaveTextContent('(0.50, 0.50)');

    // Unrelated key & IME composing event ignored
    const callsBefore = onKeyframesChange.mock.calls.length;
    fireEvent.keyDown(p1, { key: 'Escape' });
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    p1.dispatchEvent(imeEvent);
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsBefore);
  });

  it('supports pointer dragging on P1 and P2 with coordinate clamping and window listener cleanup on end and unmount', () => {
    const onKeyframesChange = vi.fn<(keyframes: AnimationKeyframe[]) => void>();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(
      <KeyframeCurveEditor onKeyframesChange={onKeyframesChange} data-testid="drag-root" />
    );

    const svg = screen.getByTestId('keyframe-curve-svg');
    const p1 = screen.getByTestId('keyframe-handle-p1');
    const p2 = screen.getByTestId('keyframe-handle-p2');

    // Zero-sized rect aborts drag safely
    mockSvgRect(svg, 0, 0);
    fireEvent.pointerDown(p1, { button: 0, pointerId: 1 });
    expect(p1).not.toHaveAttribute('data-dragging');

    // Valid rect (exact 1:1 with viewBox 260x220: PLOT_X0=38, PLOT_WIDTH=200, PLOT_Y_BOTTOM=156, PLOT_HEIGHT=96)
    mockSvgRect(svg, 260, 220, 0, 0);

    // Secondary button is ignored
    fireEvent.pointerDown(p1, { button: 2, pointerId: 1 });
    expect(p1).not.toHaveAttribute('data-dragging');

    // Start dragging P1 with pointerId=7
    fireEvent.pointerDown(p1, { button: 0, pointerId: 7 });
    expect(p1).toHaveAttribute('data-dragging', 'true');
    expect(screen.getByTestId('drag-root')).toHaveAttribute('data-dragging', 'true');

    // Mismatched pointerId move & up are ignored
    fireEvent.pointerMove(window, { clientX: 138, clientY: 108, pointerId: 99 });
    fireEvent.pointerUp(window, { pointerId: 99 });
    expect(p1).toHaveAttribute('data-dragging', 'true');

    // Move P1 to exact center (x=0.50 -> svgX=138, y=0.50 -> svgY=108)
    fireEvent.pointerMove(window, { clientX: 138, clientY: 108, pointerId: 7 });
    expect(screen.getByTestId('keyframe-p1-coords')).toHaveTextContent('(0.50, 0.50)');

    // Duplicate move at same coordinate does not re-emit
    const callsAfterCenter = onKeyframesChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 138, clientY: 108, pointerId: 7 });
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsAfterCenter);

    // Extreme overshoot clamps x to 0..1 and y to -0.5..1.5
    fireEvent.pointerMove(window, { clientX: -100, clientY: -200, pointerId: 7 });
    expect(screen.getByTestId('keyframe-p1-coords')).toHaveTextContent('(0.00, 1.50)');

    // Finish P1 drag via pointerup -> listeners removed
    fireEvent.pointerUp(window, { pointerId: 7 });
    expect(p1).not.toHaveAttribute('data-dragging');

    // Drag P2 to extreme lower-right -> clamps to (1.00, -0.50), then cancel via pointercancel
    fireEvent.pointerDown(p2, { button: 0, pointerId: 8 });
    expect(p2).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerMove(window, { clientX: 999, clientY: 999, pointerId: 8 });
    expect(screen.getByTestId('keyframe-p2-coords')).toHaveTextContent('(1.00, -0.50)');
    fireEvent.pointerCancel(window, { pointerId: 8 });
    expect(p2).not.toHaveAttribute('data-dragging');

    // Zero-size rect mid-drag is safely ignored
    fireEvent.pointerDown(p1, { button: 0, pointerId: 11 });
    mockSvgRect(svg, 0, 0);
    const callsBeforeZeroMove = onKeyframesChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 100, clientY: 100, pointerId: 11 });
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsBeforeZeroMove);

    // Unmount mid-drag cleanly removes all attached window listeners
    unmount();

    const addedPointer = addSpy.mock.calls.filter(([type]) =>
      ['pointermove', 'pointerup', 'pointercancel'].includes(String(type))
    ).length;
    const removedPointer = removeSpy.mock.calls.filter(([type]) =>
      ['pointermove', 'pointerup', 'pointercancel'].includes(String(type))
    ).length;
    expect(addedPointer).toBeGreaterThan(0);
    expect(removedPointer).toBe(addedPointer);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('respects controlled mode, fallback selection on keyframe removal, and disabled guards mid-drag', () => {
    const onKeyframesChange = vi.fn<(keyframes: AnimationKeyframe[]) => void>();
    const controlled: AnimationKeyframe[] = [
      { id: 'c1', timePct: 0, value: 0, easing: [0, 0, 1, 1] },
      { id: 'c2', timePct: 100, value: 100, easing: [0.42, 0, 0.58, 1] },
    ];

    const { rerender } = render(
      <KeyframeCurveEditor
        keyframes={controlled}
        onKeyframesChange={onKeyframesChange}
        data-testid="ctrl-root"
      />
    );

    // Select c2, then parent removes c2 -> falls back cleanly to c1
    fireEvent.click(screen.getByTestId('keyframe-marker-c2'));
    expect(screen.getByTestId('keyframe-marker-c2')).toHaveAttribute('aria-pressed', 'true');

    // In controlled mode, clicking preset invokes callback without mutating rendered badge until parent re-renders
    fireEvent.click(screen.getByTestId('keyframe-preset-overshoot'));
    expect(onKeyframesChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'c2', easing: [0.34, 1.5, 0.64, 1] }),
      ])
    );
    expect(screen.getByTestId('keyframe-bezier-badge')).toHaveTextContent(
      'cubic-bezier(0.42, 0.00, 0.58, 1.00)'
    );

    // Start dragging P1, then flip disabled=true mid-drag -> drag cancels cleanly
    const svg = screen.getByTestId('keyframe-curve-svg');
    mockSvgRect(svg, 260, 220, 0, 0);
    const p1 = screen.getByTestId('keyframe-handle-p1');
    fireEvent.pointerDown(p1, { button: 0, pointerId: 3 });
    expect(p1).toHaveAttribute('data-dragging', 'true');

    rerender(
      <KeyframeCurveEditor
        keyframes={[controlled[0]!]}
        disabled
        onKeyframesChange={onKeyframesChange}
        data-testid="ctrl-root"
      />
    );

    expect(screen.getByTestId('ctrl-root')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('keyframe-marker-c1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('keyframe-handle-p1')).not.toHaveAttribute('data-dragging');
    expect(screen.getByTestId('keyframe-handle-p1')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('keyframe-handle-p1')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('keyframe-handle-p2')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByTestId('keyframe-add-button')).toBeDisabled();
    expect(screen.getByTestId('keyframe-delete-button')).toBeDisabled();

    // All interactions when disabled are strictly ignored
    const callsWhileDisabled = onKeyframesChange.mock.calls.length;
    fireEvent.pointerDown(screen.getByTestId('keyframe-handle-p1'), { button: 0, pointerId: 4 });
    fireEvent.keyDown(screen.getByTestId('keyframe-handle-p1'), { key: 'ArrowRight' });
    fireEvent.keyDown(screen.getByTestId('keyframe-marker-c1'), { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('keyframe-add-button'));
    fireEvent.click(screen.getByTestId('keyframe-preset-linear'));
    expect(onKeyframesChange).toHaveBeenCalledTimes(callsWhileDisabled);
  });

  it('sanitizes NaN/Infinity, out-of-range tuples, unsorted inputs, duplicate/blank IDs, and XSS payloads', () => {
    const xssProp = '<script>window.__curveXss=1</script><img src=x onerror=alert(1)>';
    const adversarialKeyframes: AnimationKeyframe[] = [
      {
        id: 'dup',
        timePct: 180,
        value: Number.POSITIVE_INFINITY,
        easing: [Number.NaN, 9.9, -4, Number.NEGATIVE_INFINITY],
      },
      {
        id: 'dup',
        timePct: -25,
        value: Number.NaN,
        easing: [5, -9, 0.5, 0.5],
      },
      {
        id: '   ',
        timePct: Number.NaN,
        value: -0,
        easing: [-0, 0, 1, 1],
      },
    ];

    render(
      <KeyframeCurveEditor
        propertyName={xssProp}
        unit="  "
        defaultKeyframes={adversarialKeyframes}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssProp })).toBeInTheDocument();

    const svg = screen.getByTestId('keyframe-curve-svg');
    expect(svg.innerHTML).not.toContain('NaN');
    expect(svg.innerHTML).not.toContain('Infinity');

    // Duplicate IDs & blank IDs deduplicated and sorted by clamped timePct
    expect(screen.getByTestId('keyframe-marker-dup-2')).toHaveAttribute('data-time-pct', '0');
    expect(screen.getByTestId('keyframe-marker-kf-3')).toHaveAttribute('data-time-pct', '0');
    expect(screen.getByTestId('keyframe-marker-dup')).toHaveAttribute('data-time-pct', '100');

    // Out-of-bounds easing on selected dup-2 clamped to [1, -0.5, 0.5, 0.5]
    expect(screen.getByTestId('keyframe-bezier-badge')).toHaveTextContent(
      'cubic-bezier(1.00, -0.50, 0.50, 0.50)'
    );

    // Select dup (100%): NaN/Infinity easing sanitized with fallbacks & clamping -> [0.42, 1.5, 0, 1]
    fireEvent.click(screen.getByTestId('keyframe-marker-dup'));
    expect(screen.getByTestId('keyframe-bezier-badge')).toHaveTextContent(
      'cubic-bezier(0.42, 1.50, 0.00, 1.00)'
    );
  });
});
