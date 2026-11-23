'use client';

import { memo, useCallback, useId, useMemo, useState } from 'react';
import {
  Flag,
  Plus,
  Power,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_ERROR_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type FeatureFlagEnvId = 'dev' | 'staging' | 'prod';

export interface FeatureFlagAudienceRule {
  /** Stable unique identifier for the audience targeting rule. */
  id: string;
  /** Human-readable audience segment name (e.g., 'Internal Staff'). */
  label: string;
  /** Whether the audience targeting segment is currently active. */
  enabled: boolean;
}

export interface FeatureFlagRolloutState {
  /** Per-environment on/off switch state across Dev, Staging, and Prod. */
  environments: {
    dev: boolean;
    staging: boolean;
    prod: boolean;
  };
  /** Production gradual traffic rollout percentage clamped to [0, 100]. */
  rolloutPct: number;
  /** Emergency kill-switch state locking production OFF and rollout to 0%. */
  killed: boolean;
  /** Ordered list of audience targeting segments. */
  audienceRules: ReadonlyArray<FeatureFlagAudienceRule>;
}

type FeatureFlagRolloutBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface FeatureFlagRolloutProps extends FeatureFlagRolloutBaseProps {
  /** Monospace feature flag identifier pill (defaults to 'prism.optical_raytracer_v2'). */
  flagKey?: string;
  /** Human-readable release title (defaults to 'Optical Raytracer Pipeline'). */
  title?: string;
  /** Optional supporting summary describing what this flag gates. */
  description?: string;
  /** Controlled feature flag rollout state. */
  value?: FeatureFlagRolloutState;
  /** Initial partial rollout state when operating in uncontrolled mode. */
  defaultValue?: Partial<FeatureFlagRolloutState>;
  /** Callback invoked with the next sanitized rollout state after every mutation. */
  onChange?: (state: FeatureFlagRolloutState) => void;
  /** Disables all switches, rollout controls, kill switch, and audience rule actions. */
  disabled?: boolean;
}

type OverallFlagStatus = 'killed' | 'active' | 'partial' | 'standby';

interface StatusVisualMeta {
  label: string;
  colorVar: string;
}

interface EnvConfig {
  id: FeatureFlagEnvId;
  label: string;
  colorVar: string;
}

interface RolloutSegment {
  id: string;
  start: number;
}

const DEFAULT_FLAG_KEY = 'prism.optical_raytracer_v2';
const DEFAULT_TITLE = 'Optical Raytracer Pipeline';
const DEFAULT_DESCRIPTION =
  'Progressive raytraced refraction shaders and specular caustic pipeline across deployment tiers.';
const DEFAULT_ROLLOUT_PCT = 25;

const DEFAULT_ENVIRONMENTS: Readonly<FeatureFlagRolloutState['environments']> = {
  dev: true,
  staging: true,
  prod: true,
};

const DEFAULT_AUDIENCE_RULES: ReadonlyArray<FeatureFlagAudienceRule> = [
  { id: 'internal-staff', label: 'Internal Staff', enabled: true },
  { id: 'beta-cohort', label: 'Beta Cohort', enabled: true },
  { id: 'enterprise-tier', label: 'Enterprise Tier', enabled: false },
];

const ROLLOUT_PRESETS: ReadonlyArray<number> = [0, 10, 25, 50, 100];

const ROLLOUT_SEGMENTS: ReadonlyArray<RolloutSegment> = [
  { id: 'seg-10', start: 0 },
  { id: 'seg-20', start: 10 },
  { id: 'seg-30', start: 20 },
  { id: 'seg-40', start: 30 },
  { id: 'seg-50', start: 40 },
  { id: 'seg-60', start: 50 },
  { id: 'seg-70', start: 60 },
  { id: 'seg-80', start: 70 },
  { id: 'seg-90', start: 80 },
  { id: 'seg-100', start: 90 },
];

const ENV_CONFIGS: ReadonlyArray<EnvConfig> = [
  { id: 'dev', label: 'Dev', colorVar: 'var(--prism-info-main)' },
  { id: 'staging', label: 'Staging', colorVar: 'var(--prism-warning-main)' },
  { id: 'prod', label: 'Prod', colorVar: 'var(--prism-success-main)' },
];

const STATUS_META: Record<OverallFlagStatus, StatusVisualMeta> = {
  killed: {
    label: 'Killed',
    colorVar: 'var(--prism-error-main)',
  },
  active: {
    label: 'Active',
    colorVar: 'var(--prism-success-main)',
  },
  partial: {
    label: 'Partial Rollout',
    colorVar: 'var(--prism-warning-main)',
  },
  standby: {
    label: 'Standby',
    colorVar: 'var(--prism-info-main)',
  },
};

function sanitizeRolloutPct(raw: number): number {
  return Math.round(clampNumber(raw, 0, 100, 0));
}

function normalizeRolloutState(
  partial?: Partial<FeatureFlagRolloutState>
): FeatureFlagRolloutState {
  const killed = Boolean(partial?.killed);
  const rawEnvs = partial?.environments;
  const environments = {
    dev: rawEnvs ? Boolean(rawEnvs.dev) : DEFAULT_ENVIRONMENTS.dev,
    staging: rawEnvs ? Boolean(rawEnvs.staging) : DEFAULT_ENVIRONMENTS.staging,
    prod: killed ? false : rawEnvs ? Boolean(rawEnvs.prod) : DEFAULT_ENVIRONMENTS.prod,
  };
  const rolloutPct = killed
    ? 0
    : sanitizeRolloutPct(
        partial?.rolloutPct !== undefined ? partial.rolloutPct : DEFAULT_ROLLOUT_PCT
      );
  const audienceRules: ReadonlyArray<FeatureFlagAudienceRule> = (
    partial?.audienceRules ?? DEFAULT_AUDIENCE_RULES
  ).map((rule) => ({
    id: rule.id,
    label: rule.label,
    enabled: Boolean(rule.enabled),
  }));

  return {
    environments,
    rolloutPct,
    killed,
    audienceRules,
  };
}

function resolveOverallStatus(state: FeatureFlagRolloutState): OverallFlagStatus {
  if (state.killed) {
    return 'killed';
  }
  if (state.environments.prod && state.rolloutPct >= 100) {
    return 'active';
  }
  if (state.environments.prod && state.rolloutPct > 0) {
    return 'partial';
  }
  return 'standby';
}

function isEnvironmentEnabled(
  environments: FeatureFlagRolloutState['environments'],
  envId: FeatureFlagEnvId
): boolean {
  switch (envId) {
    case 'dev':
      return environments.dev;
    case 'staging':
      return environments.staging;
    case 'prod':
      return environments.prod;
  }
}

function withToggledEnvironment(
  environments: FeatureFlagRolloutState['environments'],
  envId: FeatureFlagEnvId
): FeatureFlagRolloutState['environments'] {
  switch (envId) {
    case 'dev':
      return { ...environments, dev: !environments.dev };
    case 'staging':
      return { ...environments, staging: !environments.staging };
    case 'prod':
      return { ...environments, prod: !environments.prod };
  }
}

function buildRuleId(
  label: string,
  existingRules: ReadonlyArray<FeatureFlagAudienceRule>
): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const baseId = `rule-${slug || 'segment'}`;
  const usedIds = new Set<string>(existingRules.map((rule) => rule.id));
  if (!usedIds.has(baseId)) {
    return baseId;
  }
  let suffix = 2;
  while (usedIds.has(`${baseId}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseId}-${suffix}`;
}

function buildSummaryText(
  state: FeatureFlagRolloutState,
  statusLabel: string,
  enabledRulesCount: number
): string {
  const activeEnvs: string[] = [];
  if (state.environments.dev) activeEnvs.push('Dev');
  if (state.environments.staging) activeEnvs.push('Staging');
  if (state.environments.prod) activeEnvs.push('Prod');
  const envSummary = activeEnvs.length > 0 ? activeEnvs.join(', ') : 'None';
  return `Status: ${statusLabel} · Active envs: ${envSummary} · Prod rollout: ${state.rolloutPct}% · Rules: ${enabledRulesCount}/${state.audienceRules.length} enabled`;
}

function FeatureFlagRolloutInner({
  flagKey = DEFAULT_FLAG_KEY,
  title = DEFAULT_TITLE,
  description,
  value,
  defaultValue,
  onChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FeatureFlagRolloutProps) {
  const headingId = useId();
  const sliderId = useId();
  const ruleInputId = useId();
  const ruleFeedbackId = useId();
  const override = useComponentOverride('FeatureFlagRollout');

  const isControlled = value !== undefined;
  const [uncontrolledState, setUncontrolledState] = useState<FeatureFlagRolloutState>(() =>
    normalizeRolloutState(defaultValue)
  );
  const [draftRule, setDraftRule] = useState<string>('');
  const [ruleFeedback, setRuleFeedback] = useState<string | null>(null);
  const [lastAnnouncement, setLastAnnouncement] = useState<string>('');

  const state = useMemo<FeatureFlagRolloutState>(
    () => (value !== undefined ? normalizeRolloutState(value) : uncontrolledState),
    [uncontrolledState, value]
  );

  const resolvedFlagKey = flagKey.trim() || DEFAULT_FLAG_KEY;
  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const resolvedDescription =
    description !== undefined ? description.trim() : DEFAULT_DESCRIPTION;

  const overallStatus = resolveOverallStatus(state);
  const statusMeta = STATUS_META[overallStatus];
  const isRolloutLocked = disabled || state.killed;
  const enabledRulesCount = state.audienceRules.reduce(
    (sum, rule) => sum + (rule.enabled ? 1 : 0),
    0
  );
  const summaryText = buildSummaryText(state, statusMeta.label, enabledRulesCount);

  const commitState = useCallback(
    (nextState: FeatureFlagRolloutState, announcement: string) => {
      if (!isControlled) {
        setUncontrolledState(nextState);
      }
      setLastAnnouncement(announcement);
      onChange?.(nextState);
    },
    [isControlled, onChange]
  );

  const handleToggleKillSwitch = useCallback(() => {
    if (!state.killed) {
      commitState(
        {
          ...state,
          killed: true,
          environments: {
            ...state.environments,
            prod: false,
          },
          rolloutPct: 0,
        },
        'Kill switch activated. Production disabled and rollout halted at 0%.'
      );
      return;
    }

    commitState(
      {
        ...state,
        killed: false,
      },
      'Flag restored. Production remains in standby until re-enabled.'
    );
  }, [commitState, state]);

  const handleToggleEnv = useCallback(
    (env: EnvConfig) => {
      const nextEnvironments = withToggledEnvironment(state.environments, env.id);
      const nextEnabled = isEnvironmentEnabled(nextEnvironments, env.id);
      commitState(
        {
          ...state,
          environments: nextEnvironments,
        },
        `${env.label} environment turned ${nextEnabled ? 'ON' : 'OFF'}.`
      );
    },
    [commitState, state]
  );

  const handleRolloutChange = useCallback(
    (rawPct: number) => {
      if (disabled || state.killed) return;
      const nextPct = sanitizeRolloutPct(rawPct);
      commitState(
        {
          ...state,
          rolloutPct: nextPct,
        },
        `Production rollout set to ${nextPct}%.`
      );
    },
    [commitState, disabled, state]
  );

  const handleToggleRule = useCallback(
    (targetRule: FeatureFlagAudienceRule) => {
      const nextEnabled = !targetRule.enabled;
      const nextRules = state.audienceRules.map((rule) =>
        rule.id === targetRule.id ? { ...rule, enabled: nextEnabled } : rule
      );
      commitState(
        {
          ...state,
          audienceRules: nextRules,
        },
        `Audience rule "${targetRule.label}" ${nextEnabled ? 'enabled' : 'disabled'}.`
      );
    },
    [commitState, state]
  );

  const handleRemoveRule = useCallback(
    (targetRule: FeatureFlagAudienceRule) => {
      const nextRules = state.audienceRules.filter((rule) => rule.id !== targetRule.id);
      commitState(
        {
          ...state,
          audienceRules: nextRules,
        },
        `Removed audience rule "${targetRule.label}".`
      );
    },
    [commitState, state]
  );

  const handleAddRule = useCallback(() => {
    if (disabled) return;
    const trimmed = draftRule.trim();
    if (!trimmed) {
      setRuleFeedback('Enter a target segment name before adding a rule.');
      return;
    }

    const normalizedTarget = trimmed.toLowerCase();
    const isDuplicate = state.audienceRules.some(
      (rule) => rule.label.trim().toLowerCase() === normalizedTarget
    );
    if (isDuplicate) {
      setRuleFeedback(`Audience rule "${trimmed}" already exists.`);
      return;
    }

    const newRule: FeatureFlagAudienceRule = {
      id: buildRuleId(trimmed, state.audienceRules),
      label: trimmed,
      enabled: true,
    };

    setDraftRule('');
    setRuleFeedback(null);
    commitState(
      {
        ...state,
        audienceRules: [...state.audienceRules, newRule],
      },
      `Added audience rule "${trimmed}".`
    );
  }, [commitState, disabled, draftRule, state]);

  const merged = mergeProps({
    themeTarget: themeProps('feature-flag-rollout', {
      status: overallStatus,
      killed: state.killed,
      disabled,
      prod: state.environments.prod,
      rolloutPct: state.rolloutPct,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 space-y-5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('feature-flag-rollout', 'header');
  const killNoticeClass = stableClassName('feature-flag-rollout', 'kill-notice');
  const environmentsClass = stableClassName('feature-flag-rollout', 'environments');
  const rolloutClass = stableClassName('feature-flag-rollout', 'rollout');
  const audienceClass = stableClassName('feature-flag-rollout', 'audience');
  const footerClass = stableClassName('feature-flag-rollout', 'footer');

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-start justify-between gap-3 min-w-0'
        )}
      >
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <span
              className="prism-well w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0"
              style={{ color: statusMeta.colorVar }}
            >
              <Flag aria-hidden="true" className="w-4 h-4 shrink-0" />
            </span>

            <code
              data-testid="ffr-flag-key"
              className="prism-well inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[11px] font-medium max-w-full truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              {resolvedFlagKey}
            </code>

            <span
              data-testid="ffr-status-pill"
              data-status={overallStatus}
              className="prism-crystal inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shrink-0"
              style={{ color: statusMeta.colorVar }}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: statusMeta.colorVar }}
              />
              <span>{statusMeta.label}</span>
            </span>
          </div>

          <h3
            id={headingId}
            className="text-sm sm:text-base font-semibold tracking-tight break-words"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h3>

          {resolvedDescription ? (
            <p
              data-testid="ffr-description"
              className="text-xs leading-relaxed break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {resolvedDescription}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          aria-pressed={state.killed}
          disabled={disabled}
          data-testid="ffr-kill-switch"
          onClick={handleToggleKillSwitch}
          className="prism-crystal prism-focus-ring border inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={{
            color: state.killed
              ? 'var(--prism-success-main)'
              : 'var(--prism-error-main)',
            borderColor: state.killed
              ? 'var(--prism-success-main)'
              : 'var(--prism-error-main)',
          }}
        >
          {state.killed ? (
            <>
              <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Restore Flag</span>
            </>
          ) : (
            <>
              <Power aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Kill Switch</span>
            </>
          )}
        </button>
      </div>

      {state.killed ? (
        <div
          role="alert"
          data-testid="ffr-kill-notice"
          className={cx(
            killNoticeClass,
            'prism-well rounded-2xl border px-3.5 py-2.5 flex items-start gap-2.5 min-w-0'
          )}
          style={{
            borderColor: 'var(--prism-error-main)',
            color: 'var(--prism-error-main)',
          }}
        >
          <ShieldAlert aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium leading-relaxed break-words">
            Kill switch active — production environment is locked OFF and traffic
            rollout is halted at 0%. Activate Restore Flag to unlock production
            controls.
          </p>
        </div>
      ) : null}

      <div className={cx(environmentsClass, 'space-y-2 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            Environments
          </span>
        </div>

        <div
          role="group"
          aria-label="Deployment environments"
          className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 min-w-0"
        >
          {ENV_CONFIGS.map((env) => {
            const isOn = isEnvironmentEnabled(state.environments, env.id);
            const isEnvDisabled = disabled || (env.id === 'prod' && state.killed);

            return (
              <button
                key={env.id}
                type="button"
                role="switch"
                aria-checked={isOn}
                aria-label={`${env.label} environment`}
                disabled={isEnvDisabled}
                data-testid={`ffr-env-${env.id}`}
                data-env-state={isOn ? 'on' : 'off'}
                onClick={() => handleToggleEnv(env)}
                className={cx(
                  'prism-focus-ring rounded-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105 min-w-0',
                  isOn ? 'prism-crystal' : 'prism-well'
                )}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden="true"
                    data-testid={`ffr-env-dot-${env.id}`}
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: env.colorVar,
                      opacity: isOn ? 1 : 0.35,
                    }}
                  />
                  <span className="flex flex-col min-w-0">
                    <span
                      className="text-xs font-semibold truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {env.label}
                    </span>
                    <span
                      data-testid={`ffr-env-status-${env.id}`}
                      className="font-mono text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        color: isOn ? env.colorVar : 'var(--prism-text-secondary)',
                      }}
                    >
                      {isOn ? 'ON' : 'OFF'}
                    </span>
                  </span>
                </span>

                <span
                  aria-hidden="true"
                  className={cx(
                    'w-10 h-6 rounded-full p-0.5 inline-flex items-center shrink-0 transition-[color,background-color,border-color,opacity,transform]',
                    isOn ? 'prism-emerald' : 'prism-well'
                  )}
                >
                  <span
                    className={cx(
                      'prism-thumb block w-5 h-5 rounded-full transition-transform duration-150',
                      isOn ? 'translate-x-4' : 'translate-x-0'
                    )}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div
        className={cx(
          rolloutClass,
          'prism-well rounded-2xl p-3.5 space-y-3 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <label
            htmlFor={sliderId}
            className="inline-flex items-center gap-1.5 text-xs font-semibold"
            style={STYLE_TEXT_PRIMARY}
          >
            <SlidersHorizontal
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_PRIMARY_MAIN}
            />
            <span>Gradual Percentage Rollout</span>
          </label>

          <span
            data-testid="ffr-rollout-readout"
            className="prism-crystal rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold tabular-nums shrink-0"
            style={{
              color: state.killed
                ? 'var(--prism-error-main)'
                : 'var(--prism-primary-main)',
            }}
          >
            {state.rolloutPct}%
          </span>
        </div>

        <div
          aria-hidden="true"
          data-testid="ffr-rollout-segments"
          className="grid grid-cols-10 gap-1 h-2.5 w-full min-w-0"
        >
          {ROLLOUT_SEGMENTS.map((segment) => {
            const fillPct = clampNumber(
              ((state.rolloutPct - segment.start) / 10) * 100,
              0,
              100,
              0
            );
            return (
              <div
                key={segment.id}
                data-segment-id={segment.id}
                className="prism-crystal rounded-full h-full overflow-hidden"
              >
                <div
                  className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-150"
                  style={{
                    width: `${fillPct}%`,
                    backgroundColor: 'var(--prism-primary-main)',
                  }}
                />
              </div>
            );
          })}
        </div>

        <input
          id={sliderId}
          type="range"
          min={0}
          max={100}
          step={1}
          value={state.rolloutPct}
          disabled={isRolloutLocked}
          aria-label="Production rollout percentage"
          aria-valuetext={`${state.rolloutPct}%`}
          data-testid="ffr-rollout-slider"
          onChange={(e) => handleRolloutChange(Number(e.target.value))}
          className="prism-focus-ring w-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ accentColor: 'var(--prism-primary-main)' }}
        />

        <div
          role="group"
          aria-label="Rollout percentage presets"
          className="flex flex-wrap items-center gap-1.5 min-w-0"
        >
          {ROLLOUT_PRESETS.map((preset) => {
            const isSelected = state.rolloutPct === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={isRolloutLocked}
                aria-pressed={isSelected}
                data-testid={`ffr-preset-${preset}`}
                onClick={() => handleRolloutChange(preset)}
                className={cx(
                  'prism-focus-ring rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tabular-nums transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105',
                  isSelected ? 'prism-btn-primary' : 'prism-crystal'
                )}
                style={
                  isSelected
                    ? { color: 'var(--prism-primary-contrast)' }
                    : { color: 'var(--prism-text-primary)' }
                }
              >
                <span className="relative z-10">{preset}%</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className={cx(audienceClass, 'space-y-2.5 min-w-0')}>
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            <Users aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Audience Targeting Rules</span>
          </span>

          <span
            data-testid="ffr-rules-count"
            className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] tabular-nums shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {enabledRulesCount}/{state.audienceRules.length} enabled
          </span>
        </div>

        {state.audienceRules.length === 0 ? (
          <p
            data-testid="ffr-rules-empty"
            className="prism-well rounded-xl px-3 py-2.5 text-xs break-words"
            style={STYLE_TEXT_SECONDARY}
          >
            No audience targeting rules configured. Rollout percentage applies
            globally.
          </p>
        ) : (
          <div
            role="group"
            aria-label="Audience targeting rules"
            data-testid="ffr-rules-list"
            className="flex flex-wrap items-center gap-2 min-w-0"
          >
            {state.audienceRules.map((rule) => (
              <div
                key={rule.id}
                data-testid={`ffr-rule-${rule.id}`}
                data-rule-enabled={rule.enabled ? 'true' : 'false'}
                className={cx(
                  'inline-flex items-center gap-1 rounded-full pl-2.5 pr-1.5 py-1 max-w-full transition-[color,background-color,border-color,opacity,transform]',
                  rule.enabled ? 'prism-crystal' : 'prism-well opacity-75'
                )}
              >
                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={rule.enabled}
                  onClick={() => handleToggleRule(rule)}
                  className="prism-focus-ring inline-flex items-center gap-1.5 rounded-full px-1 py-0.5 text-xs font-medium min-w-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:opacity-85 transition-opacity"
                  style={{
                    color: rule.enabled
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: rule.enabled
                        ? 'var(--prism-success-main)'
                        : 'var(--prism-text-disabled)',
                    }}
                  />
                  <span className="truncate">{rule.label}</span>
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove rule ${rule.label}`}
                  onClick={() => handleRemoveRule(rule)}
                  className="prism-focus-ring rounded-full p-1 inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:opacity-80 transition-opacity"
                  style={STYLE_TEXT_SECONDARY}
                >
                  <X aria-hidden="true" className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 min-w-0">
          <div
            className="prism-well flex-1 min-w-[160px] h-9 px-3 rounded-full flex items-center"
            style={
              ruleFeedback !== null
                ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-error-main)' }
                : undefined
            }
          >
            <input
              id={ruleInputId}
              type="text"
              aria-label="New audience targeting rule"
              aria-invalid={ruleFeedback !== null}
              aria-describedby={ruleFeedback !== null ? ruleFeedbackId : undefined}
              value={draftRule}
              disabled={disabled}
              placeholder="Add target segment"
              onChange={(e) => {
                setDraftRule(e.target.value);
                if (ruleFeedback !== null) {
                  setRuleFeedback(null);
                }
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddRule();
                }
              }}
              className="prism-focus-ring w-full min-w-0 bg-transparent text-xs rounded-md focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={handleAddRule}
            className="prism-btn-secondary prism-focus-ring h-9 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:brightness-105"
          >
            <Plus aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
            <span>Add Rule</span>
          </button>
        </div>

        {ruleFeedback !== null ? (
          <p
            id={ruleFeedbackId}
            role="status"
            aria-live="polite"
            data-testid="ffr-rule-feedback"
            className="text-xs font-medium px-1 break-words"
            style={STYLE_ERROR_MAIN}
          >
            {ruleFeedback}
          </p>
        ) : null}
      </div>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="ffr-status-footer"
        className={cx(
          footerClass,
          'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        <span
          data-testid="ffr-summary-text"
          className="font-mono text-[11px] tabular-nums break-words"
        >
          {summaryText}
        </span>

        {lastAnnouncement ? (
          <span
            data-testid="ffr-last-announcement"
            className="text-[11px] font-medium break-words"
            style={STYLE_TEXT_PRIMARY}
          >
            {lastAnnouncement}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const FeatureFlagRollout = memo(FeatureFlagRolloutInner);
FeatureFlagRollout.displayName = 'FeatureFlagRollout';
