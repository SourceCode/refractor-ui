'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type CohortColorTone = 'primary' | 'emerald' | 'info';

export interface CohortRetentionRow {
  /** Stable unique identifier for the signup cohort. */
  id: string;
  /** Human-readable cohort period label (e.g. 'Jan 2026'). */
  label: string;
  /** Initial number of users acquired in this cohort. */
  size: number;
  /** Ordered retention percentages (0..100) by period; null denotes unelapsed future periods. */
  retentionPct: ReadonlyArray<number | null>;
}

export interface CohortCellSelection {
  /** Unique identifier of the selected cohort row. */
  cohortId: string;
  /** Display label of the selected cohort row. */
  cohortLabel: string;
  /** Sanitized initial user count of the selected cohort. */
  cohortSize: number;
  /** Zero-based retention period column index. */
  periodIndex: number;
  /** Formatted period header label (e.g. 'M2'). */
  periodLabel: string;
  /** Clamped retention percentage (0..100) for the selected cell. */
  retentionPct: number;
  /** Estimated retained users rounded to the nearest integer. */
  retainedUsers: number;
}

export interface CohortRetentionGridProps extends BaseProps<HTMLDivElement> {
  /** Cohort rows forming the triangular retention matrix (defaults to 6 monthly SaaS cohorts when omitted; pass [] for empty state). */
  cohorts?: ReadonlyArray<CohortRetentionRow>;
  /** Period column header prefix prepended to zero-based indices (defaults to 'M'). */
  periodPrefix?: string;
  /** Semantic --prism-* optical tone ramp applied to retention shading and legend (defaults to 'emerald'). */
  tone?: CohortColorTone;
  /** Whether to render the bottom Weighted Avg summary row inside <tfoot> (defaults to true). */
  showAverageRow?: boolean;
  /** Heading rendered in the sculpted prism-slab header (defaults to 'Cohort Retention Matrix'). */
  title?: string;
  /** Callback fired when a user clicks or keyboard-activates any elapsed cohort cell. */
  onSelectCell?: (cell: CohortCellSelection) => void;
}

interface ToneTokenPair {
  main: string;
  contrast: string;
}

interface NormalizedCohortRow {
  rowKey: string;
  rowIndex: number;
  id: string;
  label: string;
  size: number;
  retentionPct: ReadonlyArray<number | null>;
}

interface PeriodColumn {
  index: number;
  label: string;
  key: string;
  weightedAvg: number | null;
}

interface SelectedCoord {
  cohortIndex: number;
  periodIndex: number;
}

const DEFAULT_COHORTS: ReadonlyArray<CohortRetentionRow> = [
  {
    id: '2026-01',
    label: 'Jan 2026',
    size: 1240,
    retentionPct: [100, 79.4, 68.0, 61.2, 56.5, 53.1],
  },
  {
    id: '2026-02',
    label: 'Feb 2026',
    size: 1380,
    retentionPct: [100, 81.2, 70.5, 63.8, 58.9, null],
  },
  {
    id: '2026-03',
    label: 'Mar 2026',
    size: 1510,
    retentionPct: [100, 82.6, 72.1, 65.4, null, null],
  },
  {
    id: '2026-04',
    label: 'Apr 2026',
    size: 1620,
    retentionPct: [100, 84.0, 74.3, null, null, null],
  },
  {
    id: '2026-05',
    label: 'May 2026',
    size: 1790,
    retentionPct: [100, 85.5, null, null, null, null],
  },
  {
    id: '2026-06',
    label: 'Jun 2026',
    size: 1920,
    retentionPct: [100, null, null, null, null, null],
  },
];

const TONE_TOKEN_MAP: Record<CohortColorTone, ToneTokenPair> = {
  primary: {
    main: 'var(--prism-primary-main)',
    contrast: 'var(--prism-primary-contrast)',
  },
  emerald: {
    main: 'var(--prism-success-main)',
    contrast: 'var(--prism-success-contrast)',
  },
  info: {
    main: 'var(--prism-info-main)',
    contrast: 'var(--prism-info-contrast)',
  },
};

const COUNT_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

function normalizeZero(value: number): number {
  return value === 0 ? 0 : value;
}

function sanitizeSize(raw: number): number {
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, Math.round(raw));
}

function sanitizeRetention(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) {
    return null;
  }
  return normalizeZero(clampNumber(raw, 0, 100, 0));
}

function computeRetentionOpacity(pct: number): number {
  const clamped = clampNumber(pct, 0, 100, 0);
  return Number((0.08 + (clamped / 100) * 0.8).toFixed(2));
}

function formatPct(pct: number): string {
  return `${normalizeZero(pct).toFixed(1)}%`;
}

function formatCount(count: number): string {
  return COUNT_FORMATTER.format(normalizeZero(count));
}

const LEGEND_STEPS: ReadonlyArray<{ id: string; pct: number; opacity: number }> = [
  { id: 'step-0', pct: 0, opacity: computeRetentionOpacity(0) },
  { id: 'step-25', pct: 25, opacity: computeRetentionOpacity(25) },
  { id: 'step-50', pct: 50, opacity: computeRetentionOpacity(50) },
  { id: 'step-75', pct: 75, opacity: computeRetentionOpacity(75) },
  { id: 'step-100', pct: 100, opacity: computeRetentionOpacity(100) },
];

function CohortRetentionGridInner({
  cohorts,
  periodPrefix = 'M',
  tone = 'emerald',
  showAverageRow = true,
  title = 'Cohort Retention Matrix',
  onSelectCell,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: CohortRetentionGridProps) {
  const headingId = useId();
  const override = useComponentOverride('CohortRetentionGrid');
  const [selectedCoord, setSelectedCoord] = useState<SelectedCoord | null>(null);

  const sourceCohorts = cohorts ?? DEFAULT_COHORTS;
  const isEmpty = sourceCohorts.length === 0;
  const resolvedPrefix = periodPrefix.trim().length > 0 ? periodPrefix : 'M';
  const toneTokens = TONE_TOKEN_MAP[tone];

  const { rows, periods, totalUsers, m1Average, m3Average } = useMemo(() => {
    const periodCount = sourceCohorts.reduce(
      (maxLen, row) => Math.max(maxLen, row.retentionPct.length),
      0
    );

    const normalizedRows: NormalizedCohortRow[] = sourceCohorts.map((row, rowIndex) => {
      const padded: Array<number | null> = [];
      for (let p = 0; p < periodCount; p += 1) {
        padded.push(sanitizeRetention(row.retentionPct[p]));
      }
      return {
        rowKey: `cohort-row-${row.id}-${rowIndex}`,
        rowIndex,
        id: row.id,
        label: row.label,
        size: sanitizeSize(row.size),
        retentionPct: padded,
      };
    });

    const total = normalizedRows.reduce((sum, row) => sum + row.size, 0);

    const computedPeriods: PeriodColumn[] = [];
    for (let p = 0; p < periodCount; p += 1) {
      let elapsedCount = 0;
      let unweightedSum = 0;
      let weightSum = 0;
      let weightedSum = 0;

      for (const row of normalizedRows) {
        const val = row.retentionPct[p];
        if (val === null || val === undefined) continue;
        elapsedCount += 1;
        unweightedSum += val;
        weightSum += row.size;
        weightedSum += val * row.size;
      }

      const weightedAvg =
        elapsedCount === 0
          ? null
          : weightSum > 0
            ? weightedSum / weightSum
            : unweightedSum / elapsedCount;

      computedPeriods.push({
        index: p,
        label: `${resolvedPrefix}${p}`,
        key: `cohort-period-${resolvedPrefix}-${p}`,
        weightedAvg,
      });
    }

    return {
      rows: normalizedRows,
      periods: computedPeriods,
      totalUsers: total,
      m1Average: computedPeriods[1]?.weightedAvg ?? null,
      m3Average: computedPeriods[3]?.weightedAvg ?? null,
    };
  }, [resolvedPrefix, sourceCohorts]);

  const activeSelection = useMemo<CohortCellSelection | null>(() => {
    if (!selectedCoord) return null;
    const row = rows[selectedCoord.cohortIndex];
    const period = periods[selectedCoord.periodIndex];
    if (!row || !period) return null;
    const pct = row.retentionPct[selectedCoord.periodIndex];
    if (pct === null || pct === undefined) return null;

    return {
      cohortId: row.id,
      cohortLabel: row.label,
      cohortSize: row.size,
      periodIndex: period.index,
      periodLabel: period.label,
      retentionPct: pct,
      retainedUsers: Math.round((row.size * pct) / 100),
    };
  }, [periods, rows, selectedCoord]);

  const handleSelectCell = useCallback(
    (row: NormalizedCohortRow, period: PeriodColumn, retentionPct: number) => {
      setSelectedCoord({ cohortIndex: row.rowIndex, periodIndex: period.index });
      onSelectCell?.({
        cohortId: row.id,
        cohortLabel: row.label,
        cohortSize: row.size,
        periodIndex: period.index,
        periodLabel: period.label,
        retentionPct,
        retainedUsers: Math.round((row.size * retentionPct) / 100),
      });
    },
    [onSelectCell]
  );

  const handleCellKeyDown = useCallback(
    (row: NormalizedCohortRow, period: PeriodColumn, retentionPct: number) =>
      (event: ReactKeyboardEvent<HTMLButtonElement>) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleSelectCell(row, period, retentionPct);
        }
      },
    [handleSelectCell]
  );

  const merged = mergeProps({
    themeTarget: themeProps('cohort-retention-grid', {
      tone,
      empty: isEmpty,
      showAverageRow,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 space-y-4 w-full max-w-full min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('cohort-retention-grid', 'header');
  const metricsClass = stableClassName('cohort-retention-grid', 'metrics');
  const legendClass = stableClassName('cohort-retention-grid', 'legend');
  const tableClass = stableClassName('cohort-retention-grid', 'table');
  const readoutClass = stableClassName('cohort-retention-grid', 'readout');

  const m1Label = `${resolvedPrefix}1`;
  const m3Label = `${resolvedPrefix}3`;

  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-start justify-between gap-3 min-w-0 max-w-full'
        )}
      >
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h4
              id={headingId}
              className="text-sm font-semibold tracking-tight break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h4>

            {!isEmpty ? (
              <span
                data-testid="cohort-total-users"
                className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                {`${formatCount(totalUsers)} users`}
              </span>
            ) : null}
          </div>

          {!isEmpty ? (
            <div
              className={cx(
                metricsClass,
                'flex flex-wrap items-center gap-2 text-[11px] tabular-nums min-w-0'
              )}
            >
              <span
                data-testid="cohort-m1-pill"
                className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium shrink-0"
                style={STYLE_TEXT_PRIMARY}
              >
                <span style={STYLE_TEXT_SECONDARY}>
                  {`${m1Label} Avg`}
                </span>
                <span className="font-mono font-semibold" style={{ color: toneTokens.main }}>
                  {m1Average !== null ? formatPct(m1Average) : '—'}
                </span>
              </span>

              <span
                data-testid="cohort-m3-pill"
                className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium shrink-0"
                style={STYLE_TEXT_PRIMARY}
              >
                <span style={STYLE_TEXT_SECONDARY}>
                  {`${m3Label} Avg`}
                </span>
                <span className="font-mono font-semibold" style={{ color: toneTokens.main }}>
                  {m3Average !== null ? formatPct(m3Average) : '—'}
                </span>
              </span>
            </div>
          ) : null}
        </div>

        <div
          data-testid="cohort-intensity-legend"
          aria-label="Retention intensity scale from 0% to 100%"
          className={cx(
            legendClass,
            'prism-crystal px-3 py-1.5 rounded-full inline-flex flex-wrap items-center gap-1.5 text-[11px] font-medium tabular-nums max-w-full shrink-0'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span className="font-mono">0%</span>
          <span className="inline-flex items-center gap-1" aria-hidden="true">
            {LEGEND_STEPS.map((step) => (
              <span
                key={step.id}
                data-role="cohort-legend-step"
                data-percent={String(step.pct)}
                data-opacity={String(step.opacity)}
                className="prism-well relative overflow-hidden w-3.5 h-3.5 rounded-[4px] inline-block shrink-0"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    backgroundColor: toneTokens.main,
                    opacity: step.opacity,
                  }}
                />
              </span>
            ))}
          </span>
          <span className="font-mono">100%</span>
        </div>
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="cohort-retention-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No cohort retention data to display.
        </div>
      ) : (
        <>
          <div
            data-testid="cohort-table-wrapper"
            className="prism-well rounded-2xl p-2 overflow-x-auto max-w-full min-w-0"
          >
            <table
              aria-labelledby={headingId}
              className={cx(
                tableClass,
                'w-full min-w-max border-separate border-spacing-1 text-xs tabular-nums'
              )}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="px-2.5 py-2 text-left text-[11px] font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Cohort
                  </th>
                  <th
                    scope="col"
                    className="px-2.5 py-2 text-right text-[11px] font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Size
                  </th>
                  {periods.map((period) => (
                    <th
                      key={period.key}
                      scope="col"
                      className="px-2 py-2 text-center text-[11px] font-semibold font-mono whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {period.label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.map((row) => (
                  <tr key={row.rowKey} data-cohort-id={row.id}>
                    <th
                      scope="row"
                      className="px-2.5 py-1.5 text-left text-[11px] font-semibold whitespace-nowrap"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {row.label}
                    </th>

                    <td
                      className="px-2.5 py-1.5 text-right font-mono text-[11px] whitespace-nowrap"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {formatCount(row.size)}
                    </td>

                    {periods.map((period) => {
                      const cellPct = row.retentionPct[period.index];

                      if (cellPct === null || cellPct === undefined) {
                        return (
                          <td
                            key={`${row.rowKey}-${period.key}`}
                            className="p-0 align-middle"
                          >
                            <div
                              data-empty-cell="true"
                              data-cohort-id={row.id}
                              data-period={period.label}
                              aria-label={`${row.label}, ${period.label}: unelapsed period`}
                              className="w-full min-w-[60px] h-9 px-2 rounded-lg inline-flex items-center justify-center font-mono text-[11px] border border-dashed"
                              style={{
                                borderColor: 'var(--prism-divider)',
                                color: 'var(--prism-text-disabled)',
                              }}
                            >
                              —
                            </div>
                          </td>
                        );
                      }

                      const cellOpacity = computeRetentionOpacity(cellPct);
                      const retainedUsers = Math.round((row.size * cellPct) / 100);
                      const isSelected =
                        activeSelection !== null &&
                        selectedCoord !== null &&
                        selectedCoord.cohortIndex === row.rowIndex &&
                        selectedCoord.periodIndex === period.index;
                      const formattedPct = formatPct(cellPct);
                      const textColor =
                        cellPct >= 60 ? toneTokens.contrast : 'var(--prism-text-primary)';

                      return (
                        <td
                          key={`${row.rowKey}-${period.key}`}
                          className="p-0 align-middle"
                        >
                          <button
                            type="button"
                            aria-pressed={isSelected}
                            aria-label={`${row.label}, ${period.label}: ${formattedPct} retained (${formatCount(retainedUsers)} of ${formatCount(row.size)} users)`}
                            data-cohort-id={row.id}
                            data-period={period.label}
                            data-period-index={String(period.index)}
                            data-retention={cellPct.toFixed(1)}
                            data-opacity={String(cellOpacity)}
                            data-selected={isSelected ? 'true' : 'false'}
                            onClick={() => handleSelectCell(row, period, cellPct)}
                            onKeyDown={handleCellKeyDown(row, period, cellPct)}
                            className={cx(
                              'prism-focus-ring prism-well relative overflow-hidden w-full min-w-[60px] h-9 px-2 rounded-lg inline-flex items-center justify-center font-mono text-[11px] font-semibold tabular-nums cursor-pointer border transition-transform duration-150',
                              isSelected ? 'scale-[1.03]' : 'hover:scale-[1.02]'
                            )}
                            style={{
                              borderColor: isSelected
                                ? 'var(--prism-text-primary)'
                                : 'var(--prism-divider)',
                              color: textColor,
                            }}
                          >
                            <span
                              aria-hidden="true"
                              data-role="cohort-cell-tint"
                              className="absolute inset-0 pointer-events-none"
                              style={{
                                backgroundColor: toneTokens.main,
                                opacity: cellOpacity,
                              }}
                            />
                            <span className="relative z-10">{formattedPct}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {showAverageRow ? (
                <tfoot data-testid="cohort-average-footer">
                  <tr>
                    <th
                      scope="row"
                      className="px-2.5 pt-2.5 pb-1.5 text-left text-[11px] font-semibold whitespace-nowrap border-t"
                      style={{
                        borderColor: 'var(--prism-divider)',
                        color: 'var(--prism-text-primary)',
                      }}
                    >
                      Weighted Avg
                    </th>
                    <td
                      className="px-2.5 pt-2.5 pb-1.5 text-right font-mono text-[11px] font-semibold whitespace-nowrap border-t"
                      style={{
                        borderColor: 'var(--prism-divider)',
                        color: 'var(--prism-text-secondary)',
                      }}
                    >
                      {formatCount(totalUsers)}
                    </td>
                    {periods.map((period) => (
                      <td
                        key={`avg-${period.key}`}
                        data-role="cohort-avg-cell"
                        data-period={period.label}
                        className="px-1.5 pt-2.5 pb-1.5 text-center font-mono text-[11px] font-semibold whitespace-nowrap border-t"
                        style={{
                          borderColor: 'var(--prism-divider)',
                          color:
                            period.weightedAvg !== null
                              ? 'var(--prism-text-primary)'
                              : 'var(--prism-text-disabled)',
                        }}
                      >
                        {period.weightedAvg !== null ? formatPct(period.weightedAvg) : '—'}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <div
            data-testid="cohort-retention-readout"
            aria-live="polite"
            className={cx(
              readoutClass,
              'prism-well rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs tabular-nums min-w-0 max-w-full'
            )}
            style={STYLE_TEXT_PRIMARY}
          >
            {activeSelection ? (
              <span className="inline-flex flex-wrap items-center gap-2 font-medium min-w-0 break-words">
                <span
                  aria-hidden="true"
                  className="prism-well relative overflow-hidden w-3 h-3 rounded-[4px] shrink-0"
                >
                  <span
                    className="absolute inset-0"
                    style={{
                      backgroundColor: toneTokens.main,
                      opacity: computeRetentionOpacity(activeSelection.retentionPct),
                    }}
                  />
                </span>
                <span className="font-mono break-words">
                  {`${activeSelection.cohortLabel} · ${activeSelection.periodLabel} · ${formatPct(activeSelection.retentionPct)} retained · ${formatCount(activeSelection.retainedUsers)} of ${formatCount(activeSelection.cohortSize)} users`}
                </span>
              </span>
            ) : (
              <span style={STYLE_TEXT_SECONDARY}>
                Select any elapsed cohort cell to inspect retention and retained users.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export const CohortRetentionGrid = memo(CohortRetentionGridInner);
CohortRetentionGrid.displayName = 'CohortRetentionGrid';
