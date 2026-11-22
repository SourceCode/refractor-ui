import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  UptimeStatusBar,
  type UptimeDaySlot,
  type UptimeDayState,
  type UptimeDayStateMap,
} from './index';

const FOUR_STATE_DAYS: ReadonlyArray<UptimeDaySlot> = [
  {
    id: 'd-1',
    dateLabel: 'Nov 18',
    state: 'operational',
    uptimePct: 100,
  },
  {
    id: 'd-2',
    dateLabel: 'Nov 19',
    state: 'degraded',
    uptimePct: 99.4,
    downtimeMinutes: 9,
  },
  {
    id: 'd-3',
    dateLabel: 'Nov 20',
    state: 'outage',
    uptimePct: 95.0,
    downtimeMinutes: 72,
  },
  {
    id: 'd-4',
    dateLabel: 'Nov 21',
    state: 'maintenance',
    uptimePct: 99.8,
    downtimeMinutes: 60,
  },
];

describe('UptimeStatusBar', () => {
  it('renders default 60-day history (57 operational, 2 degraded, 1 outage), ref, overrides, SLA pill, captions, and zero raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    const { container } = render(
      <PrismThemeProvider
        theme={{
          components: {
            UptimeStatusBar: {
              className: 'theme-uptime',
              style: { maxWidth: '820px' },
            },
          },
        }}
      >
        <UptimeStatusBar
          ref={ref}
          className="consumer-uptime"
          xstyle={{ '--prism-blur-px': '16px' }}
          data-testid="uptime-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('uptime-root');
    expect(ref.current).toBe(root);
    expect(UptimeStatusBar.displayName).toBe('UptimeStatusBar');
    expect(root).toHaveClass(
      'refractor-uptime-status-bar',
      'prism-slab',
      'theme-uptime',
      'consumer-uptime'
    );
    expect(root).toHaveStyle({ maxWidth: '820px' });
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-state', 'operational');
    expect(root).toHaveAttribute('data-sla-status', 'met');
    expect(root).toHaveAttribute('data-days', '60');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Core API Edge Gateway' })
    ).toBeInTheDocument();

    const currentStatus = screen.getByTestId('uptime-current-status');
    expect(currentStatus).toHaveTextContent('Operational');
    expect(currentStatus).toHaveAttribute('data-state', 'operational');
    expect(currentStatus.style.color).toBe('var(--prism-success-main)');

    const overallPill = screen.getByTestId('uptime-overall-pill');
    expect(overallPill).toHaveTextContent('99.94% uptime');
    expect(overallPill).toHaveAttribute('data-sla-status', 'met');
    expect(overallPill.style.color).toBe('var(--prism-success-main)');

    const strip = screen.getByTestId('uptime-bar-strip');
    const bars = within(strip).getAllByRole('button');
    expect(bars).toHaveLength(60);

    const stateCounts: Record<UptimeDayState, number> = {
      operational: 0,
      degraded: 0,
      outage: 0,
      maintenance: 0,
    };
    for (const bar of bars) {
      const state = bar.getAttribute('data-state') as UptimeDayState;
      stateCounts[state] += 1;
    }
    expect(stateCounts).toEqual({
      operational: 57,
      degraded: 2,
      outage: 1,
      maintenance: 0,
    });

    // Baseline range captions
    expect(screen.getByTestId('uptime-caption-start')).toHaveTextContent(
      '60 days ago'
    );
    expect(screen.getByTestId('uptime-caption-sla')).toHaveTextContent(
      'SLA Target 99.9%'
    );
    expect(screen.getByTestId('uptime-caption-end')).toHaveTextContent('Today');

    // Recessed aria-live="polite" readout defaults to most recent incident (index 45)
    const readout = screen.getByTestId('uptime-incident-readout');
    expect(readout).toHaveAttribute('aria-live', 'polite');
    expect(readout).toHaveClass('prism-well');
    expect(screen.getByTestId('uptime-readout-status')).toHaveTextContent(
      'Degraded'
    );
    expect(screen.getByTestId('uptime-readout-pct')).toHaveTextContent('99.20%');
    expect(screen.getByTestId('uptime-readout-downtime')).toHaveTextContent(
      '12m downtime'
    );
    expect(screen.getByTestId('uptime-readout-summary')).toHaveTextContent(
      'Transient upstream cache invalidation lag caused elevated p99 gateway latency.'
    );

    const activeBar = screen.getByTestId('uptime-bar-45');
    expect(activeBar).toHaveAttribute('aria-pressed', 'true');
    expect(activeBar).toHaveAttribute('data-active', 'true');
    expect(activeBar.style.boxShadow).toContain('var(--prism-focus-ring)');

    // Zero raw hex/rgb/hsl color literals in rendered DOM
    expect(container.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(container.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);
  });

  it('supports all four day states, semantic --prism-* shading, SLA warning/breach coloring, and default state summaries', () => {
    const mapKeys: ReadonlyArray<keyof UptimeDayStateMap> = [
      'operational',
      'degraded',
      'outage',
      'maintenance',
    ];
    expect(mapKeys).toHaveLength(4);

    // 1. Severe SLA breach (< slaTargetPct - 1) and latest state = maintenance
    const { rerender } = render(
      <UptimeStatusBar
        serviceName="Payments Settlement Bus"
        days={FOUR_STATE_DAYS}
        slaTargetPct={99.9}
      />
    );

    expect(screen.getByTestId('uptime-current-status')).toHaveTextContent(
      'Maintenance'
    );
    expect(screen.getByTestId('uptime-current-status').style.color).toBe(
      'var(--prism-info-main)'
    );
    // Average = (100 + 99.4 + 95 + 99.8) / 4 = 98.55% < 98.9% -> breach
    const breachPill = screen.getByTestId('uptime-overall-pill');
    expect(breachPill).toHaveTextContent('98.55% uptime');
    expect(breachPill).toHaveAttribute('data-sla-status', 'breach');
    expect(breachPill.style.color).toBe('var(--prism-error-main)');

    // Verify each bar's semantic --prism-* background color
    expect(screen.getByTestId('uptime-bar-0').style.backgroundColor).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('uptime-bar-1').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('uptime-bar-2').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('uptime-bar-3').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );

    // Default active day is index 3 (maintenance, 60m -> 1h downtime)
    expect(screen.getByTestId('uptime-readout-downtime')).toHaveTextContent(
      '1h downtime'
    );
    expect(screen.getByTestId('uptime-readout-summary')).toHaveTextContent(
      'Scheduled maintenance window completed.'
    );

    // Click each bar to verify default summaries & downtime formatting
    fireEvent.click(screen.getByTestId('uptime-bar-2'));
    expect(screen.getByTestId('uptime-readout-status')).toHaveTextContent(
      'Outage'
    );
    expect(screen.getByTestId('uptime-readout-downtime')).toHaveTextContent(
      '1h 12m downtime'
    );
    expect(screen.getByTestId('uptime-readout-summary')).toHaveTextContent(
      'Service interruption detected during this window.'
    );

    fireEvent.click(screen.getByTestId('uptime-bar-1'));
    expect(screen.getByTestId('uptime-readout-status')).toHaveTextContent(
      'Degraded'
    );
    expect(screen.getByTestId('uptime-readout-downtime')).toHaveTextContent(
      '9m downtime'
    );
    expect(screen.getByTestId('uptime-readout-summary')).toHaveTextContent(
      'Degraded performance observed during this window.'
    );

    fireEvent.click(screen.getByTestId('uptime-bar-0'));
    expect(screen.getByTestId('uptime-readout-status')).toHaveTextContent(
      'Operational'
    );
    expect(screen.getByTestId('uptime-readout-downtime')).toHaveTextContent(
      '0m downtime'
    );
    expect(screen.getByTestId('uptime-readout-summary')).toHaveTextContent(
      'All systems operational; no incidents reported.'
    );

    // 2. Warning SLA band (within 1 percentage point below target) and latest state = degraded
    rerender(
      <UptimeStatusBar
        serviceName="Payments Settlement Bus"
        slaTargetPct={99.9}
        days={[
          { id: 'w1', dateLabel: 'Nov 20', state: 'operational', uptimePct: 100 },
          { id: 'w2', dateLabel: 'Nov 21', state: 'degraded', uptimePct: 99.0 },
        ]}
      />
    );
    // Average = 99.50%, between 98.9 and 99.9 -> warning
    const warnPill = screen.getByTestId('uptime-overall-pill');
    expect(warnPill).toHaveTextContent('99.50% uptime');
    expect(warnPill).toHaveAttribute('data-sla-status', 'warning');
    expect(warnPill.style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByTestId('uptime-current-status')).toHaveTextContent(
      'Degraded'
    );

    // 3. All-operational history defaults readout to latest day, and single-day singular caption
    rerender(
      <UptimeStatusBar
        serviceName="Static CDN Origin"
        days={[
          { id: 'op1', dateLabel: 'Nov 21', state: 'operational', uptimePct: 100 },
        ]}
      />
    );
    expect(screen.getByTestId('uptime-caption-start')).toHaveTextContent(
      '1 day ago'
    );
    expect(screen.getByTestId('uptime-readout-date')).toHaveTextContent('Nov 21');
    expect(screen.getByTestId('uptime-readout-status')).toHaveTextContent(
      'Operational'
    );

    // 4. Latest day = outage updates live header badge to Outage
    rerender(
      <UptimeStatusBar
        days={[
          { id: 'out1', dateLabel: 'Nov 21', state: 'outage', uptimePct: 80 },
        ]}
      />
    );
    expect(screen.getByTestId('uptime-current-status')).toHaveTextContent(
      'Outage'
    );
    expect(screen.getByTestId('uptime-current-status').style.color).toBe(
      'var(--prism-error-main)'
    );
  });

  it('handles click, IME-safe Enter/Space, ArrowLeft/ArrowRight, and Home/End keyboard navigation with focus movement', () => {
    const onSelectDay = vi.fn();
    render(
      <UptimeStatusBar days={FOUR_STATE_DAYS} onSelectDay={onSelectDay} />
    );

    const bar0 = screen.getByTestId('uptime-bar-0');
    const bar1 = screen.getByTestId('uptime-bar-1');
    const bar2 = screen.getByTestId('uptime-bar-2');
    const bar3 = screen.getByTestId('uptime-bar-3');

    // IME composing events are ignored
    fireEvent.keyDown(bar0, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(bar0, { key: ' ', isComposing: true });
    fireEvent.keyDown(bar0, { key: 'ArrowRight', isComposing: true });
    expect(onSelectDay).not.toHaveBeenCalled();

    // Unhandled key ignored
    fireEvent.keyDown(bar0, { key: 'Escape' });
    expect(onSelectDay).not.toHaveBeenCalled();

    // Enter selects bar0
    bar0.focus();
    fireEvent.keyDown(bar0, { key: 'Enter' });
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[0], 0);
    expect(bar0).toHaveAttribute('aria-pressed', 'true');

    // ArrowLeft on first bar stays at boundary (no-op)
    fireEvent.keyDown(bar0, { key: 'ArrowLeft' });
    expect(onSelectDay).toHaveBeenCalledTimes(1);

    // Home when already on first bar selects without redundant focus shift
    fireEvent.keyDown(bar0, { key: 'Home' });
    expect(onSelectDay).toHaveBeenCalledTimes(2);
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[0], 0);

    // ArrowRight moves focus and selection to bar1
    fireEvent.keyDown(bar0, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(bar1);
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[1], 1);
    expect(screen.getByTestId('uptime-readout-date')).toHaveTextContent('Nov 19');

    // Space activates bar2
    bar2.focus();
    fireEvent.keyDown(bar2, { key: ' ' });
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[2], 2);

    // End jumps focus and selection to bar3
    fireEvent.keyDown(bar2, { key: 'End' });
    expect(document.activeElement).toBe(bar3);
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[3], 3);
    expect(bar3).toHaveAttribute('aria-pressed', 'true');

    // ArrowRight on last bar stays at boundary (no-op)
    const callsBeforeBoundary = onSelectDay.mock.calls.length;
    fireEvent.keyDown(bar3, { key: 'ArrowRight' });
    expect(onSelectDay).toHaveBeenCalledTimes(callsBeforeBoundary);

    // End when already on last bar keeps selection
    fireEvent.keyDown(bar3, { key: 'End' });
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[3], 3);

    // ArrowLeft moves focus and selection back to bar2
    fireEvent.keyDown(bar3, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(bar2);
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[2], 2);

    // Home jumps focus and selection back to bar0
    fireEvent.keyDown(bar2, { key: 'Home' });
    expect(document.activeElement).toBe(bar0);
    expect(onSelectDay).toHaveBeenLastCalledWith(FOUR_STATE_DAYS[0], 0);
  });

  it('renders an accessible role="status" empty state when days is []', () => {
    render(
      <UptimeStatusBar
        serviceName="Archive Worker Pool"
        days={[]}
        slaTargetPct={99.95}
        data-testid="uptime-empty-root"
      />
    );

    const root = screen.getByTestId('uptime-empty-root');
    expect(root).toHaveAttribute('data-empty', 'true');
    expect(root).toHaveAttribute('data-days', '0');

    const empty = screen.getByRole('status');
    expect(empty).toBe(screen.getByTestId('uptime-empty-state'));
    expect(empty).toHaveTextContent(
      'No uptime history recorded for Archive Worker Pool.'
    );
    expect(screen.getByTestId('uptime-empty-sla')).toHaveTextContent(
      'SLA Target 99.95%'
    );
    expect(screen.queryByTestId('uptime-bar-strip')).toBeNull();
    expect(screen.queryByTestId('uptime-incident-readout')).toBeNull();
  });

  it('defends against adversarial inputs, non-finite values, SLA clamping, duplicate/prototype keys, XSS payloads, and dynamic prop replacement', () => {
    const adversarialDays: ReadonlyArray<UptimeDaySlot> = [
      {
        id: '__proto__',
        dateLabel: 'Day A',
        state: 'operational',
        uptimePct: 145,
        downtimeMinutes: -20,
      },
      {
        id: '__proto__',
        dateLabel: 'Day B',
        state: 'operational',
        uptimePct: Number.NaN,
        downtimeMinutes: Number.POSITIVE_INFINITY,
      },
      {
        id: '   ',
        dateLabel: 'Day C',
        state: 'operational',
        uptimePct: -15,
        downtimeMinutes: 5000,
        incidentSummary: '  <script>alert("xss")</script><img src=x onerror=alert(1)>  ',
      },
      {
        id: '',
        dateLabel: '   ',
        state: 'operational',
        uptimePct: 100,
      },
    ];

    const { container, rerender } = render(
      <UptimeStatusBar
        serviceName="   "
        days={adversarialDays}
        slaTargetPct={12}
      />
    );

    // Whitespace serviceName falls back to default; slaTargetPct 12 clamps to 50%
    expect(
      screen.getByRole('heading', { name: 'Core API Edge Gateway' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('uptime-caption-sla')).toHaveTextContent(
      'SLA Target 50%'
    );

    // 4 bars rendered safely without prototype pollution or duplicate key collisions
    expect(within(screen.getByTestId('uptime-bar-strip')).getAllByRole('button')).toHaveLength(4);

    // Clamped uptimePct values: 100, 0, 0, 100 -> average 50.00%
    expect(screen.getByTestId('uptime-overall-pill')).toHaveTextContent(
      '50.00% uptime'
    );

    // Day C (index 2) is the most recent incident due to incidentSummary + downtimeMinutes
    // Downtime 5000 clamps to 1440 -> 24h downtime; XSS rendered strictly as literal text
    expect(screen.getByTestId('uptime-readout-downtime')).toHaveTextContent(
      '24h downtime'
    );
    expect(screen.getByTestId('uptime-readout-summary')).toHaveTextContent(
      '<script>alert("xss")</script><img src=x onerror=alert(1)>'
    );
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // Select bar 0 and then replace days with an unrelated list to verify graceful fallback
    fireEvent.click(screen.getByTestId('uptime-bar-0'));
    expect(screen.getByTestId('uptime-readout-pct')).toHaveTextContent('100.00%');
    expect(screen.getByTestId('uptime-readout-downtime')).toHaveTextContent(
      '0m downtime'
    );

    rerender(
      <UptimeStatusBar
        days={[
          {
            id: 'fresh-1',
            dateLabel: 'Dec 1',
            state: 'operational',
            uptimePct: 100,
          },
        ]}
        slaTargetPct={Number.NaN}
      />
    );

    expect(screen.getByTestId('uptime-caption-sla')).toHaveTextContent(
      'SLA Target 99.9%'
    );
    expect(screen.getByTestId('uptime-readout-date')).toHaveTextContent('Dec 1');

    // Upper SLA clamp (> 100 -> 100%)
    rerender(
      <UptimeStatusBar
        days={[
          {
            id: 'fresh-1',
            dateLabel: 'Dec 1',
            state: 'operational',
            uptimePct: 100,
          },
        ]}
        slaTargetPct={140}
      />
    );
    expect(screen.getByTestId('uptime-caption-sla')).toHaveTextContent(
      'SLA Target 100%'
    );
  });
});
