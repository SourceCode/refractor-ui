'use client';

import { useCallback, useId, useMemo, type KeyboardEvent } from 'react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type LedDisplayStyle = '7-segment' | 'nixie';
export type LedPhosphorTone = 'primary' | 'emerald' | 'amber' | 'info' | 'rose';
export type LedReadoutSize = 'sm' | 'md' | 'lg';

type DigitalLedReadoutBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface DigitalLedReadoutProps extends DigitalLedReadoutBaseProps {
  /** Numeric or string value rendered across the optical readout cells (defaults to '128.4'). */
  value?: string | number;
  /** Optional visible hardware nameplate label combined into the screen-reader status announcement. */
  label?: string;
  /** Optional engineering unit suffix displayed beside the readout and announced to assistive technology. */
  unit?: string;
  /** Controlled hardware display style ('7-segment' | 'nixie'). */
  displayStyle?: LedDisplayStyle;
  /** Initial display style in uncontrolled mode (defaults to '7-segment'). */
  defaultDisplayStyle?: LedDisplayStyle;
  /** Callback invoked when the user switches display styles via the optional toggle control. */
  onDisplayStyleChange?: (style: LedDisplayStyle) => void;
  /** When true, exposes interactive 7-Segment and Nixie mode toggle buttons (defaults to false). */
  showStyleToggle?: boolean;
  /** Semantic phosphor emission tone mapped to --prism-* palette tokens (defaults to 'primary'). */
  tone?: LedPhosphorTone;
  /** Hardware housing and readout scale ('sm' | 'md' | 'lg'; defaults to 'md'). */
  size?: LedReadoutSize;
  /** Optional minimum number of digit cells to display, clamped to [1..12] with leading blank cells. */
  minDigits?: number;
}

type SegmentId = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g';

interface SegmentGeometry {
  readonly id: SegmentId;
  readonly points: string;
}

interface ParsedToken {
  kind: 'digit' | 'colon';
  char: string;
  hasDecimal: boolean;
}

interface ReadoutCell {
  readonly id: string;
  readonly kind: 'digit' | 'colon';
  readonly char: string;
  readonly litSegments: ReadonlySet<SegmentId>;
  readonly nixieGlyph: string;
  readonly hasDecimal: boolean;
  readonly x: number;
  readonly width: number;
}

interface SizeMetrics {
  readonly rootPadding: string;
  readonly windowPadding: string;
  readonly sevenSegHeight: string;
  readonly nixieHeight: string;
  readonly labelText: string;
  readonly unitText: string;
  readonly toggleText: string;
}

const DEFAULT_VALUE = '128.4';
const NON_FINITE_FALLBACK = '----';
const MIN_DIGITS_FLOOR = 1;
const MIN_DIGITS_CEIL = 12;
const MAX_INPUT_CHARS = 48;

const SVG_PAD_X = 10;
const SVG_PAD_Y = 8;

const SEVEN_SEG_CELL_W = 54;
const SEVEN_SEG_CELL_H = 88;
const SEVEN_SEG_COLON_W = 20;
const SEVEN_SEG_GAP = 6;

const NIXIE_TUBE_W = 56;
const NIXIE_TUBE_H = 104;
const NIXIE_COLON_W = 22;
const NIXIE_GAP = 8;

const EMPTY_SEGMENTS: ReadonlySet<SegmentId> = new Set<SegmentId>();

const SEVEN_SEGMENT_GEOMETRY: ReadonlyArray<SegmentGeometry> = [
  { id: 'a', points: '10,6 36,6 38.5,8.5 35,12 11,12 7.5,8.5' },
  { id: 'b', points: '39.5,9.5 42,12 42,39.5 39.5,42 36,39 36,13' },
  { id: 'c', points: '39.5,46 42,48.5 42,76 39.5,78.5 36,75 36,49' },
  { id: 'd', points: '11,76 35,76 38.5,79.5 36,82 10,82 7.5,79.5' },
  { id: 'e', points: '6.5,46 10,49 10,75 6.5,78.5 4,76 4,48.5' },
  { id: 'f', points: '6.5,9.5 10,13 10,39 6.5,42 4,39.5 4,12' },
  { id: 'g', points: '8,44 11,41 35,41 38,44 35,47 11,47' },
];

const SEGMENT_PATTERNS: ReadonlyMap<string, ReadonlySet<SegmentId>> = new Map<
  string,
  ReadonlySet<SegmentId>
>([
  ['0', new Set<SegmentId>(['a', 'b', 'c', 'd', 'e', 'f'])],
  ['1', new Set<SegmentId>(['b', 'c'])],
  ['2', new Set<SegmentId>(['a', 'b', 'd', 'e', 'g'])],
  ['3', new Set<SegmentId>(['a', 'b', 'c', 'd', 'g'])],
  ['4', new Set<SegmentId>(['b', 'c', 'f', 'g'])],
  ['5', new Set<SegmentId>(['a', 'c', 'd', 'f', 'g'])],
  ['6', new Set<SegmentId>(['a', 'c', 'd', 'e', 'f', 'g'])],
  ['7', new Set<SegmentId>(['a', 'b', 'c'])],
  ['8', new Set<SegmentId>(['a', 'b', 'c', 'd', 'e', 'f', 'g'])],
  ['9', new Set<SegmentId>(['a', 'b', 'c', 'd', 'f', 'g'])],
  ['-', new Set<SegmentId>(['g'])],
  [' ', EMPTY_SEGMENTS],
  ['A', new Set<SegmentId>(['a', 'b', 'c', 'e', 'f', 'g'])],
  ['C', new Set<SegmentId>(['a', 'd', 'e', 'f'])],
  ['E', new Set<SegmentId>(['a', 'd', 'e', 'f', 'g'])],
  ['F', new Set<SegmentId>(['a', 'e', 'f', 'g'])],
  ['H', new Set<SegmentId>(['b', 'c', 'e', 'f', 'g'])],
  ['L', new Set<SegmentId>(['d', 'e', 'f'])],
  ['P', new Set<SegmentId>(['a', 'b', 'e', 'f', 'g'])],
  ['R', new Set<SegmentId>(['e', 'g'])],
  ['U', new Set<SegmentId>(['b', 'c', 'd', 'e', 'f'])],
]);

const NIXIE_HEX_MESH_PATH = [22, 32, 42, 52, 62, 72]
  .map(
    (y) =>
      `M 10 ${y} L 16 ${y + 5} L 22 ${y} L 28 ${y + 5} L 34 ${y} L 40 ${y + 5} L 46 ${y} M 9 ${y + 2.5} L 47 ${y + 2.5}`
  )
  .join(' ');

const NIXIE_COLON_GRID_PATH = [30, 40, 50, 60, 70]
  .map((y) => `M 5 ${y} L 17 ${y}`)
  .join(' ');

function getPhosphorToken(tone: LedPhosphorTone): string {
  switch (tone) {
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'info':
      return 'var(--prism-info-main)';
    case 'rose':
      return 'var(--prism-error-main)';
    case 'primary':
      return 'var(--prism-primary-main)';
  }
}

function getSizeMetrics(size: LedReadoutSize): SizeMetrics {
  switch (size) {
    case 'sm':
      return {
        rootPadding: 'p-2.5 gap-2',
        windowPadding: 'px-3 py-2',
        sevenSegHeight: 'h-10',
        nixieHeight: 'h-12',
        labelText: 'text-[10px]',
        unitText: 'text-[10px]',
        toggleText: 'text-[10px] px-2 h-6',
      };
    case 'lg':
      return {
        rootPadding: 'p-4 sm:p-5 gap-3',
        windowPadding: 'px-4 py-3.5',
        sevenSegHeight: 'h-20',
        nixieHeight: 'h-24',
        labelText: 'text-sm',
        unitText: 'text-sm',
        toggleText: 'text-xs px-3 h-7',
      };
    case 'md':
      return {
        rootPadding: 'p-3.5 gap-2.5',
        windowPadding: 'px-3.5 py-2.5',
        sevenSegHeight: 'h-14',
        nixieHeight: 'h-16',
        labelText: 'text-xs',
        unitText: 'text-xs',
        toggleText: 'text-[11px] px-2.5 h-6',
      };
  }
}

function normalizeReadoutValue(value: string | number | undefined): string {
  if (value === undefined) {
    return DEFAULT_VALUE;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return NON_FINITE_FALLBACK;
    }
    return value === 0 ? '0' : String(value);
  }
  const codePoints = Array.from(value);
  if (codePoints.length > MAX_INPUT_CHARS) {
    return codePoints.slice(0, MAX_INPUT_CHARS).join('');
  }
  return value;
}

function parseReadoutTokens(
  raw: string,
  minDigits: number | undefined
): ReadonlyArray<ParsedToken> {
  const tokens: ParsedToken[] = [];
  const chars = Array.from(raw);

  for (const ch of chars) {
    if (ch === '.') {
      const prev = tokens[tokens.length - 1];
      if (prev && prev.kind === 'digit' && !prev.hasDecimal) {
        prev.hasDecimal = true;
      } else {
        tokens.push({ kind: 'digit', char: ' ', hasDecimal: true });
      }
    } else if (ch === ':') {
      tokens.push({ kind: 'colon', char: ':', hasDecimal: false });
    } else {
      tokens.push({ kind: 'digit', char: ch.toUpperCase(), hasDecimal: false });
    }
  }

  const targetMinDigits =
    minDigits !== undefined
      ? Math.round(clampNumber(minDigits, MIN_DIGITS_FLOOR, MIN_DIGITS_CEIL, MIN_DIGITS_FLOOR))
      : 0;

  let digitCount = 0;
  for (const token of tokens) {
    if (token.kind === 'digit') {
      digitCount += 1;
    }
  }

  if (tokens.length === 0) {
    const blankCount = Math.max(1, targetMinDigits);
    for (let i = 0; i < blankCount; i += 1) {
      tokens.push({ kind: 'digit', char: ' ', hasDecimal: false });
    }
    return tokens;
  }

  if (targetMinDigits > digitCount) {
    const padCount = targetMinDigits - digitCount;
    const padding: ParsedToken[] = [];
    for (let i = 0; i < padCount; i += 1) {
      padding.push({ kind: 'digit', char: ' ', hasDecimal: false });
    }
    return [...padding, ...tokens];
  }

  return tokens;
}

function buildReadoutLayout(
  tokens: ReadonlyArray<ParsedToken>,
  style: LedDisplayStyle
): {
  cells: ReadonlyArray<ReadoutCell>;
  viewBoxWidth: number;
  viewBoxHeight: number;
} {
  const digitW = style === 'nixie' ? NIXIE_TUBE_W : SEVEN_SEG_CELL_W;
  const colonW = style === 'nixie' ? NIXIE_COLON_W : SEVEN_SEG_COLON_W;
  const gap = style === 'nixie' ? NIXIE_GAP : SEVEN_SEG_GAP;
  const cellH = style === 'nixie' ? NIXIE_TUBE_H : SEVEN_SEG_CELL_H;

  let cursorX = SVG_PAD_X;
  let cellIndex = 0;
  const cells: ReadoutCell[] = [];

  for (const token of tokens) {
    const width = token.kind === 'colon' ? colonW : digitW;
    const pattern = token.kind === 'digit' ? SEGMENT_PATTERNS.get(token.char) : undefined;
    const litSegments = pattern ?? EMPTY_SEGMENTS;
    const nixieGlyph =
      token.kind === 'digit' && pattern !== undefined && token.char !== ' ' ? token.char : '';

    cells.push({
      id: `${style}-${token.kind}-${cellIndex}`,
      kind: token.kind,
      char: token.char,
      litSegments,
      nixieGlyph,
      hasDecimal: token.hasDecimal,
      x: cursorX,
      width,
    });

    cursorX += width + (cellIndex < tokens.length - 1 ? gap : 0);
    cellIndex += 1;
  }

  return {
    cells,
    viewBoxWidth: cursorX + SVG_PAD_X,
    viewBoxHeight: cellH + SVG_PAD_Y * 2,
  };
}

export function DigitalLedReadout({
  value,
  label,
  unit,
  displayStyle,
  defaultDisplayStyle = '7-segment',
  onDisplayStyleChange,
  showStyleToggle = false,
  tone = 'primary',
  size = 'md',
  minDigits,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DigitalLedReadoutProps) {
  const override = useComponentOverride('DigitalLedReadout');
  const rawUid = useId();
  const safeUid = rawUid.replace(/[^a-zA-Z0-9_-]/g, '');
  const glowFilterId = `led-glow-${safeUid}`;
  const tubeGlassGradId = `led-nixie-glass-${safeUid}`;

  const [activeStyle, setActiveStyle] = useControllableState<LedDisplayStyle>({
    value: displayStyle,
    defaultValue: defaultDisplayStyle,
    onChange: onDisplayStyleChange,
  });

  const formattedValue = useMemo(() => normalizeReadoutValue(value), [value]);
  const tokens = useMemo(
    () => parseReadoutTokens(formattedValue, minDigits),
    [formattedValue, minDigits]
  );
  const layout = useMemo(
    () => buildReadoutLayout(tokens, activeStyle),
    [tokens, activeStyle]
  );

  const phosphorColor = getPhosphorToken(tone);
  const ghostColor = `color-mix(in srgb, ${phosphorColor} 12%, transparent)`;
  const filamentCoreColor = `color-mix(in srgb, ${phosphorColor} 72%, var(--prism-primary-contrast))`;
  const borderToken = 'var(--prism-border, var(--prism-well-border))';
  const sizeMetrics = getSizeMetrics(size);

  const trimmedLabel = label ? label.trim() : '';
  const trimmedUnit = unit ? unit.trim() : '';
  const valueForAria = formattedValue.trim().length > 0 ? formattedValue.trim() : 'blank';
  const valueWithUnit =
    trimmedUnit.length > 0 ? `${valueForAria} ${trimmedUnit}` : valueForAria;
  const statusAriaLabel =
    trimmedLabel.length > 0 ? `${trimmedLabel}: ${valueWithUnit}` : valueWithUnit;

  const selectDisplayStyle = useCallback(
    (next: LedDisplayStyle) => {
      if (next !== activeStyle) {
        setActiveStyle(next);
      }
    },
    [activeStyle, setActiveStyle]
  );

  const handleToggleKeyDown = useCallback(
    (targetStyle: LedDisplayStyle) => (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'End') {
        event.preventDefault();
        selectDisplayStyle('nixie');
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'Home') {
        event.preventDefault();
        selectDisplayStyle('7-segment');
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectDisplayStyle(targetStyle);
      }
    },
    [selectDisplayStyle]
  );

  const merged = mergeProps({
    themeTarget: themeProps('digital-led-readout', {
      displayStyle: activeStyle,
      tone,
      size,
    }),
    baseClassName: cx(
      'prism-slab relative w-full max-w-full min-w-0 flex flex-col transition-all',
      sizeMetrics.rootPadding
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('digital-led-readout', 'header');
  const windowClass = stableClassName('digital-led-readout', 'window');
  const unitClass = stableClassName('digital-led-readout', 'unit');
  const toggleGroupClass = stableClassName('digital-led-readout', 'toggle');

  const showHeader = trimmedLabel.length > 0 || showStyleToggle;

  return (
    <div ref={ref} {...rest} {...merged}>
      {showHeader ? (
        <div
          className={cx(
            headerClass,
            'flex flex-wrap items-center justify-between gap-2 min-w-0'
          )}
        >
          {trimmedLabel.length > 0 ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: phosphorColor,
                  boxShadow: `0 0 8px color-mix(in srgb, ${phosphorColor} 65%, transparent)`,
                }}
              />
              <span
                data-testid="led-readout-label"
                className={cx(
                  'font-mono font-semibold uppercase tracking-wider truncate min-w-0',
                  sizeMetrics.labelText
                )}
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {label}
              </span>
            </div>
          ) : (
            <span className="sr-only">Display mode controls</span>
          )}

          {showStyleToggle ? (
            <div
              role="group"
              aria-label="Display style"
              data-testid="led-style-toggle"
              className={cx(
                toggleGroupClass,
                'prism-well inline-flex flex-wrap items-center gap-1 p-0.5 rounded-full shrink-0 min-w-0'
              )}
            >
              <button
                type="button"
                aria-pressed={activeStyle === '7-segment'}
                data-testid="led-style-7-segment"
                onClick={() => selectDisplayStyle('7-segment')}
                onKeyDown={handleToggleKeyDown('7-segment')}
                className={cx(
                  'prism-focus-ring inline-flex items-center justify-center rounded-full font-mono font-semibold tracking-wide whitespace-nowrap shrink-0 cursor-pointer transition-all',
                  sizeMetrics.toggleText,
                  activeStyle === '7-segment' ? 'prism-crystal' : ''
                )}
                style={
                  activeStyle === '7-segment'
                    ? {
                        color: phosphorColor,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${phosphorColor} 45%, transparent)`,
                      }
                    : {
                        color: 'var(--prism-text-secondary)',
                      }
                }
              >
                7-Segment
              </button>
              <button
                type="button"
                aria-pressed={activeStyle === 'nixie'}
                data-testid="led-style-nixie"
                onClick={() => selectDisplayStyle('nixie')}
                onKeyDown={handleToggleKeyDown('nixie')}
                className={cx(
                  'prism-focus-ring inline-flex items-center justify-center rounded-full font-mono font-semibold tracking-wide whitespace-nowrap shrink-0 cursor-pointer transition-all',
                  sizeMetrics.toggleText,
                  activeStyle === 'nixie' ? 'prism-crystal' : ''
                )}
                style={
                  activeStyle === 'nixie'
                    ? {
                        color: phosphorColor,
                        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${phosphorColor} 45%, transparent)`,
                      }
                    : {
                        color: 'var(--prism-text-secondary)',
                      }
                }
              >
                Nixie
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={statusAriaLabel}
        data-testid="led-readout-status"
        className={cx(
          windowClass,
          'prism-well relative rounded-2xl flex flex-wrap items-end justify-between gap-2.5 min-w-0 w-full overflow-hidden',
          sizeMetrics.windowPadding
        )}
      >
        <div className="min-w-0 flex-1 flex items-center justify-center overflow-x-auto">
          <svg
            viewBox={`0 0 ${layout.viewBoxWidth} ${layout.viewBoxHeight}`}
            preserveAspectRatio="xMidYMid meet"
            aria-hidden="true"
            focusable="false"
            data-testid="led-readout-svg"
            data-display-style={activeStyle}
            data-tone={tone}
            className={cx(
              'block max-w-full w-auto shrink-0 select-none',
              activeStyle === 'nixie' ? sizeMetrics.nixieHeight : sizeMetrics.sevenSegHeight
            )}
          >
            <defs>
              <filter id={glowFilterId} x="-35%" y="-35%" width="170%" height="170%">
                <feGaussianBlur stdDeviation="2.2" result="phosphorBlur" />
                <feMerge>
                  <feMergeNode in="phosphorBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {activeStyle === 'nixie' ? (
                <linearGradient id={tubeGlassGradId} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--prism-crystal-top)" stopOpacity={0.32} />
                  <stop offset="48%" stopColor="var(--prism-well-start)" stopOpacity={0.62} />
                  <stop offset="100%" stopColor="var(--prism-well-end)" stopOpacity={0.86} />
                </linearGradient>
              ) : null}
            </defs>

            {activeStyle === '7-segment'
              ? layout.cells.map((cell) => (
                  <g
                    key={cell.id}
                    transform={`translate(${cell.x}, ${SVG_PAD_Y})`}
                    data-cell-kind={cell.kind}
                    data-cell-char={cell.char}
                    data-has-decimal={cell.hasDecimal ? 'true' : undefined}
                  >
                    {cell.kind === 'colon' ? (
                      <>
                        <circle
                          cx={10}
                          cy={30}
                          r={3.8}
                          fill={phosphorColor}
                          filter={`url(#${glowFilterId})`}
                          data-segment="colon-top"
                          data-lit="true"
                        />
                        <circle
                          cx={10}
                          cy={58}
                          r={3.8}
                          fill={phosphorColor}
                          filter={`url(#${glowFilterId})`}
                          data-segment="colon-bottom"
                          data-lit="true"
                        />
                      </>
                    ) : (
                      <>
                        {SEVEN_SEGMENT_GEOMETRY.map((seg) => {
                          const isLit = cell.litSegments.has(seg.id);
                          return (
                            <polygon
                              key={`${cell.id}-${seg.id}`}
                              points={seg.points}
                              fill={isLit ? phosphorColor : ghostColor}
                              filter={isLit ? `url(#${glowFilterId})` : undefined}
                              data-segment={seg.id}
                              data-lit={isLit ? 'true' : 'false'}
                            />
                          );
                        })}
                        <circle
                          cx={48.5}
                          cy={78.5}
                          r={3.6}
                          fill={cell.hasDecimal ? phosphorColor : ghostColor}
                          filter={cell.hasDecimal ? `url(#${glowFilterId})` : undefined}
                          data-segment="dp"
                          data-lit={cell.hasDecimal ? 'true' : 'false'}
                        />
                      </>
                    )}
                  </g>
                ))
              : layout.cells.map((cell) => (
                  <g
                    key={cell.id}
                    transform={`translate(${cell.x}, ${SVG_PAD_Y})`}
                    data-cell-kind={cell.kind}
                    data-cell-char={cell.char}
                    data-has-decimal={cell.hasDecimal ? 'true' : undefined}
                    data-tube="nixie"
                  >
                    {cell.kind === 'colon' ? (
                      <>
                        <rect
                          x={2}
                          y={18}
                          width={18}
                          height={66}
                          rx={9}
                          ry={9}
                          fill={`url(#${tubeGlassGradId})`}
                          stroke={borderToken}
                          strokeWidth={1.2}
                          data-part="tube-envelope"
                        />
                        <path
                          d={NIXIE_COLON_GRID_PATH}
                          fill="none"
                          stroke={borderToken}
                          strokeWidth={0.6}
                          strokeOpacity={0.5}
                          data-part="cathode-grid"
                        />
                        <rect
                          x={5}
                          y={84}
                          width={12}
                          height={8}
                          rx={2}
                          fill="var(--prism-divider)"
                          stroke={borderToken}
                          strokeWidth={0.8}
                        />
                        <circle
                          cx={11}
                          cy={41}
                          r={3.2}
                          fill={phosphorColor}
                          filter={`url(#${glowFilterId})`}
                          data-segment="colon-top"
                          data-lit="true"
                        />
                        <circle
                          cx={11}
                          cy={61}
                          r={3.2}
                          fill={phosphorColor}
                          filter={`url(#${glowFilterId})`}
                          data-segment="colon-bottom"
                          data-lit="true"
                        />
                      </>
                    ) : (
                      <>
                        <path
                          d="M 24 6 Q 28 1 32 6"
                          fill="none"
                          stroke={borderToken}
                          strokeWidth={1.1}
                        />
                        <rect
                          x={2}
                          y={6}
                          width={52}
                          height={82}
                          rx={22}
                          ry={22}
                          fill={`url(#${tubeGlassGradId})`}
                          stroke={borderToken}
                          strokeWidth={1.25}
                          data-part="tube-envelope"
                        />
                        <path
                          d={NIXIE_HEX_MESH_PATH}
                          fill="none"
                          stroke={borderToken}
                          strokeWidth={0.65}
                          strokeOpacity={0.5}
                          data-part="cathode-grid"
                        />
                        <text
                          x={28}
                          y={64}
                          textAnchor="middle"
                          fontSize={44}
                          fontWeight={300}
                          fontFamily="var(--prism-font-mono)"
                          fill={ghostColor}
                          data-part="nixie-ghost"
                        >
                          8
                        </text>
                        {cell.nixieGlyph.length > 0 ? (
                          <>
                            <text
                              x={28}
                              y={64}
                              textAnchor="middle"
                              fontSize={44}
                              fontWeight={500}
                              fontFamily="var(--prism-font-mono)"
                              fill="none"
                              stroke={phosphorColor}
                              strokeWidth={4}
                              strokeOpacity={0.32}
                              filter={`url(#${glowFilterId})`}
                              data-part="nixie-halo"
                            >
                              {cell.nixieGlyph}
                            </text>
                            <text
                              x={28}
                              y={64}
                              textAnchor="middle"
                              fontSize={44}
                              fontWeight={500}
                              fontFamily="var(--prism-font-mono)"
                              fill={phosphorColor}
                              filter={`url(#${glowFilterId})`}
                              data-part="nixie-filament"
                              data-lit="true"
                            >
                              {cell.nixieGlyph}
                            </text>
                            <text
                              x={28}
                              y={64}
                              textAnchor="middle"
                              fontSize={44}
                              fontWeight={400}
                              fontFamily="var(--prism-font-mono)"
                              fill={filamentCoreColor}
                              fillOpacity={0.42}
                              data-part="nixie-core"
                            >
                              {cell.nixieGlyph}
                            </text>
                          </>
                        ) : null}
                        <circle
                          cx={43.5}
                          cy={76}
                          r={2.8}
                          fill={cell.hasDecimal ? phosphorColor : ghostColor}
                          filter={cell.hasDecimal ? `url(#${glowFilterId})` : undefined}
                          data-segment="dp"
                          data-lit={cell.hasDecimal ? 'true' : 'false'}
                        />
                        <path
                          d="M 10 24 C 9 39 9 57 10 70"
                          fill="none"
                          stroke="var(--prism-crystal-top)"
                          strokeOpacity={0.55}
                          strokeWidth={1.6}
                          strokeLinecap="round"
                        />
                        <rect
                          x={9}
                          y={88}
                          width={38}
                          height={10}
                          rx={3}
                          fill="var(--prism-divider)"
                          stroke={borderToken}
                          strokeWidth={0.9}
                        />
                        <path
                          d="M 18 98 L 18 103 M 28 98 L 28 103 M 38 98 L 38 103"
                          fill="none"
                          stroke={borderToken}
                          strokeWidth={1.2}
                          strokeLinecap="round"
                        />
                      </>
                    )}
                  </g>
                ))}
          </svg>
        </div>

        {trimmedUnit.length > 0 ? (
          <span
            aria-hidden="true"
            data-testid="led-readout-unit"
            className={cx(
              unitClass,
              'font-mono font-semibold uppercase tracking-wider whitespace-nowrap shrink-0 select-none pb-0.5',
              sizeMetrics.unitText
            )}
            style={{ color: phosphorColor }}
          >
            {trimmedUnit}
          </span>
        ) : null}
      </div>
    </div>
  );
}

DigitalLedReadout.displayName = 'DigitalLedReadout';
