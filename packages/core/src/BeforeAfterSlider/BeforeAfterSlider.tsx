'use client';

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { ChevronsLeftRight, Layers, ShieldAlert } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export interface BeforeAfterSliderProps extends BaseProps<HTMLDivElement> {
  /** Label shown in the top-left optical crystal badge and used as default before image alt text (defaults to 'Before'). */
  beforeLabel?: string;
  /** Label shown in the top-right optical crystal badge and used as default after image alt text (defaults to 'After'). */
  afterLabel?: string;
  /** Image source URL for the before layer (strictly validated with sanitizeUrl). */
  beforeSrc?: string;
  /** Image source URL for the after layer (strictly validated with sanitizeUrl). */
  afterSrc?: string;
  /** Custom React content rendered inside the before comparison layer. */
  beforeContent?: ReactNode;
  /** Custom React content rendered inside the after comparison layer. */
  afterContent?: ReactNode;
  /** Controlled split position percentage in [0..100]. */
  position?: number;
  /** Initial split position percentage in [0..100] for uncontrolled usage (defaults to 50). */
  defaultPosition?: number;
  /** Callback fired whenever the split percentage changes via pointer drag or keyboard. */
  onPositionChange?: (pct: number) => void;
  /** Viewport height in pixels, clamped to [160..700] (defaults to 280). */
  heightPx?: number;
}

const MIN_POSITION = 0;
const MAX_POSITION = 100;
const DEFAULT_POSITION = 50;
const MIN_HEIGHT_PX = 160;
const MAX_HEIGHT_PX = 700;
const DEFAULT_HEIGHT_PX = 280;
const KEYBOARD_STEP = 5;
const KEYBOARD_FINE_STEP = 1;

function roundPercent(value: number): number {
  return Math.round(clampNumber(value, MIN_POSITION, MAX_POSITION, DEFAULT_POSITION) * 100) / 100;
}

interface ComparisonLayerProps {
  slot: 'before' | 'after';
  label: string;
  content?: ReactNode;
  safeSrc: string;
  isBlocked: boolean;
}

function ComparisonLayer({ slot, label, content, safeSrc, isBlocked }: ComparisonLayerProps) {
  if (content !== undefined && content !== null) {
    return <div className="w-full h-full">{content}</div>;
  }

  if (safeSrc.length > 0) {
    return (
      <img
        src={safeSrc}
        alt={label}
        draggable={false}
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover pointer-events-none select-none"
      />
    );
  }

  if (isBlocked) {
    return (
      <div
        role="status"
        data-testid={`before-after-${slot}-blocked`}
        className="w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center bg-slate-950/85 text-slate-100"
      >
        <span
          className="w-10 h-10 rounded-2xl bg-white/10 border border-white/15 inline-flex items-center justify-center"
          style={STYLE_ERROR_MAIN}
        >
          <ShieldAlert className="w-5 h-5" aria-hidden="true" />
        </span>
        <p className="text-xs font-semibold">Media URL blocked</p>
      </div>
    );
  }

  return (
    <div
      data-testid={`before-after-${slot}-fallback`}
      className={cx(
        'w-full h-full flex flex-col items-center justify-center gap-2 p-6 text-center',
        slot === 'before' ? 'prism-studio-surface' : 'prism-studio-grid'
      )}
    >
      <span
        className="prism-crystal w-10 h-10 rounded-2xl inline-flex items-center justify-center"
        style={{
          color:
            slot === 'before' ? 'var(--prism-primary-main)' : 'var(--prism-secondary-main)',
        }}
      >
        <Layers className="w-5 h-5" aria-hidden="true" />
      </span>
      <span
        className="text-xs font-semibold tracking-tight"
        style={STYLE_TEXT_PRIMARY}
      >
        {label}
      </span>
    </div>
  );
}

function BeforeAfterSliderInner({
  beforeLabel = 'Before',
  afterLabel = 'After',
  beforeSrc,
  afterSrc,
  beforeContent,
  afterContent,
  position,
  defaultPosition = DEFAULT_POSITION,
  onPositionChange,
  heightPx = DEFAULT_HEIGHT_PX,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: BeforeAfterSliderProps) {
  const override = useComponentOverride('BeforeAfterSlider');
  const stageRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const initialPosition = roundPercent(defaultPosition);
  const [rawPos, setRawPos] = useControllableState<number>({
    value: position,
    defaultValue: initialPosition,
    onChange: onPositionChange,
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);

  const safePos = roundPercent(rawPos);
  const roundedPos = Math.round(safePos);
  const safeHeightPx = Math.round(
    clampNumber(heightPx, MIN_HEIGHT_PX, MAX_HEIGHT_PX, DEFAULT_HEIGHT_PX)
  );

  const safeBeforeSrc = useMemo(
    () => (beforeSrc ? sanitizeUrl(beforeSrc, true) : ''),
    [beforeSrc]
  );
  const safeAfterSrc = useMemo(
    () => (afterSrc ? sanitizeUrl(afterSrc, true) : ''),
    [afterSrc]
  );

  const beforeBlocked = Boolean(beforeSrc && beforeSrc.trim().length > 0 && safeBeforeSrc.length === 0);
  const afterBlocked = Boolean(afterSrc && afterSrc.trim().length > 0 && safeAfterSrc.length === 0);

  const updatePosition = useCallback(
    (next: number) => {
      setRawPos(roundPercent(next));
    },
    [setRawPos]
  );

  const latestUpdateRef = useRef(updatePosition);
  latestUpdateRef.current = updatePosition;

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const updateFromClientX = useCallback((clientX: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    if (!Number.isFinite(rect.width) || rect.width <= 0) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    latestUpdateRef.current(pct);
  }, []);

  const handleStagePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button > 0) return;
      event.preventDefault();
      cleanupDragRef.current?.();

      setIsDragging(true);
      updateFromClientX(event.clientX);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        updateFromClientX(moveEvent.clientX);
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerEnd);
        window.removeEventListener('pointercancel', handlePointerEnd);
        cleanupDragRef.current = null;
      };

      const handlePointerEnd = () => {
        cleanup();
        setIsDragging(false);
      };

      cleanupDragRef.current = cleanup;
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [updateFromClientX]
  );

  const handleSliderKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;
      const step = event.shiftKey ? KEYBOARD_FINE_STEP : KEYBOARD_STEP;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        updatePosition(safePos - step);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        updatePosition(safePos + step);
      } else if (event.key === 'Home') {
        event.preventDefault();
        updatePosition(MIN_POSITION);
      } else if (event.key === 'End') {
        event.preventDefault();
        updatePosition(MAX_POSITION);
      }
    },
    [safePos, updatePosition]
  );

  const merged = mergeProps({
    themeTarget: themeProps('before-after-slider', {
      dragging: isDragging,
    }),
    baseClassName: 'prism-slab p-2 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const stageClass = stableClassName('before-after-slider', 'stage');
  const dividerClass = stableClassName('before-after-slider', 'divider');
  const handleClass = stableClassName('before-after-slider', 'handle');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={`${beforeLabel} and ${afterLabel} comparison`}
      {...rest}
      {...merged}
    >
      <div
        ref={stageRef}
        data-testid="before-after-stage"
        data-dragging={isDragging ? 'true' : undefined}
        onPointerDown={handleStagePointerDown}
        style={{ height: `${safeHeightPx}px`, touchAction: 'none' }}
        className={cx(
          stageClass,
          'prism-well relative w-full overflow-hidden rounded-[18px] touch-none',
          isDragging ? 'cursor-grabbing' : 'cursor-ew-resize'
        )}
      >
        {/* Full-bleed After Layer underneath */}
        <div
          data-testid="before-after-after-layer"
          className="absolute inset-0 w-full h-full"
        >
          <ComparisonLayer
            slot="after"
            label={afterLabel}
            content={afterContent}
            safeSrc={safeAfterSrc}
            isBlocked={afterBlocked}
          />
        </div>

        {/* Clipped Before Layer overlaid */}
        <div
          data-testid="before-after-before-layer"
          style={{ clipPath: `inset(0 ${100 - safePos}% 0 0)` }}
          className="absolute inset-0 w-full h-full"
        >
          <ComparisonLayer
            slot="before"
            label={beforeLabel}
            content={beforeContent}
            safeSrc={safeBeforeSrc}
            isBlocked={beforeBlocked}
          />
        </div>

        {/* Floating Corner Crystal Badges */}
        <span
          data-testid="before-after-before-badge"
          className="prism-crystal pointer-events-none select-none absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {beforeLabel}
        </span>

        <span
          data-testid="before-after-after-badge"
          className="prism-crystal pointer-events-none select-none absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-xs font-semibold tracking-tight"
          style={STYLE_TEXT_PRIMARY}
        >
          {afterLabel}
        </span>

        {/* Tabular Percentage Readout Pill */}
        <span
          data-testid="before-after-readout"
          className="prism-crystal pointer-events-none select-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums"
          style={STYLE_TEXT_PRIMARY}
        >
          {roundedPos}%
        </span>

        {/* Vertical Refractive Divider & Centered Crystal Slider Handle */}
        <div
          data-testid="before-after-divider"
          style={{ left: `${safePos}%` }}
          className={cx(
            dividerClass,
            'absolute top-0 bottom-0 -translate-x-1/2 z-20 flex items-center justify-center'
          )}
        >
          <span
            aria-hidden="true"
            className="w-0.5 h-full shadow-sm pointer-events-none"
            style={{ backgroundColor: 'var(--prism-secondary-main)' }}
          />
          <div
            role="slider"
            tabIndex={0}
            aria-label="Before and after comparison slider"
            aria-valuemin={MIN_POSITION}
            aria-valuemax={MAX_POSITION}
            aria-valuenow={roundedPos}
            aria-valuetext={`${roundedPos}% ${beforeLabel}`}
            data-testid="before-after-handle"
            onKeyDown={handleSliderKeyDown}
            className={cx(
              handleClass,
              'prism-crystal prism-focus-ring absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full border-2 inline-flex items-center justify-center shadow-lg transition-transform',
              isDragging ? 'scale-105 cursor-grabbing' : 'cursor-ew-resize'
            )}
            style={{
              borderColor: 'var(--prism-secondary-main)',
              color: 'var(--prism-text-primary)',
            }}
          >
            <ChevronsLeftRight className="w-4 h-4 pointer-events-none" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const BeforeAfterSlider = memo(BeforeAfterSliderInner);
BeforeAfterSlider.displayName = 'BeforeAfterSlider';
