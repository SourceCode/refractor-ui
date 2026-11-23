'use client';

import {
  memo,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Activity,
  AudioLines,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Flame,
  Plus,
  Power,
  SlidersHorizontal,
  Trash2,
  Waves,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type DspEffectCategory = 'dynamics' | 'eq' | 'time' | 'modulation' | 'saturation';

export type EffectsRackChainOrientation = 'horizontal' | 'vertical';

export interface DspEffectModule {
  /** Unique identifier used for React keys and rack mutations. */
  id: string;
  /** Plugin display name rendered on the card and referenced in accessible control labels. */
  name: string;
  /** Semantic DSP category controlling the category tag icon and --prism-* accent token. */
  category: DspEffectCategory;
  /** When true, the module passes dry signal and disables its wet/dry mix slider. */
  bypassed: boolean;
  /** Wet/dry parallel mix percentage clamped to [0..100]. */
  wetMixPct: number;
  /** Optional preset label shown beneath the plugin title (e.g. 'Warm 2:1'). */
  presetLabel?: string;
}

type EffectsRackChainBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface EffectsRackChainProps extends EffectsRackChainBaseProps {
  /** Controlled ordered list of DSP effect modules along the signal path. */
  effects?: ReadonlyArray<DspEffectModule>;
  /** Initial ordered DSP effect modules in uncontrolled mode (defaults to a 4-stage mastering chain). */
  defaultEffects?: ReadonlyArray<DspEffectModule>;
  /** Layout orientation of the signal-flow chain ('horizontal' | 'vertical', defaults to 'horizontal'). */
  orientation?: EffectsRackChainOrientation;
  /** Callback fired with the updated effects array whenever modules are added, toggled, mixed, reordered, or removed. */
  onChange?: (effects: DspEffectModule[]) => void;
  /** Optional handler invoked when clicking Add Insert (overrides default deterministic slot append). */
  onAddEffect?: () => void;
  /** Visible heading rendered in the prism-slab header (defaults to 'DSP Effects Rack'). */
  title?: string;
  /** Disables all rack header actions, per-module toggles, mix sliders, reordering, and removal (defaults to false). */
  disabled?: boolean;
}

interface CategoryVisualMeta {
  label: string;
  accentToken: string;
}

interface InsertTemplate {
  baseId: string;
  name: string;
  category: DspEffectCategory;
  wetMixPct: number;
  presetLabel: string;
}

const DEFAULT_TITLE = 'DSP Effects Rack';
const FALLBACK_EFFECT_NAME = 'Untitled Effect';

const DEFAULT_EFFECTS: ReadonlyArray<DspEffectModule> = [
  {
    id: 'dsp-prism-gate',
    name: 'Prism Gate',
    category: 'dynamics',
    bypassed: false,
    wetMixPct: 100,
    presetLabel: 'Tight Floor',
  },
  {
    id: 'dsp-optical-comp',
    name: 'Optical Comp',
    category: 'dynamics',
    bypassed: false,
    wetMixPct: 75,
    presetLabel: 'Warm 2:1',
  },
  {
    id: 'dsp-harmonic-tube',
    name: 'Harmonic Tube',
    category: 'saturation',
    bypassed: false,
    wetMixPct: 45,
    presetLabel: 'Triode Sheen',
  },
  {
    id: 'dsp-crystal-hall',
    name: 'Crystal Hall',
    category: 'time',
    bypassed: false,
    wetMixPct: 30,
    presetLabel: 'Studio Plate',
  },
];

const INSERT_TEMPLATES: readonly [
  InsertTemplate,
  InsertTemplate,
  InsertTemplate,
  InsertTemplate,
  InsertTemplate,
] = [
  {
    baseId: 'dsp-linear-eq',
    name: 'Linear Phase EQ',
    category: 'eq',
    wetMixPct: 100,
    presetLabel: 'Air Shelf',
  },
  {
    baseId: 'dsp-prism-chorus',
    name: 'Prism Chorus',
    category: 'modulation',
    wetMixPct: 40,
    presetLabel: 'Wide Detune',
  },
  {
    baseId: 'dsp-optical-limiter',
    name: 'Optical Limiter',
    category: 'dynamics',
    wetMixPct: 100,
    presetLabel: '-0.3 dBTP',
  },
  {
    baseId: 'dsp-tape-saturator',
    name: 'Tape Saturator',
    category: 'saturation',
    wetMixPct: 55,
    presetLabel: '15 IPS Warm',
  },
  {
    baseId: 'dsp-shimmer-delay',
    name: 'Shimmer Delay',
    category: 'time',
    wetMixPct: 35,
    presetLabel: '1/8 Dotted',
  },
];

function getCategoryMeta(category: DspEffectCategory): CategoryVisualMeta {
  switch (category) {
    case 'dynamics':
      return { label: 'Dynamics', accentToken: 'var(--prism-primary-main)' };
    case 'eq':
      return { label: 'EQ', accentToken: 'var(--prism-secondary-main)' };
    case 'time':
      return { label: 'Time', accentToken: 'var(--prism-info-main)' };
    case 'modulation':
      return { label: 'Modulation', accentToken: 'var(--prism-success-main)' };
    case 'saturation':
      return { label: 'Saturation', accentToken: 'var(--prism-warning-main)' };
  }
}

function renderCategoryIcon(category: DspEffectCategory): ReactNode {
  switch (category) {
    case 'dynamics':
      return <Activity aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'eq':
      return <SlidersHorizontal aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'time':
      return <Clock aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'modulation':
      return <Waves aria-hidden="true" className="w-3 h-3 shrink-0" />;
    case 'saturation':
      return <Flame aria-hidden="true" className="w-3 h-3 shrink-0" />;
  }
}

function getSafeEffectName(name: string): string {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_EFFECT_NAME;
}

function formatSlotIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

function normalizeEffects(list: ReadonlyArray<DspEffectModule>): DspEffectModule[] {
  const seen = new Set<string>();
  const normalized: DspEffectModule[] = [];
  for (const item of list) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    normalized.push({
      ...item,
      wetMixPct: clampNumber(Math.round(item.wetMixPct), 0, 100, 100),
    });
  }
  return normalized;
}

function createNextInsertEffect(existing: ReadonlyArray<DspEffectModule>): DspEffectModule {
  const existingIds = new Set(existing.map((item) => item.id));
  for (const template of INSERT_TEMPLATES) {
    if (!existingIds.has(template.baseId)) {
      return {
        id: template.baseId,
        name: template.name,
        category: template.category,
        bypassed: false,
        wetMixPct: template.wetMixPct,
        presetLabel: template.presetLabel,
      };
    }
  }
  const fallback = INSERT_TEMPLATES[0];
  let seq = 2;
  let candidateId = `${fallback.baseId}-${seq}`;
  while (existingIds.has(candidateId)) {
    seq += 1;
    candidateId = `${fallback.baseId}-${seq}`;
  }
  return {
    id: candidateId,
    name: `${fallback.name} ${seq}`,
    category: fallback.category,
    bypassed: false,
    wetMixPct: fallback.wetMixPct,
    presetLabel: fallback.presetLabel,
  };
}

function EffectsRackChainInner({
  effects,
  defaultEffects,
  orientation = 'horizontal',
  onChange,
  onAddEffect,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: EffectsRackChainProps) {
  const headingId = useId();
  const override = useComponentOverride('EffectsRackChain');
  const isControlled = effects !== undefined;

  const [internalEffects, setInternalEffects] = useState<DspEffectModule[]>(() =>
    normalizeEffects(defaultEffects ?? DEFAULT_EFFECTS)
  );

  const currentEffects = useMemo(
    () => (isControlled ? normalizeEffects(effects) : internalEffects),
    [isControlled, effects, internalEffects]
  );

  const safeTitle = title.trim().length > 0 ? title.trim() : DEFAULT_TITLE;
  const isHorizontal = orientation === 'horizontal';
  const totalCount = currentEffects.length;
  const activeEffects = currentEffects.filter((item) => !item.bypassed);
  const activeCount = activeEffects.length;
  const allBypassed = totalCount > 0 && activeCount === 0;
  const bypassAllDisabled = disabled || totalCount === 0;

  const commitEffects = (nextEffects: DspEffectModule[]) => {
    if (!isControlled) {
      setInternalEffects(nextEffects);
    }
    onChange?.(nextEffects);
  };

  const updateEffectById = (
    effectId: string,
    updater: (item: DspEffectModule) => DspEffectModule
  ) => {
    const nextEffects = currentEffects.map((item) =>
      item.id === effectId ? updater(item) : item
    );
    commitEffects(nextEffects);
  };

  const updateWetMix = (effectId: string, nextValue: number, fallbackPct: number) => {
    const clamped = clampNumber(Math.round(nextValue), 0, 100, fallbackPct);
    updateEffectById(effectId, (item) => ({ ...item, wetMixPct: clamped }));
  };

  const handleToggleBypassAll = () => {
    const nextBypassed = !allBypassed;
    commitEffects(currentEffects.map((item) => ({ ...item, bypassed: nextBypassed })));
  };

  const handleAddInsert = () => {
    if (onAddEffect) {
      onAddEffect();
      return;
    }
    const created = createNextInsertEffect(currentEffects);
    commitEffects([...currentEffects, created]);
  };

  const handleToggleEffectBypass = (effectId: string) => {
    updateEffectById(effectId, (item) => ({ ...item, bypassed: !item.bypassed }));
  };

  const handleWetMixChange = (
    event: ChangeEvent<HTMLInputElement>,
    effect: DspEffectModule
  ) => {
    if (disabled || effect.bypassed) {
      return;
    }
    updateWetMix(effect.id, Number(event.target.value), effect.wetMixPct);
  };

  const handleWetMixKeyDown = (
    event: ReactKeyboardEvent<HTMLInputElement>,
    effect: DspEffectModule
  ) => {
    if (event.nativeEvent.isComposing || disabled || effect.bypassed) {
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      updateWetMix(effect.id, 0, effect.wetMixPct);
    } else if (event.key === 'End') {
      event.preventDefault();
      updateWetMix(effect.id, 100, effect.wetMixPct);
    } else if (
      event.key === 'PageUp' ||
      (event.shiftKey && (event.key === 'ArrowRight' || event.key === 'ArrowUp'))
    ) {
      event.preventDefault();
      updateWetMix(effect.id, effect.wetMixPct + 10, effect.wetMixPct);
    } else if (
      event.key === 'PageDown' ||
      (event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowDown'))
    ) {
      event.preventDefault();
      updateWetMix(effect.id, effect.wetMixPct - 10, effect.wetMixPct);
    }
  };

  const handleMoveEffect = (fromIndex: number, toIndex: number) => {
    const nextEffects = [...currentEffects];
    const moved = nextEffects.splice(fromIndex, 1);
    nextEffects.splice(toIndex, 0, ...moved);
    commitEffects(nextEffects);
  };

  const handleRemoveEffect = (effectId: string) => {
    commitEffects(currentEffects.filter((item) => item.id !== effectId));
  };

  const signalChainSummary =
    activeEffects.length > 0
      ? `Input → ${activeEffects.map((item) => getSafeEffectName(item.name)).join(' → ')} → Output`
      : totalCount === 0
        ? 'Input → Direct Dry Signal → Output'
        : 'Input → Output (All Bypassed)';

  const merged = mergeProps({
    themeTarget: themeProps('effects-rack-chain', {
      orientation,
      disabled,
      empty: totalCount === 0,
      allBypassed,
      count: totalCount,
      activeCount,
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

  const headerClass = stableClassName('effects-rack-chain', 'header');
  const chainClass = stableClassName('effects-rack-chain', 'chain');
  const summaryClass = stableClassName('effects-rack-chain', 'summary');

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 pb-2.5 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <AudioLines className="w-3.5 h-3.5 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>
          <span
            data-testid="effects-active-counter"
            className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {activeCount} / {totalCount} Active
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={bypassAllDisabled}
            aria-pressed={allBypassed}
            data-testid="effects-bypass-all"
            data-active={allBypassed ? 'true' : undefined}
            onClick={handleToggleBypassAll}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
            style={
              allBypassed
                ? {
                    color: 'var(--prism-warning-main)',
                    boxShadow: 'inset 0 0 0 1.5px var(--prism-warning-main)',
                  }
                : { color: 'var(--prism-text-secondary)' }
            }
          >
            <Power aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Bypass All</span>
          </button>

          <button
            type="button"
            disabled={disabled}
            data-testid="effects-add-insert"
            onClick={handleAddInsert}
            className="prism-btn-primary prism-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed shrink-0"
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Add Insert</span>
          </button>
        </div>
      </div>

      {totalCount === 0 ? (
        <div
          role="status"
          data-testid="effects-rack-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center gap-2 min-w-0"
        >
          <AudioLines
            aria-hidden="true"
            className="w-5 h-5"
            style={STYLE_TEXT_SECONDARY}
          />
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            Direct Dry Signal — No inserts loaded
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            Add an insert module to shape your optical DSP signal chain.
          </p>
        </div>
      ) : (
        <div
          role="list"
          aria-label={`${safeTitle} signal chain`}
          data-testid="effects-rack-chain"
          data-orientation={orientation}
          className={cx(
            chainClass,
            isHorizontal
              ? 'flex flex-wrap items-stretch gap-2.5 min-w-0 max-w-full overflow-x-auto pb-1'
              : 'flex flex-col items-stretch gap-2.5 min-w-0 max-w-full'
          )}
        >
          {currentEffects.map((effect, index) => {
            const safeName = getSafeEffectName(effect.name);
            const slotNumber = formatSlotIndex(index);
            const categoryMeta = getCategoryMeta(effect.category);
            const presetText = effect.presetLabel?.trim() ?? '';
            const sliderDisabled = disabled || effect.bypassed;
            const moveEarlierDisabled = disabled || index === 0;
            const moveLaterDisabled = disabled || index === totalCount - 1;
            const isActive = !effect.bypassed;

            const slotTarget = themeProps(
              'effects-rack-chain',
              {
                effectId: effect.id,
                category: effect.category,
                bypassed: effect.bypassed,
                slot: slotNumber,
              },
              'slot'
            );

            return (
              <div
                key={effect.id}
                role="listitem"
                data-testid={`effect-slot-item-${effect.id}`}
                className={cx(
                  'flex items-center gap-2 min-w-0',
                  isHorizontal ? 'flex-row flex-1 basis-[230px] max-w-full' : 'flex-col w-full'
                )}
              >
                <div
                  data-testid={`effect-card-${effect.id}`}
                  {...mergeProps({
                    themeTarget: slotTarget,
                    baseClassName: cx(
                      'prism-well rounded-2xl p-3 flex flex-col gap-2.5 min-w-0 flex-1 w-full max-w-full transition-[color,background-color,border-color,opacity,transform]',
                      effect.bypassed ? 'opacity-65' : undefined
                    ),
                  })}
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span
                        data-testid={`effect-slot-badge-${effect.id}`}
                        className="prism-crystal px-1.5 py-0.5 rounded-md font-mono text-[10px] font-bold tabular-nums shrink-0"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {slotNumber}
                      </span>
                      <span
                        data-testid={`effect-category-${effect.id}`}
                        data-category={effect.category}
                        className="prism-crystal inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap shrink-0"
                        style={{
                          color: categoryMeta.accentToken,
                          boxShadow: `inset 0 0 0 1px ${categoryMeta.accentToken}`,
                        }}
                      >
                        {renderCategoryIcon(effect.category)}
                        <span>{categoryMeta.label}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={disabled}
                      aria-pressed={isActive}
                      aria-label={isActive ? `Bypass ${safeName}` : `Enable ${safeName}`}
                      data-testid={`effect-power-${effect.id}`}
                      data-active={isActive ? 'true' : undefined}
                      onClick={() => handleToggleEffectBypass(effect.id)}
                      className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
                      style={{
                        color: isActive
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-text-disabled)',
                      }}
                    >
                      <span
                        aria-hidden="true"
                        data-testid={`effect-power-dot-${effect.id}`}
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          backgroundColor: isActive
                            ? 'var(--prism-success-main)'
                            : 'var(--prism-text-disabled)',
                        }}
                      />
                      <span>{isActive ? 'Active' : 'Bypassed'}</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span
                      data-testid={`effect-name-${effect.id}`}
                      className="text-sm font-semibold tracking-tight truncate min-w-0"
                      style={{
                        color: isActive
                          ? 'var(--prism-text-primary)'
                          : 'var(--prism-text-secondary)',
                      }}
                    >
                      {safeName}
                    </span>
                    {presetText.length > 0 ? (
                      <span
                        data-testid={`effect-preset-${effect.id}`}
                        className="font-mono text-[11px] truncate min-w-0"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {presetText}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="text-[10px] font-semibold uppercase tracking-wider shrink-0"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        Wet / Dry
                      </span>
                      <span
                        data-testid={`effect-wet-readout-${effect.id}`}
                        className="prism-crystal px-1.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums min-w-[40px] text-center shrink-0"
                        style={{
                          color: sliderDisabled
                            ? 'var(--prism-text-disabled)'
                            : 'var(--prism-text-primary)',
                        }}
                      >
                        {effect.wetMixPct}%
                      </span>
                    </div>

                    <div
                      className={cx(
                        'relative h-6 w-full flex items-center min-w-0',
                        sliderDisabled ? 'opacity-50' : undefined
                      )}
                    >
                      <div className="prism-crystal w-full h-2 rounded-full overflow-hidden p-0.5">
                        <div
                          data-testid={`effect-wet-fill-${effect.id}`}
                          className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                          style={{
                            width: `${effect.wetMixPct}%`,
                            backgroundColor: isActive
                              ? categoryMeta.accentToken
                              : 'var(--prism-text-disabled)',
                          }}
                        />
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={effect.wetMixPct}
                        disabled={sliderDisabled}
                        aria-label={`${safeName} wet mix`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={effect.wetMixPct}
                        aria-valuetext={`${effect.wetMixPct}%`}
                        data-testid={`effect-wet-slider-${effect.id}`}
                        onChange={(event) => handleWetMixChange(event, effect)}
                        onKeyDown={(event) => handleWetMixKeyDown(event, effect)}
                        className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div
                        aria-hidden="true"
                        className="prism-thumb w-3.5 h-3.5 rounded-full pointer-events-none absolute -ml-[7px] transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                        style={{ left: `${effect.wetMixPct}%` }}
                      />
                    </div>
                  </div>

                  <div
                    className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t min-w-0"
                    style={STYLE_BORDER_DIVIDER}
                  >
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={moveEarlierDisabled}
                        aria-label={`Move ${safeName} earlier`}
                        data-testid={`effect-move-earlier-${effect.id}`}
                        onClick={() => handleMoveEffect(index, index - 1)}
                        className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {isHorizontal ? (
                          <ChevronLeft aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>

                      <button
                        type="button"
                        disabled={moveLaterDisabled}
                        aria-label={`Move ${safeName} later`}
                        data-testid={`effect-move-later-${effect.id}`}
                        onClick={() => handleMoveEffect(index, index + 1)}
                        className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {isHorizontal ? (
                          <ChevronRight aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={disabled}
                      aria-label={`Remove ${safeName}`}
                      data-testid={`effect-remove-${effect.id}`}
                      onClick={() => handleRemoveEffect(effect.id)}
                      className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                      style={{
                        color: disabled
                          ? 'var(--prism-text-disabled)'
                          : 'var(--prism-error-main)',
                      }}
                    >
                      <Trash2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>

                {index < totalCount - 1 ? (
                  <span
                    aria-hidden="true"
                    data-testid={`effect-connector-${effect.id}`}
                    data-direction={orientation}
                    className="prism-crystal w-6 h-6 rounded-full inline-flex items-center justify-center font-mono text-xs font-bold shrink-0 select-none"
                    style={{
                      color: isActive
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-text-disabled)',
                    }}
                  >
                    {isHorizontal ? '→' : '↓'}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <div
        aria-live="polite"
        aria-atomic="true"
        data-testid="effects-rack-summary"
        className={cx(
          summaryClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        <span className="font-mono text-[11px] truncate min-w-0" style={STYLE_TEXT_PRIMARY}>
          {signalChainSummary}
        </span>
        <span className="font-mono text-[11px] tabular-nums whitespace-nowrap shrink-0">
          {totalCount === 0
            ? '0 inserts'
            : `${activeCount} active · ${totalCount - activeCount} bypassed`}
        </span>
      </div>
    </div>
  );
}

export const EffectsRackChain = memo(EffectsRackChainInner);
EffectsRackChain.displayName = 'EffectsRackChain';
