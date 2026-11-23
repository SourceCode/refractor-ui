import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ThermostatDial, type ThermostatMode, type ThermostatUnit } from './index';

function mockDialRect(element: HTMLElement, width = 240, height = 240): void {
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    toJSON: () => ({}),
  });
}

describe('ThermostatDial', () => {
  it('renders default optical dial, 270deg SVG track, ambient vs target readouts, theme override, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ThermostatDial: {
              className: 'theme-thermostat',
              style: { maxWidth: '380px' },
            },
          },
        }}
      >
        <ThermostatDial
          ref={ref}
          title="Living Room"
          className="local-thermostat"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ padding: '18px' }}
          data-testid="thermostat-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('thermostat-root');
    const slider = screen.getByRole('slider', { name: 'Living Room target temperature' });
    const svg = screen.getByTestId('thermostat-dial-svg');
    const activeArc = screen.getByTestId('thermostat-dial-active-arc');
    const thumbDisc = screen.getByTestId('thermostat-dial-thumb-disc');
    const ticks = screen.getByTestId('thermostat-dial-ticks').querySelectorAll('line');

    expect(ThermostatDial.displayName).toBe('ThermostatDial');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-thermostat-dial',
      'prism-slab',
      'theme-thermostat',
      'local-thermostat'
    );
    expect(root).toHaveAttribute('data-mode', 'cooling');
    expect(root).toHaveAttribute('data-unit', 'F');
    expect(root).toHaveStyle({ maxWidth: '380px', padding: '18px' });

    expect(svg).toHaveAttribute('viewBox', '0 0 240 240');
    expect(ticks).toHaveLength(37);
    expect(activeArc).toHaveAttribute('stroke', 'var(--prism-info-main)');
    expect(activeArc).toHaveAttribute('stroke-opacity', '1');
    // 70F is exact midpoint of [50..90] -> 270deg (12 o'clock) -> (120, 28)
    expect(thumbDisc).toHaveAttribute('cx', '120');
    expect(thumbDisc).toHaveAttribute('cy', '28');
    expect(thumbDisc).toHaveAttribute('stroke', 'var(--prism-info-main)');
    expect(screen.getByTestId('thermostat-dial-ambient-marker')).toBeInTheDocument();

    expect(slider).toHaveAttribute('aria-valuemin', '50');
    expect(slider).toHaveAttribute('aria-valuemax', '90');
    expect(slider).toHaveAttribute('aria-valuenow', '70');
    expect(slider).toHaveAttribute('aria-valuetext', '70°F, Cooling, Ambient 73°F');
    expect(slider).toHaveAttribute('tabindex', '0');

    expect(screen.getByTestId('thermostat-title')).toHaveTextContent('Living Room');
    expect(screen.getByTestId('thermostat-range-badge')).toHaveTextContent('50°–90°F');
    expect(screen.getByTestId('thermostat-mode-badge')).toHaveTextContent('COOLING');
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('70°F');
    expect(screen.getByTestId('thermostat-ambient-readout')).toHaveTextContent('Ambient 73°F');

    const summary = screen.getByTestId('thermostat-summary');
    expect(summary).toHaveAttribute('aria-live', 'polite');
    expect(summary).toHaveTextContent('Cooling to 70°F · Ambient 73°F (3°F above target)');
  });

  it('cycles all 4 semantic optical modes, updates summaries, and locks steppers/drag/keyboard in off mode', () => {
    const onModeChange = vi.fn<(next: ThermostatMode) => void>();
    const onTargetChange = vi.fn<(next: number) => void>();

    render(
      <ThermostatDial
        defaultTargetTempF={75}
        ambientTempF={72}
        onModeChange={onModeChange}
        onTargetChange={onTargetChange}
        data-testid="mode-root"
      />
    );

    const root = screen.getByTestId('mode-root');
    const slider = screen.getByTestId('thermostat-dial-slider');
    const activeArc = screen.getByTestId('thermostat-dial-active-arc');
    const stepDown = screen.getByRole('button', { name: 'Decrease target temperature' });
    const stepUp = screen.getByRole('button', { name: 'Increase target temperature' });

    // Cooling standby because ambient (72) < target (75)
    expect(screen.getByTestId('thermostat-summary')).toHaveTextContent(
      'Cooling standby · Target 75°F · Ambient 72°F'
    );

    // Clicking already-active Cooling pill does not emit duplicate callback
    fireEvent.click(screen.getByTestId('thermostat-mode-cooling'));
    expect(onModeChange).not.toHaveBeenCalled();

    // Switch to Heating (active: ambient 72 < target 75 -> 3F below target)
    fireEvent.click(screen.getByTestId('thermostat-mode-heating'));
    expect(onModeChange).toHaveBeenLastCalledWith('heating');
    expect(root).toHaveAttribute('data-mode', 'heating');
    expect(activeArc).toHaveAttribute('stroke', 'var(--prism-primary-main)');
    expect(screen.getByTestId('thermostat-mode-badge')).toHaveTextContent('HEATING');
    expect(screen.getByTestId('thermostat-mode-heating')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('thermostat-summary')).toHaveTextContent(
      'Heating to 75°F · Ambient 72°F (3°F below target)'
    );

    // Lower target to 70 so heating enters standby (ambient 72 > target 70)
    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(screen.getByTestId('thermostat-summary')).toHaveTextContent(
      'Heating standby · Target 70°F · Ambient 72°F'
    );

    // Switch to Eco
    fireEvent.click(screen.getByTestId('thermostat-mode-eco'));
    expect(onModeChange).toHaveBeenLastCalledWith('eco');
    expect(activeArc).toHaveAttribute('stroke', 'var(--prism-success-main)');
    expect(screen.getByTestId('thermostat-mode-badge')).toHaveTextContent('ECO');
    expect(screen.getByTestId('thermostat-summary')).toHaveTextContent(
      'Eco mode · Target 70°F · Ambient 72°F'
    );

    // Switch to Off
    fireEvent.click(screen.getByTestId('thermostat-mode-off'));
    expect(onModeChange).toHaveBeenLastCalledWith('off');
    expect(root).toHaveAttribute('data-mode', 'off');
    expect(activeArc).toHaveAttribute('stroke', 'var(--prism-text-muted, var(--prism-text-disabled))');
    expect(activeArc).toHaveAttribute('stroke-opacity', '0.35');
    expect(screen.getByTestId('thermostat-mode-badge')).toHaveTextContent('OFF');
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('--');
    expect(screen.getByTestId('thermostat-ambient-readout')).toHaveTextContent('Ambient 72°F');
    expect(screen.getByTestId('thermostat-summary')).toHaveTextContent(
      'Thermostat off · Ambient 72°F'
    );
    expect(slider).toHaveAttribute('tabindex', '-1');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('aria-valuetext', 'Off, Ambient 72°F');
    expect(stepDown).toBeDisabled();
    expect(stepUp).toBeDisabled();

    // Pointer drag and keyboard adjustments are blocked while off
    const targetCallsBeforeOff = onTargetChange.mock.calls.length;
    mockDialRect(slider);
    fireEvent.pointerDown(slider, { button: 0, clientX: 220, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 220, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 220, clientY: 220, pointerId: 1 });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onTargetChange).toHaveBeenCalledTimes(targetCallsBeforeOff);

    // Turning back on restores target cleanly without losing setpoint
    fireEvent.click(screen.getByTestId('thermostat-mode-cooling'));
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('70°F');
    expect(stepDown).toBeEnabled();
    expect(stepUp).toBeEnabled();
  });

  it('converts °F and °C without drift and steps cleanly by 1°C / 5°C', () => {
    const onTargetChange = vi.fn<(next: number) => void>();
    const onUnitChange = vi.fn<(next: ThermostatUnit) => void>();

    render(
      <ThermostatDial
        defaultTargetTempF={70}
        ambientTempF={73}
        onTargetChange={onTargetChange}
        onUnitChange={onUnitChange}
      />
    );

    const slider = screen.getByTestId('thermostat-dial-slider');
    const unitF = screen.getByTestId('thermostat-unit-f');
    const unitC = screen.getByTestId('thermostat-unit-c');
    const stepUp = screen.getByRole('button', { name: 'Increase target temperature' });
    const stepDown = screen.getByRole('button', { name: 'Decrease target temperature' });

    expect(unitF).toHaveAttribute('aria-pressed', 'true');
    expect(unitC).toHaveAttribute('aria-pressed', 'false');

    // Clicking already-active F does not emit duplicate callback
    fireEvent.click(unitF);
    expect(onUnitChange).not.toHaveBeenCalled();

    // Switch to Celsius: 70F -> 21C, 73F -> 23C, [50..90]F -> [10..32]C
    fireEvent.click(unitC);
    expect(onUnitChange).toHaveBeenCalledWith('C');
    expect(unitC).toHaveAttribute('aria-pressed', 'true');
    expect(unitF).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('21°C');
    expect(screen.getByTestId('thermostat-ambient-readout')).toHaveTextContent('Ambient 23°C');
    expect(screen.getByTestId('thermostat-range-badge')).toHaveTextContent('10°–32°C');
    expect(slider).toHaveAttribute('aria-valuemin', '10');
    expect(slider).toHaveAttribute('aria-valuemax', '32');
    expect(slider).toHaveAttribute('aria-valuenow', '21');

    // Toggle back to F and C repeatedly -> zero drift (always 70F <-> 21C)
    fireEvent.click(unitF);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('70°F');
    fireEvent.click(unitC);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('21°C');

    // Step +1°C -> 22°C (canonical 72°F)
    fireEvent.click(stepUp);
    expect(onTargetChange).toHaveBeenLastCalledWith(72);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('22°C');

    // Step -1°C -> 21°C (canonical 70°F)
    fireEvent.click(stepDown);
    expect(onTargetChange).toHaveBeenLastCalledWith(70);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('21°C');

    // Keyboard PageUp in °C (+5°C -> 26°C, canonical 79°F) and PageDown (-5°C -> 21°C, 70°F)
    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(onTargetChange).toHaveBeenLastCalledWith(79);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('26°C');

    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onTargetChange).toHaveBeenLastCalledWith(70);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('21°C');
  });

  it('supports -/+ fine steppers, boundary clamping, and min/max button disabled states', () => {
    const onTargetChange = vi.fn<(next: number) => void>();

    render(
      <ThermostatDial
        minTempF={68}
        maxTempF={70}
        defaultTargetTempF={69}
        onTargetChange={onTargetChange}
      />
    );

    const stepDown = screen.getByRole('button', { name: 'Decrease target temperature' });
    const stepUp = screen.getByRole('button', { name: 'Increase target temperature' });

    expect(stepDown).toBeEnabled();
    expect(stepUp).toBeEnabled();

    fireEvent.click(stepDown);
    expect(onTargetChange).toHaveBeenLastCalledWith(68);
    expect(stepDown).toBeDisabled();
    expect(screen.getByTestId('thermostat-dial-active-arc')).toHaveAttribute('stroke-opacity', '0');

    // Also confirm off-mode at min keeps active arc stroke-opacity 0
    fireEvent.click(screen.getByTestId('thermostat-mode-off'));
    expect(screen.getByTestId('thermostat-dial-active-arc')).toHaveAttribute('stroke-opacity', '0');
    fireEvent.click(screen.getByTestId('thermostat-mode-cooling'));

    fireEvent.click(stepUp);
    fireEvent.click(stepUp);
    expect(onTargetChange).toHaveBeenLastCalledWith(70);
    expect(stepUp).toBeDisabled();
  });

  it('handles radial pointer drag around dial center, deadzone clamping, stray pointers, pointercancel, mode/disabled interruption, and unmount cleanup', () => {
    const onTargetChange = vi.fn<(next: number) => void>();
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const { rerender, unmount } = render(
      <ThermostatDial
        minTempF={50}
        maxTempF={90}
        defaultTargetTempF={70}
        onTargetChange={onTargetChange}
        data-testid="drag-root"
      />
    );

    const root = screen.getByTestId('drag-root');
    const slider = screen.getByTestId('thermostat-dial-slider');
    mockDialRect(slider, 240, 240);

    // Non-primary mouse button (right click) is ignored
    fireEvent.pointerDown(slider, { button: 2, clientX: 220, clientY: 120, pointerId: 1 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(onTargetChange).not.toHaveBeenCalled();

    // Pointer down directly on center (120, 120) starts session without jumping value
    fireEvent.pointerDown(slider, { button: 0, clientX: 120, clientY: 120, pointerId: 1 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    expect(slider).toHaveClass('cursor-grabbing');
    expect(onTargetChange).not.toHaveBeenCalled();

    // Stray pointerId move and up are ignored while pointerId 1 is active
    fireEvent.pointerMove(window, { clientX: 220, clientY: 220, pointerId: 99 });
    fireEvent.pointerUp(window, { clientX: 220, clientY: 220, pointerId: 99 });
    expect(onTargetChange).not.toHaveBeenCalled();
    expect(root).toHaveAttribute('data-dragging', 'true');

    // Bottom-left (135deg) -> minTempF (50)
    fireEvent.pointerMove(window, { clientX: 20, clientY: 220, pointerId: 1 });
    expect(onTargetChange).toHaveBeenLastCalledWith(50);

    // Duplicate same-temp move does not re-emit
    const callsAt50 = onTargetChange.mock.calls.length;
    fireEvent.pointerMove(window, { clientX: 20, clientY: 220, pointerId: 1 });
    expect(onTargetChange).toHaveBeenCalledTimes(callsAt50);

    // Right (0deg -> 360deg -> 225/270 of 40 = 33.33 -> 83F)
    fireEvent.pointerMove(window, { clientX: 220, clientY: 120, pointerId: 1 });
    expect(onTargetChange).toHaveBeenLastCalledWith(83);

    // Bottom-right deadzone (~84deg) -> clamps to maxTempF (90)
    fireEvent.pointerMove(window, { clientX: 130, clientY: 220, pointerId: 1 });
    expect(onTargetChange).toHaveBeenLastCalledWith(90);

    // Bottom-left deadzone (~96deg) -> clamps to minTempF (50)
    fireEvent.pointerMove(window, { clientX: 110, clientY: 220, pointerId: 1 });
    expect(onTargetChange).toHaveBeenLastCalledWith(50);

    // Top-center (270deg) -> 70F
    fireEvent.pointerMove(window, { clientX: 120, clientY: 20, pointerId: 1 });
    expect(onTargetChange).toHaveBeenLastCalledWith(70);

    // Pointer release cleans up listeners
    fireEvent.pointerUp(window, { clientX: 120, clientY: 20, pointerId: 1 });
    expect(root).not.toHaveAttribute('data-dragging');
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    // Pointer cancel also cleans up listeners
    fireEvent.pointerDown(slider, { button: 0, clientX: 220, clientY: 220, pointerId: 2 });
    expect(onTargetChange).toHaveBeenLastCalledWith(90);
    expect(root).toHaveAttribute('data-dragging', 'true');
    fireEvent.pointerCancel(window, { pointerId: 2 });
    expect(root).not.toHaveAttribute('data-dragging');

    // Mid-drag transition to mode='off' detaches window listeners immediately
    removeSpy.mockClear();
    fireEvent.pointerDown(slider, { button: 0, clientX: 120, clientY: 20, pointerId: 3 });
    expect(root).toHaveAttribute('data-dragging', 'true');
    rerender(
      <ThermostatDial
        minTempF={50}
        maxTempF={90}
        mode="off"
        onTargetChange={onTargetChange}
        data-testid="drag-root"
      />
    );
    expect(root).not.toHaveAttribute('data-dragging');
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));

    // Mid-drag transition to disabled=true detaches window listeners immediately
    rerender(
      <ThermostatDial
        minTempF={50}
        maxTempF={90}
        mode="cooling"
        onTargetChange={onTargetChange}
        data-testid="drag-root"
      />
    );
    mockDialRect(screen.getByTestId('thermostat-dial-slider'), 240, 240);
    removeSpy.mockClear();
    fireEvent.pointerDown(screen.getByTestId('thermostat-dial-slider'), {
      button: 0,
      clientX: 120,
      clientY: 20,
      pointerId: 4,
    });
    expect(root).toHaveAttribute('data-dragging', 'true');
    rerender(
      <ThermostatDial
        minTempF={50}
        maxTempF={90}
        mode="cooling"
        disabled
        onTargetChange={onTargetChange}
        data-testid="drag-root"
      />
    );
    expect(root).not.toHaveAttribute('data-dragging');
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));

    // Re-enable, start drag, then unmount mid-drag -> cleans up window listeners
    rerender(
      <ThermostatDial
        minTempF={50}
        maxTempF={90}
        mode="cooling"
        onTargetChange={onTargetChange}
        data-testid="drag-root"
      />
    );
    mockDialRect(screen.getByTestId('thermostat-dial-slider'), 240, 240);
    removeSpy.mockClear();
    fireEvent.pointerDown(screen.getByTestId('thermostat-dial-slider'), {
      button: 0,
      clientX: 220,
      clientY: 120,
      pointerId: 5,
    });
    expect(addSpy).toHaveBeenCalledWith('pointermove', expect.any(Function), { passive: true });
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointerup', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointercancel', expect.any(Function));

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('guards zero-size bounding rect during pointer drag without throwing or emitting NaN', () => {
    const onTargetChange = vi.fn<(next: number) => void>();
    render(<ThermostatDial onTargetChange={onTargetChange} />);
    const slider = screen.getByTestId('thermostat-dial-slider');
    mockDialRect(slider, 0, 0);

    fireEvent.pointerDown(slider, { button: 0, clientX: 50, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 100, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 10, pointerId: 1 });
    expect(onTargetChange).not.toHaveBeenCalled();
  });

  it('supports Arrow/PageUp/PageDown/Home/End keyboard controls with IME and modifier guards', () => {
    const onTargetChange = vi.fn<(next: number) => void>();

    render(
      <ThermostatDial
        minTempF={50}
        maxTempF={90}
        defaultTargetTempF={70}
        onTargetChange={onTargetChange}
      />
    );

    const slider = screen.getByTestId('thermostat-dial-slider');

    // IME composing, modifier chords, and unrelated keys are ignored
    fireEvent.keyDown(slider, { key: 'ArrowUp', isComposing: true });
    fireEvent.keyDown(slider, { key: 'ArrowUp', ctrlKey: true });
    fireEvent.keyDown(slider, { key: 'ArrowUp', metaKey: true });
    fireEvent.keyDown(slider, { key: 'ArrowUp', altKey: true });
    fireEvent.keyDown(slider, { key: 'Tab' });
    expect(onTargetChange).not.toHaveBeenCalled();

    fireEvent.keyDown(slider, { key: 'ArrowUp' });
    expect(onTargetChange).toHaveBeenLastCalledWith(71);

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(onTargetChange).toHaveBeenLastCalledWith(72);

    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onTargetChange).toHaveBeenLastCalledWith(71);

    fireEvent.keyDown(slider, { key: 'ArrowLeft' });
    expect(onTargetChange).toHaveBeenLastCalledWith(70);

    fireEvent.keyDown(slider, { key: 'PageUp' });
    expect(onTargetChange).toHaveBeenLastCalledWith(75);

    fireEvent.keyDown(slider, { key: 'PageDown' });
    expect(onTargetChange).toHaveBeenLastCalledWith(70);

    fireEvent.keyDown(slider, { key: 'Home' });
    expect(onTargetChange).toHaveBeenLastCalledWith(50);

    // Repeating ArrowDown at min does not emit duplicate callback
    const countAtMin = onTargetChange.mock.calls.length;
    fireEvent.keyDown(slider, { key: 'ArrowDown' });
    expect(onTargetChange).toHaveBeenCalledTimes(countAtMin);

    fireEvent.keyDown(slider, { key: 'End' });
    expect(onTargetChange).toHaveBeenLastCalledWith(90);
  });

  it('sanitizes NaN, Infinity, -0, inverted bounds, degenerate min===max bounds, and blank titles', () => {
    const onTargetChange = vi.fn<(next: number) => void>();

    const { rerender } = render(
      <ThermostatDial
        title="   "
        minTempF={Number.NaN}
        maxTempF={Number.POSITIVE_INFINITY}
        defaultTargetTempF={Number.NaN}
        ambientTempF={Number.NEGATIVE_INFINITY}
      />
    );

    const slider = screen.getByTestId('thermostat-dial-slider');
    expect(screen.getByTestId('thermostat-title')).toHaveTextContent('Climate Control');
    expect(slider).toHaveAttribute('aria-valuemin', '50');
    expect(slider).toHaveAttribute('aria-valuemax', '90');
    expect(slider).toHaveAttribute('aria-valuenow', '70');
    expect(screen.getByTestId('thermostat-ambient-readout')).toHaveTextContent('Ambient 73°F');

    // Inverted bounds (85..55 -> normalized 55..85)
    rerender(
      <ThermostatDial
        minTempF={85}
        maxTempF={55}
        targetTempF={99}
        ambientTempF={40}
      />
    );
    expect(slider).toHaveAttribute('aria-valuemin', '55');
    expect(slider).toHaveAttribute('aria-valuemax', '85');
    expect(slider).toHaveAttribute('aria-valuenow', '85');
    expect(screen.getByTestId('thermostat-ambient-readout')).toHaveTextContent('Ambient 40°F');

    // Negative zero normalization and 32F -> 0C conversion
    rerender(
      <ThermostatDial
        minTempF={-0}
        maxTempF={32}
        targetTempF={-0}
        ambientTempF={32}
        unit="C"
      />
    );
    expect(screen.getByTestId('thermostat-ambient-readout')).toHaveTextContent('Ambient 0°C');

    // Degenerate zero-span bounds (min === max)
    rerender(
      <ThermostatDial
        minTempF={72}
        maxTempF={72}
        targetTempF={72}
        ambientTempF={72}
        onTargetChange={onTargetChange}
      />
    );
    expect(screen.getByRole('button', { name: 'Decrease target temperature' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increase target temperature' })).toBeDisabled();
    mockDialRect(slider, 240, 240);
    fireEvent.pointerDown(slider, { button: 0, clientX: 220, clientY: 120, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 220, clientY: 120, pointerId: 1 });
    expect(onTargetChange).not.toHaveBeenCalled();
  });

  it('supports fully controlled targetTempF, mode, and unit (including drag updates)', () => {
    const onTargetChange = vi.fn<(next: number) => void>();
    const onModeChange = vi.fn<(next: ThermostatMode) => void>();
    const onUnitChange = vi.fn<(next: ThermostatUnit) => void>();

    function ControlledHarness() {
      const [tempF, setTempF] = useState<number>(68);
      const [mode, setMode] = useState<ThermostatMode>('heating');
      const [unit, setUnit] = useState<ThermostatUnit>('F');

      return (
        <ThermostatDial
          title="Studio Zone"
          targetTempF={tempF}
          ambientTempF={65}
          mode={mode}
          unit={unit}
          onTargetChange={(next) => {
            onTargetChange(next);
            setTempF(next);
          }}
          onModeChange={(next) => {
            onModeChange(next);
            setMode(next);
          }}
          onUnitChange={(next) => {
            onUnitChange(next);
            setUnit(next);
          }}
        />
      );
    }

    render(<ControlledHarness />);

    const slider = screen.getByTestId('thermostat-dial-slider');
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('68°F');
    expect(screen.getByTestId('thermostat-mode-badge')).toHaveTextContent('HEATING');

    // Controlled pointer drag updates via parent state
    mockDialRect(slider, 240, 240);
    fireEvent.pointerDown(slider, { button: 0, clientX: 120, clientY: 20, pointerId: 7 });
    fireEvent.pointerUp(window, { clientX: 120, clientY: 20, pointerId: 7 });
    expect(onTargetChange).toHaveBeenLastCalledWith(70);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('70°F');

    // Controlled mode and unit transitions
    fireEvent.click(screen.getByTestId('thermostat-mode-eco'));
    expect(onModeChange).toHaveBeenCalledWith('eco');
    expect(screen.getByTestId('thermostat-mode-badge')).toHaveTextContent('ECO');

    fireEvent.click(screen.getByTestId('thermostat-unit-c'));
    expect(onUnitChange).toHaveBeenCalledWith('C');
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('21°C');

    // Controlled stepper click
    fireEvent.click(screen.getByRole('button', { name: 'Increase target temperature' }));
    expect(onTargetChange).toHaveBeenLastCalledWith(72);
    expect(screen.getByTestId('thermostat-target-readout')).toHaveTextContent('22°C');
  });

  it('blocks all interactions when disabled and safely neutralizes XSS payloads', () => {
    const onTargetChange = vi.fn<(next: number) => void>();
    const onModeChange = vi.fn<(next: ThermostatMode) => void>();
    const onUnitChange = vi.fn<(next: ThermostatUnit) => void>();
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';

    render(
      <ThermostatDial
        title={payload}
        disabled
        onTargetChange={onTargetChange}
        onModeChange={onModeChange}
        onUnitChange={onUnitChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    const slider = screen.getByTestId('thermostat-dial-slider');

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('aria-disabled', 'true');
    expect(slider).toHaveAttribute('tabindex', '-1');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByTestId('thermostat-title')).toHaveTextContent(payload);

    mockDialRect(slider, 240, 240);
    fireEvent.pointerDown(slider, { button: 0, clientX: 220, clientY: 120, pointerId: 1 });
    fireEvent.pointerMove(window, { clientX: 220, clientY: 220, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 220, clientY: 220, pointerId: 1 });
    fireEvent.keyDown(slider, { key: 'ArrowUp' });

    fireEvent.click(screen.getByRole('button', { name: 'Decrease target temperature' }));
    fireEvent.click(screen.getByRole('button', { name: 'Increase target temperature' }));
    fireEvent.click(screen.getByTestId('thermostat-mode-heating'));
    fireEvent.click(screen.getByTestId('thermostat-unit-c'));

    expect(onTargetChange).not.toHaveBeenCalled();
    expect(onModeChange).not.toHaveBeenCalled();
    expect(onUnitChange).not.toHaveBeenCalled();
  });
});
