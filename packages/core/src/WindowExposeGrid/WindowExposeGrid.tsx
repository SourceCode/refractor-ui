'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AppWindow,
  Layers,
  LayoutGrid,
  Monitor,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_DIVIDER, STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ExposeWindowTone = 'primary' | 'info' | 'emerald' | 'amber' | 'rose';

export interface ExposeWindowCard {
  /** Unique window identifier (duplicate IDs are deduplicated safely via Set). */
  id: string;
  /** Application name used for tagging, filtering, and prototype-safe Map grouping. */
  appName: string;
  /** Window document or session title rendered strictly as literal text. */
  title: string;
  /** Desktop workspace label where this window resides. */
  workspaceName: string;
  /** Semantic optical tone driving preview tinting and focus ring accents. */
  tone?: ExposeWindowTone;
  /** Marks the currently focused window card. */
  active?: boolean;
}

type WindowExposeGridBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface WindowExposeGridProps extends WindowExposeGridBaseProps {
  /** Visible heading linked via `aria-labelledby` (defaults to `'Window Exposé'`). */
  title?: string;
  /** Controlled collection of open windows to spread across the spatial grid. */
  windows?: ReadonlyArray<ExposeWindowCard>;
  /** Initial uncontrolled collection of open windows (defaults to 6 realistic desktop windows across 4 apps and 2 workspaces). */
  defaultWindows?: ReadonlyArray<ExposeWindowCard>;
  /** Callback invoked when a user focuses a window thumbnail via click, Enter, or Space. */
  onFocusWindow?: (windowCard: ExposeWindowCard) => void;
  /** Callback invoked with the window ID when a user activates a window's Close control. */
  onCloseWindow?: (windowId: string) => void;
  /** Disables window focusing, closing, search filtering, app pills, and Group by App toggling. */
  disabled?: boolean;
}

interface WindowToneVisuals {
  readonly accent: string;
  readonly light: string;
  readonly tintBg: string;
  readonly tintBorder: string;
  readonly activeRing: string;
}

interface PreviewBarWidths {
  readonly primaryWidth: number;
  readonly secondaryWidth: number;
  readonly tertiaryWidth: number;
}

interface AppWindowGroup {
  readonly appName: string;
  readonly items: ReadonlyArray<ExposeWindowCard>;
}

const DEFAULT_TITLE = 'Window Exposé';
const FALLBACK_APP_NAME = 'Untitled App';
const FALLBACK_WINDOW_TITLE = 'Untitled Window';
const FALLBACK_WORKSPACE_NAME = 'Workspace';

const DEFAULT_EXPOSE_WINDOWS: ReadonlyArray<ExposeWindowCard> = [
  {
    id: 'win-ide-core',
    appName: 'Refractor IDE',
    title: 'WindowExposeGrid.tsx — packages/core',
    workspaceName: 'Workspace 1 · Dev',
    tone: 'primary',
    active: true,
  },
  {
    id: 'win-ide-tokens',
    appName: 'Refractor IDE',
    title: 'refractor.css — Optical Tokens',
    workspaceName: 'Workspace 1 · Dev',
    tone: 'info',
  },
  {
    id: 'win-studio-caustics',
    appName: 'Optical Studio',
    title: 'Glass Caustics Spec — v1.41',
    workspaceName: 'Workspace 2 · Design',
    tone: 'amber',
  },
  {
    id: 'win-studio-palette',
    appName: 'Optical Studio',
    title: 'Refraction Palette Inspector',
    workspaceName: 'Workspace 2 · Design',
    tone: 'rose',
  },
  {
    id: 'win-terminal-tests',
    appName: 'Terminal',
    title: 'pnpm test:coverage — vitest',
    workspaceName: 'Workspace 1 · Dev',
    tone: 'emerald',
  },
  {
    id: 'win-docs-tiling',
    appName: 'Documentation Browser',
    title: 'Window Management & Desktop Tiling',
    workspaceName: 'Workspace 2 · Design',
    tone: 'info',
  },
];

function getToneVisuals(tone?: ExposeWindowTone): WindowToneVisuals {
  switch (tone) {
    case 'info':
      return {
        accent: 'var(--prism-info-main)',
        light: 'var(--prism-info-light)',
        tintBg: 'color-mix(in srgb, var(--prism-info-main) 14%, transparent)',
        tintBorder: 'color-mix(in srgb, var(--prism-info-main) 38%, transparent)',
        activeRing: 'color-mix(in srgb, var(--prism-info-main) 54%, transparent)',
      };
    case 'emerald':
      return {
        accent: 'var(--prism-success-main)',
        light: 'var(--prism-success-light)',
        tintBg: 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)',
        tintBorder: 'color-mix(in srgb, var(--prism-success-main) 38%, transparent)',
        activeRing: 'color-mix(in srgb, var(--prism-success-main) 54%, transparent)',
      };
    case 'amber':
      return {
        accent: 'var(--prism-warning-main)',
        light: 'var(--prism-primary-light)',
        tintBg: 'color-mix(in srgb, var(--prism-warning-main) 16%, transparent)',
        tintBorder: 'color-mix(in srgb, var(--prism-warning-main) 42%, transparent)',
        activeRing: 'color-mix(in srgb, var(--prism-warning-main) 54%, transparent)',
      };
    case 'rose':
      return {
        accent: 'var(--prism-error-main)',
        light: 'var(--prism-warning-main)',
        tintBg: 'color-mix(in srgb, var(--prism-error-main) 14%, transparent)',
        tintBorder: 'color-mix(in srgb, var(--prism-error-main) 38%, transparent)',
        activeRing: 'color-mix(in srgb, var(--prism-error-main) 54%, transparent)',
      };
    case 'primary':
    default:
      return {
        accent: 'var(--prism-primary-main)',
        light: 'var(--prism-primary-light)',
        tintBg: 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
        tintBorder: 'color-mix(in srgb, var(--prism-primary-main) 38%, transparent)',
        activeRing: 'color-mix(in srgb, var(--prism-primary-main) 54%, transparent)',
      };
  }
}

function resolveAppLabel(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_APP_NAME;
}

function resolveWindowTitle(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_WINDOW_TITLE;
}

function resolveWorkspaceLabel(raw: string): string {
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_WORKSPACE_NAME;
}

function deduplicateWindows(list: ReadonlyArray<ExposeWindowCard>): ExposeWindowCard[] {
  const seen = new Set<string>();
  const unique: ExposeWindowCard[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      unique.push(item);
    }
  }
  return unique;
}

function collectUniqueApps(list: ReadonlyArray<ExposeWindowCard>): ReadonlyArray<string> {
  const uniqueApps = new Set<string>();
  for (const item of list) {
    uniqueApps.add(resolveAppLabel(item.appName));
  }
  return Array.from(uniqueApps);
}

function matchesLinearSearch(card: ExposeWindowCard, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  return (
    card.title.toLowerCase().includes(normalizedQuery) ||
    card.appName.toLowerCase().includes(normalizedQuery) ||
    card.workspaceName.toLowerCase().includes(normalizedQuery)
  );
}

function groupWindowsByApp(list: ReadonlyArray<ExposeWindowCard>): ReadonlyArray<AppWindowGroup> {
  const buckets = new Map<string, ExposeWindowCard[]>();
  for (const item of list) {
    const appLabel = resolveAppLabel(item.appName);
    const existing = buckets.get(appLabel);
    if (existing) {
      existing.push(item);
    } else {
      buckets.set(appLabel, [item]);
    }
  }
  return Array.from(buckets.entries()).map(([appName, items]) => ({
    appName,
    items,
  }));
}

function computePreviewBars(id: string): PreviewBarWidths {
  let seed = 0;
  for (let index = 0; index < id.length; index += 1) {
    seed = (seed + id.charCodeAt(index) * (index + 1)) % 97;
  }
  return {
    primaryWidth: 46 + (seed % 32),
    secondaryWidth: 58 + ((seed * 3) % 30),
    tertiaryWidth: 36 + ((seed * 5) % 40),
  };
}

function WindowExposeGridInner({
  title = DEFAULT_TITLE,
  windows,
  defaultWindows,
  onFocusWindow,
  onCloseWindow,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': nativeAriaLabel,
  ref,
  ...rest
}: WindowExposeGridProps) {
  const override = useComponentOverride('WindowExposeGrid');
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const searchInputId = `${baseId}-search`;

  const isControlled = windows !== undefined;
  const [uncontrolledWindows, setUncontrolledWindows] = useState<ExposeWindowCard[]>(() =>
    deduplicateWindows(defaultWindows !== undefined ? defaultWindows : DEFAULT_EXPOSE_WINDOWS)
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [groupByApp, setGroupByApp] = useState<boolean>(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>('');

  const openWindows = useMemo<ReadonlyArray<ExposeWindowCard>>(
    () => (isControlled ? deduplicateWindows(windows) : uncontrolledWindows),
    [isControlled, uncontrolledWindows, windows]
  );

  const availableApps = useMemo(() => collectUniqueApps(openWindows), [openWindows]);
  const availableAppSet = useMemo(() => new Set(availableApps), [availableApps]);
  const effectiveSelectedApp =
    selectedApp !== null && availableAppSet.has(selectedApp) ? selectedApp : null;

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredWindows = useMemo<ReadonlyArray<ExposeWindowCard>>(
    () =>
      openWindows.filter((card) => {
        if (effectiveSelectedApp !== null && resolveAppLabel(card.appName) !== effectiveSelectedApp) {
          return false;
        }
        return matchesLinearSearch(card, normalizedQuery);
      }),
    [effectiveSelectedApp, normalizedQuery, openWindows]
  );

  const groupedWindows = useMemo<ReadonlyArray<AppWindowGroup>>(
    () => (groupByApp ? groupWindowsByApp(filteredWindows) : []),
    [filteredWindows, groupByApp]
  );

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const resolvedAriaLabel = nativeAriaLabel?.trim() || undefined;
  const hasActiveFilters = searchQuery.length > 0 || effectiveSelectedApp !== null;
  const isEmpty = filteredWindows.length === 0;

  const handleFocusWindow = useCallback(
    (card: ExposeWindowCard) => {
      if (!isControlled) {
        setUncontrolledWindows((prev) =>
          prev.map((item) => ({
            ...item,
            active: item.id === card.id,
          }))
        );
      }
      setStatusAnnouncement(
        `Focused ${resolveWindowTitle(card.title)} (${resolveAppLabel(card.appName)} · ${resolveWorkspaceLabel(card.workspaceName)}).`
      );
      onFocusWindow?.(card);
    },
    [isControlled, onFocusWindow]
  );

  const handleCloseWindow = useCallback(
    (card: ExposeWindowCard) => {
      if (!isControlled) {
        setUncontrolledWindows((prev) => prev.filter((item) => item.id !== card.id));
      }
      setStatusAnnouncement(
        `Closed ${resolveWindowTitle(card.title)} (${resolveAppLabel(card.appName)}).`
      );
      onCloseWindow?.(card.id);
    },
    [isControlled, onCloseWindow]
  );

  const handleCardKeyDown = useCallback(
    (card: ExposeWindowCard, event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleFocusWindow(card);
      }
    },
    [disabled, handleFocusWindow]
  );

  const handleSearchChange = useCallback(
    (nextValue: string) => {
      if (disabled) {
        return;
      }
      setSearchQuery(nextValue);
    },
    [disabled]
  );

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape' && searchQuery.length > 0) {
        event.preventDefault();
        setSearchQuery('');
        setStatusAnnouncement('Cleared window search filter.');
      }
    },
    [disabled, searchQuery.length]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setStatusAnnouncement('Cleared window search filter.');
  }, []);

  const handleSelectApp = useCallback(
    (appName: string | null) => {
      const nextApp = appName !== null && effectiveSelectedApp === appName ? null : appName;
      setSelectedApp(nextApp);
      setStatusAnnouncement(
        nextApp === null
          ? 'Showing windows from all applications.'
          : `Filtered to ${nextApp} windows.`
      );
    },
    [effectiveSelectedApp]
  );

  const handleToggleGroupByApp = useCallback(() => {
    const nextGrouped = !groupByApp;
    setGroupByApp(nextGrouped);
    setStatusAnnouncement(
      nextGrouped
        ? 'Grouped open windows by application.'
        : 'Showing ungrouped spatial window grid.'
    );
  }, [groupByApp]);

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedApp(null);
    setStatusAnnouncement('Cleared window search and application filters.');
  }, []);

  const merged = mergeProps({
    themeTarget: themeProps('window-expose-grid', {
      grouped: groupByApp,
      filtered: hasActiveFilters,
      empty: isEmpty,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-4',
      disabled && 'opacity-75'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('window-expose-grid', 'header');
  const controlsClass = stableClassName('window-expose-grid', 'controls');
  const filtersClass = stableClassName('window-expose-grid', 'filters');
  const gridClass = stableClassName('window-expose-grid', 'grid');
  const groupClass = stableClassName('window-expose-grid', 'group');
  const cardClass = stableClassName('window-expose-grid', 'card');
  const previewClass = stableClassName('window-expose-grid', 'preview');
  const emptyClass = stableClassName('window-expose-grid', 'empty');
  const statusClass = stableClassName('window-expose-grid', 'status');

  const countLabel = `Showing ${filteredWindows.length} of ${openWindows.length} windows`;
  const liveStatusText = statusAnnouncement || countLabel;

  const renderWindowCard = (card: ExposeWindowCard) => {
    const isActive = Boolean(card.active);
    const cardTitle = resolveWindowTitle(card.title);
    const appLabel = resolveAppLabel(card.appName);
    const workspaceLabel = resolveWorkspaceLabel(card.workspaceName);
    const tone: ExposeWindowTone = card.tone ?? 'primary';
    const visuals = getToneVisuals(tone);
    const bars = computePreviewBars(card.id);

    return (
      <article
        key={card.id}
        data-testid={`expose-window-card-${card.id}`}
        data-window-id={card.id}
        data-tone={tone}
        data-active={isActive ? 'true' : undefined}
        className={cx(
          cardClass,
          'prism-crystal rounded-2xl overflow-hidden flex flex-col min-w-0 border transition-[color,background-color,border-color,opacity,transform]'
        )}
        style={{
          borderColor: isActive ? visuals.accent : 'var(--prism-divider)',
          boxShadow: isActive ? `0 0 0 2px ${visuals.activeRing}` : undefined,
        }}
      >
        {/* Miniature Window Chrome Strip + Accessible Close Action */}
        <div
          className="flex items-center justify-between gap-2 px-3 py-2 border-b min-w-0"
          style={{
            borderColor: 'var(--prism-divider)',
            backgroundColor: 'color-mix(in srgb, var(--prism-crystal-top) 70%, transparent)',
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={STYLE_BG_ERROR}
            />
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={STYLE_BG_WARNING}
            />
            <span
              aria-hidden="true"
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={STYLE_BG_SUCCESS}
            />
            {isActive ? (
              <span
                data-testid={`expose-window-active-pill-${card.id}`}
                className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide border shrink-0"
                style={{
                  color: visuals.accent,
                  backgroundColor: visuals.tintBg,
                  borderColor: visuals.tintBorder,
                }}
              >
                Active
              </span>
            ) : null}
          </div>

          <button
            type="button"
            disabled={disabled}
            aria-label={`Close ${cardTitle}`}
            data-testid={`expose-window-close-${card.id}`}
            onClick={() => handleCloseWindow(card)}
            className="prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 transition-opacity"
            style={{
              color: 'var(--prism-text-secondary)',
              backgroundColor: 'color-mix(in srgb, var(--prism-well-start) 78%, transparent)',
            }}
          >
            <X aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Focusable Spatial Window Thumbnail Surface */}
        <button
          type="button"
          disabled={disabled}
          aria-pressed={isActive}
          data-active={isActive ? 'true' : undefined}
          data-testid={`expose-window-focus-${card.id}`}
          onClick={() => handleFocusWindow(card)}
          onKeyDown={(event) => handleCardKeyDown(card, event)}
          className="prism-focus-ring flex-1 w-full min-w-0 p-3 text-left flex flex-col gap-3 cursor-pointer disabled:cursor-not-allowed transition-transform enabled:hover:-translate-y-0.5"
        >
          {/* Procedural Miniature Glass UI Preview */}
          <div
            aria-hidden="true"
            data-testid={`expose-window-preview-${card.id}`}
            className={cx(
              previewClass,
              'prism-well rounded-xl h-24 w-full p-2.5 flex gap-2 overflow-hidden border'
            )}
            style={{ borderColor: visuals.tintBorder }}
          >
            <div
              className="w-[26%] rounded-lg p-1.5 flex flex-col gap-1.5 shrink-0"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--prism-crystal-top) 74%, transparent)',
              }}
            >
              <span
                className="h-1.5 w-full rounded-full"
                style={{ backgroundColor: visuals.accent }}
              />
              <span
                className="h-1.5 w-4/5 rounded-full"
                style={STYLE_BG_DIVIDER}
              />
              <span
                className="h-1.5 w-3/5 rounded-full"
                style={STYLE_BG_DIVIDER}
              />
            </div>

            <div
              className="flex-1 min-w-0 rounded-lg p-2 flex flex-col justify-between gap-1.5"
              style={{
                backgroundImage: `linear-gradient(145deg, ${visuals.tintBg} 0%, transparent 100%)`,
              }}
            >
              <span
                className="h-2 rounded-full"
                style={{
                  width: `${bars.primaryWidth}%`,
                  backgroundColor: visuals.accent,
                }}
              />
              <div className="flex flex-col gap-1.5">
                <span
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${bars.secondaryWidth}%`,
                    backgroundColor: visuals.tintBorder,
                  }}
                />
                <span
                  className="h-1.5 rounded-full"
                  style={{
                    width: `${bars.tertiaryWidth}%`,
                    backgroundColor: 'var(--prism-divider)',
                  }}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-10 rounded-full"
                  style={{ backgroundColor: visuals.tintBorder }}
                />
                <span
                  className="h-2 w-6 rounded-full opacity-70"
                  style={{ backgroundColor: visuals.light }}
                />
              </div>
            </div>
          </div>

          {/* Bold Title + App & Workspace Metadata Pills */}
          <div className="flex flex-col gap-2 min-w-0 w-full">
            <span
              className="text-sm font-bold leading-snug truncate w-full"
              style={STYLE_TEXT_PRIMARY}
            >
              {cardTitle}
            </span>

            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border max-w-full min-w-0"
                style={{
                  color: visuals.accent,
                  backgroundColor: visuals.tintBg,
                  borderColor: visuals.tintBorder,
                }}
              >
                <AppWindow aria-hidden="true" className="w-3 h-3 shrink-0" />
                <span className="truncate">{appLabel}</span>
              </span>

              <span
                className="prism-well inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium max-w-full min-w-0"
                style={STYLE_TEXT_SECONDARY}
              >
                <Monitor aria-hidden="true" className="w-3 h-3 shrink-0" />
                <span className="truncate">{workspaceLabel}</span>
              </span>
            </div>
          </div>
        </button>
      </article>
    );
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      aria-labelledby={resolvedAriaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Top Exposé Header: Title, Live Window Count Pill, Group by App Toggle */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-3 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: disabled ? 'var(--prism-text-disabled)' : 'var(--prism-primary-main)',
            }}
          >
            <LayoutGrid className="w-4 h-4" />
          </span>

          <h2
            id={headingId}
            className="m-0 text-sm font-semibold tracking-[-0.01em] truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h2>

          <span
            data-testid="window-expose-count"
            data-visible-count={String(filteredWindows.length)}
            data-total-count={String(openWindows.length)}
            className="prism-well px-2.5 py-1 rounded-full font-mono text-[11px] font-medium tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {countLabel}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={groupByApp}
            data-testid="window-expose-group-toggle"
            onClick={handleToggleGroupByApp}
            className={cx(
              'prism-focus-ring h-8 px-3 rounded-full border inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              groupByApp ? 'prism-crystal' : 'prism-well'
            )}
            style={{
              color: groupByApp ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
              borderColor: groupByApp
                ? 'color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider))'
                : 'var(--prism-divider)',
            }}
          >
            <Layers aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Group by App</span>
          </button>
        </div>
      </div>

      {/* Search Well + Dynamic Application Filter Pills */}
      <div className={cx(controlsClass, 'flex flex-col gap-2.5 min-w-0 max-w-full')}>
        <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
          <div className="prism-well flex-1 min-w-[200px] h-10 rounded-2xl px-3 flex items-center gap-2">
            <Search
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <label htmlFor={searchInputId} className="sr-only">
              Filter open windows
            </label>
            <input
              id={searchInputId}
              type="search"
              aria-label="Filter open windows"
              value={searchQuery}
              placeholder="Filter by title, app, or workspace..."
              disabled={disabled}
              onChange={(event) => handleSearchChange(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="prism-focus-ring w-full min-w-0 bg-transparent text-xs sm:text-sm rounded-lg disabled:cursor-not-allowed disabled:opacity-60"
              style={STYLE_TEXT_PRIMARY}
            />
            {searchQuery.length > 0 ? (
              <button
                type="button"
                disabled={disabled}
                aria-label="Clear search"
                data-testid="window-expose-clear-search"
                onClick={handleClearSearch}
                className="prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>

        {/* Dynamic App Filter Pills */}
        <div
          role="group"
          aria-label="Filter by application"
          data-testid="window-expose-app-filters"
          className={cx(filtersClass, 'flex flex-wrap items-center gap-2 min-w-0 max-w-full')}
        >
          <button
            type="button"
            disabled={disabled}
            aria-pressed={effectiveSelectedApp === null}
            data-testid="window-expose-filter-all"
            onClick={() => handleSelectApp(null)}
            className={cx(
              'prism-focus-ring h-7 px-3 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
              effectiveSelectedApp === null ? 'prism-crystal' : 'prism-well'
            )}
            style={{
              color:
                effectiveSelectedApp === null
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
              borderColor:
                effectiveSelectedApp === null
                  ? 'color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider))'
                  : 'var(--prism-divider)',
            }}
          >
            All Apps
          </button>

          {availableApps.map((appName) => {
            const isSelected = effectiveSelectedApp === appName;
            return (
              <button
                key={appName}
                type="button"
                disabled={disabled}
                aria-pressed={isSelected}
                data-app-filter={appName}
                onClick={() => handleSelectApp(appName)}
                className={cx(
                  'prism-focus-ring h-7 px-3 rounded-full border text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors max-w-full truncate',
                  isSelected ? 'prism-crystal' : 'prism-well'
                )}
                style={{
                  color: isSelected
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-text-secondary)',
                  borderColor: isSelected
                    ? 'color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider))'
                    : 'var(--prism-divider)',
                }}
              >
                {appName}
              </button>
            );
          })}
        </div>
      </div>

      {/* Non-Overlapping Spatial Window Grid or Clean Empty State */}
      {isEmpty ? (
        <div
          role="status"
          data-testid="window-expose-empty"
          className={cx(
            emptyClass,
            'prism-well rounded-2xl px-4 py-10 text-center flex flex-col items-center justify-center gap-2 min-w-0'
          )}
        >
          <span
            aria-hidden="true"
            className="prism-crystal w-10 h-10 rounded-2xl inline-flex items-center justify-center"
            style={STYLE_TEXT_SECONDARY}
          >
            <LayoutGrid className="w-5 h-5" />
          </span>
          <p
            className="m-0 text-sm font-semibold"
            style={STYLE_TEXT_PRIMARY}
          >
            {openWindows.length === 0 ? 'No open windows' : 'No matching windows'}
          </p>
          <p className="m-0 text-xs max-w-md" style={STYLE_TEXT_SECONDARY}>
            {openWindows.length === 0
              ? 'All application windows have been closed in this workspace overview.'
              : 'No open windows match the active search query or application filter.'}
          </p>
          {openWindows.length > 0 && hasActiveFilters ? (
            <button
              type="button"
              disabled={disabled}
              data-testid="window-expose-reset-filters"
              onClick={handleResetFilters}
              className="prism-btn-secondary prism-focus-ring mt-2 h-8 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Reset Filters</span>
            </button>
          ) : null}
        </div>
      ) : groupByApp ? (
        <div
          data-testid="window-expose-grouped-container"
          className="flex flex-col gap-5 min-w-0 max-w-full"
        >
          {groupedWindows.map((group) => (
            <section
              key={group.appName}
              aria-label={`${group.appName} windows`}
              data-testid={`expose-app-group-${group.appName}`}
              data-app-group={group.appName}
              className={cx(groupClass, 'flex flex-col gap-3 min-w-0 max-w-full')}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <AppWindow
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0"
                    style={STYLE_PRIMARY_MAIN}
                  />
                  <h3
                    className="m-0 text-xs font-semibold uppercase tracking-wide truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {group.appName}
                  </h3>
                </div>
                <span
                  className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] tabular-nums shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {group.items.length}
                </span>
              </div>

              <div
                className={cx(
                  gridClass,
                  'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0'
                )}
              >
                {group.items.map((card) => renderWindowCard(card))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div
          data-testid="window-expose-grid"
          className={cx(
            gridClass,
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 min-w-0'
          )}
        >
          {filteredWindows.map((card) => renderWindowCard(card))}
        </div>
      )}

      {/* Polite Status Announcement Footer */}
      <p
        aria-live="polite"
        aria-atomic="true"
        data-testid="window-expose-live-status"
        className={cx(statusClass, 'm-0 text-xs truncate min-w-0')}
        style={STYLE_TEXT_SECONDARY}
      >
        {liveStatusText}
      </p>
    </div>
  );
}

export const WindowExposeGrid = memo(WindowExposeGridInner);
WindowExposeGrid.displayName = 'WindowExposeGrid';
