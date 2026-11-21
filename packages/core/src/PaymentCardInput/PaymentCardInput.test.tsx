import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  PaymentCardInput,
  detectCardBrand,
  validateLuhn,
  type CardBrand,
  type PaymentCardValue,
} from './index';

describe('detectCardBrand', () => {
  it('detects Visa, Amex, Mastercard (51-55 & 2221-2720), Discover (6011 & 65), and falls back to generic', () => {
    const cases: ReadonlyArray<readonly [string, CardBrand]> = [
      ['4', 'visa'],
      ['4242 4242 4242 4242', 'visa'],
      ['3400', 'amex'],
      ['3782-822463-10005', 'amex'],
      ['3512', 'generic'],
      ['5100', 'mastercard'],
      ['5555555555554444', 'mastercard'],
      ['5099', 'generic'],
      ['5600', 'generic'],
      ['2221', 'mastercard'],
      ['25000000', 'mastercard'],
      ['2720', 'mastercard'],
      ['2220', 'generic'],
      ['2721', 'generic'],
      ['222', 'generic'],
      ['6011111111111117', 'discover'],
      ['6500000000000002', 'discover'],
      ['6012', 'generic'],
      ['', 'generic'],
      ['abcd----', 'generic'],
    ];

    for (const [input, expected] of cases) {
      expect(detectCardBrand(input)).toBe(expected);
    }
  });
});

describe('validateLuhn', () => {
  it('validates 13-19 digit Luhn checksums across networks and separator formats', () => {
    expect(validateLuhn('4242424242424242')).toBe(true);
    expect(validateLuhn('4111 1111 1111 1111')).toBe(true);
    expect(validateLuhn('4242-4242-4242-4242')).toBe(true);
    expect(validateLuhn('378282246310005')).toBe(true);
    expect(validateLuhn('371449635398431')).toBe(true);
    expect(validateLuhn('5555555555554444')).toBe(true);
    expect(validateLuhn('2223003122003222')).toBe(true);
    expect(validateLuhn('6011111111111117')).toBe(true);
    expect(validateLuhn('6500000000000002')).toBe(true);
    expect(validateLuhn('4000000000006')).toBe(true); // 13 digits
    expect(validateLuhn('4000000000000000006')).toBe(true); // 19 digits
  });

  it('rejects bad checksums, out-of-range lengths, all-zeros, and non-digit inputs (negative test)', () => {
    expect(validateLuhn('4242424242424243')).toBe(false);
    expect(validateLuhn('400000000006')).toBe(false); // 12 digits
    expect(validateLuhn('40000000000000000006')).toBe(false); // 20 digits
    expect(validateLuhn('0000000000000000')).toBe(false);
    expect(validateLuhn('')).toBe(false);
    expect(validateLuhn('424242424242424a')).toBe(false);
    expect(validateLuhn('<script>4242424242424242</script>')).toBe(false);
  });
});

describe('PaymentCardInput', () => {
  it('renders optical slab with ref, displayName, theme overrides, defaultCardholderName, and omits submit button without onSubmit', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            PaymentCardInput: { className: 'theme-card', style: { maxWidth: '460px' } },
          },
        }}
      >
        <PaymentCardInput
          ref={ref}
          defaultCardholderName="Ada Lovelace"
          className="local-card"
          style={{ marginTop: '8px' }}
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="payment-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('payment-root');
    expect(PaymentCardInput.displayName).toBe('PaymentCardInput');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-payment-card-input', 'prism-slab', 'theme-card', 'local-card');
    expect(root).toHaveStyle({ maxWidth: '460px', marginTop: '8px' });
    expect(root).toHaveAttribute('data-brand', 'generic');
    expect(root).not.toHaveAttribute('data-valid');
    expect(root).not.toHaveAttribute('data-invalid');

    expect(screen.getByTestId('payment-card-brand-pill')).toHaveTextContent('Card');
    expect(screen.queryByTestId('payment-card-valid-badge')).not.toBeInTheDocument();
    expect(screen.queryByTestId('payment-card-luhn-error')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Cardholder name')).toHaveValue('Ada Lovelace');
  });

  it('auto-formats Visa 4-4-4-4, strips non-digits, shows Valid emerald badge, emits onChange, and submits when complete and valid', () => {
    const onChange = vi.fn<(val: PaymentCardValue) => void>();
    const onSubmit = vi.fn<(val: PaymentCardValue) => void>();

    render(
      <PaymentCardInput
        onChange={onChange}
        onSubmit={onSubmit}
        submitLabel="Pay $49.00"
        data-testid="visa-card"
      />
    );

    const cardInput = screen.getByLabelText('Card number');
    const expiryInput = screen.getByLabelText('Expiry');
    const cvcInput = screen.getByLabelText('CVC');
    const nameInput = screen.getByLabelText('Cardholder name');
    const submitBtn = screen.getByRole('button', { name: 'Pay $49.00' });

    expect(submitBtn).toBeDisabled();

    fireEvent.change(cardInput, { target: { value: '4242-abcd-4242 4242 4242999' } });
    expect(cardInput).toHaveValue('4242 4242 4242 4242');
    expect(screen.getByTestId('payment-card-brand-pill')).toHaveTextContent('Visa');
    expect(screen.getByTestId('payment-card-valid-badge')).toHaveTextContent('Valid');
    expect(screen.getByTestId('visa-card')).toHaveAttribute('data-brand', 'visa');
    expect(screen.getByTestId('visa-card')).toHaveAttribute('data-valid', 'true');
    expect(submitBtn).toBeDisabled();

    fireEvent.change(expiryInput, { target: { value: '1228' } });
    expect(expiryInput).toHaveValue('12/28');

    fireEvent.change(cvcInput, { target: { value: '98a76' } });
    expect(cvcInput).toHaveValue('987');
    expect(submitBtn).toBeDisabled(); // cardholder name still empty

    fireEvent.change(nameInput, { target: { value: '   ' } });
    expect(submitBtn).toBeDisabled(); // whitespace-only name is incomplete

    fireEvent.change(nameInput, { target: { value: 'Grace Hopper' } });
    expect(submitBtn).toBeEnabled();
    expect(screen.getByTestId('visa-card')).toHaveAttribute('data-complete', 'true');

    const expectedVal: PaymentCardValue = {
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/28',
      cvc: '987',
      cardholderName: 'Grace Hopper',
      brand: 'visa',
      isValidLuhn: true,
      isComplete: true,
    };
    expect(onChange).toHaveBeenLastCalledWith(expectedVal);

    fireEvent.click(submitBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(expectedVal);
  });

  it('auto-formats Amex 4-6-5 with 4-digit CVC and trims CVC when switching to Mastercard or Discover', () => {
    const onChange = vi.fn<(val: PaymentCardValue) => void>();
    render(<PaymentCardInput onChange={onChange} showCardholderName={false} onSubmit={vi.fn()} />);

    expect(screen.queryByLabelText('Cardholder name')).not.toBeInTheDocument();

    const cardInput = screen.getByLabelText('Card number');
    const expiryInput = screen.getByLabelText('Expiry');
    const cvcInput = screen.getByLabelText('CVC');
    const submitBtn = screen.getByRole('button', { name: 'Confirm Payment Method' });

    // Partial Amex (4 digits, then 7 digits, then full 15 digits + overflow)
    fireEvent.change(cardInput, { target: { value: '3782' } });
    expect(cardInput).toHaveValue('3782');
    expect(screen.getByTestId('payment-card-brand-pill')).toHaveTextContent('Amex');
    expect(cvcInput).toHaveAttribute('placeholder', '1234');
    expect(cvcInput).toHaveAttribute('maxLength', '4');

    fireEvent.change(cardInput, { target: { value: '3782822' } });
    expect(cardInput).toHaveValue('3782 822');

    fireEvent.change(cardInput, { target: { value: '37828224631000599' } });
    expect(cardInput).toHaveValue('3782 822463 10005');
    expect(screen.getByTestId('payment-card-valid-badge')).toHaveTextContent('Valid');

    fireEvent.change(expiryInput, { target: { value: '09/29' } });
    fireEvent.change(cvcInput, { target: { value: '12345' } });
    expect(cvcInput).toHaveValue('1234');
    expect(submitBtn).toBeEnabled();

    // Switch to Mastercard -> CVC automatically trimmed from 4 to 3 digits
    fireEvent.change(cardInput, { target: { value: '5555555555554444' } });
    expect(cardInput).toHaveValue('5555 5555 5555 4444');
    expect(screen.getByTestId('payment-card-brand-pill')).toHaveTextContent('Mastercard');
    expect(cvcInput).toHaveValue('123');
    expect(cvcInput).toHaveAttribute('placeholder', '123');
    expect(onChange).toHaveBeenLastCalledWith({
      cardNumber: '5555 5555 5555 4444',
      expiry: '09/29',
      cvc: '123',
      cardholderName: '',
      brand: 'mastercard',
      isValidLuhn: true,
      isComplete: true,
    });

    // Switch to Discover
    fireEvent.change(cardInput, { target: { value: '6011111111111117' } });
    expect(screen.getByTestId('payment-card-brand-pill')).toHaveTextContent('Discover');
    expect(screen.getByTestId('payment-card-valid-badge')).toHaveTextContent('Valid');
  });

  it('auto-formats expiry MM/YY and clamps months cleanly across boundary values', () => {
    render(<PaymentCardInput />);
    const expiryInput = screen.getByLabelText('Expiry');

    const transitions: ReadonlyArray<readonly [string, string]> = [
      ['', ''],
      ['ab/cd', ''],
      ['0', '0'],
      ['1', '1'],
      ['5', '05'],
      ['00', '01'],
      ['13', '12'],
      ['0028', '01/28'],
      ['1528', '12/28'],
      ['9929', '12/29'],
      ['4/29', '04/29'],
      ['12/', '12'],
      ['122899', '12/28'],
    ];

    for (const [raw, formatted] of transitions) {
      fireEvent.change(expiryInput, { target: { value: raw } });
      expect(expiryInput).toHaveValue(formatted);
    }
  });

  it('shows Luhn error alert and disables submit when complete card length fails checksum (negative test)', () => {
    const onSubmit = vi.fn<(val: PaymentCardValue) => void>();
    render(
      <PaymentCardInput
        showCardholderName={false}
        onSubmit={onSubmit}
        data-testid="invalid-card"
      />
    );

    const cardInput = screen.getByLabelText('Card number');
    const expiryInput = screen.getByLabelText('Expiry');
    const cvcInput = screen.getByLabelText('CVC');
    const submitBtn = screen.getByRole('button', { name: 'Confirm Payment Method' });

    fireEvent.change(cardInput, { target: { value: '4242424242424243' } });
    fireEvent.change(expiryInput, { target: { value: '11/28' } });
    fireEvent.change(cvcInput, { target: { value: '321' } });

    expect(screen.getByTestId('invalid-card')).toHaveAttribute('data-invalid', 'true');
    expect(screen.queryByTestId('payment-card-valid-badge')).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/Invalid card number checksum/);
    expect(cardInput).toHaveAttribute('aria-invalid', 'true');
    expect(cardInput).toHaveAttribute('aria-describedby', screen.getByRole('alert').id);
    expect(submitBtn).toBeDisabled();

    // Enter key should not submit when Luhn fails
    fireEvent.keyDown(cvcInput, { key: 'Enter' });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('guards Enter key during IME composition and submits on non-composing Enter when valid', () => {
    const onSubmit = vi.fn<(val: PaymentCardValue) => void>();
    render(<PaymentCardInput showCardholderName={false} onSubmit={onSubmit} />);

    const cardInput = screen.getByLabelText('Card number');
    const expiryInput = screen.getByLabelText('Expiry');
    const cvcInput = screen.getByLabelText('CVC');

    fireEvent.change(cardInput, { target: { value: '4242424242424242' } });
    fireEvent.change(expiryInput, { target: { value: '08/29' } });
    fireEvent.change(cvcInput, { target: { value: '456' } });

    // Non-Enter key ignored
    fireEvent.keyDown(cvcInput, { key: 'Escape' });
    expect(onSubmit).not.toHaveBeenCalled();

    // IME composing Enter ignored
    const composingEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    fireEvent(cvcInput, composingEvent);
    expect(onSubmit).not.toHaveBeenCalled();

    // Normal Enter submits
    fireEvent.keyDown(cvcInput, { key: 'Enter' });
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      cardNumber: '4242 4242 4242 4242',
      expiry: '08/29',
      cvc: '456',
      cardholderName: '',
      brand: 'visa',
      isValidLuhn: true,
      isComplete: true,
    });
  });

  it('blocks input mutations and submission when disabled (negative test)', () => {
    const onChange = vi.fn<(val: PaymentCardValue) => void>();
    const onSubmit = vi.fn<(val: PaymentCardValue) => void>();

    render(
      <PaymentCardInput
        disabled
        onChange={onChange}
        onSubmit={onSubmit}
        data-testid="disabled-card"
      />
    );

    const root = screen.getByTestId('disabled-card');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const cardInput = screen.getByLabelText('Card number');
    const expiryInput = screen.getByLabelText('Expiry');
    const cvcInput = screen.getByLabelText('CVC');
    const nameInput = screen.getByLabelText('Cardholder name');
    const submitBtn = screen.getByRole('button', { name: 'Confirm Payment Method' });

    expect(cardInput).toBeDisabled();
    expect(expiryInput).toBeDisabled();
    expect(cvcInput).toBeDisabled();
    expect(nameInput).toBeDisabled();
    expect(submitBtn).toBeDisabled();

    fireEvent.change(cardInput, { target: { value: '4242424242424242' } });
    fireEvent.change(expiryInput, { target: { value: '12/28' } });
    fireEvent.change(cvcInput, { target: { value: '123' } });
    fireEvent.change(nameInput, { target: { value: 'Blocked User' } });
    fireEvent.click(submitBtn);

    expect(onChange).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(cardInput).toHaveValue('');
    expect(expiryInput).toHaveValue('');
    expect(cvcInput).toHaveValue('');
    expect(nameInput).toHaveValue('');
  });

  it('renders adversarial XSS strings literally and strips unsafe characters from numeric fields', () => {
    const payload = '<script>window.__cardXss=1</script><img src=x onerror=alert(1)>';
    render(
      <PaymentCardInput
        defaultCardholderName={payload}
        submitLabel={payload}
        onSubmit={vi.fn()}
      />
    );

    const cardInput = screen.getByLabelText('Card number');
    const expiryInput = screen.getByLabelText('Expiry');
    const cvcInput = screen.getByLabelText('CVC');
    const nameInput = screen.getByLabelText('Cardholder name');

    fireEvent.change(cardInput, { target: { value: payload } });
    fireEvent.change(expiryInput, { target: { value: payload } });
    fireEvent.change(cvcInput, { target: { value: payload } });

    expect(cardInput).toHaveValue('11');
    expect(expiryInput).toHaveValue('01/1');
    expect(cvcInput).toHaveValue('11');
    expect(nameInput).toHaveValue(payload);
    expect(screen.getByRole('button', { name: payload })).toBeInTheDocument();
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
