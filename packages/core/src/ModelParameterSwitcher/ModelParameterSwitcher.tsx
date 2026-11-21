'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import {
  Brain,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  Globe,
  SlidersHorizontal,
  Terminal,
  Thermometer,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type ModelSpeedTier = 'fast' | 'balanced' | 'reasoning';

export interface AiModelOption {
  /** Unique identifier for the AI model. */
  id: string;
  /** Human-readable display name of the model. */
  name: string;
  /** Optional provider or vendor label (e.g. 'Anthropic', 'Google', 'OpenAI'). */
  provider?: string;
  /** Formatted context window capacity label (e.g. '200K', '1M'). */
  contextWindow: string;
  /** Latency and reasoning profile tier ('fast' | 'balanced' | 'reasoning'). */
  speedTier: ModelSpeedTier;
  /** Optional supplementary tag (e.g. 'New', 'Preview', 'Default'). */
  badge?: string;
}

export interface ModelCapabilities {
  /** Enables live web search grounding during model generation. */
  webSearch: boolean;
  /** Enables sandboxed code execution and verification tools. */
  codeExecution: boolean;
  /** Allocates extended multi-step reasoning budget before responding. */
  extendedThinking: boolean;
  /** Sampling temperature clamped safely to the 0..2 range. */
  temperature: number;
}

export interface ModelParameterSwitcherProps extends BaseProps<HTMLDivElement> {
  /** Ordered list of selectable AI model options. */
  models: AiModelOption[];
  /** Controlled ID of the currently active model. */
  selectedModelId?: string;
  /** Initial model ID when operating in uncontrolled mode (defaults to models[0]?.id ?? ''). */
  defaultModelId?: string;
  /** Callback invoked when the user selects a model option. */
  onModelChange?: (modelId: string) => void;
  /** Controlled capability toggles and sampling temperature. */
  capabilities?: ModelCapabilities;
  /** Partial initial capability overrides in uncontrolled mode. */
  defaultCapabilities?: Partial<ModelCapabilities>;
  /** Callback invoked whenever a capability switch or temperature slider changes. */
  onCapabilitiesChange?: (caps: ModelCapabilities) => void;
  /** Whether the configuration popover starts open (defaults to false). */
  defaultOpen?: boolean;
  /** Disables opening the popover and modifying model or parameter settings. */
  disabled?: boolean;
}

type CapabilityToggleKey = 'webSearch' | 'codeExecution' | 'extendedThinking';

interface CapabilityMeta {
  key: CapabilityToggleKey;
  label: string;
  description: string;
}

interface SpeedTierMeta {
  label: string;
  pillClass: string;
}

const DEFAULT_CAPABILITIES: ModelCapabilities = {
  webSearch: true,
  codeExecution: true,
  extendedThinking: false,
  temperature: 0.4,
};

const CAPABILITY_ITEMS: ReadonlyArray<CapabilityMeta> = [
  {
    key: 'webSearch',
    label: 'Web Search',
    description: 'Ground responses with live web retrieval and citations.',
  },
  {
    key: 'codeExecution',
    label: 'Code Execution',
    description: 'Run sandboxed scripts to inspect and verify outputs.',
  },
  {
    key: 'extendedThinking',
    label: 'Extended Thinking',
    description: 'Allocate deeper multi-step reasoning before answering.',
  },
];

function clampTemperature(value: number): number {
  const clamped = clampNumber(value, 0, 2, DEFAULT_CAPABILITIES.temperature);
  return Math.round(clamped * 100) / 100;
}

function normalizeCapabilities(input?: Partial<ModelCapabilities>): ModelCapabilities {
  return {
    webSearch: input?.webSearch ?? DEFAULT_CAPABILITIES.webSearch,
    codeExecution: input?.codeExecution ?? DEFAULT_CAPABILITIES.codeExecution,
    extendedThinking: input?.extendedThinking ?? DEFAULT_CAPABILITIES.extendedThinking,
    temperature: clampTemperature(input?.temperature ?? DEFAULT_CAPABILITIES.temperature),
  };
}

function getSpeedTierMeta(tier: ModelSpeedTier): SpeedTierMeta {
  switch (tier) {
    case 'fast':
      return { label: 'Fast', pillClass: 'prism-emerald' };
    case 'balanced':
      return { label: 'Balanced', pillClass: 'prism-btn-secondary' };
    case 'reasoning':
      return { label: 'Reasoning', pillClass: 'prism-btn-primary' };
  }
}

function getCapabilityValue(caps: ModelCapabilities, key: CapabilityToggleKey): boolean {
  switch (key) {
    case 'webSearch':
      return caps.webSearch;
    case 'codeExecution':
      return caps.codeExecution;
    case 'extendedThinking':
      return caps.extendedThinking;
  }
}

function toggleCapabilityValue(
  caps: ModelCapabilities,
  key: CapabilityToggleKey
): ModelCapabilities {
  switch (key) {
    case 'webSearch':
      return { ...caps, webSearch: !caps.webSearch };
    case 'codeExecution':
      return { ...caps, codeExecution: !caps.codeExecution };
    case 'extendedThinking':
      return { ...caps, extendedThinking: !caps.extendedThinking };
  }
}

function renderCapabilityIcon(key: CapabilityToggleKey) {
  switch (key) {
    case 'webSearch':
      return <Globe aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'codeExecution':
      return <Terminal aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'extendedThinking':
      return <Brain aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

export function ModelParameterSwitcher({
  models,
  selectedModelId,
  defaultModelId,
  onModelChange,
  capabilities,
  defaultCapabilities,
  onCapabilitiesChange,
  defaultOpen = false,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ModelParameterSwitcherProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs(containerRef, ref);
  const panelId = useId();
  const listboxLabelId = useId();
  const temperatureId = useId();
  const override = useComponentOverride('ModelParameterSwitcher');

  const [open, setOpen] = useState<boolean>(defaultOpen);
  const isOpen = open && !disabled;

  const [activeModelId, setActiveModelId] = useControllableState<string>({
    value: selectedModelId,
    defaultValue: defaultModelId ?? models[0]?.id ?? '',
    onChange: onModelChange,
  });

  const initialCaps = useMemo<ModelCapabilities>(
    () => normalizeCapabilities(defaultCapabilities),
    [defaultCapabilities]
  );

  const [rawCaps, setCaps] = useControllableState<ModelCapabilities>({
    value: capabilities,
    defaultValue: initialCaps,
    onChange: onCapabilitiesChange,
  });

  const activeCaps = useMemo<ModelCapabilities>(
    () => normalizeCapabilities(rawCaps),
    [rawCaps]
  );

  const selectedModel = useMemo<AiModelOption | undefined>(
    () => models.find((m) => m.id === activeModelId) ?? (activeModelId === '' ? models[0] : undefined),
    [models, activeModelId]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideMouseDown = (event: MouseEvent) => {
      const root = containerRef.current;
      if (root && event.target instanceof Node && !root.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideMouseDown);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideMouseDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [isOpen]);

  const handleSelectModel = useCallback(
    (modelId: string) => {
      setActiveModelId(modelId);
    },
    [setActiveModelId]
  );

  const handleToggleCapability = useCallback(
    (key: CapabilityToggleKey) => {
      setCaps(toggleCapabilityValue(activeCaps, key));
    },
    [activeCaps, setCaps]
  );

  const handleTemperatureChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextTemperature = clampTemperature(Number(event.target.value));
      setCaps({ ...activeCaps, temperature: nextTemperature });
    },
    [activeCaps, setCaps]
  );

  const selectedTierMeta = selectedModel ? getSpeedTierMeta(selectedModel.speedTier) : null;
  const temperaturePercent = clampNumber((activeCaps.temperature / 2) * 100, 0, 100, 20);

  const merged = mergeProps({
    themeTarget: themeProps('model-parameter-switcher', {
      open: isOpen,
      disabled,
      modelId: selectedModel?.id,
      speedTier: selectedModel?.speedTier,
    }),
    baseClassName: 'relative inline-block w-full max-w-md',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={mergedRef} {...rest} {...merged}>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? panelId : undefined}
        data-testid="model-switcher-trigger"
        onClick={() => setOpen((prev) => !prev)}
        className="prism-crystal prism-focus-ring w-full min-h-12 px-3.5 py-2 rounded-2xl flex items-center justify-between gap-2.5 text-left cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        style={{ color: 'var(--prism-text-primary)' }}
      >
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <Cpu className="w-4 h-4 shrink-0" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex flex-wrap items-center gap-1.5">
            <span
              data-testid="model-switcher-selected-name"
              className="text-sm font-semibold truncate"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              {selectedModel
                ? selectedModel.name
                : models.length === 0
                  ? 'No models available'
                  : 'Select model'}
            </span>

            {selectedModel && selectedTierMeta ? (
              <>
                <span
                  data-testid="model-switcher-context-pill"
                  className="prism-well px-2 py-0.5 rounded-full text-[11px] font-mono tabular-nums font-medium shrink-0"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  {selectedModel.contextWindow}
                </span>

                <span
                  data-testid="model-switcher-speed-badge"
                  data-speed-tier={selectedModel.speedTier}
                  className={cx(
                    selectedTierMeta.pillClass,
                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0'
                  )}
                >
                  <span className="relative z-10">{selectedTierMeta.label}</span>
                </span>
              </>
            ) : null}
          </span>
        </span>

        <span
          aria-hidden="true"
          className="inline-flex items-center gap-1 shrink-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          {isOpen ? (
            <ChevronUp className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
          )}
        </span>
      </button>

      {isOpen ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Model and parameter settings"
          data-testid="model-switcher-popover"
          className="prism-slab absolute left-0 right-0 mt-2 p-4 z-40 space-y-4"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span
                id={listboxLabelId}
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                Model
              </span>
              <span
                className="text-[11px] font-mono tabular-nums"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {models.length} available
              </span>
            </div>

            {models.length === 0 ? (
              <div
                role="listbox"
                aria-labelledby={listboxLabelId}
                data-testid="model-switcher-empty"
                className="prism-well rounded-2xl px-4 py-5 text-center"
              >
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  No models configured.
                </p>
              </div>
            ) : (
              <div
                role="listbox"
                aria-labelledby={listboxLabelId}
                className="space-y-1.5"
              >
                {models.map((model) => {
                  const isSelected = selectedModel?.id === model.id;
                  const tierMeta = getSpeedTierMeta(model.speedTier);

                  return (
                    <button
                      key={model.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={disabled}
                      data-testid={`model-option-${model.id}`}
                      onClick={() => handleSelectModel(model.id)}
                      className={cx(
                        isSelected ? 'prism-crystal' : 'prism-well',
                        'prism-focus-ring w-full rounded-2xl px-3 py-2.5 flex items-center justify-between gap-2.5 text-left cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition-all'
                      )}
                      style={
                        isSelected
                          ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
                          : undefined
                      }
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className="text-sm font-semibold truncate"
                            style={{ color: 'var(--prism-text-primary)' }}
                          >
                            {model.name}
                          </span>
                          {model.badge ? (
                            <span
                              data-testid={`model-badge-${model.id}`}
                              className="prism-well px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0"
                              style={{ color: 'var(--prism-info-main)' }}
                            >
                              {model.badge}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {model.provider ? (
                            <span
                              className="text-[11px] font-medium"
                              style={{ color: 'var(--prism-text-secondary)' }}
                            >
                              {model.provider}
                            </span>
                          ) : null}
                          <span
                            className="prism-well px-2 py-0.5 rounded-full text-[10px] font-mono tabular-nums font-medium"
                            style={{ color: 'var(--prism-text-secondary)' }}
                          >
                            {model.contextWindow}
                          </span>
                          <span
                            data-testid={`model-option-tier-${model.id}`}
                            data-speed-tier={model.speedTier}
                            className={cx(
                              tierMeta.pillClass,
                              'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap'
                            )}
                          >
                            <span className="relative z-10">{tierMeta.label}</span>
                          </span>
                        </div>
                      </div>

                      {isSelected ? (
                        <span
                          aria-hidden="true"
                          className="prism-emerald w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0"
                        >
                          <Check className="w-3 h-3 stroke-[2.6]" aria-hidden="true" />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div
            className="pt-3 border-t space-y-2"
            style={{ borderColor: 'var(--prism-divider)' }}
          >
            <span
              className="block text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Capabilities
            </span>

            <div className="space-y-2">
              {CAPABILITY_ITEMS.map((item) => {
                const checked = getCapabilityValue(activeCaps, item.key);
                return (
                  <div
                    key={item.key}
                    className="prism-crystal rounded-2xl px-3 py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1 flex items-start gap-2.5">
                      <span
                        aria-hidden="true"
                        className="prism-well w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          color: checked
                            ? 'var(--prism-success-main)'
                            : 'var(--prism-text-secondary)',
                        }}
                      >
                        {renderCapabilityIcon(item.key)}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-xs font-semibold"
                          style={{ color: 'var(--prism-text-primary)' }}
                        >
                          {item.label}
                        </div>
                        <p
                          className="text-[11px] leading-snug"
                          style={{ color: 'var(--prism-text-secondary)' }}
                        >
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={item.label}
                      disabled={disabled}
                      onClick={() => handleToggleCapability(item.key)}
                      className={cx(
                        'prism-focus-ring relative w-11 h-6 rounded-full p-0.5 inline-flex items-center transition-all duration-200 cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed shrink-0',
                        checked ? 'prism-emerald' : 'prism-crystal'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          'prism-thumb block w-5 h-5 rounded-full transition-transform duration-200',
                          checked ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            className="pt-3 border-t space-y-2"
            style={{ borderColor: 'var(--prism-divider)' }}
          >
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor={temperatureId}
                className="inline-flex items-center gap-1.5 text-xs font-semibold"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                <Thermometer
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: 'var(--prism-primary-main)' }}
                />
                <span>Temperature</span>
              </label>

              <span
                data-testid="temperature-value"
                className="prism-well px-2.5 py-0.5 rounded-full text-xs font-mono tabular-nums font-semibold"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {activeCaps.temperature.toFixed(1)}
              </span>
            </div>

            <div className="relative h-7 flex items-center">
              <div className="prism-crystal w-full h-3 rounded-full overflow-hidden p-0.5">
                <div
                  data-testid="temperature-fill"
                  className="prism-emerald h-full rounded-full transition-all duration-75"
                  style={{ width: `${temperaturePercent}%` }}
                />
              </div>
              <input
                id={temperatureId}
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={activeCaps.temperature}
                disabled={disabled}
                onChange={handleTemperatureChange}
                className="peer absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
              <div
                aria-hidden="true"
                className="prism-thumb w-5 h-5 rounded-full pointer-events-none absolute -ml-2.5 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                style={{ left: `${temperaturePercent}%` }}
              />
            </div>

            <div
              className="flex items-center justify-between text-[10px] font-mono tabular-nums"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              <span>0.0 Precise</span>
              <span>1.0 Balanced</span>
              <span>2.0 Creative</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

ModelParameterSwitcher.displayName = 'ModelParameterSwitcher';
