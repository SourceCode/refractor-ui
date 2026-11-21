import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ResponseActionBar, type ResponseFeedback } from './ResponseActionBar';

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

describe('ResponseActionBar', () => {
  afterEach(() => {
    vi.useRealTimers();
    restoreClipboard();
  });

  it('renders prism-crystal pill toolbar, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ResponseActionBar: {
              className: 'theme-response-bar',
              style: { letterSpacing: '0.5px' },
            },
          },
        }}
      >
        <ResponseActionBar
          ref={ref}
          contentToCopy="Optical glass answer"
          className="local-bar"
          xstyle={{ '--prism-blur-px': '22px' }}
          style={{ marginTop: '6px' }}
          data-testid="response-bar"
          extraActions={<button type="button">Bookmark</button>}
        />
      </PrismThemeProvider>
    );

    const toolbar = screen.getByTestId('response-bar');
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveAttribute('role', 'toolbar');
    expect(toolbar).toHaveAttribute('aria-label', 'Response actions');
    expect(toolbar).toHaveClass(
      'refractor-response-action-bar',
      'prism-crystal',
      'rounded-full',
      'theme-response-bar',
      'local-bar'
    );
    expect(toolbar).toHaveStyle({ letterSpacing: '0.5px', marginTop: '6px' });
    expect(toolbar.style.getPropertyValue('--prism-blur-px')).toBe('22px');

    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thumbs up' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Thumbs down' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Bookmark' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Regenerate' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
  });

  it('copies content to clipboard, shows Copied confirmation with timer reset and unmount cleanup', () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    const onCopy = vi.fn();
    const { unmount } = render(
      <ResponseActionBar contentToCopy="Synthesized answer" onCopy={onCopy} />
    );

    const copyBtn = screen.getByRole('button', { name: 'Copy' });
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledWith('Synthesized answer');
    expect(onCopy).toHaveBeenCalledWith('Synthesized answer');
    expect(screen.getByRole('button', { name: 'Copied' })).toHaveClass('prism-emerald');
    expect(screen.getByRole('status')).toHaveTextContent('Response copied to clipboard.');

    // Repeated click resets the active timer cleanly
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

    // Trigger copy then unmount before timer resolves to verify cleanup
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    unmount();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
  });

  it('gracefully handles missing, rejecting, and throwing clipboard APIs and undefined contentToCopy', async () => {
    const onCopy = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    const { rerender } = render(<ResponseActionBar onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(onCopy).toHaveBeenCalledWith('');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();

    // Rejecting clipboard promise is caught without unhandled rejection
    const rejectingWrite = vi.fn(() => Promise.reject(new Error('Permission denied')));
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: rejectingWrite },
    });
    rerender(<ResponseActionBar contentToCopy="Retry text" onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(rejectingWrite).toHaveBeenCalledWith('Retry text');
    await Promise.resolve();

    // Synchronously throwing clipboard getter is caught gracefully
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      get() {
        throw new Error('Blocked');
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copied' }));
    expect(onCopy).toHaveBeenCalledTimes(3);
  });

  it('renders optional Regenerate and Share actions and invokes callbacks', () => {
    const onRegenerate = vi.fn();
    const onShare = vi.fn();

    render(
      <ResponseActionBar
        contentToCopy="Draft"
        onRegenerate={onRegenerate}
        onShare={onShare}
        aria-label="Assistant tools"
      />
    );

    expect(screen.getByRole('toolbar')).toHaveAttribute('aria-label', 'Assistant tools');

    fireEvent.click(screen.getByRole('button', { name: 'Regenerate' }));
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));

    expect(onRegenerate).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('toggles mutually exclusive Thumbs Up / Thumbs Down in uncontrolled mode and resets active thumb to null', () => {
    const onFeedbackChange = vi.fn();

    render(<ResponseActionBar defaultFeedback={null} onFeedbackChange={onFeedbackChange} />);

    const upBtn = screen.getByRole('button', { name: 'Thumbs up' });
    const downBtn = screen.getByRole('button', { name: 'Thumbs down' });
    const status = screen.getByRole('status');

    // Click up -> 'up'
    fireEvent.click(upBtn);
    expect(upBtn).toHaveAttribute('aria-pressed', 'true');
    expect(upBtn).toHaveClass('prism-emerald');
    expect(downBtn).toHaveAttribute('aria-pressed', 'false');
    expect(onFeedbackChange).toHaveBeenLastCalledWith('up');
    expect(status).toHaveTextContent('Marked response as helpful.');

    // Click down while up is active -> switches mutually exclusively to 'down'
    fireEvent.click(downBtn);
    expect(upBtn).toHaveAttribute('aria-pressed', 'false');
    expect(downBtn).toHaveAttribute('aria-pressed', 'true');
    expect(downBtn).toHaveClass('prism-btn-primary');
    expect(onFeedbackChange).toHaveBeenLastCalledWith('down');
    expect(status).toHaveTextContent('Marked response as unhelpful.');

    // Click down again -> resets to null
    fireEvent.click(downBtn);
    expect(upBtn).toHaveAttribute('aria-pressed', 'false');
    expect(downBtn).toHaveAttribute('aria-pressed', 'false');
    expect(onFeedbackChange).toHaveBeenLastCalledWith(null);
    expect(status).toHaveTextContent('Feedback cleared.');
  });

  it('supports controlled feedback mode without mutating state internally', () => {
    const changes: ResponseFeedback[] = [];
    const { rerender } = render(
      <ResponseActionBar
        feedback="up"
        onFeedbackChange={(next) => {
          changes.push(next);
        }}
      />
    );

    const upBtn = screen.getByRole('button', { name: 'Thumbs up' });
    const downBtn = screen.getByRole('button', { name: 'Thumbs down' });

    expect(upBtn).toHaveAttribute('aria-pressed', 'true');
    expect(downBtn).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(upBtn);
    expect(changes).toEqual([null]);
    // Still controlled at 'up' until parent updates prop
    expect(upBtn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(downBtn);
    expect(changes).toEqual([null, 'down']);

    rerender(
      <ResponseActionBar
        feedback="down"
        onFeedbackChange={(next) => {
          changes.push(next);
        }}
      />
    );
    expect(upBtn).toHaveAttribute('aria-pressed', 'false');
    expect(downBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('disables all built-in controls and blocks interactions when disabled is true (negative test)', () => {
    const onCopy = vi.fn();
    const onRegenerate = vi.fn();
    const onShare = vi.fn();
    const onFeedbackChange = vi.fn();

    render(
      <ResponseActionBar
        disabled
        contentToCopy="Locked content"
        onCopy={onCopy}
        onRegenerate={onRegenerate}
        onShare={onShare}
        onFeedbackChange={onFeedbackChange}
      />
    );

    const buttons = [
      screen.getByRole('button', { name: 'Copy' }),
      screen.getByRole('button', { name: 'Regenerate' }),
      screen.getByRole('button', { name: 'Share' }),
      screen.getByRole('button', { name: 'Thumbs up' }),
      screen.getByRole('button', { name: 'Thumbs down' }),
    ];

    for (const btn of buttons) {
      expect(btn).toBeDisabled();
      expect(btn).toHaveClass('disabled:cursor-not-allowed');
      fireEvent.click(btn);
    }

    expect(onCopy).not.toHaveBeenCalled();
    expect(onRegenerate).not.toHaveBeenCalled();
    expect(onShare).not.toHaveBeenCalled();
    expect(onFeedbackChange).not.toHaveBeenCalled();
  });

  it('safely handles adversarial XSS payload in contentToCopy without executing markup', () => {
    const payload = '<script>window.__responseBarXss=1</script><img src=x onerror=alert(1)>';
    const onCopy = vi.fn();

    render(<ResponseActionBar contentToCopy={payload} onCopy={onCopy} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));

    expect(onCopy).toHaveBeenCalledWith(payload);
    expect(document.querySelector('script')).toBeNull();
  });
});
