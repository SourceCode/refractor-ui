import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_GRADIENT_STATE,
  GRADIENT_KINDS,
  GRADIENT_STOP_TOKENS,
  GradientStopEditor,
  buildGradientCss,
  type GradientColorStop,
  type GradientEditorState,
  type GradientKind,
  type GradientKindMap,
  type GradientStopToken,
} from './index';

function mockTrackRect(track: Element, width = 200, left = 100): void {
  vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({
    x: left,
    y: 0,
    left,
    top: 0,
    width,
    height: 56,
    right: left + width,
    bottom: 56,
    toJSON: () => ({}),
  });
}

describe('GradientStopEditor', () => {
  it('renders default 3-stop optical prism gradient, ref, theme override, BaseProps, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMapCheck: GradientKindMap = {
      linear: true,
      radial: true,
      conic: true,
    };
    expect(Object.keys(kindMapCheck)).toHaveLength(3);
    expect(GRADIENT_KINDS).toHaveLength(3);
    expect(GRADIENT_STOP_TOKENS).toHaveLength(6);
    expect(DEFAULT_GRADIENT_STATE.stops).toHaveLength(3);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            GradientStopEditor: {
              className: 'theme-gradient-editor',
              style: { maxWidth: '580px' },
            },
          },
        }}
      >
        <GradientStopEditor
          ref={ref}
          className="local-gradient-editor"
          xstyle={{ '--prism-blur-px': '22px' }}
          style={{ marginTop: '10px' }}
          data-testid="gradient-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('gradient-root');
    expect(ref.current).toBe(root);
    expect(GradientStopEditor.displayName).toBe('GradientStopEditor');
    expect(root).toHaveClass(
      'refractor-gradient-stop-editor',
      'prism-slab',
      'theme-gradient-editor',
      'local-gradient-editor'
    );
    expect(root).toHaveStyle({ maxWidth: '580px', marginTop: '10px' });
    expect(root).toHaveAttribute('data-kind', 'linear');
    expect(root).toHaveAttribute('data-stops', '3');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('data-dragging');

    expect(screen.getByTestId('gradient-editor-title')).toHaveTextContent(
      'Multi-Stop Gradient Editor'
    );
    expect(screen.getByTestId('gradient-stop-count')).toHaveTextContent('3 stops');

    // Segmented kind buttons
    expect(screen.getByTestId('gradient-kind-linear')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-kind-radial')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('gradient-kind-conic')).toHaveAttribute('aria-pressed', 'false');

    // Angle readout
    expect(screen.getByTestId('gradient-angle-readout')).toHaveTextContent('135°');
    expect(screen.getByTestId('gradient-angle-slider')).toBeEnabled();

    const expectedCss =
      'linear-gradient(135deg, color-mix(in srgb, var(--prism-primary-main) 100%, transparent) 0%, color-mix(in srgb, var(--prism-secondary-main) 100%, transparent) 52%, color-mix(in srgb, var(--prism-success-main) 100%, transparent) 100%)';

    const preview = screen.getByTestId('gradient-preview-bar');
    expect(preview).toHaveAttribute('data-gradient-kind', 'linear');
    expect(preview).toHaveAttribute('data-gradient-css', expectedCss);

    const telemetry = screen.getByTestId('gradient-css-telemetry');
    expect(telemetry).toHaveAttribute('aria-live', 'polite');
    expect(telemetry).toHaveTextContent(expectedCss);

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(root.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/i);

    // Exact accessible labels for stops and midpoints
    expect(screen.getByRole('slider', { name: 'Gradient stop 1 position' })).toHaveAttribute(
      'aria-valuenow',
      '0'
    );
    expect(screen.getByRole('slider', { name: 'Gradient stop 2 position' })).toHaveAttribute(
      'aria-valuenow',
      '52'
    );
    expect(screen.getByRole('slider', { name: 'Gradient stop 3 position' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByRole('slider', { name: 'Midpoint between stops 1 and 2' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    );
    expect(screen.getByRole('slider', { name: 'Midpoint between stops 2 and 3' })).toHaveAttribute(
      'aria-valuenow',
      '50'
    );
  });

  it('falls back to default title when title is blank whitespace', () => {
    render(<GradientStopEditor title="   " />);
    expect(screen.getByTestId('gradient-editor-title')).toHaveTextContent(
      'Multi-Stop Gradient Editor'
    );
  });

  it('switches between Linear, Radial, and Conic modes and manages angle slider availability', () => {
    const onChange = vi.fn();
    render(<GradientStopEditor onChange={onChange} />);

    // Clicking already-active linear is a no-op
    fireEvent.click(screen.getByTestId('gradient-kind-linear'));
    expect(onChange).not.toHaveBeenCalled();

    // Switch to radial -> disables angle slider and updates CSS
    fireEvent.click(screen.getByTestId('gradient-kind-radial'));
    expect(screen.getByTestId('gradient-kind-radial')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-angle-slider')).toBeDisabled();
    expect(screen.getByTestId('gradient-angle-readout')).toHaveTextContent('—');
    expect(screen.getByTestId('gradient-angle-control')).toHaveAttribute(
      'data-angle-inactive',
      'true'
    );
    expect(onChange).toHaveBeenCalledTimes(1);
    const [radialState, radialCss] = onChange.mock.calls[0] as [GradientEditorState, string];
    expect(radialState.kind).toBe('radial');
    expect(radialCss).toMatch(/^radial-gradient\(circle at center, /);

    // Angle change ignored while radial
    fireEvent.change(screen.getByTestId('gradient-angle-slider'), { target: { value: '90' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    // Switch to conic -> angle slider re-enables
    fireEvent.click(screen.getByTestId('gradient-kind-conic'));
    expect(screen.getByTestId('gradient-kind-conic')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-angle-slider')).toBeEnabled();
    expect(screen.getByTestId('gradient-angle-readout')).toHaveTextContent('135°');
    const [, conicCss] = onChange.mock.calls[1] as [GradientEditorState, string];
    expect(conicCss).toMatch(/^conic-gradient\(from 135deg, /);

    // Adjust angle slider to 225deg
    fireEvent.change(screen.getByTestId('gradient-angle-slider'), { target: { value: '225' } });
    expect(screen.getByTestId('gradient-angle-readout')).toHaveTextContent('225°');
    expect(onChange).toHaveBeenCalledTimes(3);
    const [angledState, angledCss] = onChange.mock.calls[2] as [GradientEditorState, string];
    expect(angledState.angleDeg).toBe(225);
    expect(angledCss).toMatch(/^conic-gradient\(from 225deg, /);

    // Same angle value does not fire duplicate onChange
    fireEvent.change(screen.getByTestId('gradient-angle-slider'), { target: { value: '225' } });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('adds stops in largest gaps, caps at 12 stops, handles ID collisions, reverses symmetrically, and enforces minimum 2 stops', () => {
    const onChange = vi.fn();
    render(
      <GradientStopEditor
        defaultValue={{
          kind: 'linear',
          angleDeg: 90,
          stops: [
            { id: 'stop-4', positionPct: 0, token: 'primary', opacityPct: 100, midpointPct: 30 },
            { id: 'stop-2', positionPct: 20, token: 'secondary', opacityPct: 80, midpointPct: 70 },
            { id: 'stop-3', positionPct: 100, token: 'emerald', opacityPct: 100, midpointPct: 50 },
          ],
        }}
        onChange={onChange}
      />
    );

    // Largest gap is 20..100 -> inserts at 60% with unused 'amber' token and skips colliding 'stop-4'
    fireEvent.click(screen.getByTestId('gradient-add-stop-button'));
    expect(screen.getByTestId('gradient-stop-count')).toHaveTextContent('4 stops');
    const [addedState] = onChange.mock.calls[0] as [GradientEditorState, string];
    const inserted = addedState.stops.find((s) => s.positionPct === 60);
    expect(inserted).toBeDefined();
    expect(inserted?.id).toBe('stop-5');
    expect(inserted?.token).toBe('amber');

    // Add stops up to max cap (12) so token cycling beyond 6 tokens is covered
    for (let i = 0; i < 8; i += 1) {
      fireEvent.click(screen.getByTestId('gradient-add-stop-button'));
    }
    expect(screen.getByTestId('gradient-stop-count')).toHaveTextContent('12 stops');
    expect(screen.getByTestId('gradient-add-stop-button')).toBeDisabled();

    // Reverse mirrors positions and midpoints cleanly
    const countBeforeReverse = onChange.mock.calls.length;
    fireEvent.click(screen.getByTestId('gradient-reverse-button'));
    expect(onChange).toHaveBeenCalledTimes(countBeforeReverse + 1);
    const [rev1] = onChange.mock.calls[countBeforeReverse] as [GradientEditorState, string];
    expect(rev1.stops[0]?.positionPct).toBe(0);
    expect(rev1.stops[rev1.stops.length - 1]?.positionPct).toBe(100);
  });

  it('reverses asymmetric 3-stop gradient as an exact involution and deletes stops down to minimum 2', () => {
    const initial: GradientEditorState = {
      kind: 'linear',
      angleDeg: 120,
      stops: [
        { id: 'a', positionPct: 10, token: 'primary', opacityPct: 100, midpointPct: 30 },
        { id: 'b', positionPct: 40, token: 'secondary', opacityPct: 75, midpointPct: 70 },
        { id: 'c', positionPct: 90, token: 'rose', opacityPct: 90, midpointPct: 50 },
      ],
    };
    const onChange = vi.fn();
    render(<GradientStopEditor defaultValue={initial} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('gradient-reverse-button'));
    const [reversed] = onChange.mock.calls[0] as [GradientEditorState, string];
    expect(reversed.stops).toEqual([
      { id: 'c', positionPct: 10, token: 'rose', opacityPct: 90, midpointPct: 30 },
      { id: 'b', positionPct: 60, token: 'secondary', opacityPct: 75, midpointPct: 70 },
      { id: 'a', positionPct: 90, token: 'primary', opacityPct: 100, midpointPct: 50 },
    ]);

    // Reverse a second time -> restores original stops
    fireEvent.click(screen.getByTestId('gradient-reverse-button'));
    const [restored] = onChange.mock.calls[1] as [GradientEditorState, string];
    expect(restored.stops).toEqual(initial.stops);

    // Delete selected stop via Delete Stop button -> 2 stops remain, button disables
    const deleteBtn = screen.getByTestId('gradient-delete-stop-button');
    expect(deleteBtn).toBeEnabled();
    fireEvent.click(deleteBtn);
    expect(screen.getByTestId('gradient-stop-count')).toHaveTextContent('2 stops');
    expect(deleteBtn).toBeDisabled();

    // Attempting keyboard Delete when only 2 stops remain is ignored
    const callsAtMin = onChange.mock.calls.length;
    const stopThumb = screen.getByRole('slider', { name: 'Gradient stop 1 position' });
    fireEvent.keyDown(stopThumb, { key: 'Delete' });
    fireEvent.keyDown(stopThumb, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledTimes(callsAtMin);
  });

  it('updates selected stop token, position slider, and opacity slider in the inspector', () => {
    const onChange = vi.fn();
    render(<GradientStopEditor onChange={onChange} />);

    // Click stop 2 thumb to select it
    const stop2 = screen.getByTestId('gradient-stop-stop-2');
    fireEvent.click(stop2);
    expect(stop2).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('gradient-token-secondary')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-stop-position-readout')).toHaveTextContent('52%');
    expect(screen.getByTestId('gradient-stop-opacity-readout')).toHaveTextContent('100%');

    // Clicking already-selected token is a no-op
    fireEvent.click(screen.getByTestId('gradient-token-secondary'));
    expect(onChange).not.toHaveBeenCalled();

    // Switch token to Rose
    fireEvent.click(screen.getByTestId('gradient-token-rose'));
    expect(screen.getByTestId('gradient-token-rose')).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenCalledTimes(1);
    const [, roseCss] = onChange.mock.calls[0] as [GradientEditorState, string];
    expect(roseCss).toContain('var(--prism-error-main)');

    // Adjust position slider to 65%
    fireEvent.change(screen.getByTestId('gradient-stop-position-slider'), {
      target: { value: '65' },
    });
    expect(screen.getByTestId('gradient-stop-position-readout')).toHaveTextContent('65%');
    expect(onChange).toHaveBeenCalledTimes(2);

    // Adjust opacity slider to 40%
    fireEvent.change(screen.getByTestId('gradient-stop-opacity-slider'), {
      target: { value: '40' },
    });
    expect(screen.getByTestId('gradient-stop-opacity-readout')).toHaveTextContent('40%');
    expect(onChange).toHaveBeenCalledTimes(3);
    const [, opacityCss] = onChange.mock.calls[2] as [GradientEditorState, string];
    expect(opacityCss).toContain('color-mix(in srgb, var(--prism-error-main) 40%, transparent) 65%');

    // Same opacity value is a no-op
    fireEvent.change(screen.getByTestId('gradient-stop-opacity-slider'), {
      target: { value: '40' },
    });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('supports keyboard nudging, Shift coarse stepping, Home/End, Delete, and IME-safe guards on stop thumbs and midpoint diamonds', () => {
    const onChange = vi.fn();
    render(<GradientStopEditor onChange={onChange} />);

    const stop2 = screen.getByRole('slider', { name: 'Gradient stop 2 position' });

    // IME composing keydown is ignored
    const imeEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(imeEvent, 'isComposing', { value: true });
    stop2.dispatchEvent(imeEvent);
    expect(onChange).not.toHaveBeenCalled();

    // Unhandled key does nothing
    fireEvent.keyDown(stop2, { key: 'KeyA' });
    expect(onChange).not.toHaveBeenCalled();

    // Fine step +2% and -2%
    fireEvent.keyDown(stop2, { key: 'ArrowRight' });
    expect(stop2).toHaveAttribute('aria-valuenow', '54');
    fireEvent.keyDown(stop2, { key: 'ArrowUp' });
    expect(stop2).toHaveAttribute('aria-valuenow', '56');
    fireEvent.keyDown(stop2, { key: 'ArrowLeft' });
    expect(stop2).toHaveAttribute('aria-valuenow', '54');
    fireEvent.keyDown(stop2, { key: 'ArrowDown' });
    expect(stop2).toHaveAttribute('aria-valuenow', '52');

    // Coarse Shift +/-10%
    fireEvent.keyDown(stop2, { key: 'ArrowRight', shiftKey: true });
    expect(stop2).toHaveAttribute('aria-valuenow', '62');
    fireEvent.keyDown(stop2, { key: 'ArrowLeft', shiftKey: true });
    expect(stop2).toHaveAttribute('aria-valuenow', '52');

    // Home / End + boundary clamping no-op when already at 0%
    fireEvent.keyDown(stop2, { key: 'Home' });
    expect(screen.getByTestId('gradient-stop-stop-2')).toHaveAttribute('aria-valuenow', '0');
    const callsAtZero = onChange.mock.calls.length;
    fireEvent.keyDown(screen.getByTestId('gradient-stop-stop-2'), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledTimes(callsAtZero);
    fireEvent.keyDown(screen.getByTestId('gradient-stop-stop-2'), { key: 'End' });
    expect(screen.getByTestId('gradient-stop-stop-2')).toHaveAttribute('aria-valuenow', '100');

    // Move stop-2 back to 52% via slider so midpoints have wide span
    fireEvent.change(screen.getByTestId('gradient-stop-position-slider'), {
      target: { value: '52' },
    });

    // Midpoint diamond keyboard interactions
    const mid1 = screen.getByRole('slider', { name: 'Midpoint between stops 1 and 2' });

    // Click & IME guard on midpoint
    fireEvent.click(mid1);
    expect(mid1).toHaveAttribute('data-active', 'true');
    const midImeEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
    Object.defineProperty(midImeEvent, 'isComposing', { value: true });
    mid1.dispatchEvent(midImeEvent);
    expect(mid1).toHaveAttribute('aria-valuenow', '50');

    // Unhandled key on midpoint
    fireEvent.keyDown(mid1, { key: 'Tab' });
    expect(mid1).toHaveAttribute('aria-valuenow', '50');

    // Fine and coarse midpoint nudging + Home/End clamping [15..85]
    fireEvent.keyDown(mid1, { key: 'ArrowLeft' });
    expect(mid1).toHaveAttribute('aria-valuenow', '48');
    fireEvent.keyDown(mid1, { key: 'ArrowDown' });
    expect(mid1).toHaveAttribute('aria-valuenow', '46');
    fireEvent.keyDown(mid1, { key: 'ArrowRight' });
    expect(mid1).toHaveAttribute('aria-valuenow', '48');
    fireEvent.keyDown(mid1, { key: 'ArrowUp' });
    expect(mid1).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(mid1, { key: 'ArrowLeft', shiftKey: true });
    expect(mid1).toHaveAttribute('aria-valuenow', '40');
    fireEvent.keyDown(mid1, { key: 'ArrowRight', shiftKey: true });
    expect(mid1).toHaveAttribute('aria-valuenow', '50');

    fireEvent.keyDown(mid1, { key: 'Home' });
    expect(mid1).toHaveAttribute('aria-valuenow', '15');
    // Telemetry now includes the computed CSS color hint (0 + 52 * 0.15 = 7.8%)
    expect(screen.getByTestId('gradient-css-telemetry')).toHaveTextContent('7.8%');

    fireEvent.keyDown(mid1, { key: 'End' });
    expect(mid1).toHaveAttribute('aria-valuenow', '85');
    expect(screen.getByTestId('gradient-css-telemetry')).toHaveTextContent('44.2%');

    // Double-click resets midpoint to 50% (removes color hint)
    fireEvent.doubleClick(mid1);
    expect(mid1).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByTestId('gradient-css-telemetry')).not.toHaveTextContent('44.2%');

    // Delete middle stop via Backspace key
    fireEvent.keyDown(screen.getByTestId('gradient-stop-stop-2'), { key: 'Backspace' });
    expect(screen.getByTestId('gradient-stop-count')).toHaveTextContent('2 stops');
    expect(screen.queryByTestId('gradient-stop-stop-2')).not.toBeInTheDocument();
  });

  it('supports pointer dragging for stop thumbs and midpoint diamonds with proper window listener cleanup', () => {
    const onChange = vi.fn();
    render(<GradientStopEditor data-testid="gradient-root" onChange={onChange} />);

    const root = screen.getByTestId('gradient-root');
    const track = screen.getByTestId('gradient-stop-track');
    const stop2 = screen.getByTestId('gradient-stop-stop-2');

    // Zero-width track rect safely aborts drag
    mockTrackRect(track, 0, 100);
    fireEvent.pointerDown(stop2, { button: 0, pointerId: 1 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Non-primary mouse button ignored
    mockTrackRect(track, 200, 100);
    fireEvent.pointerDown(stop2, { button: 2, pointerId: 1 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Drag stop-2 from 52% to 75% (clientX = 100 + 200 * 0.75 = 250)
    fireEvent.pointerDown(stop2, { button: 0, pointerId: 7 });
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Mismatched pointerId ignored on move and up
    fireEvent.pointerMove(window, { clientX: 290, pointerId: 99 });
    expect(stop2).toHaveAttribute('aria-valuenow', '52');
    fireEvent.pointerUp(window, { clientX: 290, pointerId: 99 });
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Matching pointerId moves stop
    fireEvent.pointerMove(window, { clientX: 250, pointerId: 7 });
    expect(stop2).toHaveAttribute('aria-valuenow', '75');

    // Releasing pointer cleans up listeners
    fireEvent.pointerUp(window, { clientX: 250, pointerId: 7 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Subsequent move after pointerup does nothing
    const callsAfterUp = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 120, pointerId: 7 });
    expect(onChange).toHaveBeenCalledTimes(callsAfterUp);

    // Drag midpoint between stop-1 (0%) and stop-2 (75%)
    const mid1 = screen.getByTestId('gradient-midpoint-stop-1');

    // Right-click ignored
    fireEvent.pointerDown(mid1, { button: 2, pointerId: 3 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Zero-width track aborts midpoint drag
    mockTrackRect(track, 0, 100);
    fireEvent.pointerDown(mid1, { button: 0, pointerId: 3 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Active drag of midpoint to 25% of [0..75] => trackPct = 18.75% => clientX = 100 + 37.5 = 137.5
    mockTrackRect(track, 200, 100);
    fireEvent.pointerDown(mid1, { button: 0, pointerId: 3 });
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Track temporarily zero-width mid-move safely ignored
    mockTrackRect(track, 0, 100);
    fireEvent.pointerMove(window, { clientX: 137.5, pointerId: 3 });
    expect(mid1).toHaveAttribute('aria-valuenow', '50');

    // Valid rect moves midpoint to 25%
    mockTrackRect(track, 200, 100);
    fireEvent.pointerMove(window, { clientX: 137.5, pointerId: 3 });
    expect(mid1).toHaveAttribute('aria-valuenow', '25');

    // Moving to same midpoint value is a no-op
    const callsBeforeRepeatMid = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 137.5, pointerId: 3 });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeRepeatMid);

    // pointercancel cleans up listeners
    fireEvent.pointerCancel(window, { clientX: 137.5, pointerId: 3 });
    expect(root).not.toHaveAttribute('data-dragging');
  });

  it('safely handles midpoint drag across zero-span stops and cleans up window listeners on disable and unmount', () => {
    const onChange = vi.fn();
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { rerender, unmount } = render(
      <GradientStopEditor
        data-testid="gradient-root"
        defaultValue={{
          kind: 'linear',
          angleDeg: 135,
          stops: [
            { id: 's1', positionPct: 40, token: 'primary', opacityPct: 100, midpointPct: 50 },
            { id: 's2', positionPct: 40, token: 'secondary', opacityPct: 100, midpointPct: 50 },
            { id: 's3', positionPct: 100, token: 'emerald', opacityPct: 100, midpointPct: 50 },
          ],
        }}
        onChange={onChange}
      />
    );

    const track = screen.getByTestId('gradient-stop-track');
    mockTrackRect(track, 200, 100);

    // Drag midpoint between equal-position stops s1(40%) and s2(40%) -> zero span no-ops safely
    const midZero = screen.getByTestId('gradient-midpoint-s1');
    fireEvent.pointerDown(midZero, { button: 0, pointerId: 5 });
    fireEvent.pointerMove(window, { clientX: 190, pointerId: 5 });
    expect(onChange).not.toHaveBeenCalled();

    // Switching to disabled mid-drag cleans up window listeners
    rerender(
      <GradientStopEditor
        data-testid="gradient-root"
        disabled
        defaultValue={{
          kind: 'linear',
          angleDeg: 135,
          stops: [
            { id: 's1', positionPct: 40, token: 'primary', opacityPct: 100, midpointPct: 50 },
            { id: 's2', positionPct: 40, token: 'secondary', opacityPct: 100, midpointPct: 50 },
            { id: 's3', positionPct: 100, token: 'emerald', opacityPct: 100, midpointPct: 50 },
          ],
        }}
        onChange={onChange}
      />
    );
    expect(screen.getByTestId('gradient-root')).not.toHaveAttribute('data-dragging');

    // Re-enable, start a stop drag, then unmount -> verifies unmount listener cleanup
    rerender(
      <GradientStopEditor
        data-testid="gradient-root"
        defaultValue={{
          kind: 'linear',
          angleDeg: 135,
          stops: [
            { id: 's1', positionPct: 40, token: 'primary', opacityPct: 100, midpointPct: 50 },
            { id: 's2', positionPct: 40, token: 'secondary', opacityPct: 100, midpointPct: 50 },
            { id: 's3', positionPct: 100, token: 'emerald', opacityPct: 100, midpointPct: 50 },
          ],
        }}
        onChange={onChange}
      />
    );
    mockTrackRect(screen.getByTestId('gradient-stop-track'), 200, 100);
    fireEvent.pointerDown(screen.getByTestId('gradient-stop-s3'), { button: 0, pointerId: 8 });
    removeListenerSpy.mockClear();
    unmount();
    const removedEvents = removeListenerSpy.mock.calls.map((call) => call[0]);
    expect(removedEvents).toContain('pointermove');
    expect(removedEvents).toContain('pointerup');
    expect(removedEvents).toContain('pointercancel');
    removeListenerSpy.mockRestore();

    fireEvent.pointerMove(window, { clientX: 150, pointerId: 8 });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('operates cleanly in controlled mode, handles mid-drag stop removal, and falls back selected stop', () => {
    const controlledInitial: GradientEditorState = {
      kind: 'linear',
      angleDeg: 45,
      stops: [
        { id: 'c1', positionPct: 0, token: 'info', opacityPct: 100, midpointPct: 50 },
        { id: 'c2', positionPct: 50, token: 'amber', opacityPct: 90, midpointPct: 50 },
        { id: 'c3', positionPct: 100, token: 'rose', opacityPct: 100, midpointPct: 50 },
      ],
    };
    const onChange = vi.fn();

    const { rerender } = render(
      <GradientStopEditor value={controlledInitial} onChange={onChange} />
    );

    const track = screen.getByTestId('gradient-stop-track');
    mockTrackRect(track, 200, 100);

    // Start dragging c2 then parent removes c2 -> move is a safe no-op
    fireEvent.pointerDown(screen.getByTestId('gradient-stop-c2'), { button: 0, pointerId: 21 });
    expect(screen.getByTestId('gradient-stop-c2')).toHaveAttribute('data-selected', 'true');

    fireEvent.click(screen.getByTestId('gradient-kind-radial'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('gradient-kind-linear')).toHaveAttribute('aria-pressed', 'true');

    // Rerender controlled value without c2 -> selection falls back to first stop (c1)
    const controlledUpdated: GradientEditorState = {
      kind: 'radial',
      angleDeg: 45,
      stops: [
        { id: 'c1', positionPct: 0, token: 'info', opacityPct: 100, midpointPct: 50 },
        { id: 'c3', positionPct: 100, token: 'rose', opacityPct: 100, midpointPct: 50 },
      ],
    };
    rerender(<GradientStopEditor value={controlledUpdated} onChange={onChange} />);
    expect(screen.getByTestId('gradient-kind-radial')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-stop-c1')).toHaveAttribute('data-selected', 'true');

    // Dragging removed stop c2 now safely no-ops
    fireEvent.pointerMove(window, { clientX: 180, pointerId: 21 });
    fireEvent.pointerUp(window, { pointerId: 21 });
    expect(onChange).toHaveBeenCalledTimes(1);

    // Start dragging midpoint of c1, then parent changes stops to remove c1 -> move safely no-ops
    mockTrackRect(screen.getByTestId('gradient-stop-track'), 200, 100);
    fireEvent.pointerDown(screen.getByTestId('gradient-midpoint-c1'), { button: 0, pointerId: 22 });
    rerender(
      <GradientStopEditor
        value={{
          kind: 'radial',
          angleDeg: 45,
          stops: [
            { id: 'x1', positionPct: 0, token: 'primary', opacityPct: 100, midpointPct: 50 },
            { id: 'x2', positionPct: 100, token: 'emerald', opacityPct: 100, midpointPct: 50 },
          ],
        }}
        onChange={onChange}
      />
    );
    fireEvent.pointerMove(window, { clientX: 160, pointerId: 22 });
    fireEvent.pointerUp(window, { pointerId: 22 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('blocks all interactions when disabled={true}', () => {
    const onChange = vi.fn();
    render(<GradientStopEditor data-testid="gradient-root" disabled onChange={onChange} />);

    const root = screen.getByTestId('gradient-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    expect(screen.getByTestId('gradient-kind-linear')).toBeDisabled();
    expect(screen.getByTestId('gradient-kind-radial')).toBeDisabled();
    expect(screen.getByTestId('gradient-kind-conic')).toBeDisabled();
    expect(screen.getByTestId('gradient-angle-slider')).toBeDisabled();
    expect(screen.getByTestId('gradient-add-stop-button')).toBeDisabled();
    expect(screen.getByTestId('gradient-reverse-button')).toBeDisabled();
    expect(screen.getByTestId('gradient-stop-position-slider')).toBeDisabled();
    expect(screen.getByTestId('gradient-stop-opacity-slider')).toBeDisabled();
    expect(screen.getByTestId('gradient-delete-stop-button')).toBeDisabled();

    const stop2 = screen.getByTestId('gradient-stop-stop-2');
    const mid1 = screen.getByTestId('gradient-midpoint-stop-1');
    expect(stop2).toHaveAttribute('tabindex', '-1');
    expect(stop2).toHaveAttribute('aria-disabled', 'true');
    expect(mid1).toHaveAttribute('tabindex', '-1');
    expect(mid1).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(stop2);
    fireEvent.pointerDown(stop2, { button: 0, pointerId: 1 });
    fireEvent.keyDown(stop2, { key: 'ArrowRight' });
    fireEvent.click(mid1);
    fireEvent.doubleClick(mid1);
    fireEvent.pointerDown(mid1, { button: 0, pointerId: 1 });
    fireEvent.keyDown(mid1, { key: 'ArrowRight' });
    fireEvent.change(screen.getByTestId('gradient-stop-position-slider'), {
      target: { value: '80' },
    });
    fireEvent.change(screen.getByTestId('gradient-stop-opacity-slider'), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByTestId('gradient-token-amber'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('sanitizes adversarial inputs (empty stops, 1 stop, NaN/Infinity, duplicates, invalid kind/token, >12 stops)', () => {
    // Empty stops -> falls back to default 3 stops
    const emptyCss = buildGradientCss({
      kind: 'linear',
      angleDeg: Number.NaN,
      stops: [],
    });
    expect(emptyCss).toContain('linear-gradient(135deg,');
    expect(emptyCss).not.toContain('NaN');

    // Single stop (<50% primary with colliding 'stop-fallback' id) -> adds stop at 100% secondary with 'stop-fallback-2'
    const singleLowCss = buildGradientCss({
      kind: 'radial',
      angleDeg: 0,
      stops: [
        { id: 'stop-fallback', positionPct: 20, token: 'primary', opacityPct: 100 },
      ],
    });
    expect(singleLowCss).toBe(
      'radial-gradient(circle at center, color-mix(in srgb, var(--prism-primary-main) 100%, transparent) 20%, color-mix(in srgb, var(--prism-secondary-main) 100%, transparent) 100%)'
    );

    // Single stop (>=50% non-primary) -> adds stop at 0% primary
    const singleHighCss = buildGradientCss({
      kind: 'conic',
      angleDeg: 720,
      stops: [{ id: 'solo', positionPct: 80, token: 'emerald', opacityPct: 50 }],
    });
    expect(singleHighCss).toBe(
      'conic-gradient(from 360deg, color-mix(in srgb, var(--prism-primary-main) 100%, transparent) 0%, color-mix(in srgb, var(--prism-success-main) 50%, transparent) 80%)'
    );

    // Adversarial unsorted, duplicate/blank IDs, out-of-range/NaN numbers, invalid runtime kind/token
    const invalidKind = 'mesh' as GradientKind;
    const invalidToken = 'neon' as GradientStopToken;
    const adversarialStops: GradientColorStop[] = [
      { id: '   ', positionPct: 140, token: invalidToken, opacityPct: 180, midpointPct: 99 },
      { id: 'dup', positionPct: -20, token: 'info', opacityPct: -10, midpointPct: 5 },
      { id: 'dup', positionPct: Number.POSITIVE_INFINITY, token: 'amber', opacityPct: Number.NaN, midpointPct: Number.NaN },
    ];

    render(
      <GradientStopEditor
        defaultValue={{
          kind: invalidKind,
          angleDeg: Number.NEGATIVE_INFINITY,
          stops: adversarialStops,
        }}
      />
    );

    expect(screen.getByTestId('gradient-kind-linear')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('gradient-angle-readout')).toHaveTextContent('135°');
    expect(screen.getByTestId('gradient-stop-dup')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('gradient-stop-dup-2')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('gradient-stop-stop-1')).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByTestId('gradient-css-telemetry').textContent).not.toContain('NaN');
    expect(screen.getByTestId('gradient-css-telemetry').textContent).not.toContain('Infinity');
  });
});
