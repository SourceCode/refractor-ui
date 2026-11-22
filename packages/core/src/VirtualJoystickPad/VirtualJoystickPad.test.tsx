import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  VirtualJoystickPad,
  type JoystickCardinalDirection,
  type JoystickControlMode,
  type JoystickVector,
} from './index';

function mockGimbalRect(el: HTMLElement, left: number, top: number, width: number, height: number) {
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

describe('VirtualJoystickPad', () => {
  it('renders prism-slab panel, 220x220 optical gimbal SVG, header controls, telemetry footer, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            VirtualJoystickPad: {
              className: 'theme-joystick',
              style: { maxWidth: '460px' },
            },
          },
        }}
      >
        <VirtualJoystickPad
          ref={ref}
          className="local-joystick"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '20px' }}
          data-testid="joystick-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('joystick-root');
    expect(VirtualJoystickPad.displayName).toBe('VirtualJoystickPad');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-virtual-joystick-pad',
      'prism-slab',
      'theme-joystick',
      'local-joystick'
    );
    expect(root).toHaveStyle({ maxWidth: '460px', padding: '20px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('aria-label', 'Optical Gimbal & D-Pad Controller');
    expect(root).toHaveAttribute('data-mode', 'analog');
    expect(root).toHaveAttribute('data-spring-return', 'true');
    expect(root).toHaveAttribute('data-direction', 'center');
    expect(root).not.toHaveAttribute('data-active');

    expect(screen.getByTestId('joystick-title')).toHaveTextContent(
      'Optical Gimbal & D-Pad Controller'
    );
    expect(screen.getByTestId('joystick-mode-analog')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('joystick-mode-dpad')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('joystick-spring-toggle')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('joystick-center-btn')).toBeDisabled();

    const slider = screen.getByRole('slider', {
      name: 'Optical Gimbal & D-Pad Controller analog thumbstick',
    });
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '0');
    expect(slider).toHaveAttribute('tabindex', '0');

    const svg = screen.getByTestId('joystick-svg');
    expect(svg).toHaveAttribute('viewBox', '0 0 220 220');
    expect(screen.getByTestId('joystick-ring-inner')).toBeInTheDocument();
    expect(screen.getByTestId('joystick-ring-mid')).toBeInTheDocument();
    expect(screen.getByTestId('joystick-ring-outer')).toBeInTheDocument();
    expect(screen.getByTestId('joystick-deadzone-ring')).toBeInTheDocument();
    expect(screen.getByTestId('joystick-vector-ray')).toHaveAttribute(
      'stroke',
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('joystick-puck')).toBeInTheDocument();

    const telemetry = screen.getByTestId('joystick-telemetry');
    expect(telemetry).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('joystick-readout-x')).toHaveTextContent('0.00');
    expect(screen.getByTestId('joystick-readout-y')).toHaveTextContent('0.00');
    expect(screen.getByTestId('joystick-readout-mag')).toHaveTextContent('0.00');
    expect(screen.getByTestId('joystick-readout-hdg')).toHaveTextContent('0°');
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('CENTER');
  });

  it('supports analog pointer drag, unit-circle clamping, deadzone snapping, spring-return vs hold, pointercancel, and unmount cleanup', () => {
    const onChange = vi.fn<(vector: JoystickVector) => void>();

    const { unmount } = render(
      <VirtualJoystickPad title="Gimbal Deck" onChange={onChange} data-testid="drag-root" />
    );

    const root = screen.getByTestId('drag-root');
    const gimbal = screen.getByTestId('joystick-gimbal');

    // Zero-size bounding rect safely no-ops
    mockGimbalRect(gimbal, 0, 0, 0, 0);
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(window);
    expect(onChange).not.toHaveBeenCalled();

    // Mock 220x220 gimbal at (100, 100) -> center is (210, 210), GIMBAL_RADIUS = 80
    mockGimbalRect(gimbal, 100, 100, 220, 220);

    // Secondary mouse button ignored
    fireEvent.pointerDown(gimbal, { button: 2, clientX: 250, clientY: 210 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Pointer down half-way East: dx = +40 / 80 = +0.50, dy = 0
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 250, clientY: 210 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(root).toHaveAttribute('data-active', 'true');
    expect(gimbal).toHaveClass('cursor-grabbing');
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0.5,
      y: 0,
      magnitude: 0.5,
      angleDeg: 90,
      direction: 'E',
    });
    expect(screen.getByTestId('joystick-readout-x')).toHaveTextContent('+0.50');
    expect(screen.getByTestId('joystick-readout-y')).toHaveTextContent('0.00');
    expect(screen.getByTestId('joystick-readout-mag')).toHaveTextContent('0.50');
    expect(screen.getByTestId('joystick-readout-hdg')).toHaveTextContent('90°');
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('E');
    expect(gimbal).toHaveAttribute('aria-valuenow', '50');

    // Identical pointer position emits no duplicate callback
    const callsAfterHalfEast = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 250, clientY: 210 });
    expect(onChange).toHaveBeenCalledTimes(callsAfterHalfEast);

    // Drag far outside NE corner -> clamped onto unit circle (0.71, 0.71), mag 1, 45°, NE
    fireEvent.pointerMove(window, { clientX: 500, clientY: -80 });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0.71,
      y: 0.71,
      magnitude: 1,
      angleDeg: 45,
      direction: 'NE',
    });
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('NE');
    expect(gimbal).toHaveAttribute('aria-valuenow', '100');

    // Drag inside deadzone (dx = +4px -> 0.05 < 0.08) snaps to CENTER
    fireEvent.pointerMove(window, { clientX: 214, clientY: 210 });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Releasing pointer while already centered emits no extra spring callback
    const callsAtCenter = onChange.mock.calls.length;
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenCalledTimes(callsAtCenter);
    expect(root).not.toHaveAttribute('data-dragging');

    // Drag to West and release -> springReturn=true springs back to CENTER
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 130, clientY: 210 });
    expect(onChange).toHaveBeenLastCalledWith({
      x: -1,
      y: 0,
      magnitude: 1,
      angleDeg: 270,
      direction: 'W',
    });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Verify listeners detached after pointerup
    const callsAfterRelease = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 290, clientY: 210 });
    expect(onChange).toHaveBeenCalledTimes(callsAfterRelease);

    // Drag to South then pointercancel -> cleans up and springs back
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 210, clientY: 290 });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: -1,
      magnitude: 1,
      angleDeg: 180,
      direction: 'S',
    });
    fireEvent.pointerCancel(window);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Toggle Spring Return OFF -> releasing pointer holds vector
    const springBtn = screen.getByTestId('joystick-spring-toggle');
    fireEvent.click(springBtn);
    expect(springBtn).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-spring-return');

    fireEvent.pointerDown(gimbal, { button: 0, clientX: 210, clientY: 130 });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 1,
      magnitude: 1,
      angleDeg: 0,
      direction: 'N',
    });
    expect(screen.getByTestId('joystick-readout-y')).toHaveTextContent('+1.00');
    expect(screen.getByTestId('joystick-center-btn')).not.toBeDisabled();

    // Center button resets latched vector to CENTER
    fireEvent.click(screen.getByTestId('joystick-center-btn'));
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Unmount mid-drag detaches window listeners safely
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 250, clientY: 210 });
    const countBeforeUnmount = onChange.mock.calls.length;
    unmount();
    fireEvent.pointerMove(window, { clientX: 290, clientY: 130 });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenCalledTimes(countBeforeUnmount);
  });

  it('supports IME-safe keyboard steering (Arrow + WASD ±0.25, Shift fine ±0.10, Home & Space center)', () => {
    const onChange = vi.fn<(vector: JoystickVector) => void>();

    render(<VirtualJoystickPad onChange={onChange} />);
    const gimbal = screen.getByTestId('joystick-gimbal');

    // IME composition and unhandled keys ignored
    fireEvent.keyDown(gimbal, { key: 'ArrowUp', isComposing: true });
    fireEvent.keyDown(gimbal, { key: 'Escape' });
    expect(onChange).not.toHaveBeenCalled();

    // Coarse Arrow steps (±0.25)
    fireEvent.keyDown(gimbal, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0.25,
      magnitude: 0.25,
      angleDeg: 0,
      direction: 'N',
    });

    fireEvent.keyDown(gimbal, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0.25,
      y: 0.25,
      magnitude: 0.35,
      angleDeg: 45,
      direction: 'NE',
    });

    fireEvent.keyDown(gimbal, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0.25,
      y: 0,
      magnitude: 0.25,
      angleDeg: 90,
      direction: 'E',
    });

    fireEvent.keyDown(gimbal, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // WASD + Shift fine steps (±0.10, including uppercase Shift+key)
    fireEvent.keyDown(gimbal, { key: 'w' });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0.25,
      magnitude: 0.25,
      angleDeg: 0,
      direction: 'N',
    });

    fireEvent.keyDown(gimbal, { key: 'A', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({
      x: -0.1,
      y: 0.25,
      magnitude: 0.27,
      angleDeg: 338,
      direction: 'N',
    });

    fireEvent.keyDown(gimbal, { key: 'D', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0.25,
      magnitude: 0.25,
      angleDeg: 0,
      direction: 'N',
    });

    fireEvent.keyDown(gimbal, { key: 's', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0.15,
      magnitude: 0.15,
      angleDeg: 0,
      direction: 'N',
    });

    // Home centers back to (0, 0)
    fireEvent.keyDown(gimbal, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Home again while centered emits no duplicate callback
    const callsAfterHome = onChange.mock.calls.length;
    fireEvent.keyDown(gimbal, { key: 'Home' });
    expect(onChange).toHaveBeenCalledTimes(callsAfterHome);

    // Space also centers from a non-zero coordinate
    fireEvent.keyDown(gimbal, { key: 'd' });
    fireEvent.keyDown(gimbal, { key: ' ' });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });
  });

  it('resolves all 8 compass directions plus CENTER and respects deadzone clamping', () => {
    const cases: ReadonlyArray<{
      point: { x: number; y: number };
      expectedDir: JoystickCardinalDirection;
      expectedHdg: string;
    }> = [
      { point: { x: 0, y: 0 }, expectedDir: 'CENTER', expectedHdg: '0°' },
      { point: { x: 0, y: 1 }, expectedDir: 'N', expectedHdg: '0°' },
      { point: { x: 1, y: 1 }, expectedDir: 'NE', expectedHdg: '45°' },
      { point: { x: 1, y: 0 }, expectedDir: 'E', expectedHdg: '90°' },
      { point: { x: 1, y: -1 }, expectedDir: 'SE', expectedHdg: '135°' },
      { point: { x: 0, y: -1 }, expectedDir: 'S', expectedHdg: '180°' },
      { point: { x: -1, y: -1 }, expectedDir: 'SW', expectedHdg: '225°' },
      { point: { x: -1, y: 0 }, expectedDir: 'W', expectedHdg: '270°' },
      { point: { x: -1, y: 1 }, expectedDir: 'NW', expectedHdg: '315°' },
    ];

    const { rerender } = render(<VirtualJoystickPad value={{ x: 0, y: 0 }} />);
    for (const item of cases) {
      rerender(<VirtualJoystickPad value={item.point} />);
      expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent(item.expectedDir);
      expect(screen.getByTestId('joystick-readout-hdg')).toHaveTextContent(item.expectedHdg);
    }

    // Deadzone clamped to max 0.45 when > 0.45
    rerender(<VirtualJoystickPad value={{ x: 0.4, y: 0 }} deadzone={0.9} />);
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('CENTER');

    rerender(<VirtualJoystickPad value={{ x: 0.5, y: 0 }} deadzone={0.9} />);
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('E');

    // Deadzone = 0 hides deadzone ring and rounds tiny sub-0.005 input to CENTER
    rerender(<VirtualJoystickPad value={{ x: 0.001, y: 0.001 }} deadzone={0} />);
    expect(screen.queryByTestId('joystick-deadzone-ring')).toBeNull();
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('CENTER');

    // Negative deadzone clamps to 0
    rerender(<VirtualJoystickPad value={{ x: 0.02, y: 0 }} deadzone={-0.3} />);
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('E');
  });

  it('supports Tactile D-Pad mode, all 5 buttons, pointer spring-return vs latch, and keyboard Enter/Space activation', () => {
    const onChange = vi.fn<(vector: JoystickVector) => void>();
    const onModeChange = vi.fn<(mode: JoystickControlMode) => void>();

    render(
      <VirtualJoystickPad
        onChange={onChange}
        onModeChange={onModeChange}
        data-testid="dpad-root"
      />
    );

    // Clicking already-active analog mode is a no-op
    fireEvent.click(screen.getByTestId('joystick-mode-analog'));
    expect(onModeChange).not.toHaveBeenCalled();

    // Switch to Tactile D-Pad mode
    fireEvent.click(screen.getByTestId('joystick-mode-dpad'));
    expect(onModeChange).toHaveBeenCalledWith('dpad');
    expect(screen.getByTestId('dpad-root')).toHaveAttribute('data-mode', 'dpad');
    expect(screen.getByTestId('joystick-dpad-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('joystick-gimbal')).toBeNull();

    const upBtn = screen.getByTestId('joystick-dpad-up');
    const downBtn = screen.getByTestId('joystick-dpad-down');
    const leftBtn = screen.getByTestId('joystick-dpad-left');
    const rightBtn = screen.getByTestId('joystick-dpad-right');
    const centerBtn = screen.getByTestId('joystick-dpad-center');

    expect(centerBtn).toHaveAttribute('aria-pressed', 'true');
    expect(upBtn).toHaveAttribute('aria-pressed', 'false');

    // Secondary button pointerDown ignored
    fireEvent.pointerDown(upBtn, { button: 2 });
    expect(onChange).not.toHaveBeenCalled();

    // Pointer down/up on Up with springReturn=true springs back to CENTER
    fireEvent.pointerDown(upBtn, { button: 0 });
    expect(upBtn).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 1,
      magnitude: 1,
      angleDeg: 0,
      direction: 'N',
    });
    fireEvent.pointerUp(window);
    // Synthetic mouse click (detail: 1) following pointer interaction is suppressed
    fireEvent.click(upBtn, { detail: 1 });
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });
    expect(upBtn).toHaveAttribute('aria-pressed', 'false');
    expect(centerBtn).toHaveAttribute('aria-pressed', 'true');

    // Pointer down + pointercancel on Left springs back cleanly
    fireEvent.pointerDown(leftBtn, { button: 0 });
    expect(onChange).toHaveBeenLastCalledWith({
      x: -1,
      y: 0,
      magnitude: 1,
      angleDeg: 270,
      direction: 'W',
    });
    fireEvent.pointerCancel(window);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Pointer down/up on Center while centered emits no redundant callback
    const callsBeforeCenterPtr = onChange.mock.calls.length;
    fireEvent.pointerDown(centerBtn, { button: 0 });
    fireEvent.pointerUp(window);
    expect(onChange).toHaveBeenCalledTimes(callsBeforeCenterPtr);

    // Disable spring return -> D-Pad latches on pointer release
    fireEvent.click(screen.getByTestId('joystick-spring-toggle'));
    fireEvent.pointerDown(rightBtn, { button: 0 });
    fireEvent.pointerUp(window);
    expect(rightBtn).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenLastCalledWith({
      x: 1,
      y: 0,
      magnitude: 1,
      angleDeg: 90,
      direction: 'E',
    });

    // PointerDown + click on Down latches South
    fireEvent.pointerDown(downBtn, { button: 0 });
    fireEvent.pointerUp(window);
    expect(downBtn).toHaveAttribute('aria-pressed', 'true');
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: -1,
      magnitude: 1,
      angleDeg: 180,
      direction: 'S',
    });

    // Programmatic click (detail: 0) on Up, Left, Right, Down, Center
    fireEvent.click(upBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 1,
      magnitude: 1,
      angleDeg: 0,
      direction: 'N',
    });
    fireEvent.click(leftBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      x: -1,
      y: 0,
      magnitude: 1,
      angleDeg: 270,
      direction: 'W',
    });
    fireEvent.click(rightBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 1,
      y: 0,
      magnitude: 1,
      angleDeg: 90,
      direction: 'E',
    });
    fireEvent.click(downBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: -1,
      magnitude: 1,
      angleDeg: 180,
      direction: 'S',
    });
    fireEvent.click(centerBtn);
    expect(onChange).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Keyboard Enter & Space activation + IME guard on D-Pad buttons
    fireEvent.keyDown(upBtn, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(upBtn, { key: 'Tab' });
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('CENTER');

    fireEvent.keyDown(upBtn, { key: 'Enter' });
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('N');

    fireEvent.keyDown(leftBtn, { key: ' ' });
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('W');

    fireEvent.keyDown(rightBtn, { key: 'Enter' });
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('E');

    fireEvent.keyDown(downBtn, { key: 'Enter' });
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('S');

    fireEvent.keyDown(centerBtn, { key: ' ' });
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('CENTER');

    // Switch back to Analog Stick mode
    fireEvent.click(screen.getByTestId('joystick-mode-analog'));
    expect(onModeChange).toHaveBeenLastCalledWith('analog');
    expect(screen.getByTestId('joystick-gimbal')).toBeInTheDocument();
  });

  it('supports controlled value, controlled mode, and springReturn prop synchronization', () => {
    const onChangeSpy = vi.fn<(vector: JoystickVector) => void>();
    const onModeSpy = vi.fn<(mode: JoystickControlMode) => void>();

    function ControlledController({ springReturn }: { springReturn: boolean }) {
      const [vec, setVec] = useState<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
      const [mode, setMode] = useState<JoystickControlMode>('analog');

      return (
        <VirtualJoystickPad
          title="Rover Control"
          value={vec}
          mode={mode}
          springReturn={springReturn}
          onChange={(next) => {
            onChangeSpy(next);
            setVec({ x: next.x, y: next.y });
          }}
          onModeChange={(nextMode) => {
            onModeSpy(nextMode);
            setMode(nextMode);
          }}
          data-testid="controlled-root"
        />
      );
    }

    const { rerender } = render(<ControlledController springReturn />);

    expect(screen.getByTestId('joystick-readout-x')).toHaveTextContent('+0.50');
    expect(screen.getByTestId('joystick-readout-y')).toHaveTextContent('+0.50');
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('NE');

    // Controlled analog pointer drag + spring-return
    const gimbal = screen.getByTestId('joystick-gimbal');
    mockGimbalRect(gimbal, 0, 0, 220, 220);
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 190, clientY: 110 });
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      x: 1,
      y: 0,
      magnitude: 1,
      angleDeg: 90,
      direction: 'E',
    });
    fireEvent.pointerUp(window);
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Controlled mode switch to D-Pad
    fireEvent.click(screen.getByTestId('joystick-mode-dpad'));
    expect(onModeSpy).toHaveBeenCalledWith('dpad');
    expect(screen.getByTestId('joystick-dpad-grid')).toBeInTheDocument();

    // Controlled D-Pad pointer press + spring return
    fireEvent.pointerDown(screen.getByTestId('joystick-dpad-up'), { button: 0 });
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      x: 0,
      y: 1,
      magnitude: 1,
      angleDeg: 0,
      direction: 'N',
    });
    fireEvent.pointerUp(window);
    expect(onChangeSpy).toHaveBeenLastCalledWith({
      x: 0,
      y: 0,
      magnitude: 0,
      angleDeg: 0,
      direction: 'CENTER',
    });

    // Syncs springReturn prop change
    rerender(<ControlledController springReturn={false} />);
    expect(screen.getByTestId('joystick-spring-toggle')).toHaveAttribute('aria-pressed', 'false');

    // Controlled keyboard click/Enter updates controlled state
    fireEvent.click(screen.getByTestId('joystick-dpad-right'));
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('E');
  });

  it('sanitizes adversarial NaN/Infinity inputs, renders XSS payloads safely, aborts drag on disable, and blocks all disabled interactions', () => {
    const onChange = vi.fn<(vector: JoystickVector) => void>();
    const onModeChange = vi.fn<(mode: JoystickControlMode) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    const { rerender } = render(
      <VirtualJoystickPad
        title={payload}
        value={{ x: Number.NaN, y: Number.POSITIVE_INFINITY }}
        deadzone={Number.NaN}
        onChange={onChange}
        onModeChange={onModeChange}
        data-testid="adv-root"
      />
    );

    const root = screen.getByTestId('adv-root');
    const gimbal = screen.getByTestId('joystick-gimbal');

    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('joystick-title')).toHaveTextContent(payload);
    expect(screen.getByTestId('joystick-readout-x')).toHaveTextContent('0.00');
    expect(screen.getByTestId('joystick-readout-y')).toHaveTextContent('0.00');
    expect(screen.getByTestId('joystick-readout-dir')).toHaveTextContent('CENTER');

    // Negative zero and -Infinity sanitized cleanly
    rerender(
      <VirtualJoystickPad
        title={payload}
        defaultValue={{ x: -0, y: Number.NEGATIVE_INFINITY }}
        onChange={onChange}
        onModeChange={onModeChange}
        data-testid="adv-root"
      />
    );
    expect(screen.getByTestId('joystick-readout-x')).toHaveTextContent('0.00');
    expect(screen.getByTestId('joystick-readout-y')).toHaveTextContent('0.00');

    // Start analog drag then flip disabled -> true mid-drag
    mockGimbalRect(gimbal, 0, 0, 220, 220);
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 190, clientY: 110 });
    expect(root).toHaveAttribute('data-dragging', 'true');

    rerender(
      <VirtualJoystickPad
        title={payload}
        defaultValue={{ x: 0.5, y: 0 }}
        disabled
        onChange={onChange}
        onModeChange={onModeChange}
        data-testid="adv-root"
      />
    );

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).not.toHaveAttribute('data-dragging');
    expect(gimbal).toHaveAttribute('aria-disabled', 'true');
    expect(gimbal).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('joystick-mode-analog')).toBeDisabled();
    expect(screen.getByTestId('joystick-mode-dpad')).toBeDisabled();
    expect(screen.getByTestId('joystick-spring-toggle')).toBeDisabled();
    expect(screen.getByTestId('joystick-center-btn')).toBeDisabled();

    // All analog interactions blocked while disabled
    const callsWhileDisabled = onChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 30, clientY: 110 });
    fireEvent.pointerDown(gimbal, { button: 0, clientX: 30, clientY: 110 });
    fireEvent.keyDown(gimbal, { key: 'ArrowUp' });
    fireEvent.click(screen.getByTestId('joystick-mode-dpad'));
    expect(onChange).toHaveBeenCalledTimes(callsWhileDisabled);
    expect(onModeChange).not.toHaveBeenCalled();

    // Disabled D-Pad mode blocks pointerDown and keyDown
    rerender(
      <VirtualJoystickPad
        title={payload}
        mode="dpad"
        disabled
        onChange={onChange}
        onModeChange={onModeChange}
        data-testid="adv-root"
      />
    );
    const disabledUp = screen.getByTestId('joystick-dpad-up');
    expect(disabledUp).toBeDisabled();
    fireEvent.pointerDown(disabledUp, { button: 0 });
    fireEvent.keyDown(disabledUp, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(callsWhileDisabled);
  });
});
