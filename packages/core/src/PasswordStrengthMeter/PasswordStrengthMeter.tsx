'use client';

import { useId, useMemo } from 'react';
import { CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { themeProps } from '../utils/themeProps';

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'strong' | 'excellent';

export interface PasswordRuleResult {
  /** Stable identifier for the password criterion. */
  id: string;
  /** Human-readable requirement description. */
  label: string;
  /** Whether the evaluated password satisfies this criterion. */
  passed: boolean;
}

export interface PasswordStrengthMeterProps extends BaseProps<HTMLDivElement> {
  /** Password string evaluated in a single linear O(n) character-code pass. */
  password: string;
  /** Minimum character length requirement (clamped to 6..64, defaults to 12). */
  minLength?: number;
  /** Controls visibility of the itemized requirement checklist (defaults to true). */
  showChecklist?: boolean;
  /** Accessible meter heading label (defaults to 'Password strength'). */
  label?: string;
}

interface PasswordEvaluation {
  score: 0 | 1 | 2 | 3 | 4;
  level: PasswordStrengthLevel;
  rules: readonly PasswordRuleResult[];
  passedCount: number;
}

interface StrengthVisual {
  label: string;
  colorToken: string;
}

interface StrengthSegment {
  id: string;
  threshold: 1 | 2 | 3 | 4;
}

const STRENGTH_SEGMENTS: readonly StrengthSegment[] = [
  { id: 'strength-segment-1', threshold: 1 },
  { id: 'strength-segment-2', threshold: 2 },
  { id: 'strength-segment-3', threshold: 3 },
  { id: 'strength-segment-4', threshold: 4 },
];

function evaluatePassword(password: string, minLength: number): PasswordEvaluation {
  let hasUppercase = false;
  let hasLowercase = false;
  let hasDigit = false;
  let hasSymbol = false;

  for (let i = 0; i < password.length; i += 1) {
    const code = password.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      hasUppercase = true;
    } else if (code >= 97 && code <= 122) {
      hasLowercase = true;
    } else if (code >= 48 && code <= 57) {
      hasDigit = true;
    } else if (code > 32 && code !== 127) {
      hasSymbol = true;
    }

    if (hasUppercase && hasLowercase && hasDigit && hasSymbol) {
      break;
    }
  }

  const meetsLength = password.length >= minLength;

  const rules: readonly PasswordRuleResult[] = [
    {
      id: 'length',
      label: `At least ${minLength} characters`,
      passed: meetsLength,
    },
    {
      id: 'uppercase',
      label: 'Uppercase letter (A–Z)',
      passed: hasUppercase,
    },
    {
      id: 'lowercase',
      label: 'Lowercase letter (a–z)',
      passed: hasLowercase,
    },
    {
      id: 'digit',
      label: 'Number (0–9)',
      passed: hasDigit,
    },
    {
      id: 'symbol',
      label: 'Special symbol (!@#$…)',
      passed: hasSymbol,
    },
  ];

  let passedCount = 0;
  for (const rule of rules) {
    if (rule.passed) passedCount += 1;
  }

  if (password.length === 0) {
    return { score: 0, level: 'empty', rules, passedCount: 0 };
  }

  if (passedCount <= 2) {
    return { score: 1, level: 'weak', rules, passedCount };
  }
  if (passedCount === 3) {
    return { score: 2, level: 'fair', rules, passedCount };
  }
  if (passedCount === 4) {
    return { score: 3, level: 'strong', rules, passedCount };
  }
  return { score: 4, level: 'excellent', rules, passedCount };
}

function getStrengthVisual(level: PasswordStrengthLevel): StrengthVisual {
  switch (level) {
    case 'empty':
      return {
        label: 'Not entered',
        colorToken: 'var(--prism-text-disabled)',
      };
    case 'weak':
      return {
        label: 'Weak',
        colorToken: 'var(--prism-error-main)',
      };
    case 'fair':
      return {
        label: 'Fair',
        colorToken: 'var(--prism-warning-main)',
      };
    case 'strong':
      return {
        label: 'Strong',
        colorToken: 'var(--prism-secondary-main)',
      };
    case 'excellent':
      return {
        label: 'Excellent',
        colorToken: 'var(--prism-success-main)',
      };
  }
}

export function PasswordStrengthMeter({
  password,
  minLength = 12,
  showChecklist = true,
  label = 'Password strength',
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PasswordStrengthMeterProps) {
  const override = useComponentOverride('PasswordStrengthMeter');
  const headingId = useId();
  const safeMinLength = Math.round(clampNumber(minLength, 6, 64, 12));

  const evaluation = useMemo(
    () => evaluatePassword(password, safeMinLength),
    [password, safeMinLength]
  );

  const visual = getStrengthVisual(evaluation.level);

  const merged = mergeProps({
    themeTarget: themeProps('password-strength-meter', {
      level: evaluation.level,
      score: evaluation.score,
      checklist: showChecklist,
    }),
    baseClassName: 'prism-slab p-4 w-full',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <div ref={ref} {...rest} {...merged}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="min-w-0 flex items-center gap-2">
          <span
            className="prism-well w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0"
            style={{ color: visual.colorToken }}
          >
            <ShieldCheck aria-hidden="true" className="w-4 h-4 shrink-0" />
          </span>
          <span
            id={headingId}
            className="text-xs font-semibold truncate"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {label}
          </span>
        </span>

        <span
          aria-live="polite"
          data-testid="password-strength-badge"
          data-strength-level={evaluation.level}
          className={
            evaluation.level === 'excellent'
              ? 'prism-emerald inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0'
              : 'prism-crystal inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight shrink-0'
          }
          style={
            evaluation.level === 'excellent'
              ? undefined
              : { color: visual.colorToken }
          }
        >
          {visual.label}
        </span>
      </div>

      <div
        role="progressbar"
        aria-labelledby={headingId}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={evaluation.score}
        aria-valuetext={visual.label}
        className="flex items-center gap-2"
      >
        {STRENGTH_SEGMENTS.map((segment) => {
          const filled = evaluation.score >= segment.threshold;
          return (
            <div
              key={segment.id}
              data-testid={segment.id}
              data-filled={filled ? 'true' : 'false'}
              className={`h-2 flex-1 rounded-full transition-all duration-200 ${
                filled ? '' : 'prism-well'
              }`}
              style={filled ? { backgroundColor: visual.colorToken } : undefined}
            />
          );
        })}
      </div>

      {showChecklist ? (
        <div
          className="prism-well mt-3 rounded-2xl p-3"
          data-testid="password-strength-checklist"
        >
          <ul className="space-y-1.5">
            {evaluation.rules.map((rule) => (
              <li
                key={rule.id}
                data-rule-id={rule.id}
                data-passed={rule.passed ? 'true' : 'false'}
                className="flex items-center gap-2 text-xs"
              >
                <span
                  className="inline-flex items-center justify-center shrink-0"
                  style={{
                    color: rule.passed
                      ? 'var(--prism-success-main)'
                      : 'var(--prism-text-disabled)',
                  }}
                >
                  {rule.passed ? (
                    <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0" />
                  ) : (
                    <Circle aria-hidden="true" className="w-4 h-4 shrink-0" />
                  )}
                  <span className="sr-only">{rule.passed ? 'Met:' : 'Unmet:'}</span>
                </span>
                <span
                  className={rule.passed ? 'font-medium' : 'font-normal'}
                  style={{
                    color: rule.passed
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-secondary)',
                  }}
                >
                  {rule.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

PasswordStrengthMeter.displayName = 'PasswordStrengthMeter';
