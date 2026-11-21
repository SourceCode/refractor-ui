import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CurrencyInput,
  DEFAULT_CURRENCIES,
  formatCurrencyAmount,
  type CurrencyInputValue,
  type CurrencyOption,
} from './index';

describe('formatCurrencyAmount', () => {
  it('formats finite numbers with thousands separators and fixed decimals', () => {
    expect(formatCurrencyAmount(1250.5, 2)).toBe('1,250.50');
    expect(formatCurrencyAmount(0, 2)).toBe('0.00');
    expect(formatCurrencyAmount(999, 0)).toBe('999');
    expect(formatCurrencyAmount(1000000000, 2)).toBe('1,000,000,000.00');
    expect(formatCurrencyAmount(-1234.567, 2)).toBe('-1,234.57');
    expect(formatCurrencyAmount(-0.001, 2)).toBe('0.00');
  });

  it('clamps decimals to 0..4 and normalizes non-finite inputs safely', () => {
    expect(formatCurrencyAmount(1250.5, -3)).toBe('1,251');
    expect(formatCurrencyAmount(1250.5, 9)).toBe('1,250.5000');
    expect(formatCurrencyAmount(1250.5, Number.NaN)).toBe('1,250.50');
    expect(formatCurrencyAmount(Number.NaN, 2)).toBe('0.00');
    expect(formatCurrencyAmount(Number.POSITIVE_INFINITY, 0)).toBe('0');
  });
});

describe('CurrencyInput', () => {
  it('renders defaults, forwards ref, applies theme overrides, and formats blurred vs focused values', () => {
    const ref = createRef<HTMLDivElement>();
    const onChange = vi.fn<(next: CurrencyInputValue) => void>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            CurrencyInput: { className: 'theme-currency', style: { maxWidth: '420px' } },
          },
        }}
      >
        <CurrencyInput
          ref={ref}
          onChange={onChange}
          className="local-currency"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="currency-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('currency-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-currency-input', 'prism-slab', 'theme-currency', 'local-currency');
    expect(root).toHaveStyle({ maxWidth: '420px' });
    expect(root).toHaveAttribute('data-currency', 'USD');
    expect(root).not.toHaveAttribute('data-focused');

    expect(DEFAULT_CURRENCIES.map((c) => c.code)).toEqual(['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD']);
    expect(screen.getByTestId('currency-symbol-prefix')).toHaveTextContent('$');
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('$1,250.50 USD');

    const input = screen.getByLabelText('Amount');
    expect(input).toHaveAttribute('inputmode', 'decimal');
    expect(input).toHaveValue('1,250.50');

    // Focusing shows unformatted editable string
    fireEvent.focus(input);
    expect(root).toHaveAttribute('data-focused', 'true');
    expect(input).toHaveValue('1250.5');

    // Editing and blurring commits rounded, clamped value and reformats
    fireEvent.change(input, { target: { value: '$4,321.567' } });
    fireEvent.blur(input);

    expect(root).not.toHaveAttribute('data-focused');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ amount: 4321.57, currency: 'USD' });
    expect(input).toHaveValue('4,321.57');
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('$4,321.57 USD');

    // Focusing and blurring without changes does not fire redundant onChange
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('commits on IME-safe Enter, ignores composing Enter, and clamps to min..max bounds', () => {
    const onChange = vi.fn<(next: CurrencyInputValue) => void>();

    render(
      <CurrencyInput
        label="Budget Cap"
        min={10}
        max={500}
        defaultValue={{ amount: 100, currency: 'USD' }}
        onChange={onChange}
      />
    );

    const input = screen.getByLabelText('Budget Cap');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '250.456' } });

    // Composing Enter must be ignored
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onChange).not.toHaveBeenCalled();

    // Non-Enter key does not commit
    fireEvent.keyDown(input, { key: 'ArrowRight' });
    expect(onChange).not.toHaveBeenCalled();

    // Standard Enter commits rounded value
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 250.46, currency: 'USD' });
    expect(input).toHaveValue('250.46');

    // Clamp above max
    fireEvent.change(input, { target: { value: '9999' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 500, currency: 'USD' });
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('$500.00 USD');

    // Clamp below min
    fireEvent.change(input, { target: { value: '-25' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith({ amount: 10, currency: 'USD' });
    expect(input).toHaveValue('10.00');
  });

  it('switches currencies inline, re-rounding amount to target currency decimals', () => {
    const onChange = vi.fn<(next: CurrencyInputValue) => void>();

    render(
      <CurrencyInput
        defaultValue={{ amount: 1250.5, currency: 'USD' }}
        onChange={onChange}
      />
    );

    const select = screen.getByRole('combobox', { name: 'Currency' });
    expect(select).toHaveClass('prism-crystal');
    expect(select).toHaveValue('USD');

    // Switch USD (2 decimals) -> JPY (0 decimals) re-rounds 1250.5 -> 1251
    fireEvent.change(select, { target: { value: 'JPY' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 1251, currency: 'JPY' });
    expect(screen.getByTestId('currency-symbol-prefix')).toHaveTextContent('¥');
    expect(screen.getByLabelText('Amount')).toHaveValue('1,251');
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('¥1,251 JPY');

    // Switch to CAD (CA$, 2 decimals)
    fireEvent.change(select, { target: { value: 'CAD' } });
    expect(onChange).toHaveBeenLastCalledWith({ amount: 1251, currency: 'CAD' });
    expect(screen.getByTestId('currency-symbol-prefix')).toHaveTextContent('CA$');
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('CA$1,251.00 CAD');

    // Ignore unrecognized currency option change
    const callCount = onChange.mock.calls.length;
    fireEvent.change(select, { target: { value: 'ZZZ' } });
    expect(onChange).toHaveBeenCalledTimes(callCount);
  });

  it('supports controlled value updates and negative amounts when min is negative', () => {
    function ControlledCurrencyHarness() {
      const [val, setVal] = useState<CurrencyInputValue>({ amount: -42.5, currency: 'EUR' });
      return (
        <div>
          <CurrencyInput value={val} onChange={setVal} min={-1000} max={1000} />
          <button
            type="button"
            onClick={() => setVal({ amount: 777.25, currency: 'GBP' })}
          >
            Sync External
          </button>
        </div>
      );
    }

    render(<ControlledCurrencyHarness />);
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('-€42.50 EUR');
    expect(screen.getByLabelText('Amount')).toHaveValue('-42.50');

    // Leading sign before symbol and positive sign parsing
    const input = screen.getByLabelText('Amount');
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '-€120.75' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('-€120.75 EUR');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '+€80.2' } });
    fireEvent.blur(input);
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('€80.20 EUR');

    // External controlled update reflects immediately
    fireEvent.click(screen.getByRole('button', { name: 'Sync External' }));
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('£777.25 GBP');
    expect(screen.getByLabelText('Amount')).toHaveValue('777.25');
  });

  it('handles inverted/non-finite bounds, empty/duplicate currencies, and unconfigured currency codes safely', () => {
    const duplicateCurrencies: CurrencyOption[] = [
      { code: 'CHF', symbol: 'Fr', label: 'Swiss Franc', decimals: 2 },
      { code: 'CHF', symbol: 'DUP', label: 'Duplicate', decimals: 0 },
      { code: 'BTC', symbol: '₿', label: 'Bitcoin', decimals: 4 },
    ];

    const { rerender } = render(
      <CurrencyInput
        currencies={duplicateCurrencies}
        min={500}
        max={100}
        defaultValue={{ amount: Number.NaN, currency: 'MISSING' }}
      />
    );

    // Falls back to first deduplicated currency (CHF) and normalized min (100)
    expect(screen.getByTestId('currency-symbol-prefix')).toHaveTextContent('Fr');
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('Fr100.00 CHF');
    expect(screen.getAllByRole('option')).toHaveLength(2);

    // Empty currencies array falls back to DEFAULT_CURRENCIES; non-finite bounds fall back to defaults
    rerender(
      <CurrencyInput
        currencies={[]}
        min={Number.NaN}
        max={Number.POSITIVE_INFINITY}
        value={{ amount: 50, currency: 'USD' }}
      />
    );
    expect(screen.getAllByRole('option')).toHaveLength(DEFAULT_CURRENCIES.length);
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('$50.00 USD');
  });

  it('disables input and currency switcher and blocks mutations when disabled (negative test)', () => {
    const onChange = vi.fn<(next: CurrencyInputValue) => void>();

    render(
      <CurrencyInput
        disabled
        defaultValue={{ amount: 250, currency: 'USD' }}
        onChange={onChange}
        data-testid="disabled-currency"
      />
    );

    const root = screen.getByTestId('disabled-currency');
    const input = screen.getByLabelText('Amount');
    const select = screen.getByRole('combobox', { name: 'Currency' });

    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(input).toBeDisabled();
    expect(select).toBeDisabled();

    fireEvent.focus(input);
    expect(root).not.toHaveAttribute('data-focused');
    fireEvent.change(input, { target: { value: '999' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(select, { target: { value: 'EUR' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('currency-readout-pill')).toHaveTextContent('$250.00 USD');
  });

  it('reverts malformed drafts, numeric overflow, and adversarial XSS payloads safely', () => {
    const onChange = vi.fn<(next: CurrencyInputValue) => void>();
    const xssPayload = '<script>window.__currencyXss=1</script><img src=x onerror=alert(1)>';

    render(
      <CurrencyInput
        label={xssPayload}
        defaultValue={{ amount: 300, currency: 'USD' }}
        onChange={onChange}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByText(xssPayload)).toBeInTheDocument();

    const input = screen.getByLabelText(xssPayload);

    const malformedInputs = [
      '',
      '   ',
      '.',
      '--',
      '12.34.56',
      'abc',
      xssPayload,
      '9'.repeat(400),
    ];

    for (const bad of malformedInputs) {
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: bad } });
      fireEvent.blur(input);
      expect(input).toHaveValue('300.00');
    }

    expect(onChange).not.toHaveBeenCalled();
  });
});
