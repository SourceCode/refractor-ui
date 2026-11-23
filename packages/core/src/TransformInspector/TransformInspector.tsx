'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Box, Link2, RotateCcw, Unlink2 } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type TransformAxis = 'x' | 'y' | 'z';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Transform3DState {
  position: Vector3D;
  rotation: Vector3D;
  scale: Vector3D;
  scaleLocked: boolean;
}

type TransformInspectorBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface TransformInspectorProps extends TransformInspectorBaseProps {
  /** Controlled 3D transform state (position, rotation, scale, and uniform scale lock). */
  value?: Transform3DState;
  /** Initial partial or complete 3D transform state in uncontrolled mode. */
  defaultValue?: Partial<Transform3DState>;
  /** Callback fired whenever any transform axis, scale lock, or reset control updates state. */
  onChange?: (state: Transform3DState) => void;
  /** Unit suffix appended to Position telemetry and aria-valuetext (defaults to 'px'). */
  positionUnit?: string;
  /** Inspector header title and default accessible region label (defaults to '3D Transform Inspector'). */
  title?: string;
  /** Disables all axis inputs, the scale aspect-ratio lock toggle, and reset actions. */
  disabled?: boolean;
}

type TransformChannel = 'position' | 'rotation' | 'scale';

interface AxisMeta {
  readonly axis: TransformAxis;
  readonly label: string;
  readonly colorToken: string;
}

interface RowMeta {
  readonly channel: TransformChannel;
  readonly heading: string;
  readonly accessiblePrefix: string;
  readonly baseStep: number;
  readonly identity: Vector3D;
  readonly resetAriaLabel: string;
}

interface ActiveDraft {
  readonly channel: TransformChannel;
  readonly axis: TransformAxis;
  readonly text: string;
}

const DEFAULT_TITLE = '3D Transform Inspector';
const DEFAULT_POSITION_UNIT = 'px';
const MAX_ABS_AXIS_VALUE = 1_000_000;
const AXIS_PRECISION = 3;
const SHIFT_MULTIPLIER = 10;
const DECIMAL_NUMBER_RE = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

const ZERO_VECTOR: Vector3D = { x: 0, y: 0, z: 0 };
const UNIT_SCALE_VECTOR: Vector3D = { x: 1, y: 1, z: 1 };

const DEFAULT_TRANSFORM_STATE: Transform3DState = {
  position: ZERO_VECTOR,
  rotation: ZERO_VECTOR,
  scale: UNIT_SCALE_VECTOR,
  scaleLocked: true,
};

const AXIS_META_LIST: ReadonlyArray<AxisMeta> = [
  { axis: 'x', label: 'X', colorToken: 'var(--prism-error-main)' },
  { axis: 'y', label: 'Y', colorToken: 'var(--prism-success-main)' },
  { axis: 'z', label: 'Z', colorToken: 'var(--prism-info-main)' },
];

const TRANSFORM_ROWS: ReadonlyArray<RowMeta> = [
  {
    channel: 'position',
    heading: 'Position',
    accessiblePrefix: 'Position',
    baseStep: 1,
    identity: ZERO_VECTOR,
    resetAriaLabel: 'Reset position',
  },
  {
    channel: 'rotation',
    heading: 'Rotation (°)',
    accessiblePrefix: 'Rotation',
    baseStep: 1,
    identity: ZERO_VECTOR,
    resetAriaLabel: 'Reset rotation',
  },
  {
    channel: 'scale',
    heading: 'Scale',
    accessiblePrefix: 'Scale',
    baseStep: 0.1,
    identity: UNIT_SCALE_VECTOR,
    resetAriaLabel: 'Reset scale',
  },
];

function roundAxis(value: number): number {
  const rounded = Number(value.toFixed(AXIS_PRECISION));
  return rounded === 0 ? 0 : rounded;
}

function sanitizeAxis(raw: number, fallback: number): number {
  return roundAxis(clampNumber(raw, -MAX_ABS_AXIS_VALUE, MAX_ABS_AXIS_VALUE, fallback));
}

function sanitizeVector(raw: Vector3D | undefined, fallback: Vector3D): Vector3D {
  if (!raw) {
    return { x: fallback.x, y: fallback.y, z: fallback.z };
  }
  return {
    x: sanitizeAxis(raw.x, fallback.x),
    y: sanitizeAxis(raw.y, fallback.y),
    z: sanitizeAxis(raw.z, fallback.z),
  };
}

function sanitizeTransformState(
  raw: Partial<Transform3DState> | undefined,
  fallback: Transform3DState
): Transform3DState {
  return {
    position: sanitizeVector(raw?.position, fallback.position),
    rotation: sanitizeVector(raw?.rotation, fallback.rotation),
    scale: sanitizeVector(raw?.scale, fallback.scale),
    scaleLocked: raw?.scaleLocked ?? fallback.scaleLocked,
  };
}

function vectorsEqual(a: Vector3D, b: Vector3D): boolean {
  return a.x === b.x && a.y === b.y && a.z === b.z;
}

function statesEqual(a: Transform3DState, b: Transform3DState): boolean {
  return (
    a.scaleLocked === b.scaleLocked &&
    vectorsEqual(a.position, b.position) &&
    vectorsEqual(a.rotation, b.rotation) &&
    vectorsEqual(a.scale, b.scale)
  );
}

function parseNumericDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (!DECIMAL_NUMBER_RE.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function getVectorAxis(vec: Vector3D, axis: TransformAxis): number {
  switch (axis) {
    case 'x':
      return vec.x;
    case 'y':
      return vec.y;
    case 'z':
      return vec.z;
  }
}

function setVectorAxis(vec: Vector3D, axis: TransformAxis, nextVal: number): Vector3D {
  switch (axis) {
    case 'x':
      return { x: nextVal, y: vec.y, z: vec.z };
    case 'y':
      return { x: vec.x, y: nextVal, z: vec.z };
    case 'z':
      return { x: vec.x, y: vec.y, z: nextVal };
  }
}

function getChannelVector(state: Transform3DState, channel: TransformChannel): Vector3D {
  switch (channel) {
    case 'position':
      return state.position;
    case 'rotation':
      return state.rotation;
    case 'scale':
      return state.scale;
  }
}

function setChannelVector(
  state: Transform3DState,
  channel: TransformChannel,
  nextVec: Vector3D
): Transform3DState {
  switch (channel) {
    case 'position':
      return { ...state, position: nextVec };
    case 'rotation':
      return { ...state, rotation: nextVec };
    case 'scale':
      return { ...state, scale: nextVec };
  }
}

function computeNextScale(
  base: Vector3D,
  axis: TransformAxis,
  rawNextVal: number,
  scaleLocked: boolean
): Vector3D {
  const prevAxisVal = getVectorAxis(base, axis);
  const cleanNext = sanitizeAxis(rawNextVal, prevAxisVal);
  if (!scaleLocked) {
    return setVectorAxis(base, axis, cleanNext);
  }

  if (prevAxisVal === 0) {
    return { x: cleanNext, y: cleanNext, z: cleanNext };
  }

  const ratio = cleanNext / prevAxisVal;
  return {
    x: axis === 'x' ? cleanNext : sanitizeAxis(base.x * ratio, base.x),
    y: axis === 'y' ? cleanNext : sanitizeAxis(base.y * ratio, base.y),
    z: axis === 'z' ? cleanNext : sanitizeAxis(base.z * ratio, base.z),
  };
}

function formatValueText(channel: TransformChannel, val: number, unit: string): string {
  switch (channel) {
    case 'position':
      return unit ? `${val}${unit}` : String(val);
    case 'rotation':
      return `${val}°`;
    case 'scale':
      return `${val}x`;
  }
}

function formatTelemetry(state: Transform3DState, unit: string): string {
  const { position, rotation, scale } = state;
  return `translate3d(${position.x}${unit}, ${position.y}${unit}, ${position.z}${unit}) rotate3d(${rotation.x}deg, ${rotation.y}deg, ${rotation.z}deg) scale3d(${scale.x}, ${scale.y}, ${scale.z})`;
}

function TransformInspectorInner({
  value,
  defaultValue,
  onChange,
  positionUnit = DEFAULT_POSITION_UNIT,
  title = DEFAULT_TITLE,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: TransformInspectorProps) {
  const uid = useId();
  const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '');
  const override = useComponentOverride('TransformInspector');
  const safeUnit = positionUnit.trim();

  const safeDefaultState = useMemo<Transform3DState>(
    () => sanitizeTransformState(defaultValue, DEFAULT_TRANSFORM_STATE),
    [defaultValue]
  );

  const isControlled = value !== undefined;
  const [uncontrolledState, setUncontrolledState] = useState<Transform3DState>(safeDefaultState);
  const currentState = sanitizeTransformState(
    isControlled ? value : uncontrolledState,
    safeDefaultState
  );

  const [activeDraft, setActiveDraft] = useState<ActiveDraft | null>(null);
  const scaleAnchorRef = useRef<Vector3D | null>(null);

  const commitState = useCallback(
    (nextRaw: Transform3DState) => {
      const next = sanitizeTransformState(nextRaw, currentState);
      if (statesEqual(next, currentState)) {
        return;
      }
      if (!isControlled) {
        setUncontrolledState(next);
      }
      onChange?.(next);
    },
    [currentState, isControlled, onChange]
  );

  const applyAxisValue = useCallback(
    (channel: TransformChannel, axis: TransformAxis, rawNextVal: number, useAnchor: boolean) => {
      if (channel === 'scale') {
        const baseScale =
          useAnchor && scaleAnchorRef.current ? scaleAnchorRef.current : currentState.scale;
        const nextScale = computeNextScale(baseScale, axis, rawNextVal, currentState.scaleLocked);
        if (!useAnchor) {
          scaleAnchorRef.current = nextScale;
        }
        commitState({ ...currentState, scale: nextScale });
        return;
      }

      const currentVec = getChannelVector(currentState, channel);
      const cleanNext = sanitizeAxis(rawNextVal, getVectorAxis(currentVec, axis));
      const nextVec = setVectorAxis(currentVec, axis, cleanNext);
      commitState(setChannelVector(currentState, channel, nextVec));
    },
    [commitState, currentState]
  );

  const handleAxisFocus = useCallback(
    (channel: TransformChannel) => {
      if (channel === 'scale') {
        scaleAnchorRef.current = currentState.scale;
      }
    },
    [currentState.scale]
  );

  const handleAxisChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>, channel: TransformChannel, axis: TransformAxis) => {
      if (disabled) return;
      const nextText = e.target.value;
      setActiveDraft({ channel, axis, text: nextText });

      const parsed = parseNumericDraft(nextText);
      if (parsed !== null) {
        applyAxisValue(channel, axis, parsed, true);
      }
    },
    [applyAxisValue, disabled]
  );

  const handleAxisKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>, row: RowMeta, axis: TransformAxis) => {
      if (disabled || e.nativeEvent.isComposing) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const isEditingThisInput =
          activeDraft !== null &&
          activeDraft.channel === row.channel &&
          activeDraft.axis === axis;
        const parsedDraft = isEditingThisInput ? parseNumericDraft(activeDraft.text) : null;
        const baseVal =
          parsedDraft !== null
            ? parsedDraft
            : getVectorAxis(getChannelVector(currentState, row.channel), axis);
        const delta = row.baseStep * (e.shiftKey ? SHIFT_MULTIPLIER : 1);
        const nextVal = e.key === 'ArrowUp' ? baseVal + delta : baseVal - delta;

        setActiveDraft(null);
        applyAxisValue(row.channel, axis, nextVal, false);
      } else if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        setActiveDraft(null);
        scaleAnchorRef.current = null;
      }
    },
    [activeDraft, applyAxisValue, currentState, disabled]
  );

  const handleAxisBlur = useCallback(() => {
    setActiveDraft(null);
    scaleAnchorRef.current = null;
  }, []);

  const handleToggleScaleLock = useCallback(() => {
    setActiveDraft(null);
    scaleAnchorRef.current = null;
    commitState({
      ...currentState,
      scaleLocked: !currentState.scaleLocked,
    });
  }, [commitState, currentState]);

  const handleResetRow = useCallback(
    (channel: TransformChannel, identity: Vector3D) => {
      setActiveDraft(null);
      scaleAnchorRef.current = null;
      commitState(setChannelVector(currentState, channel, { ...identity }));
    },
    [commitState, currentState]
  );

  const handleResetAll = useCallback(() => {
    setActiveDraft(null);
    scaleAnchorRef.current = null;
    commitState({
      position: { ...ZERO_VECTOR },
      rotation: { ...ZERO_VECTOR },
      scale: { ...UNIT_SCALE_VECTOR },
      scaleLocked: currentState.scaleLocked,
    });
  }, [commitState, currentState.scaleLocked]);

  const isPositionIdentity = vectorsEqual(currentState.position, ZERO_VECTOR);
  const isRotationIdentity = vectorsEqual(currentState.rotation, ZERO_VECTOR);
  const isScaleIdentity = vectorsEqual(currentState.scale, UNIT_SCALE_VECTOR);
  const isAllIdentity = isPositionIdentity && isRotationIdentity && isScaleIdentity;

  const telemetryText = formatTelemetry(currentState, safeUnit);

  const merged = mergeProps({
    themeTarget: themeProps('transform-inspector', {
      disabled,
      scaleLocked: currentState.scaleLocked ? 'true' : 'false',
    }),
    baseClassName: 'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 space-y-3.5',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('transform-inspector', 'header');
  const rowsClass = stableClassName('transform-inspector', 'rows');
  const rowClass = stableClassName('transform-inspector', 'row');
  const telemetryClass = stableClassName('transform-inspector', 'telemetry');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={title}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Inspector Header */}
      <div className={cx(headerClass, 'flex flex-wrap items-center justify-between gap-2 min-w-0')}>
        <div className="flex items-center gap-2 min-w-0">
          <Box
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={{
              color: disabled ? 'var(--prism-text-disabled)' : 'var(--prism-primary-main)',
            }}
          />
          <span
            data-testid="transform-inspector-title"
            className="text-sm font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {title}
          </span>
        </div>

        <button
          type="button"
          disabled={disabled || isAllIdentity}
          aria-label="Reset all transform values"
          data-testid="transform-reset-all"
          onClick={handleResetAll}
          className={cx(
            'prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity shrink-0 cursor-pointer disabled:cursor-not-allowed',
            disabled || isAllIdentity ? 'opacity-45' : ''
          )}
          style={STYLE_TEXT_PRIMARY}
        >
          <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
          <span>Reset All</span>
        </button>
      </div>

      {/* Transform Rows: Position, Rotation (°), Scale */}
      <div className={cx(rowsClass, 'space-y-2.5 min-w-0 max-w-full')}>
        {TRANSFORM_ROWS.map((row) => {
          const rowVector = getChannelVector(currentState, row.channel);
          const isRowIdentity = vectorsEqual(rowVector, row.identity);

          return (
            <div
              key={row.channel}
              role="group"
              aria-label={row.heading}
              data-testid={`transform-row-${row.channel}`}
              className={cx(
                rowClass,
                'prism-crystal rounded-2xl p-2.5 sm:p-3 space-y-2 min-w-0 max-w-full'
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="text-xs font-semibold tracking-tight truncate"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {row.heading}
                  </span>
                  {row.channel === 'position' && safeUnit ? (
                    <span
                      data-testid="transform-position-unit"
                      className="prism-well px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold shrink-0"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {safeUnit}
                    </span>
                  ) : null}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {row.channel === 'scale' ? (
                    <button
                      type="button"
                      disabled={disabled}
                      aria-pressed={currentState.scaleLocked}
                      aria-label="Lock uniform scale aspect ratio"
                      data-testid="transform-scale-lock"
                      data-locked={currentState.scaleLocked ? 'true' : 'false'}
                      onClick={handleToggleScaleLock}
                      className={cx(
                        currentState.scaleLocked ? 'prism-btn-primary' : 'prism-crystal',
                        'prism-focus-ring inline-flex items-center justify-center w-7 h-7 rounded-full transition-opacity shrink-0 cursor-pointer disabled:cursor-not-allowed',
                        disabled ? 'opacity-45' : ''
                      )}
                      style={
                        currentState.scaleLocked
                          ? undefined
                          : { color: 'var(--prism-text-secondary)' }
                      }
                    >
                      {currentState.scaleLocked ? (
                        <Link2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Unlink2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    disabled={disabled || isRowIdentity}
                    aria-label={row.resetAriaLabel}
                    data-testid={`transform-reset-${row.channel}`}
                    onClick={() => handleResetRow(row.channel, row.identity)}
                    className={cx(
                      'prism-crystal prism-focus-ring inline-flex items-center justify-center w-7 h-7 rounded-full transition-opacity shrink-0 cursor-pointer disabled:cursor-not-allowed',
                      disabled || isRowIdentity ? 'opacity-45' : ''
                    )}
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 min-w-0 max-w-full">
                {AXIS_META_LIST.map((axisMeta) => {
                  const inputId = `transform-${safeUid}-${row.channel}-${axisMeta.axis}`;
                  const axisValue = getVectorAxis(rowVector, axisMeta.axis);
                  const isEditingThisInput =
                    activeDraft !== null &&
                    activeDraft.channel === row.channel &&
                    activeDraft.axis === axisMeta.axis;
                  const inputText = isEditingThisInput ? activeDraft.text : String(axisValue);

                  return (
                    <div
                      key={axisMeta.axis}
                      data-testid={`transform-well-${row.channel}-${axisMeta.axis}`}
                      data-axis={axisMeta.axis}
                      className={cx(
                        'prism-well rounded-xl h-9 px-2 flex items-center gap-1.5 flex-1 basis-24 min-w-0 max-w-full transition-opacity',
                        disabled ? 'opacity-50' : ''
                      )}
                    >
                      <span
                        aria-hidden="true"
                        data-testid={`transform-accent-${row.channel}-${axisMeta.axis}`}
                        className="w-1 h-4 rounded-full shrink-0"
                        style={{ backgroundColor: axisMeta.colorToken }}
                      />
                      <label
                        htmlFor={inputId}
                        data-testid={`transform-label-${row.channel}-${axisMeta.axis}`}
                        className="font-mono text-[11px] font-bold uppercase tracking-wider select-none shrink-0"
                        style={{ color: axisMeta.colorToken }}
                      >
                        {axisMeta.label}
                      </label>
                      <input
                        id={inputId}
                        type="text"
                        inputMode="decimal"
                        role="spinbutton"
                        aria-label={`${row.accessiblePrefix} ${axisMeta.label}`}
                        aria-valuenow={axisValue}
                        aria-valuemin={-MAX_ABS_AXIS_VALUE}
                        aria-valuemax={MAX_ABS_AXIS_VALUE}
                        aria-valuetext={formatValueText(row.channel, axisValue, safeUnit)}
                        data-testid={`transform-input-${row.channel}-${axisMeta.axis}`}
                        value={inputText}
                        disabled={disabled}
                        onFocus={() => handleAxisFocus(row.channel)}
                        onChange={(e) => handleAxisChange(e, row.channel, axisMeta.axis)}
                        onKeyDown={(e) => handleAxisKeyDown(e, row, axisMeta.axis)}
                        onBlur={handleAxisBlur}
                        className="prism-focus-ring w-full min-w-0 bg-transparent text-right font-mono text-xs sm:text-sm font-semibold tabular-nums rounded-md focus:outline-none disabled:cursor-not-allowed"
                        style={STYLE_TEXT_PRIMARY}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compact Live CSS / 3D Telemetry Bar */}
      <div
        className={cx(
          telemetryClass,
          'prism-well rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 max-w-full'
        )}
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-testid="transform-telemetry"
          className="font-mono text-[11px] sm:text-xs font-medium tabular-nums break-all min-w-0"
          style={STYLE_TEXT_PRIMARY}
        >
          {telemetryText}
        </div>
        <span
          data-testid="transform-scale-mode-badge"
          className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold shrink-0"
          style={{
            color: currentState.scaleLocked
              ? 'var(--prism-primary-main)'
              : 'var(--prism-text-secondary)',
          }}
        >
          {currentState.scaleLocked ? 'Uniform' : 'Free'}
        </span>
      </div>
    </div>
  );
}

export const TransformInspector = memo(TransformInspectorInner);
TransformInspector.displayName = 'TransformInspector';
