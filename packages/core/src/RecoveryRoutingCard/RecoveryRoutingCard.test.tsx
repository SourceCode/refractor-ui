import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { RecoveryRoutingCard, type RecoveryRouteAction } from './index';

describe('RecoveryRoutingCard', () => {
  const SAMPLE_TRACE = [
    'Error: Tool execution timed out after 30000ms',
    '    at executeTool (agent/runtime.ts:84:15)',
    '    at async runPlanStep (agent/loop.ts:212:9)',
  ].join('\n');

  it('renders prism-slab alert banner with rose tokens, errorCode pill, all route kinds, theme overrides, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const onRetry = vi.fn();
    const onSelectRoute = vi.fn();

    const routes: RecoveryRouteAction[] = [
      {
        id: 'r-retry',
        label: 'Retry tool call',
        description: 'Re-run with exponential backoff',
        kind: 'retry',
        primary: true,
        onSelect: onRetry,
      },
      {
        id: 'r-edit',
        label: 'Edit parameters',
        description: 'Adjust timeout and payload',
        kind: 'edit',
      },
      {
        id: 'r-switch',
        label: 'Switch model',
        kind: 'switch',
      },
      {
        id: 'r-skip',
        label: 'Skip step',
        kind: 'skip',
      },
      {
        id: 'r-custom',
        label: 'Inspect workspace',
      },
    ];

    render(
      <PrismThemeProvider
        theme={{
          components: {
            RecoveryRoutingCard: {
              className: 'theme-recovery-card',
              style: { maxWidth: '720px' },
            },
          },
        }}
      >
        <RecoveryRoutingCard
          ref={ref}
          title="Tool invocation timed out"
          errorCode="ERR_TOOL_TIMEOUT"
          errorMessage="The build command did not finish within the allocated budget."
          routes={routes}
          onSelectRoute={onSelectRoute}
          className="custom-recovery-card"
          style={{ borderRadius: '22px' }}
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="recovery-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('recovery-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'alert');
    expect(root).toHaveClass(
      'refractor-recovery-routing-card',
      'prism-slab',
      'theme-recovery-card',
      'custom-recovery-card'
    );
    expect(root).toHaveStyle({ maxWidth: '720px', borderRadius: '22px' });
    expect(root.style.borderColor).toContain('--prism-rose-border');
    expect(root).toHaveAttribute('data-has-error-code', 'true');
    expect(root).toHaveAttribute('data-route-count', '5');
    expect(root).not.toHaveAttribute('data-has-stack-trace');

    expect(screen.getByRole('heading', { name: 'Tool invocation timed out' })).toBeInTheDocument();
    expect(
      screen.getByText('The build command did not finish within the allocated budget.')
    ).toBeInTheDocument();

    const errorCodePill = screen.getByTestId('recovery-error-code');
    expect(errorCodePill).toHaveTextContent('ERR_TOOL_TIMEOUT');
    expect(errorCodePill.style.color).toContain('--prism-rose-text');

    // No trace toggle when stackTrace is omitted
    expect(screen.queryByRole('button', { name: /trace/i })).not.toBeInTheDocument();

    // Primary route uses prism-btn-primary, secondary routes use prism-crystal
    const retryBtn = root.querySelector('[data-route-id="r-retry"]') as HTMLButtonElement;
    const editBtn = root.querySelector('[data-route-id="r-edit"]') as HTMLButtonElement;
    const switchBtn = root.querySelector('[data-route-id="r-switch"]') as HTMLButtonElement;
    const skipBtn = root.querySelector('[data-route-id="r-skip"]') as HTMLButtonElement;
    const customBtn = root.querySelector('[data-route-id="r-custom"]') as HTMLButtonElement;

    expect(retryBtn).toHaveClass('prism-btn-primary');
    expect(retryBtn).toHaveAttribute('data-route-primary', 'true');
    expect(retryBtn.querySelector('[data-route-icon="retry"]')).toBeInTheDocument();

    expect(editBtn).toHaveClass('prism-crystal');
    expect(editBtn.querySelector('[data-route-icon="edit"]')).toBeInTheDocument();
    expect(switchBtn.querySelector('[data-route-icon="switch"]')).toBeInTheDocument();
    expect(skipBtn.querySelector('[data-route-icon="skip"]')).toBeInTheDocument();
    expect(customBtn.querySelector('[data-route-icon]')).toBeNull();

    // Clicking primary route invokes both route.onSelect and onSelectRoute
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onSelectRoute).toHaveBeenCalledWith(routes[0]);

    // Clicking a route without route.onSelect still invokes onSelectRoute
    fireEvent.click(editBtn);
    expect(onSelectRoute).toHaveBeenCalledWith(routes[1]);
  });

  it('toggles collapsible stackTrace well via Show trace / Hide trace and respects defaultShowTrace', () => {
    const { rerender } = render(
      <RecoveryRoutingCard
        title="Patch failed"
        errorMessage="Context mismatch on line 42."
        stackTrace={SAMPLE_TRACE}
        routes={[]}
        data-testid="trace-root"
      />
    );

    const root = screen.getByTestId('trace-root');
    expect(root).toHaveAttribute('data-has-stack-trace', 'true');
    expect(root).not.toHaveAttribute('data-trace-expanded');
    expect(screen.queryByTestId('recovery-stack-trace')).not.toBeInTheDocument();
    expect(screen.queryByTestId('recovery-error-code')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Recovery routes' })).not.toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: 'Show trace' });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleBtn);
    expect(root).toHaveAttribute('data-trace-expanded', 'true');
    const hideBtn = screen.getByRole('button', { name: 'Hide trace' });
    expect(hideBtn).toHaveAttribute('aria-expanded', 'true');
    const traceEl = screen.getByTestId('recovery-stack-trace');
    expect(traceEl).toHaveClass('prism-well');
    expect(traceEl.querySelector('pre > code')).toHaveTextContent(
      'Error: Tool execution timed out after 30000ms'
    );

    fireEvent.click(hideBtn);
    expect(screen.queryByTestId('recovery-stack-trace')).not.toBeInTheDocument();

    // Separate mount with defaultShowTrace={true}
    rerender(
      <RecoveryRoutingCard
        key="expanded-default"
        title="Expanded trace"
        errorMessage="Trace visible immediately."
        stackTrace={SAMPLE_TRACE}
        defaultShowTrace
        routes={[]}
      />
    );
    expect(screen.getByRole('button', { name: 'Hide trace' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByTestId('recovery-stack-trace')).toBeInTheDocument();
  });

  it('enforces disabled guards on disabled routes and works when onSelectRoute is omitted (negative)', () => {
    const disabledOnSelect = vi.fn();
    const enabledOnSelect = vi.fn();

    const routes: RecoveryRouteAction[] = [
      {
        id: 'blocked',
        label: 'Disabled primary',
        kind: 'retry',
        primary: true,
        disabled: true,
        onSelect: disabledOnSelect,
      },
      {
        id: 'allowed',
        label: 'Enabled fallback',
        description: 'Continues with safe defaults',
        kind: 'skip',
        onSelect: enabledOnSelect,
      },
    ];

    render(
      <RecoveryRoutingCard
        title="Guardrail blocked action"
        errorMessage="Write permissions revoked."
        routes={routes}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    const blockedBtn = root.querySelector('[data-route-id="blocked"]') as HTMLButtonElement;
    const allowedBtn = root.querySelector('[data-route-id="allowed"]') as HTMLButtonElement;

    expect(blockedBtn).toBeDisabled();
    fireEvent.click(blockedBtn);
    expect(disabledOnSelect).not.toHaveBeenCalled();

    expect(allowedBtn).toBeEnabled();
    fireEvent.click(allowedBtn);
    expect(enabledOnSelect).toHaveBeenCalledTimes(1);
  });

  it('renders adversarial XSS payloads across title, errorCode, errorMessage, stackTrace, and routes strictly as literal text', () => {
    const payload = '<script>window.__recoveryXss=1</script><img src=x onerror=alert(1)>';

    render(
      <RecoveryRoutingCard
        title={payload}
        errorCode={payload}
        errorMessage={payload}
        stackTrace={payload}
        defaultShowTrace
        routes={[
          {
            id: 'xss-route',
            label: payload,
            description: payload,
            kind: 'edit',
          },
        ]}
      />
    );

    expect(screen.getAllByText(payload)).toHaveLength(6);
    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});
