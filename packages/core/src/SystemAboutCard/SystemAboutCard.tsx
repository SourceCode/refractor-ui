'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  HardDrive,
  RefreshCw,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { isDocumentVisible } from '../hooks/useRafCallback';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { composeEventHandlers } from '../utils/composeEventHandlers';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, sanitizeUrl } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_SUCCESS_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SystemAboutMode = 'inline' | 'modal';

export interface SystemSpecEntry {
  /** Stable identifier for this hardware or system specification row. */
  id: string;
  /** Specification label rendered inside the semantic `<dt>` term. */
  label: string;
  /** Specification value rendered inside the semantic `<dd>` definition. */
  value: string;
  /** When `true`, masks the value by default with an accessible Reveal/Hide toggle. */
  sensitive?: boolean;
}

export interface SystemStorageSummary {
  /** Used storage capacity in gigabytes (sanitized and clamped against `totalGb`). */
  usedGb: number;
  /** Total storage capacity in gigabytes (sanitized to non-negative finite number). */
  totalGb: number;
  /** Optional storage volume label (defaults to `'Storage'`). */
  label?: string;
}

export interface SystemAboutLink {
  /** Stable identifier for the footer link entry. */
  id: string;
  /** Human-readable link label. */
  label: string;
  /** Target URL; strictly sanitized via `sanitizeUrl(href, false)` before rendering. */
  href: string;
}

export interface SystemAboutInfo {
  /** Primary operating system or platform name. */
  osName: string;
  /** Optional release codename or workstation edition subtitle. */
  codename?: string;
  /** Semantic OS version string (e.g. `'15.4'`). */
  version: string;
  /** Monospace OS build identifier (e.g. `'24E218'`). */
  buildNumber: string;
  /** Initial system uptime in seconds (sanitized and clamped to non-negative integers). */
  uptimeSeconds: number;
  /** Structured hardware and system specification rows rendered in a `<dl>`. */
  specs: ReadonlyArray<SystemSpecEntry>;
  /** Optional storage utilization summary rendered as an optical progress bar. */
  storage?: SystemStorageSummary;
  /** Optional footer documentation and license links (strictly URL-sanitized). */
  links?: ReadonlyArray<SystemAboutLink>;
  /** Optional copyright notice rendered at the base of the card. */
  copyright?: string;
}

type SystemAboutCardBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SystemAboutCardProps extends SystemAboutCardBaseProps {
  /** Presentation mode: `'inline'` renders a `prism-slab` region; `'modal'` renders a frosted dialog overlay. */
  mode?: SystemAboutMode;
  /** Controls visibility when `mode="modal"` (defaults to `true`). Renders `null` when `false` in modal mode. */
  open?: boolean;
  /** System identity, hardware specifications, storage metrics, and links. */
  info?: SystemAboutInfo;
  /** When `true`, increments the live uptime readout every 1000ms with strict cleanup on disable/unmount. */
  liveUptime?: boolean;
  /** Callback invoked with the formatted plain-text diagnostics report when `Copy Diagnostics` is clicked. */
  onCopyDiagnostics?: (diagnosticsText: string) => void;
  /** Callback invoked when `Software Update…` is activated. */
  onCheckUpdates?: () => void;
  /** Callback invoked when the modal is dismissed via Close button, backdrop click, or IME-safe `Escape`. */
  onClose?: () => void;
  /** Disables interactive actions, reveal toggles, link navigation, and modal dismissal controls. */
  disabled?: boolean;
}

type CopyOutcome = 'clipboard' | 'fallback' | 'unavailable';
type UpdateCheckState = 'idle' | 'checking' | 'up-to-date';
type StorageToneName = 'normal' | 'warning' | 'critical';

interface NormalizedStorage {
  label: string;
  usedGb: number;
  totalGb: number;
  pct: number;
  toneVar: string;
  toneName: StorageToneName;
}

const COPY_RESET_DELAY_MS = 2000;
const UPDATE_CHECK_DELAY_MS = 900;

export const DEFAULT_SYSTEM_ABOUT_INFO: SystemAboutInfo = {
  osName: 'Refractor OS',
  codename: 'Prism Workstation',
  version: '15.4',
  buildNumber: '24E218',
  uptimeSeconds: 1_232_528,
  specs: [
    { id: 'chip', label: 'Chip', value: 'Refractor Silicon M4 Prism' },
    { id: 'memory', label: 'Memory', value: '64 GB Unified Optical' },
    { id: 'graphics', label: 'Graphics', value: 'Prism GPU 40-Core' },
    { id: 'display', label: 'Display', value: '6K Pro Refractive XDR (6016×3384)' },
    {
      id: 'serial',
      label: 'Serial Number',
      value: 'RFR-X9K4-8821-PRSM',
      sensitive: true,
    },
  ],
  storage: {
    usedGb: 412,
    totalGb: 1000,
    label: 'Internal Optical NVMe',
  },
  links: [
    {
      id: 'release-notes',
      label: 'Release Notes',
      href: 'https://refractor-ui.dev/releases/15.4',
    },
    {
      id: 'licenses',
      label: 'Open Source Licenses',
      href: 'https://refractor-ui.dev/licenses',
    },
  ],
  copyright: '© 2026 Refractor Optical Systems. All rights reserved.',
};

function sanitizeUptimeSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }
  return Math.floor(seconds);
}

/**
 * Deterministically formats a duration in seconds as tabular `Xd HHh MMm SSs`.
 * Clamps `NaN`, `Infinity`, and negative numbers safely to `0d 00h 00m 00s`.
 */
export function formatUptimeDuration(seconds: number): string {
  const safeSeconds = sanitizeUptimeSeconds(seconds);
  const days = Math.floor(safeSeconds / 86_400);
  const hours = Math.floor((safeSeconds % 86_400) / 3_600);
  const minutes = Math.floor((safeSeconds % 3_600) / 60);
  const secs = safeSeconds % 60;

  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(secs)}s`;
}

function formatVersionLabel(version: string): string {
  const trimmed = version.trim();
  if (!trimmed) {
    return 'v0.0';
  }
  return /^[vV]/.test(trimmed) ? trimmed : `v${trimmed}`;
}

function maskSensitiveValue(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (trimmed.length <= 4) {
    return '••••••••';
  }
  return `••••-••••-${trimmed.slice(-4)}`;
}

function sanitizeStorageGb(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  return Math.round(value * 10) / 10;
}

function normalizeStorage(storage: SystemStorageSummary): NormalizedStorage {
  const totalGb = sanitizeStorageGb(storage.totalGb);
  const rawUsedGb = sanitizeStorageGb(storage.usedGb);
  const usedGb = totalGb > 0 ? Math.min(rawUsedGb, totalGb) : 0;
  const pct =
    totalGb > 0 ? Math.round(clampNumber((usedGb / totalGb) * 100, 0, 100, 0)) : 0;

  let toneVar = 'var(--prism-primary-main)';
  let toneName: StorageToneName = 'normal';
  if (pct >= 90) {
    toneVar = 'var(--prism-error-main)';
    toneName = 'critical';
  } else if (pct >= 75) {
    toneVar = 'var(--prism-warning-main)';
    toneName = 'warning';
  }

  const trimmedLabel = storage.label?.trim();
  return {
    label: trimmedLabel ? trimmedLabel : 'Storage',
    usedGb,
    totalGb,
    pct,
    toneVar,
    toneName,
  };
}

function buildDiagnosticsReport(
  info: SystemAboutInfo,
  uptimeSeconds: number,
  revealedSpecIds: ReadonlySet<string>,
  storage: NormalizedStorage | null
): string {
  const lines: string[] = [];
  const trimmedCodename = info.codename?.trim();
  const osHeading = trimmedCodename ? `${info.osName} (${trimmedCodename})` : info.osName;
  const versionText = formatVersionLabel(info.version);
  const trimmedBuild = info.buildNumber.trim();
  const versionLine = trimmedBuild ? `${versionText} · Build ${trimmedBuild}` : versionText;

  lines.push(`System: ${osHeading}`);
  lines.push(`Version: ${versionLine}`);
  lines.push(`Uptime: ${formatUptimeDuration(uptimeSeconds)}`);

  for (const spec of info.specs) {
    const renderedValue =
      spec.sensitive && !revealedSpecIds.has(spec.id)
        ? maskSensitiveValue(spec.value)
        : spec.value;
    lines.push(`${spec.label}: ${renderedValue}`);
  }

  if (storage) {
    lines.push(
      `Storage (${storage.label}): ${storage.usedGb} / ${storage.totalGb} GB (${storage.pct}%)`
    );
  }

  return lines.join('\n');
}

async function copyTextWithFallback(text: string): Promise<CopyOutcome> {
  const clipboard = navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(text);
      return 'clipboard';
    } catch {
      // Fall through to legacy textarea copy path.
    }
  }

  if (typeof document.execCommand === 'function') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      if (document.execCommand('copy')) {
        return 'fallback';
      }
    } catch {
      // execCommand blocked or unsupported in environment.
    } finally {
      textarea.remove();
    }
  }

  return 'unavailable';
}

interface OpticalPrismEmblemProps {
  svgPrefix: string;
  className?: string;
}

function OpticalPrismEmblem({ svgPrefix, className }: OpticalPrismEmblemProps) {
  const prismGradId = `${svgPrefix}-prism-grad`;
  const haloGradId = `${svgPrefix}-halo-grad`;

  return (
    <svg
      viewBox="0 0 72 72"
      aria-hidden="true"
      data-testid="system-about-emblem"
      className={cx('w-16 h-16 shrink-0 block', className, 'prism-contain-box')}
    >
      <defs>
        <linearGradient id={prismGradId} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="var(--prism-primary-main)" stopOpacity={0.92} />
          <stop offset="100%" stopColor="var(--prism-info-main)" stopOpacity={0.92} />
        </linearGradient>
        <radialGradient id={haloGradId} cx="50%" cy="46%" r="48%">
          <stop offset="0%" stopColor="var(--prism-info-main)" stopOpacity={0.28} />
          <stop offset="62%" stopColor="var(--prism-primary-main)" stopOpacity={0.14} />
          <stop
            offset="100%"
            stopColor="var(--prism-surface-glass, var(--prism-crystal-top))"
            stopOpacity={0}
          />
        </radialGradient>
      </defs>

      {/* Outer optical glass disc */}
      <rect
        x="3"
        y="3"
        width="66"
        height="66"
        rx="18"
        fill="var(--prism-surface-glass, var(--prism-crystal-top))"
        stroke="var(--prism-border-glass, var(--prism-well-border))"
        strokeWidth="1.5"
      />
      <rect x="4" y="4" width="64" height="64" rx="17" fill={`url(#${haloGradId})`} />

      {/* Concentric refractive calibration ring */}
      <circle
        cx="36"
        cy="36"
        r="24"
        fill="none"
        stroke="var(--prism-border-glass, var(--prism-well-border))"
        strokeOpacity={0.72}
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* Dispersion incident and exit rays */}
      <line
        x1="10"
        y1="44"
        x2="24"
        y2="37"
        stroke="var(--prism-primary-main)"
        strokeOpacity={0.78}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="48"
        y1="35"
        x2="62"
        y2="27"
        stroke="var(--prism-info-main)"
        strokeOpacity={0.85}
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <line
        x1="48"
        y1="39"
        x2="62"
        y2="45"
        stroke="var(--prism-primary-main)"
        strokeOpacity={0.7}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Geometric tri-facet optical prism */}
      <polygon
        points="36,13 55,51 17,51"
        fill="var(--prism-surface-glass, var(--prism-crystal-top))"
        stroke="var(--prism-border-glass, var(--prism-well-border))"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <polygon
        points="36,13 36,51 17,51"
        fill="var(--prism-primary-main)"
        fillOpacity={0.34}
      />
      <polygon
        points="36,13 55,51 36,51"
        fill="var(--prism-info-main)"
        fillOpacity={0.34}
      />
      <polygon
        points="36,22 47,46 25,46"
        fill={`url(#${prismGradId})`}
        fillOpacity={0.86}
        stroke="var(--prism-border-glass, var(--prism-well-border))"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <line
        x1="36"
        y1="22"
        x2="36"
        y2="46"
        stroke="var(--prism-surface-glass, var(--prism-crystal-top))"
        strokeOpacity={0.8}
        strokeWidth="1.25"
      />
    </svg>
  );
}

const panelClass = /*#__PURE__*/ stableClassName('system-about-card', 'panel');
const headerClass = /*#__PURE__*/ stableClassName('system-about-card', 'header');
const emblemClass = /*#__PURE__*/ stableClassName('system-about-card', 'emblem');
const specsClass = /*#__PURE__*/ stableClassName('system-about-card', 'specs');
const storageClass = /*#__PURE__*/ stableClassName('system-about-card', 'storage');
const actionsClass = /*#__PURE__*/ stableClassName('system-about-card', 'actions');
const linksClass = /*#__PURE__*/ stableClassName('system-about-card', 'links');
const statusClass = /*#__PURE__*/ stableClassName('system-about-card', 'status');

function SystemAboutCardInner({
  mode = 'inline',
  open = true,
  info = DEFAULT_SYSTEM_ABOUT_INFO,
  liveUptime = false,
  onCopyDiagnostics,
  onCheckUpdates,
  onClose,
  disabled = false,
  'aria-label': ariaLabel,
  onClick,
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SystemAboutCardProps) {
  const baseId = useId();
  const titleId = `${baseId}-title`;
  const svgPrefix = `${baseId}-emblem`;
  const override = useComponentOverride('SystemAboutCard');

  const isModal = mode === 'modal';
  const baseUptimeSeconds = sanitizeUptimeSeconds(info.uptimeSeconds);

  const [uptimeOffset, setUptimeOffset] = useState<number>(0);
  const [revealedSpecIds, setRevealedSpecIds] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [updateState, setUpdateState] = useState<UpdateCheckState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const mountedRef = useRef<boolean>(true);
  const copyAttemptRef = useRef<number>(0);
  const copyTimerRef = useRef<number | null>(null);
  const updateTimerRef = useRef<number | null>(null);

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  const clearUpdateTimer = useCallback(() => {
    if (updateTimerRef.current !== null) {
      window.clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCopyTimer();
      clearUpdateTimer();
    };
  }, [clearCopyTimer, clearUpdateTimer]);

  useEffect(() => {
    setUptimeOffset(0);
  }, [baseUptimeSeconds]);

  useEffect(() => {
    if (!liveUptime) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      if (!isDocumentVisible()) return;
      setUptimeOffset((prev) => prev + 1);
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [liveUptime]);

  useEffect(() => {
    if (!isModal || !open) {
      return undefined;
    }

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing || disabled) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [disabled, isModal, onClose, open]);

  const displayedUptimeSeconds = baseUptimeSeconds + uptimeOffset;
  const formattedUptime = formatUptimeDuration(displayedUptimeSeconds);

  const normalizedStorage = useMemo<NormalizedStorage | null>(
    () => (info.storage ? normalizeStorage(info.storage) : null),
    [info.storage]
  );

  const versionLabel = formatVersionLabel(info.version);
  const trimmedBuild = info.buildNumber.trim();
  const versionBadgeText = trimmedBuild
    ? `${versionLabel} · Build ${trimmedBuild}`
    : versionLabel;
  const trimmedCodename = info.codename?.trim() ?? '';
  const trimmedCopyright = info.copyright?.trim() ?? '';

  const handleToggleReveal = useCallback((spec: SystemSpecEntry) => {
    setRevealedSpecIds((prev) => {
      const next = new Set(prev);
      if (next.has(spec.id)) {
        next.delete(spec.id);
        setStatusMessage(`${spec.label} masked.`);
      } else {
        next.add(spec.id);
        setStatusMessage(`${spec.label} revealed.`);
      }
      return next;
    });
  }, []);

  const handleCopyDiagnostics = useCallback(() => {
    const report = buildDiagnosticsReport(
      info,
      displayedUptimeSeconds,
      revealedSpecIds,
      normalizedStorage
    );
    onCopyDiagnostics?.(report);

    const attemptId = copyAttemptRef.current + 1;
    copyAttemptRef.current = attemptId;
    clearCopyTimer();

    void copyTextWithFallback(report).then((outcome) => {
      if (!mountedRef.current || attemptId !== copyAttemptRef.current) {
        return;
      }
      if (outcome === 'unavailable') {
        setCopied(false);
        setStatusMessage('Clipboard unavailable. Diagnostics report prepared.');
        return;
      }
      setCopied(true);
      setStatusMessage('Diagnostics copied to clipboard.');
      copyTimerRef.current = window.setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, COPY_RESET_DELAY_MS);
    });
  }, [
    clearCopyTimer,
    displayedUptimeSeconds,
    info,
    normalizedStorage,
    onCopyDiagnostics,
    revealedSpecIds,
  ]);

  const handleCheckUpdates = useCallback(() => {
    clearUpdateTimer();
    setUpdateState('checking');
    setStatusMessage('Checking for updates…');
    onCheckUpdates?.();

    updateTimerRef.current = window.setTimeout(() => {
      updateTimerRef.current = null;
      setUpdateState('up-to-date');
      setStatusMessage('Up to date');
    }, UPDATE_CHECK_DELAY_MS);
  }, [clearUpdateTimer, onCheckUpdates]);

  const handleClose = useCallback(() => {
    if (disabled) {
      return;
    }
    onClose?.();
  }, [disabled, onClose]);

  const handleButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const handleDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (disabled) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    },
    [disabled, onClose]
  );

  if (isModal && !open) {
    return null;
  }


  const merged = mergeProps({
    themeTarget: themeProps('system-about-card', {
      mode,
      open: true,
      liveUptime,
      disabled,
    }),
    baseClassName: isModal
      ? 'fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6'
      : cx(
          'prism-slab w-full max-w-full min-w-0 p-5 sm:p-6 flex flex-col gap-4',
          disabled ? 'opacity-65' : ''
        ),
    baseStyle: isModal
      ? {
          backgroundColor: 'color-mix(in srgb, var(--prism-bg-end) 76%, transparent)',
          backdropFilter: 'blur(var(--prism-blur-px))',
        }
      : undefined,
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const links = info.links ?? [];

  const cardInnerContent = (
    <>
      {/* Identity Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-start justify-between gap-4 pb-4 min-w-0'
        )}
        style={{ borderBottom: '1px solid var(--prism-divider)' }}
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <div
            className={cx(
              emblemClass,
              'prism-crystal rounded-2xl p-1 inline-flex items-center justify-center shrink-0'
            )}
          >
            <OpticalPrismEmblem svgPrefix={svgPrefix} />
          </div>

          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <h2
                id={titleId}
                data-testid="system-about-os-name"
                className="m-0 text-lg font-bold tracking-tight truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {info.osName}
              </h2>
              {trimmedCodename ? (
                <span
                  data-testid="system-about-codename"
                  className="text-xs font-medium truncate"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {trimmedCodename}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span
                data-testid="system-about-version-badge"
                className="prism-well inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tracking-tight whitespace-nowrap"
                style={STYLE_PRIMARY_MAIN}
              >
                {versionBadgeText}
              </span>

              <span
                data-testid="system-about-uptime"
                data-live={liveUptime ? 'true' : 'false'}
                className="prism-well inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-medium tabular-nums whitespace-nowrap"
                style={STYLE_TEXT_SECONDARY}
              >
                <Clock
                  aria-hidden="true"
                  className="w-3 h-3 shrink-0"
                  style={{
                    color: liveUptime
                      ? 'var(--prism-success-main)'
                      : 'var(--prism-info-main)',
                  }}
                />
                <span>Uptime {formattedUptime}</span>
              </span>
            </div>
          </div>
        </div>

        {isModal ? (
          <button
            type="button"
            disabled={disabled}
            aria-label="Close about dialog"
            data-testid="system-about-close"
            onClick={handleClose}
            onKeyDown={handleButtonKeyDown}
            className="prism-btn-secondary prism-focus-ring w-8 h-8 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
          >
            <X aria-hidden="true" className="w-4 h-4 shrink-0" />
          </button>
        ) : null}
      </div>

      {/* Structured Hardware Specifications (<dl>) */}
      {info.specs.length > 0 ? (
        <dl
          data-testid="system-about-specs"
          className={cx(
            specsClass,
            'prism-well m-0 rounded-2xl px-4 py-3 flex flex-col divide-y min-w-0'
          )}
          style={STYLE_BORDER_DIVIDER}
        >
          {info.specs.map((spec) => {
            const isSensitive = Boolean(spec.sensitive);
            const isRevealed = isSensitive && revealedSpecIds.has(spec.id);
            const displayedValue =
              isSensitive && !isRevealed
                ? maskSensitiveValue(spec.value)
                : spec.value;

            return (
              <div
                key={spec.id}
                data-testid={`system-about-spec-${spec.id}`}
                className="py-2 first:pt-0.5 last:pb-0.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 min-w-0"
                style={STYLE_BORDER_DIVIDER}
              >
                <dt
                  className="text-xs font-semibold shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {spec.label}
                </dt>
                <dd className="m-0 flex flex-wrap items-center justify-end gap-2 min-w-0 flex-1 text-right">
                  <span
                    data-testid={`system-about-spec-value-${spec.id}`}
                    data-masked={isSensitive && !isRevealed ? 'true' : 'false'}
                    className={cx(
                      'text-xs font-medium break-words min-w-0',
                      isSensitive ? 'font-mono tabular-nums tracking-wide' : ''
                    )}
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {displayedValue}
                  </span>

                  {isSensitive ? (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-pressed={isRevealed}
                      aria-label={
                        isRevealed ? `Hide ${spec.label}` : `Reveal ${spec.label}`
                      }
                      data-testid={`system-about-reveal-${spec.id}`}
                      onClick={() => handleToggleReveal(spec)}
                      onKeyDown={handleButtonKeyDown}
                      className="prism-crystal prism-focus-ring inline-flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {isRevealed ? (
                        <>
                          <EyeOff aria-hidden="true" className="w-3 h-3 shrink-0" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye aria-hidden="true" className="w-3 h-3 shrink-0" />
                          <span>Reveal</span>
                        </>
                      )}
                    </button>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      ) : null}

      {/* Optional Storage Capacity Meter */}
      {normalizedStorage ? (
        <div
          data-testid="system-about-storage"
          className={cx(
            storageClass,
            'prism-well rounded-2xl px-4 py-3 flex flex-col gap-2 min-w-0'
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <HardDrive
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={{ color: normalizedStorage.toneVar }}
              />
              <span
                data-testid="system-about-storage-label"
                className="text-xs font-semibold truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {normalizedStorage.label}
              </span>
            </div>
            <span
              data-testid="system-about-storage-readout"
              className="font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap"
              style={STYLE_TEXT_SECONDARY}
            >
              {normalizedStorage.usedGb} / {normalizedStorage.totalGb} GB ({normalizedStorage.pct}%)
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={`${normalizedStorage.label} usage`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={normalizedStorage.pct}
            aria-valuetext={`${normalizedStorage.usedGb} of ${normalizedStorage.totalGb} GB used (${normalizedStorage.pct}%)`}
            data-testid="system-about-storage-bar"
            data-tone={normalizedStorage.toneName}
            className="w-full h-2.5 rounded-full overflow-hidden p-0.5"
            style={{
              backgroundColor:
                'color-mix(in srgb, var(--prism-text-secondary) 16%, transparent)',
            }}
          >
            <div
              data-testid="system-about-storage-fill"
              className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-300"
              style={{
                width: `${normalizedStorage.pct}%`,
                backgroundColor: normalizedStorage.toneVar,
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Action Controls */}
      <div
        className={cx(
          actionsClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            disabled={disabled}
            data-testid="system-about-copy-btn"
            data-copied={copied ? 'true' : 'false'}
            onClick={handleCopyDiagnostics}
            onKeyDown={handleButtonKeyDown}
            className="prism-btn-secondary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {copied ? (
              <>
                <Check
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0 relative z-10"
                  style={STYLE_SUCCESS_MAIN}
                />
                <span className="relative z-10">Copied</span>
              </>
            ) : (
              <>
                <Copy
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0 relative z-10"
                />
                <span className="relative z-10">Copy Diagnostics</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={disabled}
            data-testid="system-about-update-btn"
            data-update-state={updateState}
            onClick={handleCheckUpdates}
            onKeyDown={handleButtonKeyDown}
            className="prism-btn-primary prism-focus-ring h-9 px-4 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <RefreshCw
              aria-hidden="true"
              className={cx(
                'w-3.5 h-3.5 shrink-0 relative z-10',
                updateState === 'checking' ? 'animate-spin motion-reduce:animate-none' : ''
              )}
            />
            <span className="relative z-10">Software Update…</span>
          </button>
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="system-about-status"
          className={cx(
            statusClass,
            'text-xs font-medium min-h-[1.25rem] flex items-center min-w-0 break-words'
          )}
          style={{
            color:
              copied || updateState === 'up-to-date'
                ? 'var(--prism-success-main)'
                : 'var(--prism-text-secondary)',
          }}
        >
          {statusMessage}
        </div>
      </div>

      {/* Sanitized Links & Copyright Footer */}
      {links.length > 0 || trimmedCopyright ? (
        <div
          className={cx(
            linksClass,
            'flex flex-wrap items-center justify-between gap-2 pt-3 min-w-0'
          )}
          style={{ borderTop: '1px solid var(--prism-divider)' }}
        >
          {links.length > 0 ? (
            <nav
              aria-label="System documentation links"
              data-testid="system-about-links"
              className="flex flex-wrap items-center gap-3 min-w-0"
            >
              {links.map((link) => {
                const safeHref = sanitizeUrl(link.href, false);
                if (!safeHref) {
                  return (
                    <span
                      key={link.id}
                      data-testid={`system-about-link-blocked-${link.id}`}
                      data-sanitized="blocked"
                      className="text-xs font-medium line-through opacity-60 select-none"
                      style={STYLE_TEXT_DISABLED}
                    >
                      {link.label}
                    </span>
                  );
                }

                if (disabled) {
                  return (
                    <span
                      key={link.id}
                      aria-disabled="true"
                      data-testid={`system-about-link-disabled-${link.id}`}
                      className="text-xs font-medium opacity-55 cursor-not-allowed"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {link.label}
                    </span>
                  );
                }

                const lowerHref = safeHref.toLowerCase();
                const isExternalHttp =
                  lowerHref.startsWith('http://') || lowerHref.startsWith('https://');

                return (
                  <a
                    key={link.id}
                    href={safeHref}
                    target={isExternalHttp ? '_blank' : undefined}
                    rel={isExternalHttp ? 'noopener noreferrer' : undefined}
                    data-testid={`system-about-link-${link.id}`}
                    className="prism-focus-ring inline-flex items-center gap-1 rounded text-xs font-semibold hover:underline transition-colors"
                    style={STYLE_INFO_MAIN}
                  >
                    <span>{link.label}</span>
                    {isExternalHttp ? (
                      <ExternalLink aria-hidden="true" className="w-3 h-3 shrink-0" />
                    ) : null}
                  </a>
                );
              })}
            </nav>
          ) : null}

          {trimmedCopyright ? (
            <p
              data-testid="system-about-copyright"
              className="m-0 text-[11px] leading-snug"
              style={STYLE_TEXT_SECONDARY}
            >
              {trimmedCopyright}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );

  if (isModal) {
    return (
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : titleId}
        aria-disabled={disabled || undefined}
        data-testid="system-about-backdrop"
        onClick={composeEventHandlers(onClick, handleClose)}
        onKeyDown={composeEventHandlers(onKeyDown, handleDialogKeyDown)}
        {...rest}
        {...merged}
      >
        <div
          data-testid="system-about-panel"
          onClick={(event) => event.stopPropagation()}
          className={cx(
            panelClass,
            'prism-slab w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 flex flex-col gap-4 min-w-0',
            disabled ? 'opacity-65' : ''
          )}
        >
          {cardInnerContent}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      role="region"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : titleId}
      aria-disabled={disabled || undefined}
      onClick={onClick}
      onKeyDown={onKeyDown}
      {...rest}
      {...merged}
    >
      {cardInnerContent}
    </div>
  );
}

export const SystemAboutCard = /*#__PURE__*/ memoWithDisplayName(SystemAboutCardInner, 'SystemAboutCard');
