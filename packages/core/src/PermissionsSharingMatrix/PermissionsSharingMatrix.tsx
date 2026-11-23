'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Check,
  Copy,
  Eye,
  Link2,
  Lock,
  MessageSquare,
  Pencil,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { sanitizeUrl } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type PosixScopeKey = 'owner' | 'group' | 'public';
export type PosixBitKey = 'read' | 'write' | 'execute';

export interface PosixTriplet {
  /** Read permission bit (octal value 4, symbolic 'r'). */
  read: boolean;
  /** Write permission bit (octal value 2, symbolic 'w'). */
  write: boolean;
  /** Execute permission bit (octal value 1, symbolic 'x'). */
  execute: boolean;
}

export interface PosixPermissionsState {
  /** Owner (u) permission triplet. */
  owner: PosixTriplet;
  /** Group (g) permission triplet. */
  group: PosixTriplet;
  /** Public / Others (o) permission triplet. */
  public: PosixTriplet;
}

export type CloudShareAccessLevel = 'restricted' | 'viewer' | 'commenter' | 'editor';
export type CloudShareExpiry = '7d' | '30d' | 'never';

export interface PermissionsSharingState {
  /** Resource owner identifier shown in the ownership strip. */
  ownerName: string;
  /** Resource group identifier shown in the ownership strip. */
  groupName: string;
  /** Three-scope POSIX permission matrix state. */
  posix: PosixPermissionsState;
  /** Cloud link sharing access level. */
  shareAccess: CloudShareAccessLevel;
  /** Cloud link sharing expiration duration. */
  shareExpiry: CloudShareExpiry;
}

type PermissionsSharingMatrixBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface PermissionsSharingMatrixProps extends PermissionsSharingMatrixBaseProps {
  /** Target resource filename displayed in the optical header (defaults to 'prism-shader-kernel.sh'). */
  resourceName?: string;
  /** Cloud link URL sanitized via sanitizeUrl before rendering or copying. */
  shareUrl?: string;
  /** Controlled permissions and cloud sharing state. */
  value?: PermissionsSharingState;
  /** Partial or complete initial state in uncontrolled mode. */
  defaultValue?: Partial<PermissionsSharingState>;
  /** Callback invoked with the updated state, 4-digit octal string, and 9-character symbolic string. */
  onChange?: (state: PermissionsSharingState, octal: string, symbolic: string) => void;
  /** Disables all presets, ownership inputs, POSIX matrix controls, and cloud sharing actions. */
  disabled?: boolean;
}

interface PosixScopeDescriptor {
  key: PosixScopeKey;
  label: string;
  caption: string;
}

interface PosixBitDescriptor {
  key: PosixBitKey;
  headerLabel: string;
  shortLabel: string;
}

interface PosixPresetDefinition {
  octal: string;
  label: string;
  posix: PosixPermissionsState;
}

interface ShareAccessMeta {
  level: CloudShareAccessLevel;
  label: string;
  tone: 'info' | 'success' | 'warning' | 'primary';
  description: string;
  colorToken: string;
  bgToken: string;
  borderToken: string;
}

interface ShareExpiryMeta {
  value: CloudShareExpiry;
  label: string;
}

type CopyResult = 'clipboard' | 'fallback' | 'unavailable';

const DEFAULT_RESOURCE_NAME = 'prism-shader-kernel.sh';
const DEFAULT_SHARE_URL = 'https://prism.refractor.dev/share/prism-shader-kernel';
const COPY_RESET_DELAY_MS = 1800;

const DEFAULT_POSIX: PosixPermissionsState = {
  owner: { read: true, write: true, execute: true },
  group: { read: true, write: false, execute: true },
  public: { read: true, write: false, execute: false },
};

const DEFAULT_STATE: PermissionsSharingState = {
  ownerName: 'prism-admin',
  groupName: 'optical-eng',
  posix: DEFAULT_POSIX,
  shareAccess: 'viewer',
  shareExpiry: '30d',
};

const POSIX_SCOPES: ReadonlyArray<PosixScopeDescriptor> = [
  { key: 'owner', label: 'Owner', caption: 'User (u)' },
  { key: 'group', label: 'Group', caption: 'Group (g)' },
  { key: 'public', label: 'Public', caption: 'Others (o)' },
];

const POSIX_BITS: ReadonlyArray<PosixBitDescriptor> = [
  { key: 'read', headerLabel: 'Read (4)', shortLabel: 'Read' },
  { key: 'write', headerLabel: 'Write (2)', shortLabel: 'Write' },
  { key: 'execute', headerLabel: 'Execute (1)', shortLabel: 'Execute' },
];

const POSIX_PRESETS: ReadonlyArray<PosixPresetDefinition> = [
  {
    octal: '0644',
    label: '0644 Standard',
    posix: {
      owner: { read: true, write: true, execute: false },
      group: { read: true, write: false, execute: false },
      public: { read: true, write: false, execute: false },
    },
  },
  {
    octal: '0755',
    label: '0755 Executable',
    posix: {
      owner: { read: true, write: true, execute: true },
      group: { read: true, write: false, execute: true },
      public: { read: true, write: false, execute: true },
    },
  },
  {
    octal: '0600',
    label: '0600 Private',
    posix: {
      owner: { read: true, write: true, execute: false },
      group: { read: false, write: false, execute: false },
      public: { read: false, write: false, execute: false },
    },
  },
];

const SHARE_ACCESS_RESTRICTED: ShareAccessMeta = {
  level: 'restricted',
  label: 'Restricted',
  tone: 'info',
  description: 'Only explicitly authorized collaborators can access this resource.',
  colorToken: 'var(--prism-info-main)',
  bgToken: 'color-mix(in srgb, var(--prism-info-main) 14%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-info-main) 40%, transparent)',
};

const SHARE_ACCESS_VIEWER: ShareAccessMeta = {
  level: 'viewer',
  label: 'Viewer',
  tone: 'success',
  description: 'Anyone with the link can inspect and download this resource.',
  colorToken: 'var(--prism-success-main)',
  bgToken: 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-success-main) 40%, transparent)',
};

const SHARE_ACCESS_COMMENTER: ShareAccessMeta = {
  level: 'commenter',
  label: 'Commenter',
  tone: 'warning',
  description: 'Anyone with the link can inspect and post review comments.',
  colorToken: 'var(--prism-warning-main)',
  bgToken: 'color-mix(in srgb, var(--prism-warning-main) 16%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-warning-main) 44%, transparent)',
};

const SHARE_ACCESS_EDITOR: ShareAccessMeta = {
  level: 'editor',
  label: 'Editor',
  tone: 'primary',
  description: 'Anyone with the link can edit contents and update file metadata.',
  colorToken: 'var(--prism-primary-main)',
  bgToken: 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
  borderToken: 'color-mix(in srgb, var(--prism-primary-main) 42%, transparent)',
};

const SHARE_ACCESS_OPTIONS: ReadonlyArray<ShareAccessMeta> = [
  SHARE_ACCESS_RESTRICTED,
  SHARE_ACCESS_VIEWER,
  SHARE_ACCESS_COMMENTER,
  SHARE_ACCESS_EDITOR,
];

const SHARE_EXPIRY_OPTIONS: ReadonlyArray<ShareExpiryMeta> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: 'never', label: 'Never' },
];

/**
 * Computes the single-scope octal digit (0-7) from a POSIX triplet.
 */
export function calculatePosixTripletOctal(triplet: PosixTriplet): number {
  return (triplet.read ? 4 : 0) + (triplet.write ? 2 : 0) + (triplet.execute ? 1 : 0);
}

/**
 * Computes the 4-digit POSIX octal string (e.g. '0754') from full POSIX permissions state.
 */
export function calculatePosixOctal(posix: PosixPermissionsState): string {
  const ownerDigit = calculatePosixTripletOctal(posix.owner);
  const groupDigit = calculatePosixTripletOctal(posix.group);
  const publicDigit = calculatePosixTripletOctal(posix.public);
  return `0${ownerDigit}${groupDigit}${publicDigit}`;
}

/**
 * Computes the 3-character symbolic permission triplet (e.g. 'rwx', 'r-x', 'r--').
 */
export function calculatePosixTripletSymbolic(triplet: PosixTriplet): string {
  return `${triplet.read ? 'r' : '-'}${triplet.write ? 'w' : '-'}${triplet.execute ? 'x' : '-'}`;
}

/**
 * Computes the 9-character symbolic POSIX string (e.g. 'rwxr-xr--') from full POSIX permissions state.
 */
export function calculatePosixSymbolic(posix: PosixPermissionsState): string {
  return `${calculatePosixTripletSymbolic(posix.owner)}${calculatePosixTripletSymbolic(posix.group)}${calculatePosixTripletSymbolic(posix.public)}`;
}

function cloneTriplet(triplet: PosixTriplet): PosixTriplet {
  return {
    read: Boolean(triplet.read),
    write: Boolean(triplet.write),
    execute: Boolean(triplet.execute),
  };
}

function clonePosix(posix: PosixPermissionsState): PosixPermissionsState {
  return {
    owner: cloneTriplet(posix.owner),
    group: cloneTriplet(posix.group),
    public: cloneTriplet(posix.public),
  };
}

function resolveInitialState(
  defaultValue?: Partial<PermissionsSharingState>
): PermissionsSharingState {
  return {
    ownerName: defaultValue?.ownerName ?? DEFAULT_STATE.ownerName,
    groupName: defaultValue?.groupName ?? DEFAULT_STATE.groupName,
    posix: defaultValue?.posix ? clonePosix(defaultValue.posix) : clonePosix(DEFAULT_STATE.posix),
    shareAccess: defaultValue?.shareAccess ?? DEFAULT_STATE.shareAccess,
    shareExpiry: defaultValue?.shareExpiry ?? DEFAULT_STATE.shareExpiry,
  };
}

function getPosixTriplet(posix: PosixPermissionsState, scope: PosixScopeKey): PosixTriplet {
  switch (scope) {
    case 'owner':
      return posix.owner;
    case 'group':
      return posix.group;
    case 'public':
      return posix.public;
  }
}

function getPosixBit(triplet: PosixTriplet, bit: PosixBitKey): boolean {
  switch (bit) {
    case 'read':
      return triplet.read;
    case 'write':
      return triplet.write;
    case 'execute':
      return triplet.execute;
  }
}

function togglePosixBitInTriplet(triplet: PosixTriplet, bit: PosixBitKey): PosixTriplet {
  switch (bit) {
    case 'read':
      return { read: !triplet.read, write: triplet.write, execute: triplet.execute };
    case 'write':
      return { read: triplet.read, write: !triplet.write, execute: triplet.execute };
    case 'execute':
      return { read: triplet.read, write: triplet.write, execute: !triplet.execute };
  }
}

function withUpdatedScopeTriplet(
  posix: PosixPermissionsState,
  scope: PosixScopeKey,
  nextTriplet: PosixTriplet
): PosixPermissionsState {
  switch (scope) {
    case 'owner':
      return {
        owner: nextTriplet,
        group: cloneTriplet(posix.group),
        public: cloneTriplet(posix.public),
      };
    case 'group':
      return {
        owner: cloneTriplet(posix.owner),
        group: nextTriplet,
        public: cloneTriplet(posix.public),
      };
    case 'public':
      return {
        owner: cloneTriplet(posix.owner),
        group: cloneTriplet(posix.group),
        public: nextTriplet,
      };
  }
}

function getShareAccessMeta(level: CloudShareAccessLevel): ShareAccessMeta {
  switch (level) {
    case 'restricted':
      return SHARE_ACCESS_RESTRICTED;
    case 'viewer':
      return SHARE_ACCESS_VIEWER;
    case 'commenter':
      return SHARE_ACCESS_COMMENTER;
    case 'editor':
      return SHARE_ACCESS_EDITOR;
  }
}

function getShareExpiryLabel(expiry: CloudShareExpiry): string {
  switch (expiry) {
    case '7d':
      return '7 days';
    case '30d':
      return '30 days';
    case 'never':
      return 'Never';
  }
}

function parseShareAccessLevel(raw: string): CloudShareAccessLevel | null {
  switch (raw) {
    case 'restricted':
    case 'viewer':
    case 'commenter':
    case 'editor':
      return raw;
    default:
      return null;
  }
}

function parseShareExpiry(raw: string): CloudShareExpiry | null {
  switch (raw) {
    case '7d':
    case '30d':
    case 'never':
      return raw;
    default:
      return null;
  }
}

function ShareAccessGlyph({
  level,
  className,
}: {
  level: CloudShareAccessLevel;
  className?: string;
}) {
  switch (level) {
    case 'restricted':
      return <Lock aria-hidden="true" className={className} />;
    case 'viewer':
      return <Eye aria-hidden="true" className={className} />;
    case 'commenter':
      return <MessageSquare aria-hidden="true" className={className} />;
    case 'editor':
      return <Pencil aria-hidden="true" className={className} />;
  }
}

async function copyTextWithFallback(text: string): Promise<CopyResult> {
  const clipboard = navigator.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(text);
      return 'clipboard';
    } catch {
      // Fall through to legacy execCommand copy path.
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

const headerClass = /*#__PURE__*/ stableClassName('permissions-sharing-matrix', 'header');
const ownershipClass = /*#__PURE__*/ stableClassName('permissions-sharing-matrix', 'ownership');
const matrixClass = /*#__PURE__*/ stableClassName('permissions-sharing-matrix', 'matrix');
const sharingClass = /*#__PURE__*/ stableClassName('permissions-sharing-matrix', 'sharing');

function PermissionsSharingMatrixInner({
  resourceName = DEFAULT_RESOURCE_NAME,
  shareUrl,
  value,
  defaultValue,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: PermissionsSharingMatrixProps) {
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const ownerInputId = `${baseId}-owner`;
  const groupInputId = `${baseId}-group`;
  const matrixHeadingId = `${baseId}-matrix`;
  const sharingHeadingId = `${baseId}-sharing`;
  const accessSelectId = `${baseId}-access`;
  const expirySelectId = `${baseId}-expiry`;

  const override = useComponentOverride('PermissionsSharingMatrix');
  const isControlled = value !== undefined;

  const [uncontrolledState, setUncontrolledState] = useState<PermissionsSharingState>(() =>
    resolveInitialState(defaultValue)
  );
  const [copied, setCopied] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  const mountedRef = useRef<boolean>(true);
  const copyAttemptRef = useRef<number>(0);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCopyTimer = useCallback(() => {
    if (copyTimerRef.current !== null) {
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      clearCopyTimer();
    };
  }, [clearCopyTimer]);

  const currentState: PermissionsSharingState = isControlled ? value : uncontrolledState;
  const resolvedResourceName = resourceName.trim() || DEFAULT_RESOURCE_NAME;

  const octal = useMemo(() => calculatePosixOctal(currentState.posix), [currentState.posix]);
  const symbolic = useMemo(() => calculatePosixSymbolic(currentState.posix), [currentState.posix]);

  const rawShareUrl = shareUrl === undefined ? DEFAULT_SHARE_URL : shareUrl;
  const sanitizedShareUrl = useMemo(() => sanitizeUrl(rawShareUrl, false), [rawShareUrl]);
  const isUnsafeUrlBlocked = rawShareUrl.trim().length > 0 && sanitizedShareUrl.length === 0;
  const isRestricted = currentState.shareAccess === 'restricted';
  const isExpiryDisabled = disabled || isRestricted;
  const isCopyDisabled = disabled || isRestricted || sanitizedShareUrl.length === 0;

  useEffect(() => {
    clearCopyTimer();
    setCopied(false);
  }, [clearCopyTimer, sanitizedShareUrl, isRestricted]);

  const commitState = useCallback(
    (nextState: PermissionsSharingState, announcement?: string) => {
      const nextOctal = calculatePosixOctal(nextState.posix);
      const nextSymbolic = calculatePosixSymbolic(nextState.posix);
      if (!isControlled) {
        setUncontrolledState(nextState);
      }
      if (announcement) {
        setLiveAnnouncement(announcement);
      }
      onChange?.(nextState, nextOctal, nextSymbolic);
    },
    [isControlled, onChange]
  );

  const handleApplyPreset = useCallback(
    (preset: PosixPresetDefinition) => {
      const nextPosix = clonePosix(preset.posix);
      const nextState: PermissionsSharingState = {
        ...currentState,
        posix: nextPosix,
      };
      const nextSymbolic = calculatePosixSymbolic(nextPosix);
      commitState(nextState, `Applied ${preset.label} preset (${preset.octal} ${nextSymbolic}).`);
    },
    [commitState, currentState]
  );

  const handleOwnerChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const nextState: PermissionsSharingState = {
        ...currentState,
        ownerName: event.target.value,
        posix: clonePosix(currentState.posix),
      };
      commitState(nextState);
    },
    [commitState, currentState, disabled]
  );

  const handleGroupChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      const nextState: PermissionsSharingState = {
        ...currentState,
        groupName: event.target.value,
        posix: clonePosix(currentState.posix),
      };
      commitState(nextState);
    },
    [commitState, currentState, disabled]
  );

  const handleOwnershipKeyDown = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'Enter') {
      event.currentTarget.blur();
    }
  }, []);

  const handleToggleBit = useCallback(
    (scope: PosixScopeDescriptor, bit: PosixBitDescriptor) => {
      const currentTriplet = getPosixTriplet(currentState.posix, scope.key);
      const nextTriplet = togglePosixBitInTriplet(currentTriplet, bit.key);
      const nextPosix = withUpdatedScopeTriplet(currentState.posix, scope.key, nextTriplet);
      const nextBitEnabled = getPosixBit(nextTriplet, bit.key);
      const nextOctal = calculatePosixOctal(nextPosix);
      const nextSymbolic = calculatePosixSymbolic(nextPosix);
      const nextState: PermissionsSharingState = {
        ...currentState,
        posix: nextPosix,
      };
      commitState(
        nextState,
        `${scope.label} ${bit.shortLabel} ${nextBitEnabled ? 'enabled' : 'disabled'} (${nextOctal} ${nextSymbolic}).`
      );
    },
    [commitState, currentState]
  );

  const handleShareAccessChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (disabled) return;
      const parsed = parseShareAccessLevel(event.target.value);
      if (!parsed) return;
      const accessMeta = getShareAccessMeta(parsed);
      const nextState: PermissionsSharingState = {
        ...currentState,
        posix: clonePosix(currentState.posix),
        shareAccess: parsed,
      };
      commitState(nextState, `Cloud link access set to ${accessMeta.label}.`);
    },
    [commitState, currentState, disabled]
  );

  const handleShareExpiryChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      if (disabled || isRestricted) return;
      const parsed = parseShareExpiry(event.target.value);
      if (!parsed) return;
      const nextState: PermissionsSharingState = {
        ...currentState,
        posix: clonePosix(currentState.posix),
        shareExpiry: parsed,
      };
      commitState(nextState, `Link expiration set to ${getShareExpiryLabel(parsed)}.`);
    },
    [commitState, currentState, disabled, isRestricted]
  );

  const handleCopyShareLink = useCallback(() => {
    const attemptId = copyAttemptRef.current + 1;
    copyAttemptRef.current = attemptId;
    clearCopyTimer();

    void copyTextWithFallback(sanitizedShareUrl).then((outcome) => {
      if (!mountedRef.current || attemptId !== copyAttemptRef.current) {
        return;
      }
      if (outcome === 'unavailable') {
        setCopied(false);
        setLiveAnnouncement('Clipboard unavailable. Select the share link to copy manually.');
        return;
      }
      setCopied(true);
      setLiveAnnouncement('Share link copied to clipboard.');
      copyTimerRef.current = setTimeout(() => {
        copyTimerRef.current = null;
        setCopied(false);
      }, COPY_RESET_DELAY_MS);
    });
  }, [clearCopyTimer, sanitizedShareUrl]);

  const accessMeta = getShareAccessMeta(currentState.shareAccess);


  const merged = mergeProps({
    themeTarget: themeProps('permissions-sharing-matrix', {
      disabled,
      octal,
      shareAccess: currentState.shareAccess,
      restricted: isRestricted,
    }),
    baseClassName: cx(
      'prism-slab p-4 sm:p-5 w-full max-w-full min-w-0 flex flex-col gap-4',
      disabled && 'opacity-75'
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
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : headingId}
      {...rest}
      {...merged}
    >
      {/* Header: Resource Name, Live POSIX Pill, and Quick Presets */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-3 pb-4 border-b min-w-0'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="min-w-0 flex flex-wrap items-center gap-2.5">
          <span
            aria-hidden="true"
            className="prism-well w-9 h-9 rounded-full inline-flex items-center justify-center shrink-0"
            style={STYLE_INFO_MAIN}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
          </span>

          <div className="min-w-0 flex flex-col gap-0.5">
            <h2
              id={headingId}
              data-testid="psm-resource-name"
              className="m-0 text-sm font-semibold tracking-tight break-words"
              style={STYLE_TEXT_PRIMARY}
            >
              {resolvedResourceName}
            </h2>
            <span
              className="text-[11px] font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              POSIX Permissions &amp; Cloud Link Sharing
            </span>
          </div>

          <span
            data-testid="psm-posix-pill"
            className="prism-well inline-flex items-center px-3 py-1 rounded-full font-mono text-xs font-semibold tabular-nums shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            {`${octal} · ${symbolic}`}
          </span>
        </div>

        <div
          role="group"
          aria-label="POSIX permission presets"
          className="flex flex-wrap items-center gap-1.5 min-w-0"
        >
          {POSIX_PRESETS.map((preset) => {
            const isActive = octal === preset.octal;
            return (
              <button
                key={preset.octal}
                type="button"
                disabled={disabled}
                aria-pressed={isActive}
                data-testid={`psm-preset-${preset.octal}`}
                onClick={() => handleApplyPreset(preset)}
                className={cx(
                  'prism-focus-ring px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:brightness-105',
                  isActive ? 'prism-btn-cobalt' : 'prism-crystal'
                )}
                style={isActive ? undefined : STYLE_TEXT_PRIMARY}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ownership Strip */}
      <div
        className={cx(ownershipClass, 'grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0')}
      >
        <div className="prism-well rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 min-w-0">
          <User
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            <label
              htmlFor={ownerInputId}
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              Owner
            </label>
            <input
              id={ownerInputId}
              type="text"
              aria-label="Resource owner"
              data-testid="psm-owner-input"
              value={currentState.ownerName}
              disabled={disabled}
              onChange={handleOwnerChange}
              onKeyDown={handleOwnershipKeyDown}
              placeholder="owner"
              className="prism-focus-ring w-full min-w-0 bg-transparent border-0 p-0 text-sm font-mono font-medium rounded-md disabled:cursor-not-allowed disabled:opacity-60"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>
        </div>

        <div className="prism-well rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 min-w-0">
          <Users
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <div className="min-w-0 flex-1 flex flex-col gap-0.5">
            <label
              htmlFor={groupInputId}
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              Group
            </label>
            <input
              id={groupInputId}
              type="text"
              aria-label="Resource group"
              data-testid="psm-group-input"
              value={currentState.groupName}
              disabled={disabled}
              onChange={handleGroupChange}
              onKeyDown={handleOwnershipKeyDown}
              placeholder="group"
              className="prism-focus-ring w-full min-w-0 bg-transparent border-0 p-0 text-sm font-mono font-medium rounded-md disabled:cursor-not-allowed disabled:opacity-60"
              style={STYLE_TEXT_PRIMARY}
            />
          </div>
        </div>
      </div>

      {/* POSIX Matrix Table */}
      <section
        aria-labelledby={matrixHeadingId}
        className={cx(matrixClass, 'prism-well rounded-2xl overflow-hidden min-w-0')}
      >
        <div
          className="px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 min-w-0"
          style={STYLE_BORDER_DIVIDER}
        >
          <h3
            id={matrixHeadingId}
            className="m-0 text-xs font-semibold uppercase tracking-wider"
            style={STYLE_TEXT_SECONDARY}
          >
            POSIX Access Matrix
          </h3>
          <span
            data-testid="psm-chmod-readout"
            className="font-mono text-[11px] font-medium tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {`chmod ${octal}`}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table aria-labelledby={matrixHeadingId} className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b" style={STYLE_BORDER_DIVIDER}>
                <th
                  scope="col"
                  className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider min-w-[140px]"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Scope
                </th>
                {POSIX_BITS.map((bit) => (
                  <th
                    key={bit.key}
                    scope="col"
                    className="px-3 py-2.5 text-center text-xs font-semibold whitespace-nowrap"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {bit.headerLabel}
                  </th>
                ))}
                <th
                  scope="col"
                  className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Octal
                </th>
              </tr>
            </thead>
            <tbody>
              {POSIX_SCOPES.map((scope) => {
                const triplet = getPosixTriplet(currentState.posix, scope.key);
                const rowOctal = calculatePosixTripletOctal(triplet);
                const rowSymbolic = calculatePosixTripletSymbolic(triplet);

                return (
                  <tr
                    key={scope.key}
                    data-scope={scope.key}
                    className="border-t transition-colors"
                    style={STYLE_BORDER_DIVIDER}
                  >
                    <th scope="row" className="px-4 py-3 text-left align-middle font-normal">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span
                          className="text-sm font-semibold"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {scope.label}
                        </span>
                        <span
                          className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-medium tabular-nums shrink-0"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {rowSymbolic}
                        </span>
                      </div>
                      <span
                        className="block text-[11px]"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {scope.caption}
                      </span>
                    </th>

                    {POSIX_BITS.map((bit) => {
                      const checked = getPosixBit(triplet, bit.key);
                      return (
                        <td key={bit.key} className="px-3 py-3 text-center align-middle">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checked}
                            aria-label={`${scope.label} ${bit.headerLabel}`}
                            data-testid={`psm-bit-${scope.key}-${bit.key}`}
                            disabled={disabled}
                            onClick={() => handleToggleBit(scope, bit)}
                            className={cx(
                              'prism-focus-ring w-7 h-7 rounded-[9px] inline-flex items-center justify-center shrink-0 transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:scale-105',
                              checked ? 'prism-emerald' : 'prism-crystal'
                            )}
                          >
                            {checked ? (
                              <Check aria-hidden="true" className="w-4 h-4 stroke-[2.8]" />
                            ) : null}
                          </button>
                        </td>
                      );
                    })}

                    <td className="px-4 py-3 text-right align-middle">
                      <span
                        data-testid={`psm-row-octal-${scope.key}`}
                        aria-label={`${scope.label} octal ${rowOctal}`}
                        className="prism-crystal inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full font-mono text-xs font-semibold tabular-nums"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {rowOctal}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cloud Link Sharing Section */}
      <section
        aria-labelledby={sharingHeadingId}
        className={cx(sharingClass, 'prism-well rounded-2xl p-4 flex flex-col gap-3 min-w-0')}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <div className="min-w-0 flex flex-col gap-0.5">
            <h3
              id={sharingHeadingId}
              className="m-0 text-xs font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              Cloud Link Sharing
            </h3>
            <p
              className="m-0 text-xs leading-snug"
              style={STYLE_TEXT_SECONDARY}
            >
              {accessMeta.description}
            </p>
          </div>

          <span
            data-testid="psm-access-badge"
            data-tone={accessMeta.tone}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 border"
            style={{
              color: accessMeta.colorToken,
              backgroundColor: accessMeta.bgToken,
              borderColor: accessMeta.borderToken,
            }}
          >
            <ShareAccessGlyph level={accessMeta.level} className="w-3.5 h-3.5 shrink-0" />
            <span>{accessMeta.label}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
          <div className="prism-crystal rounded-xl px-3 py-2 flex flex-col gap-1 min-w-0">
            <label
              htmlFor={accessSelectId}
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              Link Access Level
            </label>
            <select
              id={accessSelectId}
              aria-label="Cloud link access level"
              data-testid="psm-share-access-select"
              value={currentState.shareAccess}
              disabled={disabled}
              onChange={handleShareAccessChange}
              className="prism-focus-ring w-full min-w-0 rounded-lg px-2 py-1 text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                color: 'var(--prism-text-primary)',
                backgroundColor: 'var(--prism-well-end)',
                borderColor: 'var(--prism-well-border)',
              }}
            >
              {SHARE_ACCESS_OPTIONS.map((option) => (
                <option key={option.level} value={option.level}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="prism-crystal rounded-xl px-3 py-2 flex flex-col gap-1 min-w-0">
            <label
              htmlFor={expirySelectId}
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={STYLE_TEXT_SECONDARY}
            >
              Link Expiration
            </label>
            <select
              id={expirySelectId}
              aria-label="Link expiration"
              data-testid="psm-share-expiry-select"
              value={currentState.shareExpiry}
              disabled={isExpiryDisabled}
              onChange={handleShareExpiryChange}
              className="prism-focus-ring w-full min-w-0 rounded-lg px-2 py-1 text-sm font-medium cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                color: 'var(--prism-text-primary)',
                backgroundColor: 'var(--prism-well-end)',
                borderColor: 'var(--prism-well-border)',
              }}
            >
              {SHARE_EXPIRY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="prism-crystal rounded-xl px-3 py-2.5 flex flex-wrap items-center justify-between gap-2.5 min-w-0">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            {isUnsafeUrlBlocked ? (
              <ShieldAlert
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={STYLE_ERROR_MAIN}
              />
            ) : isRestricted ? (
              <Lock
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={STYLE_INFO_MAIN}
              />
            ) : (
              <Link2
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={STYLE_TEXT_SECONDARY}
              />
            )}

            <span
              data-testid="psm-share-url"
              data-url-status={
                isUnsafeUrlBlocked
                  ? 'blocked'
                  : sanitizedShareUrl.length === 0
                    ? 'empty'
                    : isRestricted
                      ? 'restricted'
                      : 'active'
              }
              className={cx(
                'font-mono text-xs truncate min-w-0',
                isRestricted && sanitizedShareUrl.length > 0 && 'opacity-60'
              )}
              style={{
                color: isUnsafeUrlBlocked
                  ? 'var(--prism-error-main)'
                  : sanitizedShareUrl.length === 0 || isRestricted
                    ? 'var(--prism-text-secondary)'
                    : 'var(--prism-text-primary)',
              }}
            >
              {isUnsafeUrlBlocked
                ? 'Blocked unsafe share link protocol'
                : sanitizedShareUrl.length === 0
                  ? 'No share link configured'
                  : sanitizedShareUrl}
            </span>
          </div>

          <button
            type="button"
            disabled={isCopyDisabled}
            data-copied={copied ? 'true' : undefined}
            data-testid="psm-copy-link-btn"
            onClick={handleCopyShareLink}
            className={cx(
              'prism-focus-ring h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
              copied ? 'prism-emerald' : 'prism-btn-secondary'
            )}
          >
            {copied ? (
              <>
                <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Copied Link</span>
              </>
            ) : (
              <>
                <Copy aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                <span>Copy Share Link</span>
              </>
            )}
          </button>
        </div>
      </section>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="psm-live-region"
        className="sr-only"
      >
        {liveAnnouncement}
      </div>
    </div>
  );
}

export const PermissionsSharingMatrix = /*#__PURE__*/ memoWithDisplayName(PermissionsSharingMatrixInner, 'PermissionsSharingMatrix');
