import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  CalendarHeatmap,
  type CalendarHeatmapEntry,
  type CalendarHeatmapTone,
} from './index';

const QUANTIZED_ENTRIES: CalendarHeatmapEntry[] = [
  { date: '2026-11-16', count: 1, detail: 'Light indexing' },
  { date: '2026-11-17', count: 2, detail: 'Canary rollout' },
  { date: '2026-11-18', count: 3 },
  { date: '2026-11-19', count: 4, detail: 'Global promotion' },
  { date: '2026-11-21', count: 2 },
];

describe('CalendarHeatmap', () => {
  it('renders deterministic UTC calendar grid, summary pills, 5-level optical legend, ref, and theme overrides without raw colors', () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <PrismThemeProvider
        theme={{
          components: {
            CalendarHeatmap: { className: 'theme-cal', style: { maxWidth: '760px' } },
          },
        }}
      >
        <CalendarHeatmap
          ref={ref}
          entries={QUANTIZED_ENTRIES}
          endDate="2026-11-21"
          className="consumer-cal"
          xstyle={{ '--prism-blur-px': '14px' }}
          data-testid="cal-root"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('cal-root');
    expect(ref.current).toBe(root);
    expect(CalendarHeatmap.displayName).toBe('CalendarHeatmap');
    expect(root).toHaveClass(
      'refractor-calendar-heatmap',
      'prism-slab',
      'theme-cal',
      'consumer-cal'
    );
    expect(root).toHaveStyle({ maxWidth: '760px' });
    expect(root).toHaveAttribute('data-tone', 'emerald');
    expect(root).toHaveAttribute('data-weeks', '12');
    expect(root).not.toHaveAttribute('data-empty');

    expect(
      screen.getByRole('heading', { name: 'Activity Calendar Heatmap' })
    ).toBeInTheDocument();

    // Summary pills: 1+2+3+4+2 = 12 events, 5 active days, streak 4 days (Nov 16..19)
    expect(screen.getByTestId('calendar-heatmap-total')).toHaveTextContent('Total12 events');
    expect(screen.getByTestId('calendar-heatmap-active-days')).toHaveTextContent('Active Days5');
    expect(screen.getByTestId('calendar-heatmap-best-streak')).toHaveTextContent(
      'Best Streak4 days'
    );

    // Legend: Less [0..4] More with stepped opacities
    const legend = screen.getByTestId('calendar-heatmap-legend');
    expect(within(legend).getByText('Less')).toBeInTheDocument();
    expect(within(legend).getByText('More')).toBeInTheDocument();
    const steps = Array.from(legend.querySelectorAll('[data-role="calendar-legend-step"]'));
    expect(steps).toHaveLength(5);
    expect(steps.map((s) => s.getAttribute('data-level'))).toEqual(['0', '1', '2', '3', '4']);
    expect(steps.map((s) => s.getAttribute('data-opacity'))).toEqual([
      '0',
      '0.24',
      '0.48',
      '0.72',
      '0.95',
    ]);
    expect(steps[0]?.querySelector('span')).toBeNull();
    const step4Tint = steps[4]?.querySelector('span') as HTMLElement | null;
    expect(step4Tint?.style.backgroundColor).toBe('var(--prism-success-main)');
    expect(step4Tint?.style.opacity).toBe('0.95');

    // Semantic table with <thead>, <tbody>, 12*7 = 84 day buttons, weekday & month markers
    const table = screen.getByRole('table', { name: 'Activity Calendar Heatmap' });
    expect(table.querySelector('thead')).not.toBeNull();
    expect(table.querySelector('tbody')).not.toBeNull();
    expect(table.innerHTML).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(table.innerHTML).not.toMatch(/\b(?:rgba?|hsla?)\s*\(/);

    const dayButtons = within(table).getAllByRole('button');
    expect(dayButtons).toHaveLength(84);

    const weekdayLabels = Array.from(
      table.querySelectorAll('[data-role="calendar-weekday-label"]')
    ).map((el) => el.textContent);
    expect(weekdayLabels).toEqual(['Mon', 'Wed', 'Fri']);

    const monthMarkers = Array.from(
      table.querySelectorAll('[data-role="calendar-month-marker"]')
    ).map((el) => el.textContent);
    expect(monthMarkers).toEqual(['Aug', 'Sep', 'Oct', 'Nov']);

    // Verify optical intensity quantization levels 0..4 and opacities
    const day0 = screen.getByRole('button', { name: '2026-11-20: 0 events' });
    const day1 = screen.getByRole('button', { name: '2026-11-16: 1 events' });
    const day2 = screen.getByRole('button', { name: '2026-11-17: 2 events' });
    const day3 = screen.getByRole('button', { name: '2026-11-18: 3 events' });
    const day4 = screen.getByRole('button', { name: '2026-11-19: 4 events' });

    expect(day0).toHaveAttribute('data-level', '0');
    expect(day0.querySelector('[data-role="calendar-cell-tint"]')).toBeNull();

    const expectedLevels: ReadonlyArray<{ btn: HTMLElement; level: string; opacity: string }> = [
      { btn: day1, level: '1', opacity: '0.24' },
      { btn: day2, level: '2', opacity: '0.48' },
      { btn: day3, level: '3', opacity: '0.72' },
      { btn: day4, level: '4', opacity: '0.95' },
    ];
    for (const item of expectedLevels) {
      expect(item.btn).toHaveAttribute('data-level', item.level);
      expect(item.btn).toHaveClass('prism-focus-ring');
      const tint = item.btn.querySelector('[data-role="calendar-cell-tint"]') as HTMLElement | null;
      expect(tint?.style.backgroundColor).toBe('var(--prism-success-main)');
      expect(tint?.style.opacity).toBe(item.opacity);
    }

    // Default readout state and UTC window bounds
    const readout = screen.getByTestId('calendar-heatmap-readout');
    expect(readout).toHaveClass('prism-well');
    expect(readout).toHaveTextContent('Select or activate any day cell to inspect activity details.');
    expect(screen.getByTestId('calendar-heatmap-window')).toHaveTextContent(
      '2026-08-30 – 2026-11-21'
    );
  });

  it('selects day cells via click and IME-safe keyboard activation, fires onSelectDay, and updates recessed readout', () => {
    const onSelectDay = vi.fn();
    render(
      <CalendarHeatmap
        title="Release Cadence"
        entries={QUANTIZED_ENTRIES}
        endDate="2026-11-21"
        valueUnit="deploys"
        onSelectDay={onSelectDay}
      />
    );

    // Click active day with detail
    const activeBtn = screen.getByRole('button', { name: '2026-11-19: 4 deploys' });
    fireEvent.click(activeBtn);
    expect(activeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(activeBtn).toHaveAttribute('data-selected', 'true');
    expect(onSelectDay).toHaveBeenCalledWith({
      date: '2026-11-19',
      count: 4,
      detail: 'Global promotion',
    });

    const readout = screen.getByTestId('calendar-heatmap-readout');
    expect(readout).toHaveTextContent('2026-11-19');
    expect(readout).toHaveTextContent('4 deploys');
    expect(screen.getByTestId('calendar-heatmap-readout-level')).toHaveTextContent('Level 4/4');
    expect(screen.getByTestId('calendar-heatmap-readout-detail')).toHaveTextContent(
      'Global promotion'
    );
    const readoutTint = readout.querySelector('[data-role="calendar-readout-tint"]') as HTMLElement | null;
    expect(readoutTint?.style.opacity).toBe('0.95');

    // IME composing Enter & Space are ignored
    const nov18Btn = screen.getByRole('button', { name: '2026-11-18: 3 deploys' });
    fireEvent.keyDown(nov18Btn, { key: 'Enter', isComposing: true });
    fireEvent.keyDown(nov18Btn, { key: ' ', isComposing: true });
    expect(onSelectDay).toHaveBeenCalledTimes(1);

    // Non-activation key ignored
    fireEvent.keyDown(nov18Btn, { key: 'Escape' });
    expect(onSelectDay).toHaveBeenCalledTimes(1);

    // Enter activates day without detail
    fireEvent.keyDown(nov18Btn, { key: 'Enter' });
    expect(onSelectDay).toHaveBeenLastCalledWith({ date: '2026-11-18', count: 3 });
    expect(screen.getByTestId('calendar-heatmap-readout-level')).toHaveTextContent('Level 3/4');
    expect(screen.queryByTestId('calendar-heatmap-readout-detail')).toBeNull();

    // Space activates level-0 empty day
    const emptyBtn = screen.getByRole('button', { name: '2026-11-20: 0 deploys' });
    fireEvent.keyDown(emptyBtn, { key: ' ' });
    expect(onSelectDay).toHaveBeenLastCalledWith({ date: '2026-11-20', count: 0 });
    expect(screen.getByTestId('calendar-heatmap-readout-level')).toHaveTextContent('Level 0/4');
    expect(readout.querySelector('[data-role="calendar-readout-tint"]')).toBeNull();
  });

  it('aggregates duplicate dates, merges details, clamps weeks (4..26), handles empty valueUnit, and formats singular streaks', () => {
    const onSelectDay = vi.fn();
    const duplicateEntries: CalendarHeatmapEntry[] = [
      { date: '2026-11-15', count: 1, detail: 'Morning sync' },
      { date: '2026-11-15', count: 2, detail: 'Evening deploy' },
      { date: '2026-11-17', count: 1, detail: 'Initial note' },
      { date: '2026-11-17', count: 1 },
      { date: '2026-11-19', count: 1 },
      { date: '2026-11-19', count: 1, detail: 'Late detail' },
      { date: '2026-11-21', count: 1.25 },
      { date: '2026-11-21', count: 1.25 },
    ];

    const { rerender } = render(
      <CalendarHeatmap
        entries={duplicateEntries}
        weeks={2}
        endDate="2026-11-21"
        valueUnit="   "
        onSelectDay={onSelectDay}
        data-testid="clamp-cal"
      />
    );

    // Clamped to min 4 weeks (28 days); active days spaced apart -> Best Streak = 1 day
    expect(screen.getByTestId('clamp-cal')).toHaveAttribute('data-weeks', '4');
    expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(28);
    expect(screen.getByTestId('calendar-heatmap-total')).toHaveTextContent('Total9.5');
    expect(screen.getByTestId('calendar-heatmap-best-streak')).toHaveTextContent(
      'Best Streak1 day'
    );

    // Duplicate date with both details merged
    fireEvent.click(screen.getByRole('button', { name: '2026-11-15: 3' }));
    expect(onSelectDay).toHaveBeenLastCalledWith({
      date: '2026-11-15',
      count: 3,
      detail: 'Morning sync; Evening deploy',
    });

    // Duplicate date where only first had detail
    fireEvent.click(screen.getByRole('button', { name: '2026-11-17: 2' }));
    expect(onSelectDay).toHaveBeenLastCalledWith({
      date: '2026-11-17',
      count: 2,
      detail: 'Initial note',
    });

    // Duplicate date where only second had detail
    fireEvent.click(screen.getByRole('button', { name: '2026-11-19: 2' }));
    expect(onSelectDay).toHaveBeenLastCalledWith({
      date: '2026-11-19',
      count: 2,
      detail: 'Late detail',
    });

    // Duplicate date with fractional counts and no detail
    fireEvent.click(screen.getByRole('button', { name: '2026-11-21: 2.5' }));
    expect(onSelectDay).toHaveBeenLastCalledWith({
      date: '2026-11-21',
      count: 2.5,
    });

    // Clamp max 26 weeks (182 days)
    rerender(
      <CalendarHeatmap
        entries={duplicateEntries}
        weeks={40}
        endDate="2026-11-21"
        data-testid="clamp-cal"
      />
    );
    expect(screen.getByTestId('clamp-cal')).toHaveAttribute('data-weeks', '26');
    expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(182);

    // NaN weeks falls back to default 12 weeks (84 days)
    rerender(
      <CalendarHeatmap
        entries={duplicateEntries}
        weeks={Number.NaN}
        endDate="2026-11-21"
        data-testid="clamp-cal"
      />
    );
    expect(screen.getByTestId('clamp-cal')).toHaveAttribute('data-weeks', '12');
    expect(within(screen.getByRole('table')).getAllByRole('button')).toHaveLength(84);
  });

  it('derives deterministic UTC anchor dates from latest valid entry or fallback, supports leap years, and clears stale selections on window shift', () => {
    // Unsorted entries; latest valid is Wednesday 2026-06-10 -> week ends Saturday 2026-06-13
    const { rerender } = render(
      <CalendarHeatmap
        entries={[
          { date: '2026-06-10', count: 5 },
          { date: '2026-06-02', count: 2 },
        ]}
        weeks={4}
        data-testid="anchor-cal"
      />
    );

    expect(screen.getByTestId('calendar-heatmap-window')).toHaveTextContent(
      '2026-05-17 – 2026-06-13'
    );
    fireEvent.click(screen.getByRole('button', { name: '2026-06-10: 5 events' }));
    expect(screen.getByTestId('calendar-heatmap-readout')).toHaveTextContent('2026-06-10');

    // Shift endDate to leap year Feb 29, 2024 (Thu -> week ends Sat 2024-03-02); previous selection clears
    rerender(
      <CalendarHeatmap
        entries={[{ date: '2024-02-29', count: 7, detail: 'Leap day batch' }]}
        weeks={4}
        endDate="2024-02-29"
        data-testid="anchor-cal"
      />
    );
    expect(screen.getByTestId('calendar-heatmap-window')).toHaveTextContent(
      '2024-02-04 – 2024-03-02'
    );
    expect(screen.getByRole('button', { name: '2024-02-29: 7 events' })).toHaveAttribute(
      'data-level',
      '4'
    );
    expect(screen.getByTestId('calendar-heatmap-readout')).toHaveTextContent(
      'Select or activate any day cell to inspect activity details.'
    );

    // Invalid endDate falls back to latest valid entry date
    rerender(
      <CalendarHeatmap
        entries={[{ date: '2026-03-14', count: 3 }]}
        weeks={4}
        endDate="2026-02-29"
        data-testid="anchor-cal"
      />
    );
    expect(screen.getByTestId('calendar-heatmap-window')).toHaveTextContent(
      '2026-02-15 – 2026-03-14'
    );

    // Empty entries with omitted endDate deterministically anchor to 2026-11-21
    rerender(<CalendarHeatmap entries={[]} data-testid="anchor-cal" />);
    expect(screen.getByTestId('anchor-cal')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('calendar-heatmap-window')).toHaveTextContent(
      '2026-08-30 – 2026-11-21'
    );
    expect(screen.getByTestId('calendar-heatmap-total')).toHaveTextContent('Total0 events');
    expect(screen.getByTestId('calendar-heatmap-active-days')).toHaveTextContent('Active Days0');
    expect(screen.getByTestId('calendar-heatmap-best-streak')).toHaveTextContent(
      'Best Streak0 days'
    );
  });

  it('supports all four semantic optical tones using --prism-* CSS custom properties', () => {
    const tones: ReadonlyArray<{ tone: CalendarHeatmapTone; token: string }> = [
      { tone: 'emerald', token: 'var(--prism-success-main)' },
      { tone: 'primary', token: 'var(--prism-primary-main)' },
      { tone: 'secondary', token: 'var(--prism-secondary-main)' },
      { tone: 'rose', token: 'var(--prism-error-main)' },
    ];

    const { rerender } = render(
      <CalendarHeatmap
        entries={[{ date: '2026-11-21', count: 10 }]}
        weeks={4}
        endDate="2026-11-21"
        tone="emerald"
        data-testid="tone-cal"
      />
    );

    for (const tc of tones) {
      rerender(
        <CalendarHeatmap
          entries={[{ date: '2026-11-21', count: 10 }]}
          weeks={4}
          endDate="2026-11-21"
          tone={tc.tone}
          data-testid="tone-cal"
        />
      );

      expect(screen.getByTestId('tone-cal')).toHaveAttribute('data-tone', tc.tone);
      const activeDay = screen.getByRole('button', { name: '2026-11-21: 10 events' });
      const tint = activeDay.querySelector('[data-role="calendar-cell-tint"]') as HTMLElement | null;
      expect(tint?.style.backgroundColor).toBe(tc.token);
      expect(tint?.style.opacity).toBe('0.95');
    }
  });

  it('defends against malformed dates, non-finite/negative counts, prototype-pollution keys, and XSS payloads', () => {
    const xssPayload = '<script>window.__calXss=1</script><img src=x onerror=alert(1)>';
    const hostileEntries: CalendarHeatmapEntry[] = [
      { date: '__proto__', count: 99, detail: 'polluted' },
      { date: 'constructor', count: 88 },
      { date: 'prototype', count: 77 },
      { date: 'not-a-date', count: 55 },
      { date: '2026-13-01', count: 44 },
      { date: '2026-02-30', count: 33 },
      { date: '0050-01-01', count: 22 },
      { date: '', count: 11 },
      { date: '2026-11-18', count: -5 },
      { date: '2026-11-19', count: Number.NaN },
      { date: '2026-11-20', count: Number.POSITIVE_INFINITY },
      { date: '2026-11-20', count: -0 },
      { date: '2026-11-21', count: 6, detail: xssPayload },
    ];

    render(
      <CalendarHeatmap
        title={xssPayload}
        valueUnit={xssPayload}
        endDate="__proto__"
        weeks={4}
        entries={hostileEntries}
        data-testid="hostile-cal"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(screen.getByRole('heading', { name: xssPayload })).toBeInTheDocument();

    // Only 2026-11-20 (-0 -> 0) and 2026-11-21 (6) passed validation -> total 6, active 1
    expect(screen.getByTestId('calendar-heatmap-active-days')).toHaveTextContent('Active Days1');
    const nov20 = screen.getByRole('button', { name: `2026-11-20: 0 ${xssPayload}` });
    expect(nov20).toHaveAttribute('data-count', '0');
    expect(nov20).toHaveAttribute('data-level', '0');

    const nov21 = screen.getByRole('button', { name: `2026-11-21: 6 ${xssPayload}` });
    fireEvent.click(nov21);
    expect(screen.getByTestId('calendar-heatmap-readout-detail')).toHaveTextContent(xssPayload);
    expect(document.querySelector('script')).toBeNull();

    // Ensure Object.prototype was never polluted
    const probe: Record<string, string> = {};
    expect(probe['polluted']).toBeUndefined();
    expect(probe['prototype']).toBeUndefined();
  });
});
