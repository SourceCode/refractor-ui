import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  ThreeWayColorWheels,
  type ColorWheelZone,
  type ThreeWayColorGrade,
} from './index';

function mockWheelRect(el: HTMLElement, left: number, top: number, width: number, height: number) {
  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top,
      right: left + width,
      bottom: top + height,
      width,
      height,
      x: left,
      y: top,
      toJSON: () => ({}),
    }),
  });
}

describe('ThreeWayColorWheels', () => {
  it('renders prism-slab panel, 3-column grid, 140x140 SVGs with semantic tokens, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ThreeWayColorWheels: {
              className: 'theme-color-wheels',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <ThreeWayColorWheels
          ref={ref}
          title="Primary Color Grade"
          className="local-color-wheels"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="wheels-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('wheels-root');
    expect(ThreeWayColorWheels.displayName).toBe('ThreeWayColorWheels');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-three-way-color-wheels',
      'prism-slab',
      'theme-color-wheels',
      'local-color-wheels'
    );
    expect(root).toHaveStyle({ maxWidth: '820px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Primary Color Grade');
    expect(root).toHaveAttribute('data-active-zone', 'lift');
    expect(root).not.toHaveAttribute('data-modified');

    expect(screen.getByTestId('color-wheels-title')).toHaveTextContent('Primary Color Grade');
    expect(screen.getByTestId('color-wheels-active-summary')).toHaveTextContent(
      'Lift · X 0.00 · Y 0.00 · L 0'
    );
    expect(screen.getByTestId('color-wheels-reset-all')).toBeDisabled();

    // Verify all 3 cards, sliders, SVGs, and semantic cardinal chroma tokens
    const expectedZones: ReadonlyArray<{
      id: ColorWheelZone;
      label: string;
      range: string;
    }> = [
      { id: 'lift', label: 'Lift', range: '(Shadows)' },
      { id: 'gamma', label: 'Gamma', range: '(Midtones)' },
      { id: 'gain', label: 'Gain', range: '(Highlights)' },
    ];

    for (const zone of expectedZones) {
      const card = screen.getByTestId(`wheel-card-${zone.id}`);
      expect(card).toHaveClass('prism-well', 'rounded-2xl', 'p-3');
      expect(card).toHaveTextContent(zone.label);
      expect(card).toHaveTextContent(zone.range);

      const wheelSlider = screen.getByRole('slider', { name: `${zone.label} color balance` });
      expect(wheelSlider).toHaveAttribute('aria-valuemin', '0');
      expect(wheelSlider).toHaveAttribute('aria-valuemax', '100');
      expect(wheelSlider).toHaveAttribute('aria-valuenow', '0');
      expect(wheelSlider).toHaveAttribute('tabindex', '0');

      const lumSlider = screen.getByRole('slider', { name: `${zone.label} luminance` });
      expect(lumSlider).toHaveAttribute('min', '-100');
      expect(lumSlider).toHaveAttribute('max', '100');
      expect(lumSlider).toHaveValue('0');

      const svg = screen.getByTestId(`wheel-svg-${zone.id}`);
      expect(svg).toHaveAttribute('viewBox', '0 0 140 140');
      expect(svg).toHaveClass('w-full', 'max-w-[148px]', 'mx-auto', 'select-none');

      expect(screen.getByTestId(`wheel-marker-${zone.id}-error`)).toHaveAttribute(
        'fill',
        'var(--prism-error-main)'
      );
      expect(screen.getByTestId(`wheel-marker-${zone.id}-warning`)).toHaveAttribute(
        'fill',
        'var(--prism-warning-main)'
      );
      expect(screen.getByTestId(`wheel-marker-${zone.id}-success`)).toHaveAttribute(
        'fill',
        'var(--prism-success-main)'
      );
      expect(screen.getByTestId(`wheel-marker-${zone.id}-info`)).toHaveAttribute(
        'fill',
        'var(--prism-info-main)'
      );
      expect(screen.getByTestId(`wheel-marker-${zone.id}-secondary`)).toHaveAttribute(
        'fill',
        'var(--prism-secondary-main)'
      );
      expect(screen.getByTestId(`wheel-marker-${zone.id}-primary`)).toHaveAttribute(
        'fill',
        'var(--prism-primary-main)'
      );

      expect(screen.getByTestId(`wheel-readout-x-${zone.id}`)).toHaveTextContent('0.00');
      expect(screen.getByTestId(`wheel-readout-y-${zone.id}`)).toHaveTextContent('0.00');
      expect(screen.getByTestId(`wheel-readout-lum-${zone.id}`)).toHaveTextContent('0');
      expect(screen.getByTestId(`wheel-reset-${zone.id}`)).toBeDisabled();
    }
  });

  it('supports keyboard nudging (Arrow ±0.05, Shift+Arrow ±0.2, Home center reset), unit-circle clamping, and IME guard', () => {
    const onChange = vi.fn<(grade: ThreeWayColorGrade, changedZone: ColorWheelZone) => void>();

    render(
      <ThreeWayColorWheels
        defaultValue={{
          gamma: { x: 0, y: 0, luminance: 18 },
        }}
        onChange={onChange}
      />
    );

    const gammaWheel = screen.getByRole('slider', { name: 'Gamma color balance' });

    // IME composition and unrelated keys ignored
    fireEvent.keyDown(gammaWheel, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(gammaWheel, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();

    // Fine nudges: ArrowRight (+0.05 X), ArrowUp (+0.05 Y), ArrowLeft (-0.05 X), ArrowDown (-0.05 Y)
    fireEvent.keyDown(gammaWheel, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamma: { x: 0.05, y: 0, luminance: 18 } }),
      'gamma'
    );
    expect(screen.getByTestId('wheel-readout-x-gamma')).toHaveTextContent('+0.05');
    expect(screen.getByTestId('color-wheels-active-summary')).toHaveTextContent(
      'Gamma · X +0.05 · Y 0.00 · L +18'
    );

    fireEvent.keyDown(gammaWheel, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamma: { x: 0.05, y: 0.05, luminance: 18 } }),
      'gamma'
    );

    fireEvent.keyDown(gammaWheel, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamma: { x: 0, y: 0.05, luminance: 18 } }),
      'gamma'
    );

    fireEvent.keyDown(gammaWheel, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamma: { x: 0, y: 0, luminance: 18 } }),
      'gamma'
    );

    // Shift nudges (±0.2) to boundary and beyond -> clamped to unit circle (x^2 + y^2 <= 1)
    for (let i = 0; i < 6; i += 1) {
      fireEvent.keyDown(gammaWheel, { key: 'ArrowRight', shiftKey: true });
    }
    expect(screen.getByTestId('wheel-readout-x-gamma')).toHaveTextContent('+1.00');
    expect(screen.getByTestId('wheel-readout-y-gamma')).toHaveTextContent('0.00');

    // Pushing further right at (1, 0) emits no duplicate callback
    const callsAtEdge = onChange.mock.calls.length;
    fireEvent.keyDown(gammaWheel, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledTimes(callsAtEdge);

    // Home resets chroma to (0, 0) while preserving luminance (18)
    fireEvent.keyDown(gammaWheel, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamma: { x: 0, y: 0, luminance: 18 } }),
      'gamma'
    );
    expect(screen.getByTestId('wheel-readout-x-gamma')).toHaveTextContent('0.00');
    expect(screen.getByTestId('wheel-readout-y-gamma')).toHaveTextContent('0.00');
    expect(screen.getByTestId('wheel-readout-lum-gamma')).toHaveTextContent('+18');
  });

  it('supports pointer dragging with unit-circle projection, double-click chroma reset, zero-rect guard, and window cleanup', () => {
    const onChange = vi.fn<(grade: ThreeWayColorGrade, changedZone: ColorWheelZone) => void>();

    const { unmount } = render(
      <ThreeWayColorWheels
        defaultValue={{
          lift: { x: 0, y: 0, luminance: -12 },
        }}
        onChange={onChange}
        data-testid="drag-root"
      />
    );

    const root = screen.getByTestId('drag-root');
    const liftWheel = screen.getByRole('slider', { name: 'Lift color balance' });
    const vectorLine = screen.getByTestId('wheel-vector-lift');

    // Zero-size bounding rect safely no-ops
    mockWheelRect(liftWheel, 0, 0, 0, 0);
    fireEvent.pointerDown(liftWheel, { button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(window);
    expect(onChange).not.toHaveBeenCalled();

    // Mock 140x140 wheel at (100, 100) -> center (170, 170), unit radius 52px
    mockWheelRect(liftWheel, 100, 100, 140, 140);

    // Secondary mouse button ignored
    fireEvent.pointerDown(liftWheel, { button: 2, clientX: 196, clientY: 170 });
    expect(root).not.toHaveAttribute('data-dragging-zone');

    // Pointer down at (+26px, -26px) -> x = +0.5, y = +0.5
    fireEvent.pointerDown(liftWheel, { button: 0, clientX: 196, clientY: 144 });
    expect(root).toHaveAttribute('data-dragging-zone', 'lift');
    expect(liftWheel).toHaveAttribute('data-dragging', 'true');
    expect(liftWheel).toHaveClass('cursor-grabbing');
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ lift: { x: 0.5, y: 0.5, luminance: -12 } }),
      'lift'
    );
    expect(vectorLine).toHaveAttribute('x2', '96');
    expect(vectorLine).toHaveAttribute('y2', '44');

    // Moving to identical position emits no duplicate callback
    const callsAfterDown = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 196, clientY: 144 });
    expect(onChange).toHaveBeenCalledTimes(callsAfterDown);

    // Dragging far diagonally (+300, +300) clamps strictly inside unit circle (x^2 + y^2 <= 1)
    fireEvent.pointerMove(window, { clientX: 470, clientY: 470 });
    const lastGrade = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    expect(lastGrade).toBeDefined();
    if (lastGrade) {
      expect(lastGrade.lift.x).toBeGreaterThan(0);
      expect(lastGrade.lift.y).toBeLessThan(0);
      expect(lastGrade.lift.x * lastGrade.lift.x + lastGrade.lift.y * lastGrade.lift.y).toBeLessThanOrEqual(
        1
      );
    }

    // Pointer up ends drag and detaches window listeners
    fireEvent.pointerUp(window);
    expect(root).not.toHaveAttribute('data-dragging-zone');
    expect(liftWheel).toHaveClass('cursor-crosshair');

    const countAfterUp = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 118, clientY: 170 });
    expect(onChange).toHaveBeenCalledTimes(countAfterUp);

    // Double-click wheel resets (x, y) to (0, 0) while preserving luminance (-12)
    fireEvent.doubleClick(liftWheel);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ lift: { x: 0, y: 0, luminance: -12 } }),
      'lift'
    );

    // Second double-click when already at (0, 0) emits no redundant callback
    const countAfterDblClick = onChange.mock.calls.length;
    fireEvent.doubleClick(liftWheel);
    expect(onChange).toHaveBeenCalledTimes(countAfterDblClick);

    // Pointer cancel cleans up drag state
    fireEvent.pointerDown(liftWheel, { button: 0, clientX: 196, clientY: 170 });
    expect(root).toHaveAttribute('data-dragging-zone', 'lift');
    fireEvent.pointerCancel(window);
    expect(root).not.toHaveAttribute('data-dragging-zone');

    // Unmount mid-drag detaches window listeners safely
    fireEvent.pointerDown(liftWheel, { button: 0, clientX: 196, clientY: 170 });
    const countBeforeUnmount = onChange.mock.calls.length;
    unmount();
    fireEvent.pointerMove(window, { clientX: 120, clientY: 120 });
    expect(onChange).toHaveBeenCalledTimes(countBeforeUnmount);
  });

  it('supports paired luminance sliders, focus summaries, individual zone reset, and Reset All', () => {
    const onChange = vi.fn<(grade: ThreeWayColorGrade, changedZone: ColorWheelZone) => void>();

    render(
      <ThreeWayColorWheels
        defaultValue={{
          gain: { x: 0.25, y: -0.15, luminance: 20 },
        }}
        onChange={onChange}
      />
    );

    const summary = screen.getByTestId('color-wheels-active-summary');
    const liftLum = screen.getByRole('slider', { name: 'Lift luminance' });
    const gammaLum = screen.getByRole('slider', { name: 'Gamma luminance' });
    const gainLum = screen.getByRole('slider', { name: 'Gain luminance' });
    const gainWheel = screen.getByRole('slider', { name: 'Gain color balance' });

    // Focusing wheel and luminance slider updates live active zone summary
    fireEvent.focus(gainWheel);
    expect(summary).toHaveTextContent('Gain · X +0.25 · Y -0.15 · L +20');

    fireEvent.focus(gammaLum);
    expect(summary).toHaveTextContent('Gamma · X 0.00 · Y 0.00 · L 0');

    // Reset All when activeZone ('gamma') is neutral reports first dirty zone ('gain')
    fireEvent.click(screen.getByTestId('color-wheels-reset-all'));
    expect(onChange).toHaveBeenLastCalledWith(
      {
        lift: { x: 0, y: 0, luminance: 0 },
        gamma: { x: 0, y: 0, luminance: 0 },
        gain: { x: 0, y: 0, luminance: 0 },
      },
      'gain'
    );
    expect(screen.getByTestId('color-wheels-reset-all')).toBeDisabled();

    // Update Lift luminance (-35) and Gain luminance (+40)
    fireEvent.change(liftLum, { target: { value: '-35' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ lift: { x: 0, y: 0, luminance: -35 } }),
      'lift'
    );
    expect(screen.getByTestId('wheel-readout-lum-lift')).toHaveTextContent('-35');

    // Duplicate same value emits no redundant callback
    const countBeforeSame = onChange.mock.calls.length;
    fireEvent.change(liftLum, { target: { value: '-35' } });
    expect(onChange).toHaveBeenCalledTimes(countBeforeSame);

    fireEvent.change(gainLum, { target: { value: '40' } });
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ gain: { x: 0, y: 0, luminance: 40 } }),
      'gain'
    );

    // Individual Reset on Lift zeroes Lift only while keeping Gain intact
    fireEvent.click(screen.getByTestId('wheel-reset-lift'));
    expect(onChange).toHaveBeenLastCalledWith(
      {
        lift: { x: 0, y: 0, luminance: 0 },
        gamma: { x: 0, y: 0, luminance: 0 },
        gain: { x: 0, y: 0, luminance: 40 },
      },
      'lift'
    );
    expect(screen.getByTestId('wheel-reset-lift')).toBeDisabled();
    expect(screen.getByTestId('wheel-reset-gain')).toBeEnabled();

    // Focus Gain (dirty) and click Reset All -> reports 'gain'
    fireEvent.focus(gainLum);
    fireEvent.click(screen.getByTestId('color-wheels-reset-all'));
    expect(onChange).toHaveBeenLastCalledWith(
      {
        lift: { x: 0, y: 0, luminance: 0 },
        gamma: { x: 0, y: 0, luminance: 0 },
        gain: { x: 0, y: 0, luminance: 0 },
      },
      'gain'
    );
  });

  it('supports controlled mode, partial value props, and sanitizes NaN / Infinity / out-of-circle inputs', () => {
    const spy = vi.fn<(grade: ThreeWayColorGrade, changedZone: ColorWheelZone) => void>();

    function ControlledGradePanel() {
      const [grade, setGrade] = useState<Partial<ThreeWayColorGrade>>({
        gamma: { x: 0.1, y: -0.1, luminance: 10 },
      });

      return (
        <ThreeWayColorWheels
          value={grade}
          onChange={(next, zone) => {
            spy(next, zone);
            setGrade(next);
          }}
        />
      );
    }

    const { rerender } = render(<ControlledGradePanel />);

    // Omitted lift and gain default to neutral
    expect(screen.getByTestId('wheel-readout-x-lift')).toHaveTextContent('0.00');
    expect(screen.getByTestId('wheel-readout-x-gamma')).toHaveTextContent('+0.10');
    expect(screen.getByTestId('wheel-readout-y-gamma')).toHaveTextContent('-0.10');
    expect(screen.getByTestId('wheel-readout-lum-gamma')).toHaveTextContent('+10');

    // Controlled pointer drag on Gamma updates parent state
    const gammaWheel = screen.getByRole('slider', { name: 'Gamma color balance' });
    mockWheelRect(gammaWheel, 0, 0, 140, 140);
    fireEvent.pointerDown(gammaWheel, { button: 0, clientX: 96, clientY: 70 });
    fireEvent.pointerUp(window);
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamma: { x: 0.5, y: 0, luminance: 10 } }),
      'gamma'
    );
    expect(screen.getByTestId('wheel-readout-x-gamma')).toHaveTextContent('+0.50');

    // Controlled keyboard nudge and luminance change also update parent state
    fireEvent.keyDown(gammaWheel, { key: 'ArrowUp' });
    expect(spy).toHaveBeenLastCalledWith(
      expect.objectContaining({ gamma: { x: 0.5, y: 0.05, luminance: 10 } }),
      'gamma'
    );
    expect(screen.getByTestId('wheel-readout-y-gamma')).toHaveTextContent('+0.05');

    const gammaLum = screen.getByRole('slider', { name: 'Gamma luminance' });
    fireEvent.change(gammaLum, { target: { value: '24' } });
    expect(screen.getByTestId('wheel-readout-lum-gamma')).toHaveTextContent('+24');

    // Controlled Reset All updates parent state
    fireEvent.click(screen.getByTestId('color-wheels-reset-all'));
    expect(screen.getByTestId('wheel-readout-x-gamma')).toHaveTextContent('0.00');
    expect(screen.getByTestId('wheel-readout-lum-gamma')).toHaveTextContent('0');

    // Adversarial non-finite, -0, and diagonal rounding edge case (0.7071, 0.7071)
    rerender(
      <ThreeWayColorWheels
        value={{
          lift: { x: Number.NaN, y: Number.POSITIVE_INFINITY, luminance: Number.NaN },
          gamma: { x: 0.7071, y: 0.7071, luminance: 250 },
          gain: { x: -0, y: -5, luminance: -250 },
        }}
      />
    );

    expect(screen.getByTestId('wheel-readout-x-lift')).toHaveTextContent('0.00');
    expect(screen.getByTestId('wheel-readout-y-lift')).toHaveTextContent('0.00');
    expect(screen.getByTestId('wheel-readout-lum-lift')).toHaveTextContent('0');

    // (0.7071, 0.7071) would round to (0.71, 0.71) whose norm^2 > 1 -> truncated safely to (0.70, 0.70)
    expect(screen.getByTestId('wheel-readout-x-gamma')).toHaveTextContent('+0.70');
    expect(screen.getByTestId('wheel-readout-y-gamma')).toHaveTextContent('+0.70');
    expect(screen.getByTestId('wheel-readout-lum-gamma')).toHaveTextContent('+100');

    expect(screen.getByTestId('wheel-readout-x-gain')).toHaveTextContent('0.00');
    expect(screen.getByTestId('wheel-readout-y-gain')).toHaveTextContent('-1.00');
    expect(screen.getByTestId('wheel-readout-lum-gain')).toHaveTextContent('-100');
  });

  it('blocks interactions when disabled, aborts active drag on disable transition, and safely renders XSS payloads', () => {
    const onChange = vi.fn<(grade: ThreeWayColorGrade, changedZone: ColorWheelZone) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <ThreeWayColorWheels
        title={payload}
        defaultValue={{
          lift: { x: 0.2, y: 0.1, luminance: 15 },
        }}
        onChange={onChange}
        data-testid="adversarial-wheels"
      />
    );

    const root = screen.getByTestId('adversarial-wheels');
    const liftWheel = screen.getByRole('slider', { name: 'Lift color balance' });
    const liftLum = screen.getByRole('slider', { name: 'Lift luminance' });
    mockWheelRect(liftWheel, 0, 0, 140, 140);

    // Start drag then flip disabled -> true mid-drag
    fireEvent.pointerDown(liftWheel, { button: 0, clientX: 90, clientY: 60 });
    expect(root).toHaveAttribute('data-dragging-zone', 'lift');

    rerender(
      <ThreeWayColorWheels
        title={payload}
        defaultValue={{
          lift: { x: 0.2, y: 0.1, luminance: 15 },
        }}
        disabled
        onChange={onChange}
        data-testid="adversarial-wheels"
      />
    );

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).not.toHaveAttribute('data-dragging-zone');
    expect(liftWheel).toHaveAttribute('aria-disabled', 'true');
    expect(liftWheel).toHaveAttribute('tabindex', '-1');
    expect(liftLum).toBeDisabled();
    expect(screen.getByTestId('wheel-reset-lift')).toBeDisabled();
    expect(screen.getByTestId('color-wheels-reset-all')).toBeDisabled();

    // XSS payload rendered strictly as literal text
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('color-wheels-title')).toHaveTextContent(payload);

    // Subsequent interactions are completely blocked
    const callsWhenDisabled = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 120, clientY: 120 });
    fireEvent.pointerDown(liftWheel, { button: 0, clientX: 110, clientY: 110 });
    fireEvent.doubleClick(liftWheel);
    fireEvent.keyDown(liftWheel, { key: 'ArrowRight' });
    fireEvent.change(liftLum, { target: { value: '50' } });
    fireEvent.click(screen.getByTestId('wheel-reset-lift'));
    fireEvent.click(screen.getByTestId('color-wheels-reset-all'));

    expect(onChange).toHaveBeenCalledTimes(callsWhenDisabled);
  });
});
