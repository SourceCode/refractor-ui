import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  InlineCopyTrigger,
  type InlineCopySize,
  type InlineCopyVariant,
} from './index';

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

function mockClipboardWriteText(impl: (text: string) => Promise<void>) {
  const writeText = vi.fn(impl);
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
  return writeText;
}

describe('InlineCopyTrigger', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders inline optical capsule with default well variant, forwards React 19 ref, and composes theme overrides and xstyle', () => {
    const ref = createRef<HTMLButtonElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            InlineCopyTrigger: {
              className: 'theme-copy-capsule',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <InlineCopyTrigger
          ref={ref}
          value="req_01J8Z4K9X7M2P6N3"
          className="local-copy-capsule"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginLeft: '4px' }}
          data-testid="copy-trigger"
        />
      </PrismThemeProvider>
    );

    expect(InlineCopyTrigger.displayName).toBe('InlineCopyTrigger');

    const button = screen.getByTestId('copy-trigger');
    expect(ref.current).toBe(button);
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(button).toHaveAttribute('aria-label', 'Copy req_01J8Z4K9X7M2P6N3');
    expect(button).toHaveAttribute('data-size', 'md');
    expect(button).toHaveAttribute('data-variant', 'well');
    expect(button).toHaveAttribute('data-monospace', 'true');
    expect(button).not.toHaveAttribute('data-copied');
    expect(button).toHaveClass(
      'refractor-inline-copy-trigger',
      'prism-well',
      'prism-focus-ring',
      'max-w-full',
      'min-w-0',
      'inline-flex',
      'items-center',
      'gap-2',
      'theme-copy-capsule',
      'local-copy-capsule'
    );
    expect(button).toHaveStyle({ letterSpacing: '0.2px', marginLeft: '4px' });
    expect(button.style.getPropertyValue('--prism-blur-px')).toBe('20px');

    const valueNode = screen.getByTestId('inline-copy-value');
    expect(valueNode).toHaveTextContent('req_01J8Z4K9X7M2P6N3');
    expect(valueNode).toHaveClass('min-w-0', 'truncate', 'font-mono', 'tabular-nums');
    expect(screen.getByTestId('inline-copy-icon')).toBeInTheDocument();
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();
  });

  it('supports sm/md sizes, crystal/well/ghost variants, monospace=false, displayText, custom copiedLabel, and custom aria-label', async () => {
    const writeText = mockClipboardWriteText(() => Promise.resolve());
    const onCopy = vi.fn();

    const size: InlineCopySize = 'sm';
    const variant: InlineCopyVariant = 'crystal';

    const { rerender } = render(
      <InlineCopyTrigger
        value="https://api.refractor.dev/v1/tokens/tok_full_secret_payload_9981"
        displayText="tok_full...9981"
        copiedLabel="Copied!"
        size={size}
        variant={variant}
        monospace={false}
        onCopy={onCopy}
        data-testid="copy-trigger"
      />
    );

    const button = screen.getByTestId('copy-trigger');
    expect(button).toHaveClass('prism-crystal', 'h-7', 'px-2.5', 'text-xs');
    expect(button).toHaveAttribute('data-size', 'sm');
    expect(button).toHaveAttribute('data-variant', 'crystal');
    expect(button).not.toHaveAttribute('data-monospace');
    expect(button.style.borderColor).toBe('transparent');
    expect(screen.getByTestId('inline-copy-value')).toHaveTextContent('tok_full...9981');
    expect(screen.getByTestId('inline-copy-value')).toHaveClass('font-sans');
    expect(button).toHaveAttribute('aria-label', 'Copy tok_full...9981');

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    // Copies exact `value`, not truncated `displayText`
    expect(writeText).toHaveBeenCalledWith(
      'https://api.refractor.dev/v1/tokens/tok_full_secret_payload_9981'
    );
    expect(onCopy).toHaveBeenCalledWith(
      'https://api.refractor.dev/v1/tokens/tok_full_secret_payload_9981',
      true
    );
    expect(screen.getByTestId('inline-copy-badge')).toHaveTextContent('Copied!');
    expect(button.style.borderColor).toBe('var(--prism-success-main)');
    expect(button).toHaveAttribute('aria-label', 'Copied!: tok_full...9981');

    // Ghost variant + whitespace-only copiedLabel falls back to 'Copied' + explicit aria-label
    rerender(
      <InlineCopyTrigger
        value="sha256:9f86d081"
        copiedLabel="   "
        variant="ghost"
        aria-label="Copy SHA digest"
        data-testid="copy-trigger"
      />
    );

    expect(button).toHaveClass('bg-transparent', 'border');
    expect(button).toHaveAttribute('data-variant', 'ghost');
    expect(button).toHaveAttribute('aria-label', 'Copy SHA digest');
    expect(screen.getByTestId('inline-copy-badge')).toHaveTextContent('Copied');
    expect(button.style.borderColor).toBe('var(--prism-success-main)');

    // Reset ghost border check when uncopied
    rerender(
      <InlineCopyTrigger
        key="fresh-ghost"
        value=""
        variant="ghost"
        data-testid="copy-empty"
      />
    );
    const emptyBtn = screen.getByTestId('copy-empty');
    expect(emptyBtn.style.borderColor).toBe('var(--prism-divider)');
    expect(emptyBtn).toHaveAttribute('aria-label', 'Copy to clipboard');

    await act(async () => {
      fireEvent.click(emptyBtn);
      await Promise.resolve();
    });
    expect(emptyBtn).toHaveAttribute('aria-label', 'Copied');
  });

  it('morphs trailing copy icon into glowing emerald checkmark badge using --prism-success-main, announces via aria-live, and resets after default 1800ms', async () => {
    vi.useFakeTimers();
    const writeText = mockClipboardWriteText(() => Promise.resolve());
    const onCopy = vi.fn();

    render(<InlineCopyTrigger value="commit_8f2a9c4" onCopy={onCopy} data-testid="copy-trigger" />);

    const button = screen.getByTestId('copy-trigger');
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
    expect(status).toHaveClass('sr-only');
    expect(status).toHaveTextContent('');

    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith('commit_8f2a9c4');
    expect(onCopy).toHaveBeenCalledWith('commit_8f2a9c4', true);
    expect(button).toHaveAttribute('data-copied', 'true');
    expect(button.style.borderColor).toBe('var(--prism-success-main)');

    const badge = screen.getByTestId('inline-copy-badge');
    expect(badge).toHaveTextContent('Copied');
    expect(badge.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(badge.style.color).toBe('var(--prism-success-contrast)');
    expect(badge.style.boxShadow).toBe('0 0 12px var(--prism-success-main)');
    expect(screen.queryByTestId('inline-copy-icon')).toBeNull();
    expect(status).toHaveTextContent('Copied to clipboard.');

    act(() => {
      vi.advanceTimersByTime(1799);
    });
    expect(screen.getByTestId('inline-copy-badge')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();
    expect(screen.getByTestId('inline-copy-icon')).toBeInTheDocument();
    expect(button).not.toHaveAttribute('data-copied');
    expect(status).toHaveTextContent('');
  });

  it('clamps resetDelayMs within 400..10000ms and falls back to 1800ms for non-finite values', async () => {
    vi.useFakeTimers();
    mockClipboardWriteText(() => Promise.resolve());

    const { rerender } = render(
      <InlineCopyTrigger value="low-delay" resetDelayMs={50} data-testid="copy-trigger" />
    );

    const button = screen.getByTestId('copy-trigger');
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(screen.getByTestId('inline-copy-badge')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(screen.getByTestId('inline-copy-badge')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();

    // High bound clamped to 10000ms
    rerender(
      <InlineCopyTrigger value="high-delay" resetDelayMs={45000} data-testid="copy-trigger" />
    );
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(9999);
    });
    expect(screen.getByTestId('inline-copy-badge')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();

    // Non-finite falls back to 1800ms
    rerender(
      <InlineCopyTrigger value="nan-delay" resetDelayMs={Number.NaN} data-testid="copy-trigger" />
    );
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    act(() => {
      vi.advanceTimersByTime(1799);
    });
    expect(screen.getByTestId('inline-copy-badge')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();
  });

  it('clears previous timers on repeated clicks, ignores stale out-of-order promises, and cleans up on unmount', async () => {
    vi.useFakeTimers();
    mockClipboardWriteText(() => Promise.resolve());
    const onCopy = vi.fn();

    const { unmount } = render(
      <InlineCopyTrigger value="token_repeat_99" resetDelayMs={1800} onCopy={onCopy} data-testid="copy-trigger" />
    );

    const button = screen.getByTestId('copy-trigger');
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    // Advance 1000ms, then click again — previous 1800ms timer must be cleared
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });

    // At t=2000ms (past original 1800ms), still copied because second click restarted timer
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('inline-copy-badge')).toBeInTheDocument();

    // At t=2800ms, second timer finishes and resets
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();

    // Click and unmount before timer expires -> clean timer disposal
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    unmount();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onCopy).toHaveBeenCalledTimes(3);

    // Out-of-order async promises + unmount during in-flight promise
    let resolveFirst: (() => void) | null = null;
    let resolveSecond: (() => void) | null = null;
    let callCount = 0;

    mockClipboardWriteText(
      () =>
        new Promise<void>((resolve) => {
          callCount += 1;
          if (callCount === 1) {
            resolveFirst = resolve;
          } else {
            resolveSecond = resolve;
          }
        })
    );

    const onCopyRace = vi.fn();
    const raceView = render(
      <InlineCopyTrigger value="race_token" onCopy={onCopyRace} data-testid="race-trigger" />
    );
    const raceButton = screen.getByTestId('race-trigger');

    fireEvent.click(raceButton);
    fireEvent.click(raceButton);

    await act(async () => {
      resolveSecond?.();
      await Promise.resolve();
    });
    expect(onCopyRace).toHaveBeenCalledTimes(1);
    expect(onCopyRace).toHaveBeenLastCalledWith('race_token', true);

    // Resolving stale first attempt does not fire duplicate callback
    await act(async () => {
      resolveFirst?.();
      await Promise.resolve();
    });
    expect(onCopyRace).toHaveBeenCalledTimes(1);

    // Pending promise that settles after unmount is safely ignored
    let resolveAfterUnmount: (() => void) | null = null;
    mockClipboardWriteText(
      () =>
        new Promise<void>((resolve) => {
          resolveAfterUnmount = resolve;
        })
    );

    fireEvent.click(raceButton);
    raceView.unmount();

    await act(async () => {
      resolveAfterUnmount?.();
      await Promise.resolve();
    });
    expect(onCopyRace).toHaveBeenCalledTimes(1);
  });

  it('gracefully handles missing, non-callable, rejecting, and synchronously throwing navigator.clipboard.writeText', async () => {
    const onCopy = vi.fn();

    // 1. navigator.clipboard is undefined
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    render(<InlineCopyTrigger value="fallback_payload" onCopy={onCopy} data-testid="copy-trigger" />);

    const button = screen.getByTestId('copy-trigger');
    fireEvent.click(button);
    expect(onCopy).toHaveBeenNthCalledWith(1, 'fallback_payload', false);
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Unable to copy to clipboard.');

    // 2. navigator.clipboard exists without writeText function
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {},
    });
    fireEvent.click(button);
    expect(onCopy).toHaveBeenNthCalledWith(2, 'fallback_payload', false);

    // 3. writeText rejects asynchronously
    const rejectingWrite = mockClipboardWriteText(() =>
      Promise.reject(new Error('Clipboard permission denied'))
    );
    await act(async () => {
      fireEvent.click(button);
      await Promise.resolve();
    });
    expect(rejectingWrite).toHaveBeenCalledWith('fallback_payload');
    expect(onCopy).toHaveBeenNthCalledWith(3, 'fallback_payload', false);
    expect(screen.queryByTestId('inline-copy-badge')).toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Unable to copy to clipboard.');

    // 4. navigator.clipboard getter throws synchronously
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Insecure context');
      },
    });
    fireEvent.click(button);
    expect(onCopy).toHaveBeenNthCalledWith(4, 'fallback_payload', false);

    // 5. writeText throws synchronously
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => {
          throw new Error('Synchronous security failure');
        },
      },
    });
    fireEvent.click(button);
    expect(onCopy).toHaveBeenNthCalledWith(5, 'fallback_payload', false);
  });

  it('respects disabled state, composes consumer onClick with preventDefault, and guards IME composition on keydown', async () => {
    const writeText = mockClipboardWriteText(() => Promise.resolve());
    const onCopy = vi.fn();
    const consumerKeyDown = vi.fn();

    const { rerender } = render(
      <InlineCopyTrigger
        value="disabled_token"
        disabled
        onCopy={onCopy}
        data-testid="copy-trigger"
      />
    );

    const button = screen.getByTestId('copy-trigger');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-disabled', 'true');
    expect(button).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
    fireEvent.click(button);
    expect(writeText).not.toHaveBeenCalled();
    expect(onCopy).not.toHaveBeenCalled();

    // Consumer onClick calling preventDefault cancels copy
    const preventedClick = vi.fn((event: { preventDefault: () => void }) => {
      event.preventDefault();
    });
    rerender(
      <InlineCopyTrigger
        value="guarded_token"
        onClick={preventedClick}
        onKeyDown={consumerKeyDown}
        onCopy={onCopy}
        data-testid="copy-trigger"
      />
    );

    fireEvent.click(button);
    expect(preventedClick).toHaveBeenCalledTimes(1);
    expect(writeText).not.toHaveBeenCalled();

    // IME composing keydown is prevented; non-composing keydown is not prevented
    const composingPrevented = !fireEvent.keyDown(button, { key: 'Enter', isComposing: true });
    expect(composingPrevented).toBe(true);
    expect(consumerKeyDown).toHaveBeenCalledTimes(1);

    const regularPrevented = !fireEvent.keyDown(button, { key: 'Enter', isComposing: false });
    expect(regularPrevented).toBe(false);
    expect(consumerKeyDown).toHaveBeenCalledTimes(2);
  });

  it('renders adversarial XSS payloads as literal text without injecting DOM nodes while copying exact payload', async () => {
    const payload = '<script>window.__inlineCopyXss=1</script><img src=x onerror=alert(1)>';
    const writeText = mockClipboardWriteText(() => Promise.resolve());
    const onCopy = vi.fn();

    render(
      <InlineCopyTrigger
        value={payload}
        displayText={payload}
        copiedLabel={payload}
        onCopy={onCopy}
        data-testid="xss-trigger"
      />
    );

    expect(screen.getByTestId('inline-copy-value')).toHaveTextContent(payload);

    await act(async () => {
      fireEvent.click(screen.getByTestId('xss-trigger'));
      await Promise.resolve();
    });

    expect(writeText).toHaveBeenCalledWith(payload);
    expect(onCopy).toHaveBeenCalledWith(payload, true);
    expect(screen.getByTestId('inline-copy-badge')).toHaveTextContent(payload);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
