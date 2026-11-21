'use client';

import { useId, useState } from 'react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type OpticalChartMode = 'bar' | 'line' | 'donut';

export interface ChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface OpticalChartsProps extends BaseProps<HTMLDivElement> {
  /** Numeric telemetry points rendered across Bar, Line, and Donut modes. */
  data: ReadonlyArray<ChartPoint>;
  /** Initial visualization mode ('bar' | 'line' | 'donut'). */
  defaultMode?: OpticalChartMode;
  /** Chart card heading (defaults to 'Component Adoption Telemetry'). */
  title?: string;
}

const CHART_MODES: ReadonlyArray<OpticalChartMode> = ['bar', 'line', 'donut'];

const DONUT_TOKEN_COLORS: ReadonlyArray<string> = [
  'var(--prism-primary-main)',
  'var(--prism-success-main)',
  'var(--prism-secondary-main)',
  'var(--prism-warning-main)',
  'var(--prism-info-main)',
  'var(--prism-success-dark)',
];

function safeMetricValue(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function OpticalCharts({
  data,
  defaultMode = 'bar',
  title = 'Component Adoption Telemetry',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: OpticalChartsProps) {
  const override = useComponentOverride('OpticalCharts');
  const gradientId = useId();
  const [chartType, setChartType] = useState<OpticalChartMode>(defaultMode);
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const safeActiveIdx = data.length > 0 ? Math.min(activeIdx, data.length - 1) : 0;
  const activePoint = data[safeActiveIdx];

  const normalizedValues = data.map((d) => safeMetricValue(d.value));
  const maxVal = Math.max(...normalizedValues, 1);
  const total = normalizedValues.reduce((acc, v) => acc + v, 0);

  const merged = mergeProps({
    themeTarget: themeProps('optical-charts', {
      mode: chartType,
      empty: data.length === 0,
    }),
    baseClassName: 'prism-slab p-5 space-y-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {activePoint
              ? `Focused metric: ${activePoint.label} · ${safeMetricValue(activePoint.value).toLocaleString()} imports/wk`
              : 'No telemetry points available'}
          </p>
        </div>
        <div
          role="group"
          aria-label="Chart visualization mode"
          className="prism-crystal p-1 rounded-full inline-flex gap-1"
        >
          {CHART_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={chartType === mode}
              onClick={() => setChartType(mode)}
              className={`prism-focus-ring px-3 py-1 rounded-full text-xs font-medium capitalize cursor-pointer ${
                chartType === mode
                  ? 'prism-well text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-slate-500 dark:text-slate-400">
          No chart data to display.
        </div>
      ) : null}

      {data.length > 0 && chartType === 'bar' ? (
        <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
          {data.map((pt, idx) => {
            const val = safeMetricValue(pt.value);
            const heightPct = Math.max(12, Math.round((val / maxVal) * 100));
            const selected = idx === safeActiveIdx;
            return (
              <button
                key={pt.label}
                type="button"
                aria-pressed={selected}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
                className="prism-focus-ring rounded-xl flex-1 h-full flex flex-col justify-end items-center gap-2 group cursor-pointer focus:outline-none"
              >
                <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {val}
                </span>
                <div className="w-full max-w-[44px] flex-1 flex items-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-2xl rounded-b-lg transition-all duration-200 ${
                      selected
                        ? 'prism-btn-primary'
                        : 'prism-emerald opacity-80 group-hover:opacity-100'
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-full">
                  {pt.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {data.length > 0 && chartType === 'line' ? (
        <div className="h-44 w-full pt-2">
          <svg
            role="img"
            aria-label={`${title} line chart`}
            viewBox="0 0 400 140"
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--prism-success-main)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--prism-success-main)" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {(() => {
              const stepX = data.length > 1 ? 360 / (data.length - 1) : 0;
              const points = data.map((d, i) => ({
                x: data.length > 1 ? 20 + i * stepX : 200,
                y: 115 - (safeMetricValue(d.value) / maxVal) * 90,
                label: d.label,
              }));
              const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
              const startX = data.length > 1 ? 20 : 200;
              const endX = data.length > 1 ? 380 : 200;
              const area = `${startX},120 ${polyline} ${endX},120`;
              return (
                <>
                  <polygon points={area} fill={`url(#${gradientId})`} />
                  <polyline
                    fill="none"
                    stroke="var(--prism-success-dark)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polyline}
                  />
                  {points.map((p, idx) => (
                    <g
                      key={p.label}
                      className="cursor-pointer"
                      onClick={() => setActiveIdx(idx)}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={idx === safeActiveIdx ? 6 : 4.5}
                        fill={
                          idx === safeActiveIdx
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-primary-contrast)'
                        }
                        stroke="var(--prism-success-dark)"
                        strokeWidth="2.5"
                      />
                      <text
                        x={p.x}
                        y={135}
                        textAnchor="middle"
                        className="fill-slate-600 dark:fill-slate-300 text-[10px]"
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      ) : null}

      {data.length > 0 && chartType === 'donut' ? (
        <div className="h-44 flex items-center justify-center gap-8">
          <svg
            role="img"
            aria-label={`${title} donut chart`}
            viewBox="0 0 120 120"
            className="w-36 h-36 -rotate-90"
          >
            {(() => {
              let cumulative = 0;
              const circumference = 2 * Math.PI * 42;
              return data.map((d, idx) => {
                const val = safeMetricValue(d.value);
                const frac = total > 0 ? val / total : 0;
                const dash = frac * circumference;
                const offset = -cumulative * circumference;
                cumulative += frac;
                return (
                  <circle
                    key={d.label}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="transparent"
                    stroke={DONUT_TOKEN_COLORS[idx % DONUT_TOKEN_COLORS.length]}
                    strokeWidth={idx === safeActiveIdx ? '18' : '14'}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                    className="cursor-pointer transition-all"
                    onClick={() => setActiveIdx(idx)}
                  />
                );
              });
            })()}
          </svg>
          <div className="space-y-1.5 text-xs">
            {data.map((d, idx) => {
              const val = safeMetricValue(d.value);
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return (
                <button
                  key={d.label}
                  type="button"
                  aria-pressed={idx === safeActiveIdx}
                  onClick={() => setActiveIdx(idx)}
                  className={`prism-focus-ring flex items-center justify-between gap-4 w-40 px-2.5 py-1 rounded-lg cursor-pointer ${
                    idx === safeActiveIdx ? 'prism-well font-semibold' : 'opacity-80'
                  }`}
                >
                  <span className="text-slate-800 dark:text-slate-100">{d.label}</span>
                  <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {pct}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

OpticalCharts.displayName = 'OpticalCharts';
