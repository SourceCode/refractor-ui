'use client';

import {
  useCallback,
  useId,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Activity,
  Check,
  Clock,
  LayoutGrid,
  Lock,
  Pin,
  PinOff,
  RefreshCw,
  SlidersHorizontal,
  StickyNote,
  Sun,
  Trash2,
  Unlock,
  Wind,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type DesktopWidgetSize = 'sm' | 'md' | 'lg';
export type DesktopWidgetKind =
  | 'telemetry'
  | 'weather'
  | 'notes'
  | 'clock'
  | 'custom';
export type DesktopWidgetTone = 'primary' | 'info' | 'success' | 'warning';
export type DesktopWidgetRefreshInterval = 0 | 15 | 60 | 300;

export interface DesktopWidgetConfig {
  /** Resolved widget title displayed in the top chrome bar. */
  title: string;
  /** Responsive desktop grid footprint (`sm` 1×1, `md` 2×1, `lg` 2×2). */
  size: DesktopWidgetSize;
  /** Semantic optical accent tone token. */
  tone: DesktopWidgetTone;
  /** Auto-refresh cadence in seconds (`0` for Manual, `15`, `60`, or `300`). */
  refreshSeconds: DesktopWidgetRefreshInterval;
  /** Position lock flag preventing resize, unpinning, and accidental removal. */
  locked: boolean;
  /** Desktop pin flag keeping the widget anchored to the desktop layer. */
  pinned: boolean;
}

type DesktopWidgetFrameBaseProps = Omit<
  BaseProps<HTMLDivElement>,
  'title' | 'onChange'
>;

export interface DesktopWidgetFrameProps extends DesktopWidgetFrameBaseProps {
  /** Built-in sample view or custom body slot (`'telemetry' | 'weather' | 'notes' | 'clock' | 'custom'`). Defaults to `'telemetry'`. */
  kind?: DesktopWidgetKind;
  /** Controlled widget title. */
  title?: string;
  /** Initial uncontrolled widget title (defaults to canonical title for `kind`). */
  defaultTitle?: string;
  /** Controlled responsive grid size preset (`'sm' | 'md' | 'lg'`). */
  size?: DesktopWidgetSize;
  /** Initial uncontrolled grid size preset (defaults to `'md'`). */
  defaultSize?: DesktopWidgetSize;
  /** Controlled semantic accent tone (`'primary' | 'info' | 'success' | 'warning'`). */
  tone?: DesktopWidgetTone;
  /** Initial uncontrolled accent tone (defaults to `'primary'`). */
  defaultTone?: DesktopWidgetTone;
  /** Controlled lock state guarding against resize, unpinning, and removal. */
  locked?: boolean;
  /** Initial uncontrolled lock state (defaults to `false`). */
  defaultLocked?: boolean;
  /** Controlled desktop pin state. */
  pinned?: boolean;
  /** Initial uncontrolled desktop pin state (defaults to `true`). */
  defaultPinned?: boolean;
  /** Controlled refresh interval in seconds (`0 | 15 | 60 | 300`). */
  refreshSeconds?: DesktopWidgetRefreshInterval;
  /** Initial uncontrolled refresh interval in seconds (defaults to `60`). */
  defaultRefreshSeconds?: DesktopWidgetRefreshInterval;
  /** Deterministic last-updated timestamp label shown in the footer metadata strip (defaults to `'Just now'`). */
  lastUpdatedLabel?: string;
  /** Callback fired when the widget size preset changes. */
  onSizeChange?: (size: DesktopWidgetSize) => void;
  /** Callback fired when widget configuration commits via `Done`, pin toggle, or lock toggle. */
  onConfigChange?: (config: DesktopWidgetConfig) => void;
  /** Callback fired whenever the `Refresh` action is triggered. */
  onRefresh?: () => void;
  /** Callback fired only after the user confirms the two-step inline removal guard. */
  onRemove?: () => void;
  /** Rendered directly inside the optical body when `kind="custom"`, or as optional supplementary content for built-in kinds. */
  children?: ReactNode;
  /** Disables all interactive chrome, configuration controls, and sticky-note editing. */
  disabled?: boolean;
}

interface TelemetryMetricSpec {
  id: string;
  label: string;
  readout: string;
  pct: number;
  toneVar: string;
}

interface ForecastSlotSpec {
  id: string;
  hour: string;
  temp: string;
  condition: string;
}

interface ClockZoneSpec {
  id: string;
  code: string;
  time: string;
}

interface SizeOptionSpec {
  value: DesktopWidgetSize;
  shortLabel: string;
  fullLabel: string;
}

interface ToneOptionSpec {
  value: DesktopWidgetTone;
  label: string;
}

interface RefreshOptionSpec {
  value: DesktopWidgetRefreshInterval;
  label: string;
}

const MAX_TITLE_LENGTH = 64;
const MAX_NOTE_LENGTH = 280;
const DEFAULT_LAST_UPDATED_LABEL = 'Just now';
const DEFAULT_NOTE_TEXT =
  'Verify optical slab refraction across Alabaster and Obsidian themes before shipping.';

const SIZE_OPTIONS: ReadonlyArray<SizeOptionSpec> = [
  { value: 'sm', shortLabel: '1×1', fullLabel: 'Small 1×1' },
  { value: 'md', shortLabel: '2×1', fullLabel: 'Medium 2×1' },
  { value: 'lg', shortLabel: '2×2', fullLabel: 'Large 2×2' },
];

const TONE_OPTIONS: ReadonlyArray<ToneOptionSpec> = [
  { value: 'primary', label: 'Primary' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Success' },
  { value: 'warning', label: 'Warning' },
];

const REFRESH_OPTIONS: ReadonlyArray<RefreshOptionSpec> = [
  { value: 0, label: 'Manual' },
  { value: 15, label: '15s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
];

const WEATHER_FORECAST: ReadonlyArray<ForecastSlotSpec> = [
  { id: 'slot-15', hour: '15:00', temp: '69°', condition: 'Clear' },
  { id: 'slot-16', hour: '16:00', temp: '68°', condition: 'Clear' },
  { id: 'slot-17', hour: '17:00', temp: '65°', condition: 'Breezy' },
];

const CLOCK_ZONES: ReadonlyArray<ClockZoneSpec> = [
  { id: 'zone-sfo', code: 'SFO', time: '06:28' },
  { id: 'zone-nyc', code: 'NYC', time: '09:28' },
  { id: 'zone-tyo', code: 'TYO', time: '23:28' },
];

function getDefaultKindTitle(kind: DesktopWidgetKind): string {
  switch (kind) {
    case 'telemetry':
      return 'System Telemetry';
    case 'weather':
      return 'Local Weather';
    case 'notes':
      return 'Sticky Notes';
    case 'clock':
      return 'Studio Clock';
    case 'custom':
      return 'Desktop Widget';
  }
}

function getToneAccentVar(tone: DesktopWidgetTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'info':
      return 'var(--prism-info-main)';
    case 'success':
      return 'var(--prism-success-main)';
    case 'warning':
      return 'var(--prism-warning-main)';
  }
}

function getSizeFrameClass(size: DesktopWidgetSize): string {
  switch (size) {
    case 'sm':
      return 'w-full max-w-[16.5rem] min-h-[14rem]';
    case 'md':
      return 'w-full max-w-[24rem] min-h-[14rem]';
    case 'lg':
      return 'w-full max-w-[26rem] min-h-[21rem]';
  }
}

function getSizeBadgeLabel(size: DesktopWidgetSize): string {
  switch (size) {
    case 'sm':
      return '1×1';
    case 'md':
      return '2×1';
    case 'lg':
      return '2×2';
  }
}

function getRefreshCadenceLabel(interval: DesktopWidgetRefreshInterval): string {
  switch (interval) {
    case 0:
      return 'Manual';
    case 15:
      return 'Every 15s';
    case 60:
      return 'Every 1m';
    case 300:
      return 'Every 5m';
  }
}

function sanitizeBoundedText(
  raw: string,
  fallback: string,
  maxLength: number
): string {
  const normalized = raw.trim().slice(0, maxLength).trim();
  return normalized.length > 0 ? normalized : fallback;
}

function renderKindIcon(kind: DesktopWidgetKind): ReactNode {
  switch (kind) {
    case 'telemetry':
      return <Activity aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'weather':
      return <Sun aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'notes':
      return <StickyNote aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'clock':
      return <Clock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'custom':
      return <LayoutGrid aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

export function DesktopWidgetFrame({
  kind = 'telemetry',
  title,
  defaultTitle,
  size,
  defaultSize = 'md',
  tone,
  defaultTone = 'primary',
  locked,
  defaultLocked = false,
  pinned,
  defaultPinned = true,
  refreshSeconds,
  defaultRefreshSeconds = 60,
  lastUpdatedLabel = DEFAULT_LAST_UPDATED_LABEL,
  onSizeChange,
  onConfigChange,
  onRefresh,
  onRemove,
  children,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: DesktopWidgetFrameProps) {
  const override = useComponentOverride('DesktopWidgetFrame');
  const titleInputId = useId();
  const editPanelId = useId();

  const defaultKindTitle = getDefaultKindTitle(kind);

  const isTitleControlled = title !== undefined;
  const isSizeControlled = size !== undefined;
  const isToneControlled = tone !== undefined;
  const isLockedControlled = locked !== undefined;
  const isPinnedControlled = pinned !== undefined;
  const isRefreshControlled = refreshSeconds !== undefined;

  const [internalTitle, setInternalTitle] = useState<string | null>(() => {
    if (defaultTitle === undefined) {
      return null;
    }
    const cleaned = defaultTitle.trim().slice(0, MAX_TITLE_LENGTH).trim();
    return cleaned.length > 0 ? cleaned : null;
  });
  const [internalSize, setInternalSize] =
    useState<DesktopWidgetSize>(defaultSize);
  const [internalTone, setInternalTone] =
    useState<DesktopWidgetTone>(defaultTone);
  const [internalLocked, setInternalLocked] = useState<boolean>(defaultLocked);
  const [internalPinned, setInternalPinned] = useState<boolean>(defaultPinned);
  const [internalRefreshSeconds, setInternalRefreshSeconds] =
    useState<DesktopWidgetRefreshInterval>(defaultRefreshSeconds);

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [confirmingRemove, setConfirmingRemove] = useState<boolean>(false);
  const [refreshCount, setRefreshCount] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<string>('');
  const [noteText, setNoteText] = useState<string>(DEFAULT_NOTE_TEXT);

  const resolvedTitle = isTitleControlled
    ? sanitizeBoundedText(title, defaultKindTitle, MAX_TITLE_LENGTH)
    : (internalTitle ?? defaultKindTitle);
  const resolvedSize = isSizeControlled ? size : internalSize;
  const resolvedTone = isToneControlled ? tone : internalTone;
  const resolvedLocked = isLockedControlled ? locked : internalLocked;
  const resolvedPinned = isPinnedControlled ? pinned : internalPinned;
  const resolvedRefreshSeconds = isRefreshControlled
    ? refreshSeconds
    : internalRefreshSeconds;
  const resolvedLastUpdatedLabel = sanitizeBoundedText(
    lastUpdatedLabel,
    DEFAULT_LAST_UPDATED_LABEL,
    MAX_TITLE_LENGTH
  );

  const [draftTitle, setDraftTitle] = useState<string>(resolvedTitle);
  const [draftSize, setDraftSize] = useState<DesktopWidgetSize>(resolvedSize);
  const [draftTone, setDraftTone] = useState<DesktopWidgetTone>(resolvedTone);
  const [draftRefreshSeconds, setDraftRefreshSeconds] =
    useState<DesktopWidgetRefreshInterval>(resolvedRefreshSeconds);

  const accentVar = getToneAccentVar(resolvedTone);
  const isConfirmBarVisible = confirmingRemove && !resolvedLocked && !disabled;

  const handleImeSafeButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const handleRefresh = useCallback(() => {
    const nextCount = refreshCount + 1;
    setRefreshCount(nextCount);
    setAnnouncement(`Refreshed ${resolvedTitle} (update ${nextCount})`);
    onRefresh?.();
  }, [onRefresh, refreshCount, resolvedTitle]);

  const handleTogglePin = useCallback(() => {
    const nextPinned = !resolvedPinned;
    if (!isPinnedControlled) {
      setInternalPinned(nextPinned);
    }
    setAnnouncement(
      nextPinned
        ? `Pinned ${resolvedTitle} to desktop`
        : `Unpinned ${resolvedTitle} from desktop`
    );
    onConfigChange?.({
      title: resolvedTitle,
      size: resolvedSize,
      tone: resolvedTone,
      refreshSeconds: resolvedRefreshSeconds,
      locked: resolvedLocked,
      pinned: nextPinned,
    });
  }, [
    isPinnedControlled,
    onConfigChange,
    resolvedLocked,
    resolvedPinned,
    resolvedRefreshSeconds,
    resolvedSize,
    resolvedTitle,
    resolvedTone,
  ]);

  const handleToggleLock = useCallback(() => {
    const nextLocked = !resolvedLocked;
    if (!isLockedControlled) {
      setInternalLocked(nextLocked);
    }
    if (nextLocked) {
      setConfirmingRemove(false);
    }
    setAnnouncement(
      nextLocked
        ? `Locked ${resolvedTitle} position`
        : `Unlocked ${resolvedTitle} position`
    );
    onConfigChange?.({
      title: resolvedTitle,
      size: resolvedSize,
      tone: resolvedTone,
      refreshSeconds: resolvedRefreshSeconds,
      locked: nextLocked,
      pinned: resolvedPinned,
    });
  }, [
    isLockedControlled,
    onConfigChange,
    resolvedLocked,
    resolvedPinned,
    resolvedRefreshSeconds,
    resolvedSize,
    resolvedTitle,
    resolvedTone,
  ]);

  const handleToggleEdit = useCallback(() => {
    if (isEditing) {
      setIsEditing(false);
      return;
    }
    setDraftTitle(resolvedTitle);
    setDraftSize(resolvedSize);
    setDraftTone(resolvedTone);
    setDraftRefreshSeconds(resolvedRefreshSeconds);
    setConfirmingRemove(false);
    setIsEditing(true);
  }, [
    isEditing,
    resolvedRefreshSeconds,
    resolvedSize,
    resolvedTitle,
    resolvedTone,
  ]);

  const handleRequestRemove = useCallback(() => {
    setIsEditing(false);
    setConfirmingRemove(true);
    setAnnouncement(`Confirm removal of ${resolvedTitle}`);
  }, [resolvedTitle]);

  const handleCancelRemove = useCallback(() => {
    setConfirmingRemove(false);
    setAnnouncement('Widget removal cancelled');
  }, []);

  const handleConfirmRemove = useCallback(() => {
    setConfirmingRemove(false);
    setAnnouncement(`Removed ${resolvedTitle}`);
    onRemove?.();
  }, [onRemove, resolvedTitle]);

  const handleSelectSize = useCallback(
    (nextSize: DesktopWidgetSize) => {
      setDraftSize(nextSize);
      if (!isSizeControlled) {
        setInternalSize(nextSize);
      }
      onSizeChange?.(nextSize);
    },
    [isSizeControlled, onSizeChange]
  );

  const handleSelectTone = useCallback(
    (nextTone: DesktopWidgetTone) => {
      setDraftTone(nextTone);
      if (!isToneControlled) {
        setInternalTone(nextTone);
      }
    },
    [isToneControlled]
  );

  const handleSelectRefresh = useCallback(
    (nextInterval: DesktopWidgetRefreshInterval) => {
      setDraftRefreshSeconds(nextInterval);
      if (!isRefreshControlled) {
        setInternalRefreshSeconds(nextInterval);
      }
    },
    [isRefreshControlled]
  );

  const handleDraftTitleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      setDraftTitle(event.target.value.slice(0, MAX_TITLE_LENGTH));
    },
    [disabled]
  );

  const handleCommitEdit = useCallback(() => {
    const nextTitle = sanitizeBoundedText(
      draftTitle,
      defaultKindTitle,
      MAX_TITLE_LENGTH
    );
    const nextSize = resolvedLocked ? resolvedSize : draftSize;

    if (!isTitleControlled) {
      setInternalTitle(nextTitle);
    }
    if (!isSizeControlled) {
      setInternalSize(nextSize);
    }
    if (!isToneControlled) {
      setInternalTone(draftTone);
    }
    if (!isRefreshControlled) {
      setInternalRefreshSeconds(draftRefreshSeconds);
    }

    setIsEditing(false);
    setAnnouncement(`Saved ${nextTitle} configuration`);
    onConfigChange?.({
      title: nextTitle,
      size: nextSize,
      tone: draftTone,
      refreshSeconds: draftRefreshSeconds,
      locked: resolvedLocked,
      pinned: resolvedPinned,
    });
  }, [
    defaultKindTitle,
    draftRefreshSeconds,
    draftSize,
    draftTitle,
    draftTone,
    isRefreshControlled,
    isSizeControlled,
    isTitleControlled,
    isToneControlled,
    onConfigChange,
    resolvedLocked,
    resolvedPinned,
    resolvedSize,
  ]);

  const handleTitleInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsEditing(false);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleCommitEdit();
      }
    },
    [disabled, handleCommitEdit]
  );

  const handleNotesChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      if (disabled || resolvedLocked) {
        return;
      }
      setNoteText(event.target.value.slice(0, MAX_NOTE_LENGTH));
    },
    [disabled, resolvedLocked]
  );

  const handleNotesKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        event.currentTarget.blur();
      }
    },
    []
  );

  const telemetryMetrics: ReadonlyArray<TelemetryMetricSpec> = [
    {
      id: 'cpu',
      label: 'CPU',
      readout: '42%',
      pct: 42,
      toneVar: accentVar,
    },
    {
      id: 'memory',
      label: 'Memory',
      readout: '18.4 / 32 GB',
      pct: 58,
      toneVar: 'var(--prism-info-main)',
    },
    {
      id: 'gpu',
      label: 'GPU',
      readout: '28%',
      pct: 28,
      toneVar: 'var(--prism-success-main)',
    },
  ];

  const merged = mergeProps({
    themeTarget: themeProps('desktop-widget-frame', {
      kind,
      size: resolvedSize,
      tone: resolvedTone,
      locked: resolvedLocked ? 'true' : 'false',
      pinned: resolvedPinned ? 'true' : 'false',
      editing: isEditing ? 'true' : 'false',
      disabled,
    }),
    baseClassName: cx(
      'prism-slab relative max-w-full min-w-0 p-3.5 sm:p-4 flex flex-col gap-3 overflow-hidden transition-all duration-200',
      getSizeFrameClass(resolvedSize),
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: `color-mix(in srgb, ${accentVar} 28%, var(--prism-divider))`,
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('desktop-widget-frame', 'header');
  const controlsClass = stableClassName('desktop-widget-frame', 'controls');
  const bodyClass = stableClassName('desktop-widget-frame', 'body');
  const editorClass = stableClassName('desktop-widget-frame', 'editor');
  const footerClass = stableClassName('desktop-widget-frame', 'footer');

  const isExpandedSize = resolvedSize === 'md' || resolvedSize === 'lg';

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedTitle}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Subtle Top Optical Accent Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-20"
        style={{
          background: `radial-gradient(80% 100% at 15% 0%, color-mix(in srgb, ${accentVar} 16%, transparent) 0%, transparent 72%)`,
        }}
      />

      {/* Polite Screen-Reader Status Live Region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="desktop-widget-live-region"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Top Chrome Header */}
      <div
        className={cx(
          headerClass,
          'relative z-10 flex flex-wrap items-start justify-between gap-2 min-w-0 pb-2.5 border-b'
        )}
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden="true"
            data-testid="desktop-widget-accent-emblem"
            className="prism-well relative w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: disabled ? 'var(--prism-text-disabled)' : accentVar,
              boxShadow: `0 0 14px -5px color-mix(in srgb, ${accentVar} 45%, transparent)`,
            }}
          >
            {renderKindIcon(kind)}
            <span
              data-testid="desktop-widget-accent-dot"
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
              style={{
                backgroundColor: disabled
                  ? 'var(--prism-text-disabled)'
                  : accentVar,
              }}
            />
          </span>

          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            <h3
              data-testid="desktop-widget-title"
              className="text-sm font-semibold tracking-tight truncate leading-tight"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {resolvedTitle}
            </h3>

            <div className="flex flex-wrap items-center gap-1 min-w-0">
              {resolvedPinned ? (
                <span
                  data-testid="desktop-widget-pinned-badge"
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none"
                  style={{
                    color: accentVar,
                    backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: `color-mix(in srgb, ${accentVar} 34%, transparent)`,
                  }}
                >
                  Pinned
                </span>
              ) : null}

              {resolvedLocked ? (
                <span
                  data-testid="desktop-widget-locked-badge"
                  className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none"
                  style={{
                    color: 'var(--prism-warning-main)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor:
                      'color-mix(in srgb, var(--prism-warning-main) 38%, transparent)',
                  }}
                >
                  Locked
                </span>
              ) : null}

              <span
                data-testid="desktop-widget-size-badge"
                className="prism-well rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums leading-none"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {getSizeBadgeLabel(resolvedSize)}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Chrome Action Strip */}
        <div
          role="toolbar"
          aria-label="Widget controls"
          className={cx(controlsClass, 'flex items-center gap-1 shrink-0')}
        >
          <button
            type="button"
            aria-label="Refresh widget"
            data-testid="desktop-widget-refresh-btn"
            disabled={disabled}
            onClick={handleRefresh}
            onKeyDown={handleImeSafeButtonKeyDown}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <RefreshCw aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            aria-label="Pin to desktop"
            aria-pressed={resolvedPinned}
            data-testid="desktop-widget-pin-btn"
            disabled={disabled || resolvedLocked}
            onClick={handleTogglePin}
            onKeyDown={handleImeSafeButtonKeyDown}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
            style={{
              color: resolvedPinned ? accentVar : 'var(--prism-text-secondary)',
            }}
          >
            {resolvedPinned ? (
              <Pin aria-hidden="true" className="w-3.5 h-3.5" />
            ) : (
              <PinOff aria-hidden="true" className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            aria-label="Lock position"
            aria-pressed={resolvedLocked}
            data-testid="desktop-widget-lock-btn"
            disabled={disabled}
            onClick={handleToggleLock}
            onKeyDown={handleImeSafeButtonKeyDown}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
            style={{
              color: resolvedLocked
                ? 'var(--prism-warning-main)'
                : 'var(--prism-text-secondary)',
            }}
          >
            {resolvedLocked ? (
              <Lock aria-hidden="true" className="w-3.5 h-3.5" />
            ) : (
              <Unlock aria-hidden="true" className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            type="button"
            aria-label="Edit widget"
            aria-expanded={isEditing}
            aria-controls={editPanelId}
            data-testid="desktop-widget-edit-btn"
            disabled={disabled}
            onClick={handleToggleEdit}
            onKeyDown={handleImeSafeButtonKeyDown}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
            style={{
              color: isEditing ? accentVar : 'var(--prism-text-secondary)',
            }}
          >
            <SlidersHorizontal aria-hidden="true" className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            aria-label="Remove widget"
            data-testid="desktop-widget-remove-btn"
            disabled={disabled || resolvedLocked}
            onClick={handleRequestRemove}
            onKeyDown={handleImeSafeButtonKeyDown}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Safe Two-Step Inline Remove Confirmation Strip */}
      {isConfirmBarVisible ? (
        <div
          role="alertdialog"
          aria-label="Confirm widget removal"
          data-testid="desktop-widget-remove-confirm-bar"
          className="relative z-10 prism-crystal rounded-2xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0"
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor:
              'color-mix(in srgb, var(--prism-error-main) 44%, var(--prism-divider))',
            backgroundColor:
              'color-mix(in srgb, var(--prism-error-main) 10%, transparent)',
          }}
        >
          <span
            className="text-xs font-medium min-w-0 truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            Remove this widget from desktop?
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={disabled}
              data-testid="desktop-widget-remove-cancel-btn"
              onClick={handleCancelRemove}
              onKeyDown={handleImeSafeButtonKeyDown}
              className="prism-crystal prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              <X aria-hidden="true" className="w-3 h-3" />
              <span>Cancel</span>
            </button>
            <button
              type="button"
              disabled={disabled || resolvedLocked}
              data-testid="desktop-widget-remove-confirm-btn"
              onClick={handleConfirmRemove}
              onKeyDown={handleImeSafeButtonKeyDown}
              className="prism-focus-ring inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-110 transition-all"
              style={{
                color: 'var(--prism-error-contrast)',
                backgroundColor: 'var(--prism-error-main)',
              }}
            >
              <Trash2 aria-hidden="true" className="w-3 h-3" />
              <span>Confirm Remove</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Inline Configuration Panel OR Built-In / Custom Widget Surface */}
      {isEditing ? (
        <div
          id={editPanelId}
          role="region"
          aria-label="Widget configuration"
          data-testid="desktop-widget-edit-panel"
          className={cx(
            editorClass,
            'relative z-10 flex-1 flex flex-col gap-3 min-w-0'
          )}
        >
          {/* Title Input */}
          <div className="flex flex-col gap-1 min-w-0">
            <label
              htmlFor={titleInputId}
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Widget Title
            </label>
            <input
              id={titleInputId}
              type="text"
              data-testid="desktop-widget-title-input"
              value={draftTitle}
              maxLength={MAX_TITLE_LENGTH}
              disabled={disabled}
              onChange={handleDraftTitleChange}
              onKeyDown={handleTitleInputKeyDown}
              placeholder={defaultKindTitle}
              className="prism-well prism-focus-ring w-full min-w-0 h-8 rounded-xl px-2.5 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--prism-text-primary)' }}
            />
          </div>

          {/* Size Preset Segmented Pills */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[11px] font-semibold uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Size Preset
              </span>
              {resolvedLocked ? (
                <span
                  data-testid="desktop-widget-size-locked-hint"
                  className="text-[10px] font-mono font-medium"
                  style={{ color: 'var(--prism-warning-main)' }}
                >
                  Unlock to resize
                </span>
              ) : null}
            </div>
            <div
              role="group"
              aria-label="Widget size"
              className="grid grid-cols-3 gap-1.5 min-w-0"
            >
              {SIZE_OPTIONS.map((option) => {
                const isSelected = draftSize === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-label={option.fullLabel}
                    aria-pressed={isSelected}
                    data-testid={`desktop-widget-size-opt-${option.value}`}
                    disabled={disabled || resolvedLocked}
                    onClick={() => handleSelectSize(option.value)}
                    onKeyDown={handleImeSafeButtonKeyDown}
                    className="prism-crystal prism-focus-ring h-7 px-2 rounded-full font-mono text-xs font-semibold tabular-nums cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                    style={{
                      color: isSelected
                        ? accentVar
                        : 'var(--prism-text-primary)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: isSelected
                        ? `color-mix(in srgb, ${accentVar} 52%, transparent)`
                        : 'var(--prism-divider)',
                    }}
                  >
                    {option.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accent Tone Selector */}
          <div className="flex flex-col gap-1 min-w-0">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Accent Tone
            </span>
            <div
              role="group"
              aria-label="Accent tone"
              className="grid grid-cols-2 gap-1.5 min-w-0"
            >
              {TONE_OPTIONS.map((option) => {
                const isSelected = draftTone === option.value;
                const optionAccent = getToneAccentVar(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isSelected}
                    data-testid={`desktop-widget-tone-opt-${option.value}`}
                    disabled={disabled}
                    onClick={() => handleSelectTone(option.value)}
                    onKeyDown={handleImeSafeButtonKeyDown}
                    className="prism-crystal prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                    style={{
                      color: isSelected
                        ? optionAccent
                        : 'var(--prism-text-primary)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: isSelected
                        ? `color-mix(in srgb, ${optionAccent} 54%, transparent)`
                        : 'var(--prism-divider)',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: optionAccent }}
                    />
                    <span>{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Refresh Cadence Selector */}
          <div className="flex flex-col gap-1 min-w-0">
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Refresh Cadence
            </span>
            <div
              role="group"
              aria-label="Refresh cadence"
              className="grid grid-cols-4 gap-1 min-w-0"
            >
              {REFRESH_OPTIONS.map((option) => {
                const isSelected = draftRefreshSeconds === option.value;
                return (
                  <button
                    key={String(option.value)}
                    type="button"
                    aria-pressed={isSelected}
                    data-testid={`desktop-widget-refresh-opt-${option.value}`}
                    disabled={disabled}
                    onClick={() => handleSelectRefresh(option.value)}
                    onKeyDown={handleImeSafeButtonKeyDown}
                    className="prism-crystal prism-focus-ring h-7 px-1.5 rounded-full font-mono text-[11px] font-semibold tabular-nums cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-all"
                    style={{
                      color: isSelected
                        ? accentVar
                        : 'var(--prism-text-primary)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: isSelected
                        ? `color-mix(in srgb, ${accentVar} 52%, transparent)`
                        : 'var(--prism-divider)',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Done Action */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              data-testid="desktop-widget-edit-done"
              disabled={disabled}
              onClick={handleCommitEdit}
              onKeyDown={handleImeSafeButtonKeyDown}
              className="prism-btn-primary prism-focus-ring inline-flex items-center gap-1.5 h-8 px-4 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
            >
              <Check aria-hidden="true" className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        <div
          data-testid="desktop-widget-body"
          className={cx(
            bodyClass,
            'relative z-10 flex-1 flex flex-col gap-2.5 min-w-0'
          )}
        >
          {kind === 'telemetry' ? (
            <div
              data-testid="desktop-widget-view-telemetry"
              className="flex flex-col gap-2.5 min-w-0 flex-1 justify-between"
            >
              <div className="flex flex-col gap-2 min-w-0">
                {telemetryMetrics.map((metric) => (
                  <div
                    key={metric.id}
                    data-testid={`desktop-widget-telemetry-${metric.id}`}
                    className="flex flex-col gap-1 min-w-0"
                  >
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span
                        className="font-semibold"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {metric.label}
                      </span>
                      <span
                        className="font-mono font-semibold tabular-nums"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {metric.readout}
                      </span>
                    </div>
                    <div className="prism-well h-2 rounded-full p-0.5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-200"
                        style={{
                          width: `${metric.pct}%`,
                          backgroundColor: metric.toneVar,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {resolvedSize === 'lg' ? (
                <div
                  data-testid="desktop-widget-telemetry-extended"
                  className="prism-well rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  <span>Thermal 54°C</span>
                  <span>Uptime 14d 06h</span>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                <span style={{ color: 'var(--prism-text-secondary)' }}>
                  Optical Bus Nominal
                </span>
                <span
                  data-testid="desktop-widget-refresh-count"
                  className="prism-well rounded-full px-2 py-0.5 font-semibold"
                  style={{ color: accentVar }}
                >
                  Sync #{refreshCount}
                </span>
              </div>
            </div>
          ) : null}

          {kind === 'weather' ? (
            <div
              data-testid="desktop-widget-view-weather"
              className="flex flex-col gap-2.5 min-w-0 flex-1 justify-between"
            >
              <div className="flex items-baseline justify-between gap-3 min-w-0">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span
                    data-testid="desktop-widget-weather-temp"
                    className="text-3xl font-bold font-mono tabular-nums tracking-tight"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    68°
                  </span>
                  <span
                    className="text-xs font-semibold truncate"
                    style={{ color: accentVar }}
                  >
                    Clear Optics
                  </span>
                </div>
                <span
                  className="font-mono text-[11px] font-semibold tabular-nums shrink-0"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  H 72° / L 58°
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 min-w-0">
                <div className="prism-well rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1 text-[11px] font-mono tabular-nums">
                  <span style={{ color: 'var(--prism-text-secondary)' }}>
                    UV
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    4 Mod
                  </span>
                </div>
                <div className="prism-well rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-1 text-[11px] font-mono tabular-nums">
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ color: 'var(--prism-text-secondary)' }}
                  >
                    <Wind aria-hidden="true" className="w-3 h-3 shrink-0" />
                    Wind
                  </span>
                  <span
                    className="font-semibold"
                    style={{ color: 'var(--prism-text-primary)' }}
                  >
                    8 mph
                  </span>
                </div>
              </div>

              {isExpandedSize ? (
                <div
                  data-testid="desktop-widget-weather-forecast"
                  className="grid grid-cols-3 gap-1.5 min-w-0"
                >
                  {WEATHER_FORECAST.map((slot) => (
                    <div
                      key={slot.id}
                      className="prism-well rounded-xl px-2 py-1.5 flex flex-col items-center gap-0.5 text-center font-mono tabular-nums"
                    >
                      <span
                        className="text-[10px]"
                        style={{ color: 'var(--prism-text-secondary)' }}
                      >
                        {slot.hour}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {slot.temp}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {resolvedSize === 'lg' ? (
                <div
                  data-testid="desktop-widget-weather-extended"
                  className="prism-well rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  <span>Humidity 44%</span>
                  <span>Visibility 10 mi</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {kind === 'notes' ? (
            <div
              data-testid="desktop-widget-view-notes"
              className="flex flex-col gap-2 min-w-0 flex-1"
            >
              <textarea
                aria-label="Sticky note content"
                data-testid="desktop-widget-notes-textarea"
                value={noteText}
                maxLength={MAX_NOTE_LENGTH}
                rows={resolvedSize === 'lg' ? 6 : resolvedSize === 'sm' ? 3 : 4}
                readOnly={resolvedLocked || disabled}
                disabled={disabled}
                onChange={handleNotesChange}
                onKeyDown={handleNotesKeyDown}
                className="prism-well prism-focus-ring w-full flex-1 min-w-0 rounded-xl p-2.5 text-xs leading-relaxed resize-none disabled:opacity-55 disabled:cursor-not-allowed"
                style={{ color: 'var(--prism-text-primary)' }}
              />
              <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                <span
                  data-testid="desktop-widget-notes-status"
                  style={{
                    color: resolvedLocked
                      ? 'var(--prism-warning-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {disabled
                    ? 'Disabled'
                    : resolvedLocked
                      ? 'Read-only (locked)'
                      : 'Editable'}
                </span>
                <span
                  data-testid="desktop-widget-notes-count"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {noteText.length} / {MAX_NOTE_LENGTH}
                </span>
              </div>
            </div>
          ) : null}

          {kind === 'clock' ? (
            <div
              data-testid="desktop-widget-view-clock"
              className="flex flex-col gap-2.5 min-w-0 flex-1 justify-between"
            >
              <div className="flex flex-col gap-0.5 min-w-0">
                <span
                  data-testid="desktop-widget-clock-time"
                  className="text-2xl sm:text-3xl font-bold font-mono tabular-nums tracking-tight"
                  style={{ color: 'var(--prism-text-primary)' }}
                >
                  14:28 UTC
                </span>
                <span
                  data-testid="desktop-widget-clock-date"
                  className="text-xs font-medium truncate"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  Thu, Nov 22 · Studio Reference
                </span>
              </div>

              {isExpandedSize ? (
                <div
                  data-testid="desktop-widget-clock-zones"
                  className="grid grid-cols-3 gap-1.5 min-w-0"
                >
                  {CLOCK_ZONES.map((zone) => (
                    <div
                      key={zone.id}
                      className="prism-well rounded-xl px-2 py-1.5 flex flex-col items-center gap-0.5 font-mono tabular-nums"
                    >
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: accentVar }}
                      >
                        {zone.code}
                      </span>
                      <span
                        className="text-xs font-semibold"
                        style={{ color: 'var(--prism-text-primary)' }}
                      >
                        {zone.time}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}

              {resolvedSize === 'lg' ? (
                <div
                  data-testid="desktop-widget-clock-extended"
                  className="prism-well rounded-xl px-3 py-2 flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  <span>PTP Sync Lock</span>
                  <span>Drift 0.0ms</span>
                </div>
              ) : null}
            </div>
          ) : null}

          {kind === 'custom' ? (
            <div
              data-testid="desktop-widget-view-custom"
              className="flex-1 min-w-0 flex flex-col justify-center"
            >
              {children ?? (
                <p
                  data-testid="desktop-widget-custom-empty"
                  className="text-xs text-center py-4"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  Mount custom optical widget content via children.
                </p>
              )}
            </div>
          ) : children !== undefined && children !== null ? (
            <div
              data-testid="desktop-widget-extra-content"
              className="pt-2 border-t min-w-0"
              style={{ borderColor: 'var(--prism-divider)' }}
            >
              {children}
            </div>
          ) : null}
        </div>
      )}

      {/* Footer Metadata Strip */}
      <div
        className={cx(
          footerClass,
          'relative z-10 pt-2 border-t flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums min-w-0'
        )}
        style={{
          borderColor: 'var(--prism-divider)',
          color: 'var(--prism-text-secondary)',
        }}
      >
        <span data-testid="desktop-widget-last-updated" className="truncate">
          {resolvedLastUpdatedLabel}
          {refreshCount > 0 ? ` · #${refreshCount}` : ''}
        </span>
        <span data-testid="desktop-widget-cadence-label" className="shrink-0">
          {getRefreshCadenceLabel(resolvedRefreshSeconds)}
        </span>
      </div>
    </div>
  );
}

DesktopWidgetFrame.displayName = 'DesktopWidgetFrame';
