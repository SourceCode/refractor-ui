import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { NumericStepper, type NumericStepperSize } from './index';

describe('NumericStepper', () => {
  it('renders prism-well spinbutton flanked by prism-crystal buttons with theme overrides, ref, and defaults', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(next: number) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            NumericStepper: { className: 'theme-stepper', style: { width: '240px' } },
          },
        }}
      >
        <NumericStepper
          ref={ref}
          onChange={onChange}
          className="local-stepper"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="stepper-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('stepper-root');
    const input = screen.getByRole('spinbutton', { name: 'Numeric value' });
    const decBtn = screen.getByRole('button', { name: 'Decrement' });
    const incBtn = screen.getByRole('button', { name: 'Increment' });

    expect(NumericStepper.displayName).toBe('NumericStepper');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-numeric-stepper', 'theme-stepper', 'local-stepper');
    expect(root).toHaveAttribute('data-size', 'md');
    expect(root).toHaveStyle({ width: '240px' });

    expect(decBtn).toHaveClass('prism-crystal');
    expect(incBtn).toHaveClass('prism-crystal');
    expect(input.parentElement).toHaveClass('prism-well');

    expect(input).toHaveValue('1');
    expect(input).toHaveAttribute('aria-valuenow', '1');
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '100');
    expect(decBtn).toBeEnabled();
    expect(incBtn).toBeEnabled();

    // Decrement down to min=0 disables Decrement
    fireEvent.click(decBtn);
    expect(onChange).toHaveBeenLastCalledWith(0);
    expect(input).toHaveValue('0');
    expect(decBtn).toBeDisabled();
    expect(root).toHaveAttribute('data-at-min', 'true');

    // Increment back up to 1
    fireEvent.click(incBtn);
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(input).toHaveValue('1');
    expect(decBtn).toBeEnabled();
  });

  it('supports size variants, visible label association, unit badge, and disables buttons at boundaries', () => {
    const sizes: NumericStepperSize[] = ['sm', 'md', 'lg'];
    const { rerender } = render(
      <NumericStepper
        label="Opacity"
        unit="%"
        size={sizes[0]}
        min={0}
        max={2}
        defaultValue={2}
        data-testid="sized-stepper"
      />
    );

    const root = screen.getByTestId('sized-stepper');
    expect(root).toHaveAttribute('data-size', 'sm');
    expect(root).toHaveAttribute('data-at-max', 'true');
    expect(screen.getByTestId('numeric-stepper-unit')).toHaveTextContent('%');

    const input = screen.getByRole('spinbutton', { name: 'Opacity' });
    expect(input).toHaveAttribute('aria-valuetext', '2 %');
    expect(screen.getByRole('button', { name: 'Increment' })).toBeDisabled();

    rerender(
      <NumericStepper
        label="Opacity"
        unit="%"
        size={sizes[2]}
        min={0}
        max={2}
        defaultValue={2}
        data-testid="sized-stepper"
      />
    );
    expect(screen.getByTestId('sized-stepper')).toHaveAttribute('data-size', 'lg');
  });

  it('sanitizes inverted/non-finite bounds, non-positive steps, and rounds with explicit or inferred precision', () => {
    const onChange = vi.fn<(next: number) => void>();

    // Inverted min/max (10..0 -> 0..10), explicit precision=2, step=0.1 (IEEE-754 0.1 + 0.2 -> 0.3)
    const { rerender } = render(
      <NumericStepper
        min={10}
        max={0}
        step={0.1}
        precision={2}
        defaultValue={0.1}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '10');
    expect(input).toHaveValue('0.10');

    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(onChange).toHaveBeenLastCalledWith(0.2);
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(onChange).toHaveBeenLastCalledWith(0.3);
    expect(input).toHaveValue('0.30');

    // Negative zero normalization
    rerender(
      <NumericStepper
        min={-1}
        max={1}
        step={0.1}
        precision={1}
        value={-0.01}
        onChange={onChange}
      />
    );
    expect(input).toHaveAttribute('aria-valuenow', '0');
    expect(input).toHaveValue('0.0');

    // Inferred precision from standard decimal step and non-finite fallback props
    rerender(
      <NumericStepper
        min={Number.NaN}
        max={Number.POSITIVE_INFINITY}
        step={0.25}
        precision={Number.NaN}
        value={1}
        onChange={onChange}
      />
    );
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '100');
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(onChange).toHaveBeenLastCalledWith(1.25);

    // Scientific notation steps (with and without mantissa decimal) + non-positive step fallback
    rerender(<NumericStepper min={0} max={1} step={1e-7} value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(onChange).toHaveBeenLastCalledWith(0.0000001);

    rerender(<NumericStepper min={0} max={1} step={2.5e-7} value={0} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(onChange).toHaveBeenLastCalledWith(0.00000025);

    rerender(<NumericStepper min={0} max={10} step={-5} value={3} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(onChange).toHaveBeenLastCalledWith(4);
  });

  it('handles full spinbutton keyboard navigation, IME-safe Enter commit, and blur revert on invalid input', () => {
    const onChange = vi.fn<(next: number) => void>();

    render(
      <NumericStepper
        label="Threads"
        min={0}
        max={100}
        step={2}
        defaultValue={10}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton', { name: 'Threads' });

    // ArrowUp (+2)
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(12);
    expect(input).toHaveValue('12');

    // ArrowDown (-2)
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(10);

    // PageUp (+20)
    fireEvent.keyDown(input, { key: 'PageUp' });
    expect(onChange).toHaveBeenLastCalledWith(30);

    // PageDown (-20)
    fireEvent.keyDown(input, { key: 'PageDown' });
    expect(onChange).toHaveBeenLastCalledWith(10);

    // End (max=100)
    fireEvent.keyDown(input, { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith(100);

    // ArrowUp at max should not emit duplicate onChange
    const callsAtMax = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledTimes(callsAtMax);

    // Home (min=0)
    fireEvent.keyDown(input, { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith(0);

    // Unhandled key does nothing
    fireEvent.keyDown(input, { key: 'a' });
    expect(input).toHaveValue('0');

    // Typing valid number + IME composing Enter MUST NOT commit
    fireEvent.change(input, { target: { value: '42' } });
    const callsBeforeIme = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onChange).toHaveBeenCalledTimes(callsBeforeIme);
    expect(input).toHaveValue('42');

    // Standard Enter commits typed numeric draft
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith(42);
    expect(input).toHaveValue('42');

    // Pressing Enter or blurring without an active draft is a clean no-op
    const callsAfterEnter = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(callsAfterEnter);

    // Typing numerically equivalent value (with whitespace) and blurring does not fire duplicate onChange
    fireEvent.change(input, { target: { value: ' 42 ' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(callsAfterEnter);
    expect(input).toHaveValue('42');

    // Typing valid value and blurring commits
    fireEvent.change(input, { target: { value: '55' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(55);
    expect(input).toHaveValue('55');

    // Typing invalid/NaN/empty/overflow text reverts cleanly on blur
    const callsBeforeInvalid = onChange.mock.calls.length;
    fireEvent.change(input, { target: { value: 'not-a-number' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('55');
    expect(onChange).toHaveBeenCalledTimes(callsBeforeInvalid);

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('55');

    fireEvent.change(input, { target: { value: '9'.repeat(400) } });
    fireEvent.blur(input);
    expect(input).toHaveValue('55');
    expect(onChange).toHaveBeenCalledTimes(callsBeforeInvalid);

    // ArrowUp while holding a valid draft steps from draft; invalid draft falls back to current
    fireEvent.change(input, { target: { value: '60' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith(62);

    fireEvent.change(input, { target: { value: 'oops' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith(60);
  });

  it('supports controlled value updates cleanly', () => {
    function ControlledHarness() {
      const [val, setVal] = useState(5);
      return <NumericStepper label="Workers" value={val} onChange={setVal} min={1} max={10} />;
    }

    render(<ControlledHarness />);
    const input = screen.getByRole('spinbutton', { name: 'Workers' });
    expect(input).toHaveValue('5');

    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    expect(input).toHaveValue('6');

    fireEvent.change(input, { target: { value: '99' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(input).toHaveValue('10');
  });

  it('blocks all interactions when disabled is true (negative test)', () => {
    const onChange = vi.fn<(next: number) => void>();
    const { rerender } = render(
      <NumericStepper
        label="Locked"
        defaultValue={10}
        onChange={onChange}
        disabled
        data-testid="disabled-stepper"
      />
    );

    const root = screen.getByTestId('disabled-stepper');
    const input = screen.getByRole('spinbutton', { name: 'Locked' });
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(input).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Decrement' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Increment' })).toBeDisabled();

    fireEvent.change(input, { target: { value: '88' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).not.toHaveBeenCalled();

    // Disable mid-edit before blur must not commit draft
    rerender(
      <NumericStepper
        label="Locked"
        defaultValue={10}
        onChange={onChange}
        disabled={false}
        data-testid="disabled-stepper"
      />
    );
    fireEvent.change(input, { target: { value: '44' } });
    rerender(
      <NumericStepper
        label="Locked"
        defaultValue={10}
        onChange={onChange}
        disabled
        data-testid="disabled-stepper"
      />
    );
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads in label, unit, and input as inert literal text', () => {
    const payload = '<script>window.__stepperXss=1</script><img src=x onerror=alert(1)>';
    render(<NumericStepper label={payload} unit={payload} />);

    const input = screen.getByRole('spinbutton', { name: payload });
    fireEvent.change(input, { target: { value: payload } });
    fireEvent.blur(input);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(payload, { selector: 'label' })).toBeInTheDocument();
    expect(screen.getByTestId('numeric-stepper-unit')).toHaveTextContent(payload);
    expect(input).toHaveValue('1');
  });
});
