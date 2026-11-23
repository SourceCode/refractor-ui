'use client';

import {
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  Eye,
  EyeOff,
  Image,
  Layers,
  Lock,
  Plus,
  Shapes,
  SlidersHorizontal,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, STYLE_WARNING_MAIN } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type LayerKind = 'image' | 'adjustment' | 'text' | 'shape' | 'mask';

export type LayerBlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'soft-light'
  | 'color-dodge'
  | 'difference';

export interface BlendLayerItem {
  /** Unique identifier used for React keys, selection, and layer mutations. */
  id: string;
  /** Display name rendered on the layer row and referenced in accessible control labels. */
  name: string;
  /** Semantic layer kind controlling the layer icon and accent token. */
  kind: LayerKind;
  /** Whether the layer contributes to the composite output. */
  visible: boolean;
  /** Layer opacity percentage in [0..100]. */
  opacity: number;
  /** Compositing blend mode applied to the layer. */
  blendMode: LayerBlendMode;
  /** Clips this layer's alpha to the layer directly beneath it. */
  clipped?: boolean;
  /** Locks the layer against blend, opacity, clipping, reorder, and delete changes. */
  locked?: boolean;
}

type LayerBlendStackBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface LayerBlendStackProps extends LayerBlendStackBaseProps {
  /** Controlled ordered list of compositing layers (top to bottom). */
  layers?: ReadonlyArray<BlendLayerItem>;
  /** Initial ordered layers when operating in uncontrolled mode (defaults to 4 grading layers). */
  defaultLayers?: ReadonlyArray<BlendLayerItem>;
  /** Controlled active layer identifier (or null for no selection). */
  selectedLayerId?: string | null;
  /** Initial active layer identifier in uncontrolled mode (defaults to the first layer). */
  defaultSelectedLayerId?: string | null;
  /** Callback fired with the updated layer array whenever layers are added, edited, reordered, or deleted. */
  onChange?: (layers: BlendLayerItem[]) => void;
  /** Callback fired when a layer is selected as active. */
  onSelectLayer?: (layer: BlendLayerItem) => void;
  /** Visible panel heading (defaults to 'Layer & Blend Stack'). */
  title?: string;
  /** Disables all layer controls, selection, addition, reordering, and deletion (defaults to false). */
  disabled?: boolean;
}

interface BlendModeOption {
  value: LayerBlendMode;
  label: string;
}

interface LayerKindVisualMeta {
  accentToken: string;
  label: string;
}

const DEFAULT_TITLE = 'Layer & Blend Stack';
const FALLBACK_LAYER_NAME = 'Untitled Layer';

const DEFAULT_LAYERS: ReadonlyArray<BlendLayerItem> = [
  {
    id: 'layer-lut-grade',
    name: 'Film LUT · Kodak 2383',
    kind: 'adjustment',
    visible: true,
    opacity: 85,
    blendMode: 'overlay',
    clipped: true,
    locked: false,
  },
  {
    id: 'layer-halation-mask',
    name: 'Specular Halation Mask',
    kind: 'mask',
    visible: true,
    opacity: 60,
    blendMode: 'screen',
    clipped: false,
    locked: false,
  },
  {
    id: 'layer-title-plate',
    name: 'Editorial Title Plate',
    kind: 'text',
    visible: true,
    opacity: 100,
    blendMode: 'soft-light',
    clipped: false,
    locked: false,
  },
  {
    id: 'layer-raw-plate',
    name: 'RAW Base Plate · 16-bit',
    kind: 'image',
    visible: true,
    opacity: 100,
    blendMode: 'normal',
    clipped: false,
    locked: false,
  },
];

const BLEND_MODE_OPTIONS: ReadonlyArray<BlendModeOption> = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'screen', label: 'Screen' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'soft-light', label: 'Soft Light' },
  { value: 'color-dodge', label: 'Color Dodge' },
  { value: 'difference', label: 'Difference' },
];

function isLayerBlendMode(value: string): value is LayerBlendMode {
  return (
    value === 'normal' ||
    value === 'multiply' ||
    value === 'screen' ||
    value === 'overlay' ||
    value === 'soft-light' ||
    value === 'color-dodge' ||
    value === 'difference'
  );
}

function getBlendModeLabel(mode: LayerBlendMode): string {
  switch (mode) {
    case 'normal':
      return 'Normal';
    case 'multiply':
      return 'Multiply';
    case 'screen':
      return 'Screen';
    case 'overlay':
      return 'Overlay';
    case 'soft-light':
      return 'Soft Light';
    case 'color-dodge':
      return 'Color Dodge';
    case 'difference':
      return 'Difference';
  }
}

function getLayerKindMeta(kind: LayerKind): LayerKindVisualMeta {
  switch (kind) {
    case 'image':
      return { accentToken: 'var(--prism-secondary-main)', label: 'Image' };
    case 'adjustment':
      return { accentToken: 'var(--prism-primary-main)', label: 'Adjustment' };
    case 'text':
      return { accentToken: 'var(--prism-info-main)', label: 'Text' };
    case 'shape':
      return { accentToken: 'var(--prism-success-main)', label: 'Shape' };
    case 'mask':
      return { accentToken: 'var(--prism-warning-main)', label: 'Mask' };
  }
}

function renderLayerKindIcon(kind: LayerKind): ReactNode {
  switch (kind) {
    case 'image':
      return <Image aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'adjustment':
      return <SlidersHorizontal aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'text':
      return <Type aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'shape':
      return <Shapes aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'mask':
      return <Layers aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

function getSafeLayerName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_LAYER_NAME;
}

function normalizeLayers(list: ReadonlyArray<BlendLayerItem>): BlendLayerItem[] {
  const seen = new Set<string>();
  const out: BlendLayerItem[] = [];
  for (const item of list) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    out.push({
      ...item,
      opacity: clampNumber(Math.round(item.opacity), 0, 100, 100),
    });
  }
  return out;
}

function createNextAdjustmentLayer(existing: ReadonlyArray<BlendLayerItem>): BlendLayerItem {
  const existingIds = new Set(existing.map((layer) => layer.id));
  let seq = existing.filter((layer) => layer.kind === 'adjustment').length + 1;
  let id = `layer-adjustment-${seq}`;
  while (existingIds.has(id)) {
    seq += 1;
    id = `layer-adjustment-${seq}`;
  }
  return {
    id,
    name: `Adjustment ${seq}`,
    kind: 'adjustment',
    visible: true,
    opacity: 100,
    blendMode: 'normal',
    clipped: false,
    locked: false,
  };
}

const headerClass = /*#__PURE__*/ stableClassName('layer-blend-stack', 'header');
const controlsClass = /*#__PURE__*/ stableClassName('layer-blend-stack', 'controls');
const listClass = /*#__PURE__*/ stableClassName('layer-blend-stack', 'list');
const statusClass = /*#__PURE__*/ stableClassName('layer-blend-stack', 'status');

function LayerBlendStackInner({
  layers,
  defaultLayers,
  selectedLayerId,
  defaultSelectedLayerId,
  onChange,
  onSelectLayer,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: LayerBlendStackProps) {
  const headingId = useId();
  const override = useComponentOverride('LayerBlendStack');

  const isLayersControlled = layers !== undefined;
  const isSelectionControlled = selectedLayerId !== undefined;

  const [internalLayers, setInternalLayers] = useState<BlendLayerItem[]>(() =>
    normalizeLayers(defaultLayers ?? DEFAULT_LAYERS)
  );

  const currentLayers = useMemo(
    () => (isLayersControlled ? normalizeLayers(layers) : internalLayers),
    [isLayersControlled, layers, internalLayers]
  );

  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(() => {
    if (defaultSelectedLayerId !== undefined) {
      return defaultSelectedLayerId;
    }
    const seed = normalizeLayers(defaultLayers ?? DEFAULT_LAYERS);
    return seed[0]?.id ?? null;
  });

  const resolvedSelectedId = isSelectionControlled
    ? selectedLayerId
    : internalSelectedId === null
      ? null
      : currentLayers.some((item) => item.id === internalSelectedId)
        ? internalSelectedId
        : (currentLayers[0]?.id ?? null);

  const activeLayer =
    resolvedSelectedId === null
      ? null
      : (currentLayers.find((item) => item.id === resolvedSelectedId) ?? null);

  const safeTitle = title.trim().length > 0 ? title.trim() : DEFAULT_TITLE;
  const visibleCount = currentLayers.filter((item) => item.visible).length;
  const totalCount = currentLayers.length;

  const isActiveLocked = Boolean(activeLayer?.locked);
  const isActiveClipped = Boolean(activeLayer?.clipped);
  const controlsDisabled = disabled || !activeLayer || isActiveLocked;
  const lockToggleDisabled = disabled || !activeLayer;
  const activeOpacity = activeLayer ? activeLayer.opacity : 0;

  const commitLayers = (nextLayers: BlendLayerItem[]) => {
    if (!isLayersControlled) {
      setInternalLayers(nextLayers);
    }
    onChange?.(nextLayers);
  };

  const selectLayer = (layer: BlendLayerItem) => {
    if (!isSelectionControlled) {
      setInternalSelectedId(layer.id);
    }
    onSelectLayer?.(layer);
  };

  const updateLayerById = (
    layerId: string,
    updater: (layer: BlendLayerItem) => BlendLayerItem
  ) => {
    const nextLayers = currentLayers.map((layer) =>
      layer.id === layerId ? updater(layer) : layer
    );
    commitLayers(nextLayers);
  };

  const handleAddAdjustment = () => {
    const created = createNextAdjustmentLayer(currentLayers);
    const nextLayers = [...currentLayers, created];
    commitLayers(nextLayers);
    selectLayer(created);
  };

  const handleBlendModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    if (controlsDisabled || !activeLayer) {
      return;
    }
    const nextMode = event.target.value;
    if (!isLayerBlendMode(nextMode)) {
      return;
    }
    updateLayerById(activeLayer.id, (layer) => ({ ...layer, blendMode: nextMode }));
  };

  const handleOpacityChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (controlsDisabled || !activeLayer) {
      return;
    }
    const parsed = clampNumber(Math.round(Number(event.target.value)), 0, 100, activeLayer.opacity);
    updateLayerById(activeLayer.id, (layer) => ({ ...layer, opacity: parsed }));
  };

  const handleToggleVisibility = (layerId: string) => {
    updateLayerById(layerId, (layer) => ({ ...layer, visible: !layer.visible }));
  };

  const handleMoveLayer = (fromIndex: number, toIndex: number) => {
    const nextLayers = [...currentLayers];
    const moved = nextLayers.splice(fromIndex, 1);
    nextLayers.splice(toIndex, 0, ...moved);
    commitLayers(nextLayers);
  };

  const handleDeleteLayer = (layerId: string) => {
    const deletedIndex = currentLayers.findIndex((item) => item.id === layerId);
    const nextLayers = currentLayers.filter((item) => item.id !== layerId);
    commitLayers(nextLayers);

    if (activeLayer?.id === layerId) {
      const nextActive = nextLayers[Math.min(deletedIndex, nextLayers.length - 1)];
      if (nextActive) {
        selectLayer(nextActive);
      }
    }
  };

  const handleRowClick = (layer: BlendLayerItem) => {
    if (disabled) {
      return;
    }
    selectLayer(layer);
  };

  const handleRowKeyDown = (
    event: ReactKeyboardEvent<HTMLDivElement>,
    layer: BlendLayerItem
  ) => {
    if (disabled || event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectLayer(layer);
    }
  };

  const merged = mergeProps({
    themeTarget: themeProps('layer-blend-stack', {
      disabled,
      empty: totalCount === 0,
      count: totalCount,
      activeBlendMode: activeLayer?.blendMode,
      activeLocked: isActiveLocked,
      activeClipped: isActiveClipped,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full p-4 flex flex-col gap-3.5 min-w-0',
      disabled ? 'opacity-65' : undefined
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2 min-w-0')}>
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
          <span
            data-testid="layer-count-pill"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {visibleCount} / {totalCount} visible
          </span>
        </div>

        <button
          type="button"
          disabled={disabled}
          data-testid="layer-add-adjustment"
          onClick={handleAddAdjustment}
          className="prism-btn-primary prism-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
        >
          <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Add Adjustment</span>
        </button>
      </div>

      <div
        role="group"
        aria-label="Active layer controls"
        data-testid="active-layer-controls"
        className={cx(controlsClass, 'prism-well rounded-2xl p-3 flex flex-wrap items-center gap-3 min-w-0')}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            Blend
          </span>
          <select
            aria-label="Active layer blend mode"
            data-testid="active-blend-mode-select"
            value={activeLayer?.blendMode ?? 'normal'}
            disabled={controlsDisabled}
            onChange={handleBlendModeChange}
            className="prism-crystal prism-focus-ring h-8 rounded-xl px-2.5 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed min-w-[124px]"
            style={STYLE_TEXT_PRIMARY}
          >
            {BLEND_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[168px]">
          <span
            aria-hidden="true"
            className="text-[11px] font-semibold uppercase tracking-wider shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            Opacity
          </span>
          <div className={cx('relative h-7 flex-1 min-w-[84px] flex items-center', controlsDisabled ? 'opacity-50' : undefined)}>
            <div className="prism-crystal w-full h-2.5 rounded-full overflow-hidden p-0.5">
              <div
                data-testid="active-opacity-fill"
                className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                style={{
                  width: `${activeOpacity}%`,
                  backgroundColor: 'var(--prism-primary-main)',
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={activeOpacity}
              disabled={controlsDisabled}
              aria-label="Active layer opacity"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={activeOpacity}
              aria-valuetext={`${activeOpacity}%`}
              data-testid="active-opacity-slider"
              onChange={handleOpacityChange}
              className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div
              aria-hidden="true"
              className="prism-thumb w-4 h-4 rounded-full pointer-events-none absolute -ml-2 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
              style={{ left: `${activeOpacity}%` }}
            />
          </div>
          <span
            data-testid="active-opacity-readout"
            className="prism-crystal px-2 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums min-w-[44px] text-center shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {activeLayer ? `${activeLayer.opacity}%` : '—'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            disabled={controlsDisabled}
            aria-pressed={isActiveClipped}
            data-testid="active-clip-toggle"
            data-active={isActiveClipped ? 'true' : undefined}
            onClick={
              activeLayer
                ? () =>
                    updateLayerById(activeLayer.id, (layer) => ({
                      ...layer,
                      clipped: !layer.clipped,
                    }))
                : undefined
            }
            className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
            style={
              isActiveClipped
                ? {
                    color: 'var(--prism-primary-main)',
                    boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                  }
                : STYLE_TEXT_SECONDARY
            }
          >
            <CornerDownRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Clip to Below</span>
          </button>

          <button
            type="button"
            disabled={lockToggleDisabled}
            aria-pressed={isActiveLocked}
            aria-label="Lock active layer"
            data-testid="active-lock-toggle"
            data-active={isActiveLocked ? 'true' : undefined}
            onClick={
              activeLayer
                ? () =>
                    updateLayerById(activeLayer.id, (layer) => ({
                      ...layer,
                      locked: !layer.locked,
                    }))
                : undefined
            }
            className="prism-crystal prism-focus-ring h-8 px-2.5 rounded-xl inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
            style={
              isActiveLocked
                ? {
                    color: 'var(--prism-warning-main)',
                    boxShadow: 'inset 0 0 0 1.5px var(--prism-warning-main)',
                  }
                : STYLE_TEXT_SECONDARY
            }
          >
            {isActiveLocked ? (
              <Lock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <Unlock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>{isActiveLocked ? 'Locked' : 'Lock'}</span>
          </button>
        </div>
      </div>

      {totalCount === 0 ? (
        <div
          role="status"
          data-testid="layer-stack-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center gap-2 min-w-0"
        >
          <Layers
            aria-hidden="true"
            className="w-5 h-5"
            style={STYLE_TEXT_SECONDARY}
          />
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            No layers in stack
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            Add an adjustment layer to start compositing and color grading.
          </p>
        </div>
      ) : (
        <div
          role="list"
          aria-label={`${safeTitle} layers`}
          data-testid="layer-stack-list"
          className={cx(listClass, 'flex flex-col gap-2 min-w-0')}
        >
          {currentLayers.map((layer, index) => {
            const safeName = getSafeLayerName(layer.name);
            const isSelected = activeLayer?.id === layer.id;
            const isLocked = Boolean(layer.locked);
            const isClipped = Boolean(layer.clipped);
            const moveUpDisabled = disabled || isLocked || index === 0;
            const moveDownDisabled = disabled || isLocked || index === totalCount - 1;
            const deleteDisabled = disabled || isLocked || totalCount <= 1;
            const blendLabel = getBlendModeLabel(layer.blendMode);
            const kindMeta = getLayerKindMeta(layer.kind);

            const rowTarget = themeProps(
              'layer-blend-stack',
              {
                layerId: layer.id,
                kind: layer.kind,
                blendMode: layer.blendMode,
                selected: isSelected,
                clipped: isClipped,
                locked: isLocked,
                hidden: !layer.visible,
              },
              'item'
            );

            return (
              <div
                key={layer.id}
                role="listitem"
                data-testid={`layer-row-${layer.id}`}
                {...mergeProps({
                  themeTarget: rowTarget,
                  baseClassName: cx(
                    'prism-crystal rounded-2xl px-2.5 py-2 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 transition-[color,background-color,border-color,opacity,transform] min-w-0',
                    isClipped ? 'ml-3' : undefined,
                    !layer.visible ? 'opacity-70' : undefined
                  ),
                  baseStyle: isSelected
                    ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
                    : undefined,
                })}
              >
                <div
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-pressed={isSelected}
                  aria-disabled={disabled || undefined}
                  aria-label={`Select layer ${safeName}`}
                  data-testid={`layer-select-${layer.id}`}
                  onClick={() => handleRowClick(layer)}
                  onKeyDown={(e) => handleRowKeyDown(e, layer)}
                  className={cx(
                    'prism-focus-ring flex-1 min-w-0 flex items-center gap-2.5 rounded-xl px-1.5 py-1 text-left transition-[color,background-color,border-color,opacity,transform]',
                    disabled ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  {isClipped ? (
                    <span
                      aria-hidden="true"
                      data-testid={`layer-clip-glyph-${layer.id}`}
                      className="inline-flex items-center justify-center shrink-0"
                      style={STYLE_PRIMARY_MAIN}
                    >
                      <CornerDownRight className="w-3.5 h-3.5 shrink-0" />
                    </span>
                  ) : null}

                  <span
                    aria-hidden="true"
                    data-testid={`layer-kind-icon-${layer.id}`}
                    data-layer-kind={layer.kind}
                    data-layer-kind-label={kindMeta.label}
                    className="prism-well w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
                    style={{ color: kindMeta.accentToken }}
                  >
                    {renderLayerKindIcon(layer.kind)}
                  </span>

                  <div className="flex flex-col min-w-0 flex-1 gap-0.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        data-testid={`layer-name-${layer.id}`}
                        className="text-sm font-semibold truncate min-w-0"
                        style={{
                          color: layer.visible
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-text-secondary)',
                        }}
                      >
                        {safeName}
                      </span>
                      {isLocked ? (
                        <Lock
                          aria-hidden="true"
                          data-testid={`layer-locked-badge-${layer.id}`}
                          className="w-3 h-3 shrink-0"
                          style={STYLE_WARNING_MAIN}
                        />
                      ) : null}
                    </div>
                    <span
                      data-testid={`layer-meta-${layer.id}`}
                      className="font-mono text-[11px] font-medium tabular-nums truncate"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {blendLabel} · {layer.opacity}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={disabled}
                    aria-pressed={layer.visible}
                    aria-label={`Toggle visibility for ${safeName}`}
                    data-testid={`layer-visibility-${layer.id}`}
                    onClick={() => handleToggleVisibility(layer.id)}
                    className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                    style={{
                      color: layer.visible
                        ? 'var(--prism-text-primary)'
                        : 'var(--prism-text-disabled)',
                    }}
                  >
                    {layer.visible ? (
                      <Eye aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    ) : (
                      <EyeOff aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={moveUpDisabled}
                    aria-label={`Move ${safeName} up`}
                    data-testid={`layer-move-up-${layer.id}`}
                    onClick={() => handleMoveLayer(index, index - 1)}
                    className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    disabled={moveDownDisabled}
                    aria-label={`Move ${safeName} down`}
                    data-testid={`layer-move-down-${layer.id}`}
                    onClick={() => handleMoveLayer(index, index + 1)}
                    className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  </button>

                  <button
                    type="button"
                    disabled={deleteDisabled}
                    aria-label={`Delete ${safeName}`}
                    data-testid={`layer-delete-${layer.id}`}
                    onClick={() => handleDeleteLayer(layer.id)}
                    className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                    style={{
                      color: deleteDisabled
                        ? 'var(--prism-text-disabled)'
                        : 'var(--prism-error-main)',
                    }}
                  >
                    <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        role="status"
        aria-live="polite"
        data-testid="layer-status-summary"
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        {activeLayer ? (
          <>
            <span className="min-w-0 truncate">
              Active:{' '}
              <strong className="font-semibold" style={STYLE_TEXT_PRIMARY}>
                {getSafeLayerName(activeLayer.name)}
              </strong>{' '}
              · {getBlendModeLabel(activeLayer.blendMode)} ·{' '}
              <span className="font-mono tabular-nums">{activeLayer.opacity}%</span>
            </span>
            <span className="font-mono text-[11px] whitespace-nowrap shrink-0">
              {isActiveClipped ? 'Clipped to Below' : 'Unclipped'}
              {isActiveLocked ? ' · Locked' : ''}
            </span>
          </>
        ) : (
          <span>
            {totalCount === 0
              ? 'No active layer · Stack is empty'
              : 'No layer selected · Choose a layer to adjust blend mode and opacity'}
          </span>
        )}
      </div>
    </div>
  );
}

export const LayerBlendStack = /*#__PURE__*/ memoWithDisplayName(LayerBlendStackInner, 'LayerBlendStack');
