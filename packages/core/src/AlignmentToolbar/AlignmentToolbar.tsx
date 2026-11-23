'use client';

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  Frame,
  RotateCcw,
  SquareDashedMousePointer,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BG_DIVIDER, STYLE_BORDER_DIVIDER, STYLE_BORDER_DIVIDER_TEXT_SECONDARY, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AlignmentActionId =
  | 'align-left'
  | 'align-center-h'
  | 'align-right'
  | 'align-top'
  | 'align-middle-v'
  | 'align-bottom'
  | 'distribute-h'
  | 'distribute-v';

export type AlignmentAnchorMode = 'selection' | 'artboard';

export interface AlignmentToolbarProps extends BaseProps<HTMLDivElement> {
  /** Number of currently selected canvas objects (defaults to 3; disables distribute when < 3 and align when < 1 or < 2 in selection mode). */
  selectedCount?: number;
  /** Controlled alignment anchor scope ('selection' | 'artboard'). */
  anchorMode?: AlignmentAnchorMode;
  /** Initial alignment anchor scope in uncontrolled mode (defaults to 'selection'). */
  defaultAnchorMode?: AlignmentAnchorMode;
  /** Callback fired whenever the alignment anchor mode toggles between selection and artboard. */
  onAnchorModeChange?: (mode: AlignmentAnchorMode) => void;
  /** Callback fired when an enabled alignment or distribution action is activated. */
  onAlign?: (action: AlignmentActionId, anchorMode: AlignmentAnchorMode) => void;
  /** Renders an interactive 3-object optical preview stage that visibly snaps and distributes objects (defaults to false). */
  showMiniStage?: boolean;
  /** Disables all alignment, distribution, anchor-scope, and stage controls (defaults to false). */
  disabled?: boolean;
  /** Accessible toolbar label exposed via aria-label (defaults to 'Alignment and distribution controls'). */
  ariaLabel?: string;
}

type ToolbarControlId =
  | AlignmentActionId
  | 'anchor-selection'
  | 'anchor-artboard'
  | 'stage-reset';

interface AlignmentActionSpec {
  id: AlignmentActionId;
  label: string;
  shortLabel: string;
}

interface StageBox {
  id: 'box-a' | 'box-b' | 'box-c';
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  accentVar: string;
}

type StageGuide =
  | { kind: 'vertical'; pos: number }
  | { kind: 'horizontal'; pos: number }
  | { kind: 'span-h'; start: number; end: number }
  | { kind: 'span-v'; start: number; end: number };

interface StageLayoutResult {
  boxes: ReadonlyArray<StageBox>;
  guide: StageGuide;
}

const STAGE_LEFT = 6;
const STAGE_RIGHT = 94;
const STAGE_TOP = 8;
const STAGE_BOTTOM = 92;

const INITIAL_STAGE_BOXES: ReadonlyArray<StageBox> = [
  {
    id: 'box-a',
    label: 'A',
    x: 10,
    y: 10,
    w: 18,
    h: 20,
    accentVar: 'var(--prism-primary-main)',
  },
  {
    id: 'box-b',
    label: 'B',
    x: 32,
    y: 34,
    w: 22,
    h: 22,
    accentVar: 'var(--prism-secondary-main)',
  },
  {
    id: 'box-c',
    label: 'C',
    x: 72,
    y: 70,
    w: 18,
    h: 18,
    accentVar: 'var(--prism-info-main)',
  },
];

const HORIZONTAL_ACTIONS: ReadonlyArray<AlignmentActionSpec> = [
  { id: 'align-left', label: 'Align left', shortLabel: 'Left' },
  { id: 'align-center-h', label: 'Align horizontal center', shortLabel: 'Center H' },
  { id: 'align-right', label: 'Align right', shortLabel: 'Right' },
];

const VERTICAL_ACTIONS: ReadonlyArray<AlignmentActionSpec> = [
  { id: 'align-top', label: 'Align top', shortLabel: 'Top' },
  { id: 'align-middle-v', label: 'Align vertical middle', shortLabel: 'Middle V' },
  { id: 'align-bottom', label: 'Align bottom', shortLabel: 'Bottom' },
];

const DISTRIBUTE_ACTIONS: ReadonlyArray<AlignmentActionSpec> = [
  { id: 'distribute-h', label: 'Distribute horizontally', shortLabel: 'Distribute H' },
  { id: 'distribute-v', label: 'Distribute vertically', shortLabel: 'Distribute V' },
];

function normalizeSelectedCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 0;
  }
  return Math.max(0, Math.floor(count));
}

function normalizeAnchorMode(mode: AlignmentAnchorMode): AlignmentAnchorMode {
  return mode === 'artboard' ? 'artboard' : 'selection';
}

function formatAnchorMode(mode: AlignmentAnchorMode): string {
  return mode === 'artboard' ? 'Artboard' : 'Selection';
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getActionLabel(action: AlignmentActionId): string {
  switch (action) {
    case 'align-left':
      return 'Align left';
    case 'align-center-h':
      return 'Align horizontal center';
    case 'align-right':
      return 'Align right';
    case 'align-top':
      return 'Align top';
    case 'align-middle-v':
      return 'Align vertical middle';
    case 'align-bottom':
      return 'Align bottom';
    case 'distribute-h':
      return 'Distribute horizontally';
    case 'distribute-v':
      return 'Distribute vertically';
  }
}

function renderActionIcon(action: AlignmentActionId) {
  switch (action) {
    case 'align-left':
      return <AlignStartVertical aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />;
    case 'align-center-h':
      return <AlignCenterVertical aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />;
    case 'align-right':
      return <AlignEndVertical aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />;
    case 'align-top':
      return <AlignStartHorizontal aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />;
    case 'align-middle-v':
      return <AlignCenterHorizontal aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />;
    case 'align-bottom':
      return <AlignEndHorizontal aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />;
    case 'distribute-h':
      return (
        <AlignHorizontalSpaceBetween aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />
      );
    case 'distribute-v':
      return (
        <AlignVerticalSpaceBetween aria-hidden="true" className="w-4 h-4 shrink-0 relative z-10" />
      );
  }
}

function applyAlignmentToBoxes(
  boxes: ReadonlyArray<StageBox>,
  selectedCount: number,
  action: AlignmentActionId,
  anchorMode: AlignmentAnchorMode
): StageLayoutResult {
  const activeStageCount = Math.min(selectedCount, boxes.length);
  const selected = boxes.slice(0, activeStageCount);

  const boundLeft =
    anchorMode === 'artboard' ? STAGE_LEFT : Math.min(...selected.map((box) => box.x));
  const boundRight =
    anchorMode === 'artboard' ? STAGE_RIGHT : Math.max(...selected.map((box) => box.x + box.w));
  const boundTop =
    anchorMode === 'artboard' ? STAGE_TOP : Math.min(...selected.map((box) => box.y));
  const boundBottom =
    anchorMode === 'artboard' ? STAGE_BOTTOM : Math.max(...selected.map((box) => box.y + box.h));
  const boundCenterX = (boundLeft + boundRight) / 2;
  const boundCenterY = (boundTop + boundBottom) / 2;

  if (action === 'distribute-h') {
    const sorted = [...selected].sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2));
    const totalW = sorted.reduce((sum, box) => sum + box.w, 0);
    const gap = (boundRight - boundLeft - totalW) / (sorted.length - 1);
    let cursor = boundLeft;
    const updated = sorted.map((box) => {
      const nextX = clamp(round2(cursor), 0, 100 - box.w);
      cursor += box.w + gap;
      return { ...box, x: nextX };
    });
    updated.sort((a, b) => a.id.localeCompare(b.id));
    return {
      boxes: updated,
      guide: { kind: 'span-h', start: round2(boundLeft), end: round2(boundRight) },
    };
  }

  if (action === 'distribute-v') {
    const sorted = [...selected].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
    const totalH = sorted.reduce((sum, box) => sum + box.h, 0);
    const gap = (boundBottom - boundTop - totalH) / (sorted.length - 1);
    let cursor = boundTop;
    const updated = sorted.map((box) => {
      const nextY = clamp(round2(cursor), 0, 100 - box.h);
      cursor += box.h + gap;
      return { ...box, y: nextY };
    });
    updated.sort((a, b) => a.id.localeCompare(b.id));
    return {
      boxes: updated,
      guide: { kind: 'span-v', start: round2(boundTop), end: round2(boundBottom) },
    };
  }

  const nextBoxes = boxes.map((box, index) => {
    if (index >= activeStageCount) {
      return box;
    }
    switch (action) {
      case 'align-left':
        return { ...box, x: round2(boundLeft) };
      case 'align-center-h':
        return { ...box, x: round2(boundCenterX - box.w / 2) };
      case 'align-right':
        return { ...box, x: round2(boundRight - box.w) };
      case 'align-top':
        return { ...box, y: round2(boundTop) };
      case 'align-middle-v':
        return { ...box, y: round2(boundCenterY - box.h / 2) };
      case 'align-bottom':
        return { ...box, y: round2(boundBottom - box.h) };
    }
  });

  switch (action) {
    case 'align-left':
      return { boxes: nextBoxes, guide: { kind: 'vertical', pos: round2(boundLeft) } };
    case 'align-center-h':
      return { boxes: nextBoxes, guide: { kind: 'vertical', pos: round2(boundCenterX) } };
    case 'align-right':
      return { boxes: nextBoxes, guide: { kind: 'vertical', pos: round2(boundRight) } };
    case 'align-top':
      return { boxes: nextBoxes, guide: { kind: 'horizontal', pos: round2(boundTop) } };
    case 'align-middle-v':
      return { boxes: nextBoxes, guide: { kind: 'horizontal', pos: round2(boundCenterY) } };
    case 'align-bottom':
      return { boxes: nextBoxes, guide: { kind: 'horizontal', pos: round2(boundBottom) } };
  }
}

const controlsClass = /*#__PURE__*/ stableClassName('alignment-toolbar', 'controls');
const groupClass = /*#__PURE__*/ stableClassName('alignment-toolbar', 'group');
const scopeClass = /*#__PURE__*/ stableClassName('alignment-toolbar', 'scope');
const counterClass = /*#__PURE__*/ stableClassName('alignment-toolbar', 'counter');
const statusClass = /*#__PURE__*/ stableClassName('alignment-toolbar', 'status');
const stageClass = /*#__PURE__*/ stableClassName('alignment-toolbar', 'stage');

function AlignmentToolbarInner({
  selectedCount = 3,
  anchorMode,
  defaultAnchorMode = 'selection',
  onAnchorModeChange,
  onAlign,
  showMiniStage = false,
  disabled = false,
  ariaLabel = 'Alignment and distribution controls',
  onKeyDown,
  className,
  style,
  xstyle,
  ref,
  'aria-label': ariaLabelAttr,
  ...rest
}: AlignmentToolbarProps) {
  const override = useComponentOverride('AlignmentToolbar');
  const safeSelectedCount = normalizeSelectedCount(selectedCount);

  const [rawAnchorMode, setRawAnchorMode] = useControllableState<AlignmentAnchorMode>({
    value: anchorMode !== undefined ? normalizeAnchorMode(anchorMode) : undefined,
    defaultValue: normalizeAnchorMode(defaultAnchorMode),
    onChange: onAnchorModeChange,
  });

  const activeAnchorMode = normalizeAnchorMode(rawAnchorMode);
  const [lastAction, setLastAction] = useState<AlignmentActionId | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [stageBoxes, setStageBoxes] = useState<ReadonlyArray<StageBox>>(INITIAL_STAGE_BOXES);
  const [stageGuide, setStageGuide] = useState<StageGuide | null>(null);
  const [focusedControlId, setFocusedControlId] = useState<ToolbarControlId>('align-left');

  const buttonRefs = useRef<Map<ToolbarControlId, HTMLButtonElement>>(new Map());

  const registerButtonRef = useCallback(
    (id: ToolbarControlId, node: HTMLButtonElement | null) => {
      if (node) {
        buttonRefs.current.set(id, node);
      } else {
        buttonRefs.current.delete(id);
      }
    },
    []
  );

  const isAlignDisabled =
    disabled ||
    safeSelectedCount < 1 ||
    (activeAnchorMode === 'selection' && safeSelectedCount < 2);
  const isDistributeDisabled = disabled || safeSelectedCount < 3;

  const enabledControlIds = useMemo<ReadonlyArray<ToolbarControlId>>(() => {
    if (disabled) {
      return [];
    }
    const ids: ToolbarControlId[] = [];
    if (!isAlignDisabled) {
      for (const spec of HORIZONTAL_ACTIONS) {
        ids.push(spec.id);
      }
      for (const spec of VERTICAL_ACTIONS) {
        ids.push(spec.id);
      }
    }
    if (!isDistributeDisabled) {
      for (const spec of DISTRIBUTE_ACTIONS) {
        ids.push(spec.id);
      }
    }
    ids.push('anchor-selection', 'anchor-artboard');
    if (showMiniStage) {
      ids.push('stage-reset');
    }
    return ids;
  }, [disabled, isAlignDisabled, isDistributeDisabled, showMiniStage]);

  const effectiveTabStopId: ToolbarControlId | null = useMemo(() => {
    const firstControl = enabledControlIds[0];
    if (firstControl === undefined) {
      return null;
    }
    if (enabledControlIds.includes(focusedControlId)) {
      return focusedControlId;
    }
    return firstControl;
  }, [enabledControlIds, focusedControlId]);

  const handleActionClick = useCallback(
    (action: AlignmentActionId) => {
      setLastAction(action);
      setFeedbackMessage(`Applied ${getActionLabel(action)} (${formatAnchorMode(activeAnchorMode)})`);
      if (showMiniStage) {
        setStageBoxes((prevBoxes) => {
          const result = applyAlignmentToBoxes(
            prevBoxes,
            safeSelectedCount,
            action,
            activeAnchorMode
          );
          setStageGuide(result.guide);
          return result.boxes;
        });
      }
      onAlign?.(action, activeAnchorMode);
    },
    [activeAnchorMode, onAlign, safeSelectedCount, showMiniStage]
  );

  const handleSelectAnchorMode = useCallback(
    (nextMode: AlignmentAnchorMode) => {
      if (nextMode === activeAnchorMode) {
        return;
      }
      setRawAnchorMode(nextMode);
      setFeedbackMessage(
        `Anchor set to ${formatAnchorMode(nextMode)} · ${safeSelectedCount} selected`
      );
    },
    [activeAnchorMode, safeSelectedCount, setRawAnchorMode]
  );

  const handleResetStage = useCallback(() => {
    setStageBoxes(INITIAL_STAGE_BOXES);
    setStageGuide(null);
    setLastAction(null);
    setFeedbackMessage('Preview stage reset');
  }, []);

  const handleToolbarKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (
        disabled ||
        event.defaultPrevented ||
        event.nativeEvent.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      const targetControlId =
        event.target instanceof Element
          ? (event.target.closest('[data-control-id]')?.getAttribute('data-control-id') ?? null)
          : null;
      const targetIndex = targetControlId
        ? enabledControlIds.findIndex((id) => id === targetControlId)
        : -1;
      const fallbackIndex = enabledControlIds.findIndex((id) => id === effectiveTabStopId);
      const currentIndex = targetIndex !== -1 ? targetIndex : fallbackIndex;

      let nextIndex: number;
      switch (event.key) {
        case 'ArrowRight':
          nextIndex = (currentIndex + 1) % enabledControlIds.length;
          break;
        case 'ArrowLeft':
          nextIndex = (currentIndex - 1 + enabledControlIds.length) % enabledControlIds.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = enabledControlIds.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextId = enabledControlIds[nextIndex];
      if (nextId !== undefined) {
        setFocusedControlId(nextId);
        buttonRefs.current.get(nextId)?.focus();
      }
    },
    [disabled, effectiveTabStopId, enabledControlIds, onKeyDown]
  );

  const defaultStatusText =
    safeSelectedCount < 1
      ? 'Select objects to align'
      : activeAnchorMode === 'selection' && safeSelectedCount < 2
        ? 'Select 2+ objects or switch to Artboard'
        : `Ready · Align to ${formatAnchorMode(activeAnchorMode)}`;

  const liveFeedbackText = feedbackMessage ?? defaultStatusText;
  const activeStageSelectedCount = Math.min(safeSelectedCount, stageBoxes.length);

  const merged = mergeProps({
    themeTarget: themeProps('alignment-toolbar', {
      anchorMode: activeAnchorMode,
      selectedCount: safeSelectedCount,
      lastAction: lastAction ?? undefined,
      showMiniStage,
      disabled,
    }),
    baseClassName:
      'prism-slab p-2.5 sm:p-3 w-full max-w-full min-w-0 flex flex-wrap items-center justify-between gap-2 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const renderActionGroup = (
    groupLabel: string,
    actions: ReadonlyArray<AlignmentActionSpec>,
    groupDisabled: boolean
  ) => (
    <div
      role="group"
      aria-label={groupLabel}
      className={cx(
        groupClass,
        'prism-well p-1 rounded-xl inline-flex items-center gap-0.5 shrink-0'
      )}
    >
      {actions.map((action) => {
        const isActive = lastAction === action.id;
        return (
          <button
            key={action.id}
            ref={(node) => registerButtonRef(action.id, node)}
            type="button"
            disabled={groupDisabled}
            tabIndex={effectiveTabStopId === action.id ? 0 : -1}
            aria-label={action.label}
            data-control-id={action.id}
            data-active={isActive ? 'true' : undefined}
            data-testid={`alignment-btn-${action.id}`}
            onFocus={() => setFocusedControlId(action.id)}
            onClick={() => handleActionClick(action.id)}
            className={cx(
              isActive
                ? 'prism-btn-primary'
                : 'prism-crystal enabled:hover:brightness-105',
              'prism-focus-ring h-8 w-8 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]'
            )}
            style={isActive ? undefined : STYLE_TEXT_PRIMARY}
          >
            {renderActionIcon(action.id)}
          </button>
        );
      })}
    </div>
  );

  return (
    <div
      ref={ref}
      role="toolbar"
      aria-label={ariaLabelAttr ?? ariaLabel}
      aria-orientation="horizontal"
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
      onKeyDown={handleToolbarKeyDown}
    >
      {/* Primary Icon Toolbar Groups */}
      <div
        className={cx(
          controlsClass,
          'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full'
        )}
      >
        {renderActionGroup('Horizontal alignment', HORIZONTAL_ACTIONS, isAlignDisabled)}

        <span
          aria-hidden="true"
          className="hidden sm:inline-block w-px h-5 shrink-0"
          style={STYLE_BG_DIVIDER}
        />

        {renderActionGroup('Vertical alignment', VERTICAL_ACTIONS, isAlignDisabled)}

        <span
          aria-hidden="true"
          className="hidden sm:inline-block w-px h-5 shrink-0"
          style={STYLE_BG_DIVIDER}
        />

        {renderActionGroup('Distribution', DISTRIBUTE_ACTIONS, isDistributeDisabled)}
      </div>

      {/* Target Scope Toggle + Selection Counter Pill */}
      <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
        <div
          role="group"
          aria-label="Alignment anchor mode"
          className={cx(
            scopeClass,
            'prism-well p-0.5 rounded-full inline-flex items-center gap-0.5 shrink-0'
          )}
        >
          <button
            ref={(node) => registerButtonRef('anchor-selection', node)}
            type="button"
            disabled={disabled}
            tabIndex={effectiveTabStopId === 'anchor-selection' ? 0 : -1}
            aria-pressed={activeAnchorMode === 'selection'}
            data-control-id="anchor-selection"
            data-testid="alignment-anchor-selection"
            onFocus={() => setFocusedControlId('anchor-selection')}
            onClick={() => handleSelectAnchorMode('selection')}
            className={cx(
              activeAnchorMode === 'selection'
                ? 'prism-btn-primary font-semibold'
                : 'prism-btn-secondary font-medium',
              'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]'
            )}
          >
            <SquareDashedMousePointer
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0 relative z-10"
            />
            <span className="relative z-10">Selection</span>
          </button>

          <button
            ref={(node) => registerButtonRef('anchor-artboard', node)}
            type="button"
            disabled={disabled}
            tabIndex={effectiveTabStopId === 'anchor-artboard' ? 0 : -1}
            aria-pressed={activeAnchorMode === 'artboard'}
            data-control-id="anchor-artboard"
            data-testid="alignment-anchor-artboard"
            onFocus={() => setFocusedControlId('anchor-artboard')}
            onClick={() => handleSelectAnchorMode('artboard')}
            className={cx(
              activeAnchorMode === 'artboard'
                ? 'prism-btn-primary font-semibold'
                : 'prism-btn-secondary font-medium',
              'prism-focus-ring h-7 px-2.5 rounded-full inline-flex items-center gap-1 text-xs whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed transition-[color,background-color,border-color,opacity,transform]'
            )}
          >
            <Frame aria-hidden="true" className="w-3.5 h-3.5 shrink-0 relative z-10" />
            <span className="relative z-10">Artboard</span>
          </button>
        </div>

        <span
          data-testid="alignment-selected-count"
          className={cx(
            counterClass,
            'prism-crystal px-2.5 h-7 rounded-full inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0'
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: isAlignDisabled
                ? 'var(--prism-text-disabled)'
                : 'var(--prism-primary-main)',
            }}
          />
          <span>{safeSelectedCount} selected</span>
        </span>
      </div>

      {/* Optional Interactive 3-Object Mini Preview Stage */}
      {showMiniStage ? (
        <div
          data-testid="alignment-mini-stage"
          className={cx(
            stageClass,
            'prism-well w-full basis-full rounded-2xl p-2.5 flex flex-col gap-2 min-w-0 max-w-full'
          )}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="text-[11px] font-semibold tracking-tight"
                style={STYLE_TEXT_PRIMARY}
              >
                Alignment Stage
              </span>
              <span
                data-testid="alignment-stage-scope"
                className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-medium"
                style={STYLE_TEXT_SECONDARY}
              >
                {activeAnchorMode === 'artboard' ? 'Artboard Frame' : 'Selection Bounds'}
              </span>
            </div>

            <button
              ref={(node) => registerButtonRef('stage-reset', node)}
              type="button"
              disabled={disabled}
              tabIndex={effectiveTabStopId === 'stage-reset' ? 0 : -1}
              data-control-id="stage-reset"
              data-testid="alignment-stage-reset"
              onFocus={() => setFocusedControlId('stage-reset')}
              onClick={handleResetStage}
              className="prism-crystal prism-focus-ring h-6 px-2.5 rounded-full inline-flex items-center gap-1 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_TEXT_SECONDARY}
            >
              <RotateCcw aria-hidden="true" className="w-3 h-3 shrink-0" />
              <span>Reset</span>
            </button>
          </div>

          <div
            data-testid="alignment-stage-canvas"
            className="prism-studio-grid relative w-full h-36 rounded-xl overflow-hidden border"
            style={STYLE_BORDER_DIVIDER}
          >
            {/* Artboard Safe Frame Indicator */}
            <div
              aria-hidden="true"
              data-testid="alignment-stage-artboard"
              className="absolute pointer-events-none rounded-lg border border-dashed transition-colors duration-200"
              style={{
                left: `${STAGE_LEFT}%`,
                top: `${STAGE_TOP}%`,
                width: `${STAGE_RIGHT - STAGE_LEFT}%`,
                height: `${STAGE_BOTTOM - STAGE_TOP}%`,
                borderColor:
                  activeAnchorMode === 'artboard'
                    ? 'var(--prism-primary-main)'
                    : 'var(--prism-divider)',
              }}
            />

            {/* Active Geometric Snap / Distribution Guide */}
            {stageGuide?.kind === 'vertical' ? (
              <div
                aria-hidden="true"
                data-testid="alignment-stage-guide"
                data-guide-kind="vertical"
                className="absolute top-0 bottom-0 pointer-events-none"
                style={{
                  left: `${stageGuide.pos}%`,
                  borderLeft: '1.5px dashed var(--prism-primary-main)',
                }}
              />
            ) : null}

            {stageGuide?.kind === 'horizontal' ? (
              <div
                aria-hidden="true"
                data-testid="alignment-stage-guide"
                data-guide-kind="horizontal"
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${stageGuide.pos}%`,
                  borderTop: '1.5px dashed var(--prism-primary-main)',
                }}
              />
            ) : null}

            {stageGuide?.kind === 'span-h' ? (
              <div
                aria-hidden="true"
                data-testid="alignment-stage-guide"
                data-guide-kind="span-h"
                className="absolute top-1/2 pointer-events-none"
                style={{
                  left: `${stageGuide.start}%`,
                  width: `${stageGuide.end - stageGuide.start}%`,
                  borderTop: '1.5px dashed var(--prism-secondary-main)',
                }}
              />
            ) : null}

            {stageGuide?.kind === 'span-v' ? (
              <div
                aria-hidden="true"
                data-testid="alignment-stage-guide"
                data-guide-kind="span-v"
                className="absolute left-1/2 pointer-events-none"
                style={{
                  top: `${stageGuide.start}%`,
                  height: `${stageGuide.end - stageGuide.start}%`,
                  borderLeft: '1.5px dashed var(--prism-secondary-main)',
                }}
              />
            ) : null}

            {/* Interactive Optical Preview Objects */}
            {stageBoxes.map((box, index) => {
              const isSelectedBox = index < activeStageSelectedCount;
              return (
                <div
                  key={box.id}
                  data-testid={`alignment-stage-${box.id}`}
                  data-selected={isSelectedBox ? 'true' : 'false'}
                  data-x={String(box.x)}
                  data-y={String(box.y)}
                  className={cx(
                    'prism-crystal absolute rounded-lg border flex items-center justify-center font-mono text-[11px] font-bold transition-[color,background-color,border-color,opacity,transform] duration-200 ease-out',
                    isSelectedBox ? 'opacity-100' : 'opacity-40'
                  )}
                  style={{
                    left: `${box.x}%`,
                    top: `${box.y}%`,
                    width: `${box.w}%`,
                    height: `${box.h}%`,
                    borderColor: isSelectedBox ? box.accentVar : 'var(--prism-divider)',
                    backgroundColor: isSelectedBox
                      ? `color-mix(in srgb, ${box.accentVar} 18%, transparent)`
                      : undefined,
                    color: 'var(--prism-text-primary)',
                  }}
                >
                  <span>{box.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Polite Live Region Feedback Strip */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="alignment-live-feedback"
        className={cx(
          statusClass,
          'w-full basis-full flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t font-mono text-[11px] min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
      >
        <span className="truncate max-w-full">{liveFeedbackText}</span>
        {lastAction !== null ? (
          <span
            data-testid="alignment-last-action-badge"
            className="prism-well px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            {getActionLabel(lastAction)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export const AlignmentToolbar = /*#__PURE__*/ memoWithDisplayName(AlignmentToolbarInner, 'AlignmentToolbar');
