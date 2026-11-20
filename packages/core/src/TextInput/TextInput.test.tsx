import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  it('renders label, helper text, leading icon, forwards React 19 ref, and fires onChange/onEnter', () => {
    const ref = createRef<HTMLInputElement>();
    const onChange = vi.fn();
    const onEnter = vi.fn();
    const onKeyDown = vi.fn();

    const { container } = render(
      <TextInput
        ref={ref}
        id="email-field"
        label="Email address"
        helperText="We never share your email."
        leadingIcon={<span data-testid="lead-icon">@</span>}
        placeholder="you@example.com"
        className="custom-input"
        style={{ maxWidth: '320px' }}
        xstyle={{ '--prism-blur-px': '12px' }}
        data-testid="email-input"
        onChange={onChange}
        onKeyDown={onKeyDown}
        onEnter={onEnter}
      />
    );

    const root = container.firstElementChild as HTMLDivElement;
    expect(root).toHaveClass('refractor-text-input', 'w-full', 'custom-input');
    expect(root).toHaveStyle({ maxWidth: '320px' });

    const input = screen.getByLabelText('Email address') as HTMLInputElement;
    expect(ref.current).toBe(input);
    expect(screen.getByTestId('email-input')).toBe(input);
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(input).toHaveAttribute('aria-describedby', 'email-field-message');
    expect(screen.getByTestId('lead-icon')).toBeInTheDocument();
    expect(screen.getByText('We never share your email.')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'alice@refractor.dev' } });
    expect(onChange).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(onEnter).toHaveBeenCalledWith('alice@refractor.dev');
  });

  it('guards Enter key during IME composition and respects preventDefault', () => {
    const onEnter = vi.fn();
    render(<TextInput aria-label="IME input" defaultValue="日本語" onEnter={onEnter} />);

    const input = screen.getByLabelText('IME input');

    // Simulate IME composition Enter (isComposing = true)
    const composingEvent = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    fireEvent(input, composingEvent);
    expect(onEnter).not.toHaveBeenCalled();

    // Non-Enter key does not call onEnter
    fireEvent.keyDown(input, { key: 'a' });
    expect(onEnter).not.toHaveBeenCalled();

    // Normal Enter calls onEnter
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledWith('日本語');
  });

  it('toggles password visibility, displays error state, and applies theme component overrides', () => {
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            TextInput: { className: 'theme-input', style: { marginBottom: '12px' } },
          },
        }}
      >
        <TextInput
          label="Secret key"
          type="password"
          errorText="Key is required"
          aria-describedby="ext-hint"
          className="local-input"
        />
      </PrismThemeProvider>
    );

    const root = container.querySelector('.refractor-text-input') as HTMLDivElement;
    expect(root).toHaveClass('refractor-text-input', 'theme-input', 'local-input');
    expect(root).toHaveAttribute('data-invalid', 'true');
    expect(root).toHaveStyle({ marginBottom: '12px' });

    const input = screen.getByLabelText('Secret key');
    expect(input).toHaveAttribute('type', 'password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toContain('ext-hint');
    expect(screen.getByRole('alert')).toHaveTextContent('Key is required');

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('blocks password toggle when disabled and reflects data-disabled (negative test)', () => {
    const { container } = render(
      <TextInput label="Disabled secret" type="password" disabled />
    );

    const root = container.firstElementChild as HTMLDivElement;
    expect(root).toHaveAttribute('data-disabled', 'true');

    const input = screen.getByLabelText('Disabled secret');
    expect(input).toBeDisabled();

    const toggle = screen.getByRole('button', { name: 'Show password' });
    expect(toggle).toBeDisabled();
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('safely renders adversarial XSS strings in label, value, and errorText', () => {
    const payload = '<script>window.__xss=1</script><img src=x onerror=alert(1)>';
    render(<TextInput label={payload} defaultValue={payload} errorText={payload} />);
    expect(screen.getByRole('alert')).toHaveTextContent(payload);
    expect(screen.getByLabelText(payload)).toHaveValue(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
