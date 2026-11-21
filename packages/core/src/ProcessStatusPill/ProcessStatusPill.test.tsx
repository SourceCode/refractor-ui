import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { ProcessStatusPill } from './ProcessStatusPill';

describe('ProcessStatusPill', () => {
  it('renders inline prism-crystal status pill, forwards React 19 ref, and composes theme overrides', () => {
    const ref = createRef<HTMLSpanElement>();
    const onStop = vi.fn();
    const onRetry = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            ProcessStatusPill: {
              className: 'theme-process-pill',
              style: { letterSpacing: '0.1px' },
            },
          },
        }}
      >
        <ProcessStatusPill
          ref={ref}
          label="pnpm build"
          status="running"
          elapsedMs={420}
          onStop={onStop}
          onRetry={onRetry}
          className="local-process-pill"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginRight: '8px' }}
          data-testid="process-pill"
        />
      </PrismThemeProvider>
    );

    const pill = screen.getByTestId('process-pill');
    expect(ref.current).toBe(pill);
    expect(pill).toHaveAttribute('role', 'status');
    expect(pill).toHaveAttribute('data-status', 'running');
    expect(pill).toHaveAttribute('data-size', 'md');
    expect(pill).toHaveAttribute('data-has-elapsed', 'true');
    expect(pill).toHaveClass(
      'refractor-process-status-pill',
      'prism-crystal',
      'theme-process-pill',
      'local-process-pill'
    );
    expect(pill).toHaveStyle({ letterSpacing: '0.1px', marginRight: '8px' });
    expect(pill.style.getPropertyValue('--prism-blur-px')).toBe('20px');

    const icon = screen.getByTestId('process-status-icon');
    expect(icon).toHaveClass('animate-spin');
    expect(screen.getByText('pnpm build')).toBeInTheDocument();
    expect(screen.getByTestId('process-elapsed')).toHaveTextContent('420ms');

    // Running shows Stop (not Retry)
    const stopBtn = screen.getByRole('button', { name: 'Stop' });
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    fireEvent.click(stopBtn);
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('formats elapsedMs across millisecond, second, and minute ranges and ignores negative/NaN/infinite values', () => {
    const { rerender } = render(
      <ProcessStatusPill label="lint" status="success" elapsedMs={0} />
    );
    expect(screen.getByTestId('process-elapsed')).toHaveTextContent('0ms');

    rerender(<ProcessStatusPill label="lint" status="success" elapsedMs={999} />);
    expect(screen.getByTestId('process-elapsed')).toHaveTextContent('999ms');

    rerender(<ProcessStatusPill label="lint" status="success" elapsedMs={1000} />);
    expect(screen.getByTestId('process-elapsed')).toHaveTextContent('1.0s');

    rerender(<ProcessStatusPill label="lint" status="success" elapsedMs={14250} />);
    expect(screen.getByTestId('process-elapsed')).toHaveTextContent('14.3s');

    rerender(<ProcessStatusPill label="lint" status="success" elapsedMs={60000} />);
    expect(screen.getByTestId('process-elapsed')).toHaveTextContent('1m 0s');

    rerender(<ProcessStatusPill label="lint" status="success" elapsedMs={125900} />);
    expect(screen.getByTestId('process-elapsed')).toHaveTextContent('2m 5s');

    // Negative, NaN, and Infinity are ignored cleanly
    for (const invalid of [-1, -2500, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      rerender(<ProcessStatusPill label="lint" status="success" elapsedMs={invalid} />);
      expect(screen.queryByTestId('process-elapsed')).toBeNull();
    }
  });

  it('renders semantic states, finite exitCode badge, sm size variant, and contextual Stop/Retry controls', () => {
    const onStop = vi.fn();
    const onRetry = vi.fn();

    // Success state hides both Stop and Retry even if callbacks are supplied
    const { rerender } = render(
      <ProcessStatusPill
        label="vitest"
        status="success"
        size="sm"
        exitCode={0}
        onStop={onStop}
        onRetry={onRetry}
        data-testid="status-pill"
      />
    );

    const pill = screen.getByTestId('status-pill');
    expect(pill).toHaveAttribute('data-status', 'success');
    expect(pill).toHaveAttribute('data-size', 'sm');
    expect(pill).toHaveAttribute('data-has-exit-code', 'true');
    expect(screen.getByTestId('process-status-icon')).not.toHaveClass('animate-spin');

    const exitBadge = screen.getByTestId('process-exit-code');
    expect(exitBadge).toHaveTextContent('exit 0');
    expect(exitBadge.style.color).toBe('var(--prism-success-main)');
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();

    // Failed state shows Retry (not Stop) and error exit code badge
    rerender(
      <ProcessStatusPill
        label="vitest"
        status="failed"
        size="sm"
        exitCode={1}
        onStop={onStop}
        onRetry={onRetry}
      />
    );
    expect(screen.getByTestId('process-exit-code')).toHaveTextContent('exit 1');
    expect(screen.getByTestId('process-exit-code').style.color).toBe('var(--prism-error-main)');
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // Cancelled state shows Retry and ignores non-finite exit codes
    rerender(
      <ProcessStatusPill
        label="deploy"
        status="cancelled"
        exitCode={Number.NaN}
        onRetry={onRetry}
      />
    );
    expect(screen.queryByTestId('process-exit-code')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(2);

    // Running without onStop and failed without onRetry omit buttons
    rerender(<ProcessStatusPill label="deploy" status="running" />);
    expect(screen.queryByRole('button', { name: 'Stop' })).toBeNull();

    rerender(<ProcessStatusPill label="deploy" status="failed" exitCode={Number.POSITIVE_INFINITY} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(screen.queryByTestId('process-exit-code')).toBeNull();
  });

  it('renders adversarial XSS payload in label as literal text without injecting DOM nodes', () => {
    const payload = '<script>window.__pillXss=1</script><img src=x onerror=alert(1)>';
    render(<ProcessStatusPill label={payload} status="failed" exitCode={137} />);

    expect(screen.getByText(payload)).toBeInTheDocument();
    expect(screen.getByTestId('process-exit-code')).toHaveTextContent('exit 137');
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
