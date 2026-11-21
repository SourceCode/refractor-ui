import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { OtpCodeInput } from './index';

describe('OtpCodeInput', () => {
  it('renders 6 numeric optical wells by default, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            OtpCodeInput: { className: 'theme-otp', style: { maxWidth: '420px' } },
          },
        }}
      >
        <OtpCodeInput
          ref={ref}
          className="local-otp"
          xstyle={{ '--prism-blur-px': '16px' }}
          style={{ marginTop: '8px' }}
          data-testid="otp-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('otp-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass('refractor-otp-code-input', 'w-full', 'theme-otp', 'local-otp');
    expect(root).toHaveStyle({ maxWidth: '420px', marginTop: '8px' });
    expect(OtpCodeInput.displayName).toBe('OtpCodeInput');

    const group = screen.getByRole('group', { name: 'Verification code' });
    expect(group).toBeInTheDocument();

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
    inputs.forEach((input, idx) => {
      expect(input).toHaveAttribute('aria-label', `Digit ${idx + 1} of 6`);
      expect(input).toHaveAttribute('inputmode', 'numeric');
      expect(input).toHaveAttribute('autocomplete', 'one-time-code');
      expect(input).toHaveAttribute('type', 'text');
      expect(input).toHaveClass('prism-well', 'prism-focus-ring');
    });

    expect(screen.queryByRole('button', { name: 'Clear verification code' })).not.toBeInTheDocument();
  });

  it('clamps length to [4, 8] and falls back to 6 on NaN or Infinity', () => {
    const { rerender } = render(<OtpCodeInput length={2} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(4);
    expect(screen.getByLabelText('Digit 4 of 4')).toBeInTheDocument();

    rerender(<OtpCodeInput length={15} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(8);
    expect(screen.getByLabelText('Digit 8 of 8')).toBeInTheDocument();

    rerender(<OtpCodeInput length={Number.NaN} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(6);

    rerender(<OtpCodeInput length={Number.POSITIVE_INFINITY} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(6);
  });

  it('advances focus while typing valid digits, ignores invalid letters, replaces existing cells, and fires onComplete', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();

    render(
      <OtpCodeInput
        length={4}
        onChange={onChange}
        onComplete={onComplete}
        data-testid="otp-entry"
      />
    );

    const cell1 = screen.getByLabelText('Digit 1 of 4') as HTMLInputElement;
    const cell2 = screen.getByLabelText('Digit 2 of 4') as HTMLInputElement;
    const cell3 = screen.getByLabelText('Digit 3 of 4') as HTMLInputElement;
    const cell4 = screen.getByLabelText('Digit 4 of 4') as HTMLInputElement;

    // Invalid non-digit char is ignored cleanly
    fireEvent.change(cell1, { target: { value: 'a' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(cell1.value).toBe('');

    // Type 4 digits sequentially
    fireEvent.change(cell1, { target: { value: '4' } });
    expect(onChange).toHaveBeenLastCalledWith('4');
    expect(document.activeElement).toBe(cell2);

    fireEvent.change(cell2, { target: { value: '8' } });
    expect(onChange).toHaveBeenLastCalledWith('48');
    expect(document.activeElement).toBe(cell3);

    fireEvent.change(cell3, { target: { value: '2' } });
    expect(onChange).toHaveBeenLastCalledWith('482');
    expect(document.activeElement).toBe(cell4);

    fireEvent.change(cell4, { target: { value: '9' } });
    expect(onChange).toHaveBeenLastCalledWith('4829');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenLastCalledWith('4829');
    expect(screen.getByTestId('otp-entry')).toHaveAttribute('data-complete', 'true');

    // Replace an existing cell by appending ('87' -> '7') and prepending ('17' -> '1')
    fireEvent.change(cell2, { target: { value: '87' } });
    expect(onChange).toHaveBeenLastCalledWith('4729');
    expect(document.activeElement).toBe(cell3);

    fireEvent.change(cell2, { target: { value: '17' } });
    expect(onChange).toHaveBeenLastCalledWith('4129');

    // Re-typing the exact same digit advances focus without firing redundant onChange
    const countBeforeSame = onChange.mock.calls.length;
    fireEvent.change(cell2, { target: { value: '11' } });
    expect(onChange).toHaveBeenCalledTimes(countBeforeSame);
    expect(document.activeElement).toBe(cell3);

    // Replacing a filled cell with 2 completely different digits distributes both
    fireEvent.change(cell2, { target: { value: '67' } });
    expect(onChange).toHaveBeenLastCalledWith('4679');

    // Invalid char appended onto existing digit is ignored ('6x')
    const countBeforeInvalid = onChange.mock.calls.length;
    fireEvent.change(cell2, { target: { value: '6x' } });
    expect(onChange).toHaveBeenCalledTimes(countBeforeInvalid);

    // Multi-char input with only invalid chars is ignored
    fireEvent.change(cell2, { target: { value: '---' } });
    expect(onChange).toHaveBeenCalledTimes(countBeforeInvalid);

    // Multi-char input with 1 valid char updates cleanly
    fireEvent.change(cell2, { target: { value: '-5-' } });
    expect(onChange).toHaveBeenLastCalledWith('4579');

    // Clearing a cell via onChange empty string
    fireEvent.change(cell4, { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith('457');

    // Multi-char autofill via onChange distributes across cells
    fireEvent.change(cell1, { target: { value: '90-12' } });
    expect(onChange).toHaveBeenLastCalledWith('9012');
    expect(onComplete).toHaveBeenLastCalledWith('9012');
  });

  it('supports Backspace clear/rewind, Delete, ArrowLeft/ArrowRight, Home/End, and guards IME composition', () => {
    const onChange = vi.fn();
    render(<OtpCodeInput length={4} defaultValue="1234" onChange={onChange} />);

    const cell1 = screen.getByLabelText('Digit 1 of 4') as HTMLInputElement;
    const cell2 = screen.getByLabelText('Digit 2 of 4') as HTMLInputElement;
    const cell3 = screen.getByLabelText('Digit 3 of 4') as HTMLInputElement;
    const cell4 = screen.getByLabelText('Digit 4 of 4') as HTMLInputElement;

    // ArrowLeft/ArrowRight and boundary checks
    act(() => {
      cell1.focus();
    });
    fireEvent.keyDown(cell1, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cell1);

    fireEvent.keyDown(cell1, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell2);

    fireEvent.keyDown(cell2, { key: 'End' });
    expect(document.activeElement).toBe(cell4);

    fireEvent.keyDown(cell4, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(cell4);

    fireEvent.keyDown(cell4, { key: 'Home' });
    expect(document.activeElement).toBe(cell1);

    fireEvent.keyDown(cell2, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(cell1);

    // IME composition Backspace must be ignored
    act(() => {
      cell4.focus();
    });
    const composingBackspace = new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true });
    Object.defineProperty(composingBackspace, 'isComposing', { value: true });
    fireEvent(cell4, composingBackspace);
    expect(onChange).not.toHaveBeenCalled();

    // Backspace on non-empty cell clears active cell
    fireEvent.keyDown(cell4, { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith('123');
    expect(cell4.value).toBe('');
    expect(document.activeElement).toBe(cell4);

    // Backspace on now-empty cell rewinds to previous cell and clears it
    fireEvent.keyDown(cell4, { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith('12');
    expect(cell3.value).toBe('');
    expect(document.activeElement).toBe(cell3);

    // Delete on non-empty cell clears it; Delete on empty cell is a no-op
    fireEvent.keyDown(cell2, { key: 'Delete' });
    expect(onChange).toHaveBeenLastCalledWith('1');
    const callsAfterDelete = onChange.mock.calls.length;
    fireEvent.keyDown(cell2, { key: 'Delete' });
    expect(onChange).toHaveBeenCalledTimes(callsAfterDelete);

    // Backspace on empty cell 1 does nothing
    fireEvent.keyDown(cell1, { key: 'Backspace' });
    expect(onChange).toHaveBeenLastCalledWith('');
    const callsAtEmpty = onChange.mock.calls.length;
    fireEvent.keyDown(cell1, { key: 'Backspace' });
    expect(onChange).toHaveBeenCalledTimes(callsAtEmpty);

    // Unhandled key does nothing
    fireEvent.keyDown(cell1, { key: 'Tab' });
    expect(onChange).toHaveBeenCalledTimes(callsAtEmpty);
  });

  it('distributes pasted values from focused cell or cell 0, strips invalid characters, focuses last filled cell, and triggers onComplete', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();

    render(<OtpCodeInput length={6} onChange={onChange} onComplete={onComplete} />);

    const group = screen.getByRole('group', { name: 'Verification code' });
    const cell1 = screen.getByLabelText('Digit 1 of 6') as HTMLInputElement;
    const cell3 = screen.getByLabelText('Digit 3 of 6') as HTMLInputElement;
    const cell6 = screen.getByLabelText('Digit 6 of 6') as HTMLInputElement;

    // Paste with no clipboardData or invalid-only string is ignored
    fireEvent.paste(cell1);
    fireEvent.paste(cell1, { clipboardData: { getData: () => 'abc-!@#' } });
    expect(onChange).not.toHaveBeenCalled();

    // Paste onto group container before focusing any cell distributes starting at 0
    fireEvent.paste(group, { clipboardData: { getData: () => '12' } });
    expect(onChange).toHaveBeenLastCalledWith('12');
    expect(onComplete).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByLabelText('Digit 2 of 6'));

    // Focus cell 3 and paste remaining digits with dashes/letters stripped
    fireEvent.focus(cell3);
    fireEvent.paste(cell3, { clipboardData: { getData: () => '34-56xyz' } });
    expect(onChange).toHaveBeenLastCalledWith('123456');
    expect(onComplete).toHaveBeenCalledWith('123456');
    expect(document.activeElement).toBe(cell6);

    // Clear button resets value and focuses first cell
    const clearBtn = screen.getByRole('button', { name: 'Clear verification code' });
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenLastCalledWith('');
    expect(document.activeElement).toBe(cell1);
    expect(screen.queryByRole('button', { name: 'Clear verification code' })).not.toBeInTheDocument();
  });

  it('supports controlled mode, alphanumeric characters, masked password inputs, and role="alert" error messaging', () => {
    const onComplete = vi.fn();

    function ControlledOtpHarness() {
      const [code, setCode] = useState('A1');
      return (
        <OtpCodeInput
          label="Recovery key"
          length={4}
          value={code}
          onChange={setCode}
          onComplete={onComplete}
          alphanumeric
          masked
          error="Invalid recovery key"
          aria-describedby="otp-hint"
          data-testid="controlled-otp"
        />
      );
    }

    render(<ControlledOtpHarness />);

    const root = screen.getByTestId('controlled-otp');
    expect(root).toHaveAttribute('data-invalid', 'true');
    expect(root).toHaveAttribute('data-masked', 'true');
    expect(root).toHaveAttribute('data-alphanumeric', 'true');

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid recovery key');

    const cell1 = screen.getByLabelText('Character 1 of 4') as HTMLInputElement;
    const cell3 = screen.getByLabelText('Character 3 of 4') as HTMLInputElement;
    const cell4 = screen.getByLabelText('Character 4 of 4') as HTMLInputElement;

    expect(cell1).toHaveAttribute('type', 'password');
    expect(cell1).toHaveAttribute('inputmode', 'text');
    expect(cell1).toHaveAttribute('aria-invalid', 'true');
    expect(cell1.getAttribute('aria-describedby')).toContain('otp-hint');
    expect(cell1.value).toBe('A');

    // Enter lowercase and uppercase alphanumeric characters
    fireEvent.change(cell3, { target: { value: 'z' } });
    fireEvent.change(cell4, { target: { value: 'Q' } });
    expect(onComplete).toHaveBeenCalledWith('A1zQ');
    expect(cell4.value).toBe('Q');
  });

  it('blocks editing, keyboard input, paste, and hides clear button when disabled (negative test)', () => {
    const onChange = vi.fn();
    const onComplete = vi.fn();

    render(
      <OtpCodeInput
        length={4}
        defaultValue="123"
        disabled
        onChange={onChange}
        onComplete={onComplete}
        data-testid="disabled-otp"
      />
    );

    expect(screen.getByTestId('disabled-otp')).toHaveAttribute('data-disabled', 'true');
    expect(screen.queryByRole('button', { name: 'Clear verification code' })).not.toBeInTheDocument();

    const cell1 = screen.getByLabelText('Digit 1 of 4') as HTMLInputElement;
    expect(cell1).toBeDisabled();

    fireEvent.change(cell1, { target: { value: '9' } });
    fireEvent.keyDown(cell1, { key: 'Backspace' });
    fireEvent.paste(cell1, { clipboardData: { getData: () => '9999' } });

    expect(onChange).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(cell1.value).toBe('1');
  });

  it('safely renders adversarial XSS payloads in label and error and strips script tags from pasted text', () => {
    const payload = '<script>window.__otpXss=1</script><img src=x onerror=alert(1)>';
    const onChange = vi.fn();

    render(
      <OtpCodeInput
        label={payload}
        error={payload}
        onChange={onChange}
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(payload);
    expect(screen.getByRole('group', { name: payload })).toBeInTheDocument();

    const cell1 = screen.getByLabelText('Digit 1 of 6');
    fireEvent.paste(cell1, { clipboardData: { getData: () => `${payload}123456` } });
    expect(onChange).toHaveBeenCalledWith('111234');
  });
});
