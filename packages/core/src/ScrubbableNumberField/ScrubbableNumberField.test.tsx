import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ScrubbableNumberField } from './index';

describe('ScrubbableNumberField', () => {
  it('renders prism-crystal container, data-scrubbing, scrub strip, prism-well input, and optional suffix', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(next: number) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ScrubbableNumberField: { className: 'theme-scrub', style: { minWidth: '180px' } },
          },
        }}
      >
        <ScrubbableNumberField
          ref={ref}
          suffix="px"
          onChange={onChange}
          className="local-scrub"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="scrub-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('scrub-root');
    const strip = screen.getByTestId('scrub-strip');
    const input = screen.getByRole('spinbutton', { name: 'Value' });

    expect(ScrubbableNumberField.displayName).toBe('ScrubbableNumberField');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-scrubbable-number-field',
      'prism-crystal',
      'theme-scrub',
      'local-scrub'
    );
    expect(root).toHaveAttribute('data-scrubbing', 'false');
    expect(root).toHaveStyle({ minWidth: '180px' });
    expect(strip).toHaveClass('cursor-ew-resize');
    expect(input.parentElement).toHaveClass('prism-well');

    expect(input).toHaveValue('24');
    expect(input).toHaveAttribute('aria-valuenow', '24');
    expect(input).toHaveAttribute('aria-valuemin', '-1000');
    expect(input).toHaveAttribute('aria-valuemax', '1000');
    expect(input).toHaveAttribute('aria-valuetext', '24 px');
    expect(screen.getByTestId('scrubbable-suffix')).toHaveTextContent('px');
  });

  it('scrubs horizontally with residual accumulation, Shift 0.1x fine, Alt 10x coarse, pointer capture, and cancel cleanup', () => {
    const onChange = vi.fn<(next: number) => void>();

    render(
      <ScrubbableNumberField
        label="Blur"
        defaultValue={24}
        min={0}
        max={100}
        step={1}
        sensitivity={4}
        precision={1}
        onChange={onChange}
        data-testid="scrub-drag"
      />
    );

    const root = screen.getByTestId('scrub-drag');
    const strip = screen.getByTestId('scrub-strip');
    const input = screen.getByRole('spinbutton', { name: 'Blur' });

    // Non-primary button (right click) is ignored; move/up outside session are ignored
    fireEvent.pointerDown(strip, { clientX: 100, button: 2, pointerId: 1 });
    expect(root).toHaveAttribute('data-scrubbing', 'false');
    fireEvent.pointerMove(strip, { clientX: 140, pointerId: 1 });
    fireEvent.pointerUp(strip, { clientX: 140, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();

    // Start drag without explicit pointerId (uses fallback 0) and without pointerCapture in jsdom
    fireEvent.pointerDown(strip, { clientX: 100 });
    expect(root).toHaveAttribute('data-scrubbing', 'true');

    // Sub-sensitivity 2px move accumulates residual without emitting yet
    fireEvent.pointerMove(strip, { clientX: 102 });
    expect(onChange).not.toHaveBeenCalled();

    // Another +2px crosses 4px sensitivity -> +1 step (25)
    fireEvent.pointerMove(strip, { clientX: 104 });
    expect(onChange).toHaveBeenLastCalledWith(25);
    expect(input).toHaveValue('25');

    // Shift fine drag (+8px = +2 steps * 0.1 = +0.2 -> 25.2)
    fireEvent.pointerMove(strip, { clientX: 112, shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(25.2);
    expect(input).toHaveValue('25.2');

    // Alt coarse drag (+4px = +1 step * 10 = +10 -> 35.2)
    fireEvent.pointerMove(strip, { clientX: 116, altKey: true });
    expect(onChange).toHaveBeenLastCalledWith(35.2);
    expect(input).toHaveValue('35.2');

    // Stray second pointerId is ignored on move and up
    fireEvent.pointerMove(strip, { clientX: 200, pointerId: 9 });
    fireEvent.pointerUp(strip, { clientX: 200, pointerId: 9 });
    expect(root).toHaveAttribute('data-scrubbing', 'true');
    expect(input).toHaveValue('35.2');

    // Clamp cleanly to max=100 and suppress duplicate emissions when hitting max repeatedly
    fireEvent.pointerMove(strip, { clientX: 500, altKey: true });
    expect(onChange).toHaveBeenLastCalledWith(100);
    const callsAtMax = onChange.mock.calls.length;
    fireEvent.pointerMove(strip, { clientX: 600, altKey: true });
    expect(onChange).toHaveBeenCalledTimes(callsAtMax);

    // End drag via pointerUp
    fireEvent.pointerUp(strip, { clientX: 600 });
    expect(root).toHaveAttribute('data-scrubbing', 'false');

    // Verify pointer capture and pointerCancel cleanup when browser capture methods exist
    const setPointerCapture = vi.fn<(id: number) => void>();
    const hasPointerCapture = vi.fn<(id: number) => boolean>(() => true);
    const releasePointerCapture = vi.fn<(id: number) => void>();
    Object.defineProperty(strip, 'setPointerCapture', {
      configurable: true,
      value: setPointerCapture,
    });
    Object.defineProperty(strip, 'hasPointerCapture', {
      configurable: true,
      value: hasPointerCapture,
    });
    Object.defineProperty(strip, 'releasePointerCapture', {
      configurable: true,
      value: releasePointerCapture,
    });

    fireEvent.pointerDown(strip, { clientX: 200, pointerId: 7 });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    expect(root).toHaveAttribute('data-scrubbing', 'true');

    // Drag left (-12px = -3 steps -> 97)
    fireEvent.pointerMove(strip, { clientX: 188, pointerId: 7 });
    expect(onChange).toHaveBeenLastCalledWith(97);

    // Cancel drag releases capture and resets data-scrubbing
    fireEvent.pointerCancel(strip, { clientX: 188, pointerId: 7 });
    expect(hasPointerCapture).toHaveBeenCalledWith(7);
    expect(releasePointerCapture).toHaveBeenCalledWith(7);
    expect(root).toHaveAttribute('data-scrubbing', 'false');
  });

  it('sanitizes inverted/non-finite bounds, sensitivity [1..40], precision, and negative zero', () => {
    const onChange = vi.fn<(next: number) => void>();
    const { rerender } = render(
      <ScrubbableNumberField
        label="Angle"
        min={50}
        max={-50}
        step={0}
        sensitivity={200}
        precision={2}
        defaultValue={-0.001}
        onChange={onChange}
      />
    );

    const strip = screen.getByTestId('scrub-strip');
    const input = screen.getByRole('spinbutton', { name: 'Angle' });
    expect(input).toHaveAttribute('aria-valuemin', '-50');
    expect(input).toHaveAttribute('aria-valuemax', '50');
    expect(input).toHaveAttribute('aria-valuenow', '0');
    expect(input).toHaveValue('0');

    // Sensitivity clamped to max 40px/step
    fireEvent.pointerDown(strip, { clientX: 0, pointerId: 1 });
    fireEvent.pointerMove(strip, { clientX: 39, pointerId: 1 });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.pointerMove(strip, { clientX: 40, pointerId: 1 });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.pointerUp(strip, { clientX: 40, pointerId: 1 });

    // Non-finite min/max/sensitivity/precision fallbacks
    rerender(
      <ScrubbableNumberField
        label="Angle"
        min={Number.NaN}
        max={Number.POSITIVE_INFINITY}
        step={Number.NaN}
        sensitivity={Number.NaN}
        precision={Number.NaN}
        value={10}
        onChange={onChange}
      />
    );
    expect(input).toHaveAttribute('aria-valuemin', '-1000');
    expect(input).toHaveAttribute('aria-valuemax', '1000');
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(11);
  });

  it('supports direct edit, IME-safe Enter/blur commit, invalid revert, and ArrowUp/ArrowDown stepping with modifiers', () => {
    const onChange = vi.fn<(next: number) => void>();

    render(
      <ScrubbableNumberField
        label="Scale"
        defaultValue={10}
        min={0}
        max={100}
        step={2}
        precision={1}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton', { name: 'Scale' });

    // ArrowUp (+2), Shift+ArrowUp (+0.2), Alt+ArrowUp (+20), ArrowDown (-2)
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(12);

    fireEvent.keyDown(input, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith(12.2);

    fireEvent.keyDown(input, { key: 'ArrowUp', altKey: true });
    expect(onChange).toHaveBeenLastCalledWith(32.2);

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(30.2);

    // Unhandled key is ignored
    fireEvent.keyDown(input, { key: 'x' });
    expect(input).toHaveValue('30.2');

    // Direct typing + IME composing Enter MUST NOT commit
    fireEvent.change(input, { target: { value: '48.5' } });
    const callsBeforeIme = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeIme);

    // Standard Enter commits draft
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(48.5);
    expect(input).toHaveValue('48.5');

    // Blurring without draft or with numerically identical draft is no-op
    const callsAfterCommit = onChange.mock.calls.length;
    fireEvent.blur(input);
    fireEvent.change(input, { target: { value: ' 48.5 ' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(callsAfterCommit);
    expect(input).toHaveValue('48.5');

    // Valid blur commit
    fireEvent.change(input, { target: { value: '75' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(75);
    expect(input).toHaveValue('75');

    // Invalid / empty / overflow draft reverts cleanly
    const callsBeforeInvalid = onChange.mock.calls.length;
    fireEvent.change(input, { target: { value: 'NaN' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('75');

    fireEvent.change(input, { target: { value: '9'.repeat(400) } });
    fireEvent.blur(input);
    expect(input).toHaveValue('75');
    expect(onChange).toHaveBeenCalledTimes(callsBeforeInvalid);

    // Stepping while holding valid vs invalid draft
    fireEvent.change(input, { target: { value: '80' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(82);

    fireEvent.change(input, { target: { value: 'bad' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(80);

    // ArrowUp at max does not emit duplicate onChange
    fireEvent.change(input, { target: { value: '100' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    const callsAtMax = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledTimes(callsAtMax);
  });

  it('supports controlled value updates via both scrubbing and keyboard input', () => {
    function ControlledHarness() {
      const [val, setVal] = useState(20);
      return (
        <ScrubbableNumberField
          label="Offset"
          value={val}
          onChange={setVal}
          sensitivity={4}
          suffix="px"
        />
      );
    }

    render(<ControlledHarness />);
    const strip = screen.getByTestId('scrub-strip');
    const input = screen.getByRole('spinbutton', { name: 'Offset' });

    fireEvent.pointerDown(strip, { clientX: 10, pointerId: 1 });
    fireEvent.pointerMove(strip, { clientX: 22, pointerId: 1 });
    fireEvent.pointerUp(strip, { clientX: 22, pointerId: 1 });
    expect(input).toHaveValue('23');

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(input).toHaveValue('22');
  });

  it('blocks scrubbing and editing when disabled (negative test)', () => {
    const onChange = vi.fn<(next: number) => void>();
    const { rerender } = render(
      <ScrubbableNumberField
        label="Locked"
        defaultValue={24}
        onChange={onChange}
        disabled
        data-testid="disabled-scrub"
      />
    );

    const root = screen.getByTestId('disabled-scrub');
    const strip = screen.getByTestId('scrub-strip');
    const input = screen.getByRole('spinbutton', { name: 'Locked' });

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('data-scrubbing', 'false');
    expect(strip).toHaveClass('cursor-not-allowed');
    expect(input).toBeDisabled();

    fireEvent.pointerDown(strip, { clientX: 50, pointerId: 1 });
    fireEvent.pointerMove(strip, { clientX: 90, pointerId: 1 });
    fireEvent.pointerUp(strip, { clientX: 90, pointerId: 1 });
    fireEvent.change(input, { target: { value: '88' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).not.toHaveBeenCalled();

    // Disable mid-edit before blur must not commit draft
    rerender(
      <ScrubbableNumberField
        label="Locked"
        defaultValue={24}
        onChange={onChange}
        disabled={false}
        data-testid="disabled-scrub"
      />
    );
    fireEvent.change(input, { target: { value: '50' } });
    rerender(
      <ScrubbableNumberField
        label="Locked"
        defaultValue={24}
        onChange={onChange}
        disabled
        data-testid="disabled-scrub"
      />
    );
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads in label, suffix, and typed draft as inert literal text', () => {
    const payload = '<script>window.__scrubXss=1</script><img src=x onerror=alert(1)>';
    render(<ScrubbableNumberField label={payload} suffix={payload} />);

    const input = screen.getByRole('spinbutton', { name: payload });
    fireEvent.change(input, { target: { value: payload } });
    fireEvent.blur(input);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(payload, { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByTestId('scrubbable-suffix')).toHaveTextContent(payload);
    expect(input).toHaveValue('24');
  });
});
