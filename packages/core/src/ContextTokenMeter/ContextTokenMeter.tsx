'use client';

import { useId, useMemo } from 'react';
import { AlertTriangle, Layers } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type ContextTokenSegmentKind = 'system' | 'files' | 'tools' | 'history';

export interface ContextTokenSegment {
  /** Semantic category used to map this token slice to an optical --prism-* color token. */
  kind: ContextTokenSegmentKind;
  /** Human-readable segment label rendered in the legend pill. */
  label: string;
  /** Token count consumed by this segment (sanitized to finite integer >= 0). */
  tokens: number;
}

export type ContextTokenMeterVariant = 'bar' | 'radial';

export interface ContextTokenMeterProps extends BaseProps<HTMLDivElement> {
  /** Breakdown of token usage across system, files, tools, and conversation history. */
  segments: ContextTokenSegment[];
  /** Maximum context window capacity in tokens (sanitized to finite integer >= 1). */
  maxTokens: number;
  /** Visual layout of the meter ('bar' segmented recessed track or 'radial' SVG ring; defaults to 'bar'). */
  variant?: ContextTokenMeterVariant;
  /** Utilization ratio (clamped to 0.1..0.95) at which warning status activates (defaults to 0.75). */
  warningThreshold?: number;
  /** Utilization ratio (clamped to warningThreshold..1) at which critical status activates (defaults to 0.9). */
  criticalThreshold?: number;
  /** Visible meter heading linked to the progressbar (defaults to 'Context Window'). */
  title?: string;
}

type ContextTokenHealth = 'normal' | 'warning' | 'critical';

interface NormalizedSegment {
  key: string;
  kind: ContextTokenSegmentKind;
  label: string;
  tokens: number;
  colorToken: string;
}

interface RadialSegmentArc {
  key: string;
  kind: ContextTokenSegmentKind;
  colorToken: string;
  dashArray: string;
  dashOffset: number;
}

const RADIAL_RADIUS = 32;
const RADIAL_CIRCUMFERENCE = 2 * Math.PI * RADIAL_RADIUS;

function sanitizeTokenCount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value);
}

function sanitizeMaxTokens(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.round(value);
}

function formatTokenCount(tokens: number): string {
  const safe = sanitizeTokenCount(tokens);
  if (safe < 1000) {
    return String(safe);
  }
  const rounded = Math.round((safe / 1000) * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded}k` : `${rounded.toFixed(1)}k`;
}

function getSegmentColorToken(kind: ContextTokenSegmentKind): string {
  switch (kind) {
    case 'system':
      return 'var(--prism-secondary-main)';
    case 'files':
      return 'var(--prism-primary-main)';
    case 'tools':
      return 'var(--prism-success-main)';
    case 'history':
      return 'var(--prism-warning-main)';
  }
}

function getHealthAccentToken(health: ContextTokenHealth): string {
  switch (health) {
    case 'critical':
      return 'var(--prism-error-main)';
    case 'warning':
      return 'var(--prism-warning-main)';
    case 'normal':
      return 'var(--prism-text-primary)';
  }
}

const headerClass = /*#__PURE__*/ stableClassName('context-token-meter', 'header');
const trackClass = /*#__PURE__*/ stableClassName('context-token-meter', 'track');
const radialClass = /*#__PURE__*/ stableClassName('context-token-meter', 'radial');
const legendClass = /*#__PURE__*/ stableClassName('context-token-meter', 'legend');

function ContextTokenMeterInner({
  segments,
  maxTokens,
  variant = 'bar',
  warningThreshold = 0.75,
  criticalThreshold = 0.9,
  title = 'Context Window',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ContextTokenMeterProps) {
  const override = useComponentOverride('ContextTokenMeter');
  const headingId = useId();

  const safeMaxTokens = sanitizeMaxTokens(maxTokens);
  const safeWarning = clampNumber(warningThreshold, 0.1, 0.95, 0.75);
  const safeCritical = clampNumber(
    criticalThreshold,
    safeWarning,
    1,
    Math.max(safeWarning, 0.9)
  );

  const normalizedSegments = useMemo<NormalizedSegment[]>(() => {
    const keyCounts = new Map<string, number>();
    return segments.map((segment) => {
      const baseKey = `${segment.kind}:${segment.label}`;
      const seen = keyCounts.get(baseKey) ?? 0;
      keyCounts.set(baseKey, seen + 1);
      const key = seen === 0 ? baseKey : `${baseKey}#${seen + 1}`;
      return {
        key,
        kind: segment.kind,
        label: segment.label,
        tokens: sanitizeTokenCount(segment.tokens),
        colorToken: getSegmentColorToken(segment.kind),
      };
    });
  }, [segments]);

  const usedTokens = useMemo(
    () => normalizedSegments.reduce((sum, segment) => sum + segment.tokens, 0),
    [normalizedSegments]
  );

  const ratio = usedTokens / safeMaxTokens;
  const percent = Math.min(100, Math.round(ratio * 100));
  const health: ContextTokenHealth =
    ratio >= safeCritical
      ? 'critical'
      : ratio >= safeWarning
        ? 'warning'
        : 'normal';

  const usedLabel = formatTokenCount(usedTokens);
  const maxLabel = formatTokenCount(safeMaxTokens);
  const valueText = `${percent}% (${usedLabel} / ${maxLabel} tokens)`;
  const scaleDenominator = Math.max(safeMaxTokens, usedTokens);
  const healthAccentToken = getHealthAccentToken(health);

  const radialArcs = useMemo<RadialSegmentArc[]>(() => {
    const arcs: RadialSegmentArc[] = [];
    let offset = 0;
    for (const segment of normalizedSegments) {
      if (segment.tokens <= 0) continue;
      const arcLength = (segment.tokens / scaleDenominator) * RADIAL_CIRCUMFERENCE;
      arcs.push({
        key: segment.key,
        kind: segment.kind,
        colorToken: segment.colorToken,
        dashArray: `${arcLength} ${Math.max(0, RADIAL_CIRCUMFERENCE - arcLength)}`,
        dashOffset: -offset,
      });
      offset += arcLength;
    }
    return arcs;
  }, [normalizedSegments, scaleDenominator]);

  const merged = mergeProps({
    themeTarget: themeProps('context-token-meter', {
      variant,
      health,
      empty: normalizedSegments.length === 0,
    }),
    baseClassName: 'prism-contain-leaf prism-slab p-4 w-full space-y-3',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const legendContent =
    normalizedSegments.length > 0 ? (
      <ul
        aria-label="Context token breakdown"
        data-testid="context-token-legend"
        className={cx(legendClass, 'flex flex-wrap items-center gap-1.5')}
      >
        {normalizedSegments.map((segment) => (
          <li
            key={segment.key}
            data-testid={`context-legend-${segment.kind}`}
            data-segment-kind={segment.kind}
            className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
            style={STYLE_TEXT_PRIMARY}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: segment.colorToken }}
            />
            <span className="truncate max-w-[10rem]">{segment.label}</span>
            <span
              className="font-mono tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {formatTokenCount(segment.tokens)}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <div
        data-testid="context-token-empty"
        className="prism-well rounded-2xl px-3 py-2 text-xs"
        style={STYLE_TEXT_SECONDARY}
      >
        No token segments recorded.
      </div>
    );

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2')}>
        <div className="min-w-0 flex items-center gap-2">
          <span
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{
              color:
                health === 'normal'
                  ? 'var(--prism-secondary-main)'
                  : healthAccentToken,
            }}
          >
            <Layers aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </span>
          <span
            id={headingId}
            className="text-xs font-semibold truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>
          {health !== 'normal' ? (
            <span
              role="status"
              aria-live="polite"
              data-testid="context-token-health"
              data-health={health}
              className="prism-crystal inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0"
              style={{ color: healthAccentToken }}
            >
              <AlertTriangle aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>{health === 'critical' ? 'Critical' : 'Warning'}</span>
            </span>
          ) : null}
        </div>

        <span
          data-testid="context-token-summary"
          className="font-mono text-xs font-medium tabular-nums whitespace-nowrap shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          {usedLabel} / {maxLabel} tokens
        </span>
      </div>

      {variant === 'bar' ? (
        <>
          <div
            role="progressbar"
            aria-labelledby={headingId}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={valueText}
            data-testid="context-token-bar"
            className={cx(
              trackClass,
              'prism-well h-3 w-full rounded-full overflow-hidden flex items-stretch'
            )}
          >
            {normalizedSegments
              .filter((segment) => segment.tokens > 0)
              .map((segment) => {
                const widthPercent = (segment.tokens / scaleDenominator) * 100;
                return (
                  <div
                    key={segment.key}
                    data-testid={`token-segment-${segment.kind}`}
                    data-segment-kind={segment.kind}
                    className="h-full transition-[color,background-color,border-color,opacity,transform] duration-200 first:rounded-l-full last:rounded-r-full"
                    style={{
                      width: `${widthPercent}%`,
                      backgroundColor: segment.colorToken,
                    }}
                  />
                );
              })}
          </div>
          {legendContent}
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <div
            role="progressbar"
            aria-labelledby={headingId}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuetext={valueText}
            data-testid="context-token-radial"
            className={cx(
              radialClass,
              'prism-well relative w-20 h-20 rounded-full inline-flex items-center justify-center shrink-0'
            )}
          >
            <svg
              aria-hidden="true"
              data-testid="context-token-radial-svg"
              viewBox="0 0 80 80"
              className="w-20 h-20 -rotate-90 prism-contain-box"
            >
              <circle
                cx={40}
                cy={40}
                r={RADIAL_RADIUS}
                fill="none"
                stroke="var(--prism-well-border)"
                strokeWidth={7}
              />
              {radialArcs.map((arc) => (
                <circle
                  key={arc.key}
                  data-testid={`radial-segment-${arc.kind}`}
                  data-segment-kind={arc.kind}
                  cx={40}
                  cy={40}
                  r={RADIAL_RADIUS}
                  fill="none"
                  stroke={arc.colorToken}
                  strokeWidth={7}
                  strokeDasharray={arc.dashArray}
                  strokeDashoffset={arc.dashOffset}
                />
              ))}
            </svg>
            <span
              data-testid="context-token-radial-percent"
              className="absolute inset-0 inline-flex items-center justify-center font-mono text-sm font-semibold tabular-nums"
              style={{ color: healthAccentToken }}
            >
              {percent}%
            </span>
          </div>

          <div className="flex-1 min-w-[12rem]">{legendContent}</div>
        </div>
      )}
    </div>
  );
}

export const ContextTokenMeter = /*#__PURE__*/ memoWithDisplayName(ContextTokenMeterInner, 'ContextTokenMeter');
