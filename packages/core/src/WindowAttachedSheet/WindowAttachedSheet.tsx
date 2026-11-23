'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  AlertTriangle,
  BellRing,
  Check,
  FileText,
  Info,
  Lock,
  ShieldAlert,
  Sparkles,
  StickyNote,
  Unlock,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_SECONDARY_DARK, STYLE_SUCCESS_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type WindowAttachedSheetTone = 'info' | 'warning' | 'critical';

type WindowAttachedSheetBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface WindowAttachedSheetProps extends WindowAttachedSheetBaseProps {
  /** Title displayed in the primary target window's titlebar (defaults to `'OpticalSpec_v2.md'`). */
  windowTitle?: string;
  /** Heading displayed inside the window-attached modal sheet (defaults to `'Save unsaved changes before closing?'`). */
  sheetTitle?: string;
  /** Supporting message displayed beneath the sheet title explaining the window-scoped prompt. */
  sheetDescription?: string;
  /** Semantic tone driving the sheet's top accent stripe and icon (`'info' | 'warning' | 'critical'`, defaults to `'warning'`). */
  tone?: WindowAttachedSheetTone;
  /** Label for the confirm action button inside the sheet (defaults to `'Confirm'`). */
  confirmLabel?: string;
  /** Label for the cancel action button inside the sheet (defaults to `'Cancel'`). */
  cancelLabel?: string;
  /** Controlled open state of the attached sheet. */
  open?: boolean;
  /** Initial uncontrolled open state of the attached sheet (defaults to `true`). */
  defaultOpen?: boolean;
  /** Renders an interactive sibling window alongside the target window to demonstrate window-scoped modality (defaults to `true`). */
  showSiblingWindow?: boolean;
  /** Callback invoked when the attached sheet opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Callback invoked when the confirm button is activated. */
  onConfirm?: () => void;
  /** Callback invoked when the cancel button is activated or Escape dismisses the sheet. */
  onCancel?: () => void;
  /** Disables sheet triggers, confirmation/cancellation actions, Escape dismissal, and workspace controls (defaults to `false`). */
  disabled?: boolean;
  /** Optional custom content rendered inside the attached sheet above the action buttons. */
  children?: ReactNode;
}

interface ToneVisualConfig {
  accentVar: string;
  contrastVar: string;
  label: string;
}

const DEFAULT_WINDOW_TITLE = 'OpticalSpec_v2.md';
const DEFAULT_SHEET_TITLE = 'Save unsaved changes before closing?';
const DEFAULT_SHEET_DESCRIPTION =
  'Unsaved edits to this document will be lost unless you save first. Sibling workspace windows stay interactive while this sheet is open.';
const DEFAULT_CONFIRM_LABEL = 'Confirm';
const DEFAULT_CANCEL_LABEL = 'Cancel';

const SHEET_ANIMATION_CSS = `
@keyframes refractor-window-sheet-slide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .refractor-window-attached-sheet__sheet {
    animation: none !important;
  }
}
`;

function getToneVisualConfig(tone: WindowAttachedSheetTone): ToneVisualConfig {
  switch (tone) {
    case 'info':
      return {
        accentVar: 'var(--prism-info-main)',
        contrastVar: 'var(--prism-info-contrast)',
        label: 'Info',
      };
    case 'warning':
      return {
        accentVar: 'var(--prism-warning-main)',
        contrastVar: 'var(--prism-warning-contrast)',
        label: 'Warning',
      };
    case 'critical':
      return {
        accentVar: 'var(--prism-error-main)',
        contrastVar: 'var(--prism-error-contrast)',
        label: 'Critical',
      };
  }
}

function renderToneIcon(tone: WindowAttachedSheetTone): ReactNode {
  switch (tone) {
    case 'info':
      return <Info aria-hidden="true" className="w-4 h-4" />;
    case 'warning':
      return <AlertTriangle aria-hidden="true" className="w-4 h-4" />;
    case 'critical':
      return <ShieldAlert aria-hidden="true" className="w-4 h-4" />;
  }
}

function WindowAttachedSheetInner({
  windowTitle = DEFAULT_WINDOW_TITLE,
  sheetTitle = DEFAULT_SHEET_TITLE,
  sheetDescription = DEFAULT_SHEET_DESCRIPTION,
  tone = 'warning',
  confirmLabel = DEFAULT_CONFIRM_LABEL,
  cancelLabel = DEFAULT_CANCEL_LABEL,
  open,
  defaultOpen = true,
  showSiblingWindow = true,
  onOpenChange,
  onConfirm,
  onCancel,
  disabled = false,
  children,
  'aria-label': ariaLabel,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WindowAttachedSheetProps) {
  const baseId = useId();
  const targetWindowTitleId = `${baseId}-target-window-title`;
  const siblingWindowTitleId = `${baseId}-sibling-window-title`;
  const sheetId = `${baseId}-sheet`;
  const sheetTitleId = `${baseId}-sheet-title`;
  const sheetDescriptionId = `${baseId}-sheet-description`;
  const override = useComponentOverride('WindowAttachedSheet');

  const [isOpen, setIsOpen] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [siblingPingCount, setSiblingPingCount] = useState<number>(0);
  const [targetEditCount, setTargetEditCount] = useState<number>(0);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const openTriggerRef = useRef<HTMLButtonElement>(null);
  const pendingFocusRef = useRef<'sheet' | 'trigger' | null>(null);

  const resolvedWindowTitle = windowTitle.trim() || DEFAULT_WINDOW_TITLE;
  const resolvedSheetTitle = sheetTitle.trim() || DEFAULT_SHEET_TITLE;
  const resolvedSheetDescription = sheetDescription.trim();
  const resolvedConfirmLabel = confirmLabel.trim() || DEFAULT_CONFIRM_LABEL;
  const resolvedCancelLabel = cancelLabel.trim() || DEFAULT_CANCEL_LABEL;
  const toneConfig = getToneVisualConfig(tone);

  useEffect(() => {
    if (pendingFocusRef.current === 'sheet' && isOpen) {
      sheetRef.current?.focus();
      pendingFocusRef.current = null;
    } else if (pendingFocusRef.current === 'trigger' && !isOpen) {
      openTriggerRef.current?.focus();
      pendingFocusRef.current = null;
    }
  }, [isOpen]);

  const handleOpenSheet = useCallback(() => {
    pendingFocusRef.current = 'sheet';
    setIsOpen(true);
    setStatusAnnouncement(
      `Sheet opened on ${resolvedWindowTitle}: ${resolvedSheetTitle}`
    );
  }, [resolvedSheetTitle, resolvedWindowTitle, setIsOpen]);

  const handleConfirm = useCallback(() => {
    pendingFocusRef.current = 'trigger';
    setIsOpen(false);
    setStatusAnnouncement(
      `Confirmed "${resolvedConfirmLabel}" on ${resolvedWindowTitle}. Target window unlocked.`
    );
    onConfirm?.();
  }, [onConfirm, resolvedConfirmLabel, resolvedWindowTitle, setIsOpen]);

  const handleCancelWithReason = useCallback(
    (viaEscape: boolean) => {
      pendingFocusRef.current = 'trigger';
      setIsOpen(false);
      setStatusAnnouncement(
        viaEscape
          ? `Dismissed sheet on ${resolvedWindowTitle} via Escape. Target window unlocked.`
          : `Cancelled sheet on ${resolvedWindowTitle}. Target window unlocked.`
      );
      onCancel?.();
    },
    [onCancel, resolvedWindowTitle, setIsOpen]
  );

  const handleCancelClick = useCallback(() => {
    handleCancelWithReason(false);
  }, [handleCancelWithReason]);

  const handleSheetKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleCancelWithReason(true);
      }
    },
    [disabled, handleCancelWithReason]
  );

  const handleTargetBodyAction = useCallback(() => {
    const nextCount = targetEditCount + 1;
    setTargetEditCount(nextCount);
    setStatusAnnouncement(
      `Formatted ${resolvedWindowTitle} (${nextCount}).`
    );
  }, [resolvedWindowTitle, targetEditCount]);

  const handleSiblingPing = useCallback(() => {
    const nextCount = siblingPingCount + 1;
    setSiblingPingCount(nextCount);
    setStatusAnnouncement(
      `Sibling window Reference Notes pinged (${nextCount}).`
    );
  }, [siblingPingCount]);

  const merged = mergeProps({
    themeTarget: themeProps('window-attached-sheet', {
      open: isOpen,
      tone,
      sibling: showSiblingWindow,
      disabled,
    }),
    baseClassName:
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-4',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const gridClass = stableClassName('window-attached-sheet', 'grid');
  const windowClass = stableClassName('window-attached-sheet', 'window');
  const titlebarClass = stableClassName('window-attached-sheet', 'titlebar');
  const stageClass = stableClassName('window-attached-sheet', 'stage');
  const bodyClass = stableClassName('window-attached-sheet', 'body');
  const sheetClass = stableClassName('window-attached-sheet', 'sheet');
  const stripeClass = stableClassName('window-attached-sheet', 'accent-stripe');
  const customContentClass = stableClassName(
    'window-attached-sheet',
    'custom-content'
  );
  const siblingClass = stableClassName('window-attached-sheet', 'sibling');
  const statusClass = stableClassName('window-attached-sheet', 'status');

  const defaultStatus = isOpen
    ? `Sheet active on ${resolvedWindowTitle}. Target window is blocked while sibling windows remain usable.`
    : `No active sheet on ${resolvedWindowTitle}. All workspace windows are interactive.`;
  const liveStatusText = statusAnnouncement ?? defaultStatus;

  const confirmButtonClass =
    tone === 'info'
      ? 'prism-btn-cobalt prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
      : tone === 'warning'
        ? 'prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
        : 'prism-focus-ring h-9 px-4 rounded-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold tracking-[-0.01em] whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform] border';

  const confirmButtonStyle =
    tone === 'critical'
      ? {
          backgroundColor: 'var(--prism-error-main)',
          color: 'var(--prism-error-contrast)',
          borderColor:
            'color-mix(in srgb, var(--prism-error-contrast) 28%, var(--prism-error-main))',
          boxShadow:
            '0 10px 20px -8px color-mix(in srgb, var(--prism-error-main) 58%, transparent)',
        }
      : undefined;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel ?? 'Window-attached sheet workspace'}
      {...rest}
      {...merged}
    >
      <style>{SHEET_ANIMATION_CSS}</style>

      <div
        data-testid="window-attached-sheet-grid"
        className={cx(
          gridClass,
          'grid min-w-0 max-w-full',
          showSiblingWindow
            ? 'grid-cols-1 md:grid-cols-[1.35fr_0.85fr] gap-4'
            : 'grid-cols-1'
        )}
      >
        {/* Primary Target Window */}
        <section
          aria-labelledby={targetWindowTitleId}
          data-testid="window-attached-sheet-target-window"
          data-sheet-open={isOpen ? 'true' : 'false'}
          className={cx(
            windowClass,
            'prism-slab relative flex flex-col overflow-hidden min-w-0 max-w-full'
          )}
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: isOpen
              ? `color-mix(in srgb, ${toneConfig.accentVar} 42%, var(--prism-divider))`
              : 'var(--prism-divider)',
          }}
        >
          {/* Target Window Titlebar */}
          <header
            data-testid="window-attached-sheet-titlebar"
            className={cx(
              titlebarClass,
              'prism-crystal relative z-20 flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 min-w-0 max-w-full border-b'
            )}
            style={STYLE_BORDER_DIVIDER}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                aria-hidden="true"
                className="inline-flex items-center gap-1.5 shrink-0"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={STYLE_BG_ERROR}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={STYLE_BG_WARNING}
                />
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={STYLE_BG_SUCCESS}
                />
              </div>

              <FileText
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_PRIMARY_MAIN}
              />

              <h2
                id={targetWindowTitleId}
                data-testid="window-attached-sheet-window-title"
                className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate min-w-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {resolvedWindowTitle}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <span
                data-testid="window-attached-sheet-lock-badge"
                className="prism-well inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
                style={{
                  color: isOpen
                    ? toneConfig.accentVar
                    : 'var(--prism-success-main)',
                }}
              >
                {isOpen ? (
                  <Lock aria-hidden="true" className="w-3 h-3 shrink-0" />
                ) : (
                  <Unlock aria-hidden="true" className="w-3 h-3 shrink-0" />
                )}
                <span>{isOpen ? 'Window Modal' : 'Interactive'}</span>
              </span>

              <button
                ref={openTriggerRef}
                type="button"
                disabled={disabled || isOpen}
                aria-expanded={isOpen}
                aria-controls={isOpen ? sheetId : undefined}
                data-testid="window-attached-sheet-trigger"
                data-active={isOpen ? 'true' : undefined}
                onClick={handleOpenSheet}
                className={cx(
                  'prism-focus-ring h-7 px-3 rounded-full inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]',
                  isOpen ? 'prism-well' : 'prism-btn-secondary'
                )}
                style={
                  isOpen
                    ? {
                        color: toneConfig.accentVar,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: `color-mix(in srgb, ${toneConfig.accentVar} 42%, var(--prism-divider))`,
                      }
                    : undefined
                }
              >
                <span className="relative z-10">
                  {isOpen ? 'Sheet Active' : 'Open Sheet'}
                </span>
              </button>
            </div>
          </header>

          {/* Target Window Stage: Body Behind Sheet + Attached Sheet Anchored to Titlebar */}
          <div
            className={cx(
              stageClass,
              'relative grid flex-1 min-h-[260px] min-w-0 max-w-full'
            )}
          >
            {/* Window Content Body (Blocked ONLY While Sheet Is Open) */}
            <div
              data-testid="window-attached-sheet-body"
              data-blocked={isOpen ? 'true' : 'false'}
              aria-hidden={isOpen}
              className={cx(
                bodyClass,
                'col-start-1 row-start-1 p-4 flex flex-col justify-between gap-4 min-w-0 max-w-full transition-[color,background-color,border-color,opacity,transform] duration-200',
                isOpen ? 'pointer-events-none select-none opacity-45' : 'opacity-100'
              )}
              style={STYLE_TEXT_PRIMARY}
            >
              <div className="flex flex-col gap-2.5 min-w-0">
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Document Buffer
                  </span>
                  <span
                    className="font-mono text-[11px] tabular-nums"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {targetEditCount} format pass{targetEditCount === 1 ? '' : 'es'}
                  </span>
                </div>

                <div
                  className="prism-well rounded-xl p-3 font-mono text-xs leading-relaxed flex flex-col gap-1 min-w-0 overflow-x-auto"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <code className="block break-words">
                    --prism-blur-px: 18px;
                  </code>
                  <code className="block break-words">
                    --prism-caustic-opacity: 1.00;
                  </code>
                  <code
                    className="block break-words"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {/* Pending calibration lines */}
                    {'/* 3 unsaved optical token edits */'}
                  </code>
                </div>
              </div>

              <div
                className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t min-w-0"
                style={STYLE_BORDER_DIVIDER}
              >
                <span
                  className="text-xs min-w-0 break-words"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {isOpen
                    ? 'Window controls suspended while sheet is active.'
                    : 'Window controls unlocked and ready.'}
                </span>

                <button
                  type="button"
                  disabled={isOpen || disabled}
                  tabIndex={isOpen ? -1 : undefined}
                  data-testid="window-attached-sheet-body-action"
                  onClick={handleTargetBodyAction}
                  className="prism-btn-secondary prism-focus-ring h-8 px-3.5 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 relative z-10"
                  />
                  <span className="relative z-10">Format Buffer</span>
                </button>
              </div>
            </div>

            {/* Frosted Window-Scoped Dim Scrim Behind the Attached Sheet */}
            {isOpen ? (
              <div
                aria-hidden="true"
                data-testid="window-attached-sheet-scrim"
                className="col-start-1 row-start-1 pointer-events-none z-[5] transition-opacity duration-200"
                style={{
                  backgroundColor:
                    'color-mix(in srgb, var(--prism-bg-end) 46%, transparent)',
                  backdropFilter: 'blur(2px)',
                }}
              />
            ) : null}

            {/* Window-Attached Sheet Sliding Directly Below the Titlebar */}
            {isOpen ? (
              <div
                className="col-start-1 row-start-1 self-start z-10 px-3 sm:px-5 pb-4 min-w-0 max-w-full"
              >
                <div
                  ref={sheetRef}
                  id={sheetId}
                  role="dialog"
                  aria-modal="false"
                  aria-labelledby={sheetTitleId}
                  aria-describedby={
                    resolvedSheetDescription ? sheetDescriptionId : undefined
                  }
                  tabIndex={-1}
                  data-testid="window-attached-sheet-dialog"
                  data-tone={tone}
                  onKeyDown={handleSheetKeyDown}
                  className={cx(
                    sheetClass,
                    'prism-crystal prism-focus-ring relative flex flex-col overflow-hidden rounded-t-none rounded-b-2xl min-w-0 max-w-full'
                  )}
                  style={{
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                    borderTopWidth: 0,
                    borderLeftWidth: '1px',
                    borderRightWidth: '1px',
                    borderBottomWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: `color-mix(in srgb, ${toneConfig.accentVar} 34%, var(--prism-divider))`,
                    boxShadow:
                      '0 18px 34px -10px color-mix(in srgb, var(--prism-text-primary) 24%, transparent)',
                    animation:
                      'refractor-window-sheet-slide 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  {/* Semantic Top Accent Stripe */}
                  <div
                    aria-hidden="true"
                    data-testid="window-attached-sheet-accent-stripe"
                    data-tone={tone}
                    className={cx(stripeClass, 'h-1 w-full shrink-0')}
                    style={{ backgroundColor: toneConfig.accentVar }}
                  />

                  <div className="p-4 flex flex-col gap-3.5 min-w-0 max-w-full">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        aria-hidden="true"
                        data-testid="window-attached-sheet-tone-icon"
                        className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0 mt-0.5"
                        style={{ color: toneConfig.accentVar }}
                      >
                        {renderToneIcon(tone)}
                      </span>

                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h3
                            id={sheetTitleId}
                            data-testid="window-attached-sheet-title"
                            className="text-sm font-semibold tracking-[-0.01em] break-words min-w-0"
                            style={STYLE_TEXT_PRIMARY}
                          >
                            {resolvedSheetTitle}
                          </h3>
                          <span
                            data-testid="window-attached-sheet-tone-badge"
                            className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0 border"
                            style={{
                              color: toneConfig.accentVar,
                              backgroundColor: `color-mix(in srgb, ${toneConfig.accentVar} 14%, transparent)`,
                              borderColor: `color-mix(in srgb, ${toneConfig.accentVar} 36%, transparent)`,
                            }}
                          >
                            {toneConfig.label}
                          </span>
                        </div>

                        {resolvedSheetDescription ? (
                          <p
                            id={sheetDescriptionId}
                            data-testid="window-attached-sheet-description"
                            className="text-xs leading-relaxed break-words"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            {resolvedSheetDescription}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {children !== undefined && children !== null ? (
                      <div
                        data-testid="window-attached-sheet-custom-content"
                        className={cx(
                          customContentClass,
                          'prism-well rounded-xl p-3 text-xs min-w-0 max-w-full'
                        )}
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {children}
                      </div>
                    ) : null}

                    <div
                      className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t min-w-0"
                      style={STYLE_BORDER_DIVIDER}
                    >
                      <button
                        type="button"
                        disabled={disabled}
                        data-testid="window-attached-sheet-cancel"
                        onClick={handleCancelClick}
                        className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span className="relative z-10">
                          {resolvedCancelLabel}
                        </span>
                      </button>

                      <button
                        type="button"
                        disabled={disabled}
                        data-testid="window-attached-sheet-confirm"
                        onClick={handleConfirm}
                        className={confirmButtonClass}
                        style={confirmButtonStyle}
                      >
                        <Check
                          aria-hidden="true"
                          className="w-3.5 h-3.5 shrink-0 relative z-10"
                        />
                        <span className="relative z-10">
                          {resolvedConfirmLabel}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {/* Optional Sibling Window (Always Independent & Interactive) */}
        {showSiblingWindow ? (
          <section
            aria-labelledby={siblingWindowTitleId}
            data-testid="window-attached-sheet-sibling-window"
            className={cx(
              siblingClass,
              'prism-slab relative flex flex-col overflow-hidden min-w-0 max-w-full'
            )}
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--prism-divider)',
            }}
          >
            <header
              className="prism-crystal flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 min-w-0 max-w-full border-b"
              style={STYLE_BORDER_DIVIDER}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <StickyNote
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_SECONDARY_DARK}
                />
                <h2
                  id={siblingWindowTitleId}
                  className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate min-w-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  Reference Notes
                </h2>
              </div>

              <span
                className="prism-well inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap shrink-0"
                style={STYLE_SUCCESS_MAIN}
              >
                Unblocked
              </span>
            </header>

            <div className="p-4 flex flex-col justify-between gap-4 flex-1 min-w-0 max-w-full">
              <div className="flex flex-col gap-2.5 min-w-0">
                <p
                  className="text-xs leading-relaxed break-words"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Because the attached sheet scopes modality strictly to{' '}
                  <strong
                    className="font-semibold"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {resolvedWindowTitle}
                  </strong>
                  , this sibling window remains completely interactive.
                </p>

                <div
                  className="prism-well rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0"
                  style={STYLE_TEXT_PRIMARY}
                >
                  <span
                    className="text-[11px] font-medium"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Sibling pings
                  </span>
                  <span
                    data-testid="window-attached-sheet-sibling-count"
                    className="font-mono text-xs font-bold tabular-nums"
                    style={STYLE_PRIMARY_MAIN}
                  >
                    {siblingPingCount}
                  </span>
                </div>
              </div>

              <button
                type="button"
                disabled={disabled}
                data-testid="window-attached-sheet-sibling-ping"
                onClick={handleSiblingPing}
                className="prism-btn-secondary prism-focus-ring h-9 px-3.5 w-full inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <BellRing
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0 relative z-10"
                />
                <span className="relative z-10">
                  Ping Sibling Window ({siblingPingCount})
                </span>
              </button>
            </div>
          </section>
        ) : null}
      </div>

      {/* Polite Status Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="window-attached-sheet-status"
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs min-w-0 max-w-full'
        )}
        style={{
          color: 'var(--prism-text-secondary)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--prism-well-border)',
        }}
      >
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: isOpen
              ? toneConfig.accentVar
              : 'var(--prism-success-main)',
          }}
        />
        <span className="font-medium break-words min-w-0">
          {liveStatusText}
        </span>
      </div>
    </div>
  );
}

export const WindowAttachedSheet = memo(WindowAttachedSheetInner);
WindowAttachedSheet.displayName = 'WindowAttachedSheet';
