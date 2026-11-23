'use client';

import {
  useCallback,
  useEffect,
  useId,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlertTriangle,
  Clock,
  Pause,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BADGE_ERROR, STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type TrashRetentionUrgency = 'normal' | 'warning' | 'critical';

type TrashRecoveryBannerBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface TrashRecoveryBannerProps extends TrashRecoveryBannerBaseProps {
  /** Total number of deleted items currently in Trash. Defaults to 14. */
  itemCount?: number;
  /** Number of currently selected items in Trash (clamped to 0..itemCount). Defaults to 3. */
  selectedCount?: number;
  /** Human-readable storage footprint label for items in Trash. Defaults to '2.4 GB'. */
  totalSizeLabel?: string;
  /** Days remaining before automatic permanent purge (clamped >= 0). Defaults to 30. */
  retentionDays?: number;
  /** Indicates whether automatic scheduled deletion is active. Defaults to true. */
  autoDeleteEnabled?: boolean;
  /** Callback invoked when the user activates Restore Selected (N). */
  onRestoreSelected?: () => void;
  /** Callback invoked when the user activates Restore All. */
  onRestoreAll?: () => void;
  /** Callback invoked only after the user completes the two-step Confirm Empty Trash action. */
  onEmptyTrash?: () => void;
  /** Disables all recovery and destructive actions and dismisses any open confirmation panel. */
  disabled?: boolean;
}

interface RetentionUrgencyMeta {
  urgency: TrashRetentionUrgency;
  label: string;
  colorToken: string;
  tintBg: string;
  ringShadow: string;
}

const DEFAULT_ITEM_COUNT = 14;
const DEFAULT_SELECTED_COUNT = 3;
const DEFAULT_TOTAL_SIZE_LABEL = '2.4 GB';
const DEFAULT_RETENTION_DAYS = 30;

const URGENCY_META: Record<TrashRetentionUrgency, RetentionUrgencyMeta> = {
  normal: {
    urgency: 'normal',
    label: 'Standard retention',
    colorToken: 'var(--prism-info-main)',
    tintBg: 'color-mix(in srgb, var(--prism-info-main) 12%, transparent)',
    ringShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--prism-info-main) 44%, transparent)',
  },
  warning: {
    urgency: 'warning',
    label: 'Expiring soon',
    colorToken: 'var(--prism-warning-main)',
    tintBg: 'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)',
    ringShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--prism-warning-main) 48%, transparent)',
  },
  critical: {
    urgency: 'critical',
    label: 'Immediate purge risk',
    colorToken: 'var(--prism-error-main)',
    tintBg: 'color-mix(in srgb, var(--prism-error-main) 14%, transparent)',
    ringShadow: 'inset 0 0 0 1.5px color-mix(in srgb, var(--prism-error-main) 52%, transparent)',
  },
};

function sanitizeCount(value: number, max = Number.MAX_SAFE_INTEGER): number {
  return Math.floor(clampNumber(value, 0, max, 0));
}

function resolveRetentionUrgency(retentionDays: number): TrashRetentionUrgency {
  if (retentionDays <= 3) return 'critical';
  if (retentionDays <= 7) return 'warning';
  return 'normal';
}

function formatItemCount(count: number): string {
  return count === 1 ? '1 item' : `${count} items`;
}

function formatRetentionDays(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

function buildDescriptionText(
  itemCount: number,
  retentionDays: number,
  autoDeleteEnabled: boolean
): string {
  if (itemCount === 0) {
    return autoDeleteEnabled
      ? `No items currently in Trash. Deleted items are retained for ${formatRetentionDays(retentionDays)} before permanent removal.`
      : 'No items currently in Trash. Auto-delete paused — deleted items remain until emptied manually.';
  }
  if (!autoDeleteEnabled) {
    return `${formatItemCount(itemCount)} in Trash. Auto-delete paused — items remain recoverable until you empty Trash manually.`;
  }
  return `${formatItemCount(itemCount)} in Trash will be permanently deleted after ${formatRetentionDays(retentionDays)}. Restore selected files or recover everything before expiry.`;
}

function buildDefaultStatusText(
  itemCount: number,
  selectedCount: number,
  retentionDays: number,
  autoDeleteEnabled: boolean
): string {
  if (itemCount === 0) {
    return 'Trash is empty. No recoverable items.';
  }
  if (!autoDeleteEnabled) {
    return `${formatItemCount(itemCount)} recoverable · ${selectedCount} selected · Auto-delete paused`;
  }
  return `${formatItemCount(itemCount)} recoverable · ${selectedCount} selected · ${formatRetentionDays(retentionDays)} remaining`;
}

const accentClass = /*#__PURE__*/ stableClassName('trash-recovery-banner', 'accent');
const headerClass = /*#__PURE__*/ stableClassName('trash-recovery-banner', 'header');
const metricsClass = /*#__PURE__*/ stableClassName('trash-recovery-banner', 'metrics');
const actionsClass = /*#__PURE__*/ stableClassName('trash-recovery-banner', 'actions');
const confirmClass = /*#__PURE__*/ stableClassName('trash-recovery-banner', 'confirm');
const statusClass = /*#__PURE__*/ stableClassName('trash-recovery-banner', 'status');

function TrashRecoveryBannerInner({
  itemCount = DEFAULT_ITEM_COUNT,
  selectedCount = DEFAULT_SELECTED_COUNT,
  totalSizeLabel = DEFAULT_TOTAL_SIZE_LABEL,
  retentionDays = DEFAULT_RETENTION_DAYS,
  autoDeleteEnabled = true,
  onRestoreSelected,
  onRestoreAll,
  onEmptyTrash,
  disabled = false,
  onKeyDown,
  className,
  style,
  xstyle,
  'aria-label': ariaLabel,
  ref,
  ...rest
}: TrashRecoveryBannerProps) {
  const override = useComponentOverride('TrashRecoveryBanner');
  const headingId = useId();
  const confirmPanelId = useId();

  const safeItemCount = sanitizeCount(itemCount);
  const safeSelectedCount = sanitizeCount(selectedCount, safeItemCount);
  const safeRetentionDays = sanitizeCount(retentionDays);
  const safeTotalSizeLabel = totalSizeLabel.trim();

  const isEmpty = safeItemCount === 0;
  const urgency = resolveRetentionUrgency(safeRetentionDays);
  const urgencyMeta = URGENCY_META[urgency];

  const [confirmingEmpty, setConfirmingEmpty] = useState<boolean>(false);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(null);

  const isConfirmingEmpty = confirmingEmpty && !disabled && !isEmpty;

  useEffect(() => {
    if (disabled || isEmpty) {
      setConfirmingEmpty(false);
    }
  }, [disabled, isEmpty]);

  const itemLabel = formatItemCount(safeItemCount);
  const selectedLabel = formatItemCount(safeSelectedCount);
  const retentionLabel = formatRetentionDays(safeRetentionDays);

  const handleRestoreSelected = useCallback(() => {
    setConfirmingEmpty(false);
    setStatusAnnouncement(`Restoring ${selectedLabel} from Trash.`);
    onRestoreSelected?.();
  }, [onRestoreSelected, selectedLabel]);

  const handleRestoreAll = useCallback(() => {
    setConfirmingEmpty(false);
    setStatusAnnouncement(`Restoring all ${itemLabel} from Trash.`);
    onRestoreAll?.();
  }, [itemLabel, onRestoreAll]);

  const handleRequestEmptyTrash = useCallback(() => {
    setConfirmingEmpty(true);
    setStatusAnnouncement(
      `Confirm permanent deletion of ${itemLabel}. Choose Confirm Empty Trash to proceed or press Escape to cancel.`
    );
  }, [itemLabel]);

  const handleCancelEmptyTrash = useCallback(() => {
    setConfirmingEmpty(false);
    setStatusAnnouncement('Empty Trash cancelled.');
  }, []);

  const handleConfirmEmptyTrash = useCallback(() => {
    setConfirmingEmpty(false);
    setStatusAnnouncement(`Permanently deleting ${itemLabel} from Trash.`);
    onEmptyTrash?.();
  }, [itemLabel, onEmptyTrash]);

  const handleRootKeyDown = composeEventHandlers<ReactKeyboardEvent<HTMLDivElement>>(
    onKeyDown,
    (event) => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === 'Escape' && isConfirmingEmpty) {
        event.preventDefault();
        setConfirmingEmpty(false);
        setStatusAnnouncement('Empty Trash cancelled.');
      }
    }
  );

  const metricsPillText = isEmpty
    ? '0 items · 0 B'
    : safeTotalSizeLabel
      ? `${itemLabel} · ${safeTotalSizeLabel}`
      : itemLabel;

  const retentionBadgeText = autoDeleteEnabled
    ? `Auto-delete in ${retentionLabel}`
    : 'Auto-delete paused';

  const descriptionText = buildDescriptionText(
    safeItemCount,
    safeRetentionDays,
    autoDeleteEnabled
  );

  const liveStatusText =
    statusAnnouncement ??
    buildDefaultStatusText(
      safeItemCount,
      safeSelectedCount,
      safeRetentionDays,
      autoDeleteEnabled
    );

  const merged = mergeProps({
    themeTarget: themeProps('trash-recovery-banner', {
      urgency,
      autoDelete: autoDeleteEnabled ? 'enabled' : 'paused',
      empty: isEmpty,
      confirming: isConfirmingEmpty,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-3.5 overflow-hidden',
      disabled && 'opacity-70'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const isElevatedUrgency = urgency === 'warning' || urgency === 'critical';

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      onKeyDown={handleRootKeyDown}
      {...rest}
      {...merged}
    >
      {/* Top Semantic Retention Urgency Hairline */}
      <div
        aria-hidden="true"
        data-testid="trash-urgency-accent"
        className={cx(accentClass, 'w-full h-1 rounded-full transition-colors duration-200')}
        style={{ backgroundColor: urgencyMeta.colorToken }}
      />

      {/* Primary Banner Row: Retention Summary + Action Controls */}
      <div
        className={cx(
          headerClass,
          'flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span
            aria-hidden="true"
            data-testid="trash-urgency-icon"
            className="prism-well w-10 h-10 rounded-2xl inline-flex items-center justify-center shrink-0"
            style={{
              color: urgencyMeta.colorToken,
              boxShadow: urgencyMeta.ringShadow,
            }}
          >
            {isElevatedUrgency ? (
              <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
            ) : (
              <Trash2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            )}
          </span>

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className={cx(metricsClass, 'flex flex-wrap items-center gap-2 min-w-0')}>
              <h3
                id={headingId}
                data-testid="trash-recovery-heading"
                className="m-0 text-sm sm:text-base font-semibold tracking-tight leading-snug break-words"
                style={STYLE_TEXT_PRIMARY}
              >
                {isEmpty ? 'Trash is empty' : 'Trash & Recovery'}
              </h3>

              <span
                data-testid="trash-metrics-badge"
                className="prism-well rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap"
                style={STYLE_TEXT_SECONDARY}
              >
                {metricsPillText}
              </span>

              <span
                data-testid="trash-retention-badge"
                data-urgency={urgency}
                className="prism-well rounded-full px-2.5 py-0.5 inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap"
                style={{
                  color: urgencyMeta.colorToken,
                  backgroundColor: urgencyMeta.tintBg,
                  boxShadow: urgencyMeta.ringShadow,
                }}
              >
                {!autoDeleteEnabled ? (
                  <Pause className="w-3 h-3 shrink-0" aria-hidden="true" />
                ) : isElevatedUrgency ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" aria-hidden="true" />
                ) : (
                  <Clock className="w-3 h-3 shrink-0" aria-hidden="true" />
                )}
                <span>{retentionBadgeText}</span>
              </span>
            </div>

            <p
              data-testid="trash-recovery-description"
              className="m-0 text-xs sm:text-sm leading-relaxed break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {descriptionText}
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="Trash recovery actions"
          className={cx(actionsClass, 'flex flex-wrap items-center gap-2 shrink-0 min-w-0')}
        >
          <button
            type="button"
            disabled={disabled || safeSelectedCount === 0}
            data-testid="trash-restore-selected"
            onClick={handleRestoreSelected}
            className="prism-btn-primary prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Undo2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{`Restore Selected (${safeSelectedCount})`}</span>
            </span>
          </button>

          <button
            type="button"
            disabled={disabled || isEmpty}
            data-testid="trash-restore-all"
            onClick={handleRestoreAll}
            className="prism-btn-secondary prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Restore All</span>
            </span>
          </button>

          {!isConfirmingEmpty ? (
            <button
              type="button"
              disabled={disabled || isEmpty}
              aria-expanded={false}
              aria-controls={confirmPanelId}
              data-testid="trash-empty-button"
              onClick={handleRequestEmptyTrash}
              className="prism-crystal prism-focus-ring h-9 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={{
                color: 'var(--prism-error-main)',
                boxShadow: URGENCY_META.critical.ringShadow,
              }}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Empty Trash</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Inline Two-Step Safety Confirmation Bar */}
      {isConfirmingEmpty ? (
        <div
          id={confirmPanelId}
          role="group"
          aria-label="Confirm empty trash"
          data-testid="trash-confirm-panel"
          className={cx(
            confirmClass,
            'prism-well rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-2.5 min-w-0'
          )}
          style={{
            backgroundColor: URGENCY_META.critical.tintBg,
            boxShadow: URGENCY_META.critical.ringShadow,
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertTriangle
              className="w-4 h-4 shrink-0"
              aria-hidden="true"
              style={STYLE_ERROR_MAIN}
            />
            <span
              data-testid="trash-confirm-message"
              className="text-xs font-semibold break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {`Permanently delete ${itemLabel}${safeTotalSizeLabel ? ` (${safeTotalSizeLabel})` : ''}? This action cannot be undone.`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 min-w-0">
            <button
              type="button"
              disabled={disabled || isEmpty}
              data-testid="trash-confirm-empty-button"
              onClick={handleConfirmEmptyTrash}
              className="prism-focus-ring h-8 px-3.5 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={STYLE_BADGE_ERROR}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Confirm Empty Trash</span>
            </button>

            <button
              type="button"
              disabled={disabled}
              data-testid="trash-cancel-empty-button"
              onClick={handleCancelEmptyTrash}
              className="prism-crystal prism-focus-ring h-8 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
              style={STYLE_TEXT_PRIMARY}
            >
              <X className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Polite Live Region Telemetry & Action Feedback Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="trash-recovery-status"
        className={cx(
          statusClass,
          'pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0'
        )}
        style={{
          color: 'var(--prism-text-secondary)',
          borderTop: '1px solid var(--prism-divider)',
        }}
      >
        <span className="break-words min-w-0">{liveStatusText}</span>
        <span
          data-testid="trash-urgency-label"
          className="font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
          style={{ color: urgencyMeta.colorToken }}
        >
          {autoDeleteEnabled ? urgencyMeta.label : 'Auto-delete paused'}
        </span>
      </div>
    </div>
  );
}

export const TrashRecoveryBanner = /*#__PURE__*/ memoWithDisplayName(TrashRecoveryBannerInner, 'TrashRecoveryBanner');
