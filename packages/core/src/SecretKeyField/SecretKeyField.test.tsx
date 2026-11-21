import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { SecretKeyField } from './SecretKeyField';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
  } else {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
  }
}

describe('SecretKeyField', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders optical slab with recessed well, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLDivElement>();
    const secret = 'rf_demo_9f8e7d6c5b4a3210fedcba9876';

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SecretKeyField: {
              className: 'theme-secret-card',
              style: { letterSpacing: '0.25px' },
            },
          },
        }}
      >
        <SecretKeyField
          ref={ref}
          value={secret}
          helperText="Store securely in your secrets vault."
          className="local-secret-card"
          xstyle={{ '--prism-slab-blur-px': '26px' }}
          style={{ marginTop: '8px' }}
          data-testid="secret-field"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('secret-field');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-secret-key-field',
      'prism-slab',
      'theme-secret-card',
      'local-secret-card'
    );
    expect(root).toHaveStyle({ letterSpacing: '0.25px', marginTop: '8px' });
    expect(root.style.getPropertyValue('--prism-slab-blur-px')).toBe('26px');
    expect(root).toHaveAttribute('aria-labelledby');
    expect(root).toHaveAttribute('aria-describedby');

    expect(screen.getByText('API Secret Key')).toBeInTheDocument();
    expect(screen.getByText('Store securely in your secrets vault.')).toBeInTheDocument();
    expect(screen.getByTestId('secret-key-visibility-badge')).toHaveTextContent('Masked');

    const readout = screen.getByTestId('secret-key-value');
    expect(readout).toHaveAttribute('data-revealed', 'false');
    expect(readout.textContent).toBe('rf_dem••••••••••••9876');
    expect(readout.textContent).not.toContain('9f8e7d6c');

    expect(screen.getByRole('button', { name: 'Reveal' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Rotate' })).toBeNull();
  });

  it('clamps visiblePrefixChars and visibleSuffixChars (0..16), handles non-finite numbers, and masks short keys with bullets', () => {
    const longSecret = 'rf_demo_0123456789abcdef0123456789ABCDEF9999';
    const { rerender } = render(
      <SecretKeyField
        value={longSecret}
        visiblePrefixChars={99}
        visibleSuffixChars={-5}
        aria-label="Custom credential field"
      />
    );

    const readout = screen.getByTestId('secret-key-value');
    // Prefix clamped to 16, suffix clamped to 0
    expect(readout.textContent).toBe('rf_demo_01234567••••••••••••');

    // Zero prefix and zero suffix -> pure bullets
    rerender(<SecretKeyField value={longSecret} visiblePrefixChars={0} visibleSuffixChars={0} />);
    expect(readout.textContent).toBe('••••••••••••');

    // Non-finite numbers fall back to defaults (6 and 4)
    rerender(
      <SecretKeyField
        value="rf_demo_abcdefgh1234"
        visiblePrefixChars={Number.NaN}
        visibleSuffixChars={Number.POSITIVE_INFINITY}
      />
    );
    expect(readout.textContent).toBe('rf_dem••••••••••1234');

    // Short value (< prefix + suffix + 4) -> all bullets without leaking characters
    rerender(
      <SecretKeyField value="short_key_1" visiblePrefixChars={6} visibleSuffixChars={4} />
    );
    expect(readout.textContent).toMatch(/^•+$/);
    expect(readout.textContent).not.toContain('short');
    expect(readout.textContent).not.toContain('1');
  });

  it('displays "No key configured" when value is empty and disables Reveal and Copy while allowing Rotate', () => {
    const onRotate = vi.fn();
    render(
      <SecretKeyField
        value=""
        defaultRevealed
        onRotate={onRotate}
        data-testid="empty-secret-field"
      />
    );

    const root = screen.getByTestId('empty-secret-field');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('secret-key-visibility-badge')).toHaveTextContent('Unconfigured');
    expect(screen.getByTestId('secret-key-value')).toHaveTextContent('No key configured');
    expect(screen.getByTestId('secret-key-value')).toHaveAttribute('data-revealed', 'false');

    const revealBtn = screen.getByRole('button', { name: 'Reveal' });
    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    const rotateBtn = screen.getByRole('button', { name: 'Rotate' });

    expect(revealBtn).toBeDisabled();
    expect(revealBtn).toHaveClass('disabled:cursor-not-allowed');
    expect(copyBtn).toBeDisabled();
    expect(copyBtn).toHaveClass('disabled:cursor-not-allowed');
    expect(rotateBtn).toBeEnabled();

    fireEvent.click(rotateBtn);
    expect(onRotate).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveTextContent('Secret key rotation requested.');
  });

  it('toggles Reveal / Hide visibility with aria-pressed, live announcements, and defaultRevealed support', () => {
    const secret = 'rf_demo_secret_token_9876543210';
    render(<SecretKeyField value={secret} label="Webhook Signing Secret" />);

    const readout = screen.getByTestId('secret-key-value');
    const toggleBtn = screen.getByRole('button', { name: 'Reveal' });
    const status = screen.getByRole('status');

    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(readout.textContent).not.toBe(secret);

    fireEvent.click(toggleBtn);
    const hideBtn = screen.getByRole('button', { name: 'Hide' });
    expect(hideBtn).toHaveAttribute('aria-pressed', 'true');
    expect(readout).toHaveTextContent(secret);
    expect(readout).toHaveAttribute('data-revealed', 'true');
    expect(screen.getByTestId('secret-key-visibility-badge')).toHaveTextContent('Visible');
    expect(screen.getByTestId('secret-key-visibility-badge')).toHaveClass('prism-emerald');
    expect(status).toHaveTextContent('Secret key revealed.');

    fireEvent.click(hideBtn);
    expect(screen.getByRole('button', { name: 'Reveal' })).toHaveAttribute('aria-pressed', 'false');
    expect(readout.textContent).toBe('rf_dem••••••••••••3210');
    expect(status).toHaveTextContent('Secret key hidden.');
  });

  it('supports defaultRevealed=true for initially visible keys', () => {
    const secret = 'sk_test_initial_revealed_4455';
    render(<SecretKeyField value={secret} defaultRevealed />);

    expect(screen.getByRole('button', { name: 'Hide' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('secret-key-value')).toHaveTextContent(secret);
  });

  it('copies full secret to clipboard even while masked, resets timer on repeated clicks, and cleans up on unmount', () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const secret = 'rf_demo_full_secret_value_7788';
    const onCopy = vi.fn();
    const { unmount } = render(<SecretKeyField value={secret} onCopy={onCopy} />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(writeText).toHaveBeenCalledWith(secret);
    expect(onCopy).toHaveBeenCalledWith(secret);
    const copiedBtn = screen.getByRole('button', { name: 'Copied' });
    expect(copiedBtn).toHaveClass('prism-emerald');
    expect(copiedBtn).toHaveAttribute('data-copied', 'true');
    expect(screen.getByRole('status')).toHaveTextContent('Secret key copied to clipboard.');

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(onCopy).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();

    // Verify unmount cleanup cancels pending timer cleanly
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('gracefully handles missing, rejecting, and throwing clipboard APIs', async () => {
    const secret = 'rf_demo_clipboard_resilience_0011';
    const onCopy = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(<SecretKeyField value={secret} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenCalledWith(secret);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    const rejectingWrite = vi.fn(() => Promise.reject(new Error('Clipboard denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: rejectingWrite },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(rejectingWrite).toHaveBeenCalledWith(secret);
    await Promise.resolve();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Restricted context');
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(onCopy).toHaveBeenCalledTimes(3);
  });

  it('disables Reveal, Copy, and Rotate actions when disabled=true (negative test)', () => {
    const onCopy = vi.fn();
    const onRotate = vi.fn();

    render(
      <SecretKeyField
        value="rf_demo_locked_credential_5566"
        onCopy={onCopy}
        onRotate={onRotate}
        disabled
        data-testid="disabled-secret"
      />
    );

    expect(screen.getByTestId('disabled-secret')).toHaveAttribute('data-disabled', 'true');

    const buttons = [
      screen.getByRole('button', { name: 'Reveal' }),
      screen.getByRole('button', { name: 'Copy' }),
      screen.getByRole('button', { name: 'Rotate' }),
    ];

    for (const btn of buttons) {
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass('disabled:cursor-not-allowed');
      fireEvent.click(btn);
    }

    expect(onCopy).not.toHaveBeenCalled();
    expect(onRotate).not.toHaveBeenCalled();
    expect(screen.getByTestId('secret-key-value')).toHaveAttribute('data-revealed', 'false');
  });

  it('renders adversarial XSS payloads as literal text without injecting DOM nodes', () => {
    const payload = '<script>window.__secretKeyXss=1</script><img src=x onerror=alert(1)>';
    const onCopy = vi.fn();

    render(
      <SecretKeyField
        label={payload}
        value={payload}
        helperText={payload}
        defaultRevealed
        onCopy={onCopy}
      />
    );

    expect(screen.getByTestId('secret-key-value')).toHaveTextContent(payload);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenCalledWith(payload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
