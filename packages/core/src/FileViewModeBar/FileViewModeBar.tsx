'use client';

import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Columns3,
  FileAudio,
  FileCode,
  FileImage,
  FileText,
  GalleryHorizontal,
  Inbox,
  LayoutGrid,
  List,
  Minus,
  Plus,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type FileViewModeId = 'grid' | 'list' | 'columns' | 'gallery';

export interface FileViewSampleItem {
  /** Unique identifier for the file entry. */
  id: string;
  /** Visible file name rendered strictly as literal text. */
  name: string;
  /** Semantic file kind controlling icon, badge label, and optical accent token. */
  kind: 'image' | 'code' | 'document' | 'audio';
  /** Human-readable file size label (e.g., `'2.4 MB'`). */
  sizeLabel: string;
  /** Human-readable last-modified timestamp (e.g., `'Today, 14:20'`). */
  modifiedAt: string;
}

type FileViewModeBarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface FileViewModeBarProps extends FileViewModeBarBaseProps {
  /** Controlled active file view mode (`'grid' | 'list' | 'columns' | 'gallery'`). */
  viewMode?: FileViewModeId;
  /** Initial uncontrolled file view mode. Defaults to `'grid'`. */
  defaultViewMode?: FileViewModeId;
  /** Controlled thumbnail zoom size in pixels. */
  zoomPx?: number;
  /** Initial uncontrolled thumbnail zoom size in pixels. Defaults to `96`. */
  defaultZoomPx?: number;
  /** Minimum thumbnail zoom size in pixels. Defaults to `48`. */
  minZoomPx?: number;
  /** Maximum thumbnail zoom size in pixels. Defaults to `160`. */
  maxZoomPx?: number;
  /** Step increment in pixels for slider and `-`/`+` zoom buttons. Defaults to `8`. */
  stepZoomPx?: number;
  /** Sample files displayed when `showPreviewStage` is enabled. Defaults to built-in optical studio assets. */
  items?: ReadonlyArray<FileViewSampleItem>;
  /** When `true`, renders the live multi-mode file preview stage synchronized with view mode and thumbnail zoom. Defaults to `false`. */
  showPreviewStage?: boolean;
  /** Callback fired with the newly selected `FileViewModeId` whenever view mode changes. */
  onViewModeChange?: (mode: FileViewModeId) => void;
  /** Callback fired with the sanitized and clamped pixel size whenever thumbnail zoom changes. */
  onZoomChange?: (zoomPx: number) => void;
  /** Disables view mode radio selection, zoom controls, and gallery filmstrip interaction. */
  disabled?: boolean;
}

interface ViewModeOptionSpec {
  id: FileViewModeId;
  label: string;
}

interface ResolvedZoomBounds {
  min: number;
  max: number;
  step: number;
}

interface IndexedFileItem {
  key: string;
  item: FileViewSampleItem;
}

interface FileKindMeta {
  label: string;
  badge: string;
  accentVar: string;
}

const DEFAULT_VIEW_MODE: FileViewModeId = 'grid';
const DEFAULT_MIN_ZOOM_PX = 48;
const DEFAULT_MAX_ZOOM_PX = 160;
const DEFAULT_STEP_ZOOM_PX = 8;
const DEFAULT_ZOOM_PX = 96;
const ABSOLUTE_MIN_ZOOM_PX = 24;
const ABSOLUTE_MAX_ZOOM_PX = 320;

const MODE_GRID: ViewModeOptionSpec = { id: 'grid', label: 'Icon Grid' };
const MODE_LIST: ViewModeOptionSpec = { id: 'list', label: 'Compact List' };
const MODE_COLUMNS: ViewModeOptionSpec = { id: 'columns', label: 'Detailed Columns' };
const MODE_GALLERY: ViewModeOptionSpec = { id: 'gallery', label: 'Gallery' };

const VIEW_MODE_OPTIONS: ReadonlyArray<ViewModeOptionSpec> = [
  MODE_GRID,
  MODE_LIST,
  MODE_COLUMNS,
  MODE_GALLERY,
];

const DEFAULT_SAMPLE_ITEMS: ReadonlyArray<FileViewSampleItem> = [
  {
    id: 'prism-hero',
    name: 'prism-hero.png',
    kind: 'image',
    sizeLabel: '2.4 MB',
    modifiedAt: 'Today, 14:20',
  },
  {
    id: 'refractor-tokens',
    name: 'refractor-tokens.ts',
    kind: 'code',
    sizeLabel: '18.6 KB',
    modifiedAt: 'Today, 13:45',
  },
  {
    id: 'optical-spec',
    name: 'Optical_Glass_Spec.pdf',
    kind: 'document',
    sizeLabel: '842 KB',
    modifiedAt: 'Yesterday',
  },
  {
    id: 'crystal-chime',
    name: 'crystal-chime.wav',
    kind: 'audio',
    sizeLabel: '4.1 MB',
    modifiedAt: '2 days ago',
  },
  {
    id: 'caustic-shader',
    name: 'caustic-dispersion.glsl',
    kind: 'code',
    sizeLabel: '9.3 KB',
    modifiedAt: '3 days ago',
  },
  {
    id: 'studio-backdrop',
    name: 'studio-backdrop.webp',
    kind: 'image',
    sizeLabel: '1.7 MB',
    modifiedAt: 'Last week',
  },
];

function getViewModeAtIndex(index: number): ViewModeOptionSpec {
  switch (index) {
    case 0:
      return MODE_GRID;
    case 1:
      return MODE_LIST;
    case 2:
      return MODE_COLUMNS;
    default:
      return MODE_GALLERY;
  }
}

function getViewModeOption(mode: FileViewModeId): ViewModeOptionSpec {
  switch (mode) {
    case 'grid':
      return MODE_GRID;
    case 'list':
      return MODE_LIST;
    case 'columns':
      return MODE_COLUMNS;
    case 'gallery':
      return MODE_GALLERY;
  }
}

function renderViewModeIcon(mode: FileViewModeId) {
  switch (mode) {
    case 'grid':
      return <LayoutGrid aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'list':
      return <List aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'columns':
      return <Columns3 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'gallery':
      return <GalleryHorizontal aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

function getFileKindMeta(kind: FileViewSampleItem['kind']): FileKindMeta {
  switch (kind) {
    case 'image':
      return { label: 'Image', badge: 'IMG', accentVar: 'var(--prism-success-main)' };
    case 'code':
      return { label: 'Code', badge: 'CODE', accentVar: 'var(--prism-info-main)' };
    case 'document':
      return { label: 'Document', badge: 'DOC', accentVar: 'var(--prism-secondary-dark)' };
    case 'audio':
      return { label: 'Audio', badge: 'AUDIO', accentVar: 'var(--prism-primary-main)' };
  }
}

function renderFileKindIcon(
  kind: FileViewSampleItem['kind'],
  className: string,
  sizePx?: number
) {
  const meta = getFileKindMeta(kind);
  const iconStyle =
    sizePx !== undefined
      ? { color: meta.accentVar, width: `${sizePx}px`, height: `${sizePx}px` }
      : { color: meta.accentVar };

  switch (kind) {
    case 'image':
      return <FileImage aria-hidden="true" className={className} style={iconStyle} />;
    case 'code':
      return <FileCode aria-hidden="true" className={className} style={iconStyle} />;
    case 'document':
      return <FileText aria-hidden="true" className={className} style={iconStyle} />;
    case 'audio':
      return <FileAudio aria-hidden="true" className={className} style={iconStyle} />;
  }
}

function sanitizeFinitePositive(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }
  return value;
}

function resolveZoomBounds(
  minZoomPx: number | undefined,
  maxZoomPx: number | undefined,
  stepZoomPx: number | undefined
): ResolvedZoomBounds {
  const rawMin = sanitizeFinitePositive(minZoomPx, DEFAULT_MIN_ZOOM_PX);
  const rawMax = sanitizeFinitePositive(maxZoomPx, DEFAULT_MAX_ZOOM_PX);
  const clampedA = Math.min(ABSOLUTE_MAX_ZOOM_PX, Math.max(ABSOLUTE_MIN_ZOOM_PX, Math.round(rawMin)));
  const clampedB = Math.min(ABSOLUTE_MAX_ZOOM_PX, Math.max(ABSOLUTE_MIN_ZOOM_PX, Math.round(rawMax)));
  const min = Math.min(clampedA, clampedB);
  const max = Math.max(clampedA, clampedB);
  const rawStep = sanitizeFinitePositive(stepZoomPx, DEFAULT_STEP_ZOOM_PX);
  const step = Math.max(1, Math.round(rawStep));

  return { min, max, step };
}

function clampZoomPx(value: number | undefined, bounds: ResolvedZoomBounds): number {
  const candidate =
    typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : DEFAULT_ZOOM_PX;
  return Math.min(bounds.max, Math.max(bounds.min, candidate));
}

function buildIndexedItems(items: ReadonlyArray<FileViewSampleItem>): ReadonlyArray<IndexedFileItem> {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const count = seen.get(item.id) ?? 0;
    seen.set(item.id, count + 1);
    return {
      key: count === 0 ? item.id : `${item.id}~${count + 1}`,
      item,
    };
  });
}

function FileViewModeBarInner({
  viewMode,
  defaultViewMode = DEFAULT_VIEW_MODE,
  zoomPx,
  defaultZoomPx = DEFAULT_ZOOM_PX,
  minZoomPx = DEFAULT_MIN_ZOOM_PX,
  maxZoomPx = DEFAULT_MAX_ZOOM_PX,
  stepZoomPx = DEFAULT_STEP_ZOOM_PX,
  items,
  showPreviewStage = false,
  onViewModeChange,
  onZoomChange,
  disabled = false,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: FileViewModeBarProps) {
  const override = useComponentOverride('FileViewModeBar');

  const bounds = useMemo(
    () => resolveZoomBounds(minZoomPx, maxZoomPx, stepZoomPx),
    [minZoomPx, maxZoomPx, stepZoomPx]
  );

  const [uncontrolledMode, setUncontrolledMode] = useState<FileViewModeId>(defaultViewMode);
  const isModeControlled = viewMode !== undefined;
  const activeMode: FileViewModeId = isModeControlled ? viewMode : uncontrolledMode;

  const [uncontrolledZoom, setUncontrolledZoom] = useState<number>(() =>
    clampZoomPx(defaultZoomPx, bounds)
  );
  const isZoomControlled = zoomPx !== undefined;
  const activeZoom = clampZoomPx(isZoomControlled ? zoomPx : uncontrolledZoom, bounds);

  const sourceItems = items ?? DEFAULT_SAMPLE_ITEMS;
  const indexedItems = useMemo(() => buildIndexedItems(sourceItems), [sourceItems]);

  const [selectedGalleryKey, setSelectedGalleryKey] = useState<string | null>(
    () => indexedItems[0]?.key ?? null
  );

  const activeGalleryEntry = useMemo<IndexedFileItem | null>(() => {
    const first = indexedItems[0];
    if (!first) return null;
    return indexedItems.find((entry) => entry.key === selectedGalleryKey) ?? first;
  }, [indexedItems, selectedGalleryKey]);

  const radioRefs = useRef<Map<FileViewModeId, HTMLButtonElement>>(new Map());

  const registerRadioRef = useCallback(
    (modeId: FileViewModeId) => (element: HTMLButtonElement | null) => {
      if (element) {
        radioRefs.current.set(modeId, element);
      } else {
        radioRefs.current.delete(modeId);
      }
    },
    []
  );

  const commitViewMode = useCallback(
    (nextMode: FileViewModeId) => {
      if (nextMode === activeMode) return;
      if (!isModeControlled) {
        setUncontrolledMode(nextMode);
      }
      onViewModeChange?.(nextMode);
    },
    [activeMode, isModeControlled, onViewModeChange]
  );

  const commitZoom = useCallback(
    (rawNext: number) => {
      if (disabled) return;
      const nextZoom = clampZoomPx(rawNext, bounds);
      if (nextZoom === activeZoom) return;
      if (!isZoomControlled) {
        setUncontrolledZoom(nextZoom);
      }
      onZoomChange?.(nextZoom);
    },
    [activeZoom, bounds, disabled, isZoomControlled, onZoomChange]
  );

  const handleRadioKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (disabled || event.nativeEvent.isComposing) return;

      let nextIndex: number;
      if (event.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % VIEW_MODE_OPTIONS.length;
      } else if (event.key === 'ArrowLeft') {
        nextIndex = (currentIndex - 1 + VIEW_MODE_OPTIONS.length) % VIEW_MODE_OPTIONS.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = VIEW_MODE_OPTIONS.length - 1;
      } else {
        return;
      }

      event.preventDefault();
      const target = getViewModeAtIndex(nextIndex);
      commitViewMode(target.id);
      radioRefs.current.get(target.id)?.focus();
    },
    [commitViewMode, disabled]
  );

  const handleZoomOut = useCallback(() => {
    commitZoom(activeZoom - bounds.step);
  }, [activeZoom, bounds.step, commitZoom]);

  const handleZoomIn = useCallback(() => {
    commitZoom(activeZoom + bounds.step);
  }, [activeZoom, bounds.step, commitZoom]);

  const handleZoomSliderChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      commitZoom(Number(event.target.value));
    },
    [commitZoom]
  );

  const canZoomOut = !disabled && activeZoom > bounds.min;
  const canZoomIn = !disabled && activeZoom < bounds.max;
  const activeModeOption = getViewModeOption(activeMode);
  const fileCountLabel = `${indexedItems.length} ${indexedItems.length === 1 ? 'file' : 'files'}`;

  const statusAnnouncement =
    showPreviewStage && activeMode === 'gallery' && activeGalleryEntry
      ? `View mode: ${activeModeOption.label} · Thumbnail size: ${activeZoom}px · Selected: ${activeGalleryEntry.item.name}`
      : `View mode: ${activeModeOption.label} · Thumbnail size: ${activeZoom}px · ${fileCountLabel}`;

  const merged = mergeProps({
    themeTarget: themeProps('file-view-mode-bar', {
      viewMode: activeMode,
      zoomPx: activeZoom,
      previewOpen: showPreviewStage,
      disabled,
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 flex flex-col gap-3.5 p-3.5 sm:p-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const controlsClass = stableClassName('file-view-mode-bar', 'controls');
  const radiogroupClass = stableClassName('file-view-mode-bar', 'radiogroup');
  const optionClass = stableClassName('file-view-mode-bar', 'option');
  const zoomClass = stableClassName('file-view-mode-bar', 'zoom');
  const stageClass = stableClassName('file-view-mode-bar', 'stage');
  const statusClass = stableClassName('file-view-mode-bar', 'status');

  const gridThumbIconSize = Math.max(18, Math.round(activeZoom * 0.36));
  const filmstripThumbHeight = Math.max(36, Math.round(activeZoom * 0.72));
  const filmstripIconSize = Math.max(16, Math.round(activeZoom * 0.3));

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel ?? 'File view mode controls'}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
    >
      {/* Top Control Bar: View Mode Segmented Radio Group + Thumbnail Zoom Bar */}
      <div
        data-testid="file-view-mode-controls"
        className={cx(
          controlsClass,
          'flex flex-wrap items-center justify-between gap-3 min-w-0 max-w-full'
        )}
      >
        <div
          role="radiogroup"
          aria-label="File view mode"
          aria-disabled={disabled ? 'true' : undefined}
          data-testid="file-view-mode-radiogroup"
          className={cx(
            radiogroupClass,
            'prism-well p-1 rounded-2xl inline-flex flex-wrap items-center gap-1 min-w-0 max-w-full'
          )}
        >
          {VIEW_MODE_OPTIONS.map((option, index) => {
            const isSelected = activeMode === option.id;
            return (
              <button
                key={option.id}
                ref={registerRadioRef(option.id)}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                tabIndex={disabled ? -1 : isSelected ? 0 : -1}
                data-testid={`file-view-mode-${option.id}`}
                data-selected={isSelected ? 'true' : undefined}
                onClick={() => commitViewMode(option.id)}
                onKeyDown={(event) => handleRadioKeyDown(event, index)}
                className={cx(
                  optionClass,
                  'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                  isSelected
                    ? 'prism-btn-primary font-semibold'
                    : 'font-medium enabled:hover:bg-[var(--prism-divider)]'
                )}
                style={isSelected ? undefined : { color: 'var(--prism-text-secondary)' }}
              >
                <span className="relative z-10 inline-flex items-center gap-1.5">
                  {renderViewModeIcon(option.id)}
                  <span>{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Thumbnail zoom controls"
          data-testid="file-view-zoom-controls"
          className={cx(
            zoomClass,
            'prism-well rounded-2xl px-2 py-1 inline-flex flex-wrap items-center gap-2 min-w-0 max-w-full'
          )}
        >
          <button
            type="button"
            aria-label="Zoom out"
            data-testid="file-view-zoom-out"
            disabled={!canZoomOut}
            onClick={handleZoomOut}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_PRIMARY}
          >
            <Minus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </button>

          <input
            type="range"
            aria-label="Thumbnail zoom size"
            aria-valuemin={bounds.min}
            aria-valuemax={bounds.max}
            aria-valuenow={activeZoom}
            aria-valuetext={`${activeZoom}px`}
            data-testid="file-view-zoom-slider"
            min={bounds.min}
            max={bounds.max}
            step={bounds.step}
            value={activeZoom}
            disabled={disabled}
            onChange={handleZoomSliderChange}
            className="prism-focus-ring w-28 sm:w-32 h-2 rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ accentColor: 'var(--prism-primary-main)' }}
          />

          <button
            type="button"
            aria-label="Zoom in"
            data-testid="file-view-zoom-in"
            disabled={!canZoomIn}
            onClick={handleZoomIn}
            className="prism-crystal prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-opacity"
            style={STYLE_TEXT_PRIMARY}
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </button>

          <span
            data-testid="file-view-zoom-badge"
            className="prism-crystal rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {activeZoom}px
          </span>
        </div>
      </div>

      {/* Optional Live Multi-Mode Preview Stage */}
      {showPreviewStage ? (
        <div
          data-testid="file-view-preview-stage"
          data-view-mode={activeMode}
          className={cx(stageClass, 'prism-well rounded-2xl p-3 sm:p-4 min-w-0 max-w-full')}
        >
          {activeGalleryEntry === null ? (
            <div
              data-testid="file-view-preview-empty"
              className="py-8 px-4 flex flex-col items-center justify-center text-center gap-1.5 min-w-0"
              style={STYLE_TEXT_SECONDARY}
            >
              <Inbox aria-hidden="true" className="w-5 h-5 shrink-0 opacity-75" />
              <p className="m-0 text-xs font-semibold" style={STYLE_TEXT_PRIMARY}>
                No files to preview
              </p>
              <p className="m-0 text-xs">
                Provide file items to preview them across Icon Grid, Compact List, Detailed Columns,
                and Gallery modes.
              </p>
            </div>
          ) : activeMode === 'grid' ? (
            <div
              data-testid="file-view-stage-grid"
              className="grid gap-3 min-w-0 max-w-full"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(activeZoom + 48, 112)}px, 1fr))`,
              }}
            >
              {indexedItems.map((entry) => {
                const meta = getFileKindMeta(entry.item.kind);
                return (
                  <div
                    key={entry.key}
                    data-testid={`file-view-grid-card-${entry.key}`}
                    className="prism-crystal rounded-2xl p-3 flex flex-col items-center gap-2 min-w-0"
                  >
                    <div
                      data-testid={`file-view-grid-thumb-${entry.key}`}
                      className="rounded-xl border flex flex-col items-center justify-center gap-1.5 shrink-0 max-w-full transition-[color,background-color,border-color,opacity,transform] duration-150"
                      style={{
                        width: `${activeZoom}px`,
                        height: `${activeZoom}px`,
                        borderColor: 'var(--prism-divider)',
                        backgroundColor: `color-mix(in srgb, ${meta.accentVar} 14%, transparent)`,
                      }}
                    >
                      {renderFileKindIcon(entry.item.kind, 'shrink-0', gridThumbIconSize)}
                      <span
                        className="font-mono text-[10px] font-semibold tracking-wider"
                        style={{ color: meta.accentVar }}
                      >
                        {meta.badge}
                      </span>
                    </div>

                    <div className="w-full min-w-0 text-center flex flex-col gap-0.5">
                      <span
                        className="text-xs font-semibold truncate block"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {entry.item.name}
                      </span>
                      <span
                        className="font-mono text-[11px] tabular-nums truncate block"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {entry.item.sizeLabel} · {entry.item.modifiedAt}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : activeMode === 'list' ? (
            <ul
              data-testid="file-view-stage-list"
              className="m-0 p-0 list-none flex flex-col divide-y divide-[var(--prism-divider)] min-w-0 max-w-full"
            >
              {indexedItems.map((entry) => {
                const meta = getFileKindMeta(entry.item.kind);
                return (
                  <li
                    key={entry.key}
                    data-testid={`file-view-list-row-${entry.key}`}
                    className="py-2 px-2.5 flex items-center justify-between gap-3 min-w-0"
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      {renderFileKindIcon(entry.item.kind, 'w-4 h-4 shrink-0')}
                      <span
                        className="text-xs font-medium truncate min-w-0"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {entry.item.name}
                      </span>
                    </span>

                    <span className="flex items-center gap-2 shrink-0">
                      <span
                        className="font-mono text-[10px] font-semibold uppercase"
                        style={{ color: meta.accentVar }}
                      >
                        {meta.badge}
                      </span>
                      <span
                        className="prism-crystal rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums whitespace-nowrap"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {entry.item.sizeLabel}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : activeMode === 'columns' ? (
            <div className="overflow-x-auto">
              <table
                data-testid="file-view-stage-columns"
                className="w-full border-collapse text-left text-xs min-w-[440px]"
              >
                <thead>
                  <tr
                    style={{
                      borderBottomWidth: '1px',
                      borderBottomStyle: 'solid',
                      borderBottomColor: 'var(--prism-divider)',
                      color: 'var(--prism-text-secondary)',
                    }}
                  >
                    <th scope="col" className="py-2 px-3 font-semibold whitespace-nowrap">
                      Name
                    </th>
                    <th scope="col" className="py-2 px-3 font-semibold whitespace-nowrap">
                      Kind
                    </th>
                    <th
                      scope="col"
                      className="py-2 px-3 font-semibold whitespace-nowrap text-right"
                    >
                      Size
                    </th>
                    <th
                      scope="col"
                      className="py-2 px-3 font-semibold whitespace-nowrap text-right"
                    >
                      Modified
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {indexedItems.map((entry) => {
                    const meta = getFileKindMeta(entry.item.kind);
                    return (
                      <tr
                        key={entry.key}
                        data-testid={`file-view-columns-row-${entry.key}`}
                        style={{
                          borderBottomWidth: '1px',
                          borderBottomStyle: 'solid',
                          borderBottomColor: 'var(--prism-divider)',
                        }}
                      >
                        <td
                          className="py-2 px-3 font-medium whitespace-nowrap"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          <span className="inline-flex items-center gap-2 min-w-0">
                            {renderFileKindIcon(entry.item.kind, 'w-3.5 h-3.5 shrink-0')}
                            <span>{entry.item.name}</span>
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className="prism-crystal inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold"
                            style={{ color: meta.accentVar }}
                          >
                            {meta.label}
                          </span>
                        </td>
                        <td
                          className="py-2 px-3 font-mono tabular-nums whitespace-nowrap text-right"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {entry.item.sizeLabel}
                        </td>
                        <td
                          className="py-2 px-3 font-mono tabular-nums whitespace-nowrap text-right"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {entry.item.modifiedAt}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div data-testid="file-view-stage-gallery" className="flex flex-col gap-3 min-w-0">
              {/* Spotlight Preview */}
              {(() => {
                const activeMeta = getFileKindMeta(activeGalleryEntry.item.kind);
                return (
                  <div
                    data-testid="file-view-gallery-spotlight"
                    data-active-item-id={activeGalleryEntry.item.id}
                    className="prism-crystal rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-3 text-center min-w-0 max-w-full"
                  >
                    <div
                      className="w-full min-h-[144px] rounded-xl border flex flex-col items-center justify-center gap-2.5 p-4"
                      style={{
                        borderColor: 'var(--prism-divider)',
                        backgroundColor: `color-mix(in srgb, ${activeMeta.accentVar} 14%, transparent)`,
                      }}
                    >
                      {renderFileKindIcon(activeGalleryEntry.item.kind, 'w-12 h-12 shrink-0')}
                      <span
                        className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold"
                        style={{ color: activeMeta.accentVar }}
                      >
                        {activeMeta.label}
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1 min-w-0 max-w-full">
                      <span
                        data-testid="file-view-gallery-spotlight-name"
                        className="text-sm font-semibold truncate max-w-full"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {activeGalleryEntry.item.name}
                      </span>
                      <span
                        data-testid="file-view-gallery-spotlight-meta"
                        className="font-mono text-xs tabular-nums"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {activeGalleryEntry.item.sizeLabel} · {activeGalleryEntry.item.modifiedAt}
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Clickable Horizontal Filmstrip scaled by zoomPx */}
              <div
                role="group"
                aria-label="Gallery filmstrip"
                data-testid="file-view-gallery-filmstrip"
                className="overflow-x-auto flex items-stretch gap-2.5 pb-1 min-w-0 max-w-full"
              >
                {indexedItems.map((entry) => {
                  const isSelected = entry.key === activeGalleryEntry.key;
                  const meta = getFileKindMeta(entry.item.kind);
                  return (
                    <button
                      key={entry.key}
                      type="button"
                      aria-pressed={isSelected}
                      disabled={disabled}
                      data-testid={`file-view-gallery-item-${entry.key}`}
                      onClick={() => setSelectedGalleryKey(entry.key)}
                      className={cx(
                        'prism-focus-ring rounded-xl p-1.5 border flex flex-col items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                        isSelected ? 'prism-crystal' : 'prism-well'
                      )}
                      style={{
                        borderColor: isSelected
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-divider)',
                      }}
                    >
                      <span
                        data-testid={`file-view-gallery-thumb-${entry.key}`}
                        className="rounded-lg flex items-center justify-center shrink-0 transition-[color,background-color,border-color,opacity,transform] duration-150"
                        style={{
                          width: `${activeZoom}px`,
                          height: `${filmstripThumbHeight}px`,
                          backgroundColor: `color-mix(in srgb, ${meta.accentVar} 16%, transparent)`,
                        }}
                      >
                        {renderFileKindIcon(entry.item.kind, 'shrink-0', filmstripIconSize)}
                      </span>
                      <span
                        className="text-[11px] font-medium truncate text-center"
                        style={{
                          width: `${activeZoom}px`,
                          color: isSelected
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-text-secondary)',
                        }}
                      >
                        {entry.item.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* Polite Live Status Announcement */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="file-view-status"
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums min-w-0 max-w-full'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        <span className="truncate min-w-0">{statusAnnouncement}</span>
        <span className="shrink-0">
          {bounds.min}–{bounds.max}px
        </span>
      </div>
    </div>
  );
}

export const FileViewModeBar = memo(FileViewModeBarInner);
FileViewModeBar.displayName = 'FileViewModeBar';
