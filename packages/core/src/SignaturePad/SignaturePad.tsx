'use client';

import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Check, PenTool, Trash2, Undo2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface SignaturePoint {
  x: number;
  y: number;
}

export type SignatureStroke = ReadonlyArray<SignaturePoint>;

export interface SignatureExportData {
  svgDataUrl: string;
  strokes: ReadonlyArray<SignatureStroke>;
  isEmpty: boolean;
}

type SignaturePadBaseProps = Omit<BaseProps<HTMLDivElement>, 'children' | 'onChange'>;

export interface SignaturePadProps extends SignaturePadBaseProps {
  /** Logical SVG canvas width in pixels (clamped 200..900, default 480). */
  width?: number;
  /** Logical SVG canvas height in pixels (clamped 100..450, default 180). */
  height?: number;
  /** Initial ink stroke color hex value (default '#18202C'). */
  strokeColor?: string;
  /** Ink stroke thickness in pixels (clamped 1..10, default 2.5). */
  strokeWidth?: number;
  /** Visible accessible heading label (default 'Digital Signature'). */
  label?: string;
  /** Placeholder text displayed while the pad is empty (default 'Sign inside the frosted glass pad'). */
  placeholder?: string;
  /** Disables drawing, ink selection, undo, clear, and saving. */
  disabled?: boolean;
  /** Callback fired whenever strokes are added, undone, or cleared. */
  onChange?: (data: SignatureExportData) => void;
  /** Callback fired when the user clicks Save Signature on a non-empty signature. */
  onSave?: (data: SignatureExportData) => void;
}

interface InternalStroke {
  id: number;
  points: SignatureStroke;
  color: string;
  width: number;
}

interface InkPreset {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_INK_COLOR = '#18202C';
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const INK_PRESETS: ReadonlyArray<InkPreset> = [
  { id: 'obsidian', label: 'Obsidian ink', color: '#18202C' },
  { id: 'cobalt', label: 'Cobalt ink', color: '#1D4ED8' },
  { id: 'emerald', label: 'Emerald ink', color: '#159673' },
  { id: 'amber', label: 'Amber ink', color: '#C94114' },
];

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function sanitizeInkColor(raw: string): string {
  const trimmed = raw.trim();
  return HEX_COLOR_RE.test(trimmed) ? trimmed : DEFAULT_INK_COLOR;
}

function formatPolylinePoints(points: SignatureStroke): string {
  return points.map((p) => `${p.x},${p.y}`).join(' ');
}

function buildStrokeSvgMarkup(stroke: InternalStroke): string {
  const color = sanitizeInkColor(stroke.color);
  const width = clampNumber(stroke.width, 1, 10, 2.5);
  const singlePoint = stroke.points.length === 1 ? stroke.points[0] : undefined;
  if (singlePoint) {
    const radius = roundOne(Math.max(0.5, width / 2));
    return `<circle cx="${singlePoint.x}" cy="${singlePoint.y}" r="${radius}" fill="${color}" />`;
  }
  const pointsAttr = formatPolylinePoints(stroke.points);
  return `<polyline points="${pointsAttr}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" />`;
}

function buildSvgDataUrl(
  strokes: ReadonlyArray<InternalStroke>,
  width: number,
  height: number
): string {
  const markup = strokes.map(buildStrokeSvgMarkup).join('');
  const svg = `<svg className="prism-contain-box" xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${markup}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function buildExportData(
  strokes: ReadonlyArray<InternalStroke>,
  width: number,
  height: number
): SignatureExportData {
  return {
    svgDataUrl: buildSvgDataUrl(strokes, width, height),
    strokes: strokes.map((s) => s.points),
    isEmpty: strokes.length === 0,
  };
}

function extractSvgPoint(
  event: ReactPointerEvent<SVGSVGElement>,
  svg: SVGSVGElement,
  width: number,
  height: number
): SignaturePoint {
  const rect = svg.getBoundingClientRect();
  const hasBox =
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0;
  const rawX = hasBox ? ((event.clientX - rect.left) / rect.width) * width : event.clientX;
  const rawY = hasBox ? ((event.clientY - rect.top) / rect.height) * height : event.clientY;
  return {
    x: roundOne(clampNumber(rawX, 0, width, 0)),
    y: roundOne(clampNumber(rawY, 0, height, 0)),
  };
}

function buildKeyboardSignatureStroke(
  width: number,
  height: number,
  strokeIndex: number
): SignatureStroke {
  const baselineY = height * 0.68;
  const offset = (strokeIndex % 3) * 14;
  const startX = clampNumber(width * 0.16 + offset, 12, width - 80, 24);
  const span = Math.min(width * 0.56, width - startX - 16);
  return [
    { x: roundOne(startX), y: roundOne(baselineY) },
    { x: roundOne(startX + span * 0.22), y: roundOne(baselineY - height * 0.2) },
    { x: roundOne(startX + span * 0.48), y: roundOne(baselineY + height * 0.06) },
    { x: roundOne(startX + span * 0.74), y: roundOne(baselineY - height * 0.14) },
    { x: roundOne(startX + span), y: roundOne(baselineY - height * 0.02) },
  ];
}

const surfaceClass = /*#__PURE__*/ stableClassName('signature-pad', 'surface');
const actionsClass = /*#__PURE__*/ stableClassName('signature-pad', 'actions');

function SignaturePadInner({
  width = 480,
  height = 180,
  strokeColor = DEFAULT_INK_COLOR,
  strokeWidth = 2.5,
  label = 'Digital Signature',
  placeholder = 'Sign inside the frosted glass pad',
  disabled = false,
  onChange,
  onSave,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SignaturePadProps) {
  const override = useComponentOverride('SignaturePad');
  const labelId = useId();
  const hintId = useId();

  const safeWidth = Math.round(clampNumber(width, 200, 900, 480));
  const safeHeight = Math.round(clampNumber(height, 100, 450, 180));
  const safeStrokeWidth = roundOne(clampNumber(strokeWidth, 1, 10, 2.5));
  const sanitizedPropColor = useMemo(() => sanitizeInkColor(strokeColor), [strokeColor]);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const activeColor = selectedColor ?? sanitizedPropColor;

  const [committedStrokes, setCommittedStrokes] = useState<ReadonlyArray<InternalStroke>>([]);
  const [activeStroke, setActiveStroke] = useState<InternalStroke | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const nextStrokeIdRef = useRef(1);
  const drawingRef = useRef(false);
  const activeStrokeRef = useRef<InternalStroke | null>(null);
  const strokesRef = useRef<ReadonlyArray<InternalStroke>>([]);
  strokesRef.current = committedStrokes;

  const inkSwatches = useMemo<ReadonlyArray<InkPreset>>(() => {
    const exists = INK_PRESETS.some(
      (preset) => preset.color.toLowerCase() === sanitizedPropColor.toLowerCase()
    );
    if (exists) return INK_PRESETS;
    return [
      { id: 'custom', label: `Custom ink ${sanitizedPropColor}`, color: sanitizedPropColor },
      ...INK_PRESETS,
    ];
  }, [sanitizedPropColor]);

  const commitStrokes = useCallback(
    (next: ReadonlyArray<InternalStroke>) => {
      strokesRef.current = next;
      setCommittedStrokes(next);
      onChange?.(buildExportData(next, safeWidth, safeHeight));
    },
    [onChange, safeHeight, safeWidth]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (disabled || event.button > 0) return;

      event.preventDefault();
      const point = extractSvgPoint(event, event.currentTarget, safeWidth, safeHeight);
      const nextStroke: InternalStroke = {
        id: nextStrokeIdRef.current,
        points: [point],
        color: activeColor,
        width: safeStrokeWidth,
      };
      nextStrokeIdRef.current += 1;

      drawingRef.current = true;
      activeStrokeRef.current = nextStroke;
      setIsDrawing(true);
      setActiveStroke(nextStroke);
    },
    [activeColor, disabled, safeHeight, safeStrokeWidth, safeWidth]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (disabled || !drawingRef.current || !activeStrokeRef.current) return;

      const point = extractSvgPoint(event, event.currentTarget, safeWidth, safeHeight);
      const current = activeStrokeRef.current;
      const last = current.points[current.points.length - 1];
      if (last && last.x === point.x && last.y === point.y) {
        return;
      }

      const updated: InternalStroke = {
        ...current,
        points: [...current.points, point],
      };
      activeStrokeRef.current = updated;
      setActiveStroke(updated);
    },
    [disabled, safeHeight, safeWidth]
  );

  const finalizeStroke = useCallback(() => {
    if (!drawingRef.current || !activeStrokeRef.current) return;
    const finished = activeStrokeRef.current;
    drawingRef.current = false;
    activeStrokeRef.current = null;
    setIsDrawing(false);
    setActiveStroke(null);

    const next = [...strokesRef.current, finished];
    commitStrokes(next);
  }, [commitStrokes]);

  const handleUndo = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    const next = strokesRef.current.slice(0, -1);
    commitStrokes(next);
  }, [commitStrokes]);

  const handleClear = useCallback(() => {
    if (strokesRef.current.length === 0) return;
    commitStrokes([]);
  }, [commitStrokes]);

  const handleSave = useCallback(() => {
    onSave?.(buildExportData(strokesRef.current, safeWidth, safeHeight));
  }, [onSave, safeHeight, safeWidth]);

  const handleKeyboardSign = useCallback(() => {
    const points = buildKeyboardSignatureStroke(safeWidth, safeHeight, strokesRef.current.length);
    const nextStroke: InternalStroke = {
      id: nextStrokeIdRef.current,
      points,
      color: activeColor,
      width: safeStrokeWidth,
    };
    nextStrokeIdRef.current += 1;
    commitStrokes([...strokesRef.current, nextStroke]);
  }, [activeColor, commitStrokes, safeHeight, safeStrokeWidth, safeWidth]);

  const handlePadKeyDown = useCallback(
    (event: KeyboardEvent<SVGSVGElement>) => {
      if (disabled || event.nativeEvent.isComposing) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (event.key === 'Delete' || event.key === 'Escape') {
        event.preventDefault();
        handleClear();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleKeyboardSign();
      }
    },
    [disabled, handleClear, handleKeyboardSign, handleUndo]
  );

  const isEmpty = committedStrokes.length === 0;
  const visibleStrokes = activeStroke ? [...committedStrokes, activeStroke] : committedStrokes;
  const baselineY = roundOne(safeHeight * 0.78);

  const merged = mergeProps({
    themeTarget: themeProps('signature-pad', {
      disabled,
      empty: isEmpty,
      drawing: isDrawing,
    }),
    baseClassName: 'prism-slab p-4 space-y-3 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div ref={ref} {...rest} {...merged}>
      {/* Header row with label, stroke status, and ink color swatches */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="prism-crystal w-7 h-7 rounded-xl inline-flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
            <PenTool className="w-3.5 h-3.5" aria-hidden="true" />
          </span>
          <span
            id={labelId}
            className="text-xs font-semibold tracking-[-0.01em] text-slate-800 dark:text-slate-100 truncate"
          >
            {label}
          </span>
          <span
            data-testid="signature-stroke-count"
            className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400"
          >
            {committedStrokes.length === 1 ? '1 stroke' : `${committedStrokes.length} strokes`}
          </span>
        </div>

        <div role="group" aria-label="Ink color" className="inline-flex items-center gap-1.5">
          {inkSwatches.map((preset) => {
            const selected = activeColor.toLowerCase() === preset.color.toLowerCase();
            return (
              <button
                key={preset.id}
                type="button"
                disabled={disabled}
                aria-label={preset.label}
                aria-pressed={selected}
                onClick={() => setSelectedColor(preset.color)}
                style={{ backgroundColor: preset.color }}
                className={cx(
                  'prism-focus-ring w-5 h-5 rounded-full border-2 transition-transform cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                  selected
                    ? 'border-white ring-2 ring-[var(--prism-secondary-main)] scale-110'
                    : 'border-white/75 enabled:hover:scale-105'
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Optical Frosted Glass Vector Drawing Surface */}
      <div
        className={cx(
          surfaceClass,
          'prism-well relative rounded-[18px] overflow-hidden',
          disabled ? 'opacity-60' : ''
        )}
      >
        <svg
          role="application"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={labelId}
          aria-describedby={hintId}
          aria-disabled={disabled ? 'true' : undefined}
          data-testid="signature-canvas"
          width={safeWidth}
          height={safeHeight}
          viewBox={`0 0 ${safeWidth} ${safeHeight}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finalizeStroke}
          onPointerCancel={finalizeStroke}
          onKeyDown={handlePadKeyDown}
          style={{ touchAction: 'none' }}
          className={cx(
            'prism-focus-ring block w-full h-auto touch-none rounded-[18px]',
            disabled ? 'cursor-not-allowed' : 'cursor-crosshair'
          , 'prism-contain-box')}
        >
          {/* Crisp signing baseline rule */}
          <g aria-hidden="true" opacity="0.45">
            <line
              x1={24}
              y1={baselineY}
              x2={safeWidth - 24}
              y2={baselineY}
              stroke="#64748B"
              strokeWidth={1}
              strokeDasharray="4 4"
            />
            <text
              x={14}
              y={baselineY + 3}
              fontSize={12}
              fontFamily="var(--prism-font-mono)"
              fill="#64748B"
            >
              ×
            </text>
          </g>

          {/* Vector signature strokes */}
          {visibleStrokes.map((stroke) =>
            stroke.points.length === 1 && stroke.points[0] ? (
              <circle
                key={stroke.id}
                cx={stroke.points[0].x}
                cy={stroke.points[0].y}
                r={roundOne(Math.max(0.5, stroke.width / 2))}
                fill={stroke.color}
              />
            ) : (
              <polyline
                key={stroke.id}
                points={formatPolylinePoints(stroke.points)}
                fill="none"
                stroke={stroke.color}
                strokeWidth={stroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )
          )}
        </svg>

        {isEmpty && !isDrawing ? (
          <div
            data-testid="signature-placeholder"
            className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center"
          >
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {placeholder}
            </span>
          </div>
        ) : null}
      </div>

      {/* Action & Keyboard Accessibility Bar */}
      <div className={cx(actionsClass, 'flex flex-wrap items-center justify-between gap-2 pt-0.5')}>
        <p id={hintId} className="text-[11px] text-slate-500 dark:text-slate-400">
          Keyboard: Space or Enter to sign, Backspace or Ctrl+Z to undo, Delete to clear.
        </p>

        <div className="inline-flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled || isEmpty}
            onClick={handleUndo}
            className="prism-crystal prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Undo</span>
          </button>

          <button
            type="button"
            disabled={disabled || isEmpty}
            onClick={handleClear}
            className="prism-crystal prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Clear</span>
          </button>

          <button
            type="button"
            disabled={disabled || isEmpty}
            onClick={handleSave}
            className="prism-btn-primary prism-focus-ring h-9 px-5 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-70 disabled:saturate-50 disabled:cursor-not-allowed"
          >
            <Check className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Save Signature</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const SignaturePad = /*#__PURE__*/ memoWithDisplayName(SignaturePadInner, 'SignaturePad');
