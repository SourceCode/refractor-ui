'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from 'react';
import { Compass, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type RadialMenuDisplayMode = 'trigger' | 'inline';
export type RadialMenuTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose' | 'info';

export interface RadialMenuAction {
  /** Stable unique identifier for this radial menu action. */
  id: string;
  /** Human-readable action label displayed on the radial sector and central crystal hub. */
  label: string;
  /** Optional keyboard shortcut hint (e.g. '⌘D', '⌫') shown in the hub and live status pill. */
  shortcut?: string;
  /** Semantic optical glass tone token mapped to --prism-* palette custom properties. */
  tone?: RadialMenuTone;
  /** Disables activation and skips this slice cleanly during keyboard navigation. */
  disabled?: boolean;
}

export interface RadialContextMenuProps extends BaseProps<HTMLDivElement> {
  /** Radial actions distributed equally around 360°; defaults to 6 pro creative actions, or renders a role="status" empty state when []. */
  actions?: ReadonlyArray<RadialMenuAction>;
  /** Presentation mode: 'trigger' blooms wheel on click/right-click/Space; 'inline' keeps the wheel visible inside the optical stage. */
  mode?: RadialMenuDisplayMode;
  /** Controlled open visibility of the radial wheel. */
  open?: boolean;
  /** Initial uncontrolled open state (defaults to true in 'inline' mode, false in 'trigger' mode). */
  defaultOpen?: boolean;
  /** Callback invoked when the radial wheel opens or dismisses. */
  onOpenChange?: (open: boolean) => void;
  /** Callback invoked when an enabled radial action is selected via click or Enter/Space. */
  onSelectAction?: (action: RadialMenuAction) => void;
  /** Prompt text displayed inside the interactive trigger surface. */
  surfaceLabel?: string;
}

interface BloomOffset {
  x: number;
  y: number;
}

interface ComputedRadialSlice {
  index: number;
  key: string;
  itemId: string;
  action: RadialMenuAction;
  tone: RadialMenuTone;
  color: string;
  midDeg: number;
  startDeg: number;
  endDeg: number;
  isFullCircle: boolean;
  labelX: number;
  labelY: number;
  pipX: number;
  pipY: number;
  pointerX: number;
  pointerY: number;
}

const VIEWBOX_SIZE = 280;
const CENTER = 140;
const RIM_RADIUS = 134;
const INNER_RADIUS = 56;
const OUTER_RADIUS = 122;
const ACTIVE_OUTER_RADIUS = 128;
const HUB_OUTER_RADIUS = 52;
const HUB_INNER_RADIUS = 46;
const HUB_POINTER_RADIUS = 49;
const LABEL_RADIUS = 93;
const PIP_RADIUS = 76;
const WHEEL_HALF_PX = 140;
const MAX_BLOOM_OFFSET_PX = 44;

const DEFAULT_SURFACE_LABEL = 'Right-click or press Space for Radial Menu';

const DEFAULT_RADIAL_ACTIONS: ReadonlyArray<RadialMenuAction> = [
  { id: 'duplicate', label: 'Duplicate', shortcut: '⌘D', tone: 'primary' },
  { id: 'transform', label: 'Transform', shortcut: '⌘T', tone: 'secondary' },
  { id: 'group', label: 'Group', shortcut: '⌘G', tone: 'emerald' },
  { id: 'inspect', label: 'Inspect', shortcut: '⌘I', tone: 'info' },
  { id: 'export', label: 'Export', shortcut: '⇧⌘E', tone: 'amber' },
  { id: 'delete', label: 'Delete', shortcut: '⌫', tone: 'rose' },
];

function getCycleTone(index: number): RadialMenuTone {
  switch (index % 6) {
    case 0:
      return 'primary';
    case 1:
      return 'secondary';
    case 2:
      return 'emerald';
    case 3:
      return 'info';
    case 4:
      return 'amber';
    default:
      return 'rose';
  }
}

function getToneToken(tone: RadialMenuTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'secondary':
      return 'var(--prism-secondary-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
    case 'info':
      return 'var(--prism-info-main)';
  }
}

function roundCoord(value: number): number {
  return Math.round(value * 100) / 100 + 0;
}

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleDeg: number
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: roundCoord(centerX + radius * Math.cos(rad)),
    y: roundCoord(centerY + radius * Math.sin(rad)),
  };
}

function buildFullAnnulusPath(outerRadius: number, innerRadius: number): string {
  const outerTop = roundCoord(CENTER - outerRadius);
  const outerBottom = roundCoord(CENTER + outerRadius);
  const innerTop = roundCoord(CENTER - innerRadius);
  const innerBottom = roundCoord(CENTER + innerRadius);
  return [
    `M ${CENTER} ${outerTop}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${CENTER} ${outerBottom}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${CENTER} ${outerTop}`,
    'Z',
    `M ${CENTER} ${innerTop}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${CENTER} ${innerBottom}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${CENTER} ${innerTop}`,
    'Z',
  ].join(' ');
}

function buildSectorPath(
  outerRadius: number,
  innerRadius: number,
  startDeg: number,
  endDeg: number
): string {
  const outerStart = polarToCartesian(CENTER, CENTER, outerRadius, startDeg);
  const outerEnd = polarToCartesian(CENTER, CENTER, outerRadius, endDeg);
  const innerEnd = polarToCartesian(CENTER, CENTER, innerRadius, endDeg);
  const innerStart = polarToCartesian(CENTER, CENTER, innerRadius, startDeg);
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

function buildOuterArcPath(radius: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(CENTER, CENTER, radius, startDeg);
  const end = polarToCartesian(CENTER, CENTER, radius, endDeg);
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y}`;
}

function truncateLabel(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 1)}…`;
}

function computeBloomOffsetFromRect(rect: DOMRect, clientX: number, clientY: number): BloomOffset {
  if (rect.width <= 0 || rect.height <= 0) {
    return { x: 0, y: 0 };
  }
  const maxOffsetX = Math.min(
    MAX_BLOOM_OFFSET_PX,
    Math.max(0, (rect.width - WHEEL_HALF_PX * 2) / 2)
  );
  const maxOffsetY = Math.min(
    MAX_BLOOM_OFFSET_PX,
    Math.max(0, (rect.height - WHEEL_HALF_PX * 2) / 2)
  );
  const rawX = clientX - (rect.left + rect.width / 2);
  const rawY = clientY - (rect.top + rect.height / 2);
  return {
    x: Math.round(clampNumber(rawX, -maxOffsetX, maxOffsetX, 0)) + 0,
    y: Math.round(clampNumber(rawY, -maxOffsetY, maxOffsetY, 0)) + 0,
  };
}

function findFirstEnabledIndex(actions: ReadonlyArray<RadialMenuAction>): number {
  return actions.findIndex((action) => !action.disabled);
}

function findNextEnabledIndex(
  actions: ReadonlyArray<RadialMenuAction>,
  currentIndex: number,
  direction: 1 | -1
): number {
  const count = actions.length;
  const anchor = currentIndex < 0 ? (direction === 1 ? count - 1 : 0) : currentIndex;
  for (let step = 1; step <= count; step += 1) {
    const candidate = (anchor + direction * step + count) % count;
    const item = actions[candidate];
    if (item && !item.disabled) {
      return candidate;
    }
  }
  return -1;
}

function RadialContextMenuInner({
  actions,
  mode = 'trigger',
  open,
  defaultOpen,
  onOpenChange,
  onSelectAction,
  surfaceLabel = DEFAULT_SURFACE_LABEL,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: RadialContextMenuProps) {
  const override = useComponentOverride('RadialContextMenu');
  const idPrefix = useId();
  const menuId = `${idPrefix}-menu`;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(wrapperRef, ref);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const shouldFocusMenuRef = useRef(false);
  const shouldFocusSurfaceRef = useRef(false);

  const resolvedActions = actions ?? DEFAULT_RADIAL_ACTIONS;
  const isEmpty = resolvedActions.length === 0;

  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(
    () => defaultOpen ?? mode === 'inline'
  );
  const isOpen = isControlled ? open : uncontrolledOpen;

  const firstEnabledIndex = useMemo(
    () => findFirstEnabledIndex(resolvedActions),
    [resolvedActions]
  );
  const [activeIndex, setActiveIndex] = useState<number>(firstEnabledIndex);
  const [bloomOffset, setBloomOffset] = useState<BloomOffset>({ x: 0, y: 0 });
  const [lastSelected, setLastSelected] = useState<{
    action: RadialMenuAction;
    tone: RadialMenuTone;
  } | null>(null);

  const effectiveActiveIndex = useMemo(() => {
    const candidate = resolvedActions[activeIndex];
    if (candidate && !candidate.disabled) {
      return activeIndex;
    }
    return firstEnabledIndex;
  }, [activeIndex, firstEnabledIndex, resolvedActions]);

  const computedSlices = useMemo<ReadonlyArray<ComputedRadialSlice>>(() => {
    const count = resolvedActions.length;
    if (count === 0) return [];
    const stepDeg = 360 / count;
    const gapDeg = Math.min(2.4, stepDeg * 0.12);
    const idCounts = new Map<string, number>();

    return resolvedActions.map((action, index) => {
      const seen = idCounts.get(action.id) ?? 0;
      idCounts.set(action.id, seen + 1);
      const key = seen === 0 ? action.id : `${action.id}-${seen}`;
      const tone = action.tone ?? getCycleTone(index);
      const midDeg = index * stepDeg;
      const isFullCircle = count === 1;
      const startDeg = isFullCircle ? 0 : midDeg - stepDeg / 2 + gapDeg / 2;
      const endDeg = isFullCircle ? 360 : midDeg + stepDeg / 2 - gapDeg / 2;
      const labelPos = polarToCartesian(CENTER, CENTER, LABEL_RADIUS, midDeg);
      const pipPos = polarToCartesian(CENTER, CENTER, PIP_RADIUS, midDeg);
      const pointerPos = polarToCartesian(CENTER, CENTER, HUB_POINTER_RADIUS, midDeg);

      return {
        index,
        key,
        itemId: `${idPrefix}-slice-${index}`,
        action,
        tone,
        color: getToneToken(tone),
        midDeg,
        startDeg,
        endDeg,
        isFullCircle,
        labelX: labelPos.x,
        labelY: labelPos.y,
        pipX: pipPos.x,
        pipY: pipPos.y,
        pointerX: pointerPos.x,
        pointerY: pointerPos.y,
      };
    });
  }, [idPrefix, resolvedActions]);

  const activeSlice = computedSlices[effectiveActiveIndex] ?? null;

  const setOpenState = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      if (nextOpen !== isOpen) {
        onOpenChange?.(nextOpen);
      }
    },
    [isControlled, isOpen, onOpenChange]
  );

  const handleDismiss = useCallback(() => {
    shouldFocusSurfaceRef.current = true;
    setOpenState(false);
  }, [setOpenState]);

  useEffect(() => {
    if (!isOpen || mode !== 'trigger' || isEmpty) return undefined;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        event.target instanceof Node &&
        !wrapperRef.current.contains(event.target)
      ) {
        setOpenState(false);
      }
    };

    const handleWindowEscape = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      if (event.key === 'Escape') {
        handleDismiss();
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowEscape);
    };
  }, [handleDismiss, isEmpty, isOpen, mode, setOpenState]);

  useEffect(() => {
    if (isOpen && shouldFocusMenuRef.current) {
      shouldFocusMenuRef.current = false;
      menuRef.current?.focus();
    } else if (!isOpen && shouldFocusSurfaceRef.current) {
      shouldFocusSurfaceRef.current = false;
      surfaceRef.current?.focus();
    }
  }, [isOpen]);

  const openAtPointer = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      setBloomOffset(computeBloomOffsetFromRect(rect, event.clientX, event.clientY));
      setActiveIndex(firstEnabledIndex);
      shouldFocusMenuRef.current = true;
      setOpenState(true);
    },
    [firstEnabledIndex, setOpenState]
  );

  const handleSurfaceContextMenu = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      event.preventDefault();
      openAtPointer(event);
    },
    [openAtPointer]
  );

  const handleSurfaceClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      openAtPointer(event);
    },
    [openAtPointer]
  );

  const handleSurfaceKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        setBloomOffset({ x: 0, y: 0 });
        setActiveIndex(firstEnabledIndex);
        shouldFocusMenuRef.current = true;
        setOpenState(true);
      }
    },
    [firstEnabledIndex, setOpenState]
  );

  const handleActivateSlice = useCallback(
    (slice: ComputedRadialSlice) => {
      if (slice.action.disabled) return;
      setActiveIndex(slice.index);
      setLastSelected({ action: slice.action, tone: slice.tone });
      onSelectAction?.(slice.action);
      if (mode === 'trigger') {
        shouldFocusSurfaceRef.current = true;
        setOpenState(false);
      }
    },
    [mode, onSelectAction, setOpenState]
  );

  const handleSliceHover = useCallback((index: number, disabled: boolean) => {
    if (!disabled) {
      setActiveIndex(index);
    }
  }, []);

  const handleMenuKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        const nextIndex = findNextEnabledIndex(resolvedActions, effectiveActiveIndex, 1);
        if (nextIndex !== -1) {
          setActiveIndex(nextIndex);
        }
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        const prevIndex = findNextEnabledIndex(resolvedActions, effectiveActiveIndex, -1);
        if (prevIndex !== -1) {
          setActiveIndex(prevIndex);
        }
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (activeSlice) {
          handleActivateSlice(activeSlice);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleDismiss();
      }
    },
    [activeSlice, effectiveActiveIndex, handleActivateSlice, handleDismiss, resolvedActions]
  );

  const merged = mergeProps({
    themeTarget: themeProps('radial-context-menu', {
      mode,
      open: isOpen,
      empty: isEmpty,
      activeAction: activeSlice?.action.id,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('radial-context-menu', 'header');
  const statusClass = stableClassName('radial-context-menu', 'status');
  const stageClass = stableClassName('radial-context-menu', 'stage');
  const surfaceClass = stableClassName('radial-context-menu', 'surface');
  const wheelClass = stableClassName('radial-context-menu', 'wheel');
  const emptyClass = stableClassName('radial-context-menu', 'empty');

  const hasBloomOffset = mode === 'trigger' && (bloomOffset.x !== 0 || bloomOffset.y !== 0);

  return (
    <div ref={mergedRef} role="region" aria-label="Radial Context Menu" {...rest} {...merged}>
      {/* Top Optical Header & Polite Last-Selected Action Pill */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Compass
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: isOpen ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
            }}
          />
          <span
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            Radial Menu
          </span>
          <span
            data-testid="radial-menu-mode-badge"
            className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium capitalize shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {mode}
          </span>
        </div>

        {!isEmpty ? (
          <div
            data-testid="radial-menu-status"
            aria-live="polite"
            aria-atomic="true"
            className={cx(
              statusClass,
              'prism-well inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium min-w-0 max-w-full'
            )}
            style={STYLE_TEXT_SECONDARY}
          >
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: lastSelected
                  ? getToneToken(lastSelected.tone)
                  : 'var(--prism-divider)',
              }}
            />
            <span className="truncate">
              {lastSelected ? (
                <>
                  Last action:{' '}
                  <strong style={STYLE_TEXT_PRIMARY}>
                    {lastSelected.action.label}
                  </strong>
                  {lastSelected.action.shortcut ? (
                    <span className="ml-1.5 font-mono text-[11px] opacity-80">
                      {lastSelected.action.shortcut}
                    </span>
                  ) : null}
                </>
              ) : (
                'Ready · Select a radial action'
              )}
            </span>
          </div>
        ) : null}
      </div>

      {/* Main Optical Stage */}
      <div data-testid="radial-menu-stage" className={cx(stageClass, 'w-full min-w-0 max-w-full')}>
        {isEmpty ? (
          <div
            key="empty"
            role="status"
            data-testid="radial-menu-empty"
            className={cx(
              emptyClass,
              'prism-well rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-1.5 min-w-0 max-w-full'
            )}
          >
            <span
              className="text-sm font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              No radial actions available
            </span>
            <span className="text-xs" style={STYLE_TEXT_SECONDARY}>
              Provide one or more actions to populate the optical wheel.
            </span>
          </div>
        ) : !isOpen ? (
          <div
            key="surface"
            ref={surfaceRef}
            role="button"
            tabIndex={0}
            aria-haspopup="menu"
            aria-expanded={false}
            data-testid="radial-menu-surface"
            onContextMenu={handleSurfaceContextMenu}
            onClick={handleSurfaceClick}
            onKeyDown={handleSurfaceKeyDown}
            className={cx(
              surfaceClass,
              'prism-well prism-focus-ring rounded-2xl w-full min-h-[168px] p-5 flex flex-col items-center justify-center gap-2.5 text-center cursor-pointer select-none min-w-0 max-w-full'
            )}
          >
            <span
              className="prism-crystal inline-flex items-center justify-center w-10 h-10 rounded-full shrink-0"
              style={STYLE_PRIMARY_MAIN}
              aria-hidden="true"
            >
              <Compass className="w-5 h-5" />
            </span>
            <span
              className="text-sm font-medium max-w-full break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {surfaceLabel}
            </span>
            <span
              className="text-[11px] font-mono"
              style={STYLE_TEXT_SECONDARY}
            >
              Right-click · Click · Space / Enter
            </span>
          </div>
        ) : (
          <div
            key="canvas"
            data-testid="radial-menu-canvas"
            onContextMenu={mode === 'trigger' ? handleSurfaceContextMenu : undefined}
            className="prism-well rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-3 min-w-0 max-w-full overflow-hidden"
          >
            {mode === 'trigger' ? (
              <div className="w-full flex flex-wrap items-center justify-between gap-2 min-w-0">
                <span
                  className="text-xs truncate"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {surfaceLabel}
                </span>
                <button
                  type="button"
                  data-testid="radial-menu-dismiss"
                  aria-label="Dismiss radial menu"
                  onClick={handleDismiss}
                  className="prism-crystal prism-focus-ring inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer shrink-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>Close</span>
                </button>
              </div>
            ) : null}

            {/* Interactive Circular Optical Wheel */}
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Radial actions"
              aria-activedescendant={activeSlice ? activeSlice.itemId : undefined}
              tabIndex={0}
              data-testid="radial-menu-wheel"
              data-bloom-x={String(bloomOffset.x)}
              data-bloom-y={String(bloomOffset.y)}
              onKeyDown={handleMenuKeyDown}
              style={
                hasBloomOffset
                  ? { transform: `translate(${bloomOffset.x}px, ${bloomOffset.y}px)` }
                  : undefined
              }
              className={cx(
                wheelClass,
                'prism-focus-ring rounded-full w-full max-w-[280px] mx-auto transition-transform duration-150'
              )}
            >
              <svg
                viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
                data-testid="radial-menu-svg"
                className="w-full max-w-[280px] h-auto select-none mx-auto"
              >
                {/* Outer Specular Crystal Bezel */}
                <circle
                  cx={CENTER}
                  cy={CENTER}
                  r={RIM_RADIUS}
                  fill="var(--prism-well-start)"
                  stroke="var(--prism-divider)"
                  strokeWidth={1.25}
                />

                {/* Equal 360° Annular Pie Action Sectors */}
                {computedSlices.map((slice) => {
                  const isDisabled = Boolean(slice.action.disabled);
                  const isActive = !isDisabled && effectiveActiveIndex === slice.index;
                  const sectorOuterR = isActive ? ACTIVE_OUTER_RADIUS : OUTER_RADIUS;
                  const sectorPath = slice.isFullCircle
                    ? buildFullAnnulusPath(sectorOuterR, INNER_RADIUS)
                    : buildSectorPath(sectorOuterR, INNER_RADIUS, slice.startDeg, slice.endDeg);
                  const sectorAriaLabel = slice.action.shortcut
                    ? `${slice.action.label} (${slice.action.shortcut})`
                    : slice.action.label;
                  const rimStrokeWidth = isActive ? 4 : 2.5;
                  const rimStrokeOpacity = isDisabled ? 0.22 : isActive ? 1 : 0.72;

                  return (
                    <g
                      key={slice.key}
                      id={slice.itemId}
                      role="menuitem"
                      aria-label={sectorAriaLabel}
                      aria-disabled={isDisabled ? 'true' : undefined}
                      data-testid={`radial-slice-${slice.action.id}`}
                      data-active={isActive ? 'true' : undefined}
                      data-tone={slice.tone}
                      data-disabled={isDisabled ? 'true' : undefined}
                      onMouseEnter={() => handleSliceHover(slice.index, isDisabled)}
                      onPointerEnter={() => handleSliceHover(slice.index, isDisabled)}
                      onClick={(event) => {
                        event.stopPropagation();
                        handleActivateSlice(slice);
                      }}
                      className={isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                    >
                      {/* Frosted Optical Base Layer */}
                      <path
                        d={sectorPath}
                        fillRule={slice.isFullCircle ? 'evenodd' : undefined}
                        fill="var(--prism-crystal-top)"
                        fillOpacity={isDisabled ? 0.42 : 0.86}
                        stroke={isActive ? slice.color : 'var(--prism-well-border)'}
                        strokeWidth={isActive ? 2 : 1.15}
                      />

                      {/* Semantic Token Tint Layer */}
                      <path
                        d={sectorPath}
                        fillRule={slice.isFullCircle ? 'evenodd' : undefined}
                        fill={slice.color}
                        fillOpacity={isDisabled ? 0.06 : isActive ? 0.28 : 0.12}
                        pointerEvents="none"
                      />

                      {/* Outer Semantic Chromatic Rim Accent */}
                      {slice.isFullCircle ? (
                        <circle
                          cx={CENTER}
                          cy={CENTER}
                          r={sectorOuterR - 1.5}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={rimStrokeWidth}
                          strokeOpacity={rimStrokeOpacity}
                          pointerEvents="none"
                        />
                      ) : (
                        <path
                          d={buildOuterArcPath(sectorOuterR - 1.5, slice.startDeg, slice.endDeg)}
                          fill="none"
                          stroke={slice.color}
                          strokeWidth={rimStrokeWidth}
                          strokeLinecap="round"
                          strokeOpacity={rimStrokeOpacity}
                          pointerEvents="none"
                        />
                      )}

                      {/* Sector Semantic Dot */}
                      <circle
                        cx={slice.pipX}
                        cy={slice.pipY}
                        r={isActive ? 3.2 : 2.4}
                        fill={slice.color}
                        fillOpacity={isDisabled ? 0.35 : 1}
                        pointerEvents="none"
                      />

                      {/* Sector Action Label */}
                      <text
                        x={slice.labelX}
                        y={slice.labelY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={10.5}
                        fontWeight={isActive ? 700 : 600}
                        fill={
                          isDisabled
                            ? 'var(--prism-text-disabled)'
                            : 'var(--prism-text-primary)'
                        }
                        pointerEvents="none"
                      >
                        {truncateLabel(slice.action.label, 10)}
                      </text>
                    </g>
                  );
                })}

                {/* Central Optical Crystal Hub */}
                <g data-testid="radial-menu-hub" pointerEvents="none">
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={HUB_OUTER_RADIUS}
                    fill="var(--prism-crystal-top)"
                    stroke="var(--prism-well-border)"
                    strokeWidth={1.5}
                  />
                  <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={HUB_INNER_RADIUS}
                    fill="var(--prism-well-end)"
                    stroke={activeSlice ? activeSlice.color : 'var(--prism-divider)'}
                    strokeWidth={activeSlice ? 2 : 1.25}
                  />

                  {activeSlice ? (
                    <circle
                      data-testid="radial-menu-hub-pointer"
                      cx={activeSlice.pointerX}
                      cy={activeSlice.pointerY}
                      r={3.5}
                      fill={activeSlice.color}
                    />
                  ) : null}

                  <text
                    data-testid="radial-menu-hub-label"
                    x={CENTER}
                    y={CENTER - 5}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12.5}
                    fontWeight={700}
                    fill={
                      activeSlice
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-text-disabled)'
                    }
                  >
                    {activeSlice ? truncateLabel(activeSlice.action.label, 12) : 'Unavailable'}
                  </text>

                  <text
                    data-testid="radial-menu-hub-shortcut"
                    x={CENTER}
                    y={CENTER + 14}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={10.5}
                    fontFamily="var(--prism-font-mono)"
                    fill={activeSlice ? activeSlice.color : 'var(--prism-text-secondary)'}
                  >
                    {activeSlice
                      ? (activeSlice.action.shortcut ?? 'Enter')
                      : 'All disabled'}
                  </text>
                </g>
              </svg>
            </div>

            {/* Responsive Keyboard Hint Footer */}
            <div
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] min-w-0 max-w-full"
              style={STYLE_TEXT_SECONDARY}
            >
              <span>← / → Spin</span>
              <span>·</span>
              <span>Enter / Space Activate</span>
              <span>·</span>
              <span>Esc Dismiss</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const RadialContextMenu = memo(RadialContextMenuInner);
RadialContextMenu.displayName = 'RadialContextMenu';
