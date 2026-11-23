'use client';

import {
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  GripVertical,
  Layers,
  Lock,
  Palette,
  Search,
  Shapes,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AssetSwatchKind = 'texture' | 'preset' | 'palette' | 'icon';

export type AssetSwatchTone = 'primary' | 'secondary' | 'emerald' | 'amber' | 'rose' | 'info';

export interface AssetSwatchItem {
  /** Unique identifier used for selection, React keys, and drag payloads. */
  id: string;
  /** Human-readable asset title displayed on the tile and Live Asset Preview Inspector. */
  name: string;
  /** Semantic creative library category controlling filtering and procedural SVG swatch artwork. */
  kind: AssetSwatchKind;
  /** Optional technical metadata such as resolution, IOR, shader model, or color space. */
  meta?: string;
  /** Semantic Refractor optical palette tone driving `--prism-*` SVG shading tokens. */
  tone?: AssetSwatchTone;
  /** Optional searchable metadata tags rendered in the Live Asset Preview Inspector. */
  tags?: ReadonlyArray<string>;
  /** Enables or disables HTML5 drag-and-drop for this tile (defaults to true). */
  draggable?: boolean;
}

export interface AssetSwatchGridProps extends BaseProps<HTMLDivElement> {
  /** Library items to display. Defaults to 8 realistic creative library assets when omitted; pass `[]` for an empty state. */
  items?: ReadonlyArray<AssetSwatchItem>;
  /** Controlled selected asset identifier (or `null` for no selection). */
  selectedId?: string | null;
  /** Initial selected asset identifier in uncontrolled mode (defaults to the first item). */
  defaultSelectedId?: string | null;
  /** Callback fired when an asset tile is selected via pointer click or IME-safe Enter/Space keydown. */
  onSelectAsset?: (item: AssetSwatchItem) => void;
  /** Callback fired when an HTML5 drag gesture starts on a draggable asset tile. */
  onDragAssetStart?: (item: AssetSwatchItem) => void;
  /** Visible panel heading rendered in the prism-slab header (defaults to `'Asset & Swatch Library'`). */
  title?: string;
}

type AssetFilterKind = 'all' | AssetSwatchKind;

interface FilterPillOption {
  value: AssetFilterKind;
  label: string;
}

interface ToneTokens {
  main: string;
  light: string;
  dark: string;
  accent: string;
  contrast: string;
  label: string;
}

interface PaletteBandSpec {
  id: string;
  x: number;
  width: number;
  fill: string;
  opacity: number;
}

const DEFAULT_TITLE = 'Asset & Swatch Library';
const FALLBACK_ASSET_NAME = 'Untitled Asset';
const ASSET_DRAG_MIME = 'application/x-refractor-asset';

const FILTER_OPTIONS: ReadonlyArray<FilterPillOption> = [
  { value: 'all', label: 'All' },
  { value: 'texture', label: 'Textures' },
  { value: 'preset', label: 'Presets' },
  { value: 'palette', label: 'Palettes' },
  { value: 'icon', label: 'Icons' },
];

const DEFAULT_ITEMS: ReadonlyArray<AssetSwatchItem> = [
  {
    id: 'tex-anodized-brushed',
    name: 'Anodized Brushed Alloy',
    kind: 'texture',
    meta: '4K PBR · Roughness 0.28',
    tone: 'primary',
    tags: ['pbr', 'metal', 'seamless'],
    draggable: true,
  },
  {
    id: 'tex-caustic-lens',
    name: 'Frosted Caustic Glass',
    kind: 'texture',
    meta: '2K Normal · IOR 1.52',
    tone: 'secondary',
    tags: ['glass', 'refraction', 'normal'],
    draggable: true,
  },
  {
    id: 'pre-emerald-subsurface',
    name: 'Jade Subsurface Shader',
    kind: 'preset',
    meta: 'SSS · Scatter 0.65',
    tone: 'emerald',
    tags: ['shader', 'sss', 'organic'],
    draggable: true,
  },
  {
    id: 'pre-amber-iridescent',
    name: 'Solar Prism Iridescence',
    kind: 'preset',
    meta: 'Thin-Film · 540nm',
    tone: 'amber',
    tags: ['shader', 'thin-film', 'specular'],
    draggable: true,
  },
  {
    id: 'pal-crimson-sunset',
    name: 'Studio Sunset LUT',
    kind: 'palette',
    meta: '5 Stops · ACEScg',
    tone: 'rose',
    tags: ['lut', 'color', 'warm'],
    draggable: true,
  },
  {
    id: 'pal-cobalt-atmosphere',
    name: 'Cobalt Sky Ramp',
    kind: 'palette',
    meta: '5 Stops · Linear sRGB',
    tone: 'info',
    tags: ['ramp', 'sky', 'cool'],
    draggable: true,
  },
  {
    id: 'ico-prism-lens',
    name: 'Optical Prism Glyph',
    kind: 'icon',
    meta: 'SVG 24px · Stroke 1.75',
    tone: 'secondary',
    tags: ['vector', 'optics', 'ui'],
    draggable: true,
  },
  {
    id: 'ico-wire-octa',
    name: 'Wireframe Octahedron',
    kind: 'icon',
    meta: 'SVG 24px · Dual-Tone',
    tone: 'primary',
    tags: ['vector', '3d', 'mesh'],
    draggable: true,
  },
];

function sanitizeSvgId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function getSafeAssetName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_ASSET_NAME;
}

function normalizeTags(tags: ReadonlyArray<string>): string[] {
  if (tags.length === 0) {
    return [];
  }
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const trimmed = tag.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function normalizeItems(rawItems: ReadonlyArray<AssetSwatchItem>): AssetSwatchItem[] {
  const seen = new Set<string>();
  const out: AssetSwatchItem[] = [];
  for (const item of rawItems) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    const trimmedMeta = item.meta?.trim();
    out.push({
      ...item,
      meta: trimmedMeta && trimmedMeta.length > 0 ? trimmedMeta : undefined,
      tags: item.tags ? normalizeTags(item.tags) : undefined,
    });
  }
  return out;
}

function computeVariantBit(id: string): 0 | 1 {
  let sum = 0;
  for (let i = 0; i < id.length; i += 1) {
    sum += id.charCodeAt(i);
  }
  return sum % 2 === 0 ? 0 : 1;
}

function getKindLabel(kind: AssetSwatchKind): string {
  switch (kind) {
    case 'texture':
      return 'Texture';
    case 'preset':
      return 'Preset';
    case 'palette':
      return 'Palette';
    case 'icon':
      return 'Icon';
  }
}

function getToneTokens(tone: AssetSwatchTone): ToneTokens {
  switch (tone) {
    case 'primary':
      return {
        main: 'var(--prism-primary-main)',
        light: 'var(--prism-primary-light)',
        dark: 'var(--prism-primary-dark)',
        accent: 'var(--prism-secondary-main)',
        contrast: 'var(--prism-primary-contrast)',
        label: 'Primary',
      };
    case 'secondary':
      return {
        main: 'var(--prism-secondary-main)',
        light: 'var(--prism-secondary-light)',
        dark: 'var(--prism-secondary-dark)',
        accent: 'var(--prism-info-light)',
        contrast: 'var(--prism-secondary-contrast)',
        label: 'Secondary',
      };
    case 'emerald':
      return {
        main: 'var(--prism-success-main)',
        light: 'var(--prism-success-light)',
        dark: 'var(--prism-success-dark)',
        accent: 'var(--prism-secondary-light)',
        contrast: 'var(--prism-success-contrast)',
        label: 'Emerald',
      };
    case 'amber':
      return {
        main: 'var(--prism-warning-main)',
        light: 'var(--prism-primary-light)',
        dark: 'var(--prism-primary-dark)',
        accent: 'var(--prism-primary-main)',
        contrast: 'var(--prism-warning-contrast)',
        label: 'Amber',
      };
    case 'rose':
      return {
        main: 'var(--prism-error-main)',
        light: 'var(--prism-warning-main)',
        dark: 'var(--prism-primary-dark)',
        accent: 'var(--prism-primary-light)',
        contrast: 'var(--prism-error-contrast)',
        label: 'Rose',
      };
    case 'info':
      return {
        main: 'var(--prism-info-main)',
        light: 'var(--prism-info-light)',
        dark: 'var(--prism-info-dark)',
        accent: 'var(--prism-secondary-light)',
        contrast: 'var(--prism-info-contrast)',
        label: 'Info',
      };
  }
}

function renderKindIcon(kind: AssetSwatchKind): ReactNode {
  switch (kind) {
    case 'texture':
      return <Layers aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'preset':
      return <Sparkles aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'palette':
      return <Palette aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'icon':
      return <Shapes aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

function matchesSearchQuery(item: AssetSwatchItem, lowerQuery: string): boolean {
  const safeName = getSafeAssetName(item.name).toLowerCase();
  if (safeName.includes(lowerQuery)) {
    return true;
  }
  if (item.kind.includes(lowerQuery)) {
    return true;
  }
  if (item.meta && item.meta.toLowerCase().includes(lowerQuery)) {
    return true;
  }
  if (item.tags) {
    for (const tag of item.tags) {
      if (tag.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
  }
  return false;
}

function renderOpticalSwatchSvg(item: AssetSwatchItem, rawPrefix: string): ReactNode {
  const prefix = sanitizeSvgId(rawPrefix);
  const tone: AssetSwatchTone = item.tone ?? 'primary';
  const tokens = getToneTokens(tone);
  const variant = computeVariantBit(item.id);
  const bgGradId = `${prefix}-bg`;
  const sheenGradId = `${prefix}-sheen`;
  const patId = `${prefix}-pat`;

  if (item.kind === 'texture') {
    return (
      <svg
        viewBox="0 0 96 64"
        aria-hidden="true"
        focusable="false"
        data-swatch-kind={item.kind}
        data-swatch-tone={tone}
        data-swatch-variant={String(variant)}
        className="w-full h-full block prism-contain-box"
      >
        <defs>
          <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tokens.dark} stopOpacity={0.92} />
            <stop offset="52%" stopColor={tokens.main} stopOpacity={0.86} />
            <stop offset="100%" stopColor={tokens.light} stopOpacity={0.9} />
          </linearGradient>
          <linearGradient id={sheenGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={tokens.contrast} stopOpacity={0} />
            <stop offset="50%" stopColor={tokens.contrast} stopOpacity={0.42} />
            <stop offset="100%" stopColor={tokens.contrast} stopOpacity={0} />
          </linearGradient>
          {variant === 0 ? (
            <pattern id={patId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
              <line x1="0" y1="0" x2="0" y2="10" stroke={tokens.contrast} strokeOpacity={0.28} strokeWidth="2" />
              <line x1="5" y1="0" x2="5" y2="10" stroke={tokens.dark} strokeOpacity={0.22} strokeWidth="1" />
            </pattern>
          ) : (
            <pattern id={patId} width="14" height="14" patternUnits="userSpaceOnUse">
              <path
                d="M 7 0 L 14 7 L 7 14 L 0 7 Z"
                fill="none"
                stroke={tokens.contrast}
                strokeOpacity={0.32}
                strokeWidth="1"
              />
              <circle cx="7" cy="7" r="1.5" fill={tokens.accent} fillOpacity={0.45} />
            </pattern>
          )}
        </defs>
        <rect x="0" y="0" width="96" height="64" rx="8" fill={`url(#${bgGradId})`} />
        <rect x="0" y="0" width="96" height="64" rx="8" fill={`url(#${patId})`} />
        <polygon points="8,0 44,0 24,64 -8,64" fill={`url(#${sheenGradId})`} />
        <circle cx="78" cy="50" r="18" fill={tokens.accent} fillOpacity={0.24} />
        <rect
          x="1.5"
          y="1.5"
          width="93"
          height="61"
          rx="7"
          fill="none"
          stroke={tokens.contrast}
          strokeOpacity={0.3}
          strokeWidth="1"
        />
      </svg>
    );
  }

  if (item.kind === 'preset') {
    return (
      <svg
        viewBox="0 0 96 64"
        aria-hidden="true"
        focusable="false"
        data-swatch-kind={item.kind}
        data-swatch-tone={tone}
        data-swatch-variant={String(variant)}
        className="w-full h-full block prism-contain-box"
      >
        <defs>
          <radialGradient id={bgGradId} cx="35%" cy="28%" r="68%">
            <stop offset="0%" stopColor={tokens.contrast} stopOpacity={0.92} />
            <stop offset="28%" stopColor={tokens.light} stopOpacity={0.95} />
            <stop offset="68%" stopColor={tokens.main} stopOpacity={0.98} />
            <stop offset="100%" stopColor={tokens.dark} stopOpacity={1} />
          </radialGradient>
          <pattern id={patId} width="12" height="12" patternUnits="userSpaceOnUse">
            <rect x="0" y="0" width="6" height="6" fill="var(--prism-divider)" />
            <rect x="6" y="6" width="6" height="6" fill="var(--prism-divider)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="96" height="64" rx="8" fill="var(--prism-bg-mid)" />
        <rect x="0" y="0" width="96" height="64" rx="8" fill={`url(#${patId})`} />
        <ellipse cx="48" cy="56" rx="22" ry="4" fill={tokens.dark} fillOpacity={0.28} />
        <circle cx="48" cy="32" r="21" fill={`url(#${bgGradId})`} />
        <ellipse cx="40" cy="22" rx="7" ry="4" transform="rotate(-24 40 22)" fill={tokens.contrast} fillOpacity={0.55} />
        {variant === 0 ? (
          <ellipse
            cx="48"
            cy="32"
            rx="28"
            ry="10"
            transform="rotate(-18 48 32)"
            fill="none"
            stroke={tokens.accent}
            strokeOpacity={0.7}
            strokeWidth="1.4"
          />
        ) : (
          <g>
            <circle
              cx="48"
              cy="32"
              r="24.5"
              fill="none"
              stroke={tokens.light}
              strokeOpacity={0.62}
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <path
              d="M 33 43 A 18 18 0 0 0 62 41"
              fill="none"
              stroke={tokens.accent}
              strokeOpacity={0.8}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        )}
      </svg>
    );
  }

  if (item.kind === 'palette') {
    const bands: ReadonlyArray<PaletteBandSpec> = [
      { id: 'dark', x: 6, width: 16, fill: tokens.dark, opacity: 0.96 },
      { id: 'main', x: 23, width: 16, fill: tokens.main, opacity: 0.96 },
      { id: 'light', x: 40, width: 16, fill: tokens.light, opacity: 0.94 },
      { id: 'accent', x: 57, width: 16, fill: tokens.accent, opacity: 0.9 },
      { id: 'neutral', x: 74, width: 16, fill: 'var(--prism-text-secondary)', opacity: 0.55 },
    ];
    return (
      <svg
        viewBox="0 0 96 64"
        aria-hidden="true"
        focusable="false"
        data-swatch-kind={item.kind}
        data-swatch-tone={tone}
        data-swatch-variant={String(variant)}
        className="w-full h-full block prism-contain-box"
      >
        <defs>
          <linearGradient id={sheenGradId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={tokens.contrast} stopOpacity={0.42} />
            <stop offset="100%" stopColor={tokens.contrast} stopOpacity={0} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="96" height="64" rx="8" fill="var(--prism-bg-mid)" />
        {bands.map((band) => (
          <g key={band.id}>
            <rect
              x={band.x}
              y={variant === 0 ? 8 : 10}
              width={band.width}
              height={variant === 0 ? 44 : 40}
              rx="4"
              fill={band.fill}
              fillOpacity={band.opacity}
            />
            <rect
              x={band.x + 1}
              y={variant === 0 ? 9 : 11}
              width={band.width - 2}
              height="16"
              rx="3"
              fill={`url(#${sheenGradId})`}
            />
          </g>
        ))}
        <line
          x1="8"
          y1="57"
          x2="88"
          y2="57"
          stroke={tokens.main}
          strokeOpacity={0.55}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 96 64"
      aria-hidden="true"
      focusable="false"
      data-swatch-kind={item.kind}
      data-swatch-tone={tone}
      data-swatch-variant={String(variant)}
      className="w-full h-full block prism-contain-box"
    >
      <rect x="0" y="0" width="96" height="64" rx="8" fill="var(--prism-bg-mid)" />
      <line x1="48" y1="6" x2="48" y2="58" stroke="var(--prism-divider)" strokeWidth="1" />
      <line x1="10" y1="32" x2="86" y2="32" stroke="var(--prism-divider)" strokeWidth="1" />
      <rect
        x="22"
        y="10"
        width="52"
        height="44"
        rx="6"
        fill="none"
        stroke="var(--prism-divider)"
        strokeDasharray="3 3"
        strokeWidth="1"
      />
      {variant === 0 ? (
        <g>
          <polygon
            points="48,11 71,32 48,53 25,32"
            fill={tokens.light}
            fillOpacity={0.28}
            stroke={tokens.main}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <polygon
            points="48,19 61,32 48,45 35,32"
            fill={tokens.main}
            fillOpacity={0.32}
            stroke={tokens.accent}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <circle cx="48" cy="32" r="3" fill={tokens.main} />
        </g>
      ) : (
        <g>
          <polygon
            points="48,10 68,26 48,54 28,26"
            fill={tokens.light}
            fillOpacity={0.24}
            stroke={tokens.main}
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <polyline
            points="28,26 48,34 68,26"
            fill="none"
            stroke={tokens.accent}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <line x1="48" y1="10" x2="48" y2="54" stroke={tokens.main} strokeOpacity={0.75} strokeWidth="1.4" />
          <circle cx="48" cy="34" r="2.6" fill={tokens.accent} />
        </g>
      )}
    </svg>
  );
}

const headerClass = /*#__PURE__*/ stableClassName('asset-swatch-grid', 'header');
const filtersClass = /*#__PURE__*/ stableClassName('asset-swatch-grid', 'filters');
const gridClass = /*#__PURE__*/ stableClassName('asset-swatch-grid', 'grid');
const inspectorClass = /*#__PURE__*/ stableClassName('asset-swatch-grid', 'inspector');

function AssetSwatchGridInner({
  items,
  selectedId,
  defaultSelectedId,
  onSelectAsset,
  onDragAssetStart,
  title = DEFAULT_TITLE,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AssetSwatchGridProps) {
  const headingId = useId();
  const svgNamespaceId = useId();
  const override = useComponentOverride('AssetSwatchGrid');

  const normalizedItems = useMemo(
    () => normalizeItems(items ?? DEFAULT_ITEMS),
    [items]
  );

  const isSelectionControlled = selectedId !== undefined;

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(() => {
    if (defaultSelectedId !== undefined) {
      return defaultSelectedId;
    }
    return normalizedItems[0]?.id ?? null;
  });

  const [activeKind, setActiveKind] = useState<AssetFilterKind>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const resolvedSelectedId = isSelectionControlled
    ? selectedId
    : internalSelectedId === null
      ? null
      : normalizedItems.some((item) => item.id === internalSelectedId)
        ? internalSelectedId
        : (normalizedItems[0]?.id ?? null);

  const selectedAsset =
    resolvedSelectedId === null
      ? null
      : (normalizedItems.find((item) => item.id === resolvedSelectedId) ?? null);

  const safeTitle = title.trim().length > 0 ? title.trim() : DEFAULT_TITLE;
  const trimmedQuery = searchQuery.trim().toLowerCase();

  const searchMatchedItems = useMemo(
    () =>
      trimmedQuery.length > 0
        ? normalizedItems.filter((item) => matchesSearchQuery(item, trimmedQuery))
        : normalizedItems,
    [normalizedItems, trimmedQuery]
  );

  const kindCounts = useMemo<Record<AssetFilterKind, number>>(() => {
    const counts: Record<AssetFilterKind, number> = {
      all: searchMatchedItems.length,
      texture: 0,
      preset: 0,
      palette: 0,
      icon: 0,
    };
    for (const item of searchMatchedItems) {
      counts[item.kind] += 1;
    }
    return counts;
  }, [searchMatchedItems]);

  const filteredItems = useMemo(
    () =>
      activeKind === 'all'
        ? searchMatchedItems
        : searchMatchedItems.filter((item) => item.kind === activeKind),
    [activeKind, searchMatchedItems]
  );

  const hoveredAsset =
    hoveredId === null
      ? null
      : (filteredItems.find((item) => item.id === hoveredId) ?? null);

  const inspectedAsset = hoveredAsset ?? selectedAsset;
  const isPreviewingHover = hoveredAsset !== null;

  const selectAsset = (item: AssetSwatchItem) => {
    if (!isSelectionControlled) {
      setInternalSelectedId(item.id);
    }
    onSelectAsset?.(item);
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Escape' && searchQuery.length > 0) {
      event.preventDefault();
      setSearchQuery('');
    }
  };

  const handleTileKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    item: AssetSwatchItem
  ) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectAsset(item);
    }
  };

  const handleDragStart = (event: DragEvent<HTMLDivElement>, item: AssetSwatchItem) => {
    const isItemDraggable = item.draggable ?? true;
    if (!isItemDraggable) {
      event.preventDefault();
      return;
    }
    const safeName = getSafeAssetName(item.name);
    const payload = JSON.stringify({
      id: item.id,
      name: safeName,
      kind: item.kind,
      meta: item.meta ?? '',
      tone: item.tone ?? 'primary',
      tags: item.tags ?? [],
    });
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData(ASSET_DRAG_MIME, payload);
      event.dataTransfer.setData('text/plain', safeName);
    }
    setDraggingId(item.id);
    onDragAssetStart?.(item);
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveKind('all');
  };

  const merged = mergeProps({
    themeTarget: themeProps('asset-swatch-grid', {
      activeKind,
      count: normalizedItems.length,
      filteredCount: filteredItems.length,
      empty: normalizedItems.length === 0,
      hasSelection: selectedAsset !== null,
      searching: trimmedQuery.length > 0,
    }),
    baseClassName: 'prism-slab w-full max-w-full p-4 flex flex-col gap-3.5 min-w-0',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const inspectedTone: AssetSwatchTone = inspectedAsset?.tone ?? 'primary';
  const inspectedTokens = getToneTokens(inspectedTone);

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-col gap-3 min-w-0 max-w-full')}>
        <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h3
              id={headingId}
              className="text-sm font-semibold tracking-tight truncate min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {safeTitle}
            </h3>
            <span
              data-testid="asset-total-count"
              className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={STYLE_TEXT_SECONDARY}
            >
              {filteredItems.length} / {normalizedItems.length} assets
            </span>
          </div>

          <div className="prism-well rounded-xl px-2.5 h-9 flex items-center gap-2 w-full sm:w-64 max-w-full min-w-0">
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <input
              type="search"
              aria-label="Search assets and swatches"
              data-testid="asset-search-input"
              placeholder="Search textures, presets, tags..."
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="prism-focus-ring w-full min-w-0 bg-transparent text-xs font-medium focus:outline-none rounded"
              style={STYLE_TEXT_PRIMARY}
            />
            {searchQuery.length > 0 ? (
              <button
                type="button"
                aria-label="Clear search"
                data-testid="asset-search-clear"
                onClick={() => setSearchQuery('')}
                className="prism-crystal prism-focus-ring w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3 h-3 shrink-0" />
              </button>
            ) : null}
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter assets by kind"
          data-testid="asset-category-filters"
          className={cx(filtersClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = activeKind === option.value;
            const count = kindCounts[option.value];
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isActive}
                data-testid={`asset-filter-${option.value}`}
                data-active={isActive ? 'true' : undefined}
                onClick={() => setActiveKind(option.value)}
                className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
                style={
                  isActive
                    ? {
                        color: 'var(--prism-primary-main)',
                        boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                      }
                    : STYLE_TEXT_SECONDARY
                }
              >
                <span>{option.label}</span>
                <span
                  data-testid={`asset-filter-count-${option.value}`}
                  className="prism-well px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums"
                  style={{
                    color: isActive ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {normalizedItems.length === 0 ? (
        <div
          role="status"
          data-testid="asset-swatch-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center gap-2 min-w-0"
        >
          <Layers
            aria-hidden="true"
            className="w-5 h-5"
            style={STYLE_TEXT_SECONDARY}
          />
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No assets in library
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            Import textures, shader presets, palettes, or vector icons to populate the swatch grid.
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          role="status"
          data-testid="asset-swatch-no-matches"
          className="prism-well rounded-2xl px-4 py-7 text-center flex flex-col items-center gap-2.5 min-w-0"
        >
          <Search
            aria-hidden="true"
            className="w-5 h-5"
            style={STYLE_TEXT_SECONDARY}
          />
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No matching swatches found
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            Try broadening your search terms or switching back to All categories.
          </p>
          <button
            type="button"
            data-testid="asset-reset-filters"
            onClick={handleResetFilters}
            className="prism-crystal prism-focus-ring h-8 px-3 rounded-full text-xs font-semibold cursor-pointer hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
            style={STYLE_PRIMARY_MAIN}
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div
          role="group"
          aria-label={`${safeTitle} swatches`}
          data-testid="asset-swatch-grid-list"
          className={cx(gridClass, 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 min-w-0')}
        >
          {filteredItems.map((item) => {
            const safeName = getSafeAssetName(item.name);
            const kindLabel = getKindLabel(item.kind);
            const isSelected = selectedAsset?.id === item.id;
            const isHovered = hoveredAsset?.id === item.id;
            const isDragging = draggingId === item.id;
            const isItemDraggable = item.draggable ?? true;
            const tileTone: AssetSwatchTone = item.tone ?? 'primary';
            const tileTokens = getToneTokens(tileTone);

            const tileTarget = themeProps(
              'asset-swatch-grid',
              {
                assetId: item.id,
                kind: item.kind,
                tone: tileTone,
                selected: isSelected,
                hovered: isHovered,
                dragging: isDragging,
                draggable: isItemDraggable ? 'true' : 'false',
              },
              'tile'
            );

            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                aria-label={`Select ${safeName} (${kindLabel})`}
                draggable={isItemDraggable}
                data-testid={`asset-tile-${item.id}`}
                onClick={() => selectAsset(item)}
                onKeyDown={(e) => handleTileKeyDown(e, item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
                onFocus={() => setHoveredId(item.id)}
                onBlur={() => setHoveredId((prev) => (prev === item.id ? null : prev))}
                onDragStart={(e) => handleDragStart(e, item)}
                onDragEnd={handleDragEnd}
                {...mergeProps({
                  themeTarget: tileTarget,
                  baseClassName: cx(
                    'prism-crystal prism-focus-ring rounded-2xl p-2 flex flex-col gap-2 text-left transition-[color,background-color,border-color,opacity,transform] duration-150 min-w-0 cursor-pointer hover:-translate-y-0.5 focus-visible:-translate-y-0.5',
                    isDragging ? 'opacity-65 scale-[0.98]' : undefined
                  ),
                  baseStyle: isSelected
                    ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
                    : isHovered
                      ? { boxShadow: 'inset 0 0 0 1px var(--prism-secondary-main)' }
                      : undefined,
                })}
              >
                <div className="prism-well rounded-xl overflow-hidden aspect-[3/2] w-full relative">
                  {renderOpticalSwatchSvg(item, `${svgNamespaceId}-tile-${item.id}`)}
                  <span
                    aria-hidden="true"
                    className="prism-crystal absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1 text-[10px] font-semibold"
                    style={{ color: tileTokens.main }}
                  >
                    {renderKindIcon(item.kind)}
                  </span>
                  <span
                    aria-hidden="true"
                    data-testid={`asset-drag-indicator-${item.id}`}
                    className="prism-crystal absolute top-1.5 right-1.5 w-5 h-5 rounded-md inline-flex items-center justify-center"
                    style={{
                      color: isItemDraggable
                        ? 'var(--prism-text-secondary)'
                        : 'var(--prism-text-disabled)',
                    }}
                  >
                    {isItemDraggable ? (
                      <GripVertical className="w-3 h-3 shrink-0" />
                    ) : (
                      <Lock className="w-3 h-3 shrink-0" />
                    )}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 px-0.5 min-w-0">
                  <span
                    data-testid={`asset-tile-name-${item.id}`}
                    className="text-xs font-semibold truncate min-w-0"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {safeName}
                  </span>
                  <span
                    data-testid={`asset-tile-meta-${item.id}`}
                    className="font-mono text-[10px] font-medium tabular-nums truncate min-w-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {item.meta ?? kindLabel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="asset-preview-inspector"
        data-preview-mode={inspectedAsset ? (isPreviewingHover ? 'hover' : 'selected') : 'idle'}
        className={cx(
          inspectorClass,
          'prism-well rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center gap-3.5 min-w-0 max-w-full'
        )}
      >
        {inspectedAsset ? (
          <>
            <div
              data-testid="asset-inspector-swatch"
              className="prism-crystal rounded-xl p-1.5 w-full sm:w-40 aspect-[3/2] shrink-0 overflow-hidden"
            >
              {renderOpticalSwatchSvg(
                inspectedAsset,
                `${svgNamespaceId}-inspector-${inspectedAsset.id}`
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col gap-1.5 max-w-full">
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <span
                  data-testid="asset-inspector-mode"
                  className="prism-crystal px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider shrink-0"
                  style={{
                    color: isPreviewingHover
                      ? 'var(--prism-secondary-dark)'
                      : 'var(--prism-primary-main)',
                  }}
                >
                  {isPreviewingHover ? 'Hover Preview' : 'Selected'}
                </span>
                <span
                  data-testid="asset-inspector-kind"
                  className="prism-crystal px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[11px] font-semibold shrink-0"
                  style={{ color: inspectedTokens.main }}
                >
                  {renderKindIcon(inspectedAsset.kind)}
                  <span>{getKindLabel(inspectedAsset.kind)}</span>
                </span>
                <span
                  data-testid="asset-inspector-tone"
                  className="prism-crystal px-2 py-0.5 rounded-full inline-flex items-center gap-1.5 text-[11px] font-medium shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: inspectedTokens.main }}
                  />
                  <span>{inspectedTokens.label}</span>
                </span>
                {inspectedAsset.draggable === false ? (
                  <span
                    data-testid="asset-inspector-drag-locked"
                    className="prism-crystal px-2 py-0.5 rounded-full inline-flex items-center gap-1 text-[11px] font-medium shrink-0"
                    style={STYLE_TEXT_DISABLED}
                  >
                    <Lock aria-hidden="true" className="w-3 h-3 shrink-0" />
                    <span>Drag Locked</span>
                  </span>
                ) : null}
              </div>

              <div
                data-testid="asset-inspector-name"
                className="text-sm font-semibold truncate min-w-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {getSafeAssetName(inspectedAsset.name)}
              </div>

              <div
                data-testid="asset-inspector-meta"
                className="font-mono text-xs tabular-nums truncate min-w-0"
                style={STYLE_TEXT_SECONDARY}
              >
                {inspectedAsset.meta ?? 'No technical metadata'}
              </div>

              {inspectedAsset.tags && inspectedAsset.tags.length > 0 ? (
                <div
                  data-testid="asset-inspector-tags"
                  className="flex flex-wrap items-center gap-1.5 pt-0.5 min-w-0"
                >
                  {inspectedAsset.tags.map((tag) => (
                    <span
                      key={`${inspectedAsset.id}-tag-${tag}`}
                      className="prism-crystal px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-mono text-[11px] font-medium shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      <Tag aria-hidden="true" className="w-2.5 h-2.5 shrink-0" />
                      <span>{tag}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <p
            data-testid="asset-inspector-empty"
            className="text-xs font-medium min-w-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {normalizedItems.length === 0
              ? 'Live preview inspector ready — add assets to inspect optical swatches and metadata.'
              : 'No asset selected — hover or select a swatch tile to inspect its optical preview and tags.'}
          </p>
        )}
      </div>
    </div>
  );
}

export const AssetSwatchGrid = /*#__PURE__*/ memoWithDisplayName(AssetSwatchGridInner, 'AssetSwatchGrid');
