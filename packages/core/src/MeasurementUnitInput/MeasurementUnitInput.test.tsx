import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_MEASUREMENT_UNITS,
  MeasurementUnitInput,
  type MeasurementUnitOption,
  type MeasurementValue,
} from './index';

describe('MeasurementUnitInput', () => {
  it('renders defaults, forwards ref, applies theme overrides, and commits edits on blur/Enter', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(next: MeasurementValue) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            MeasurementUnitInput: { className: 'theme-measure', style: { maxWidth: '380px' } },
          },
        }}
      >
        <MeasurementUnitInput
          ref={ref}
          onChange={onChange}
          className="local-measure"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="measure-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('measure-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-measurement-unit-input',
      'prism-slab',
      'theme-measure',
      'local-measure'
    );
    expect(root).toHaveStyle({ maxWidth: '380px' });
    expect(root).toHaveAttribute('data-unit', 'px');
    expect(root).not.toHaveAttribute('data-focused');

    expect(DEFAULT_MEASUREMENT_UNITS.map((u) => u.id)).toEqual(['px', '%', 'rem', 'ms', 'GB']);
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('16 px');

    const input = screen.getByRole('spinbutton', { name: 'Measurement' });
    expect(input).toHaveValue('16');
    expect(input).toHaveAttribute('aria-valuemin', '0');
    expect(input).toHaveAttribute('aria-valuemax', '100000');
    expect(input).toHaveAttribute('aria-valuenow', '16');
    expect(input).toHaveAttribute('aria-valuetext', '16 px');

    const select = screen.getByRole('combobox', { name: 'Unit' });
    expect(select).toHaveClass('prism-crystal');
    expect(select).toHaveValue('px');

    // Focus, edit with commas/sign, commit via IME-safe Enter
    fireEvent.focus(input);
    expect(root).toHaveAttribute('data-focused', 'true');
    fireEvent.change(input, { target: { value: '+1,250.5' } });

    // Composing Enter must be ignored
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();

    // Non-action key does nothing
    fireEvent.keyDown(input, { key: 'a' });
    expect(onChange).not.toHaveBeenCalled();

    // Normal Enter commits
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith({ amount: 1250.5, unit: 'px' });
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('1250.5 px');

    // Blur without edits does not double-fire onChange
    fireEvent.blur(input);
    expect(root).not.toHaveAttribute('data-focused');
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('steps cleanly with ArrowUp and ArrowDown, cleans float drift, and clamps min..max', () => {
    const onChange = vi.fn<(next: MeasurementValue) => void>();

    render(
      <MeasurementUnitInput
        label="Opacity Scale"
        defaultValue={{ amount: 0.2, unit: 'rem' }}
        min={0}
        max={0.5}
        step={0.1}
        onChange={onChange}
      />
    );

    const input = screen.getByRole('spinbutton', { name: 'Opacity Scale' });

    // Unfocused ArrowUp steps from committed 0.2 -> 0.3 (no 0.30000000000000004 drift)
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 0.3, unit: 'rem' });
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('0.3 rem');

    // Focused with valid edited draft steps from draft value
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '0.4' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 0.5, unit: 'rem' });

    // Stepping above max clamps at 0.5 and avoids redundant onChange
    const countAtMax = onChange.mock.calls.length;
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(onChange).toHaveBeenCalledTimes(countAtMax);

    // Focused with malformed draft falls back to committed amount before stepping down
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 0.4, unit: 'rem' });

    // Clamp below min on blur
    fireEvent.change(input, { target: { value: '-10' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith({ amount: 0, unit: 'rem' });
    expect(input).toHaveValue('0');
  });

  it('switches units without converting when convertOnUnitChange is false (default)', () => {
    const onChange = vi.fn<(next: MeasurementValue) => void>();

    render(
      <MeasurementUnitInput
        defaultValue={{ amount: 32, unit: 'px' }}
        units={[
          { id: 'px', label: 'px', factorToBase: 1 },
          { id: 'rem', label: 'rem', factorToBase: 16 },
        ]}
        onChange={onChange}
      />
    );

    const select = screen.getByRole('combobox', { name: 'Unit' });
    fireEvent.change(select, { target: { value: 'rem' } });

    expect(onChange).toHaveBeenCalledWith({ amount: 32, unit: 'rem' });
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('32 rem');
    expect(screen.getByRole('spinbutton', { name: 'Measurement' })).toHaveValue('32');
  });

  it('converts amounts when convertOnUnitChange is true, rounds to 3 decimals, clamps bounds, and guards invalid factors', () => {
    const onChange = vi.fn<(next: MeasurementValue) => void>();
    const convertibleUnits: MeasurementUnitOption[] = [
      { id: 'px', label: 'px', factorToBase: 1 },
      { id: 'rem', label: 'rem', factorToBase: 16 },
      { id: 'tri', label: 'tri', factorToBase: 3 },
      { id: 'km', label: 'km', factorToBase: 1000 },
      { id: 'pct', label: '%' },
      { id: 'zero', label: 'zero', factorToBase: 0 },
    ];

    render(
      <MeasurementUnitInput
        convertOnUnitChange
        min={0}
        max={500}
        units={convertibleUnits}
        defaultValue={{ amount: 16, unit: 'px' }}
        onChange={onChange}
      />
    );

    const select = screen.getByRole('combobox', { name: 'Unit' });
    const input = screen.getByRole('spinbutton', { name: 'Measurement' });

    // 16 px -> 16 * 1 / 16 = 1 rem
    fireEvent.change(select, { target: { value: 'rem' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 1, unit: 'rem' });
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('1 rem');

    // Set to 10 px, then convert to tri (factorToBase = 3) -> 10 * 1 / 3 = 3.333
    fireEvent.change(select, { target: { value: 'px' } });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '10' } });
    fireEvent.blur(input);
    fireEvent.change(select, { target: { value: 'tri' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 3.333, unit: 'tri' });
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('3.333 tri');

    // Convert km (1000) -> px (1) exceeds max 500 -> clamps to 500
    fireEvent.change(select, { target: { value: 'km' } });
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '2' } });
    fireEvent.blur(input);
    fireEvent.change(select, { target: { value: 'px' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 500, unit: 'px' });

    // Switching to unit without factorToBase preserves numeric amount
    fireEvent.change(select, { target: { value: 'pct' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 500, unit: 'pct' });
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('500 %');

    // Switching to unit with factorToBase <= 0 preserves numeric amount without division by zero
    fireEvent.change(select, { target: { value: 'zero' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 500, unit: 'zero' });

    // Unrecognized option value is ignored
    const prevCalls = onChange.mock.calls.length;
    fireEvent.change(select, { target: { value: 'does-not-exist' } });
    expect(onChange).toHaveBeenCalledTimes(prevCalls);
  });

  it('supports controlled value updates and handles inverted bounds, non-positive step, and empty/duplicate units', () => {
    function ControlledHarness() {
      const [val, setVal] = useState<MeasurementValue>({ amount: 24, unit: 'ms' });
      return (
        <div>
          <MeasurementUnitInput
            value={val}
            onChange={setVal}
            min={-50}
            max={500}
            step={-2}
          />
          <button
            type="button"
            onClick={() => setVal({ amount: 128, unit: 'GB' })}
          >
            Set Storage
          </button>
        </div>
      );
    }

    const { unmount } = render(<ControlledHarness />);
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('24 ms');

    // Non-positive step (-2) falls back to 1
    const input = screen.getByRole('spinbutton', { name: 'Measurement' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('25 ms');

    // External update syncs immediately
    fireEvent.click(screen.getByRole('button', { name: 'Set Storage' }));
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('128 GB');
    expect(input).toHaveValue('128');
    unmount();

    // Inverted/non-finite bounds, duplicate/empty units, and missing initial unit/NaN amount
    const { rerender } = render(
      <MeasurementUnitInput
        units={[
          { id: 'em', label: 'em' },
          { id: 'em', label: 'duplicate-em' },
          { id: 'vh', label: 'vh' },
        ]}
        min={200}
        max={50}
        defaultValue={{ amount: Number.NaN, unit: 'MISSING' }}
      />
    );
    expect(screen.getAllByRole('option')).toHaveLength(2);
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('50 em');

    rerender(
      <MeasurementUnitInput
        units={[]}
        min={Number.NaN}
        max={Number.POSITIVE_INFINITY}
        value={{ amount: -0, unit: 'px' }}
      />
    );
    expect(screen.getAllByRole('option')).toHaveLength(DEFAULT_MEASUREMENT_UNITS.length);
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('0 px');
  });

  it('disables input and unit switcher and blocks all mutations when disabled (negative test)', () => {
    const onChange = vi.fn<(next: MeasurementValue) => void>();

    render(
      <MeasurementUnitInput
        disabled
        defaultValue={{ amount: 40, unit: 'px' }}
        onChange={onChange}
        data-testid="disabled-measure"
      />
    );

    const root = screen.getByTestId('disabled-measure');
    const input = screen.getByRole('spinbutton', { name: 'Measurement' });
    const select = screen.getByRole('combobox', { name: 'Unit' });

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(input).toBeDisabled();
    expect(select).toBeDisabled();

    fireEvent.focus(input);
    expect(root).not.toHaveAttribute('data-focused');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(select, { target: { value: 'rem' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent('40 px');
  });

  it('reverts malformed drafts, numeric overflow, and adversarial XSS payloads safely', () => {
    const onChange = vi.fn<(next: MeasurementValue) => void>();
    const xssPayload = '<script>window.__measureXss=1</script><img src=x onerror=alert(1)>';

    render(
      <MeasurementUnitInput
        label={xssPayload}
        units={[{ id: 'custom', label: xssPayload }]}
        defaultValue={{ amount: 12, unit: 'custom' }}
        onChange={onChange}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('measurement-summary-badge')).toHaveTextContent(`12 ${xssPayload}`);

    const input = screen.getByRole('spinbutton', { name: xssPayload });
    const badInputs = ['', '   ', '.', '-', '1.2.3', '16px', xssPayload, '9'.repeat(400)];

    for (const bad of badInputs) {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: bad } });
      fireEvent.blur(input);
      expect(input).toHaveValue('12');
    }

    expect(onChange).not.toHaveBeenCalled();
  });
});
