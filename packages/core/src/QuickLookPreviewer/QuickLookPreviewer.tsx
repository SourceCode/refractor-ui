'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  FileAudio,
  FileCode2,
  FileImage,
  FileText,
  FolderOpen,
  Pause,
  Play,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SUCCESS_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type QuickLookMediaKind = 'image' | 'pdf' | 'audio' | 'code';

export type QuickLookDisplayMode = 'modal' | 'inline';

export interface QuickLookFileItem {
  /** Unique identifier for the file item. */
  id: string;
  /** File name displayed in the strip, preview header, and live metadata footer. */
  name: string;
  /** Asset category determining the tailored optical preview surface. */
  kind: QuickLookMediaKind;
  /** Human-readable file size badge (e.g. '4.8 MB'). */
  sizeLabel: string;
  /** Optional dimensions, page count, audio specs, or text encoding metadata. */
  dimensionsOrMeta?: string;
  /** Optional image source URL validated strictly via sanitizeUrl(src, true). */
  src?: string;
  /** Optional literal text content rendered safely in PDF or code previews. */
  content?: string;
  /** Optional programming language badge for code previews. */
  language?: string;
}

export interface QuickLookPreviewerProps extends BaseProps<HTMLDivElement> {
  /** Files to inspect; omits to 4 rich sample assets or renders a clean role="status" empty state when []. */
  files?: ReadonlyArray<QuickLookFileItem>;
  /** Controlled zero-based index of the active file. */
  activeIndex?: number;
  /** Uncontrolled initial zero-based index of the active file (defaults to 0). */
  defaultActiveIndex?: number;
  /** Display mode: 'modal' renders a Spacebar/click file strip + modal dialog; 'inline' renders the panel directly. */
  mode?: QuickLookDisplayMode;
  /** Controlled modal open state (applies to 'modal' mode). */
  open?: boolean;
  /** Uncontrolled initial modal open state (defaults to false in 'modal' mode). */
  defaultOpen?: boolean;
  /** Callback fired whenever modal visibility changes. */
  onOpenChange?: (open: boolean) => void;
  /** Callback fired whenever the active file changes via selection, Prev/Next, or keyboard arrows. */
  onActiveIndexChange?: (index: number, file: QuickLookFileItem) => void;
  /** Callback fired when the user clicks the Open in Editor action. */
  onOpenExternal?: (file: QuickLookFileItem) => void;
}

interface KindVisualMeta {
  label: string;
  accentVar: string;
}

interface WaveformBarItem {
  id: string;
  x: number;
  y: number;
  height: number;
  isAccent: boolean;
}

interface IndexedTextLine {
  id: string;
  lineNumber: number;
  text: string;
}

const KIND_META: Record<QuickLookMediaKind, KindVisualMeta> = {
  image: { label: 'Image', accentVar: 'var(--prism-primary-main)' },
  pdf: { label: 'PDF', accentVar: 'var(--prism-error-main)' },
  audio: { label: 'Audio', accentVar: 'var(--prism-success-main)' },
  code: { label: 'Code', accentVar: 'var(--prism-info-main)' },
};

const AUDIO_BASE_AMPS: readonly number[] = [
  0.26, 0.42, 0.68, 0.54, 0.82, 0.94, 0.62, 0.48,
  0.76, 0.88, 0.58, 0.36, 0.72, 0.96, 0.84, 0.64,
  0.5, 0.78, 0.9, 0.66, 0.44, 0.74, 0.86, 0.6,
  0.38, 0.56, 0.8, 0.7, 0.46, 0.62, 0.4, 0.28,
];

const DEFAULT_PDF_FALLBACK_CONTENT = [
  'Optical Document Preview',
  'Page surface synthesized with cascade --prism-* tokens and crisp typographic contrast.',
  'Use Open in Editor to inspect full multi-page bookmarks and embedded vector annotations.',
].join('\n');

const DEFAULT_CODE_FALLBACK_CONTENT = '// No source text supplied for this file preview.';

const DEFAULT_QUICK_LOOK_FILES: ReadonlyArray<QuickLookFileItem> = [
  {
    id: 'ql-prism-poster',
    name: 'Prism_Poster.png',
    kind: 'image',
    sizeLabel: '4.8 MB',
    dimensionsOrMeta: '3840 × 2160 · Display P3',
  },
  {
    id: 'ql-architecture-spec',
    name: 'Architecture_Spec.pdf',
    kind: 'pdf',
    sizeLabel: '1.4 MB',
    dimensionsOrMeta: '12 pages · PDF/A-2b',
    content: [
      'REFRACTOR OPTICAL GLASS UI KIT — ARCHITECTURE SPECIFICATION',
      '1. Cascade Optical Token System',
      'Every refractive slab, recessed well, and crystal bezel derives exclusively from --prism-* custom properties.',
      'Dual warm/cool caustic shadows and specular rim highlights adapt seamlessly across light and dark modes.',
      '2. Open-Internals Component Contract',
      'Components accept React 19 ref props, extend BaseProps, emit stable refractor-* classes, and preserve consumer overrides.',
    ].join('\n'),
  },
  {
    id: 'ql-ambient-master',
    name: 'Ambient_Master.wav',
    kind: 'audio',
    sizeLabel: '28.6 MB',
    dimensionsOrMeta: '03:42 · 24-bit / 96 kHz',
  },
  {
    id: 'ql-theme-engine',
    name: 'themeEngine.ts',
    kind: 'code',
    sizeLabel: '6.2 KB',
    dimensionsOrMeta: 'TypeScript · UTF-8',
    language: 'typescript',
    content: [
      "import { createPrismTheme } from '@refractor-ui/core/theme';",
      '',
      'export interface PrismSurfacePreset {',
      "  readonly mode: 'light' | 'dark';",
      "  readonly refraction: 'subtle' | 'standard' | 'vivid';",
      '}',
      '',
      'export function buildOpticalPreset(preset: PrismSurfacePreset) {',
      '  return createPrismTheme(preset.mode, preset.refraction);',
      '}',
    ].join('\n'),
  },
];

function isSpaceKey(key: string): boolean {
  return key === ' ' || key === 'Spacebar';
}

function getPdfPageBadge(dimensionsOrMeta?: string): string {
  if (dimensionsOrMeta) {
    const match = /(\d+)\s*pages?/i.exec(dimensionsOrMeta);
    if (match?.[1]) {
      return `Page 1 of ${match[1]}`;
    }
  }
  return 'Page 1';
}

function toIndexedLines(prefix: string, rawText: string): IndexedTextLine[] {
  const split = rawText.split('\n');
  const lines: IndexedTextLine[] = [];
  let lineNumber = 1;
  for (const text of split) {
    lines.push({ id: `${prefix}-ln-${lineNumber}`, lineNumber, text });
    lineNumber += 1;
  }
  return lines;
}

function buildWaveformBars(fileId: string, playing: boolean): WaveformBarItem[] {
  let seed = 0;
  for (let i = 0; i < fileId.length; i += 1) {
    seed += fileId.charCodeAt(i);
  }
  const bars: WaveformBarItem[] = [];
  const barWidth = 9;
  const gap = 5.5;
  const startX = 12;
  const maxBarHeight = 92;
  const centerY = 60;
  const splitIdx = playing ? 18 : 8;
  let i = 0;

  for (const baseAmp of AUDIO_BASE_AMPS) {
    const waveMod = 0.86 + 0.14 * Math.sin(i * 0.9 + seed * 0.35);
    const height = Math.max(14, Math.round(baseAmp * waveMod * maxBarHeight));
    bars.push({
      id: `${fileId}-bar-${i}`,
      x: Math.round((startX + i * (barWidth + gap)) * 10) / 10,
      height,
      y: Math.round((centerY - height / 2) * 10) / 10,
      isAccent: i < splitIdx,
    });
    i += 1;
  }
  return bars;
}

function KindIcon({ kind, className }: { kind: QuickLookMediaKind; className?: string }) {
  switch (kind) {
    case 'image':
      return <FileImage className={className} aria-hidden="true" />;
    case 'pdf':
      return <FileText className={className} aria-hidden="true" />;
    case 'audio':
      return <FileAudio className={className} aria-hidden="true" />;
    case 'code':
      return <FileCode2 className={className} aria-hidden="true" />;
  }
}

interface OpticalPosterFallbackProps {
  fileName: string;
  gradientPrefix: string;
  isActualSize: boolean;
}

function OpticalPosterFallback({
  fileName,
  gradientPrefix,
  isActualSize,
}: OpticalPosterFallbackProps) {
  const bgGradId = `${gradientPrefix}-poster-bg`;
  const causticWarmId = `${gradientPrefix}-poster-warm`;
  const causticCoolId = `${gradientPrefix}-poster-cool`;

  return (
    <div
      data-testid="quicklook-image-fallback"
      data-zoom-mode={isActualSize ? '100%' : 'fit'}
      className={cx(
        'prism-studio-surface relative rounded-xl overflow-hidden flex items-center justify-center transition-transform duration-150',
        isActualSize ? 'w-[768px] h-[432px] shrink-0' : 'w-full max-w-[540px] aspect-video'
      )}
      style={{ border: '1px solid var(--prism-well-border)' }}
    >
      <svg
        viewBox="0 0 640 360"
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${fileName} optical vector preview`}
        className="w-full h-full block prism-contain-box"
      >
        <defs>
          <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--prism-info-dark)" stopOpacity={0.86} />
            <stop offset="52%" stopColor="var(--prism-secondary-dark)" stopOpacity={0.62} />
            <stop offset="100%" stopColor="var(--prism-primary-dark)" stopOpacity={0.8} />
          </linearGradient>
          <radialGradient id={causticWarmId} cx="72%" cy="28%" r="48%">
            <stop offset="0%" stopColor="var(--prism-primary-light)" stopOpacity={0.88} />
            <stop offset="55%" stopColor="var(--prism-primary-main)" stopOpacity={0.34} />
            <stop offset="100%" stopColor="var(--prism-primary-main)" stopOpacity={0} />
          </radialGradient>
          <radialGradient id={causticCoolId} cx="26%" cy="74%" r="48%">
            <stop offset="0%" stopColor="var(--prism-secondary-main)" stopOpacity={0.76} />
            <stop offset="60%" stopColor="var(--prism-success-main)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--prism-info-main)" stopOpacity={0} />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="640" height="360" fill={`url(#${bgGradId})`} />
        <rect x="0" y="0" width="640" height="360" fill={`url(#${causticWarmId})`} />
        <rect x="0" y="0" width="640" height="360" fill={`url(#${causticCoolId})`} />

        <circle
          cx="320"
          cy="180"
          r="116"
          fill="none"
          stroke="var(--prism-secondary-light)"
          strokeOpacity={0.44}
          strokeWidth="1.5"
        />
        <circle
          cx="320"
          cy="180"
          r="84"
          fill="none"
          stroke="var(--prism-primary-light)"
          strokeOpacity={0.58}
          strokeWidth="1.5"
          strokeDasharray="6 6"
        />
        <polygon
          points="320,58 412,180 320,302 228,180"
          fill="var(--prism-secondary-main)"
          fillOpacity={0.24}
          stroke="var(--prism-primary-contrast)"
          strokeOpacity={0.72}
          strokeWidth="2"
        />
        <polygon
          points="320,104 374,180 320,256 266,180"
          fill="var(--prism-primary-light)"
          fillOpacity={0.32}
          stroke="var(--prism-secondary-light)"
          strokeOpacity={0.68}
          strokeWidth="1.5"
        />
      </svg>

      <span
        className="prism-crystal pointer-events-none absolute bottom-3 left-3 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold tracking-tight max-w-[80%] truncate"
        style={STYLE_TEXT_PRIMARY}
      >
        {fileName}
      </span>
    </div>
  );
}

const stripClass = /*#__PURE__*/ stableClassName('quick-look-previewer', 'strip');
const backdropClass = /*#__PURE__*/ stableClassName('quick-look-previewer', 'backdrop');
const panelClass = /*#__PURE__*/ stableClassName('quick-look-previewer', 'panel');
const headerClass = /*#__PURE__*/ stableClassName('quick-look-previewer', 'header');
const stageClass = /*#__PURE__*/ stableClassName('quick-look-previewer', 'stage');
const metadataClass = /*#__PURE__*/ stableClassName('quick-look-previewer', 'metadata');

function QuickLookPreviewerInner({
  files,
  activeIndex,
  defaultActiveIndex = 0,
  mode = 'modal',
  open,
  defaultOpen = false,
  onOpenChange,
  onActiveIndexChange,
  onOpenExternal,
  className,
  style,
  xstyle,
  onKeyDown,
  ref,
  ...rest
}: QuickLookPreviewerProps) {
  const dialogTitleId = useId();
  const stripHeadingId = useId();
  const gradientPrefix = useId();
  const override = useComponentOverride('QuickLookPreviewer');

  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpenRef = useRef<boolean>(false);

  const resolvedFiles = files ?? DEFAULT_QUICK_LOOK_FILES;
  const resolvedMode: QuickLookDisplayMode = mode === 'inline' ? 'inline' : 'modal';
  const fileCount = resolvedFiles.length;

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [rawIndex, setRawIndex] = useControllableState<number>({
    value: activeIndex,
    defaultValue: defaultActiveIndex,
  });

  const [isActualSize, setIsActualSize] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);

  const safeIndex =
    fileCount > 0 ? Math.round(clampNumber(rawIndex, 0, fileCount - 1, 0)) : 0;
  const activeFile = resolvedFiles[safeIndex];
  const activeFileId = activeFile?.id ?? '';

  useEffect(() => {
    setIsActualSize(false);
    setIsAudioPlaying(false);
  }, [activeFileId, isOpen]);

  useEffect(() => {
    const modalVisible = resolvedMode === 'modal' && isOpen && fileCount > 0;
    if (modalVisible && !wasOpenRef.current) {
      dialogRef.current?.focus({ preventScroll: true });
    }
    wasOpenRef.current = modalVisible;
  }, [fileCount, isOpen, resolvedMode]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, [setIsOpen]);

  const handleOpen = useCallback(() => {
    setIsOpen(true);
  }, [setIsOpen]);

  const selectIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.round(clampNumber(nextIndex, 0, Math.max(0, fileCount - 1), 0));
      if (clamped === safeIndex) return;
      const targetFile = resolvedFiles[clamped];
      if (!targetFile) return;
      setRawIndex(clamped);
      onActiveIndexChange?.(clamped, targetFile);
    },
    [fileCount, onActiveIndexChange, resolvedFiles, safeIndex, setRawIndex]
  );

  const goPrev = useCallback(() => {
    if (fileCount <= 1) return;
    selectIndex((safeIndex - 1 + fileCount) % fileCount);
  }, [fileCount, safeIndex, selectIndex]);

  const goNext = useCallback(() => {
    if (fileCount <= 1) return;
    selectIndex((safeIndex + 1) % fileCount);
  }, [fileCount, safeIndex, selectIndex]);

  useEffect(() => {
    if (resolvedMode !== 'modal' || !isOpen || fileCount === 0) return;

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (isSpaceKey(event.key)) {
        const target = event.target;
        const isInsideDialogControl =
          target instanceof HTMLElement &&
          dialogRef.current !== null &&
          dialogRef.current.contains(target) &&
          target.closest('button, a, input, textarea, select') !== null;

        if (!isInsideDialogControl) {
          event.preventDefault();
          handleClose();
        }
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [fileCount, goNext, goPrev, handleClose, isOpen, resolvedMode]);

  const handleRootKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented || event.nativeEvent.isComposing || fileCount === 0) return;

      if (resolvedMode === 'inline') {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goPrev();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          goNext();
        }
        return;
      }

      if (!isOpen) {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          goPrev();
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          goNext();
        } else if (isSpaceKey(event.key)) {
          const target = event.target;
          const isButton = target instanceof HTMLElement && target.closest('button') !== null;
          if (!isButton) {
            event.preventDefault();
            handleOpen();
          }
        }
      }
    },
    [fileCount, goNext, goPrev, handleOpen, isOpen, onKeyDown, resolvedMode]
  );

  const handleCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, idx: number) => {
      if (event.nativeEvent.isComposing) return;

      if (isSpaceKey(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        selectIndex(idx);
        handleOpen();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        event.stopPropagation();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopPropagation();
        goPrev();
      }
    },
    [goNext, goPrev, handleOpen, selectIndex]
  );

  const waveformBars = useMemo<WaveformBarItem[]>(() => {
    if (!activeFile || activeFile.kind !== 'audio') return [];
    return buildWaveformBars(activeFile.id, isAudioPlaying);
  }, [activeFile, isAudioPlaying]);

  const pdfLines = useMemo<IndexedTextLine[]>(() => {
    if (!activeFile || activeFile.kind !== 'pdf') return [];
    return toIndexedLines(activeFile.id, activeFile.content ?? DEFAULT_PDF_FALLBACK_CONTENT);
  }, [activeFile]);

  const codeText = useMemo<string>(() => {
    if (!activeFile || activeFile.kind !== 'code') return '';
    return activeFile.content ?? DEFAULT_CODE_FALLBACK_CONTENT;
  }, [activeFile]);

  const codeLines = useMemo<IndexedTextLine[]>(() => {
    if (!activeFile || activeFile.kind !== 'code') return [];
    return toIndexedLines(activeFile.id, codeText);
  }, [activeFile, codeText]);


  const merged = mergeProps({
    themeTarget: themeProps('quick-look-previewer', {
      mode: resolvedMode,
      open: fileCount > 0 && (resolvedMode === 'inline' || isOpen),
      kind: activeFile?.kind,
      empty: fileCount === 0,
    }),
    baseClassName: cx(
      'w-full max-w-full min-w-0 flex flex-col gap-3',
      fileCount === 0 || resolvedMode === 'inline' ? 'prism-slab p-4 sm:p-5' : undefined
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  if (!activeFile) {
    return (
      <div ref={ref} onKeyDown={handleRootKeyDown} {...rest} {...merged}>
        <div
          role="status"
          data-testid="quicklook-empty"
          className="prism-well rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 min-w-0 max-w-full"
        >
          <span
            aria-hidden="true"
            className="prism-crystal w-10 h-10 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            <FolderOpen className="w-5 h-5" />
          </span>
          <p
            className="text-sm font-semibold tracking-tight"
            style={STYLE_TEXT_PRIMARY}
          >
            No files to preview
          </p>
          <p
            className="text-xs max-w-sm leading-relaxed"
            style={STYLE_TEXT_SECONDARY}
          >
            Provide one or more file items to inspect images, PDF documents, audio waveforms, or source code with Quick Look.
          </p>
        </div>
      </div>
    );
  }

  const activeKindMeta = KIND_META[activeFile.kind];
  const safeImageSrc =
    activeFile.kind === 'image' && activeFile.src ? sanitizeUrl(activeFile.src, true) : '';
  const imageSrcBlocked =
    activeFile.kind === 'image' &&
    Boolean(activeFile.src && activeFile.src.trim().length > 0 && safeImageSrc.length === 0);

  const metadataSummary = activeFile.dimensionsOrMeta
    ? `${activeFile.name} · ${activeFile.sizeLabel} · ${activeFile.dimensionsOrMeta}`
    : `${activeFile.name} · ${activeFile.sizeLabel}`;

  const renderPreviewStage = () => {
    if (activeFile.kind === 'image') {
      return (
        <div
          data-testid="quicklook-image-preview"
          className="prism-well rounded-2xl p-3 sm:p-4 flex flex-col gap-3 min-w-0 max-w-full"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full">
            <span
              className="font-mono text-xs font-medium truncate max-w-full"
              style={STYLE_TEXT_SECONDARY}
            >
              Optical Image Inspector
            </span>
            <button
              type="button"
              aria-pressed={isActualSize}
              aria-label={isActualSize ? 'Switch image zoom to Fit' : 'Switch image zoom to 100%'}
              data-testid="quicklook-zoom-toggle"
              onClick={() => setIsActualSize((prev) => !prev)}
              className={cx(
                'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center gap-1.5 font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                isActualSize ? 'prism-btn-primary' : 'prism-btn-secondary'
              )}
            >
              {isActualSize ? (
                <ZoomOut className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
              ) : (
                <ZoomIn className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
              )}
              <span className="relative z-10">{isActualSize ? '100%' : 'Fit'}</span>
            </button>
          </div>

          <div
            data-testid="quicklook-image-viewport"
            className={cx(
              'w-full min-h-[220px] max-h-[380px] rounded-xl flex items-center justify-center p-2',
              isActualSize ? 'overflow-auto items-start justify-start' : 'overflow-hidden'
            )}
            style={{
              backgroundColor: 'color-mix(in srgb, var(--prism-bg-end) 56%, transparent)',
              border: '1px solid var(--prism-divider)',
            }}
          >
            {safeImageSrc ? (
              <img
                key={activeFile.id}
                data-testid="quicklook-image"
                data-zoom-mode={isActualSize ? '100%' : 'fit'}
                src={safeImageSrc}
                alt={activeFile.name}
                draggable={false}
                referrerPolicy="no-referrer"
                className={cx(
                  'rounded-lg block transition-[color,background-color,border-color,opacity,transform] duration-150',
                  isActualSize
                    ? 'w-auto h-auto max-w-none max-h-none'
                    : 'max-w-full max-h-[340px] object-contain'
                )}
              />
            ) : (
              <OpticalPosterFallback
                fileName={activeFile.name}
                gradientPrefix={gradientPrefix}
                isActualSize={isActualSize}
              />
            )}
          </div>

          {imageSrcBlocked ? (
            <p
              role="status"
              data-testid="quicklook-image-blocked"
              className="text-xs font-medium"
              style={STYLE_WARNING_MAIN}
            >
              Untrusted image URL blocked — showing optical vector fallback.
            </p>
          ) : null}
        </div>
      );
    }

    if (activeFile.kind === 'pdf') {
      const pageBadge = getPdfPageBadge(activeFile.dimensionsOrMeta);

      return (
        <div
          data-testid="quicklook-pdf-preview"
          className="prism-well rounded-2xl p-3 sm:p-4 flex flex-col gap-3 min-w-0 max-w-full"
        >
          <div
            className="prism-crystal rounded-xl p-4 sm:p-5 flex flex-col gap-3 min-w-0 max-w-full"
            style={{ border: '1px solid var(--prism-well-border)' }}
          >
            <div
              className="flex flex-wrap items-center justify-between gap-2 pb-2.5 min-w-0"
              style={{ borderBottom: '1px solid var(--prism-divider)' }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <FileText
                  className="w-4 h-4 shrink-0"
                  style={STYLE_ERROR_MAIN}
                  aria-hidden="true"
                />
                <span
                  className="text-xs font-semibold tracking-tight truncate"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {activeFile.name}
                </span>
              </div>
              <span
                data-testid="quicklook-pdf-badge"
                className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {pageBadge}
              </span>
            </div>

            <div className="flex flex-col gap-2 min-w-0">
              {pdfLines.map((line) => {
                const isHeading = line.lineNumber === 1;
                return (
                  <p
                    key={line.id}
                    className={
                      isHeading
                        ? 'text-xs sm:text-sm font-bold tracking-tight leading-snug break-words pb-0.5'
                        : 'text-xs leading-relaxed break-words'
                    }
                    style={{
                      color: isHeading
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {line.text}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (activeFile.kind === 'audio') {
      return (
        <div
          data-testid="quicklook-audio-preview"
          className="prism-well rounded-2xl p-4 sm:p-5 flex flex-col gap-4 min-w-0 max-w-full"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                aria-hidden="true"
                className="prism-crystal w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
                style={STYLE_SUCCESS_MAIN}
              >
                <FileAudio className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p
                  className="text-sm font-semibold truncate"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {activeFile.name}
                </p>
                <p
                  className="font-mono text-[11px] tabular-nums truncate"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {isAudioPlaying ? 'Playing · Optical Waveform Monitor' : 'Paused · Ready for audition'}
                </p>
              </div>
            </div>

            <button
              type="button"
              aria-pressed={isAudioPlaying}
              data-testid="quicklook-audio-toggle"
              onClick={() => setIsAudioPlaying((prev) => !prev)}
              className={cx(
                'prism-focus-ring h-8 px-4 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                isAudioPlaying ? 'prism-btn-primary' : 'prism-btn-secondary'
              )}
            >
              {isAudioPlaying ? (
                <Pause className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
              ) : (
                <Play className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
              )}
              <span className="relative z-10">{isAudioPlaying ? 'Pause' : 'Play'}</span>
            </button>
          </div>

          <div
            className="prism-crystal rounded-xl px-3 py-4 overflow-hidden min-w-0 max-w-full"
            style={{ border: '1px solid var(--prism-well-border)' }}
          >
            <svg
              data-testid="quicklook-audio-waveform"
              viewBox="0 0 480 120"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label={`${activeFile.name} amplitude waveform`}
              className="w-full h-[116px] block prism-contain-box"
            >
              <line
                x1="8"
                y1="60"
                x2="472"
                y2="60"
                stroke="var(--prism-divider)"
                strokeWidth="1"
              />
              {waveformBars.map((bar) => (
                <rect
                  key={bar.id}
                  x={bar.x}
                  y={bar.y}
                  width="9"
                  height={bar.height}
                  rx="4"
                  fill={
                    bar.isAccent ? 'var(--prism-primary-main)' : 'var(--prism-secondary-main)'
                  }
                  fillOpacity={bar.isAccent ? (isAudioPlaying ? 0.96 : 0.78) : 0.48}
                />
              ))}
            </svg>
          </div>
        </div>
      );
    }

    const languageLabel = activeFile.language ?? 'plaintext';
    return (
      <div
        data-testid="quicklook-code-preview"
        className="prism-well rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5 min-w-0 max-w-full"
      >
        <div
          className="flex flex-wrap items-center justify-between gap-2 pb-2 min-w-0"
          style={{ borderBottom: '1px solid var(--prism-divider)' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileCode2
              className="w-4 h-4 shrink-0"
              style={STYLE_INFO_MAIN}
              aria-hidden="true"
            />
            <span
              className="font-mono text-xs font-semibold truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {activeFile.name}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span
              data-testid="quicklook-code-language"
              className="prism-crystal px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold uppercase tracking-wide"
              style={STYLE_INFO_MAIN}
            >
              {languageLabel}
            </span>
            <span
              className="font-mono text-[11px] tabular-nums"
              style={STYLE_TEXT_SECONDARY}
            >
              {codeLines.length} lines
            </span>
          </div>
        </div>

        <div
          className="rounded-xl p-3 flex items-start gap-3 overflow-x-auto max-w-full min-w-0"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--prism-bg-end) 64%, transparent)',
            border: '1px solid var(--prism-divider)',
          }}
        >
          <div
            aria-hidden="true"
            className="select-none shrink-0 flex flex-col text-right font-mono text-xs leading-6 tabular-nums pr-2"
            style={{
              color: 'var(--prism-text-disabled)',
              borderRight: '1px solid var(--prism-divider)',
            }}
          >
            {codeLines.map((line) => (
              <span key={line.id}>{line.lineNumber}</span>
            ))}
          </div>
          <pre
            className="m-0 min-w-0 flex-1 overflow-x-auto font-mono text-xs leading-6 whitespace-pre"
            style={STYLE_TEXT_PRIMARY}
          >
            <code data-testid="quicklook-code-content">{codeText}</code>
          </pre>
        </div>
      </div>
    );
  };

  const renderPanelContent = (isDialog: boolean) => (
    <>
      {/* Quick Look Panel Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 pb-2.5 min-w-0 max-w-full'
        )}
        style={{ borderBottom: '1px solid var(--prism-divider)' }}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: activeKindMeta.accentVar }}
          >
            <KindIcon kind={activeFile.kind} className="w-4 h-4 shrink-0" />
          </span>
          <h2
            id={dialogTitleId}
            data-testid="quicklook-title"
            className="text-sm font-semibold tracking-tight truncate max-w-full"
            style={STYLE_TEXT_PRIMARY}
          >
            {activeFile.name}
          </h2>
          <span
            data-testid="quicklook-counter"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {safeIndex + 1} / {fileCount}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 min-w-0 max-w-full">
          <button
            type="button"
            aria-label="Previous file"
            data-testid="quicklook-prev"
            disabled={fileCount <= 1}
            onClick={goPrev}
            className="prism-btn-secondary prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            aria-label="Next file"
            data-testid="quicklook-next"
            disabled={fileCount <= 1}
            onClick={goNext}
            className="prism-btn-secondary prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            data-testid="quicklook-open-external"
            onClick={() => onOpenExternal?.(activeFile)}
            className="prism-btn-primary prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
            <span className="relative z-10">Open in Editor</span>
          </button>

          {isDialog ? (
            <button
              type="button"
              aria-label="Close Quick Look"
              data-testid="quicklook-close"
              onClick={handleClose}
              className="prism-btn-secondary prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Tailored Optical Stage */}
      <div className={cx(stageClass, 'w-full min-w-0 max-w-full')}>{renderPreviewStage()}</div>

      {/* Polite Live File Metadata Footer Strip */}
      <div
        className={cx(
          metadataClass,
          'prism-well rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <span
          role="status"
          aria-live="polite"
          data-testid="quicklook-metadata"
          className="font-mono text-xs font-medium truncate max-w-full min-w-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {metadataSummary}
        </span>

        <span
          aria-hidden="true"
          className="font-mono text-[11px] whitespace-nowrap shrink-0"
          style={STYLE_TEXT_SECONDARY}
        >
          {isDialog ? '← / → Navigate · Space / Esc Close' : '← / → Navigate'}
        </span>
      </div>
    </>
  );

  if (resolvedMode === 'inline') {
    return (
      <div
        ref={ref}
        role="region"
        aria-labelledby={dialogTitleId}
        tabIndex={0}
        onKeyDown={handleRootKeyDown}
        {...rest}
        {...merged}
      >
        {renderPanelContent(false)}
      </div>
    );
  }

  return (
    <div ref={ref} onKeyDown={handleRootKeyDown} {...rest} {...merged}>
      {/* Tactile Selectable File Strip Launcher */}
      <div
        className={cx(
          stripClass,
          'prism-slab p-4 sm:p-5 flex flex-col gap-3.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              aria-hidden="true"
              className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
              style={STYLE_PRIMARY_MAIN}
            >
              <Eye className="w-4 h-4 shrink-0" />
            </span>
            <span
              id={stripHeadingId}
              className="text-sm font-semibold tracking-tight truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              Quick Look Files
            </span>
            <span
              className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {fileCount} {fileCount === 1 ? 'file' : 'files'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span
              aria-hidden="true"
              className="font-mono text-[11px] whitespace-nowrap"
              style={STYLE_TEXT_SECONDARY}
            >
              Press Space to inspect
            </span>
            <button
              type="button"
              data-testid="quicklook-trigger"
              onClick={handleOpen}
              className="prism-btn-primary prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-[color,background-color,border-color,opacity,transform]"
            >
              <Eye className="w-3.5 h-3.5 shrink-0 relative z-10" aria-hidden="true" />
              <span className="relative z-10">Quick Look</span>
            </button>
          </div>
        </div>

        <div
          role="group"
          aria-labelledby={stripHeadingId}
          data-testid="quicklook-file-strip"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 min-w-0 max-w-full"
        >
          {resolvedFiles.map((file, idx) => {
            const isSelected = idx === safeIndex;
            const kindMeta = KIND_META[file.kind];

            return (
              <button
                key={file.id}
                type="button"
                aria-pressed={isSelected}
                aria-current={isSelected ? 'true' : undefined}
                data-selected={isSelected ? 'true' : undefined}
                data-kind={file.kind}
                data-testid={`quicklook-card-${file.id}`}
                onClick={() => selectIndex(idx)}
                onDoubleClick={() => {
                  selectIndex(idx);
                  handleOpen();
                }}
                onKeyDown={(event) => handleCardKeyDown(event, idx)}
                className={cx(
                  'prism-focus-ring rounded-2xl p-3 text-left flex flex-col gap-2 min-w-0 max-w-full cursor-pointer transition-[color,background-color,border-color,opacity,transform]',
                  isSelected ? 'prism-crystal' : 'prism-well'
                )}
                style={{
                  borderWidth: '1.5px',
                  borderStyle: 'solid',
                  borderColor: isSelected
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-well-border)',
                }}
              >
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
                    style={{ color: kindMeta.accentVar }}
                  >
                    <KindIcon kind={file.kind} className="w-4 h-4" />
                  </span>
                  <span
                    className="prism-well px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0"
                    style={{ color: kindMeta.accentVar }}
                  >
                    {kindMeta.label}
                  </span>
                </div>

                <div className="min-w-0">
                  <p
                    className="text-xs font-semibold tracking-tight truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {file.name}
                  </p>
                  <p
                    className="font-mono text-[11px] tabular-nums truncate mt-0.5"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {file.sizeLabel}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Centered Modal Optical Prism-Slab Overlay */}
      {isOpen ? (
        <div
          data-testid="quicklook-backdrop"
          onClick={handleClose}
          className={cx(
            backdropClass,
            'fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6'
          )}
          style={{
            backgroundColor: 'color-mix(in srgb, var(--prism-bg-end) 76%, transparent)',
            backdropFilter: 'blur(var(--prism-blur-px))',
          }}
        >
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            tabIndex={-1}
            data-testid="quicklook-dialog"
            onClick={(event) => event.stopPropagation()}
            className={cx(
              panelClass,
              'prism-slab prism-focus-ring w-full max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-5 flex flex-col gap-3.5 min-w-0 max-w-full'
            )}
          >
            {renderPanelContent(true)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const QuickLookPreviewer = /*#__PURE__*/ memoWithDisplayName(QuickLookPreviewerInner, 'QuickLookPreviewer');
