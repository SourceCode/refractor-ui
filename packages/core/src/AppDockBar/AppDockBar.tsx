'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  AppWindow,
  Code2,
  FolderOpen,
  MessageSquare,
  Settings,
  Sparkles,
  Terminal,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type AppDockPosition = 'bottom' | 'left' | 'right';

export type AppDockTone =
  | 'primary'
  | 'secondary'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'info';

export interface AppDockItem {
  /** Stable unique identifier for the dock application. */
  id: string;
  /** Visible tooltip title and accessible name for the application. */
  label: string;
  /** Optional custom icon rendered inside the optical app tile. */
  icon?: ReactNode;
  /** Indicates an active/open background process (displays glowing indicator dot). */
  running?: boolean;
  /** Optional numeric notification badge (clamped at 99+ when > 99; hidden when <= 0 or non-finite). */
  badgeCount?: number;
  /** Draws attention with a gentle bounce animation and data-attention="true". */
  attention?: boolean;
  /** Semantic optical accent tone mapped strictly to --prism-* tokens (defaults to 'primary'). */
  tone?: AppDockTone;
  /** Disables launching, magnification targeting, and keyboard activation. */
  disabled?: boolean;
}

export interface AppDockBarProps extends BaseProps<HTMLDivElement> {
  /** Ordered dock applications (defaults to 6 iconic studio apps; pass [] for role="status" empty state). */
  items?: ReadonlyArray<AppDockItem>;
  /** Controlled active application identifier (null indicates no active application). */
  activeId?: string | null;
  /** Initial active application identifier when operating in uncontrolled mode. */
  defaultActiveId?: string | null;
  /** Edge placement and layout orientation of the dock ('bottom' | 'left' | 'right', defaults to 'bottom'). */
  position?: AppDockPosition;
  /** Smoothly scales hovered/focused icon (1.28x) and adjacent neighbors (1.12x) when true (defaults to true). */
  magnification?: boolean;
  /** Callback fired when an enabled dock application is launched via click or keyboard Enter/Space. */
  onLaunch?: (item: AppDockItem) => void;
  /** Accessible toolbar label for the dock landmark (defaults to 'Application dock'). */
  ariaLabel?: string;
}

interface NormalizedDockItem {
  key: string;
  id: string;
  index: number;
  enabledPos: number;
  label: string;
  icon: ReactNode;
  running: boolean;
  badgeText: string | null;
  attention: boolean;
  tone: AppDockTone;
  disabled: boolean;
  item: AppDockItem;
}

const DEFAULT_ARIA_LABEL = 'Application dock';

const DOCK_KEYFRAMES_CSS = `
@keyframes refractor-dock-attention {
  0%, 100% { transform: translateY(0); }
  35% { transform: translateY(-5px); }
  55% { transform: translateY(0); }
  72% { transform: translateY(-2.5px); }
}
@media (prefers-reduced-motion: reduce) {
  .refractor-app-dock-bar__attention-glyph {
    animation: none !important;
  }
  .refractor-app-dock-bar__item {
    transition: none !important;
  }
}
`;

const DEFAULT_DOCK_ITEMS: ReadonlyArray<AppDockItem> = [
  {
    id: 'finder',
    label: 'Finder',
    icon: <FolderOpen aria-hidden="true" className="w-5 h-5" />,
    running: true,
    tone: 'info',
  },
  {
    id: 'code-ide',
    label: 'Code IDE',
    icon: <Code2 aria-hidden="true" className="w-5 h-5" />,
    running: true,
    tone: 'primary',
  },
  {
    id: 'prism-studio',
    label: 'Prism Studio',
    icon: <Sparkles aria-hidden="true" className="w-5 h-5" />,
    running: true,
    tone: 'secondary',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: <Terminal aria-hidden="true" className="w-5 h-5" />,
    running: true,
    tone: 'emerald',
  },
  {
    id: 'messages',
    label: 'Messages',
    icon: <MessageSquare aria-hidden="true" className="w-5 h-5" />,
    running: true,
    badgeCount: 3,
    attention: true,
    tone: 'rose',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings aria-hidden="true" className="w-5 h-5" />,
    running: false,
    tone: 'amber',
  },
];

function getToneAccentVar(tone: AppDockTone): string {
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

function formatDockBadge(count?: number): string | null {
  if (count === undefined || !Number.isFinite(count) || count <= 0) {
    return null;
  }
  const whole = Math.floor(count);
  if (whole <= 0) {
    return null;
  }
  return whole > 99 ? '99+' : String(whole);
}

function getDockItemScale(
  itemIndex: number,
  spotlightIndex: number | null,
  magnification: boolean,
  disabled: boolean
): number {
  if (!magnification || disabled || spotlightIndex === null) {
    return 1;
  }
  const distance = Math.abs(itemIndex - spotlightIndex);
  if (distance === 0) return 1.28;
  if (distance === 1) return 1.12;
  return 1;
}

function getTransformOrigin(position: AppDockPosition): string {
  switch (position) {
    case 'left':
      return 'left center';
    case 'right':
      return 'right center';
    case 'bottom':
      return 'center bottom';
  }
}

function getTooltipEdgeClass(position: AppDockPosition): string {
  switch (position) {
    case 'left':
      return 'left-full ml-2.5';
    case 'right':
      return 'right-full mr-2.5';
    case 'bottom':
      return 'bottom-full mb-2.5';
  }
}

function buildAccessibleItemLabel(
  entry: NormalizedDockItem,
  isActive: boolean
): string {
  const parts: string[] = [entry.label];
  if (isActive) {
    parts.push('active');
  } else if (entry.running) {
    parts.push('running');
  }
  if (entry.badgeText !== null) {
    parts.push(`${entry.badgeText} notifications`);
  }
  if (entry.attention && !entry.disabled) {
    parts.push('needs attention');
  }
  return parts.join(', ');
}

function AppDockBarInner({
  items,
  activeId,
  defaultActiveId = null,
  position = 'bottom',
  magnification = true,
  onLaunch,
  ariaLabel = DEFAULT_ARIA_LABEL,
  'aria-label': ariaLabelProp,
  className,
  style,
  xstyle,
  ref,
  onMouseLeave,
  onBlur,
  ...rest
}: AppDockBarProps) {
  const override = useComponentOverride('AppDockBar');
  const tooltipId = useId();
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const [currentActiveId, setCurrentActiveId] = useControllableState<string | null>({
    value: activeId,
    defaultValue: defaultActiveId,
  });

  const resolvedAriaLabel =
    (ariaLabelProp ?? ariaLabel).trim() || DEFAULT_ARIA_LABEL;
  const isVertical = position === 'left' || position === 'right';

  const normalizedItems = useMemo<ReadonlyArray<NormalizedDockItem>>(() => {
    const sourceItems = items ?? DEFAULT_DOCK_ITEMS;
    const seenKeys = new Map<string, number>();
    const out: NormalizedDockItem[] = [];

    let index = 0;
    let enabledPos = 0;
    for (const item of sourceItems) {
      const trimmedId = item.id.trim();
      const trimmedLabel = item.label.trim();
      const rawBase = trimmedId || trimmedLabel || 'app';
      const baseKey = `dock:${rawBase}`;
      const seen = seenKeys.get(baseKey) ?? 0;
      seenKeys.set(baseKey, seen + 1);
      const key = seen === 0 ? baseKey : `${baseKey}#${seen + 1}`;

      const disabled = Boolean(item.disabled);
      const label = trimmedLabel || trimmedId || 'Application';
      const icon = item.icon ?? (
        <AppWindow aria-hidden="true" className="w-5 h-5" />
      );

      out.push({
        key,
        id: item.id,
        index,
        enabledPos: disabled ? -1 : enabledPos,
        label,
        icon,
        running: Boolean(item.running),
        badgeText: formatDockBadge(item.badgeCount),
        attention: Boolean(item.attention),
        tone: item.tone ?? 'primary',
        disabled,
        item,
      });

      index += 1;
      if (!disabled) {
        enabledPos += 1;
      }
    }

    return out;
  }, [items]);

  const enabledEntries = useMemo<ReadonlyArray<NormalizedDockItem>>(
    () => normalizedItems.filter((entry) => !entry.disabled),
    [normalizedItems]
  );

  const isEmpty = normalizedItems.length === 0;

  const hoveredCandidate =
    hoveredIndex !== null ? normalizedItems[hoveredIndex] : undefined;
  const focusedCandidate =
    focusedIndex !== null ? normalizedItems[focusedIndex] : undefined;
  const activeHoveredEntry =
    hoveredCandidate && !hoveredCandidate.disabled
      ? hoveredCandidate
      : undefined;
  const activeFocusedEntry =
    focusedCandidate && !focusedCandidate.disabled
      ? focusedCandidate
      : undefined;
  const spotlightEntry = activeHoveredEntry ?? activeFocusedEntry;
  const spotlightIndex = spotlightEntry ? spotlightEntry.index : null;

  const rovingFocusKey = useMemo<string | null>(() => {
    if (activeFocusedEntry) {
      return activeFocusedEntry.key;
    }
    const activeEnabled = enabledEntries.find(
      (entry) => currentActiveId !== null && entry.id === currentActiveId
    );
    return activeEnabled?.key ?? enabledEntries[0]?.key ?? null;
  }, [activeFocusedEntry, enabledEntries, currentActiveId]);

  const handleLaunch = useCallback(
    (entry: NormalizedDockItem) => {
      setCurrentActiveId(entry.id);
      onLaunch?.(entry.item);
    },
    [onLaunch, setCurrentActiveId]
  );

  const handleItemKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, entry: NormalizedDockItem) => {
      if (event.nativeEvent.isComposing) return;

      if (event.key === 'Escape') {
        setHoveredIndex(null);
        setFocusedIndex(null);
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleLaunch(entry);
        return;
      }

      const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
      const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

      let target: NormalizedDockItem | undefined;
      if (event.key === nextKey) {
        target = enabledEntries[(entry.enabledPos + 1) % enabledEntries.length];
      } else if (event.key === prevKey) {
        target =
          enabledEntries[
            (entry.enabledPos - 1 + enabledEntries.length) %
              enabledEntries.length
          ];
      } else if (event.key === 'Home') {
        target = enabledEntries[0];
      } else if (event.key === 'End') {
        target = enabledEntries[enabledEntries.length - 1];
      }

      if (target) {
        event.preventDefault();
        setFocusedIndex(target.index);
        buttonRefs.current.get(target.key)?.focus();
      }
    },
    [enabledEntries, handleLaunch, isVertical]
  );

  const handleMouseLeave = composeEventHandlers<MouseEvent<HTMLDivElement>>(
    onMouseLeave,
    () => {
      setHoveredIndex(null);
    }
  );

  const handleBlur = composeEventHandlers<FocusEvent<HTMLDivElement>>(
    onBlur,
    (event) => {
      const nextTarget = event.relatedTarget;
      if (
        !(nextTarget instanceof Node && event.currentTarget.contains(nextTarget))
      ) {
        setFocusedIndex(null);
      }
    }
  );

  const rootLayoutClass = isVertical
    ? 'prism-slab rounded-full relative inline-flex flex-col items-center max-w-full min-w-0 p-1.5'
    : 'prism-slab rounded-full relative inline-flex items-end max-w-full min-w-0 px-2.5 py-1.5';

  const merged = mergeProps({
    themeTarget: themeProps('app-dock-bar', {
      position,
      magnification,
      empty: isEmpty,
      count: normalizedItems.length,
      activeId: currentActiveId ?? undefined,
    }),
    baseClassName: rootLayoutClass,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const trayClass = stableClassName('app-dock-bar', 'tray');
  const slotClass = stableClassName('app-dock-bar', 'slot');
  const itemClass = stableClassName('app-dock-bar', 'item');
  const glyphClass = stableClassName('app-dock-bar', 'glyph');
  const attentionGlyphClass = stableClassName('app-dock-bar', 'attention-glyph');
  const badgeClass = stableClassName('app-dock-bar', 'badge');
  const runningDotClass = stableClassName('app-dock-bar', 'running-dot');
  const tooltipClass = stableClassName('app-dock-bar', 'tooltip');
  const emptyClass = stableClassName('app-dock-bar', 'empty');

  const transformOrigin = getTransformOrigin(position);

  const trayLayoutClass =
    position === 'left'
      ? 'flex flex-col items-start gap-2 sm:gap-2.5 overflow-y-auto max-w-full min-w-0 py-2 pl-1 pr-3'
      : position === 'right'
        ? 'flex flex-col items-end gap-2 sm:gap-2.5 overflow-y-auto max-w-full min-w-0 py-2 pl-3 pr-1'
        : 'flex flex-row items-end gap-2 sm:gap-2.5 overflow-x-auto max-w-full min-w-0 px-2 pt-3 pb-1';

  const tooltipPositionStyle: CSSProperties | undefined = spotlightEntry
    ? isVertical
      ? {
          top: `${((spotlightEntry.index + 0.5) / normalizedItems.length) * 100}%`,
          transform: 'translateY(-50%)',
        }
      : {
          left: `${((spotlightEntry.index + 0.5) / normalizedItems.length) * 100}%`,
          transform: 'translateX(-50%)',
        }
    : undefined;

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={resolvedAriaLabel}
      aria-orientation={isVertical ? 'vertical' : 'horizontal'}
      {...rest}
      {...merged}
      onMouseLeave={handleMouseLeave}
      onBlur={handleBlur}
    >
      <style>{DOCK_KEYFRAMES_CSS}</style>

      {isEmpty ? (
        <div
          role="status"
          data-testid="app-dock-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-full px-4 py-2 min-w-0 max-w-full inline-flex items-center justify-center gap-2 text-xs font-medium'
          )}
          style={STYLE_TEXT_SECONDARY}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--prism-text-disabled)' }}
          />
          <span className="truncate">No pinned applications in dock.</span>
        </div>
      ) : (
        <>
          {spotlightEntry && tooltipPositionStyle ? (
            <div
              id={tooltipId}
              role="tooltip"
              data-testid="app-dock-tooltip"
              data-item-id={spotlightEntry.id}
              data-position={position}
              className={cx(
                tooltipClass,
                getTooltipEdgeClass(position),
                'prism-crystal pointer-events-none select-none absolute z-30 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-md'
              )}
              style={{
                ...tooltipPositionStyle,
                color: 'var(--prism-text-primary)',
              }}
            >
              {spotlightEntry.label}
            </div>
          ) : null}

          <div
            data-testid="app-dock-tray"
            className={cx(trayClass, trayLayoutClass)}
          >
            {normalizedItems.map((entry) => {
              const isActive =
                !entry.disabled &&
                currentActiveId !== null &&
                entry.id === currentActiveId;
              const hasAttention = entry.attention && !entry.disabled;
              const showRunningDot = entry.running || isActive;
              const isSpotlight = spotlightIndex === entry.index;
              const scale = getDockItemScale(
                entry.index,
                spotlightIndex,
                magnification,
                entry.disabled
              );
              const accentVar = getToneAccentVar(entry.tone);

              const slotDirectionClass =
                position === 'left'
                  ? 'flex-row-reverse items-center gap-1.5'
                  : position === 'right'
                    ? 'flex-row items-center gap-1.5'
                    : 'flex-col items-center gap-1.5';

              const dotContainerClass = isVertical
                ? 'w-1.5 h-3.5 inline-flex items-center justify-center shrink-0'
                : 'h-1.5 w-3.5 inline-flex items-center justify-center shrink-0';

              const dotSizeClass = isVertical
                ? isActive
                  ? 'w-1 h-3'
                  : 'w-1.5 h-1.5'
                : isActive
                  ? 'w-3 h-1'
                  : 'w-1.5 h-1.5';

              return (
                <div
                  key={entry.key}
                  data-testid={`app-dock-slot-${entry.index}`}
                  className={cx(slotClass, 'inline-flex shrink-0', slotDirectionClass)}
                >
                  <button
                    ref={(el) => {
                      if (el) {
                        buttonRefs.current.set(entry.key, el);
                      } else {
                        buttonRefs.current.delete(entry.key);
                      }
                    }}
                    type="button"
                    disabled={entry.disabled}
                    tabIndex={
                      entry.disabled
                        ? undefined
                        : rovingFocusKey === entry.key
                          ? 0
                          : -1
                    }
                    aria-label={buildAccessibleItemLabel(entry, isActive)}
                    aria-pressed={isActive}
                    aria-describedby={isSpotlight ? tooltipId : undefined}
                    data-testid={`app-dock-item-${entry.index}`}
                    data-item-id={entry.id}
                    data-tone={entry.tone}
                    data-active={isActive ? 'true' : undefined}
                    data-running={showRunningDot ? 'true' : undefined}
                    data-attention={hasAttention ? 'true' : undefined}
                    data-scale={scale.toFixed(2)}
                    onClick={
                      entry.disabled ? undefined : () => handleLaunch(entry)
                    }
                    onKeyDown={
                      entry.disabled
                        ? undefined
                        : (event) => handleItemKeyDown(event, entry)
                    }
                    onMouseEnter={
                      entry.disabled
                        ? undefined
                        : () => setHoveredIndex(entry.index)
                    }
                    onFocus={
                      entry.disabled
                        ? undefined
                        : () => setFocusedIndex(entry.index)
                    }
                    className={cx(
                      itemClass,
                      'prism-crystal prism-focus-ring relative w-11 h-11 sm:w-12 sm:h-12 rounded-2xl inline-flex items-center justify-center shrink-0 transition-transform duration-150 ease-out will-change-transform cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed'
                    )}
                    style={{
                      transform: `scale(${scale})`,
                      transformOrigin,
                      color: accentVar,
                      borderWidth: isActive ? '1.5px' : '1px',
                      borderStyle: 'solid',
                      borderColor: isActive
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-divider)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      data-testid={`app-dock-glyph-${entry.index}`}
                      className={cx(
                        glyphClass,
                        hasAttention && attentionGlyphClass,
                        'inline-flex items-center justify-center'
                      )}
                      style={
                        hasAttention
                          ? {
                              animation:
                                'refractor-dock-attention 1.4s ease-in-out infinite',
                            }
                          : undefined
                      }
                    >
                      {entry.icon}
                    </span>

                    {entry.badgeText !== null ? (
                      <span
                        aria-hidden="true"
                        data-testid={`app-dock-badge-${entry.index}`}
                        className={cx(
                          badgeClass,
                          'pointer-events-none absolute -top-1.5 -right-1.5 z-20 min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center text-[10px] font-mono font-bold tabular-nums leading-none shadow-sm'
                        )}
                        style={{
                          backgroundColor: 'var(--prism-error-main)',
                          color: 'var(--prism-error-contrast)',
                        }}
                      >
                        {entry.badgeText}
                      </span>
                    ) : null}
                  </button>

                  <span aria-hidden="true" className={dotContainerClass}>
                    {showRunningDot ? (
                      <span
                        data-testid={`app-dock-running-dot-${entry.index}`}
                        data-active={isActive ? 'true' : undefined}
                        className={cx(
                          runningDotClass,
                          dotSizeClass,
                          'rounded-full transition-[color,background-color,border-color,opacity,transform] duration-150'
                        )}
                        style={{
                          backgroundColor: 'var(--prism-primary-main)',
                          boxShadow: isActive
                            ? '0 0 8px var(--prism-primary-main)'
                            : '0 0 4px var(--prism-primary-main)',
                        }}
                      />
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export const AppDockBar = memo(AppDockBarInner);
AppDockBar.displayName = 'AppDockBar';
