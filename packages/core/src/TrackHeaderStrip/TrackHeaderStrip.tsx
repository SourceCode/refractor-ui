'use client';

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Film,
  Lock,
  Pencil,
  Sparkles,
  Subtitles,
  Unlock,
  Volume2,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type TrackLaneType = 'video' | 'audio' | 'effect' | 'subtitle';

export type TrackHeaderHeight = 'compact' | 'expanded';

export interface TrackHeaderState {
  muted: boolean;
  solo: boolean;
  armed: boolean;
  locked: boolean;
  height: TrackHeaderHeight;
}

export interface TrackHeaderStripProps extends BaseProps<HTMLDivElement> {
  /** Track display name (e.g. 'V1 · Main Camera'). */
  name: string;
  /** Semantic track lane category controlling the left accent stripe and icon (defaults to 'video'). */
  trackType?: TrackLaneType;
  /** Controlled muted state. */
  muted?: boolean;
  /** Initial muted state in uncontrolled mode (defaults to false). */
  defaultMuted?: boolean;
  /** Callback fired when mute state toggles. */
  onMutedChange?: (muted: boolean) => void;
  /** Controlled solo state. */
  solo?: boolean;
  /** Initial solo state in uncontrolled mode (defaults to false). */
  defaultSolo?: boolean;
  /** Callback fired when solo state toggles. */
  onSoloChange?: (solo: boolean) => void;
  /** Controlled record-arm state. */
  armed?: boolean;
  /** Initial record-arm state in uncontrolled mode (defaults to false). */
  defaultArmed?: boolean;
  /** Callback fired when record arm toggles (blocked while locked). */
  onArmedChange?: (armed: boolean) => void;
  /** Controlled locked state. */
  locked?: boolean;
  /** Initial locked state in uncontrolled mode (defaults to false). */
  defaultLocked?: boolean;
  /** Callback fired when track lock toggles. */
  onLockedChange?: (locked: boolean) => void;
  /** Controlled lane header height mode ('compact' | 'expanded'). */
  heightMode?: TrackHeaderHeight;
  /** Initial lane header height mode in uncontrolled mode (defaults to 'compact'). */
  defaultHeightMode?: TrackHeaderHeight;
  /** Callback fired when height mode toggles between compact and expanded. */
  onHeightModeChange?: (height: TrackHeaderHeight) => void;
  /** Optional inline rename handler enabling double-click and edit-button renaming with IME-safe Enter/Escape handling. */
  onRename?: (nextName: string) => void;
  /** Disables all track controls, height toggle, and inline renaming (defaults to false). */
  disabled?: boolean;
}

interface LaneVisualMeta {
  accentToken: string;
  typeLabel: string;
}

type LaneStatusBadgeId = 'active' | 'muted' | 'solo' | 'armed' | 'locked';

interface LaneStatusBadge {
  id: LaneStatusBadgeId;
  label: string;
  dotToken: string;
  textToken: string;
  pulse: boolean;
}

function getLaneVisualMeta(trackType: TrackLaneType): LaneVisualMeta {
  switch (trackType) {
    case 'video':
      return {
        accentToken: 'var(--prism-primary-main)',
        typeLabel: 'Video',
      };
    case 'audio':
      return {
        accentToken: 'var(--prism-secondary-main)',
        typeLabel: 'Audio',
      };
    case 'effect':
      return {
        accentToken: 'var(--prism-success-main)',
        typeLabel: 'Effect',
      };
    case 'subtitle':
      return {
        accentToken: 'var(--prism-warning-main)',
        typeLabel: 'Subtitle',
      };
  }
}

function renderLaneIcon(trackType: TrackLaneType): ReactNode {
  switch (trackType) {
    case 'video':
      return <Film aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'audio':
      return <Volume2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'effect':
      return <Sparkles aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'subtitle':
      return <Subtitles aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

function buildLaneStatusBadges(state: TrackHeaderState): LaneStatusBadge[] {
  const badges: LaneStatusBadge[] = [];

  if (state.muted) {
    badges.push({
      id: 'muted',
      label: 'MUTED',
      dotToken: 'var(--prism-warning-main)',
      textToken: 'var(--prism-warning-main)',
      pulse: false,
    });
  }
  if (state.solo) {
    badges.push({
      id: 'solo',
      label: 'SOLO',
      dotToken: 'var(--prism-success-main)',
      textToken: 'var(--prism-success-main)',
      pulse: false,
    });
  }
  if (state.armed) {
    badges.push({
      id: 'armed',
      label: 'ARMED',
      dotToken: 'var(--prism-error-main)',
      textToken: 'var(--prism-error-main)',
      pulse: true,
    });
  }
  if (state.locked) {
    badges.push({
      id: 'locked',
      label: 'LOCKED',
      dotToken: 'var(--prism-text-secondary)',
      textToken: 'var(--prism-text-secondary)',
      pulse: false,
    });
  }

  if (badges.length === 0) {
    badges.push({
      id: 'active',
      label: 'ACTIVE',
      dotToken: 'var(--prism-success-main)',
      textToken: 'var(--prism-text-primary)',
      pulse: false,
    });
  }

  return badges;
}

function preventBlurOnMouseDown(event: ReactMouseEvent<HTMLButtonElement>): void {
  event.preventDefault();
}

const accentClass = /*#__PURE__*/ stableClassName('track-header-strip', 'accent');
const headerRowClass = /*#__PURE__*/ stableClassName('track-header-strip', 'header');
const controlsRowClass = /*#__PURE__*/ stableClassName('track-header-strip', 'controls');
const statusWellClass = /*#__PURE__*/ stableClassName('track-header-strip', 'status');

function TrackHeaderStripInner({
  name,
  trackType = 'video',
  muted,
  defaultMuted = false,
  onMutedChange,
  solo,
  defaultSolo = false,
  onSoloChange,
  armed,
  defaultArmed = false,
  onArmedChange,
  locked,
  defaultLocked = false,
  onLockedChange,
  heightMode,
  defaultHeightMode = 'compact',
  onHeightModeChange,
  onRename,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TrackHeaderStripProps) {
  const override = useComponentOverride('TrackHeaderStrip');
  const statusRegionId = useId();

  const [isMuted, setIsMuted] = useControllableState<boolean>({
    value: muted,
    defaultValue: defaultMuted,
    onChange: onMutedChange,
  });

  const [isSolo, setIsSolo] = useControllableState<boolean>({
    value: solo,
    defaultValue: defaultSolo,
    onChange: onSoloChange,
  });

  const [isArmed, setIsArmed] = useControllableState<boolean>({
    value: armed,
    defaultValue: defaultArmed,
    onChange: onArmedChange,
  });

  const [isLocked, setIsLocked] = useControllableState<boolean>({
    value: locked,
    defaultValue: defaultLocked,
    onChange: onLockedChange,
  });

  const [currentHeight, setCurrentHeight] = useControllableState<TrackHeaderHeight>({
    value: heightMode,
    defaultValue: defaultHeightMode,
    onChange: onHeightModeChange,
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [draftName, setDraftName] = useState<string>(name);

  const renameInputRef = useRef<HTMLInputElement | null>(null);
  const renameTriggerRef = useRef<HTMLButtonElement | null>(null);
  const editGroupRef = useRef<HTMLDivElement | null>(null);
  const shouldRestoreFocusRef = useRef<boolean>(false);

  const headerState: TrackHeaderState = {
    muted: isMuted,
    solo: isSolo,
    armed: isArmed,
    locked: isLocked,
    height: currentHeight,
  };

  const trimmedPropName = name.trim();
  const accessibleName = trimmedPropName.length > 0 ? trimmedPropName : 'Untitled track';
  const displayName = trimmedPropName.length > 0 ? name : 'Untitled track';

  const isExpanded = headerState.height === 'expanded';
  const canStartRename = Boolean(onRename) && !disabled;
  const editingActive = isEditing && canStartRename;
  const armDisabled = disabled || headerState.locked;

  const laneMeta = getLaneVisualMeta(trackType);
  const statusBadges = isExpanded ? buildLaneStatusBadges(headerState) : [];

  useEffect(() => {
    if (disabled) {
      setIsEditing(false);
    }
  }, [disabled]);

  useEffect(() => {
    if (editingActive) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
      return;
    }

    if (shouldRestoreFocusRef.current) {
      shouldRestoreFocusRef.current = false;
      renameTriggerRef.current?.focus();
    }
  }, [editingActive]);

  const startRename = () => {
    setDraftName(name);
    setIsEditing(true);
  };

  const commitRename = (restoreFocus: boolean) => {
    const trimmed = draftName.trim();
    shouldRestoreFocusRef.current = restoreFocus;
    setIsEditing(false);
    if (trimmed.length > 0 && trimmed !== name) {
      onRename?.(trimmed);
    }
  };

  const cancelRename = (restoreFocus: boolean) => {
    setDraftName(name);
    shouldRestoreFocusRef.current = restoreFocus;
    setIsEditing(false);
  };

  const handleRenameBlur = (event: FocusEvent<HTMLInputElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && editGroupRef.current?.contains(nextTarget)) {
      return;
    }
    commitRename(false);
  };

  const handleToggleHeight = () => {
    setCurrentHeight(isExpanded ? 'compact' : 'expanded');
  };

  const handleToggleMuted = () => {
    setIsMuted(!headerState.muted);
  };

  const handleToggleSolo = () => {
    setIsSolo(!headerState.solo);
  };

  const handleToggleArmed = () => {
    setIsArmed(!headerState.armed);
  };

  const handleToggleLocked = () => {
    setIsLocked(!headerState.locked);
  };

  const merged = mergeProps({
    themeTarget: themeProps('track-header-strip', {
      trackType,
      height: headerState.height,
      muted: headerState.muted,
      solo: headerState.solo,
      armed: headerState.armed,
      locked: headerState.locked,
      editing: editingActive,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab relative overflow-hidden w-full max-w-full flex flex-col pl-4 pr-3 transition-[color,background-color,border-color,opacity,transform]',
      isExpanded ? 'py-3 gap-2.5' : 'py-2.5 gap-2',
      disabled ? 'opacity-60' : ''
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
      role="group"
      aria-label={`${accessibleName} track header`}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      <span
        aria-hidden="true"
        data-testid="track-header-accent"
        data-track-type={trackType}
        className={cx(accentClass, 'absolute inset-y-0 left-0 w-1.5 pointer-events-none')}
        style={{ backgroundColor: laneMeta.accentToken }}
      />

      <div className={cx(headerRowClass, 'flex items-center justify-between gap-2 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span
            aria-hidden="true"
            data-testid="track-type-icon"
            data-track-type={trackType}
            className="prism-well w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
            style={{ color: laneMeta.accentToken }}
          >
            {renderLaneIcon(trackType)}
          </span>

          {editingActive ? (
            <div
              ref={editGroupRef}
              data-testid="track-rename-group"
              className="flex items-center gap-1 min-w-0 flex-1"
            >
              <input
                ref={renameInputRef}
                type="text"
                value={draftName}
                disabled={disabled}
                aria-label={`Rename ${accessibleName}`}
                data-testid="track-rename-input"
                onChange={(e) => setDraftName(e.target.value)}
                onBlur={handleRenameBlur}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) {
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRename(true);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRename(true);
                  }
                }}
                className="prism-well prism-focus-ring h-7 w-full min-w-0 flex-1 rounded-lg px-2 text-xs font-semibold focus:outline-none disabled:cursor-not-allowed"
                style={STYLE_TEXT_PRIMARY}
              />
              <button
                type="button"
                disabled={disabled}
                aria-label="Save track name"
                data-testid="track-rename-confirm"
                onMouseDown={preventBlurOnMouseDown}
                onClick={() => commitRename(true)}
                className="prism-emerald prism-focus-ring w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
              >
                <Check aria-hidden="true" className="w-3 h-3 shrink-0" />
              </button>
              <button
                type="button"
                disabled={disabled}
                aria-label="Cancel track rename"
                data-testid="track-rename-cancel"
                onMouseDown={preventBlurOnMouseDown}
                onClick={() => cancelRename(true)}
                className="prism-crystal prism-focus-ring w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3 h-3 shrink-0" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0 flex-1">
              <span
                data-testid="track-header-name"
                onDoubleClick={canStartRename ? startRename : undefined}
                className={cx(
                  'text-sm font-semibold tracking-tight truncate min-w-0',
                  canStartRename ? 'cursor-text' : ''
                )}
                style={{
                  color: headerState.muted
                    ? 'var(--prism-text-secondary)'
                    : 'var(--prism-text-primary)',
                }}
              >
                {displayName}
              </span>
              {onRename ? (
                <button
                  ref={renameTriggerRef}
                  type="button"
                  disabled={disabled}
                  aria-label={`Rename ${accessibleName}`}
                  data-testid="track-rename-trigger"
                  onClick={startRename}
                  className="prism-crystal prism-focus-ring w-6 h-6 rounded-md inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
                  style={STYLE_TEXT_SECONDARY}
                >
                  <Pencil aria-hidden="true" className="w-3 h-3 shrink-0" />
                </button>
              ) : null}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={disabled}
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? statusRegionId : undefined}
          aria-label={isExpanded ? `Collapse ${accessibleName}` : `Expand ${accessibleName}`}
          data-testid="track-height-toggle"
          onClick={handleToggleHeight}
          className="prism-crystal prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={STYLE_TEXT_SECONDARY}
        >
          {isExpanded ? (
            <ChevronUp aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <ChevronDown aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </div>

      <div
        role="group"
        aria-label={`${accessibleName} track controls`}
        className={cx(controlsRowClass, 'flex flex-wrap items-center gap-1.5 min-w-0')}
      >
        <button
          type="button"
          disabled={disabled}
          aria-label={`Mute ${accessibleName}`}
          aria-pressed={headerState.muted}
          data-testid="track-mute-button"
          data-active={headerState.muted ? 'true' : undefined}
          onClick={handleToggleMuted}
          className={cx(
            'prism-focus-ring h-7 min-w-7 px-2 rounded-full font-mono text-xs font-bold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            headerState.muted ? '' : 'prism-crystal'
          )}
          style={
            headerState.muted
              ? {
                  backgroundColor: 'var(--prism-warning-main)',
                  color: 'var(--prism-warning-contrast)',
                  boxShadow: '0 0 0 1px var(--prism-warning-main)',
                }
              : STYLE_TEXT_SECONDARY
          }
        >
          M
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label={`Solo ${accessibleName}`}
          aria-pressed={headerState.solo}
          data-testid="track-solo-button"
          data-active={headerState.solo ? 'true' : undefined}
          onClick={handleToggleSolo}
          className={cx(
            'prism-focus-ring h-7 min-w-7 px-2 rounded-full font-mono text-xs font-bold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            headerState.solo ? 'prism-emerald' : 'prism-crystal'
          )}
          style={headerState.solo ? undefined : STYLE_TEXT_SECONDARY}
        >
          S
        </button>

        <button
          type="button"
          disabled={armDisabled}
          aria-label={`Record arm ${accessibleName}`}
          aria-pressed={headerState.armed}
          data-testid="track-arm-button"
          data-active={headerState.armed ? 'true' : undefined}
          data-blocked={headerState.locked ? 'true' : undefined}
          onClick={handleToggleArmed}
          className={cx(
            'prism-focus-ring h-7 min-w-7 px-2 rounded-full font-mono text-xs font-bold inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]',
            headerState.armed ? '' : 'prism-crystal'
          )}
          style={
            headerState.armed
              ? {
                  backgroundColor: 'var(--prism-error-main)',
                  color: 'var(--prism-error-contrast)',
                  boxShadow: '0 0 0 1px var(--prism-error-main)',
                }
              : {
                  color: headerState.locked
                    ? 'var(--prism-text-disabled)'
                    : 'var(--prism-text-secondary)',
                }
          }
        >
          R
        </button>

        <button
          type="button"
          disabled={disabled}
          aria-label={`Lock ${accessibleName}`}
          aria-pressed={headerState.locked}
          data-testid="track-lock-button"
          data-active={headerState.locked ? 'true' : undefined}
          onClick={handleToggleLocked}
          className="prism-crystal prism-focus-ring h-7 min-w-7 px-2 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
          style={
            headerState.locked
              ? {
                  color: 'var(--prism-primary-main)',
                  boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                }
              : STYLE_TEXT_SECONDARY
          }
        >
          {headerState.locked ? (
            <Lock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Unlock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </div>

      {isExpanded ? (
        <div
          id={statusRegionId}
          role="status"
          aria-live="polite"
          data-testid="track-status-well"
          className={cx(
            statusWellClass,
            'prism-well rounded-xl px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-1.5 min-w-0'
          )}
        >
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            {statusBadges.map((badge) => (
              <span
                key={badge.id}
                data-testid={`track-status-badge-${badge.id}`}
                className="prism-crystal inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase whitespace-nowrap shrink-0"
                style={{ color: badge.textToken }}
              >
                <span
                  aria-hidden="true"
                  className={cx(
                    'w-1.5 h-1.5 rounded-full shrink-0',
                    badge.pulse ? 'animate-pulse motion-reduce:animate-none' : ''
                  )}
                  style={{ backgroundColor: badge.dotToken }}
                />
                {badge.label}
              </span>
            ))}
          </div>

          <span
            data-testid="track-type-label"
            className="font-mono text-[10px] font-medium uppercase tracking-wider whitespace-nowrap shrink-0"
            style={STYLE_TEXT_SECONDARY}
          >
            {laneMeta.typeLabel}
          </span>
        </div>
      ) : null}
    </div>
  );
}

export const TrackHeaderStrip = /*#__PURE__*/ memoWithDisplayName(TrackHeaderStripInner, 'TrackHeaderStrip');
