'use client';

import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { LayoutGrid, Maximize2 } from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type WindowLayoutTemplateId =
  | 'split-50-50'
  | 'main-stack-70-30'
  | 'three-columns'
  | 'quad-grid';

export interface WindowLayoutSlotSelection {
  templateId: WindowLayoutTemplateId;
  templateLabel: string;
  slotId: string;
  slotLabel: string;
}

type WindowLayoutPopoverBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface WindowLayoutPopoverProps extends WindowLayoutPopoverBaseProps {
  /** Title displayed in the optical window header bar (defaults to `'Refractor Studio — Main Canvas'`). */
  windowTitle?: string;
  /** Controlled open state of the layout presets popover. */
  open?: boolean;
  /** Initial uncontrolled open state of the layout presets popover (defaults to `false`). */
  defaultOpen?: boolean;
  /** Controlled active layout slot selection (`null` clears active selection badge). */
  selectedSelection?: WindowLayoutSlotSelection | null;
  /** Callback invoked when the layout popover opens or closes. */
  onOpenChange?: (open: boolean) => void;
  /** Callback invoked when a tiling layout slot pane is selected. */
  onSelectLayout?: (selection: WindowLayoutSlotSelection) => void;
  /** Disables the maximize layout preset trigger and suppresses popover opening (defaults to `false`). */
  disabled?: boolean;
}

interface LayoutSlotConfig {
  slotId: string;
  slotLabel: string;
  gridColumn: string;
  gridRow: string;
}

interface LayoutTemplateConfig {
  id: WindowLayoutTemplateId;
  label: string;
  gridTemplateColumns: string;
  gridTemplateRows: string;
  slots: ReadonlyArray<LayoutSlotConfig>;
}

const DEFAULT_WINDOW_TITLE = 'Refractor Studio — Main Canvas';
const HOVER_CLOSE_DELAY_MS = 160;

const WINDOW_LAYOUT_TEMPLATES: ReadonlyArray<LayoutTemplateConfig> = [
  {
    id: 'split-50-50',
    label: '50 / 50 Split',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr',
    slots: [
      {
        slotId: 'left-half',
        slotLabel: 'Left Half',
        gridColumn: '1 / 2',
        gridRow: '1 / 2',
      },
      {
        slotId: 'right-half',
        slotLabel: 'Right Half',
        gridColumn: '2 / 3',
        gridRow: '1 / 2',
      },
    ],
  },
  {
    id: 'main-stack-70-30',
    label: '70 / 30 Main & Stack',
    gridTemplateColumns: '7fr 3fr',
    gridTemplateRows: '1fr 1fr',
    slots: [
      {
        slotId: 'main-70',
        slotLabel: 'Main (70%)',
        gridColumn: '1 / 2',
        gridRow: '1 / 3',
      },
      {
        slotId: 'top-right-30',
        slotLabel: 'Top-Right Stack (30%)',
        gridColumn: '2 / 3',
        gridRow: '1 / 2',
      },
      {
        slotId: 'bottom-right-30',
        slotLabel: 'Bottom-Right Stack (30%)',
        gridColumn: '2 / 3',
        gridRow: '2 / 3',
      },
    ],
  },
  {
    id: 'three-columns',
    label: '3-Column Studio',
    gridTemplateColumns: '1fr 1fr 1fr',
    gridTemplateRows: '1fr',
    slots: [
      {
        slotId: 'left-column',
        slotLabel: 'Left Column',
        gridColumn: '1 / 2',
        gridRow: '1 / 2',
      },
      {
        slotId: 'center-column',
        slotLabel: 'Center Column',
        gridColumn: '2 / 3',
        gridRow: '1 / 2',
      },
      {
        slotId: 'right-column',
        slotLabel: 'Right Column',
        gridColumn: '3 / 4',
        gridRow: '1 / 2',
      },
    ],
  },
  {
    id: 'quad-grid',
    label: '2×2 Quad Grid',
    gridTemplateColumns: '1fr 1fr',
    gridTemplateRows: '1fr 1fr',
    slots: [
      {
        slotId: 'top-left',
        slotLabel: 'Top-Left',
        gridColumn: '1 / 2',
        gridRow: '1 / 2',
      },
      {
        slotId: 'top-right',
        slotLabel: 'Top-Right',
        gridColumn: '2 / 3',
        gridRow: '1 / 2',
      },
      {
        slotId: 'bottom-left',
        slotLabel: 'Bottom-Left',
        gridColumn: '1 / 2',
        gridRow: '2 / 3',
      },
      {
        slotId: 'bottom-right',
        slotLabel: 'Bottom-Right',
        gridColumn: '2 / 3',
        gridRow: '2 / 3',
      },
    ],
  },
];

function WindowLayoutPopoverInner({
  windowTitle = DEFAULT_WINDOW_TITLE,
  open,
  defaultOpen = false,
  selectedSelection,
  onOpenChange,
  onSelectLayout,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: WindowLayoutPopoverProps) {
  const titleId = useId();
  const menuId = useId();
  const override = useComponentOverride('WindowLayoutPopover');

  const [isOpenState, setIsOpenState] = useControllableState<boolean>({
    value: open,
    defaultValue: defaultOpen,
    onChange: onOpenChange,
  });

  const [activeSelection, setActiveSelection] =
    useControllableState<WindowLayoutSlotSelection | null>({
      value: selectedSelection,
      defaultValue: null,
    });

  const [previewSelection, setPreviewSelection] =
    useState<WindowLayoutSlotSelection | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(
    null
  );

  const anchorRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolvedTitle = windowTitle.trim() || DEFAULT_WINDOW_TITLE;
  const isPopoverOpen = !disabled && isOpenState;
  const visiblePreview = isPopoverOpen ? previewSelection : null;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updateOpen = useCallback(
    (nextOpen: boolean) => {
      if (disabled) {
        return;
      }
      if (nextOpen === isPopoverOpen) {
        return;
      }
      if (!nextOpen) {
        clearCloseTimer();
        setPreviewSelection(null);
      }
      setIsOpenState(nextOpen);
    },
    [clearCloseTimer, disabled, isPopoverOpen, setIsOpenState]
  );

  // Clean up any pending hover-close timer on close or unmount.
  useEffect(() => {
    if (!isPopoverOpen) {
      clearCloseTimer();
    }
    return () => {
      clearCloseTimer();
    };
  }, [clearCloseTimer, isPopoverOpen]);

  // Dismiss cleanly on outside pointerdown or IME-safe Escape, strictly cleaning up window listeners.
  useEffect(() => {
    if (!isPopoverOpen) {
      return undefined;
    }

    const handleWindowPointerDown = (event: PointerEvent) => {
      if (
        anchorRef.current &&
        event.target instanceof Node &&
        !anchorRef.current.contains(event.target)
      ) {
        clearCloseTimer();
        setPreviewSelection(null);
        setIsOpenState(false);
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        clearCloseTimer();
        setPreviewSelection(null);
        setIsOpenState(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [clearCloseTimer, isPopoverOpen, setIsOpenState]);

  const handleTriggerMouseEnter = useCallback(() => {
    clearCloseTimer();
    updateOpen(true);
  }, [clearCloseTimer, updateOpen]);

  const handleTriggerClick = useCallback(() => {
    clearCloseTimer();
    updateOpen(!isPopoverOpen);
  }, [clearCloseTimer, isPopoverOpen, updateOpen]);

  const handleTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleTriggerClick();
      } else if (event.key === 'ArrowDown' && !isPopoverOpen) {
        event.preventDefault();
        clearCloseTimer();
        updateOpen(true);
      }
    },
    [clearCloseTimer, handleTriggerClick, isPopoverOpen, updateOpen]
  );

  const handleAnchorMouseLeave = useCallback(() => {
    if (!isPopoverOpen) {
      return;
    }
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      setPreviewSelection(null);
      setIsOpenState(false);
    }, HOVER_CLOSE_DELAY_MS);
  }, [clearCloseTimer, isPopoverOpen, setIsOpenState]);

  const handleSelectSlot = useCallback(
    (selection: WindowLayoutSlotSelection) => {
      clearCloseTimer();
      setPreviewSelection(null);
      setActiveSelection(selection);
      setStatusAnnouncement(
        `${resolvedTitle} snapped to ${selection.templateLabel}: ${selection.slotLabel}`
      );
      onSelectLayout?.(selection);
      setIsOpenState(false);
    },
    [
      clearCloseTimer,
      onSelectLayout,
      resolvedTitle,
      setActiveSelection,
      setIsOpenState,
    ]
  );

  const handleSlotKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      selection: WindowLayoutSlotSelection
    ) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleSelectSlot(selection);
      }
    },
    [handleSelectSlot]
  );

  const merged = mergeProps({
    themeTarget: themeProps('window-layout-popover', {
      open: isPopoverOpen,
      disabled,
      template: activeSelection?.templateId,
      slot: activeSelection?.slotId,
    }),
    baseClassName:
      'prism-slab relative flex flex-col w-full max-w-full min-w-0 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('window-layout-popover', 'header');
  const titleGroupClass = stableClassName(
    'window-layout-popover',
    'title-group'
  );
  const badgeClass = stableClassName('window-layout-popover', 'active-badge');
  const anchorClass = stableClassName('window-layout-popover', 'anchor');
  const triggerClass = stableClassName('window-layout-popover', 'trigger');
  const popoverClass = stableClassName('window-layout-popover', 'popover');
  const gridClass = stableClassName('window-layout-popover', 'grid');
  const templateClass = stableClassName('window-layout-popover', 'template');
  const slotClass = stableClassName('window-layout-popover', 'slot');
  const statusBarClass = stableClassName('window-layout-popover', 'status-bar');

  const popoverFooterSelection = visiblePreview ?? activeSelection;
  const defaultStatusMessage = activeSelection
    ? `${resolvedTitle} snapped to ${activeSelection.templateLabel}: ${activeSelection.slotLabel}`
    : `No tiling layout selected for ${resolvedTitle}. Hover or click Maximize to choose a snap preset.`;
  const liveStatusMessage = statusAnnouncement ?? defaultStatusMessage;

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={titleId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Compact Optical Window Header Bar */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'prism-crystal relative flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3.5 py-2.5 min-w-0 max-w-full rounded-t-[inherit] border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        {/* Top Specular Edge Sheen */}
        <span
          aria-hidden="true"
          data-part="sheen"
          className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--prism-primary-contrast) 70%, transparent) 30%, color-mix(in srgb, var(--prism-secondary-light) 55%, transparent) 70%, transparent 100%)',
          }}
        />

        {/* Window Title & Optional Active Layout Badge */}
        <div
          className={cx(
            titleGroupClass,
            'flex flex-wrap items-center gap-2 min-w-0 max-w-full flex-1'
          )}
        >
          <span
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
          </span>

          <h2
            id={titleId}
            className="text-xs sm:text-sm font-semibold tracking-[-0.01em] truncate min-w-0 max-w-full"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h2>

          {activeSelection ? (
            <span
              data-part="active-badge"
              data-testid="window-layout-active-badge"
              className={cx(
                badgeClass,
                'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 max-w-full'
              )}
              style={{
                color: 'var(--prism-primary-main)',
                borderColor:
                  'color-mix(in srgb, var(--prism-primary-main) 44%, var(--prism-divider))',
                backgroundColor:
                  'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
              }}
            >
              <LayoutGrid aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {activeSelection.templateLabel} · {activeSelection.slotLabel}
              </span>
            </span>
          ) : null}
        </div>

        {/* Anchored Maximize / Layout Preset Trigger & Viewport-Clamped Popover */}
        <div
          ref={anchorRef}
          data-part="anchor"
          data-testid="window-layout-anchor"
          onMouseLeave={handleAnchorMouseLeave}
          className={cx(
            anchorClass,
            'relative inline-flex items-center shrink-0'
          )}
        >
          <button
            ref={triggerRef}
            type="button"
            disabled={disabled}
            aria-haspopup="menu"
            aria-expanded={isPopoverOpen}
            aria-controls={isPopoverOpen ? menuId : undefined}
            aria-label="Window layout presets"
            data-part="trigger"
            data-testid="window-layout-trigger"
            onMouseEnter={handleTriggerMouseEnter}
            onClick={handleTriggerClick}
            onKeyDown={handleTriggerKeyDown}
            className={cx(
              triggerClass,
              'prism-focus-ring h-8 w-8 rounded-lg border inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors',
              isPopoverOpen ? 'shadow-sm' : 'prism-well',
              disabled ? 'opacity-50' : ''
            )}
            style={
              isPopoverOpen
                ? {
                    borderColor: 'var(--prism-primary-main)',
                    backgroundColor:
                      'color-mix(in srgb, var(--prism-primary-main) 16%, transparent)',
                    color: 'var(--prism-primary-main)',
                  }
                : {
                    borderColor: 'var(--prism-divider)',
                    color: disabled
                      ? 'var(--prism-text-disabled)'
                      : 'var(--prism-text-primary)',
                  }
            }
          >
            <Maximize2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          </button>

          {isPopoverOpen ? (
            <div
              id={menuId}
              role="menu"
              aria-label="Window layout presets"
              data-part="popover"
              data-testid="window-layout-popover"
              onMouseEnter={clearCloseTimer}
              className={cx(
                popoverClass,
                'prism-slab absolute right-0 top-full mt-2 z-30 w-[min(21rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-3 flex flex-col gap-2.5'
              )}
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--prism-divider)',
              }}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span
                  className="text-[11px] font-semibold uppercase tracking-wider truncate"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Snap Layout Presets
                </span>
                <span
                  className="prism-well px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold shrink-0"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Esc
                </span>
              </div>

              <div
                data-part="templates-grid"
                className={cx(
                  gridClass,
                  'grid grid-cols-2 gap-2.5 min-w-0 max-w-full'
                )}
              >
                {WINDOW_LAYOUT_TEMPLATES.map((template) => {
                  const isActiveTemplate =
                    activeSelection?.templateId === template.id;

                  return (
                    <div
                      key={template.id}
                      role="group"
                      aria-label={template.label}
                      data-template-id={template.id}
                      data-testid={`window-layout-template-${template.id}`}
                      className={cx(
                        templateClass,
                        'prism-well rounded-xl p-2 flex flex-col gap-1.5 min-w-0 border'
                      )}
                      style={{
                        borderColor: isActiveTemplate
                          ? 'color-mix(in srgb, var(--prism-primary-main) 52%, var(--prism-divider))'
                          : 'var(--prism-divider)',
                      }}
                    >
                      <div
                        className="grid gap-1 h-12 w-full min-w-0"
                        style={{
                          gridTemplateColumns: template.gridTemplateColumns,
                          gridTemplateRows: template.gridTemplateRows,
                        }}
                      >
                        {template.slots.map((slot) => {
                          const isSelected =
                            isActiveTemplate &&
                            activeSelection.slotId === slot.slotId;
                          const isPreviewed =
                            visiblePreview !== null &&
                            visiblePreview.templateId === template.id &&
                            visiblePreview.slotId === slot.slotId;

                          const selectionPayload: WindowLayoutSlotSelection = {
                            templateId: template.id,
                            templateLabel: template.label,
                            slotId: slot.slotId,
                            slotLabel: slot.slotLabel,
                          };

                          const slotStyle: OpticalStyleTokens = isSelected
                            ? {
                                gridColumn: slot.gridColumn,
                                gridRow: slot.gridRow,
                                backgroundColor:
                                  'color-mix(in srgb, var(--prism-primary-main) 34%, transparent)',
                                borderColor: 'var(--prism-primary-main)',
                                boxShadow:
                                  'inset 0 0 0 1px color-mix(in srgb, var(--prism-primary-main) 58%, transparent)',
                              }
                            : isPreviewed
                              ? {
                                  gridColumn: slot.gridColumn,
                                  gridRow: slot.gridRow,
                                  backgroundColor:
                                    'color-mix(in srgb, var(--prism-primary-main) 20%, transparent)',
                                  borderColor: 'var(--prism-primary-main)',
                                }
                              : {
                                  gridColumn: slot.gridColumn,
                                  gridRow: slot.gridRow,
                                  backgroundColor:
                                    'color-mix(in srgb, var(--prism-text-primary) 8%, transparent)',
                                  borderColor: 'var(--prism-divider)',
                                };

                          return (
                            <button
                              key={`${template.id}:${slot.slotId}`}
                              type="button"
                              role="menuitem"
                              aria-label={`${template.label}: ${slot.slotLabel}`}
                              data-template-id={template.id}
                              data-slot-id={slot.slotId}
                              data-selected={isSelected ? 'true' : 'false'}
                              data-testid={`window-layout-slot-${template.id}-${slot.slotId}`}
                              onClick={() => handleSelectSlot(selectionPayload)}
                              onKeyDown={(event) =>
                                handleSlotKeyDown(event, selectionPayload)
                              }
                              onMouseEnter={() =>
                                setPreviewSelection(selectionPayload)
                              }
                              onMouseLeave={() => setPreviewSelection(null)}
                              onFocus={() =>
                                setPreviewSelection(selectionPayload)
                              }
                              onBlur={() => setPreviewSelection(null)}
                              className={cx(
                                slotClass,
                                'prism-focus-ring rounded-[5px] border w-full h-full min-w-0 min-h-0 cursor-pointer transition-colors hover:border-[var(--prism-primary-main)] focus-visible:border-[var(--prism-primary-main)]'
                              )}
                              style={slotStyle}
                            />
                          );
                        })}
                      </div>

                      <span
                        className="text-[10px] font-semibold tracking-tight truncate text-center"
                        style={{
                          color: isActiveTemplate
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-text-secondary)',
                        }}
                      >
                        {template.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div
                data-part="preview-footer"
                data-testid="window-layout-preview-footer"
                className="prism-well rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] min-w-0"
                style={STYLE_TEXT_SECONDARY}
              >
                <span className="truncate min-w-0">
                  {popoverFooterSelection
                    ? `${popoverFooterSelection.templateLabel} · ${popoverFooterSelection.slotLabel}`
                    : 'Select a tiling zone to snap window'}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      {/* Polite Live Status Readout */}
      <div
        data-part="status-bar"
        className={cx(
          statusBarClass,
          'px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs min-w-0 max-w-full'
        )}
        style={STYLE_TEXT_SECONDARY}
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-part="status"
          data-testid="window-layout-status"
          className="min-w-0 break-words flex-1"
        >
          {liveStatusMessage}
        </div>

        <span
          aria-hidden="true"
          data-testid="window-layout-zone-tag"
          className="font-mono text-[10px] font-semibold uppercase tracking-wide shrink-0"
          style={{
            color: activeSelection
              ? 'var(--prism-primary-main)'
              : 'var(--prism-text-disabled)',
          }}
        >
          {activeSelection ? activeSelection.slotLabel : 'Floating'}
        </span>
      </div>
    </div>
  );
}

export const WindowLayoutPopover = memo(WindowLayoutPopoverInner);
WindowLayoutPopover.displayName = 'WindowLayoutPopover';
