'use client';

import { memo, useId, useState } from 'react';
import { CheckCircle2, Shield, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { isSafeObjectKey } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type ApprovalRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ApprovalParameter {
  /** Parameter identifier used as key in the approved parameter record. */
  key: string;
  /** Human-readable parameter label shown beside the value or editor. */
  label: string;
  /** Initial or read-only parameter value. */
  value: string;
  /** When true, renders an editable recessed input well so the operator can refine the value before approving. */
  editable?: boolean;
}

export type ApprovalDecision = 'approved' | 'rejected';

export interface ApprovalGateCardProps extends BaseProps<HTMLDivElement> {
  /** Prominent title describing the pending human-in-the-loop approval request. */
  title: string;
  /** Monospace tool or action name awaiting operator authorization. */
  actionName: string;
  /** Optional contextual description explaining the action impact. */
  description?: string;
  /** Semantic risk level governing risk badge color and emphasis (defaults to 'medium'). */
  riskLevel?: ApprovalRiskLevel;
  /** Optional action parameters displayed as read-only monospace badges or editable input wells. */
  parameters?: ApprovalParameter[];
  /** Callback invoked on approval with a prototype-safe record of final parameter key/value pairs. */
  onApprove?: (updatedParams: Record<string, string>) => void;
  /** Callback invoked on rejection with an optional trimmed reason string. */
  onReject?: (reason?: string) => void;
  /** Controlled decision outcome ('approved' | 'rejected'). */
  decision?: ApprovalDecision;
  /** Disables parameter editors, rejection reason input, and decision controls. */
  disabled?: boolean;
}

interface RiskVisualMeta {
  label: string;
  colorVar: string;
  ringShadow: string;
}

function getRiskVisualMeta(riskLevel: ApprovalRiskLevel): RiskVisualMeta {
  switch (riskLevel) {
    case 'low':
      return {
        label: 'Low Risk',
        colorVar: 'var(--prism-success-main)',
        ringShadow: 'inset 0 0 0 1px var(--prism-success-main)',
      };
    case 'high':
      return {
        label: 'High Risk',
        colorVar: 'var(--prism-error-main)',
        ringShadow: 'inset 0 0 0 1px var(--prism-error-main)',
      };
    case 'critical':
      return {
        label: 'Critical Risk',
        colorVar: 'var(--prism-error-main)',
        ringShadow: 'inset 0 0 0 1.5px var(--prism-error-main)',
      };
    case 'medium':
      return {
        label: 'Medium Risk',
        colorVar: 'var(--prism-warning-main)',
        ringShadow: 'inset 0 0 0 1px var(--prism-warning-main)',
      };
  }
}

function renderRiskIcon(riskLevel: ApprovalRiskLevel, colorVar: string) {
  const iconStyle = { color: colorVar };
  if (riskLevel === 'low') {
    return <ShieldCheck aria-hidden="true" className="w-4 h-4 shrink-0" style={iconStyle} />;
  }
  if (riskLevel === 'medium') {
    return <Shield aria-hidden="true" className="w-4 h-4 shrink-0" style={iconStyle} />;
  }
  return <ShieldAlert aria-hidden="true" className="w-4 h-4 shrink-0" style={iconStyle} />;
}

function ApprovalGateCardInner({
  title,
  actionName,
  description,
  riskLevel = 'medium',
  parameters = [],
  onApprove,
  onReject,
  decision,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: ApprovalGateCardProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const rejectReasonId = `${baseId}-reject-reason`;
  const override = useComponentOverride('ApprovalGateCard');

  const [resolvedDecision, setResolvedDecision] = useControllableState<
    ApprovalDecision | undefined
  >({
    value: decision,
    defaultValue: undefined,
  });

  const [editedValues, setEditedValues] = useState<Map<string, string>>(() => new Map());
  const [rejectReason, setRejectReason] = useState<string>('');

  const isResolved = resolvedDecision !== undefined;

  const hasEdits = parameters.some(
    (param) =>
      Boolean(param.editable) &&
      editedValues.has(param.key) &&
      editedValues.get(param.key) !== param.value
  );

  const riskMeta = getRiskVisualMeta(riskLevel);

  const handleParameterChange = (key: string, nextValue: string) => {
    setEditedValues((prev) => {
      const next = new Map(prev);
      next.set(key, nextValue);
      return next;
    });
  };

  const handleApprove = () => {
    const safeRecord: Record<string, string> = {};
    for (const param of parameters) {
      if (!isSafeObjectKey(param.key)) continue;
      safeRecord[param.key] = editedValues.get(param.key) ?? param.value;
    }
    setResolvedDecision('approved');
    onApprove?.(safeRecord);
  };

  const handleReject = () => {
    const trimmedReason = rejectReason.trim();
    setResolvedDecision('rejected');
    onReject?.(trimmedReason.length > 0 ? trimmedReason : undefined);
  };

  const merged = mergeProps({
    themeTarget: themeProps('approval-gate-card', {
      riskLevel,
      decision: resolvedDecision,
      disabled,
      edited: hasEdits,
    }),
    baseClassName: 'prism-slab p-4 sm:p-5 w-full flex flex-col gap-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('approval-gate-card', 'header');
  const paramsClass = stableClassName('approval-gate-card', 'parameters');
  const actionsClass = stableClassName('approval-gate-card', 'actions');

  return (
    <div ref={ref} role="region" aria-labelledby={titleId} {...rest} {...merged}>
      <div className={cx(headerClass, 'flex flex-wrap items-start justify-between gap-3')}>
        <div className="min-w-0 flex-1 flex flex-col gap-1.5">
          <div className="flex items-center gap-2 min-w-0">
            {renderRiskIcon(riskLevel, riskMeta.colorVar)}
            <h3
              id={titleId}
              className="text-sm font-semibold tracking-[-0.01em] truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {title}
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <code
              data-testid="approval-action-name"
              className="prism-well rounded-full px-2.5 py-0.5 text-[11px] font-mono font-medium max-w-full truncate"
              style={STYLE_TEXT_PRIMARY}
            >
              {actionName}
            </code>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            data-testid="approval-risk-badge"
            data-risk-level={riskLevel}
            className="prism-well inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
            style={{
              color: riskMeta.colorVar,
              boxShadow: riskMeta.ringShadow,
            }}
          >
            <span
              aria-hidden="true"
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: riskMeta.colorVar }}
            />
            <span>{riskMeta.label}</span>
          </span>

          {resolvedDecision === 'approved' ? (
            <span
              role="status"
              aria-live="polite"
              data-testid="approval-decision-pill"
              className="prism-emerald inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap"
            >
              <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Approved</span>
            </span>
          ) : null}

          {resolvedDecision === 'rejected' ? (
            <span
              role="status"
              aria-live="polite"
              data-testid="approval-decision-pill"
              className="prism-well inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold whitespace-nowrap"
              style={{
                color: 'var(--prism-error-main)',
                boxShadow: 'inset 0 0 0 1.5px var(--prism-error-main)',
              }}
            >
              <XCircle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              <span>Rejected</span>
            </span>
          ) : null}
        </div>
      </div>

      {description ? (
        <p
          data-testid="approval-description"
          className="text-xs leading-relaxed"
          style={STYLE_TEXT_SECONDARY}
        >
          {description}
        </p>
      ) : null}

      {parameters.length > 0 ? (
        <div
          data-testid="approval-parameters"
          className={cx(paramsClass, 'flex flex-col gap-2 pt-2.5')}
          style={{ borderTop: '1px solid var(--prism-divider)' }}
        >
          {parameters.map((param) => {
            const inputId = `${baseId}-param-${param.key}`;
            const currentValue = editedValues.get(param.key) ?? param.value;

            return (
              <div
                key={param.key}
                data-testid={`approval-param-${param.key}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {param.editable ? (
                    <label
                      htmlFor={inputId}
                      className="text-xs font-medium truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {param.label}
                    </label>
                  ) : (
                    <span
                      className="text-xs font-medium truncate"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {param.label}
                    </span>
                  )}
                  <code
                    className="text-[11px] font-mono shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {param.key}
                  </code>
                </div>

                {param.editable ? (
                  <div className="prism-well h-8 px-2.5 rounded-xl flex items-center sm:w-64 w-full shrink-0">
                    <input
                      id={inputId}
                      type="text"
                      value={currentValue}
                      disabled={disabled || isResolved}
                      onChange={(e) => handleParameterChange(param.key, e.target.value)}
                      className="w-full min-w-0 bg-transparent text-xs font-mono focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
                      style={STYLE_TEXT_PRIMARY}
                    />
                  </div>
                ) : (
                  <code
                    data-testid={`approval-param-value-${param.key}`}
                    className="prism-well rounded-full px-2.5 py-1 text-[11px] font-mono max-w-full sm:max-w-[60%] truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {param.value}
                  </code>
                )}
              </div>
            );
          })}
        </div>
      ) : null}

      {!isResolved ? (
        <div
          className={cx(
            actionsClass,
            'flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3'
          )}
          style={{ borderTop: '1px solid var(--prism-divider)' }}
        >
          <div className="prism-well flex-1 min-w-0 h-9 px-3 rounded-full flex items-center">
            <input
              id={rejectReasonId}
              type="text"
              aria-label="Rejection reason"
              value={rejectReason}
              disabled={disabled}
              placeholder="Optional rejection reason..."
              onChange={(e) => setRejectReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && !disabled) {
                  e.preventDefault();
                  handleReject();
                }
              }}
              className="w-full min-w-0 bg-transparent text-xs focus:outline-none disabled:opacity-55 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              disabled={disabled}
              onClick={handleReject}
              className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Reject</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={handleApprove}
              className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="relative z-10">{hasEdits ? 'Edit & Approve' : 'Approve'}</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export const ApprovalGateCard = memo(ApprovalGateCardInner);
ApprovalGateCard.displayName = 'ApprovalGateCard';
