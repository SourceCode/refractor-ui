import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { VectorXyPad, type XyPadGridMode, type XyVectorValue } from './index';

function mockPadRect(el: HTMLElement, left: number, top: number, width: number, height: number) {
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

describe('VectorXyPad', () => {
  it('renders prism-slab panel, recessed prism-well, 220x220 SVG, telemetry footer, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            VectorXyPad: {
              className: 'theme-xy-pad',
              style: { maxWidth: '420px' },
            },
          },
        }}
      >
        <VectorXyPad
          ref={ref}
          title="Key Light Vector"
          className="local-xy-pad"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="xy-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('xy-root');
    expect(VectorXyPad.displayName).toBe('VectorXyPad');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-vector-xy-pad',
      'prism-slab',
      'theme-xy-pad',
      'local-xy-pad'
    );
    expect(root).toHaveStyle({ maxWidth: '420px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Key Light Vector');
    expect(root).toHaveAttribute('data-grid-mode', 'cartesian');
    expect(root).not.toHaveAttribute('data-modified');
    expect(root).not.toHaveAttribute('data-snapped');

    expect(screen.getByTestId('xy-pad-title')).toHaveTextContent('Key Light Vector');
    expect(screen.getByTestId('xy-pad-well')).toHaveClass('prism-well');

    const slider = screen.getByRole('slider', { name: 'Key Light Vector vector coordinates' });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('tabindex', '0');

    const svg = screen.getByTestId('xy-pad-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 220 220');
    expect(svg).toHaveClass('w-full', 'max-w-[240px]', 'h-auto', 'mx-auto', 'select-none');

    expect(screen.getByTestId('xy-grid-cartesian')).toBeInTheDocument();
    expect(screen.queryByTestId('xy-grid-polar')).toBeNull();

    const telemetry = screen.getByTestId('xy-pad-telemetry');
    expect(telemetry).toHaveAttribute('aria-live', 'polite');
    expect(telemetry).toHaveTextContent('Light Azimuth (X)');
    expect(telemetry).toHaveTextContent('Elevation / Resonance (Y)');
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('0%');
    expect(screen.getByTestId('xy-readout-y')).toHaveTextContent('0%');
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('0% · 0°');

    const resetBtn = screen.getByTestId('xy-pad-reset');
    expect(resetBtn).toHaveTextContent('Center (0, 0)');
    expect(resetBtn).toBeDisabled();

    // Verify strictly token-driven SVG colors (zero raw hex/rgb/hsl literals)
    expect(screen.getByTestId('xy-crosshair-h')).toHaveAttribute(
      'stroke',
      'var(--prism-secondary-main)'
    );
    expect(screen.getByTestId('xy-vector-glow')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
  });

  it('toggles between Cartesian 4x4 gridlines and concentric Polar angle rings and syncs gridMode prop', () => {
    const { rerender } = render(<VectorXyPad data-testid="grid-root" />);

    const root = screen.getByTestId('grid-root');
    const cartesianBtn = screen.getByTestId('xy-mode-cartesian');
    const polarBtn = screen.getByTestId('xy-mode-polar');

    expect(cartesianBtn).toHaveAttribute('aria-pressed', 'true');
    expect(polarBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('xy-grid-cartesian')).toBeInTheDocument();

    fireEvent.click(polarBtn);
    expect(root).toHaveAttribute('data-grid-mode', 'polar');
    expect(polarBtn).toHaveAttribute('aria-pressed', 'true');
    expect(cartesianBtn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('xy-grid-polar')).toBeInTheDocument();
    expect(screen.getByTestId('xy-polar-ring-r25')).toBeInTheDocument();
    expect(screen.getByTestId('xy-polar-ring-r50')).toBeInTheDocument();
    expect(screen.getByTestId('xy-polar-ring-r75')).toBeInTheDocument();
    expect(screen.getByTestId('xy-polar-ring-r100')).toBeInTheDocument();

    fireEvent.click(cartesianBtn);
    expect(root).toHaveAttribute('data-grid-mode', 'cartesian');
    expect(screen.getByTestId('xy-grid-cartesian')).toBeInTheDocument();

    // Syncs when consumer updates gridMode prop
    const nextMode: XyPadGridMode = 'polar';
    rerender(<VectorXyPad gridMode={nextMode} data-testid="grid-root" />);
    expect(root).toHaveAttribute('data-grid-mode', 'polar');
    expect(screen.getByTestId('xy-grid-polar')).toBeInTheDocument();
  });

  it('supports pointer dragging, boundary clamping, double-click centering, reset button, zero-rect guard, and window cleanup', () => {
    const onChange = vi.fn<(next: XyVectorValue) => void>();

    const { unmount } = render(
      <VectorXyPad onChange={onChange} data-testid="drag-root" />
    );

    const root = screen.getByTestId('drag-root');
    const pad = screen.getByTestId('xy-pad-surface');
    const vectorLine = screen.getByTestId('xy-vector-line');

    // Zero-size rect safely no-ops
    mockPadRect(pad, 0, 0, 0, 0);
    fireEvent.pointerDown(pad, { button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(window);
    expect(onChange).not.toHaveBeenCalled();

    // Mock 220x220 pad at (100, 100) -> SVG 1:1 with client coords offset by 100
    // PAD_MIN = 18, PAD_SIZE = 184, PAD_CENTER = 110, PAD_HALF = 92
    mockPadRect(pad, 100, 100, 220, 220);

    // Secondary mouse button ignored
    fireEvent.pointerDown(pad, { button: 2, clientX: 256, clientY: 164 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Pointer down at (+46px, -46px) from center (210, 210) -> (256, 164) => x = +50, y = +50
    fireEvent.pointerDown(pad, { button: 0, clientX: 256, clientY: 164 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(root).toHaveAttribute('data-modified', 'true');
    expect(pad).toHaveAttribute('data-dragging', 'true');
    expect(pad).toHaveClass('cursor-grabbing');
    expect(onChange).toHaveBeenLastCalledWith({ x: 50, y: 50 });
    expect(vectorLine).toHaveAttribute('x2', '156');
    expect(vectorLine).toHaveAttribute('y2', '64');
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('+50%');
    expect(screen.getByTestId('xy-readout-y')).toHaveTextContent('+50%');
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('70.7% · 45°');

    // Moving to identical position emits no duplicate callback
    const callsAfterDown = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 256, clientY: 164 });
    expect(onChange).toHaveBeenCalledTimes(callsAfterDown);

    // Dragging beyond top-right clamps strictly to (+100, +100)
    fireEvent.pointerMove(window, { clientX: 500, clientY: -200 });
    expect(onChange).toHaveBeenLastCalledWith({ x: 100, y: 100 });
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('+100%');
    expect(screen.getByTestId('xy-readout-y')).toHaveTextContent('+100%');

    // Dragging beyond bottom-left clamps strictly to (-100, -100)
    fireEvent.pointerMove(window, { clientX: -50, clientY: 500 });
    expect(onChange).toHaveBeenLastCalledWith({ x: -100, y: -100 });
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('141.4% · 225°');

    // Pointer up detaches window listeners
    fireEvent.pointerUp(window);
    expect(root).not.toHaveAttribute('data-dragging');
    expect(pad).toHaveClass('cursor-crosshair');

    const countAfterUp = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 256, clientY: 164 });
    expect(onChange).toHaveBeenCalledTimes(countAfterUp);

    // Double-click centers puck back to (0, 0)
    fireEvent.doubleClick(pad);
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(screen.getByTestId('xy-pad-reset')).toBeDisabled();

    // Second double-click while already centered emits no redundant callback
    const countAfterDblClick = onChange.mock.calls.length;
    fireEvent.doubleClick(pad);
    expect(onChange).toHaveBeenCalledTimes(countAfterDblClick);

    // Drag to (+50, 0) then click Center (0, 0) reset button
    fireEvent.pointerDown(pad, { button: 0, clientX: 256, clientY: 210 });
    fireEvent.pointerCancel(window);
    expect(root).not.toHaveAttribute('data-dragging');
    expect(onChange).toHaveBeenLastCalledWith({ x: 50, y: 0 });
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('50% · 0°');

    fireEvent.click(screen.getByTestId('xy-pad-reset'));
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    // Unmount mid-drag detaches window listeners safely
    fireEvent.pointerDown(pad, { button: 0, clientX: 256, clientY: 164 });
    const countBeforeUnmount = onChange.mock.calls.length;
    unmount();
    fireEvent.pointerMove(window, { clientX: 120, clientY: 120 });
    expect(onChange).toHaveBeenCalledTimes(countBeforeUnmount);
  });

  it('supports IME-safe keyboard nudging (Arrow ±5%, Shift+Arrow ±1%, Home midpoint reset)', () => {
    const onChange = vi.fn<(next: XyVectorValue) => void>();

    render(<VectorXyPad onChange={onChange} />);

    const pad = screen.getByRole('slider', { name: '2D XY Vector Pad vector coordinates' });

    // IME composition and unhandled keys ignored
    fireEvent.keyDown(pad, { key: 'ArrowRight', isComposing: true });
    fireEvent.keyDown(pad, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();

    // Coarse nudges (±5% of 200 = ±10)
    fireEvent.keyDown(pad, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({ x: 10, y: 0 });
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('+10%');

    fireEvent.keyDown(pad, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ x: 10, y: 10 });

    fireEvent.keyDown(pad, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 10 });
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('10% · 90°');

    fireEvent.keyDown(pad, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });

    // Fine nudges (Shift+Arrow ±1% of 200 = ±2)
    fireEvent.keyDown(pad, { key: 'ArrowLeft', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ x: -2, y: 0 });
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('2% · 180°');

    fireEvent.keyDown(pad, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ x: -2, y: -2 });

    // Push down to south axis to check 270° polar readout
    fireEvent.keyDown(pad, { key: 'ArrowRight', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: -2 });
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('2% · 270°');

    // Home resets back to midpoint (0, 0)
    fireEvent.keyDown(pad, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({ x: 0, y: 0 });
  });

  it('supports controlled mode, snapStep grid snapping, custom unitless small shader bounds, and asymmetric midpoints', () => {
    const spy = vi.fn<(next: XyVectorValue) => void>();

    function ControlledShaderPad() {
      const [vec, setVec] = useState<XyVectorValue>({ x: 0.25, y: -0.5 });

      return (
        <VectorXyPad
          title="UV Warp"
          value={vec}
          minX={-1}
          maxX={1}
          minY={-1}
          maxY={1}
          xLabel="Warp U"
          yLabel="Warp V"
          unit=""
          snapStep={0.25}
          onChange={(next) => {
            spy(next);
            setVec(next);
          }}
          data-testid="controlled-root"
        />
      );
    }

    const { rerender } = render(<ControlledShaderPad />);

    const root = screen.getByTestId('controlled-root');
    expect(root).toHaveAttribute('data-snapped', 'true');
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('+0.25');
    expect(screen.getByTestId('xy-readout-y')).toHaveTextContent('-0.50');

    // Shift+Arrow with snapStep (0.25 > 1% of 2 = 0.02) advances by 0.25
    const pad = screen.getByTestId('xy-pad-surface');
    fireEvent.keyDown(pad, { key: 'ArrowRight', shiftKey: true });
    expect(spy).toHaveBeenLastCalledWith({ x: 0.5, y: -0.5 });
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('+0.50');

    // Controlled pointer drag snaps cleanly to 0.25 grid increments
    mockPadRect(pad, 0, 0, 220, 220);
    // Slightly off-grid point near (+0.5, +0.25) -> svgX ~ 156, svgY ~ 87
    fireEvent.pointerDown(pad, { button: 0, clientX: 158, clientY: 85 });
    fireEvent.pointerUp(window);
    expect(spy).toHaveBeenLastCalledWith({ x: 0.5, y: 0.25 });

    // Controlled reset
    fireEvent.click(screen.getByTestId('xy-pad-reset'));
    expect(spy).toHaveBeenLastCalledWith({ x: 0, y: 0 });
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('0.00');
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('0.00 · 0°');

    // Custom non-zero midpoint range [0..100] shows Center (50, 50)
    const asymSpy = vi.fn<(next: XyVectorValue) => void>();
    rerender(
      <VectorXyPad
        minX={0}
        maxX={100}
        minY={0}
        maxY={100}
        value={{ x: 80, y: 90 }}
        onChange={asymSpy}
      />
    );
    expect(screen.getByTestId('xy-pad-reset')).toHaveTextContent('Center (50, 50)');
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('50% · 53°');
    fireEvent.click(screen.getByTestId('xy-pad-reset'));
    expect(asymSpy).toHaveBeenLastCalledWith({ x: 50, y: 50 });

    // Collapsed zero-span bounds safely center puck without NaN
    rerender(
      <VectorXyPad
        minX={10}
        maxX={10}
        minY={20}
        maxY={20}
        value={{ x: 99, y: -99 }}
      />
    );
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('+10.00%');
    expect(screen.getByTestId('xy-readout-y')).toHaveTextContent('+20.00%');
    expect(screen.getByTestId('xy-readout-polar')).toHaveTextContent('0.00% · 0°');
  });

  it('sanitizes adversarial NaN/Infinity/inverted inputs, aborts active drag on disable, blocks interactions when disabled, and renders XSS payloads safely', () => {
    const onChange = vi.fn<(next: XyVectorValue) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <VectorXyPad
        title={payload}
        xLabel={payload}
        yLabel="Safe Y"
        minX={Number.NaN}
        maxX={Number.POSITIVE_INFINITY}
        minY={100}
        maxY={-100}
        snapStep={-5}
        value={{ x: Number.NaN, y: -0 }}
        onChange={onChange}
        data-testid="adv-root"
      />
    );

    const root = screen.getByTestId('adv-root');
    const pad = screen.getByTestId('xy-pad-surface');

    // Non-finite inputs fall back safely to default bounds & midpoint
    expect(screen.getByTestId('xy-readout-x')).toHaveTextContent('0%');
    expect(screen.getByTestId('xy-readout-y')).toHaveTextContent('0%');
    expect(root).not.toHaveAttribute('data-snapped');

    // XSS payload rendered strictly as literal text
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('xy-pad-title')).toHaveTextContent(payload);

    // Start drag then flip disabled -> true mid-drag
    mockPadRect(pad, 0, 0, 220, 220);
    fireEvent.pointerDown(pad, { button: 0, clientX: 156, clientY: 64 });
    expect(root).toHaveAttribute('data-dragging', 'true');

    rerender(
      <VectorXyPad
        title={payload}
        xLabel={payload}
        yLabel="Safe Y"
        defaultValue={{ x: 40, y: 40 }}
        disabled
        onChange={onChange}
        data-testid="adv-root"
      />
    );

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).not.toHaveAttribute('data-dragging');
    expect(pad).toHaveAttribute('aria-disabled', 'true');
    expect(pad).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('xy-mode-cartesian')).toBeDisabled();
    expect(screen.getByTestId('xy-mode-polar')).toBeDisabled();
    expect(screen.getByTestId('xy-pad-reset')).toBeDisabled();

    // All interactions blocked while disabled
    const callsWhenDisabled = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 200, clientY: 20 });
    fireEvent.pointerDown(pad, { button: 0, clientX: 190, clientY: 40 });
    fireEvent.doubleClick(pad);
    fireEvent.keyDown(pad, { key: 'ArrowRight' });
    fireEvent.click(screen.getByTestId('xy-pad-reset'));
    expect(onChange).toHaveBeenCalledTimes(callsWhenDisabled);
  });
});
