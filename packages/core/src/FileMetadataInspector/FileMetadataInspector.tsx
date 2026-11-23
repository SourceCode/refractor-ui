'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  FileArchive,
  FileAudio,
  FileCode2,
  FileImage,
  FileSearch,
  FileText,
  Plus,
  Tag,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_CONTRAST, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type FileInspectorKind = 'image' | 'code' | 'audio' | 'document' | 'archive';

export type FileInspectorTagColor =
  | 'primary'
  | 'rose'
  | 'emerald'
  | 'info'
  | 'amber'
  | 'secondary';

export interface FileMetadataTag {
  /** Unique identifier for the tag pill. */
  id: string;
  /** Literal text label rendered inside the tag pill. */
  label: string;
  /** Semantic optical color swatch key for this tag. */
  color: FileInspectorTagColor;
}

export interface FileExifEntry {
  /** Specification field label (e.g. 'Dimensions', 'Color Profile', 'ISO'). */
  label: string;
  /** Specification value string (e.g. '3840 × 2160', 'Display P3', '100'). */
  value: string;
}

export interface FileMetadataRecord {
  /** Display filename rendered in the header and accessible preview label. */
  name: string;
  /** File category adapting the procedural optical SVG canvas and header glyph. */
  kind: FileInspectorKind;
  /** MIME media type string (e.g. 'image/png', 'application/typescript'). */
  mimeType: string;
  /** Human-readable file size label (e.g. '14.6 MB'). */
  sizeLabel: string;
  /** Workspace or filesystem path displayed in the metadata grid. */
  location: string;
  /** Formatted creation timestamp string. */
  createdAt: string;
  /** Formatted last-modified timestamp string. */
  modifiedAt: string;
  /** Optional SHA-256 hex digest with one-click resilient copy action. */
  checksumSha256?: string;
  /** Optional EXIF or media technical specification entries. */
  exifSpecs?: ReadonlyArray<FileExifEntry>;
  /** Semantic color tags attached to the file. */
  tags: ReadonlyArray<FileMetadataTag>;
}

type FileMetadataInspectorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface FileMetadataInspectorProps extends FileMetadataInspectorBaseProps {
  /** File metadata record to inspect. Omit for a built-in optical sample, or pass null for an empty state. */
  file?: FileMetadataRecord | null;
  /** Controlled expanded state of the inspector body. */
  open?: boolean;
  /** Initial expanded state in uncontrolled mode (defaults to true). */
  defaultOpen?: boolean;
  /** Callback invoked whenever the inspector panel is collapsed or expanded. */
  onOpenChange?: (open: boolean) => void;
  /** Callback invoked with the updated tag list whenever a tag is added or removed. */
  onTagsChange?: (nextTags: ReadonlyArray<FileMetadataTag>) => void;
  /** Disables toggling, checksum copying, swatch picking, and tag editing (defaults to false). */
  disabled?: boolean;
}

interface KindVisualMeta {
  label: string;
  accentToken: string;
}

interface TagSwatchMeta {
  color: FileInspectorTagColor;
  label: string;
  dotToken: string;
  tintBg: string;
  borderToken: string;
  textToken: string;
}

interface CodeSyntaxBar {
  id: string;
  x: number;
  y: number;
  width: number;
  fillToken: string;
}

interface AudioWaveBar {
  id: string;
  x: number;
  height: number;
  played: boolean;
}

interface DocumentLineBar {
  id: string;
  x: number;
  y: number;
  width: number;
  accent: boolean;
}

interface KeyedExifEntry {
  key: string;
  label: string;
  value: string;
}

type CopyResult = 'clipboard' | 'fallback' | 'unavailable';

const COPY_RESET_DELAY_MS = 1800;
const EMPTY_TAGS: ReadonlyArray<FileMetadataTag> = [];

const DEFAULT_FILE_RECORD: FileMetadataRecord = {
  name: 'Optical_Refraction_Hero.png',
  kind: 'image',
  mimeType: 'image/png',
  sizeLabel: '14.6 MB',
  location: '/workspace/assets/renders',
  createdAt: '2026-10-14 09:42 UTC',
  modifiedAt: '2026-11-18 16:20 UTC',
  checksumSha256: '8f4e2a9c7d1b6053e4a92f1c8d7b3a5061e2f4c9d8b7a6e5f4c3d2b1a0987654',
  exifSpecs: [
    { label: 'Dimensions', value: '3840 × 2160' },
    { label: 'Color Profile', value: 'Display P3' },
    { label: 'Aperture', value: 'f/2.0' },
    { label: 'ISO', value: '100' },
    { label: 'Camera', value: 'Optical Lab MK-II' },
  ],
  tags: [
    { id: 'tag-hero', label: 'Hero Asset', color: 'primary' },
    { id: 'tag-calibrated', label: 'Color Calibrated', color: 'emerald' },
    { id: 'tag-p3', label: 'Display P3', color: 'info' },
  ],
};

const TAG_SWATCH_PRIMARY: TagSwatchMeta = {
  color: 'primary',
  label: 'Primary',
  dotToken: 'var(--prism-primary-main)',
  tintBg: 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-primary-main) 42%, transparent)',
  textToken: 'var(--prism-primary-main)',
};

const TAG_SWATCH_ROSE: TagSwatchMeta = {
  color: 'rose',
  label: 'Rose',
  dotToken: 'var(--prism-error-main)',
  tintBg: 'color-mix(in srgb, var(--prism-error-main) 14%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-error-main) 42%, transparent)',
  textToken: 'var(--prism-error-main)',
};

const TAG_SWATCH_EMERALD: TagSwatchMeta = {
  color: 'emerald',
  label: 'Emerald',
  dotToken: 'var(--prism-success-main)',
  tintBg: 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-success-main) 42%, transparent)',
  textToken: 'var(--prism-success-main)',
};

const TAG_SWATCH_INFO: TagSwatchMeta = {
  color: 'info',
  label: 'Info',
  dotToken: 'var(--prism-info-main)',
  tintBg: 'color-mix(in srgb, var(--prism-info-main) 14%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-info-main) 42%, transparent)',
  textToken: 'var(--prism-info-main)',
};

const TAG_SWATCH_AMBER: TagSwatchMeta = {
  color: 'amber',
  label: 'Amber',
  dotToken: 'var(--prism-warning-main)',
  tintBg: 'color-mix(in srgb, var(--prism-warning-main) 16%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-warning-main) 44%, transparent)',
  textToken: 'var(--prism-warning-main)',
};

const TAG_SWATCH_SECONDARY: TagSwatchMeta = {
  color: 'secondary',
  label: 'Secondary',
  dotToken: 'var(--prism-secondary-main)',
  tintBg: 'color-mix(in srgb, var(--prism-secondary-main) 16%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-secondary-main) 44%, transparent)',
  textToken: 'var(--prism-secondary-dark)',
};

const TAG_SWATCHES: ReadonlyArray<TagSwatchMeta> = [
  TAG_SWATCH_PRIMARY,
  TAG_SWATCH_ROSE,
  TAG_SWATCH_EMERALD,
  TAG_SWATCH_INFO,
  TAG_SWATCH_AMBER,
  TAG_SWATCH_SECONDARY,
];

const CODE_SYNTAX_BARS: ReadonlyArray<CodeSyntaxBar> = [
  { id: 'ln1-kw', x: 46, y: 36, width: 32, fillToken: 'var(--prism-primary-main)' },
  { id: 'ln1-id', x: 84, y: 36, width: 56, fillToken: 'var(--prism-info-main)' },
  { id: 'ln1-op', x: 146, y: 36, width: 34, fillToken: 'var(--prism-secondary-main)' },
  { id: 'ln2-kw', x: 56, y: 50, width: 24, fillToken: 'var(--prism-secondary-main)' },
  { id: 'ln2-val', x: 86, y: 50, width: 78, fillToken: 'var(--prism-success-main)' },
  { id: 'ln3-kw', x: 56, y: 64, width: 42, fillToken: 'var(--prism-primary-light)' },
  { id: 'ln3-id', x: 104, y: 64, width: 46, fillToken: 'var(--prism-text-secondary)' },
  { id: 'ln3-arg', x: 156, y: 64, width: 38, fillToken: 'var(--prism-warning-main)' },
  { id: 'ln4-kw', x: 56, y: 78, width: 30, fillToken: 'var(--prism-info-main)' },
  { id: 'ln4-val', x: 92, y: 78, width: 64, fillToken: 'var(--prism-secondary-main)' },
  { id: 'ln5-kw', x: 46, y: 92, width: 22, fillToken: 'var(--prism-primary-main)' },
  { id: 'ln5-str', x: 74, y: 92, width: 92, fillToken: 'var(--prism-success-main)' },
  { id: 'ln6-end', x: 46, y: 106, width: 38, fillToken: 'var(--prism-text-secondary)' },
];

const AUDIO_WAVEFORM_BARS: ReadonlyArray<AudioWaveBar> = [
  { id: 'aw-01', x: 24, height: 18, played: true },
  { id: 'aw-02', x: 33, height: 32, played: true },
  { id: 'aw-03', x: 42, height: 48, played: true },
  { id: 'aw-04', x: 51, height: 36, played: true },
  { id: 'aw-05', x: 60, height: 64, played: true },
  { id: 'aw-06', x: 69, height: 78, played: true },
  { id: 'aw-07', x: 78, height: 52, played: true },
  { id: 'aw-08', x: 87, height: 40, played: true },
  { id: 'aw-09', x: 96, height: 70, played: true },
  { id: 'aw-10', x: 105, height: 84, played: true },
  { id: 'aw-11', x: 114, height: 56, played: true },
  { id: 'aw-12', x: 123, height: 44, played: true },
  { id: 'aw-13', x: 132, height: 66, played: true },
  { id: 'aw-14', x: 141, height: 80, played: false },
  { id: 'aw-15', x: 150, height: 58, played: false },
  { id: 'aw-16', x: 159, height: 42, played: false },
  { id: 'aw-17', x: 168, height: 68, played: false },
  { id: 'aw-18', x: 177, height: 54, played: false },
  { id: 'aw-19', x: 186, height: 36, played: false },
  { id: 'aw-20', x: 195, height: 46, played: false },
  { id: 'aw-21', x: 204, height: 28, played: false },
  { id: 'aw-22', x: 213, height: 18, played: false },
];

const DOCUMENT_PAGE_LINES: ReadonlyArray<DocumentLineBar> = [
  { id: 'doc-h1', x: 66, y: 28, width: 64, accent: true },
  { id: 'doc-p1', x: 66, y: 44, width: 92, accent: false },
  { id: 'doc-p2', x: 66, y: 54, width: 84, accent: false },
  { id: 'doc-p3', x: 66, y: 64, width: 96, accent: false },
  { id: 'doc-h2', x: 66, y: 80, width: 52, accent: true },
  { id: 'doc-p4', x: 66, y: 92, width: 88, accent: false },
  { id: 'doc-p5', x: 66, y: 102, width: 62, accent: false },
];

function getKindMeta(kind: FileInspectorKind): KindVisualMeta {
  switch (kind) {
    case 'image':
      return { label: 'Image', accentToken: 'var(--prism-primary-main)' };
    case 'code':
      return { label: 'Code', accentToken: 'var(--prism-info-main)' };
    case 'audio':
      return { label: 'Audio', accentToken: 'var(--prism-success-main)' };
    case 'document':
      return { label: 'Document', accentToken: 'var(--prism-warning-main)' };
    case 'archive':
      return { label: 'Archive', accentToken: 'var(--prism-secondary-dark)' };
  }
}

function getTagSwatchMeta(color: FileInspectorTagColor): TagSwatchMeta {
  switch (color) {
    case 'primary':
      return TAG_SWATCH_PRIMARY;
    case 'rose':
      return TAG_SWATCH_ROSE;
    case 'emerald':
      return TAG_SWATCH_EMERALD;
    case 'info':
      return TAG_SWATCH_INFO;
    case 'amber':
      return TAG_SWATCH_AMBER;
    case 'secondary':
      return TAG_SWATCH_SECONDARY;
  }
}

function buildKeyedExifEntries(entries: ReadonlyArray<FileExifEntry>): KeyedExifEntry[] {
  const counts = new Map<string, number>();
  const result: KeyedExifEntry[] = [];
  for (const entry of entries) {
    const base = `${entry.label}\0${entry.value}`;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    result.push({
      key: `${base}\0${seen}`,
      label: entry.label,
      value: entry.value,
    });
  }
  return result;
}

async function copyTextWithFallback(text: string): Promise<CopyResult> {
  const clipboard = navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(text);
      return 'clipboard';
    } catch {
      // Fall through to legacy textarea copy path.
    }
  }

  if (typeof document.execCommand === 'function') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      if (document.execCommand('copy')) {
        return 'fallback';
      }
    } catch {
      // execCommand blocked or unsupported in environment.
    } finally {
      textarea.remove();
    }
  }

  return 'unavailable';
}

function KindGlyph({ kind, className }: { kind: FileInspectorKind; className?: string }) {
  switch (kind) {
    case 'image':
      return <FileImage aria-hidden="true" className={className} />;
    case 'code':
      return <FileCode2 aria-hidden="true" className={className} />;
    case 'audio':
      return <FileAudio aria-hidden="true" className={className} />;
    case 'document':
      return <FileText aria-hidden="true" className={className} />;
    case 'archive':
      return <FileArchive aria-hidden="true" className={className} />;
  }
}

interface OpticalPreviewCanvasProps {
  fileName: string;
  kind: FileInspectorKind;
  svgPrefix: string;
}

function OpticalPreviewCanvas({ fileName, kind, svgPrefix }: OpticalPreviewCanvasProps) {
  const kindMeta = getKindMeta(kind);
  const bgId = `${svgPrefix}-bg`;
  const warmGlowId = `${svgPrefix}-warm`;
  const coolGlowId = `${svgPrefix}-cool`;

  const renderArtwork = () => {
    switch (kind) {
      case 'image':
        return (
          <g data-testid="file-inspector-artwork-image">
            <rect
              x="28"
              y="14"
              width="184"
              height="104"
              rx="10"
              fill="var(--prism-crystal-top)"
              fillOpacity={0.28}
              stroke="var(--prism-secondary-light)"
              strokeOpacity={0.62}
              strokeWidth="1.25"
            />
            <line
              x1="40"
              y1="26"
              x2="52"
              y2="26"
              stroke="var(--prism-primary-light)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="40"
              y1="26"
              x2="40"
              y2="38"
              stroke="var(--prism-primary-light)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="200"
              y1="106"
              x2="188"
              y2="106"
              stroke="var(--prism-secondary-main)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <line
              x1="200"
              y1="106"
              x2="200"
              y2="94"
              stroke="var(--prism-secondary-main)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
            <circle
              cx="120"
              cy="66"
              r="38"
              fill="none"
              stroke="var(--prism-secondary-light)"
              strokeOpacity={0.48}
              strokeWidth="1.25"
            />
            <circle
              cx="120"
              cy="66"
              r="26"
              fill="none"
              stroke="var(--prism-primary-light)"
              strokeOpacity={0.64}
              strokeWidth="1.25"
              strokeDasharray="4 4"
            />
            <polygon
              points="120,24 156,66 120,108 84,66"
              fill="var(--prism-secondary-main)"
              fillOpacity={0.26}
              stroke="var(--prism-primary-contrast)"
              strokeOpacity={0.78}
              strokeWidth="1.5"
            />
            <polygon
              points="120,38 142,66 120,94 98,66"
              fill="var(--prism-primary-main)"
              fillOpacity={0.34}
              stroke="var(--prism-primary-light)"
              strokeOpacity={0.82}
              strokeWidth="1.25"
            />
            <line
              x1="48"
              y1="92"
              x2="92"
              y2="68"
              stroke="var(--prism-primary-light)"
              strokeOpacity={0.62}
              strokeWidth="1.25"
            />
            <line
              x1="148"
              y1="64"
              x2="192"
              y2="42"
              stroke="var(--prism-success-light)"
              strokeOpacity={0.68}
              strokeWidth="1.25"
            />
          </g>
        );
      case 'code':
        return (
          <g data-testid="file-inspector-artwork-code">
            <rect
              x="20"
              y="12"
              width="200"
              height="108"
              rx="10"
              fill="var(--prism-well-start)"
              fillOpacity={0.86}
              stroke="var(--prism-well-border)"
              strokeWidth="1.25"
            />
            <line
              x1="20"
              y1="28"
              x2="220"
              y2="28"
              stroke="var(--prism-divider)"
              strokeWidth="1"
            />
            <circle cx="32" cy="20" r="3" fill="var(--prism-error-main)" fillOpacity={0.85} />
            <circle cx="42" cy="20" r="3" fill="var(--prism-warning-main)" fillOpacity={0.85} />
            <circle cx="52" cy="20" r="3" fill="var(--prism-success-main)" fillOpacity={0.85} />
            <line
              x1="38"
              y1="28"
              x2="38"
              y2="120"
              stroke="var(--prism-divider)"
              strokeWidth="1"
            />
            {CODE_SYNTAX_BARS.map((bar) => (
              <rect
                key={bar.id}
                x={bar.x}
                y={bar.y}
                width={bar.width}
                height="6"
                rx="3"
                fill={bar.fillToken}
                fillOpacity={0.82}
              />
            ))}
          </g>
        );
      case 'audio':
        return (
          <g data-testid="file-inspector-artwork-audio">
            <line
              x1="18"
              y1="66"
              x2="222"
              y2="66"
              stroke="var(--prism-divider)"
              strokeWidth="1.25"
            />
            {AUDIO_WAVEFORM_BARS.map((bar) => (
              <rect
                key={bar.id}
                x={bar.x}
                y={66 - bar.height / 2}
                width="5.5"
                height={bar.height}
                rx="2.75"
                fill={bar.played ? 'var(--prism-success-main)' : 'var(--prism-secondary-main)'}
                fillOpacity={bar.played ? 0.9 : 0.45}
              />
            ))}
            <line
              x1="138"
              y1="16"
              x2="138"
              y2="116"
              stroke="var(--prism-primary-main)"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            <circle cx="138" cy="18" r="3.5" fill="var(--prism-primary-main)" />
          </g>
        );
      case 'document':
        return (
          <g data-testid="file-inspector-artwork-document">
            <rect
              x="68"
              y="18"
              width="116"
              height="100"
              rx="8"
              fill="var(--prism-crystal-bottom)"
              fillOpacity={0.54}
              stroke="var(--prism-well-border)"
              strokeWidth="1"
            />
            <rect
              x="54"
              y="12"
              width="120"
              height="104"
              rx="8"
              fill="var(--prism-well-end)"
              fillOpacity={0.94}
              stroke="var(--prism-well-border)"
              strokeWidth="1.25"
            />
            <polygon
              points="154,12 174,32 154,32"
              fill="var(--prism-secondary-light)"
              fillOpacity={0.62}
              stroke="var(--prism-well-border)"
              strokeWidth="1"
            />
            {DOCUMENT_PAGE_LINES.map((line) => (
              <rect
                key={line.id}
                x={line.x}
                y={line.y}
                width={line.width}
                height={line.accent ? 6 : 4.5}
                rx="2.25"
                fill={line.accent ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)'}
                fillOpacity={line.accent ? 0.85 : 0.45}
              />
            ))}
            <circle
              cx="154"
              cy="98"
              r="9"
              fill="var(--prism-success-main)"
              fillOpacity={0.22}
              stroke="var(--prism-success-main)"
              strokeWidth="1.25"
            />
          </g>
        );
      case 'archive':
        return (
          <g data-testid="file-inspector-artwork-archive">
            {/* Back-left translucent package cube */}
            <polygon
              points="86,34 114,48 86,62 58,48"
              fill="var(--prism-secondary-light)"
              fillOpacity={0.55}
              stroke="var(--prism-secondary-main)"
              strokeWidth="1"
            />
            <polygon
              points="58,48 86,62 86,92 58,78"
              fill="var(--prism-secondary-main)"
              fillOpacity={0.34}
              stroke="var(--prism-secondary-dark)"
              strokeWidth="1"
            />
            <polygon
              points="114,48 86,62 86,92 114,78"
              fill="var(--prism-info-main)"
              fillOpacity={0.32}
              stroke="var(--prism-info-dark)"
              strokeWidth="1"
            />
            {/* Back-right translucent package cube */}
            <polygon
              points="154,34 182,48 154,62 126,48"
              fill="var(--prism-primary-light)"
              fillOpacity={0.52}
              stroke="var(--prism-primary-main)"
              strokeWidth="1"
            />
            <polygon
              points="126,48 154,62 154,92 126,78"
              fill="var(--prism-primary-main)"
              fillOpacity={0.3}
              stroke="var(--prism-primary-dark)"
              strokeWidth="1"
            />
            <polygon
              points="182,48 154,62 154,92 182,78"
              fill="var(--prism-warning-main)"
              fillOpacity={0.36}
              stroke="var(--prism-primary-dark)"
              strokeWidth="1"
            />
            {/* Foreground hero optical cube */}
            <polygon
              points="120,44 154,62 120,80 86,62"
              fill="var(--prism-primary-light)"
              fillOpacity={0.78}
              stroke="var(--prism-primary-contrast)"
              strokeOpacity={0.85}
              strokeWidth="1.25"
            />
            <polygon
              points="86,62 120,80 120,116 86,98"
              fill="var(--prism-info-main)"
              fillOpacity={0.62}
              stroke="var(--prism-secondary-light)"
              strokeOpacity={0.75}
              strokeWidth="1.25"
            />
            <polygon
              points="154,62 120,80 120,116 154,98"
              fill="var(--prism-primary-main)"
              fillOpacity={0.72}
              stroke="var(--prism-primary-light)"
              strokeOpacity={0.85}
              strokeWidth="1.25"
            />
            <line
              x1="103"
              y1="53"
              x2="137"
              y2="71"
              stroke="var(--prism-primary-contrast)"
              strokeOpacity={0.78}
              strokeWidth="1.5"
            />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 240 132"
      role="img"
      aria-label={`${fileName} (${kindMeta.label} preview)`}
      data-testid="file-inspector-preview-svg"
      data-preview-kind={kind}
      className="w-full h-auto block rounded-xl"
    >
      <defs>
        <linearGradient id={bgId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--prism-bg-start)" stopOpacity={0.94} />
          <stop offset="55%" stopColor="var(--prism-bg-mid)" stopOpacity={0.92} />
          <stop offset="100%" stopColor="var(--prism-bg-end)" stopOpacity={0.96} />
        </linearGradient>
        <radialGradient id={warmGlowId} cx="80%" cy="22%" r="54%">
          <stop offset="0%" stopColor="var(--prism-primary-light)" stopOpacity={0.28} />
          <stop offset="100%" stopColor="var(--prism-primary-main)" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={coolGlowId} cx="20%" cy="80%" r="54%">
          <stop offset="0%" stopColor="var(--prism-secondary-main)" stopOpacity={0.26} />
          <stop offset="100%" stopColor="var(--prism-info-main)" stopOpacity={0} />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="240" height="132" rx="14" fill={`url(#${bgId})`} />
      <rect x="0" y="0" width="240" height="132" rx="14" fill={`url(#${warmGlowId})`} />
      <rect x="0" y="0" width="240" height="132" rx="14" fill={`url(#${coolGlowId})`} />
      {renderArtwork()}
      <rect
        x="0.75"
        y="0.75"
        width="238.5"
        height="130.5"
        rx="13.25"
        fill="none"
        stroke="var(--prism-well-border)"
        strokeWidth="1"
      />
    </svg>
  );
}

function FileMetadataInspectorInner({
  file,
  open,
  defaultOpen = true,
  onOpenChange,
  onTagsChange,
  disabled = false,
  'aria-label': ariaLabel,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FileMetadataInspectorProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const bodyId = `${baseId}-body`;
  const override = useComponentOverride('FileMetadataInspector');

  const resolvedFile: FileMetadataRecord | null =
    file === undefined ? DEFAULT_FILE_RECORD : file;
  const isEmpty = resolvedFile === null;

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const propTags: ReadonlyArray<FileMetadataTag> = resolvedFile ? resolvedFile.tags : EMPTY_TAGS;
  const fileIdentity = resolvedFile
    ? `${resolvedFile.name}\0${resolvedFile.location}\0${resolvedFile.mimeType}`
    : '';

  const [tags, setTags] = useState<ReadonlyArray<FileMetadataTag>>(propTags);
  const [activeTagColor, setActiveTagColor] = useState<FileInspectorTagColor>('primary');
  const [tagDraft, setTagDraft] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const mountedRef = useRef<boolean>(true);
  const copyAttemptRef = useRef<number>(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextTagSeqRef = useRef<number>(1);

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCopyTimer();
    };
  }, [clearCopyTimer]);

  useEffect(() => {
    setTags(propTags);
  }, [propTags]);

  useEffect(() => {
    clearCopyTimer();
    setCopied(false);
    setTagDraft('');
    setLiveAnnouncement('');
  }, [clearCopyTimer, fileIdentity]);

  const handleToggleOpen = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, [setIsOpen]);

  const checksumValue = resolvedFile?.checksumSha256?.trim() ?? '';

  const handleCopyChecksum = useCallback(
    (valueToCopy: string) => {
      const attemptId = copyAttemptRef.current + 1;
      copyAttemptRef.current = attemptId;
      clearCopyTimer();

      void copyTextWithFallback(valueToCopy).then((outcome) => {
        if (!mountedRef.current || attemptId !== copyAttemptRef.current) {
          return;
        }
        if (outcome === 'unavailable') {
          setCopied(false);
          setLiveAnnouncement(
            'Clipboard unavailable. Select the SHA-256 checksum to copy manually.'
          );
          return;
        }
        setCopied(true);
        setLiveAnnouncement('SHA-256 checksum copied to clipboard.');
        copyTimerRef.current = setTimeout(() => {
          copyTimerRef.current = null;
          setCopied(false);
        }, COPY_RESET_DELAY_MS);
      });
    },
    [clearCopyTimer]
  );

  const handleAddTag = useCallback(() => {
    const trimmed = tagDraft.trim();
    if (!trimmed) {
      setLiveAnnouncement('Enter a tag label before adding.');
      return;
    }

    const normalized = trimmed.toLowerCase();
    const isDuplicate = tags.some(
      (existing) => existing.label.trim().toLowerCase() === normalized
    );
    if (isDuplicate) {
      setLiveAnnouncement(`Tag "${trimmed}" already exists.`);
      return;
    }

    const existingIds = new Set(tags.map((item) => item.id));
    let seq = nextTagSeqRef.current;
    while (existingIds.has(`file-tag-${seq}`)) {
      seq += 1;
    }
    nextTagSeqRef.current = seq + 1;

    const created: FileMetadataTag = {
      id: `file-tag-${seq}`,
      label: trimmed,
      color: activeTagColor,
    };
    const nextTags: ReadonlyArray<FileMetadataTag> = [...tags, created];
    setTags(nextTags);
    setTagDraft('');
    setLiveAnnouncement(`Added tag "${trimmed}".`);
    onTagsChange?.(nextTags);
  }, [activeTagColor, onTagsChange, tagDraft, tags]);

  const handleRemoveTag = useCallback(
    (targetTag: FileMetadataTag) => {
      const nextTags: ReadonlyArray<FileMetadataTag> = tags.filter(
        (item) => item.id !== targetTag.id
      );
      setTags(nextTags);
      setLiveAnnouncement(`Removed tag "${targetTag.label}".`);
      onTagsChange?.(nextTags);
    },
    [onTagsChange, tags]
  );

  const handleTagDraftChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTagDraft(event.target.value);
  }, []);

  const handleTagInputKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        handleAddTag();
      }
    },
    [handleAddTag]
  );

  const keyedExifEntries = useMemo<KeyedExifEntry[]>(() => {
    if (!resolvedFile?.exifSpecs || resolvedFile.exifSpecs.length === 0) {
      return [];
    }
    return buildKeyedExifEntries(resolvedFile.exifSpecs);
  }, [resolvedFile]);

  const headerClass = stableClassName('file-metadata-inspector', 'header');
  const bodyClass = stableClassName('file-metadata-inspector', 'body');
  const previewClass = stableClassName('file-metadata-inspector', 'preview');
  const metadataClass = stableClassName('file-metadata-inspector', 'metadata');
  const exifClass = stableClassName('file-metadata-inspector', 'exif');
  const tagsClass = stableClassName('file-metadata-inspector', 'tags');
  const emptyClass = stableClassName('file-metadata-inspector', 'empty');

  const merged = mergeProps({
    themeTarget: themeProps('file-metadata-inspector', {
      open: isOpen,
      empty: isEmpty,
      kind: resolvedFile?.kind,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 flex flex-col gap-4',
      disabled && 'opacity-75'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const activeKindMeta = resolvedFile ? getKindMeta(resolvedFile.kind) : null;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-start justify-between gap-3 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-crystal w-9 h-9 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: activeKindMeta ? activeKindMeta.accentToken : 'var(--prism-text-secondary)',
            }}
          >
            {resolvedFile ? (
              <KindGlyph kind={resolvedFile.kind} className="w-4 h-4 shrink-0" />
            ) : (
              <FileSearch className="w-4 h-4 shrink-0" />
            )}
          </span>

          <div className="min-w-0 flex-1 flex flex-col gap-1">
            <h3
              id={titleId}
              data-testid="file-inspector-title"
              className="m-0 text-sm font-semibold tracking-tight break-words min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {resolvedFile ? resolvedFile.name : 'No file selected'}
            </h3>

            {resolvedFile ? (
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  data-testid="file-inspector-mime"
                  className="prism-well px-2 py-0.5 rounded-full font-mono text-[11px] font-medium max-w-full truncate"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {resolvedFile.mimeType}
                </span>
                <span
                  className="font-mono text-[11px] font-medium tabular-nums whitespace-nowrap"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {resolvedFile.sizeLabel}
                </span>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          aria-label={isOpen ? 'Collapse inspector' : 'Expand inspector'}
          data-testid="file-inspector-toggle"
          onClick={handleToggleOpen}
          className="prism-btn-secondary prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
        >
          {isOpen ? (
            <>
              <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Collapse</span>
            </>
          ) : (
            <>
              <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Expand</span>
            </>
          )}
        </button>
      </div>

      <div
        id={bodyId}
        hidden={!isOpen}
        className={cx(bodyClass, 'flex flex-col gap-4 min-w-0 max-w-full')}
      >
        {isOpen ? (
          resolvedFile === null ? (
            <div
              role="status"
              data-testid="file-inspector-empty"
              className={cx(
                emptyClass,
                'prism-well rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-2 min-w-0 max-w-full'
              )}
            >
              <span
                aria-hidden="true"
                className="prism-crystal w-10 h-10 rounded-full inline-flex items-center justify-center shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                <FileSearch className="w-5 h-5" />
              </span>
              <p
                className="m-0 text-sm font-semibold tracking-tight"
                style={STYLE_TEXT_PRIMARY}
              >
                No file selected
              </p>
              <p
                className="m-0 text-xs max-w-xs leading-relaxed"
                style={STYLE_TEXT_SECONDARY}
              >
                Select a file to inspect its optical preview, metadata details, EXIF specs, and semantic color tags.
              </p>
            </div>
          ) : (
            <>
              <div
                className={cx(
                  previewClass,
                  'prism-well rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2 min-w-0 max-w-full'
                )}
              >
                <OpticalPreviewCanvas
                  fileName={resolvedFile.name}
                  kind={resolvedFile.kind}
                  svgPrefix={baseId}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 px-1 min-w-0">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Optical Preview
                  </span>
                  <span
                    className="font-mono text-[11px] font-medium"
                    style={{ color: getKindMeta(resolvedFile.kind).accentToken }}
                  >
                    {getKindMeta(resolvedFile.kind).label}
                  </span>
                </div>
              </div>

              <section aria-label="File Metadata" className="flex flex-col gap-2 min-w-0">
                <h4
                  className="m-0 text-[11px] font-semibold uppercase tracking-wider"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Metadata
                </h4>
                <dl
                  data-testid="file-inspector-metadata"
                  className={cx(
                    metadataClass,
                    'm-0 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0 max-w-full'
                  )}
                >
                  <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                    <dt
                      className="text-[11px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Size
                    </dt>
                    <dd
                      className="m-0 font-mono text-xs font-semibold tabular-nums truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedFile.sizeLabel}
                    </dd>
                  </div>

                  <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                    <dt
                      className="text-[11px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      MIME Type
                    </dt>
                    <dd
                      className="m-0 font-mono text-xs font-semibold truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedFile.mimeType}
                    </dd>
                  </div>

                  <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                    <dt
                      className="text-[11px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Created
                    </dt>
                    <dd
                      className="m-0 font-mono text-xs tabular-nums truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedFile.createdAt}
                    </dd>
                  </div>

                  <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                    <dt
                      className="text-[11px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Modified
                    </dt>
                    <dd
                      className="m-0 font-mono text-xs tabular-nums truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedFile.modifiedAt}
                    </dd>
                  </div>

                  <div className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0 sm:col-span-2">
                    <dt
                      className="text-[11px] font-medium"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Location
                    </dt>
                    <dd
                      className="m-0 font-mono text-xs break-all"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {resolvedFile.location}
                    </dd>
                  </div>

                  {checksumValue ? (
                    <div
                      data-testid="file-inspector-checksum-row"
                      className="prism-well rounded-xl px-3 py-2 flex flex-col gap-1.5 min-w-0 sm:col-span-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                        <dt
                          className="text-[11px] font-medium"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          SHA-256 Checksum
                        </dt>
                        <button
                          type="button"
                          disabled={disabled}
                          data-copied={copied ? 'true' : undefined}
                          data-testid="file-inspector-copy-sha"
                          onClick={() => handleCopyChecksum(checksumValue)}
                          className={cx(
                            'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                            copied ? 'prism-emerald' : 'prism-crystal'
                          )}
                          style={copied ? undefined : { color: 'var(--prism-text-primary)' }}
                        >
                          {copied ? (
                            <>
                              <Check aria-hidden="true" className="w-3 h-3 shrink-0" />
                              <span>Copied SHA-256</span>
                            </>
                          ) : (
                            <>
                              <Copy aria-hidden="true" className="w-3 h-3 shrink-0" />
                              <span>Copy SHA-256</span>
                            </>
                          )}
                        </button>
                      </div>
                      <dd
                        data-testid="file-inspector-checksum-value"
                        className="m-0 font-mono text-[11px] leading-relaxed tabular-nums break-all"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {checksumValue}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </section>

              {keyedExifEntries.length > 0 ? (
                <section
                  aria-label="EXIF and Media Specs"
                  data-testid="file-inspector-exif-section"
                  className="flex flex-col gap-2 min-w-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                    <h4
                      className="m-0 text-[11px] font-semibold uppercase tracking-wider"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      EXIF &amp; Media Specs
                    </h4>
                    <span
                      className="prism-well px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {keyedExifEntries.length}
                    </span>
                  </div>
                  <dl
                    className={cx(
                      exifClass,
                      'm-0 grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0 max-w-full'
                    )}
                  >
                    {keyedExifEntries.map((entry) => (
                      <div
                        key={entry.key}
                        className="prism-well rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0"
                      >
                        <dt
                          className="text-[11px] font-medium truncate"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {entry.label}
                        </dt>
                        <dd
                          className="m-0 font-mono text-xs font-semibold tabular-nums break-words"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {entry.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ) : null}

              <section
                aria-label="Color Tags"
                className={cx(tagsClass, 'flex flex-col gap-2.5 min-w-0')}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Tag
                      aria-hidden="true"
                      className="w-3.5 h-3.5 shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    />
                    <h4
                      className="m-0 text-[11px] font-semibold uppercase tracking-wider"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Color Tags
                    </h4>
                  </div>

                  <div
                    role="group"
                    aria-label="Select active tag color"
                    className="flex flex-wrap items-center gap-1.5"
                  >
                    {TAG_SWATCHES.map((swatch) => {
                      const isSelected = activeTagColor === swatch.color;
                      return (
                        <button
                          key={swatch.color}
                          type="button"
                          disabled={disabled}
                          aria-pressed={isSelected}
                          aria-label={`Select ${swatch.label} tag color`}
                          data-testid={`file-inspector-swatch-${swatch.color}`}
                          data-color={swatch.color}
                          onClick={() => setActiveTagColor(swatch.color)}
                          className="prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center transition-transform cursor-pointer enabled:hover:brightness-110 disabled:opacity-45 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: swatch.dotToken,
                            boxShadow: isSelected
                              ? '0 0 0 2px var(--prism-bg-start), 0 0 0 3.5px var(--prism-text-primary)'
                              : 'inset 0 1px 1px var(--prism-crystal-top)',
                          }}
                        >
                          {isSelected ? (
                            <Check
                              aria-hidden="true"
                              className="w-3 h-3 shrink-0"
                              style={STYLE_PRIMARY_CONTRAST}
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div
                  data-testid="file-inspector-tag-list"
                  className="flex flex-wrap items-center gap-1.5 min-w-0"
                >
                  {tags.length === 0 ? (
                    <span
                      data-testid="file-inspector-no-tags"
                      className="text-xs"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      No tags applied yet.
                    </span>
                  ) : (
                    tags.map((tag) => {
                      const swatch = getTagSwatchMeta(tag.color);
                      return (
                        <span
                          key={tag.id}
                          data-testid={`file-inspector-tag-${tag.id}`}
                          data-tag-color={tag.color}
                          className="inline-flex items-center gap-1.5 max-w-full min-w-0 h-7 pl-2.5 pr-1.5 rounded-full text-xs font-medium border"
                          style={{
                            backgroundColor: swatch.tintBg,
                            borderColor: swatch.borderToken,
                            color: 'var(--prism-text-primary)',
                          }}
                        >
                          <span
                            aria-hidden="true"
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: swatch.dotToken }}
                          />
                          <span className="truncate min-w-0">{tag.label}</span>
                          <button
                            type="button"
                            disabled={disabled}
                            aria-label={`Remove tag ${tag.label}`}
                            onClick={() => handleRemoveTag(tag)}
                            className="prism-focus-ring w-4 h-4 rounded-full inline-flex items-center justify-center shrink-0 transition-opacity cursor-pointer enabled:hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{ color: swatch.textToken }}
                          >
                            <X aria-hidden="true" className="w-3 h-3 shrink-0" />
                          </button>
                        </span>
                      );
                    })
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <input
                    type="text"
                    aria-label="Add file tag"
                    placeholder="Add tag..."
                    value={tagDraft}
                    disabled={disabled}
                    onChange={handleTagDraftChange}
                    onKeyDown={handleTagInputKeyDown}
                    className="prism-well prism-focus-ring h-8 px-3 rounded-full text-xs min-w-0 flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={STYLE_TEXT_PRIMARY}
                  />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={handleAddTag}
                    className="prism-btn-primary prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                    <span className="relative z-10">Add Tag</span>
                  </button>
                </div>
              </section>
            </>
          )
        ) : null}
      </div>

      {resolvedFile !== null ? (
        <span
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="file-inspector-live-region"
          className="sr-only"
        >
          {liveAnnouncement}
        </span>
      ) : null}
    </div>
  );
}

export const FileMetadataInspector = memo(FileMetadataInspectorInner);
FileMetadataInspector.displayName = 'FileMetadataInspector';
