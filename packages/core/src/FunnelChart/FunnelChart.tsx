'use client';

import {
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
import { STYLE_BG_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type FunnelTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose';

export interface FunnelStage {
  /** Stable unique identifier for this funnel stage. */
  id: string;
  /** Human-readable label shown on the stage tier and summary footer. */
  label: string;
  /** Numeric volume at this stage (non-finite or negative values are safely clamped to 0). */
  value: number;
  /** Optional semantic optical tone token (cycles across semantic tones when omitted). */
  tone?: FunnelTone;
}

export interface FunnelChartProps extends BaseProps<HTMLDivElement> {
  /** Ordered conversion funnel stages from top entry to final conversion. */
  stages: FunnelStage[];
  /** Chart card heading (defaults to 'Conversion Funnel'). */
  title?: string;
  /** Shows stage-to-stage drop-off badges between consecutive tiers (defaults to true). */
  showDropoff?: boolean;
  /** Optional unit suffix appended to counts in stages and summary footer (e.g. 'k', 'users'). */
  valueUnit?: string;
  /** Callback fired when a user clicks or activates a stage via keyboard. */
  onSelectStage?: (stage: FunnelStage, overallPct: number, stepPct: number) => void;
}

interface ToneTokenPair {
  main: string;
  contrast: string;
}

interface NormalizedFunnelStage {
  key: string;
  index: number;
  stage: FunnelStage;
  id: string;
  label: string;
  value: number;
  tone: FunnelTone;
  color: string;
  contrastColor: string;
  widthPct: number;
  overallPct: number;
  stepPct: number;
  dropoffPct: number;
}

const MIN_BAR_WIDTH_PCT = 18;
const MAX_BAR_WIDTH_PCT = 100;

const TONE_CYCLE: ReadonlyArray<FunnelTone> = [
  'primary',
  'secondary',
  'emerald',
  'amber',
  'rose',
];

const TONE_TOKEN_MAP: Record<FunnelTone, ToneTokenPair> = {
  primary: {
    main: 'var(--prism-primary-main)',
    contrast: 'var(--prism-primary-contrast)',
  },
  secondary: {
    main: 'var(--prism-secondary-main)',
    contrast: 'var(--prism-secondary-contrast)',
  },
  emerald: {
    main: 'var(--prism-success-main)',
    contrast: 'var(--prism-success-contrast)',
  },
  amber: {
    main: 'var(--prism-warning-main)',
    contrast: 'var(--prism-warning-contrast)',
  },
  rose: {
    main: 'var(--prism-error-main)',
    contrast: 'var(--prism-error-contrast)',
  },
};

function sanitizeStageValue(raw: number): number {
  if (!Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return raw;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10 + 0;
}

function formatNumeric(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Number(value.toFixed(2)));
}

function formatMetric(value: number, unit?: string): string {
  const num = formatNumeric(value);
  return unit ? `${num}${unit}` : num;
}

function formatDropoffBadge(dropoffPct: number): string {
  if (dropoffPct < 0) {
    return `${formatNumeric(dropoffPct)}% drop`;
  }
  if (dropoffPct > 0) {
    return `+${formatNumeric(dropoffPct)}% gain`;
  }
  return '0% drop';
}

const headerClass = /*#__PURE__*/ stableClassName('funnel-chart', 'header');
const stagesClass = /*#__PURE__*/ stableClassName('funnel-chart', 'stages');
const summaryClass = /*#__PURE__*/ stableClassName('funnel-chart', 'summary');

function FunnelChartInner({
  stages,
  title = 'Conversion Funnel',
  showDropoff = true,
  valueUnit,
  onSelectStage,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FunnelChartProps) {
  const headingId = useId();
  const override = useComponentOverride('FunnelChart');
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);

  const isEmpty = stages.length === 0;

  const normalizedStages = useMemo<NormalizedFunnelStage[]>(() => {
    if (stages.length === 0) return [];

    const sanitizedValues = stages.map((item) => sanitizeStageValue(item.value));
    const topValue = sanitizedValues[0]!;
    let maxValue = 0;
    for (const val of sanitizedValues) {
      if (val > maxValue) {
        maxValue = val;
      }
    }

    const widthReference = Math.max(topValue, maxValue);
    const overallReference = topValue > 0 ? topValue : maxValue;

    const items: NormalizedFunnelStage[] = [];
    for (let idx = 0; idx < stages.length; idx += 1) {
      const stage = stages[idx]!;
      const value = sanitizedValues[idx]!;
      const tone: FunnelTone =
        stage.tone ?? (TONE_CYCLE[idx % TONE_CYCLE.length] as FunnelTone);
      const tokens = TONE_TOKEN_MAP[tone];

      const rawWidth = widthReference > 0 ? (value / widthReference) * 100 : MIN_BAR_WIDTH_PCT;
      const widthPct = roundOneDecimal(
        clampNumber(rawWidth, MIN_BAR_WIDTH_PCT, MAX_BAR_WIDTH_PCT, MIN_BAR_WIDTH_PCT)
      );
      const overallPct =
        overallReference > 0 ? roundOneDecimal((value / overallReference) * 100) : 0;

      let stepPct: number;
      let dropoffPct: number;
      if (idx === 0) {
        stepPct = value > 0 ? 100 : 0;
        dropoffPct = 0;
      } else {
        const prevValue = sanitizedValues[idx - 1]!;
        stepPct = prevValue > 0 ? roundOneDecimal((value / prevValue) * 100) : 0;
        dropoffPct =
          prevValue > 0 ? roundOneDecimal(((value - prevValue) / prevValue) * 100) : 0;
      }

      items.push({
        key: `stage-${stage.id}-${idx}`,
        index: idx,
        stage,
        id: stage.id,
        label: stage.label,
        value,
        tone,
        color: tokens.main,
        contrastColor: tokens.contrast,
        widthPct,
        overallPct,
        stepPct,
        dropoffPct,
      });
    }

    return items;
  }, [stages]);

  const selectedStage = useMemo<NormalizedFunnelStage | null>(() => {
    if (!selectedStageId) return null;
    return normalizedStages.find((item) => item.id === selectedStageId) ?? null;
  }, [normalizedStages, selectedStageId]);

  const finalConversionPct =
    normalizedStages.length > 0
      ? normalizedStages[normalizedStages.length - 1]!.overallPct
      : 0;

  const handleSelectStage = useCallback(
    (item: NormalizedFunnelStage) => {
      setSelectedStageId(item.id);
      onSelectStage?.(item.stage, item.overallPct, item.stepPct);
    },
    [onSelectStage]
  );

  const handleStageKeyDown = useCallback(
    (item: NormalizedFunnelStage) => (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectStage(item);
      }
    },
    [handleSelectStage]
  );

  const merged = mergeProps({
    themeTarget: themeProps('funnel-chart', {
      empty: isEmpty,
      dropoff: showDropoff,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} role="region" aria-labelledby={headingId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-3')}>
        <h4
          id={headingId}
          className="text-sm font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {title}
        </h4>

        {!isEmpty ? (
          <span
            data-testid="funnel-overall-badge"
            className="prism-crystal px-2.5 py-1 rounded-full text-xs font-mono font-medium tabular-nums"
            style={STYLE_TEXT_PRIMARY}
          >
            {`${formatNumeric(finalConversionPct)}% end-to-end`}
          </span>
        ) : null}
      </div>

      {isEmpty ? (
        <div
          role="status"
          data-testid="funnel-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center text-xs font-medium"
          style={STYLE_TEXT_SECONDARY}
        >
          No funnel stages to display.
        </div>
      ) : (
        <div data-testid="funnel-stages" className={cx(stagesClass, 'space-y-2')}>
          {normalizedStages.map((item) => {
            const isSelected = selectedStage?.id === item.id;
            return (
              <div key={item.key} className="space-y-1.5">
                {showDropoff && item.index > 0 ? (
                  <div
                    data-testid={`funnel-dropoff-${item.id}`}
                    className="flex items-center justify-center gap-2 py-0.5"
                  >
                    <span
                      aria-hidden="true"
                      className="h-px flex-1 max-w-[72px]"
                      style={STYLE_BG_DIVIDER}
                    />
                    <span
                      className="prism-well px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {formatDropoffBadge(item.dropoffPct)}
                    </span>
                    <span
                      aria-hidden="true"
                      className="h-px flex-1 max-w-[72px]"
                      style={STYLE_BG_DIVIDER}
                    />
                  </div>
                ) : null}

                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${item.label}: ${formatMetric(item.value, valueUnit)} (${formatNumeric(item.overallPct)}% overall)`}
                  data-stage-id={item.id}
                  data-selected={isSelected ? 'true' : 'false'}
                  onClick={() => handleSelectStage(item)}
                  onKeyDown={handleStageKeyDown(item)}
                  className={cx(
                    'prism-focus-ring w-full rounded-2xl p-2.5 text-left cursor-pointer transition-[color,background-color,border-color,opacity,transform] duration-150 space-y-2',
                    isSelected ? 'prism-crystal' : 'prism-well opacity-95 hover:opacity-100'
                  )}
                  style={{
                    border: isSelected
                      ? `1.5px solid ${item.color}`
                      : '1px solid var(--prism-divider)',
                  }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
                    <span
                      className="inline-flex items-center gap-2 font-medium min-w-0"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span
                      className="inline-flex items-center gap-2 font-mono tabular-nums shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <span className="font-semibold" style={STYLE_TEXT_PRIMARY}>
                        {formatMetric(item.value, valueUnit)}
                      </span>
                      <span>{`${formatNumeric(item.overallPct)}%`}</span>
                    </span>
                  </div>

                  <div className="prism-well rounded-full p-1 flex items-center justify-center">
                    <div
                      data-testid={`funnel-bar-${item.id}`}
                      data-width-pct={String(item.widthPct)}
                      className="h-6 rounded-full px-2.5 flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums transition-[color,background-color,border-color,opacity,transform] duration-200"
                      style={{
                        width: `${item.widthPct}%`,
                        backgroundColor: item.color,
                        color: item.contrastColor,
                        opacity: isSelected ? 1 : 0.88,
                      }}
                    >
                      {`${formatNumeric(item.overallPct)}%`}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!isEmpty ? (
        <div
          data-testid="funnel-summary"
          aria-live="polite"
          className={cx(
            summaryClass,
            'prism-well rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs tabular-nums'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          {selectedStage ? (
            <>
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: selectedStage.color }}
              />
              <span className="font-medium">
                {`${selectedStage.label}: ${formatMetric(selectedStage.value, valueUnit)} · ${formatNumeric(selectedStage.overallPct)}% overall · ${formatNumeric(selectedStage.stepPct)}% step conversion`}
              </span>
            </>
          ) : (
            <span style={STYLE_TEXT_SECONDARY}>
              Select any funnel stage to inspect volume, overall conversion, and step retention.
            </span>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const FunnelChart = /*#__PURE__*/ memoWithDisplayName(FunnelChartInner, 'FunnelChart');
