'use client';

import { memo, useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldCheck, X } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ConfidenceLevel = 'verified' | 'high' | 'moderate' | 'needs-review';

export interface ConfidenceIndicatorProps extends BaseProps<HTMLSpanElement> {
  /** Numeric confidence score clamped to 0..100 (non-finite values fall back to 0). */
  score: number;
  /** Optional explicit confidence level override when verified is not set. */
  level?: ConfidenceLevel;
  /** Forces the effective confidence level to 'verified' regardless of score or level. */
  verified?: boolean;
  /** Optional rationale explaining how the confidence score was derived. */
  rationale?: string;
  /** Optional number of supporting sources (rendered when finite and > 0). */
  sourceCount?: number;
  /** Optional action callback that enables the 'Mark Verified' button inside the popover. */
  onMarkVerified?: () => void;
  /** Initial expanded state for the rationale popover (defaults to false). */
  defaultOpen?: boolean;
}

interface ConfidenceVisualMeta {
  label: string;
  popoverHeading: string;
  pillClass: string;
  textColorVar: string;
  borderColorVar?: string;
  iconColorVar?: string;
  defaultRationale: string;
}

function resolveConfidenceLevel(
  clampedScore: number,
  level: ConfidenceLevel | undefined,
  verified: boolean | undefined
): ConfidenceLevel {
  if (verified) return 'verified';
  if (level !== undefined) return level;
  if (clampedScore >= 85) return 'high';
  if (clampedScore >= 60) return 'moderate';
  return 'needs-review';
}

function getConfidenceVisualMeta(level: ConfidenceLevel): ConfidenceVisualMeta {
  switch (level) {
    case 'verified':
      return {
        label: 'Verified',
        popoverHeading: 'Verified Confidence',
        pillClass: 'prism-emerald',
        textColorVar: 'var(--prism-success-contrast)',
        defaultRationale:
          'This output has been explicitly verified against trusted supporting sources.',
      };
    case 'high':
      return {
        label: 'High',
        popoverHeading: 'High Confidence',
        pillClass: 'prism-btn-secondary',
        textColorVar: 'var(--prism-text-primary)',
        iconColorVar: 'var(--prism-info-main)',
        defaultRationale:
          'Strong corroboration across available context and grounding evidence.',
      };
    case 'moderate':
      return {
        label: 'Moderate',
        popoverHeading: 'Moderate Confidence',
        pillClass: 'prism-crystal border',
        textColorVar: 'var(--prism-amber-text, var(--prism-warning-main))',
        borderColorVar: 'var(--prism-amber-border, var(--prism-warning-main))',
        defaultRationale:
          'Partial corroboration detected; review key claims before relying on them.',
      };
    case 'needs-review':
      return {
        label: 'Needs Review',
        popoverHeading: 'Needs Review',
        pillClass: 'prism-crystal border border-dashed',
        textColorVar: 'var(--prism-rose-text, var(--prism-error-main))',
        borderColorVar: 'var(--prism-rose-border, var(--prism-error-main))',
        defaultRationale:
          'Low confidence or uncorroborated signal; human verification is recommended.',
      };
  }
}

function ConfidenceIcon({
  level,
  className,
  colorVar,
}: {
  level: ConfidenceLevel;
  className: string;
  colorVar?: string;
}) {
  const iconStyle = colorVar ? { color: colorVar } : undefined;
  switch (level) {
    case 'verified':
      return <ShieldCheck aria-hidden="true" className={className} style={iconStyle} />;
    case 'high':
      return <CheckCircle2 aria-hidden="true" className={className} style={iconStyle} />;
    case 'moderate':
      return <Info aria-hidden="true" className={className} style={iconStyle} />;
    case 'needs-review':
      return <AlertTriangle aria-hidden="true" className={className} style={iconStyle} />;
  }
}

function ConfidenceIndicatorInner({
  score,
  level,
  verified = false,
  rationale,
  sourceCount,
  onMarkVerified,
  defaultOpen = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ConfidenceIndicatorProps) {
  const override = useComponentOverride('ConfidenceIndicator');
  const [open, setOpen] = useState<boolean>(defaultOpen);
  const popoverId = useId();
  const titleId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const mergedRef = useMergedRefs(ref, containerRef);

  const clampedScore = clampNumber(score, 0, 100, 0);
  const roundedScore = Math.round(clampedScore);
  const effectiveLevel = resolveConfidenceLevel(clampedScore, level, verified);
  const visual = getConfidenceVisualMeta(effectiveLevel);

  const safeSourceCount =
    sourceCount !== undefined && Number.isFinite(sourceCount) ? Math.floor(sourceCount) : 0;
  const hasSourceCount = safeSourceCount > 0;
  const resolvedRationale =
    rationale !== undefined && rationale.trim().length > 0 ? rationale : visual.defaultRationale;
  const showMarkVerified = effectiveLevel !== 'verified' && Boolean(onMarkVerified);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.isComposing) {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      const rootEl = containerRef.current;
      if (rootEl && event.target instanceof Node && !rootEl.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [open]);

  const merged = mergeProps({
    themeTarget: themeProps('confidence-indicator', {
      confidenceLevel: effectiveLevel,
      open,
      verified: effectiveLevel === 'verified',
    }),
    baseClassName: 'relative inline-flex items-center align-baseline',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  return (
    <span ref={mergedRef} {...rest} {...merged}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? popoverId : undefined}
        data-confidence-level={effectiveLevel}
        onClick={() => setOpen((prev) => !prev)}
        className={`${visual.pillClass} prism-focus-ring inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]`}
        style={{
          color: visual.textColorVar,
          ...(visual.borderColorVar ? { borderColor: visual.borderColorVar } : {}),
        }}
      >
        <ConfidenceIcon
          level={effectiveLevel}
          className="w-3.5 h-3.5 shrink-0"
          colorVar={visual.iconColorVar}
        />
        <span>{visual.label}</span>
        <span
          data-testid="confidence-score"
          className="font-mono text-[11px] font-semibold tabular-nums"
        >
          {roundedScore}%
        </span>
      </button>

      {open ? (
        <span
          id={popoverId}
          role="dialog"
          aria-labelledby={titleId}
          className="prism-slab block absolute left-0 top-full mt-2 z-40 w-72 max-w-[calc(100vw-2rem)] p-3.5 text-left space-y-2.5"
        >
          <span className="flex items-start justify-between gap-2">
            <span className="min-w-0 flex items-center gap-1.5">
              <ConfidenceIcon
                level={effectiveLevel}
                className="w-4 h-4 shrink-0"
                colorVar={
                  effectiveLevel === 'verified'
                    ? 'var(--prism-emerald-text, var(--prism-success-main))'
                    : visual.iconColorVar ?? visual.textColorVar
                }
              />
              <span
                id={titleId}
                className="text-xs font-semibold leading-snug break-words"
                style={STYLE_TEXT_PRIMARY}
              >
                {visual.popoverHeading}
              </span>
            </span>

            <button
              type="button"
              aria-label="Close confidence rationale"
              onClick={() => setOpen(false)}
              className="prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed enabled:hover:opacity-80 transition-opacity"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          </span>

          <span className="flex flex-wrap items-center gap-2">
            <span
              data-testid="confidence-popover-score"
              className="prism-well rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
              style={STYLE_TEXT_PRIMARY}
            >
              {roundedScore}% confidence
            </span>

            {hasSourceCount ? (
              <span
                data-testid="confidence-source-count"
                className="prism-well rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
                style={STYLE_TEXT_SECONDARY}
              >
                {safeSourceCount} {safeSourceCount === 1 ? 'source' : 'sources'}
              </span>
            ) : null}
          </span>

          <span
            data-testid="confidence-rationale"
            className="prism-well block rounded-xl px-2.5 py-2 text-xs leading-relaxed break-words"
            style={STYLE_TEXT_SECONDARY}
          >
            {resolvedRationale}
          </span>

          {showMarkVerified ? (
            <span
              className="flex items-center justify-end pt-2 border-t"
              style={STYLE_BORDER_DIVIDER}
            >
              <button
                type="button"
                onClick={onMarkVerified}
                className="prism-btn-primary prism-focus-ring inline-flex items-center justify-center gap-1.5 h-8 px-3.5 text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShieldCheck aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
                <span className="relative z-10">Mark Verified</span>
              </button>
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

export const ConfidenceIndicator = memo(ConfidenceIndicatorInner);
ConfidenceIndicator.displayName = 'ConfidenceIndicator';
