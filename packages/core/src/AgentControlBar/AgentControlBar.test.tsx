import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import { AgentControlBar, type AgentRunState } from './index';

describe('AgentControlBar', () => {
  it('renders prism-slab toolbar with ref, theme override, running pulse badge, step label, and transitions running -> paused -> running -> stopped', () => {
    const ref = createRef<HTMLDivElement>();
    const onStatusChange = vi.fn<(status: AgentRunState) => void>();
    const onPause = vi.fn();
    const onResume = vi.fn();
    const onStop = vi.fn();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            AgentControlBar: { className: 'theme-control-bar', style: { maxWidth: '720px' } },
          },
        }}
      >
        <AgentControlBar
          ref={ref}
          currentStepLabel="Step 2/4: Synthesizing tests"
          onStatusChange={onStatusChange}
          onPause={onPause}
          onResume={onResume}
          onStop={onStop}
          className="local-control-bar"
          xstyle={{ '--prism-blur-px': '18px' }}
          data-testid="agent-bar"
        />
      </PrismThemeProvider>
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Agent control bar' });
    expect(ref.current).toBe(toolbar);
    expect(toolbar).toHaveClass(
      'refractor-agent-control-bar',
      'prism-slab',
      'theme-control-bar',
      'local-control-bar'
    );
    expect(toolbar).toHaveStyle({ maxWidth: '720px' });
    expect(toolbar).toHaveAttribute('data-status', 'running');

    const badge = screen.getByTestId('agent-status-badge');
    expect(badge).toHaveClass('prism-emerald');
    expect(badge).toHaveTextContent('Running');
    expect(screen.getByTestId('agent-status-dot')).toHaveClass('animate-pulse');
    expect(screen.getByTestId('agent-current-step')).toHaveTextContent(
      'Step 2/4: Synthesizing tests'
    );

    // Running shows Pause and Stop, NOT Resume
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();

    // Pause -> paused
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(onPause).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenLastCalledWith('paused');
    expect(toolbar).toHaveAttribute('data-status', 'paused');
    expect(screen.getByTestId('agent-status-badge')).toHaveTextContent('Paused');
    expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();

    // Resume -> running
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(onResume).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenLastCalledWith('running');
    expect(toolbar).toHaveAttribute('data-status', 'running');
    expect(screen.getByTestId('agent-status-badge')).toHaveTextContent('Running');

    // Stop -> stopped (hides Pause/Resume/Stop and disables Redirect)
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenLastCalledWith('stopped');
    expect(toolbar).toHaveAttribute('data-status', 'stopped');
    expect(screen.getByTestId('agent-status-badge')).toHaveTextContent('Stopped');
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();

    expect(screen.getByRole('textbox', { name: 'Redirect agent instruction' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redirect' })).toBeDisabled();
  });

  it('supports idle state, custom redirectPlaceholder, mid-flight redirect submission, blank ignore, and IME-safe Enter', () => {
    const onRedirect = vi.fn<(instruction: string) => void>();

    render(
      <AgentControlBar
        defaultStatus="idle"
        redirectPlaceholder="Send new directive..."
        onRedirect={onRedirect}
      />
    );

    expect(screen.getByTestId('agent-status-badge')).toHaveTextContent('Idle');
    expect(screen.queryByTestId('agent-current-step')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resume' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop' })).not.toBeInTheDocument();

    const input = screen.getByRole('textbox', { name: 'Redirect agent instruction' });
    const redirectBtn = screen.getByRole('button', { name: 'Redirect' });
    expect(input).toHaveAttribute('placeholder', 'Send new directive...');
    expect(input).not.toBeDisabled();

    // Blank / whitespace-only input is ignored
    fireEvent.change(input, { target: { value: '    ' } });
    fireEvent.click(redirectBtn);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRedirect).not.toHaveBeenCalled();

    // IME composing Enter is ignored
    fireEvent.change(input, { target: { value: '  Focus on branch coverage  ' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onRedirect).not.toHaveBeenCalled();

    // Normal Enter submits trimmed instruction and clears input
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRedirect).toHaveBeenCalledTimes(1);
    expect(onRedirect).toHaveBeenCalledWith('Focus on branch coverage');
    expect(input).toHaveValue('');

    // Clicking Redirect button also submits trimmed instruction and clears input
    fireEvent.change(input, { target: { value: '  Skip E2E suite  ' } });
    fireEvent.click(redirectBtn);
    expect(onRedirect).toHaveBeenCalledTimes(2);
    expect(onRedirect).toHaveBeenLastCalledWith('Skip E2E suite');
    expect(input).toHaveValue('');
  });

  it('supports controlled status prop and disables redirect when status is stopped', () => {
    const onRedirect = vi.fn<(instruction: string) => void>();

    function ControlledAgentHarness() {
      const [status, setStatus] = useState<AgentRunState>('paused');
      return (
        <AgentControlBar
          status={status}
          onStatusChange={setStatus}
          onRedirect={onRedirect}
        />
      );
    }

    render(<ControlledAgentHarness />);
    expect(screen.getByTestId('agent-status-badge')).toHaveTextContent('Paused');

    // Stop from paused state
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(screen.getByTestId('agent-status-badge')).toHaveTextContent('Stopped');

    const input = screen.getByRole('textbox', { name: 'Redirect agent instruction' });
    expect(input).toBeDisabled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onRedirect).not.toHaveBeenCalled();
  });

  it('disables lifecycle controls and redirect controls when disabled is true (negative test)', () => {
    const onPause = vi.fn();
    const onStop = vi.fn();
    const onRedirect = vi.fn();

    render(
      <AgentControlBar
        disabled
        defaultStatus="running"
        onPause={onPause}
        onStop={onStop}
        onRedirect={onRedirect}
        data-testid="disabled-bar"
      />
    );

    expect(screen.getByTestId('disabled-bar')).toHaveAttribute('data-disabled', 'true');
    const pauseBtn = screen.getByRole('button', { name: 'Pause' });
    const stopBtn = screen.getByRole('button', { name: 'Stop' });
    const input = screen.getByRole('textbox', { name: 'Redirect agent instruction' });
    const redirectBtn = screen.getByRole('button', { name: 'Redirect' });

    expect(pauseBtn).toBeDisabled();
    expect(stopBtn).toBeDisabled();
    expect(input).toBeDisabled();
    expect(redirectBtn).toBeDisabled();

    fireEvent.click(pauseBtn);
    fireEvent.click(stopBtn);
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.click(redirectBtn);

    expect(onPause).not.toHaveBeenCalled();
    expect(onStop).not.toHaveBeenCalled();
    expect(onRedirect).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS payloads in currentStepLabel as literal text', () => {
    const payload = '<script>window.__agentBarXss=1</script><img src=x onerror=alert(1)>';

    render(<AgentControlBar currentStepLabel={payload} />);

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByTestId('agent-current-step')).toHaveTextContent(payload);
  });
});
