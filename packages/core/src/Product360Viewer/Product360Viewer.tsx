'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Pause, Play, Rotate3d, RotateCcw } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export interface Product360Frame {
  /** Orbit angle in degrees represented by this frame (normalized to 0..359). */
  angle: number;
  /** Optional human-readable viewpoint label displayed in the HUD. */
  label?: string;
  /** Optional image URL (validated strictly via sanitizeUrl allowing raster data URIs). */
  src?: string;
}

export interface Product360ViewerProps extends BaseProps<HTMLDivElement> {
  /** Specimen title displayed in the viewer header (defaults to 'Optical Glass Specimen'). */
  title?: string;
  /** Optional angle-indexed media frames or viewpoint labels. */
  frames?: ReadonlyArray<Product360Frame>;
  /** Controlled orbit angle in degrees (normalized to 0..359). */
  angle?: number;
  /** Initial orbit angle in uncontrolled mode (defaults to 0). */
  defaultAngle?: number;
  /** Fired with the next normalized angle (0..359) on orbit, scrub, reset, or auto-spin. */
  onAngleChange?: (deg: number) => void;
  /** Enables automatic continuous 360-degree turntable spin (defaults to false). */
  autoRotate?: boolean;
  /** Viewport stage height in pixels (clamped 180..600, default 300). */
  heightPx?: number;
}

interface SanitizedFrame {
  angle: number;
  label?: string;
  safeSrc: string;
}

interface PrismFacet {
  id: string;
  points: string;
  depth: number;
  fill: string;
  fillOpacity: number;
}

interface DegreeTick {
  id: string;
  deg: number;
  label: string;
}

const DEFAULT_TITLE = 'Optical Glass Specimen';
const MIN_HEIGHT = 180;
const MAX_HEIGHT = 600;
const DEFAULT_HEIGHT = 300;
const KEYBOARD_STEP_DEG = 15;
const AUTO_ROTATE_STEP_DEG = 5;
const AUTO_ROTATE_INTERVAL_MS = 120;
const SCRUBBER_MAX_DEG = 355;

const DEGREE_TICKS: ReadonlyArray<DegreeTick> = [
  { id: 'tick-0', deg: 0, label: '0°' },
  { id: 'tick-90', deg: 90, label: '90°' },
  { id: 'tick-180', deg: 180, label: '180°' },
  { id: 'tick-270', deg: 270, label: '270°' },
  { id: 'tick-355', deg: 355, label: '355°' },
];

function getFacetFillToken(index: number): string {
  switch (index % 6) {
    case 0:
      return 'var(--prism-secondary-light)';
    case 1:
      return 'var(--prism-crystal-top)';
    case 2:
      return 'var(--prism-primary-light)';
    case 3:
      return 'var(--prism-info-light)';
    case 4:
      return 'var(--prism-crystal-mid)';
    default:
      return 'var(--prism-secondary-main)';
  }
}

function roundTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeAngle(value: number | undefined, fallback = 0): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  const rounded = Math.round(value);
  return ((rounded % 360) + 360) % 360;
}

function angularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function getCardinalViewpoint(deg: number): string {
  if (deg >= 45 && deg < 135) return 'Right';
  if (deg >= 135 && deg < 225) return 'Rear';
  if (deg >= 225 && deg < 315) return 'Left';
  return 'Front';
}

function sanitizeFrames(raw?: ReadonlyArray<Product360Frame>): SanitizedFrame[] {
  if (!raw || raw.length === 0) return [];
  const result: SanitizedFrame[] = [];

  for (const frame of raw) {
    if (!Number.isFinite(frame.angle)) continue;
    const normalized = normalizeAngle(frame.angle, 0);
    const safeSrc = frame.src ? sanitizeUrl(frame.src, true) : '';
    const trimmedLabel = frame.label?.trim();
    const entry: SanitizedFrame = {
      angle: normalized,
      safeSrc,
    };
    if (trimmedLabel) {
      entry.label = trimmedLabel;
    }
    result.push(entry);
  }

  return result;
}

function findNearestFrame(
  frames: ReadonlyArray<SanitizedFrame>,
  targetDeg: number
): SanitizedFrame | null {
  let nearest: SanitizedFrame | null = null;
  let bestDist = 361;

  for (const frame of frames) {
    const dist = angularDistance(frame.angle, targetDeg);
    if (dist < bestDist) {
      bestDist = dist;
      nearest = frame;
    }
  }

  return nearest;
}

function computePrismGeometry(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const cx = 160;
  const cy = 104;
  const radius = 64;
  const tilt = 0.34;
  const halfHeight = 36;
  const sides = 6;

  const topPoints: Array<{ x: number; y: number; depth: number }> = [];
  const bottomPoints: Array<{ x: number; y: number; depth: number }> = [];

  for (let i = 0; i < sides; i += 1) {
    const theta = rad + (i * 2 * Math.PI) / sides;
    const x = roundTwo(cx + radius * Math.cos(theta));
    const yOffset = radius * tilt * Math.sin(theta);
    const depth = Math.sin(theta);
    topPoints.push({ x, y: roundTwo(cy - halfHeight + yOffset), depth });
    bottomPoints.push({ x, y: roundTwo(cy + halfHeight + yOffset), depth });
  }

  const facets: PrismFacet[] = [];
  for (let i = 0; i < sides; i += 1) {
    const nextIdx = (i + 1) % sides;
    const t1 = topPoints[i]!;
    const t2 = topPoints[nextIdx]!;
    const b2 = bottomPoints[nextIdx]!;
    const b1 = bottomPoints[i]!;

    const avgDepth = (t1.depth + t2.depth) / 2;
    const midTheta = rad + ((i + 0.5) * 2 * Math.PI) / sides;
    // Key specular light coming from front-upper-left
    const lightAlignment = Math.cos(midTheta - Math.PI / 4);
    const fillOpacity = roundTwo(0.24 + 0.38 * ((lightAlignment + 1) / 2));

    facets.push({
      id: `facet-${i}`,
      points: `${t1.x},${t1.y} ${t2.x},${t2.y} ${b2.x},${b2.y} ${b1.x},${b1.y}`,
      depth: avgDepth,
      fill: getFacetFillToken(i),
      fillOpacity,
    });
  }

  facets.sort((a, b) => a.depth - b.depth);

  const topPolygon = topPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const bottomPolygon = bottomPoints.map((pt) => `${pt.x},${pt.y}`).join(' ');
  const specularX = roundTwo(cx + 26 * Math.sin(rad));
  const specularY = roundTwo(cy - 10 + 8 * Math.cos(rad));
  const coreRx = roundTwo(20 + 8 * Math.abs(Math.cos(rad)));
  const orbitDotX = roundTwo(cx + 96 * Math.sin(rad));
  const orbitDotY = roundTwo(176 + 19 * Math.cos(rad));

  return {
    facets,
    topPolygon,
    bottomPolygon,
    specularX,
    specularY,
    coreRx,
    orbitDotX,
    orbitDotY,
  };
}

export function Product360Viewer({
  title = DEFAULT_TITLE,
  frames,
  angle,
  defaultAngle = 0,
  onAngleChange,
  autoRotate = false,
  heightPx = DEFAULT_HEIGHT,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: Product360ViewerProps) {
  const override = useComponentOverride('Product360Viewer');
  const scrubberId = useId();
  const svgGradId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const cleanupDragRef = useRef<(() => void) | null>(null);

  const safeHeight = Math.round(clampNumber(heightPx, MIN_HEIGHT, MAX_HEIGHT, DEFAULT_HEIGHT));

  const isAngleControlled = angle !== undefined;
  const [uncontrolledAngle, setUncontrolledAngle] = useState<number>(() =>
    normalizeAngle(defaultAngle, 0)
  );
  const normalizedAngle = isAngleControlled ? normalizeAngle(angle, 0) : uncontrolledAngle;

  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(Boolean(autoRotate));
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [failedSrcs, setFailedSrcs] = useState<ReadonlySet<string>>(() => new Set());

  const angleRef = useRef<number>(normalizedAngle);
  angleRef.current = normalizedAngle;

  const isAngleControlledRef = useRef<boolean>(isAngleControlled);
  isAngleControlledRef.current = isAngleControlled;

  const onAngleChangeRef = useRef(onAngleChange);
  onAngleChangeRef.current = onAngleChange;

  useEffect(() => {
    setIsAutoRotating(Boolean(autoRotate));
  }, [autoRotate]);

  const commitAngle = useCallback((rawDeg: number) => {
    const next = normalizeAngle(rawDeg, 0);
    if (!isAngleControlledRef.current) {
      angleRef.current = next;
      setUncontrolledAngle(next);
    }
    onAngleChangeRef.current?.(next);
  }, []);

  useEffect(() => {
    if (!isAutoRotating) return;
    const intervalId = window.setInterval(() => {
      commitAngle(angleRef.current + AUTO_ROTATE_STEP_DEG);
    }, AUTO_ROTATE_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [commitAngle, isAutoRotating]);

  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
    };
  }, []);

  const sanitizedFrames = useMemo(() => sanitizeFrames(frames), [frames]);

  const renderableImageFrames = useMemo(
    () => sanitizedFrames.filter((frame) => frame.safeSrc.length > 0 && !failedSrcs.has(frame.safeSrc)),
    [failedSrcs, sanitizedFrames]
  );

  const nearestLabelFrame = useMemo(
    () => findNearestFrame(sanitizedFrames, normalizedAngle),
    [normalizedAngle, sanitizedFrames]
  );

  const activeImageFrame = useMemo(
    () => findNearestFrame(renderableImageFrames, normalizedAngle),
    [normalizedAngle, renderableImageFrames]
  );

  const viewpointLabel = nearestLabelFrame?.label ?? getCardinalViewpoint(normalizedAngle);

  const prismGeometry = useMemo(
    () => computePrismGeometry(normalizedAngle),
    [normalizedAngle]
  );

  const handleViewportPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button > 0) return;
      event.preventDefault();
      cleanupDragRef.current?.();

      const startClientX = event.clientX;
      const startAngle = angleRef.current;
      setIsDragging(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const rect = viewportRef.current?.getBoundingClientRect();
        const dragSpan =
          rect && Number.isFinite(rect.width) && rect.width > 0 ? Math.max(240, rect.width) : 360;
        const deltaDeg = ((moveEvent.clientX - startClientX) / dragSpan) * 360;
        commitAngle(startAngle + deltaDeg);
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
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerEnd);
      window.addEventListener('pointercancel', handlePointerEnd);
    },
    [commitAngle]
  );

  const handleViewportKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        commitAngle(angleRef.current - KEYBOARD_STEP_DEG);
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        commitAngle(angleRef.current + KEYBOARD_STEP_DEG);
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        commitAngle(0);
      }
    },
    [commitAngle]
  );

  const handleImageError = useCallback((brokenSrc: string) => {
    setFailedSrcs((prev) => {
      const next = new Set(prev);
      next.add(brokenSrc);
      return next;
    });
  }, []);

  const handleToggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  const handleResetAngle = useCallback(() => {
    commitAngle(0);
  }, [commitAngle]);

  const scrubberValue = Math.min(SCRUBBER_MAX_DEG, normalizedAngle);

  const merged = mergeProps({
    themeTarget: themeProps('product-360-viewer', {
      dragging: isDragging,
      autoRotating: isAutoRotating,
      mode: activeImageFrame ? 'frames' : 'prism',
    }),
    baseClassName: 'prism-slab p-4 space-y-3 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const stageClass = stableClassName('product-360-viewer', 'stage');
  const dockClass = stableClassName('product-360-viewer', 'dock');

  return (
    <div ref={ref} role="region" aria-label={`360 product viewer for ${title}`} {...rest} {...merged}>
      {/* Header Telemetry Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="prism-crystal w-7 h-7 rounded-xl inline-flex items-center justify-center text-[var(--prism-secondary-main)] shrink-0">
            <Rotate3d className="w-4 h-4" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.01em] text-[var(--prism-text-primary)] truncate">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            data-testid="product-360-viewpoint"
            className="prism-crystal rounded-full px-2.5 py-1 text-[11px] font-semibold text-[var(--prism-text-primary)]"
          >
            {viewpointLabel}
          </span>
          <span
            data-testid="product-360-angle-readout"
            className="prism-well rounded-full px-2.5 py-1 text-xs font-mono tabular-nums font-bold text-[var(--prism-primary-main)] min-w-[52px] text-center"
          >
            {normalizedAngle}°
          </span>
        </div>
      </div>

      {/* Interactive 360° Orbital Viewport Stage */}
      <div
        ref={viewportRef}
        role="application"
        tabIndex={0}
        aria-label={`${title} 360 degree stage at ${normalizedAngle} degrees, ${viewpointLabel} view. Drag horizontally or use Left and Right arrow keys to orbit, and Home to reset to 0 degrees.`}
        data-testid="product-360-stage"
        data-angle={String(normalizedAngle)}
        data-dragging={isDragging ? 'true' : undefined}
        onPointerDown={handleViewportPointerDown}
        onKeyDown={handleViewportKeyDown}
        style={{ height: `${safeHeight}px`, touchAction: 'none' }}
        className={cx(
          stageClass,
          'prism-studio-grid prism-focus-ring relative w-full rounded-[20px] overflow-hidden border border-[var(--prism-divider)] flex items-center justify-center touch-none',
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        )}
      >
        {activeImageFrame ? (
          <img
            data-testid="product-360-frame-image"
            src={activeImageFrame.safeSrc}
            alt={`${title} — ${viewpointLabel} (${normalizedAngle}°)`}
            draggable={false}
            referrerPolicy="no-referrer"
            onError={() => handleImageError(activeImageFrame.safeSrc)}
            className="max-w-full max-h-full object-contain pointer-events-none select-none"
          />
        ) : (
          <svg
            data-testid="product-360-prism-svg"
            data-angle={String(normalizedAngle)}
            viewBox="0 0 320 220"
            role="img"
            aria-label={`Interactive 3D refractive glass prism oriented at ${normalizedAngle} degrees (${viewpointLabel})`}
            className="w-full h-full max-w-[360px] pointer-events-none"
          >
            <defs>
              <linearGradient id={`${svgGradId}-top`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="var(--prism-crystal-top)" stopOpacity="0.95" />
                <stop offset="55%" stopColor="var(--prism-secondary-light)" stopOpacity="0.58" />
                <stop offset="100%" stopColor="var(--prism-primary-light)" stopOpacity="0.52" />
              </linearGradient>
              <radialGradient id={`${svgGradId}-core`} cx="50%" cy="42%" r="55%">
                <stop offset="0%" stopColor="var(--prism-primary-light)" stopOpacity="0.85" />
                <stop offset="58%" stopColor="var(--prism-secondary-main)" stopOpacity="0.45" />
                <stop offset="100%" stopColor="var(--prism-info-main)" stopOpacity="0.12" />
              </radialGradient>
              <radialGradient id={`${svgGradId}-caustic`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="var(--prism-primary-main)" stopOpacity="0.34" />
                <stop offset="55%" stopColor="var(--prism-secondary-main)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="var(--prism-secondary-main)" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Base Orbital Turntable Ring & Caustic Projection */}
            <ellipse
              cx={160}
              cy={176}
              rx={96}
              ry={19}
              fill={`url(#${svgGradId}-caustic)`}
              stroke="var(--prism-divider)"
              strokeWidth={1.25}
              strokeDasharray="4 3"
            />

            {/* Orbiting Compass Beacon */}
            <circle
              data-testid="product-360-orbit-dot"
              cx={prismGeometry.orbitDotX}
              cy={prismGeometry.orbitDotY}
              r={4.5}
              fill="var(--prism-primary-main)"
              stroke="var(--prism-crystal-top)"
              strokeWidth={1.5}
            />

            {/* Bottom Hexagonal Crystal Cap */}
            <polygon
              points={prismGeometry.bottomPolygon}
              fill="var(--prism-crystal-bottom)"
              fillOpacity={0.62}
              stroke="var(--prism-secondary-main)"
              strokeOpacity={0.45}
              strokeWidth={1}
            />

            {/* Suspended Internal Refractive Lens Core */}
            <ellipse
              data-testid="product-360-lens-core"
              cx={160}
              cy={104}
              rx={prismGeometry.coreRx}
              ry={26}
              fill={`url(#${svgGradId}-core)`}
              stroke="var(--prism-secondary-main)"
              strokeOpacity={0.55}
              strokeWidth={1.2}
            />

            {/* Depth-Sorted 3D Isometric Crystal Facets */}
            {prismGeometry.facets.map((facet) => (
              <polygon
                key={facet.id}
                data-testid={`product-360-${facet.id}`}
                points={facet.points}
                fill={facet.fill}
                fillOpacity={facet.fillOpacity}
                stroke="var(--prism-divider)"
                strokeWidth={1.1}
                strokeLinejoin="round"
              />
            ))}

            {/* Top Hexagonal Crystal Cap */}
            <polygon
              data-testid="product-360-top-cap"
              points={prismGeometry.topPolygon}
              fill={`url(#${svgGradId}-top)`}
              stroke="var(--prism-secondary-main)"
              strokeOpacity={0.7}
              strokeWidth={1.3}
              strokeLinejoin="round"
            />

            {/* Dynamic Specular Sheen Glint */}
            <ellipse
              data-testid="product-360-specular"
              cx={prismGeometry.specularX}
              cy={prismGeometry.specularY}
              rx={14}
              ry={5}
              fill="var(--prism-primary-contrast)"
              fillOpacity={0.65}
            />
          </svg>
        )}

        {/* Subtle Bottom Drag Hint */}
        <div
          aria-hidden="true"
          className="prism-crystal pointer-events-none absolute bottom-2.5 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-medium text-[var(--prism-text-secondary)] whitespace-nowrap"
        >
          Drag horizontally to orbit 360°
        </div>
      </div>

      {/* Crystal Control Dock: Accessible Scrubber + Auto-Spin + Reset 0° */}
      <div className={cx(dockClass, 'prism-crystal rounded-[20px] p-3 space-y-2.5')}>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor={scrubberId}
              className="text-xs font-semibold text-[var(--prism-text-primary)]"
            >
              Orbit Angle
            </label>
            <span className="text-[11px] font-mono tabular-nums text-[var(--prism-text-secondary)]">
              {normalizedAngle}° / 360°
            </span>
          </div>

          <input
            id={scrubberId}
            type="range"
            min={0}
            max={SCRUBBER_MAX_DEG}
            step={1}
            value={scrubberValue}
            aria-label="Orbit angle"
            aria-valuetext={`${normalizedAngle} degrees, ${viewpointLabel}`}
            onChange={(event) => commitAngle(Number(event.target.value))}
            className="prism-focus-ring w-full accent-[var(--prism-primary-main)] cursor-pointer"
          />

          <div
            aria-hidden="true"
            className="flex items-center justify-between text-[10px] font-mono tabular-nums text-[var(--prism-text-secondary)]"
          >
            {DEGREE_TICKS.map((tick) => (
              <span key={tick.id}>{tick.label}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--prism-divider)]">
          <button
            type="button"
            aria-pressed={isAutoRotating}
            onClick={handleToggleAutoRotate}
            className={cx(
              'prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-all',
              isAutoRotating
                ? 'prism-btn-primary'
                : 'prism-well text-[var(--prism-text-primary)] hover:brightness-105'
            )}
          >
            {isAutoRotating ? (
              <Pause className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            ) : (
              <Play className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            )}
            <span className="relative z-10">Auto-Spin</span>
          </button>

          <button
            type="button"
            aria-label="Reset angle to 0 degrees"
            onClick={handleResetAngle}
            className="prism-well prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-[var(--prism-text-primary)] cursor-pointer hover:brightness-105"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="font-mono tabular-nums">Reset 0°</span>
          </button>
        </div>
      </div>
    </div>
  );
}

Product360Viewer.displayName = 'Product360Viewer';
