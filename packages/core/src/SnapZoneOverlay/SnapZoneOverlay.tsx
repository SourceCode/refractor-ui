'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Check,
  Columns2,
  Columns3,
  Grid2x2,
  GripVertical,
  LayoutGrid,
  LayoutPanelLeft,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type SnapZonePresetKind = 'halves' | 'thirds' | 'quarters' | 'priority-grid';

export interface SnapZoneSlot {
  id: string;
  label: string;
  preset: SnapZonePresetKind;
  colSpanLabel: string;
  gridAreaClass: string;
}

type SnapZoneOverlayBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SnapZoneOverlayProps extends SnapZoneOverlayBaseProps {
  /** Title of the window currently being dragged or tiled (defaults to `'Optical Studio — main.tsx'`). */
  windowTitle?: string;
  /** Controlled snap layout preset (`'halves' | 'thirds' | 'quarters' | 'priority-grid'`). */
  preset?: SnapZonePresetKind;
  /** Initial uncontrolled snap layout preset (defaults to `'halves'`). */
  defaultPreset?: SnapZonePresetKind;
  /** Controlled snapped zone identifier (`null` means unsnapped). */
  activeZoneId?: string | null;
  /** Initial uncontrolled snapped zone identifier (defaults to `null`). */
  defaultActiveZoneId?: string | null;
  /** Callback invoked when the active tiling preset changes. */
  onPresetChange?: (preset: SnapZonePresetKind) => void;
  /** Callback invoked when a window snaps into a zone or clears snap (`null`). */
  onSnapZone?: (slot: SnapZoneSlot | null) => void;
  /** Disables preset pills, drop-zone interactions, keyboard navigation, and Clear Snap. */
  disabled?: boolean;
}

interface PresetOptionMeta {
  readonly id: SnapZonePresetKind;
  readonly label: string;
}

type NavigationKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'Home'
  | 'End';

const DEFAULT_WINDOW_TITLE = 'Optical Studio — main.tsx';

const PRESET_OPTIONS: ReadonlyArray<PresetOptionMeta> = [
  { id: 'halves', label: 'Halves' },
  { id: 'thirds', label: 'Thirds' },
  { id: 'quarters', label: 'Quarters' },
  { id: 'priority-grid', label: 'Priority Grid' },
];

const HALVES_SLOTS: ReadonlyArray<SnapZoneSlot> = [
  {
    id: 'halves-left',
    label: 'Left Half',
    preset: 'halves',
    colSpanLabel: '50% × 100%',
    gridAreaClass: 'col-span-6 row-span-1',
  },
  {
    id: 'halves-right',
    label: 'Right Half',
    preset: 'halves',
    colSpanLabel: '50% × 100%',
    gridAreaClass: 'col-span-6 row-span-1',
  },
];

const THIRDS_SLOTS: ReadonlyArray<SnapZoneSlot> = [
  {
    id: 'thirds-left',
    label: 'Left Third',
    preset: 'thirds',
    colSpanLabel: '33% × 100%',
    gridAreaClass: 'col-span-4 row-span-1',
  },
  {
    id: 'thirds-center',
    label: 'Center Third',
    preset: 'thirds',
    colSpanLabel: '34% × 100%',
    gridAreaClass: 'col-span-4 row-span-1',
  },
  {
    id: 'thirds-right',
    label: 'Right Third',
    preset: 'thirds',
    colSpanLabel: '33% × 100%',
    gridAreaClass: 'col-span-4 row-span-1',
  },
];

const QUARTERS_SLOTS: ReadonlyArray<SnapZoneSlot> = [
  {
    id: 'quarters-top-left',
    label: 'Top-Left',
    preset: 'quarters',
    colSpanLabel: '50% × 50%',
    gridAreaClass: 'col-span-6 row-span-1',
  },
  {
    id: 'quarters-top-right',
    label: 'Top-Right',
    preset: 'quarters',
    colSpanLabel: '50% × 50%',
    gridAreaClass: 'col-span-6 row-span-1',
  },
  {
    id: 'quarters-bottom-left',
    label: 'Bottom-Left',
    preset: 'quarters',
    colSpanLabel: '50% × 50%',
    gridAreaClass: 'col-span-6 row-span-1',
  },
  {
    id: 'quarters-bottom-right',
    label: 'Bottom-Right',
    preset: 'quarters',
    colSpanLabel: '50% × 50%',
    gridAreaClass: 'col-span-6 row-span-1',
  },
];

const PRIORITY_GRID_SLOTS: ReadonlyArray<SnapZoneSlot> = [
  {
    id: 'priority-primary',
    label: 'Primary Stage',
    preset: 'priority-grid',
    colSpanLabel: '70% × 100%',
    gridAreaClass: 'col-span-7 row-span-2',
  },
  {
    id: 'priority-top-stack',
    label: 'Top Stack',
    preset: 'priority-grid',
    colSpanLabel: '30% × 50%',
    gridAreaClass: 'col-span-3 row-span-1',
  },
  {
    id: 'priority-bottom-stack',
    label: 'Bottom Stack',
    preset: 'priority-grid',
    colSpanLabel: '30% × 50%',
    gridAreaClass: 'col-span-3 row-span-1',
  },
];

function getPresetSlots(preset: SnapZonePresetKind): ReadonlyArray<SnapZoneSlot> {
  switch (preset) {
    case 'halves':
      return HALVES_SLOTS;
    case 'thirds':
      return THIRDS_SLOTS;
    case 'quarters':
      return QUARTERS_SLOTS;
    case 'priority-grid':
      return PRIORITY_GRID_SLOTS;
  }
}

function getPresetLabel(preset: SnapZonePresetKind): string {
  switch (preset) {
    case 'halves':
      return 'Halves';
    case 'thirds':
      return 'Thirds';
    case 'quarters':
      return 'Quarters';
    case 'priority-grid':
      return 'Priority Grid';
  }
}

function getPresetGridClass(preset: SnapZonePresetKind): string {
  switch (preset) {
    case 'halves':
      return 'grid-cols-12 grid-rows-1';
    case 'thirds':
      return 'grid-cols-12 grid-rows-1';
    case 'quarters':
      return 'grid-cols-12 grid-rows-2';
    case 'priority-grid':
      return 'grid-cols-10 grid-rows-2';
  }
}

function renderPresetIcon(preset: SnapZonePresetKind) {
  switch (preset) {
    case 'halves':
      return <Columns2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'thirds':
      return <Columns3 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'quarters':
      return <Grid2x2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'priority-grid':
      return <LayoutPanelLeft aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

function isNavigationKey(key: string): key is NavigationKey {
  return (
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Home' ||
    key === 'End'
  );
}

function getNextZoneIndex(
  preset: SnapZonePresetKind,
  currentIndex: number,
  count: number,
  key: NavigationKey
): number {
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return count - 1;
  }
  if (preset === 'quarters' && (key === 'ArrowUp' || key === 'ArrowDown')) {
    return (currentIndex + 2) % count;
  }
  if (key === 'ArrowRight' || key === 'ArrowDown') {
    return (currentIndex + 1) % count;
  }
  return (currentIndex - 1 + count) % count;
}

function SnapZoneOverlayInner({
  windowTitle = DEFAULT_WINDOW_TITLE,
  preset,
  defaultPreset = 'halves',
  activeZoneId,
  defaultActiveZoneId = null,
  onPresetChange,
  onSnapZone,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': nativeAriaLabel,
  ref,
  ...rest
}: SnapZoneOverlayProps) {
  const override = useComponentOverride('SnapZoneOverlay');
  const headingId = useId();

  const isPresetControlled = preset !== undefined;
  const isActiveZoneControlled = activeZoneId !== undefined;

  const [uncontrolledPreset, setUncontrolledPreset] =
    useState<SnapZonePresetKind>(defaultPreset);
  const [uncontrolledActiveZoneId, setUncontrolledActiveZoneId] = useState<string | null>(
    defaultActiveZoneId
  );
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null);
  const [dragOverZoneId, setDragOverZoneId] = useState<string | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [announcement, setAnnouncement] = useState<string>('');

  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);

  const activePreset: SnapZonePresetKind = isPresetControlled ? preset : uncontrolledPreset;
  const slots = useMemo<ReadonlyArray<SnapZoneSlot>>(
    () => getPresetSlots(activePreset),
    [activePreset]
  );
  const activePresetLabel = getPresetLabel(activePreset);
  const resolvedWindowTitle = windowTitle.trim() || DEFAULT_WINDOW_TITLE;
  const resolvedAriaLabel = nativeAriaLabel?.trim() || undefined;

  const resolvedActiveZoneId: string | null = isActiveZoneControlled
    ? activeZoneId
    : uncontrolledActiveZoneId;

  const activeSlot = useMemo<SnapZoneSlot | null>(
    () => slots.find((slot) => slot.id === resolvedActiveZoneId) ?? null,
    [slots, resolvedActiveZoneId]
  );

  const safeFocusedIndex = focusedIndex < slots.length ? focusedIndex : 0;

  const setOptionRef = useCallback((index: number, node: HTMLDivElement | null) => {
    optionRefs.current[index] = node;
  }, []);

  const snapToSlot = useCallback(
    (slot: SnapZoneSlot, index: number) => {
      if (disabled) {
        return;
      }
      setFocusedIndex(index);
      setDragOverZoneId(null);
      if (!isActiveZoneControlled) {
        setUncontrolledActiveZoneId(slot.id);
      }
      setAnnouncement(`Snapped ${resolvedWindowTitle} to ${slot.label} (${slot.colSpanLabel})`);
      onSnapZone?.(slot);
    },
    [disabled, isActiveZoneControlled, onSnapZone, resolvedWindowTitle]
  );

  const clearSnap = useCallback(() => {
    if (disabled || activeSlot === null) {
      return;
    }
    if (!isActiveZoneControlled) {
      setUncontrolledActiveZoneId(null);
    }
    setDragOverZoneId(null);
    setHoveredZoneId(null);
    setAnnouncement(`Snap cleared · ${resolvedWindowTitle} floating freely`);
    onSnapZone?.(null);
  }, [activeSlot, disabled, isActiveZoneControlled, onSnapZone, resolvedWindowTitle]);

  const handlePresetSelect = useCallback(
    (nextPreset: SnapZonePresetKind) => {
      if (disabled || nextPreset === activePreset) {
        return;
      }
      const nextSlots = getPresetSlots(nextPreset);
      const nextLabel = getPresetLabel(nextPreset);
      if (!isPresetControlled) {
        setUncontrolledPreset(nextPreset);
      }
      if (!isActiveZoneControlled) {
        setUncontrolledActiveZoneId(null);
      }
      setHoveredZoneId(null);
      setDragOverZoneId(null);
      setFocusedIndex(0);
      setAnnouncement(`Preset switched to ${nextLabel} (${nextSlots.length} snap zones)`);
      onPresetChange?.(nextPreset);
    },
    [activePreset, disabled, isActiveZoneControlled, isPresetControlled, onPresetChange]
  );

  const handleZoneKeyDown = useCallback(
    (slot: SnapZoneSlot, index: number, event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }

      if (isNavigationKey(event.key)) {
        event.preventDefault();
        const nextIndex = getNextZoneIndex(activePreset, index, slots.length, event.key);
        setFocusedIndex(nextIndex);
        optionRefs.current[nextIndex]?.focus();
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        snapToSlot(slot, index);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        if (activeSlot !== null) {
          clearSnap();
        } else {
          setDragOverZoneId(null);
          setHoveredZoneId(null);
        }
      }
    },
    [activePreset, activeSlot, clearSnap, disabled, slots, snapToSlot]
  );

  const handleSourceDragStart = useCallback(
    (event: ReactDragEvent<HTMLDivElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      if (event.dataTransfer) {
        event.dataTransfer.setData('text/plain', resolvedWindowTitle);
        event.dataTransfer.effectAllowed = 'move';
      }
    },
    [disabled, resolvedWindowTitle]
  );

  const handleSourceDragEnd = useCallback(() => {
    setDragOverZoneId(null);
  }, []);

  const handleZoneDragEnter = useCallback(
    (slotId: string, event: ReactDragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      setDragOverZoneId(slotId);
    },
    [disabled]
  );

  const handleZoneDragOver = useCallback(
    (slotId: string, event: ReactDragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
      setDragOverZoneId(slotId);
    },
    [disabled]
  );

  const handleZoneDragLeave = useCallback(
    (slotId: string, event: ReactDragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      const related = event.relatedTarget as Node | null;
      if (related && event.currentTarget.contains(related)) {
        return;
      }
      setDragOverZoneId((prev) => (prev === slotId ? null : prev));
    },
    [disabled]
  );

  const handleZoneDrop = useCallback(
    (slot: SnapZoneSlot, index: number, event: ReactDragEvent<HTMLDivElement>) => {
      if (disabled) {
        return;
      }
      event.preventDefault();
      setHoveredZoneId(null);
      snapToSlot(slot, index);
    },
    [disabled, snapToSlot]
  );

  const merged = mergeProps({
    themeTarget: themeProps('snap-zone-overlay', {
      preset: activePreset,
      snapped: activeSlot !== null,
      activeZone: activeSlot?.id,
      dragging: !disabled && dragOverZoneId !== null,
      disabled,
    }),
    baseClassName:
      'prism-slab relative flex flex-col gap-3.5 p-4 sm:p-5 w-full max-w-full min-w-0 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('snap-zone-overlay', 'header');
  const presetsClass = stableClassName('snap-zone-overlay', 'presets');
  const stageClass = stableClassName('snap-zone-overlay', 'stage');
  const zoneClass = stableClassName('snap-zone-overlay', 'zone');
  const statusClass = stableClassName('snap-zone-overlay', 'status');

  const defaultStatusSummary = activeSlot
    ? `Snapped ${resolvedWindowTitle} to ${activeSlot.label} (${activeSlot.colSpanLabel}) · ${activePresetLabel}`
    : `Preset: ${activePresetLabel} (${slots.length} snap zones) · Ready to snap ${resolvedWindowTitle}`;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      aria-labelledby={resolvedAriaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Header Bar: Window Drag Chip, Preset Pills, and Clear Snap */}
      <div
        data-part="header"
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <span
            aria-hidden="true"
            className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: disabled
                ? 'var(--prism-text-disabled)'
                : 'var(--prism-primary-main)',
            }}
          >
            <LayoutGrid className="w-4 h-4" />
          </span>

          <div
            data-testid="snap-drag-source"
            draggable={!disabled}
            onDragStart={handleSourceDragStart}
            onDragEnd={handleSourceDragEnd}
            className={cx(
              'prism-crystal rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 min-w-0 max-w-full border',
              disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
            )}
            style={STYLE_BORDER_DIVIDER}
          >
            <GripVertical
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <h2
              id={headingId}
              className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              Dragging: {resolvedWindowTitle}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
          <div
            role="group"
            aria-label="Snap layout presets"
            className={cx(
              presetsClass,
              'prism-well p-1 rounded-full inline-flex flex-wrap items-center gap-1 max-w-full min-w-0'
            )}
          >
            {PRESET_OPTIONS.map((item) => {
              const isSelectedPreset = activePreset === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  aria-pressed={isSelectedPreset}
                  data-testid={`snap-preset-${item.id}`}
                  data-preset={item.id}
                  onClick={() => handlePresetSelect(item.id)}
                  className={cx(
                    'prism-focus-ring h-7 px-2.5 sm:px-3 rounded-full text-xs font-semibold whitespace-nowrap inline-flex items-center gap-1.5 border transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                    isSelectedPreset ? 'prism-crystal' : 'border-transparent'
                  )}
                  style={{
                    color: isSelectedPreset
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                    borderColor: isSelectedPreset
                      ? 'color-mix(in srgb, var(--prism-primary-main) 45%, var(--prism-divider))'
                      : 'transparent',
                  }}
                >
                  {renderPresetIcon(item.id)}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={disabled || activeSlot === null}
            data-testid="snap-clear-button"
            onClick={clearSnap}
            className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Clear Snap</span>
          </button>
        </div>
      </div>

      {/* Interactive Desktop Drop-Zone Monitor Stage */}
      <div className="prism-well rounded-2xl p-3 w-full max-w-full min-w-0 flex flex-col gap-2.5">
        <div
          className="flex flex-wrap items-center justify-between gap-2 px-1 min-w-0"
          aria-hidden="true"
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={STYLE_BG_ERROR}
            />
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={STYLE_BG_WARNING}
            />
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={STYLE_BG_SUCCESS}
            />
            <span
              className="ml-1.5 text-[11px] font-semibold tracking-wide uppercase"
              style={STYLE_TEXT_SECONDARY}
            >
              {activePresetLabel} Tiling Overlay
            </span>
          </div>

          <span
            data-testid="snap-active-badge"
            className="prism-crystal px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tabular-nums truncate max-w-full"
            style={{
              color: activeSlot
                ? 'var(--prism-primary-main)'
                : 'var(--prism-text-secondary)',
            }}
          >
            {activeSlot
              ? `${activeSlot.label} · ${activeSlot.colSpanLabel}`
              : 'Unsnapped'}
          </span>
        </div>

        <div
          role="listbox"
          aria-label="Window snap zones"
          aria-disabled={disabled ? 'true' : undefined}
          data-testid="snap-zone-stage"
          data-preset={activePreset}
          className={cx(
            stageClass,
            'grid gap-2.5 w-full max-w-full min-w-0 min-h-[240px] sm:min-h-[268px] p-2.5 rounded-xl border',
            getPresetGridClass(activePreset)
          )}
          style={{
            borderColor: 'var(--prism-divider)',
            backgroundColor: 'color-mix(in srgb, var(--prism-bg-start) 65%, transparent)',
            backgroundImage:
              'radial-gradient(circle at 18% 18%, color-mix(in srgb, var(--prism-secondary-main) 14%, transparent), transparent 58%), radial-gradient(circle at 86% 84%, color-mix(in srgb, var(--prism-primary-main) 12%, transparent), transparent 62%)',
          }}
        >
          {slots.map((slot, index) => {
            const isSnapped = activeSlot?.id === slot.id;
            const isHovered = !disabled && hoveredZoneId === slot.id;
            const isDragOver = !disabled && dragOverZoneId === slot.id;
            const isHighlighted = isSnapped || isHovered || isDragOver;

            const zoneStatusText = isSnapped
              ? 'Snapped'
              : isDragOver
                ? 'Release to Snap'
                : isHovered
                  ? 'Click to Snap'
                  : 'Drop Zone';

            return (
              <div
                key={slot.id}
                ref={(node) => setOptionRef(index, node)}
                role="option"
                aria-selected={isSnapped}
                aria-disabled={disabled ? 'true' : undefined}
                aria-label={`${slot.label} (${slot.colSpanLabel})`}
                tabIndex={disabled ? -1 : index === safeFocusedIndex ? 0 : -1}
                data-testid={`snap-zone-${slot.id}`}
                data-zone-id={slot.id}
                data-preset={slot.preset}
                data-snapped={isSnapped ? 'true' : undefined}
                data-highlighted={isHighlighted ? 'true' : undefined}
                data-drag-over={isDragOver ? 'true' : undefined}
                data-hovered={isHovered ? 'true' : undefined}
                onClick={() => snapToSlot(slot, index)}
                onFocus={() => {
                  if (!disabled) {
                    setFocusedIndex(index);
                  }
                }}
                onMouseEnter={() => {
                  if (!disabled) {
                    setHoveredZoneId(slot.id);
                  }
                }}
                onMouseLeave={() => {
                  setHoveredZoneId((prev) => (prev === slot.id ? null : prev));
                }}
                onDragEnter={(event) => handleZoneDragEnter(slot.id, event)}
                onDragOver={(event) => handleZoneDragOver(slot.id, event)}
                onDragLeave={(event) => handleZoneDragLeave(slot.id, event)}
                onDrop={(event) => handleZoneDrop(slot, index, event)}
                onKeyDown={(event) => handleZoneKeyDown(slot, index, event)}
                className={cx(
                  zoneClass,
                  slot.gridAreaClass,
                  'prism-focus-ring relative flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 text-center min-w-0 overflow-hidden transition-[color,background-color,border-color,opacity,transform]',
                  isSnapped ? 'border-solid' : 'border-dashed',
                  disabled ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'
                )}
                style={{
                  borderColor: isHighlighted
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-divider)',
                  backgroundColor: isHighlighted
                    ? 'color-mix(in srgb, var(--prism-primary-main) 18%, transparent)'
                    : 'color-mix(in srgb, var(--prism-crystal-top) 54%, transparent)',
                  boxShadow: isHighlighted
                    ? '0 0 0 1px color-mix(in srgb, var(--prism-primary-main) 42%, transparent), 0 0 24px -4px color-mix(in srgb, var(--prism-primary-main) 44%, transparent), inset 0 1px 0 color-mix(in srgb, var(--prism-primary-light) 35%, transparent)'
                    : 'inset 0 1px 0 color-mix(in srgb, var(--prism-crystal-top) 75%, transparent)',
                }}
              >
                <span
                  className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate max-w-full"
                  style={{
                    color: isHighlighted
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-primary)',
                  }}
                >
                  {slot.label}
                </span>

                <span
                  className="prism-crystal px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold tabular-nums truncate max-w-full"
                  style={{
                    color: isHighlighted
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {slot.colSpanLabel}
                </span>

                <span
                  className="inline-flex items-center gap-1 text-[11px] font-semibold truncate max-w-full"
                  style={{
                    color: isHighlighted
                      ? 'var(--prism-primary-main)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {isSnapped && <Check aria-hidden="true" className="w-3 h-3 shrink-0" />}
                  <span>{zoneStatusText}</span>
                </span>

                {isSnapped && (
                  <div
                    data-testid={`snap-zone-window-preview-${slot.id}`}
                    className="prism-crystal mt-0.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium truncate max-w-full"
                    style={{
                      borderColor:
                        'color-mix(in srgb, var(--prism-primary-main) 45%, var(--prism-divider))',
                      color: 'var(--prism-text-primary)',
                    }}
                  >
                    {resolvedWindowTitle}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Polite Status Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-part="status"
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0 max-w-full'
        )}
      >
        <span
          className="font-medium min-w-0 break-words"
          style={STYLE_TEXT_PRIMARY}
        >
          {announcement || defaultStatusSummary}
        </span>

        <span
          className="font-mono text-[11px] shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          Arrows: move · Enter/Space: snap · Esc: clear
        </span>
      </div>
    </div>
  );
}

export const SnapZoneOverlay = memo(SnapZoneOverlayInner);
SnapZoneOverlay.displayName = 'SnapZoneOverlay';
