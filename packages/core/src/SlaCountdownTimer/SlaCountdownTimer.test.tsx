import { createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  DEFAULT_SLA_CRITICAL_THRESHOLD_SECONDS,
  DEFAULT_SLA_REMAINING_SECONDS,
  DEFAULT_SLA_TOTAL_WINDOW_SECONDS,
  DEFAULT_SLA_WARNING_THRESHOLD_SECONDS,
  SlaCountdownTimer,
  type SlaCountdownVariantMap,
  type SlaEscalationEvent,
  type SlaUrgencyStateMap,
} from './index';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('SlaCountdownTimer', () => {
  it('renders default approaching telemetry, optical tokens, ref, theme overrides, and exported maps', () => {
    vi.useFakeTimers();
    const ref = createRef<HTMLDivElement>();

    const urgencyMap: SlaUrgencyStateMap = {
      nominal: true,
      approaching: true,
      critical: true,
      breached: true,
    };
    const variantMap: SlaCountdownVariantMap = {
      card: true,
      compact: true,
    };
    expect(Object.keys(urgencyMap)).toHaveLength(4);
    expect(Object.keys(variantMap)).toHaveLength(2);
    expect(DEFAULT_SLA_REMAINING_SECONDS).toBe(1420);
    expect(DEFAULT_SLA_TOTAL_WINDOW_SECONDS).toBe(3600);
    expect(DEFAULT_SLA_WARNING_THRESHOLD_SECONDS).toBe(1800);
    expect(DEFAULT_SLA_CRITICAL_THRESHOLD_SECONDS).toBe(300);

    render(
      <PrismThemeProvider
        theme={{
          components: {
            SlaCountdownTimer: {
              className: 'theme-sla-slab',
              style: { maxWidth: '460px' },
            },
          },
        }}
      >
        <SlaCountdownTimer
          ref={ref}
          className="local-sla-card"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ marginTop: '6px' }}
          data-testid="sla-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('sla-root');
    expect(ref.current).toBe(root);
    expect(SlaCountdownTimer.displayName).toBe('SlaCountdownTimer');
    expect(root).toHaveClass(
      'refractor-sla-countdown-timer',
      'prism-slab',
      'theme-sla-slab',
      'local-sla-card'
    );
    expect(root).toHaveStyle({ maxWidth: '460px', marginTop: '6px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-variant', 'card');
    expect(root).toHaveAttribute('data-urgency', 'approaching');
    expect(root).toHaveAttribute('data-running', 'true');
    expect(root).not.toHaveAttribute('data-escalated');
    expect(root).not.toHaveAttribute('data-disabled');

    expect(screen.getByTestId('sla-timer-title')).toHaveTextContent('SLA Response Countdown');
    expect(screen.getByTestId('sla-timer-ticket')).toHaveTextContent('INC-4821');
    expect(screen.getByTestId('sla-timer-policy')).toHaveTextContent('P1 · First Response');
    expect(screen.getByTestId('sla-timer-urgency-badge')).toHaveTextContent('Approaching SLA');

    const readout = screen.getByTestId('sla-timer-readout');
    expect(readout).toHaveTextContent('00:23:40');
    expect(readout.style.color).toBe('var(--prism-warning-main)');

    const progressbar = screen.getByTestId('sla-timer-progressbar');
    expect(progressbar).toHaveAttribute('role', 'progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '39');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('39%');
    expect(screen.getByTestId('sla-timer-progress-fill').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );

    const status = screen.getByTestId('sla-timer-status');
    expect(status).toHaveAttribute('role', 'status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Approaching SLA — Live · INC-4821');

    // Enforce zero raw color literals in rendered markup
    expect(root.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(root.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('transitions nominal -> approaching -> critical -> breached via fake timers and fires onBreach once', () => {
    vi.useFakeTimers();
    const onBreach = vi.fn<(event: SlaEscalationEvent) => void>();

    render(
      <SlaCountdownTimer
        ticketId="INC-777"
        remainingSeconds={6}
        warningThresholdSeconds={4}
        criticalThresholdSeconds={2}
        totalWindowSeconds={10}
        onBreach={onBreach}
        data-testid="sla-lifecycle"
      />
    );

    const root = screen.getByTestId('sla-lifecycle');
    const readout = screen.getByTestId('sla-timer-readout');

    // Nominal (6s > 4s)
    expect(root).toHaveAttribute('data-urgency', 'nominal');
    expect(readout).toHaveTextContent('00:00:06');
    expect(readout.style.color).toBe('var(--prism-success-main)');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('60%');
    expect(onBreach).not.toHaveBeenCalled();

    // Advance 2s -> Approaching (4s <= 4s)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(root).toHaveAttribute('data-urgency', 'approaching');
    expect(readout).toHaveTextContent('00:00:04');
    expect(readout.style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('40%');
    expect(onBreach).not.toHaveBeenCalled();

    // Advance 2s -> Critical (2s <= 2s)
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(root).toHaveAttribute('data-urgency', 'critical');
    expect(readout).toHaveTextContent('00:00:02');
    expect(readout.style.color).toBe('var(--prism-primary-main)');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('20%');
    expect(onBreach).not.toHaveBeenCalled();

    // Advance 1s -> Still critical at 1s
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root).toHaveAttribute('data-urgency', 'critical');
    expect(readout).toHaveTextContent('00:00:01');
    expect(onBreach).not.toHaveBeenCalled();

    // Advance 1s -> Crosses to 0s (Breached, onBreach fires once)
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root).toHaveAttribute('data-urgency', 'breached');
    expect(readout).toHaveTextContent('BREACHED +00:00:00');
    expect(readout.style.color).toBe('var(--prism-error-main)');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('0%');
    expect(screen.getByText('SLA window exhausted')).toBeInTheDocument();
    expect(onBreach).toHaveBeenCalledTimes(1);
    expect(onBreach).toHaveBeenCalledWith({
      urgency: 'breached',
      remainingSeconds: 0,
      ticketId: 'INC-777',
    });

    // Advance 5 more seconds -> counts overtime, onBreach MUST NOT fire again
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(readout).toHaveTextContent('BREACHED +00:00:05');
    expect(onBreach).toHaveBeenCalledTimes(1);
  });

  it('does not fire onBreach on mount or ticks when initialized already breached', () => {
    vi.useFakeTimers();
    const onBreach = vi.fn<(event: SlaEscalationEvent) => void>();

    render(<SlaCountdownTimer remainingSeconds={-90} onBreach={onBreach} data-testid="breached-init" />);

    expect(screen.getByTestId('breached-init')).toHaveAttribute('data-urgency', 'breached');
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +00:01:30');
    expect(onBreach).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +00:01:33');
    expect(onBreach).not.toHaveBeenCalled();
  });

  it('parses valid future/past deadlineIso, falls back on invalid ISO, and prefers finite remainingSeconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-22T12:00:00.000Z'));

    // Valid future deadlineIso (+10m)
    const { rerender } = render(
      <SlaCountdownTimer deadlineIso="2026-11-22T12:10:00.000Z" autoStart={false} />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:10:00');

    // Valid past deadlineIso (-75s)
    rerender(<SlaCountdownTimer deadlineIso="2026-11-22T11:58:45.000Z" autoStart={false} />);
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +00:01:15');

    // Invalid ISO falls back to 1420 (00:23:40)
    rerender(<SlaCountdownTimer deadlineIso="not-a-valid-iso" autoStart={false} />);
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:23:40');

    // Blank ISO falls back to 1420
    rerender(<SlaCountdownTimer deadlineIso="   " autoStart={false} />);
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:23:40');

    // Finite remainingSeconds takes precedence over deadlineIso
    rerender(
      <SlaCountdownTimer
        remainingSeconds={420}
        deadlineIso="2026-11-22T12:10:00.000Z"
        autoStart={false}
      />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:07:00');

    // Non-finite remainingSeconds falls back to valid deadlineIso
    rerender(
      <SlaCountdownTimer
        remainingSeconds={Number.NaN}
        deadlineIso="2026-11-22T12:05:00.000Z"
        autoStart={false}
      />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:05:00');
  });

  it('sanitizes NaN, Infinity, -Infinity, inverted thresholds, negative/zero windows, and -0 cleanly', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <SlaCountdownTimer
        remainingSeconds={Number.NaN}
        warningThresholdSeconds={Number.NaN}
        criticalThresholdSeconds={Number.POSITIVE_INFINITY}
        totalWindowSeconds={Number.NEGATIVE_INFINITY}
        autoStart={false}
        data-testid="sanitized-root"
      />
    );

    const root = screen.getByTestId('sanitized-root');
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:23:40');
    expect(root).toHaveAttribute('data-urgency', 'approaching');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('39%');
    expect(root.innerHTML).not.toContain('NaN');
    expect(root.innerHTML).not.toContain('Infinity');

    // Infinity remainingSeconds + zero totalWindowSeconds
    rerender(
      <SlaCountdownTimer
        remainingSeconds={Number.POSITIVE_INFINITY}
        totalWindowSeconds={0}
        autoStart={false}
        data-testid="sanitized-root"
      />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:23:40');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('39%');

    // Inverted thresholds: warning=100, critical=500 -> critical clamped to 100
    rerender(
      <SlaCountdownTimer
        remainingSeconds={150}
        warningThresholdSeconds={100}
        criticalThresholdSeconds={500}
        totalWindowSeconds={200}
        autoStart={false}
        data-testid="sanitized-root"
      />
    );
    expect(root).toHaveAttribute('data-urgency', 'nominal');
    expect(screen.getByTestId('sla-timer-progress-label')).toHaveTextContent('75%');

    rerender(
      <SlaCountdownTimer
        remainingSeconds={100}
        warningThresholdSeconds={100}
        criticalThresholdSeconds={500}
        totalWindowSeconds={200}
        autoStart={false}
        data-testid="sanitized-root"
      />
    );
    expect(root).toHaveAttribute('data-urgency', 'critical');

    // -0.2 rounds to -0, normalized to +0 breached
    rerender(
      <SlaCountdownTimer remainingSeconds={-0.2} autoStart={false} data-testid="sanitized-root" />
    );
    expect(root).toHaveAttribute('data-urgency', 'breached');
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +00:00:00');
  });

  it('formats multi-day DDd HH:MM:SS durations for both positive and breached values >= 86400s', () => {
    vi.useFakeTimers();

    const { rerender } = render(<SlaCountdownTimer remainingSeconds={86399} autoStart={false} />);
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('23:59:59');

    rerender(<SlaCountdownTimer remainingSeconds={86400} autoStart={false} />);
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('01d 00:00:00');

    rerender(<SlaCountdownTimer remainingSeconds={90061} autoStart={false} />);
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('01d 01:01:01');

    rerender(<SlaCountdownTimer remainingSeconds={-180065} autoStart={false} />);
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +02d 02:01:05');
  });

  it('supports Pause, Resume, Reset, autoStart={false}, and showControls={false}', () => {
    vi.useFakeTimers();
    const onBreach = vi.fn<(event: SlaEscalationEvent) => void>();
    const onEscalate = vi.fn<(event: SlaEscalationEvent) => void>();

    const { rerender } = render(
      <SlaCountdownTimer
        remainingSeconds={3}
        autoStart={false}
        onBreach={onBreach}
        onEscalate={onEscalate}
        data-testid="ctrl-root"
      />
    );

    const root = screen.getByTestId('ctrl-root');
    const toggleBtn = screen.getByTestId('sla-timer-toggle');
    expect(toggleBtn).toHaveTextContent('Resume');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');
    expect(root).not.toHaveAttribute('data-running');
    expect(screen.getByTestId('sla-timer-status')).toHaveTextContent('Paused');

    // Does not tick while paused
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:03');

    // Resume via click
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent('Pause');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(root).toHaveAttribute('data-running', 'true');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:01');

    // Pause via click stops ticking and cleans interval
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveTextContent('Resume');
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:01');

    // Resume to cross 0 and breach
    fireEvent.click(toggleBtn);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +00:00:00');
    expect(onBreach).toHaveBeenCalledTimes(1);

    // Escalate, then Reset clears escalation, restores initial seconds & autoStart={false} paused state
    fireEvent.click(screen.getByTestId('sla-timer-escalate'));
    expect(root).toHaveAttribute('data-escalated', 'true');

    fireEvent.click(screen.getByTestId('sla-timer-reset'));
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:03');
    expect(root).not.toHaveAttribute('data-escalated');
    expect(toggleBtn).toHaveTextContent('Resume');

    // Resuming after reset can detect a fresh breach
    fireEvent.click(toggleBtn);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onBreach).toHaveBeenCalledTimes(2);

    // showControls={false} hides all buttons
    rerender(<SlaCountdownTimer remainingSeconds={3} autoStart={false} showControls={false} />);
    expect(screen.queryByTestId('sla-timer-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sla-timer-reset')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sla-timer-escalate')).not.toBeInTheDocument();
  });

  it('invokes onEscalate, marks escalated confirmation in polite live region, and enforces IME-safe keyboard handling', () => {
    vi.useFakeTimers();
    const onEscalate = vi.fn<(event: SlaEscalationEvent) => void>();

    render(
      <SlaCountdownTimer
        ticketId="OPS-9920"
        remainingSeconds={240}
        onEscalate={onEscalate}
        data-testid="esc-root"
      />
    );

    const escalateBtn = screen.getByTestId('sla-timer-escalate');
    const toggleBtn = screen.getByTestId('sla-timer-toggle');
    const resetBtn = screen.getByTestId('sla-timer-reset');

    // IME composition Enter must be ignored
    const imeEnter = createEvent.keyDown(escalateBtn, { key: 'Enter' });
    Object.defineProperty(imeEnter, 'isComposing', { value: true });
    fireEvent(escalateBtn, imeEnter);
    expect(onEscalate).not.toHaveBeenCalled();

    // Non-activation key must be ignored
    fireEvent.keyDown(escalateBtn, { key: 'Escape' });
    expect(onEscalate).not.toHaveBeenCalled();

    // Keyboard Enter triggers Escalate cleanly
    fireEvent.keyDown(escalateBtn, { key: 'Enter' });
    expect(onEscalate).toHaveBeenCalledTimes(1);
    expect(onEscalate).toHaveBeenCalledWith({
      urgency: 'critical',
      remainingSeconds: 240,
      ticketId: 'OPS-9920',
    });
    expect(escalateBtn).toHaveAttribute('aria-pressed', 'true');
    expect(escalateBtn).toHaveTextContent('Escalated');
    expect(screen.getByTestId('esc-root')).toHaveAttribute('data-escalated', 'true');

    const status = screen.getByTestId('sla-timer-status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Escalated OPS-9920 — Critical SLA (Live)');
    expect(status).toHaveTextContent('Escalation logged');

    // Space key activates Pause/Resume and Reset cleanly
    fireEvent.keyDown(toggleBtn, { key: ' ' });
    expect(toggleBtn).toHaveTextContent('Resume');

    fireEvent.keyDown(resetBtn, { key: ' ' });
    expect(screen.getByTestId('esc-root')).not.toHaveAttribute('data-escalated');
  });

  it('renders compact variant with urgency dot, live ticking, optional Escalate button, and polite status', () => {
    vi.useFakeTimers();
    const onEscalate = vi.fn<(event: SlaEscalationEvent) => void>();

    const { rerender } = render(
      <SlaCountdownTimer
        variant="compact"
        ticketId="API-305"
        remainingSeconds={120}
        onEscalate={onEscalate}
        data-testid="compact-root"
      />
    );

    const root = screen.getByTestId('compact-root');
    expect(root).toHaveClass('refractor-sla-countdown-timer', 'prism-slab');
    expect(root).toHaveAttribute('data-variant', 'compact');
    expect(root).toHaveAttribute('data-urgency', 'critical');
    expect(screen.getByTestId('sla-timer-dot').style.backgroundColor).toBe(
      'var(--prism-primary-main)'
    );
    expect(screen.getByTestId('sla-timer-ticket')).toHaveTextContent('API-305');
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:02:00');
    expect(screen.queryByTestId('sla-timer-progressbar')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:01:55');

    const compactEscalate = screen.getByTestId('sla-timer-escalate');
    fireEvent.keyDown(compactEscalate, { key: 'Enter' });
    expect(onEscalate).toHaveBeenCalledWith({
      urgency: 'critical',
      remainingSeconds: 115,
      ticketId: 'API-305',
    });
    expect(compactEscalate).toHaveTextContent('Escalated');
    expect(screen.getByTestId('sla-timer-status')).toHaveTextContent(
      'Escalated API-305 — Critical SLA (Live)'
    );

    // Compact with showControls={false} hides Escalate button
    rerender(
      <SlaCountdownTimer
        variant="compact"
        ticketId="API-305"
        remainingSeconds={120}
        showControls={false}
        data-testid="compact-root"
      />
    );
    expect(screen.queryByTestId('sla-timer-escalate')).not.toBeInTheDocument();
  });

  it('stops ticking when disabled and cleans up window.setInterval on disable and unmount', () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const onEscalate = vi.fn<(event: SlaEscalationEvent) => void>();

    const { rerender, unmount } = render(
      <SlaCountdownTimer
        remainingSeconds={50}
        disabled
        onEscalate={onEscalate}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).not.toHaveAttribute('data-running');
    expect(screen.getByTestId('sla-timer-toggle')).toBeDisabled();
    expect(screen.getByTestId('sla-timer-reset')).toBeDisabled();
    expect(screen.getByTestId('sla-timer-escalate')).toBeDisabled();
    expect(screen.getByTestId('sla-timer-status')).toHaveTextContent('Disabled');
    expect(vi.getTimerCount()).toBe(0);

    // Disabled keyDown guard prevents invocation even if dispatched directly
    fireEvent.keyDown(screen.getByTestId('sla-timer-escalate'), { key: 'Enter' });
    expect(onEscalate).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:50');

    // Re-enable -> starts interval, then disable -> clears interval
    rerender(
      <SlaCountdownTimer
        remainingSeconds={50}
        disabled={false}
        onEscalate={onEscalate}
        data-testid="disabled-root"
      />
    );
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:48');

    rerender(
      <SlaCountdownTimer
        remainingSeconds={50}
        disabled
        onEscalate={onEscalate}
        data-testid="disabled-root"
      />
    );
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    // Compact disabled variant renders cleanly
    rerender(
      <SlaCountdownTimer
        variant="compact"
        remainingSeconds={50}
        disabled
        data-testid="disabled-root"
      />
    );
    expect(screen.getByTestId('disabled-root')).toHaveAttribute('data-disabled', 'true');
    expect(screen.getByTestId('sla-timer-escalate')).toBeDisabled();

    // Enable again then unmount -> verifies unmount interval cleanup
    rerender(
      <SlaCountdownTimer
        remainingSeconds={50}
        disabled={false}
        data-testid="disabled-root"
      />
    );
    expect(vi.getTimerCount()).toBe(1);
    const clearCountBeforeUnmount = clearIntervalSpy.mock.calls.length;
    unmount();
    expect(clearIntervalSpy.mock.calls.length).toBeGreaterThan(clearCountBeforeUnmount);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('handles dynamic remainingSeconds prop transitions cleanly including breach detection', () => {
    vi.useFakeTimers();
    const onBreach = vi.fn<(event: SlaEscalationEvent) => void>();

    const { rerender } = render(
      <SlaCountdownTimer
        ticketId="SYNC-1"
        remainingSeconds={30}
        autoStart={false}
        onBreach={onBreach}
      />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:30');

    // Transition from positive to <= 0 via prop update triggers onBreach once
    rerender(
      <SlaCountdownTimer
        ticketId="SYNC-1"
        remainingSeconds={-5}
        autoStart={false}
        onBreach={onBreach}
      />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +00:00:05');
    expect(onBreach).toHaveBeenCalledTimes(1);
    expect(onBreach).toHaveBeenCalledWith({
      urgency: 'breached',
      remainingSeconds: -5,
      ticketId: 'SYNC-1',
    });

    // Updating from breached (-5) to another breached (-15) does NOT re-fire onBreach
    rerender(
      <SlaCountdownTimer
        ticketId="SYNC-1"
        remainingSeconds={-15}
        autoStart={false}
        onBreach={onBreach}
      />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('BREACHED +00:00:15');
    expect(onBreach).toHaveBeenCalledTimes(1);

    // Updating back to positive resets breach guard
    rerender(
      <SlaCountdownTimer
        ticketId="SYNC-1"
        remainingSeconds={10}
        autoStart={false}
        onBreach={onBreach}
      />
    );
    expect(screen.getByTestId('sla-timer-readout')).toHaveTextContent('00:00:10');
  });
});
