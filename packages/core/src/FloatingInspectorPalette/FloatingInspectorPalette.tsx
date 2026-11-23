'use client';

import {
  useCallback,
  useId,
  useMemo,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  ChevronDown,
  ChevronUp,
  EyeOff,
  Monitor,
  Pin,
  RotateCcw,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_ERROR_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export interface FloatingPaletteSection {
  /** Unique identifier emitted to onToggleSection when toggled. */
  id: string;
  /** Display label of the inspector tool section. */
  label: string;
  /** Compact telemetry value displayed alongside the section label. */
  valueLabel: string;
  /** Initial active state of the tool section (defaults to false). */
  active?: boolean;
}

type FloatingInspectorPaletteBaseProps = Omit<
  BaseProps<HTMLDivElement>,
  'onChange'
>;

export interface FloatingInspectorPaletteProps
  extends FloatingInspectorPaletteBaseProps {
  /** Title displayed in the slim optical titlebar (defaults to 'Tool & Brush Inspector'). */
  title?: string;
  /** Name of the parent workspace visually tethered to this palette (defaults to 'Refractor Canvas'). */
  parentWorkspaceName?: string;
  /** Controlled focus state of the tethered parent workspace. */
  parentFocused?: boolean;
  /** Uncontrolled initial focus state of the tethered parent workspace (defaults to true). */
  defaultParentFocused?: boolean;
  /** Controlled auto-hide-on-blur behavior when the parent workspace loses focus. */
  autoHideOnBlur?: boolean;
  /** Uncontrolled initial auto-hide-on-blur behavior (defaults to true). */
  defaultAutoHideOnBlur?: boolean;
  /** Selectable tool sections rendered inside the compact palette body. */
  sections?: ReadonlyArray<FloatingPaletteSection>;
  /** Callback invoked when the parent workspace focus state changes. */
  onParentFocusChange?: (focused: boolean) => void;
  /** Callback invoked when a tool section is toggled. */
  onToggleSection?: (sectionId: string, active: boolean) => void;
  /** Optional close handler; when omitted, closing hides the palette locally with a Reopen Palette chip. */
  onClose?: () => void;
  /** Renders the compact Parent Focused / Parent Blurred workspace focus bar (defaults to true). */
  showParentFocusSimulator?: boolean;
  /** Disables all interactive simulator, titlebar, section, and brush slider controls (defaults to false). */
  disabled?: boolean;
}

interface NormalizedPaletteSection {
  reactKey: string;
  sectionId: string;
  label: string;
  valueLabel: string;
  initialActive: boolean;
}

const DEFAULT_TITLE = 'Tool & Brush Inspector';
const DEFAULT_PARENT_WORKSPACE = 'Refractor Canvas';
const MIN_BRUSH_SIZE_PX = 1;
const MAX_BRUSH_SIZE_PX = 64;
const DEFAULT_BRUSH_SIZE_PX = 24;
const BRUSH_KEY_STEP_PX = 4;
const FOCUSED_OPACITY_PCT = 92;
const PINNED_UNFOCUSED_OPACITY_PCT = 76;

const DEFAULT_SECTIONS: ReadonlyArray<FloatingPaletteSection> = [
  {
    id: 'stroke-bevel',
    label: 'Stroke & Bevel',
    valueLabel: '2.5px',
    active: true,
  },
  {
    id: 'specular-caustic',
    label: 'Specular Caustic',
    valueLabel: '84%',
    active: true,
  },
  {
    id: 'pixel-grid-snap',
    label: 'Pixel Grid Snap',
    valueLabel: '8px',
    active: false,
  },
  {
    id: 'color-guides',
    label: 'Color Guides',
    valueLabel: 'P3',
    active: false,
  },
];

function normalizeSections(
  source: ReadonlyArray<FloatingPaletteSection>
): ReadonlyArray<NormalizedPaletteSection> {
  const seenKeys = new Map<string, number>();

  return source.map((item, idx) => {
    const trimmedId = item.id.trim();
    const trimmedLabel = item.label.trim();
    const trimmedValue = item.valueLabel.trim();
    const sectionId = trimmedId || trimmedLabel || `section-${idx + 1}`;
    const seen = seenKeys.get(sectionId) ?? 0;
    seenKeys.set(sectionId, seen + 1);
    const reactKey = seen === 0 ? sectionId : `${sectionId}#${seen + 1}`;

    return {
      reactKey,
      sectionId,
      label: trimmedLabel || sectionId,
      valueLabel: trimmedValue || '—',
      initialActive: Boolean(item.active),
    };
  });
}

const simulatorClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'simulator');
const paletteClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'palette');
const headerClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'header');
const bodyClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'body');
const sectionsClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'sections');
const brushClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'brush');
const hiddenPillClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'hidden-pill');
const closedBarClass = /*#__PURE__*/ stableClassName('floating-inspector-palette', 'closed-bar');

function FloatingInspectorPaletteInner({
  title = DEFAULT_TITLE,
  parentWorkspaceName = DEFAULT_PARENT_WORKSPACE,
  parentFocused,
  defaultParentFocused = true,
  autoHideOnBlur,
  defaultAutoHideOnBlur = true,
  sections,
  onParentFocusChange,
  onToggleSection,
  onClose,
  showParentFocusSimulator = true,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: FloatingInspectorPaletteProps) {
  const uid = useId();
  const paletteTitleId = `${uid}-title`;
  const bodyId = `${uid}-body`;
  const brushSizeId = `${uid}-brush-size`;
  const override = useComponentOverride('FloatingInspectorPalette');

  const [isParentFocused, setParentFocused] = useControllableState<boolean>({
    value: parentFocused,
    defaultValue: defaultParentFocused,
    onChange: onParentFocusChange,
  });

  const [isAutoHideEnabled, setAutoHideEnabled] = useControllableState<boolean>(
    {
      value: autoHideOnBlur,
      defaultValue: defaultAutoHideOnBlur,
    }
  );

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const [brushSizePx, setBrushSizePx] = useState(DEFAULT_BRUSH_SIZE_PX);
  const [sectionOverrides, setSectionOverrides] = useState<
    ReadonlyMap<string, boolean>
  >(() => new Map());
  const [announcement, setAnnouncement] = useState('');

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const resolvedWorkspaceName =
    parentWorkspaceName.trim() || DEFAULT_PARENT_WORKSPACE;

  const normalizedSections = useMemo(
    () => normalizeSections(sections ?? DEFAULT_SECTIONS),
    [sections]
  );

  const isAutoHidden = !isClosed && isAutoHideEnabled && !isParentFocused;
  const isPaletteVisible = !isClosed && !isAutoHidden;
  const isUnfocusedPinned = !isParentFocused && !isAutoHideEnabled;
  const paletteState = isClosed
    ? 'closed'
    : isAutoHidden
      ? 'auto-hidden'
      : 'visible';

  const tetherDotColor = isParentFocused
    ? 'var(--prism-success-main)'
    : 'var(--prism-warning-main)';
  const opacityPct = isParentFocused
    ? FOCUSED_OPACITY_PCT
    : PINNED_UNFOCUSED_OPACITY_PCT;
  const brushFillPct = Math.round(
    ((brushSizePx - MIN_BRUSH_SIZE_PX) /
      (MAX_BRUSH_SIZE_PX - MIN_BRUSH_SIZE_PX)) *
      100
  );

  const autoHiddenMessage = `Palette auto-hidden while "${resolvedWorkspaceName}" is unfocused — Focus workspace or disable Auto-Hide to restore`;

  const handleParentFocusSelect = useCallback(
    (nextFocused: boolean) => {
      if (nextFocused === isParentFocused) {
        return;
      }
      setParentFocused(nextFocused);
      setAnnouncement(
        nextFocused
          ? `${resolvedWorkspaceName} focused; ${resolvedTitle} active`
          : isAutoHideEnabled
            ? `Palette auto-hidden while "${resolvedWorkspaceName}" is unfocused`
            : `${resolvedWorkspaceName} unfocused; ${resolvedTitle} pinned visible`
      );
    },
    [
      isAutoHideEnabled,
      isParentFocused,
      resolvedTitle,
      resolvedWorkspaceName,
      setParentFocused,
    ]
  );

  const handleToggleAutoHide = useCallback(() => {
    const nextAutoHide = !isAutoHideEnabled;
    setAutoHideEnabled(nextAutoHide);
    setAnnouncement(
      nextAutoHide
        ? !isParentFocused
          ? `Auto-Hide enabled; palette auto-hidden while "${resolvedWorkspaceName}" is unfocused`
          : 'Auto-Hide on parent blur enabled'
        : 'Auto-Hide disabled; palette pinned persistent'
    );
  }, [
    isAutoHideEnabled,
    isParentFocused,
    resolvedWorkspaceName,
    setAutoHideEnabled,
  ]);

  const handleToggleCollapse = useCallback(() => {
    const nextCollapsed = !isCollapsed;
    setIsCollapsed(nextCollapsed);
    setAnnouncement(
      nextCollapsed ? `${resolvedTitle} collapsed` : `${resolvedTitle} expanded`
    );
  }, [isCollapsed, resolvedTitle]);

  const handleClose = useCallback(() => {
    if (onClose) {
      setAnnouncement(`${resolvedTitle} close requested`);
      onClose();
      return;
    }
    setIsClosed(true);
    setAnnouncement(`${resolvedTitle} closed`);
  }, [onClose, resolvedTitle]);

  const handleReopen = useCallback(() => {
    setIsClosed(false);
    setAnnouncement(`${resolvedTitle} reopened`);
  }, [resolvedTitle]);

  const handleToggleSection = useCallback(
    (section: NormalizedPaletteSection, currentActive: boolean) => {
      const nextActive = !currentActive;
      setSectionOverrides((prev) => {
        const next = new Map(prev);
        next.set(section.reactKey, nextActive);
        return next;
      });
      setAnnouncement(
        `${section.label} ${nextActive ? 'enabled' : 'disabled'}`
      );
      onToggleSection?.(section.sectionId, nextActive);
    },
    [onToggleSection]
  );

  const handleBrushSizeChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      const nextSize = Math.round(
        clampNumber(
          Number(event.target.value),
          MIN_BRUSH_SIZE_PX,
          MAX_BRUSH_SIZE_PX,
          DEFAULT_BRUSH_SIZE_PX
        )
      );
      setBrushSizePx(nextSize);
    },
    [disabled]
  );

  const handleBrushSliderKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (
        disabled ||
        event.nativeEvent.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      ) {
        return;
      }
      if (event.key === '[') {
        event.preventDefault();
        setBrushSizePx((prev) =>
          Math.round(
            clampNumber(
              prev - BRUSH_KEY_STEP_PX,
              MIN_BRUSH_SIZE_PX,
              MAX_BRUSH_SIZE_PX,
              prev
            )
          )
        );
      } else if (event.key === ']') {
        event.preventDefault();
        setBrushSizePx((prev) =>
          Math.round(
            clampNumber(
              prev + BRUSH_KEY_STEP_PX,
              MIN_BRUSH_SIZE_PX,
              MAX_BRUSH_SIZE_PX,
              prev
            )
          )
        );
      }
    },
    [disabled]
  );

  const handleControlKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, action: () => void) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
      }
    },
    [disabled]
  );

  const merged = mergeProps({
    themeTarget: themeProps('floating-inspector-palette', {
      parentFocused: isParentFocused,
      autoHideOnBlur: isAutoHideEnabled,
      paletteState,
      collapsed: isCollapsed,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab relative w-full max-w-full min-w-0 p-3.5 sm:p-4 space-y-3 select-none transition-opacity duration-200',
      disabled ? 'opacity-70' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const paletteSurfaceStyle: OpticalStyleTokens | undefined = isUnfocusedPinned
    ? {
        '--prism-specular-opacity': 0.55,
        '--prism-caustic-opacity': 0.65,
      }
    : undefined;

  return (
    <div
      ref={ref}
      role="region"
      aria-label={`${resolvedTitle} workspace`}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {showParentFocusSimulator ? (
        <div
          data-testid="palette-focus-simulator"
          className={cx(
            simulatorClass,
            'prism-well rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
          )}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Monitor
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{
                color: isParentFocused
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-disabled)',
              }}
            />
            <span
              data-testid="palette-workspace-name"
              className="text-xs font-medium truncate min-w-0"
              style={STYLE_TEXT_PRIMARY}
            >
              {resolvedWorkspaceName}
            </span>
            <span
              data-testid="palette-workspace-focus-badge"
              className="font-mono text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0"
              style={{
                color: isParentFocused
                  ? 'var(--prism-success-main)'
                  : 'var(--prism-warning-main)',
                backgroundColor: isParentFocused
                  ? 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)'
                  : 'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)',
              }}
            >
              {isParentFocused ? 'Focused' : 'Blurred'}
            </span>
          </div>

          <div
            role="group"
            aria-label="Parent workspace focus simulator"
            className="flex flex-wrap items-center gap-1 shrink-0"
          >
            <button
              type="button"
              disabled={disabled}
              aria-pressed={isParentFocused}
              data-testid="palette-sim-focused"
              onClick={() => handleParentFocusSelect(true)}
              onKeyDown={(event) =>
                handleControlKeyDown(event, () => handleParentFocusSelect(true))
              }
              className={cx(
                isParentFocused ? 'prism-btn-primary' : 'prism-crystal',
                'prism-focus-ring px-2.5 py-1 rounded-full text-[11px] font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed'
              )}
              style={
                isParentFocused
                  ? undefined
                  : STYLE_TEXT_SECONDARY
              }
            >
              Parent Focused
            </button>

            <button
              type="button"
              disabled={disabled}
              aria-pressed={!isParentFocused}
              data-testid="palette-sim-blurred"
              onClick={() => handleParentFocusSelect(false)}
              onKeyDown={(event) =>
                handleControlKeyDown(event, () =>
                  handleParentFocusSelect(false)
                )
              }
              className={cx(
                !isParentFocused ? 'prism-btn-primary' : 'prism-crystal',
                'prism-focus-ring px-2.5 py-1 rounded-full text-[11px] font-semibold transition-opacity cursor-pointer disabled:cursor-not-allowed'
              )}
              style={
                !isParentFocused
                  ? undefined
                  : STYLE_TEXT_SECONDARY
              }
            >
              Parent Blurred
            </button>
          </div>
        </div>
      ) : null}

      {isClosed ? (
        <div
          data-testid="palette-closed-bar"
          className={cx(
            closedBarClass,
            'prism-well rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
          )}
        >
          <span
            className="text-xs font-medium min-w-0 truncate"
            style={STYLE_TEXT_SECONDARY}
          >
            {resolvedTitle} closed
          </span>
          <button
            type="button"
            disabled={disabled}
            data-testid="palette-reopen-btn"
            onClick={handleReopen}
            onKeyDown={(event) => handleControlKeyDown(event, handleReopen)}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer disabled:cursor-not-allowed shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Reopen Palette</span>
          </button>
        </div>
      ) : null}

      {isAutoHidden ? (
        <div
          data-testid="palette-auto-hidden-pill"
          className={cx(
            hiddenPillClass,
            'prism-crystal rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full border'
          )}
          style={{
            borderColor:
              'color-mix(in srgb, var(--prism-warning-main) 30%, var(--prism-divider))',
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              aria-hidden="true"
              className="w-2 h-2 rounded-full shrink-0"
              style={{
                backgroundColor: 'var(--prism-warning-main)',
                boxShadow:
                  '0 0 0 3px color-mix(in srgb, var(--prism-warning-main) 22%, transparent)',
              }}
            />
            <p
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="text-xs font-medium min-w-0 break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {autoHiddenMessage}
            </p>
          </div>

          <button
            type="button"
            disabled={disabled}
            data-testid="palette-disable-autohide-btn"
            onClick={handleToggleAutoHide}
            onKeyDown={(event) =>
              handleControlKeyDown(event, handleToggleAutoHide)
            }
            className="prism-well prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold cursor-pointer disabled:cursor-not-allowed shrink-0"
            style={STYLE_TEXT_PRIMARY}
          >
            <Pin aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Disable Auto-Hide</span>
          </button>
        </div>
      ) : null}

      {isPaletteVisible ? (
        <aside
          role="complementary"
          aria-labelledby={paletteTitleId}
          data-testid="floating-inspector-surface"
          data-tether-state={isParentFocused ? 'linked' : 'unfocused-pinned'}
          className={cx(
            paletteClass,
            'prism-crystal relative rounded-2xl overflow-hidden w-full max-w-full sm:max-w-md min-w-0 border transition-[color,background-color,border-color,opacity,transform] duration-200'
          )}
          style={{
            ...paletteSurfaceStyle,
            borderColor: isParentFocused
              ? 'var(--prism-divider)'
              : 'color-mix(in srgb, var(--prism-warning-main) 36%, var(--prism-divider))',
          }}
        >
          {/* Slim Optical Titlebar */}
          <header
            data-part="header"
            className={cx(
              headerClass,
              'px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full',
              !isCollapsed ? 'border-b' : ''
            )}
            style={STYLE_BORDER_DIVIDER}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span
                aria-hidden="true"
                data-testid="palette-tether-dot"
                data-tether-state={
                  isParentFocused ? 'linked' : 'unfocused-pinned'
                }
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
                style={{
                  backgroundColor: tetherDotColor,
                  boxShadow: `0 0 0 3px color-mix(in srgb, ${tetherDotColor} 24%, transparent)`,
                }}
              />
              <SlidersHorizontal
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0"
                style={STYLE_TEXT_SECONDARY}
              />
              <h3
                id={paletteTitleId}
                className="text-xs font-semibold tracking-[-0.01em] truncate min-w-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {resolvedTitle}
              </h3>
              <span
                data-testid="palette-tether-badge"
                className="font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0"
                style={{ color: tetherDotColor }}
              >
                {isParentFocused ? 'Linked' : 'Pinned'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1 shrink-0">
              <button
                type="button"
                disabled={disabled}
                aria-pressed={isAutoHideEnabled}
                data-testid="palette-autohide-toggle"
                title={
                  isAutoHideEnabled
                    ? 'Auto-hide when parent workspace loses focus'
                    : 'Pinned persistent when parent workspace loses focus'
                }
                onClick={handleToggleAutoHide}
                onKeyDown={(event) =>
                  handleControlKeyDown(event, handleToggleAutoHide)
                }
                className="prism-focus-ring inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer disabled:cursor-not-allowed transition-opacity"
                style={{
                  color: isAutoHideEnabled
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-warning-main)',
                  borderColor: isAutoHideEnabled
                    ? 'color-mix(in srgb, var(--prism-primary-main) 34%, var(--prism-divider))'
                    : 'color-mix(in srgb, var(--prism-warning-main) 36%, var(--prism-divider))',
                  backgroundColor: isAutoHideEnabled
                    ? 'color-mix(in srgb, var(--prism-primary-main) 12%, transparent)'
                    : 'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)',
                }}
              >
                {isAutoHideEnabled ? (
                  <EyeOff aria-hidden="true" className="w-3 h-3 shrink-0" />
                ) : (
                  <Pin aria-hidden="true" className="w-3 h-3 shrink-0" />
                )}
                <span>Auto-Hide</span>
              </button>

              <button
                type="button"
                disabled={disabled}
                aria-expanded={!isCollapsed}
                aria-controls={bodyId}
                aria-label={isCollapsed ? 'Expand palette' : 'Collapse palette'}
                data-testid="palette-collapse-toggle"
                onClick={handleToggleCollapse}
                onKeyDown={(event) =>
                  handleControlKeyDown(event, handleToggleCollapse)
                }
                className="prism-well prism-focus-ring w-6 h-6 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0"
                style={STYLE_TEXT_PRIMARY}
              >
                {isCollapsed ? (
                  <ChevronDown aria-hidden="true" className="w-3.5 h-3.5" />
                ) : (
                  <ChevronUp aria-hidden="true" className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                disabled={disabled}
                aria-label="Close palette"
                data-testid="palette-close-btn"
                onClick={handleClose}
                onKeyDown={(event) => handleControlKeyDown(event, handleClose)}
                className="prism-well prism-focus-ring w-6 h-6 rounded-lg inline-flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shrink-0"
                style={STYLE_ERROR_MAIN}
              >
                <X aria-hidden="true" className="w-3.5 h-3.5" />
              </button>
            </div>
          </header>

          {/* Compact Tool Controls Body */}
          {!isCollapsed ? (
            <div
              id={bodyId}
              data-part="body"
              data-testid="palette-body"
              className={cx(bodyClass, 'p-3 space-y-3 min-w-0 max-w-full')}
            >
              {/* Selectable Tool Sections */}
              <div
                role="group"
                aria-label="Inspector tool sections"
                className={cx(
                  sectionsClass,
                  'grid grid-cols-1 sm:grid-cols-2 gap-1.5 min-w-0 max-w-full'
                )}
              >
                {normalizedSections.length > 0 ? (
                  normalizedSections.map((section) => {
                    const isActive = sectionOverrides.has(section.reactKey)
                      ? Boolean(sectionOverrides.get(section.reactKey))
                      : section.initialActive;

                    return (
                      <button
                        key={section.reactKey}
                        type="button"
                        disabled={disabled}
                        aria-pressed={isActive}
                        data-testid={`palette-section-${section.sectionId}`}
                        data-section-id={section.sectionId}
                        data-active={isActive ? 'true' : undefined}
                        onClick={() => handleToggleSection(section, isActive)}
                        onKeyDown={(event) =>
                          handleControlKeyDown(event, () =>
                            handleToggleSection(section, isActive)
                          )
                        }
                        className="prism-focus-ring rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 min-w-0 max-w-full text-left border cursor-pointer disabled:cursor-not-allowed transition-colors"
                        style={{
                          borderColor: isActive
                            ? 'color-mix(in srgb, var(--prism-primary-main) 42%, var(--prism-divider))'
                            : 'var(--prism-divider)',
                          backgroundColor: isActive
                            ? 'color-mix(in srgb, var(--prism-primary-main) 13%, transparent)'
                            : 'color-mix(in srgb, var(--prism-well-start) 72%, transparent)',
                        }}
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span
                            aria-hidden="true"
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{
                              backgroundColor: isActive
                                ? 'var(--prism-primary-main)'
                                : 'var(--prism-text-disabled)',
                            }}
                          />
                          <span
                            className="text-xs font-medium truncate min-w-0"
                            style={{
                              color: isActive
                                ? 'var(--prism-text-primary)'
                                : 'var(--prism-text-secondary)',
                            }}
                          >
                            {section.label}
                          </span>
                        </span>

                        <span
                          className="font-mono text-[11px] font-semibold tabular-nums shrink-0"
                          style={{
                            color: isActive
                              ? 'var(--prism-primary-main)'
                              : 'var(--prism-text-secondary)',
                          }}
                        >
                          {section.valueLabel}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p
                    data-testid="palette-sections-empty"
                    className="sm:col-span-2 text-xs py-1.5 px-2 rounded-xl prism-well"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    No inspector tools configured.
                  </p>
                )}
              </div>

              {/* Brush Size Slider (1..64px) & Opacity Readout */}
              <div
                className={cx(
                  brushClass,
                  'prism-well rounded-xl px-3 py-2.5 space-y-2 min-w-0 max-w-full'
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                  <label
                    htmlFor={brushSizeId}
                    className="text-xs font-semibold tracking-tight"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Brush Size
                  </label>

                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <span
                      data-testid="palette-brush-size-readout"
                      className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums"
                      style={STYLE_TEXT_PRIMARY}
                    >
                      {brushSizePx}px
                    </span>
                    <span
                      data-testid="palette-opacity-readout"
                      className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      Opacity {opacityPct}%
                    </span>
                  </div>
                </div>

                <div className="relative h-6 flex items-center min-w-0">
                  <div className="prism-crystal w-full h-2 rounded-full overflow-hidden p-0.5">
                    <div
                      data-testid="palette-brush-size-fill"
                      className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform] duration-75"
                      style={{
                        width: `${brushFillPct}%`,
                        backgroundColor: 'var(--prism-primary-main)',
                      }}
                    />
                  </div>
                  <input
                    id={brushSizeId}
                    type="range"
                    min={MIN_BRUSH_SIZE_PX}
                    max={MAX_BRUSH_SIZE_PX}
                    step={1}
                    value={brushSizePx}
                    disabled={disabled}
                    aria-label="Brush Size"
                    aria-valuetext={`${brushSizePx} pixels`}
                    onChange={handleBrushSizeChange}
                    onKeyDown={handleBrushSliderKeyDown}
                    className="peer absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <div
                    aria-hidden="true"
                    className="prism-thumb w-4 h-4 rounded-full pointer-events-none absolute -ml-2 transition-transform duration-75 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--prism-focus-ring)]"
                    style={{ left: `${brushFillPct}%` }}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      ) : null}

      {!isAutoHidden ? (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>
      ) : null}
    </div>
  );
}

export const FloatingInspectorPalette = /*#__PURE__*/ memoWithDisplayName(FloatingInspectorPaletteInner, 'FloatingInspectorPalette');
