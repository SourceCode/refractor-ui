'use client';

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryLow,
  Bluetooth,
  BluetoothOff,
  Clock,
  Globe,
  Keyboard,
  Volume1,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import type { BaseProps, OpticalStyleTokens } from '../BaseProps';
import { useControllableState } from '../hooks/useControllableState';
import { useMergedRefs } from '../hooks/useMergedRefs';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_BORDER_DIVIDER_TEXT_PRIMARY, STYLE_BORDER_DIVIDER_TEXT_SECONDARY, STYLE_SECONDARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type SystemTrayIndicatorId =
  | 'wifi'
  | 'bluetooth'
  | 'battery'
  | 'volume'
  | 'keyboard'
  | 'clock';

export type KeyboardLayoutCode = 'US' | 'UK' | 'DE' | 'JP';

export interface SystemTrayState {
  wifiEnabled: boolean;
  wifiNetwork: string;
  bluetoothEnabled: boolean;
  bluetoothDevice: string;
  batteryPct: number;
  charging: boolean;
  lowPowerMode: boolean;
  volumePct: number;
  muted: boolean;
  keyboardLayout: KeyboardLayoutCode;
  clockLabel: string;
  dateLabel: string;
  utcLabel: string;
}

type SystemTrayClusterBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SystemTrayClusterProps extends SystemTrayClusterBaseProps {
  /** Controlled complete system tray hardware and status state. */
  value?: SystemTrayState;
  /** Uncontrolled initial partial overrides merged with `DEFAULT_SYSTEM_TRAY_STATE`. */
  defaultValue?: Partial<SystemTrayState>;
  /** Controlled active indicator popover identifier (`null` closes any open popover). */
  openIndicator?: SystemTrayIndicatorId | null;
  /** Uncontrolled initial active indicator popover identifier (defaults to `null`). */
  defaultOpenIndicator?: SystemTrayIndicatorId | null;
  /** Callback invoked with the complete normalized next `SystemTrayState` when any setting changes. */
  onChange?: (state: SystemTrayState) => void;
  /** Callback invoked whenever an indicator popover opens, switches, or dismisses. */
  onOpenIndicatorChange?: (indicator: SystemTrayIndicatorId | null) => void;
  /** Disables all tray indicator triggers and suppresses popover display (defaults to `false`). */
  disabled?: boolean;
}

interface IndicatorMeta {
  label: string;
  shortTag: string;
}

interface KeyboardLayoutOption {
  code: KeyboardLayoutCode;
  name: string;
}

interface TraySwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  accentToken: string;
  onToggle: () => void;
  testId: string;
}

export const DEFAULT_SYSTEM_TRAY_STATE: SystemTrayState = {
  wifiEnabled: true,
  wifiNetwork: 'Prism Studio 6E',
  bluetoothEnabled: true,
  bluetoothDevice: 'Refractor Studio Pods',
  batteryPct: 84,
  charging: false,
  lowPowerMode: false,
  volumePct: 68,
  muted: false,
  keyboardLayout: 'US',
  clockLabel: '10:42 AM',
  dateLabel: 'Thu, Oct 24',
  utcLabel: '17:42 UTC',
};

const INDICATOR_ORDER: ReadonlyArray<SystemTrayIndicatorId> = [
  'wifi',
  'bluetooth',
  'battery',
  'volume',
  'keyboard',
  'clock',
];

const INDICATOR_NEIGHBORS: Record<
  SystemTrayIndicatorId,
  { prev: SystemTrayIndicatorId; next: SystemTrayIndicatorId }
> = {
  wifi: { prev: 'clock', next: 'bluetooth' },
  bluetooth: { prev: 'wifi', next: 'battery' },
  battery: { prev: 'bluetooth', next: 'volume' },
  volume: { prev: 'battery', next: 'keyboard' },
  keyboard: { prev: 'volume', next: 'clock' },
  clock: { prev: 'keyboard', next: 'wifi' },
};

const INDICATOR_META: Record<SystemTrayIndicatorId, IndicatorMeta> = {
  wifi: { label: 'Wi-Fi', shortTag: 'Wi-Fi' },
  bluetooth: { label: 'Bluetooth', shortTag: 'Bluetooth' },
  battery: { label: 'Battery', shortTag: 'Battery' },
  volume: { label: 'Volume', shortTag: 'Volume' },
  keyboard: { label: 'Keyboard Layout', shortTag: 'Keyboard' },
  clock: { label: 'Clock', shortTag: 'Clock' },
};

const KEYBOARD_LAYOUTS: ReadonlyArray<KeyboardLayoutOption> = [
  { code: 'US', name: 'U.S. English' },
  { code: 'UK', name: 'British English' },
  { code: 'DE', name: 'German (QWERTZ)' },
  { code: 'JP', name: 'Japanese (Romaji)' },
];

function normalizePercentage(raw: number): number {
  return Math.round(clampNumber(raw, 0, 100, 0));
}

function normalizeTrayState(raw?: Partial<SystemTrayState>): SystemTrayState {
  return {
    wifiEnabled: raw?.wifiEnabled ?? DEFAULT_SYSTEM_TRAY_STATE.wifiEnabled,
    wifiNetwork: raw?.wifiNetwork ?? DEFAULT_SYSTEM_TRAY_STATE.wifiNetwork,
    bluetoothEnabled:
      raw?.bluetoothEnabled ?? DEFAULT_SYSTEM_TRAY_STATE.bluetoothEnabled,
    bluetoothDevice:
      raw?.bluetoothDevice ?? DEFAULT_SYSTEM_TRAY_STATE.bluetoothDevice,
    batteryPct: normalizePercentage(
      raw?.batteryPct ?? DEFAULT_SYSTEM_TRAY_STATE.batteryPct
    ),
    charging: raw?.charging ?? DEFAULT_SYSTEM_TRAY_STATE.charging,
    lowPowerMode: raw?.lowPowerMode ?? DEFAULT_SYSTEM_TRAY_STATE.lowPowerMode,
    volumePct: normalizePercentage(
      raw?.volumePct ?? DEFAULT_SYSTEM_TRAY_STATE.volumePct
    ),
    muted: raw?.muted ?? DEFAULT_SYSTEM_TRAY_STATE.muted,
    keyboardLayout:
      raw?.keyboardLayout ?? DEFAULT_SYSTEM_TRAY_STATE.keyboardLayout,
    clockLabel: raw?.clockLabel ?? DEFAULT_SYSTEM_TRAY_STATE.clockLabel,
    dateLabel: raw?.dateLabel ?? DEFAULT_SYSTEM_TRAY_STATE.dateLabel,
    utcLabel: raw?.utcLabel ?? DEFAULT_SYSTEM_TRAY_STATE.utcLabel,
  };
}

function getBatteryAccentVar(
  batteryPct: number,
  charging: boolean,
  lowPowerMode: boolean
): string {
  if (lowPowerMode) {
    return 'var(--prism-warning-main)';
  }
  if (charging) {
    return 'var(--prism-success-main)';
  }
  if (batteryPct <= 20) {
    return 'var(--prism-error-main)';
  }
  return 'var(--prism-success-main)';
}

function getVolumeAccentVar(volumePct: number, muted: boolean): string {
  if (muted || volumePct === 0) {
    return 'var(--prism-text-disabled)';
  }
  return 'var(--prism-secondary-main)';
}

function TraySwitchRow({
  label,
  description,
  checked,
  accentToken,
  onToggle,
  testId,
}: TraySwitchRowProps) {
  return (
    <div
      className="prism-well rounded-xl px-3 py-2.5 flex items-center justify-between gap-3 border min-w-0"
      style={STYLE_BORDER_DIVIDER}
    >
      <div className="flex flex-col min-w-0">
        <span
          className="text-xs font-semibold truncate"
          style={STYLE_TEXT_PRIMARY}
        >
          {label}
        </span>
        <span
          className="text-[11px] truncate"
          style={STYLE_TEXT_SECONDARY}
        >
          {description}
        </span>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        data-testid={testId}
        onClick={onToggle}
        className="prism-focus-ring relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border cursor-pointer transition-colors p-0.5"
        style={{
          backgroundColor: checked
            ? accentToken
            : 'color-mix(in srgb, var(--prism-text-secondary) 24%, transparent)',
          borderColor: checked ? accentToken : 'var(--prism-divider)',
        }}
      >
        <span
          aria-hidden="true"
          className={cx(
            'prism-thumb block h-4 w-4 rounded-full transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
    </div>
  );
}

const barClass = /*#__PURE__*/ stableClassName('system-tray-cluster', 'bar');
const toolbarClass = /*#__PURE__*/ stableClassName('system-tray-cluster', 'toolbar');
const triggerClass = /*#__PURE__*/ stableClassName('system-tray-cluster', 'trigger');
const popoverClass = /*#__PURE__*/ stableClassName('system-tray-cluster', 'popover');
const statusBarClass = /*#__PURE__*/ stableClassName('system-tray-cluster', 'status-bar');

function SystemTrayClusterInner({
  value,
  defaultValue,
  openIndicator,
  defaultOpenIndicator = null,
  onChange,
  onOpenIndicatorChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SystemTrayClusterProps) {
  const popoverId = useId();
  const popoverTitleId = useId();
  const override = useComponentOverride('SystemTrayCluster');

  const initialDefaultState = useMemo(
    () => normalizeTrayState(defaultValue),
    [defaultValue]
  );
  const controlledState = useMemo(
    () => (value !== undefined ? normalizeTrayState(value) : undefined),
    [value]
  );

  const [state, setState] = useControllableState<SystemTrayState>({
    value: controlledState,
    defaultValue: initialDefaultState,
    onChange,
  });

  const [openIndicatorState, setOpenIndicatorState] =
    useControllableState<SystemTrayIndicatorId | null>({
      value: openIndicator,
      defaultValue: defaultOpenIndicator,
      onChange: onOpenIndicatorChange,
    });

  const [rovingIndicator, setRovingIndicator] = useState<SystemTrayIndicatorId>(
    defaultOpenIndicator ?? 'wifi'
  );
  const [statusAnnouncement, setStatusAnnouncement] = useState<string | null>(
    null
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const mergedRef = useMergedRefs<HTMLDivElement>(rootRef, ref);
  const triggerRefs = useRef<Map<SystemTrayIndicatorId, HTMLButtonElement>>(
    new Map()
  );

  const activeIndicator: SystemTrayIndicatorId | null = disabled
    ? null
    : openIndicatorState;
  const activeRovingId: SystemTrayIndicatorId =
    activeIndicator ?? rovingIndicator;

  const wifiNetworkLabel = state.wifiNetwork.trim() || 'Unnamed Network';
  const bluetoothDeviceLabel =
    state.bluetoothDevice.trim() || 'No Device Paired';
  const clockDisplay =
    state.clockLabel.trim() || DEFAULT_SYSTEM_TRAY_STATE.clockLabel;
  const dateDisplay =
    state.dateLabel.trim() || DEFAULT_SYSTEM_TRAY_STATE.dateLabel;
  const utcDisplay =
    state.utcLabel.trim() || DEFAULT_SYSTEM_TRAY_STATE.utcLabel;

  const batteryAccent = getBatteryAccentVar(
    state.batteryPct,
    state.charging,
    state.lowPowerMode
  );
  const volumeAccent = getVolumeAccentVar(state.volumePct, state.muted);

  const registerTriggerNode = useCallback(
    (id: SystemTrayIndicatorId, node: HTMLButtonElement | null) => {
      if (node) {
        triggerRefs.current.set(id, node);
      } else {
        triggerRefs.current.delete(id);
      }
    },
    []
  );

  // Dismiss cleanly on outside pointerdown or IME-safe Escape, restoring focus and cleaning up listeners.
  useEffect(() => {
    if (activeIndicator === null) {
      return undefined;
    }

    const handleWindowPointerDown = (event: PointerEvent) => {
      if (
        rootRef.current &&
        event.target instanceof Node &&
        !rootRef.current.contains(event.target)
      ) {
        setOpenIndicatorState(null);
        setStatusAnnouncement(
          `${INDICATOR_META[activeIndicator].label} popover closed`
        );
      }
    };

    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) {
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        const triggerToFocus = activeIndicator;
        setOpenIndicatorState(null);
        setStatusAnnouncement(
          `${INDICATOR_META[triggerToFocus].label} popover closed`
        );
        triggerRefs.current.get(triggerToFocus)?.focus();
      }
    };

    window.addEventListener('pointerdown', handleWindowPointerDown);
    window.addEventListener('keydown', handleWindowKeyDown);

    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, [activeIndicator, setOpenIndicatorState]);

  const commitState = useCallback(
    (nextState: SystemTrayState, announcement: string) => {
      setState(nextState);
      setStatusAnnouncement(announcement);
    },
    [setState]
  );

  const handleTriggerClick = useCallback(
    (id: SystemTrayIndicatorId) => {
      setRovingIndicator(id);
      if (activeIndicator === id) {
        setOpenIndicatorState(null);
        setStatusAnnouncement(`${INDICATOR_META[id].label} popover closed`);
      } else {
        setOpenIndicatorState(id);
        setStatusAnnouncement(`${INDICATOR_META[id].label} popover opened`);
      }
    },
    [activeIndicator, setOpenIndicatorState]
  );

  const handleTriggerKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      id: SystemTrayIndicatorId
    ) => {
      if (disabled || event.nativeEvent.isComposing) {
        return;
      }

      let nextId: SystemTrayIndicatorId;
      switch (event.key) {
        case 'ArrowRight':
          nextId = INDICATOR_NEIGHBORS[id].next;
          break;
        case 'ArrowLeft':
          nextId = INDICATOR_NEIGHBORS[id].prev;
          break;
        case 'Home':
          nextId = 'wifi';
          break;
        case 'End':
          nextId = 'clock';
          break;
        default:
          return;
      }

      event.preventDefault();
      setRovingIndicator(nextId);
      triggerRefs.current.get(nextId)?.focus();
    },
    [disabled]
  );

  const handleToggleWifi = useCallback(() => {
    const nextEnabled = !state.wifiEnabled;
    commitState(
      { ...state, wifiEnabled: nextEnabled },
      nextEnabled
        ? `Wi-Fi turned on (${wifiNetworkLabel})`
        : 'Wi-Fi turned off'
    );
  }, [commitState, state, wifiNetworkLabel]);

  const handleToggleBluetooth = useCallback(() => {
    const nextEnabled = !state.bluetoothEnabled;
    commitState(
      { ...state, bluetoothEnabled: nextEnabled },
      nextEnabled
        ? `Bluetooth turned on (${bluetoothDeviceLabel})`
        : 'Bluetooth turned off'
    );
  }, [bluetoothDeviceLabel, commitState, state]);

  const handleToggleLowPower = useCallback(() => {
    const nextLowPower = !state.lowPowerMode;
    commitState(
      { ...state, lowPowerMode: nextLowPower },
      `Low Power Mode turned ${nextLowPower ? 'on' : 'off'}`
    );
  }, [commitState, state]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !state.muted;
    commitState(
      { ...state, muted: nextMuted },
      nextMuted ? 'Audio muted' : `Audio unmuted (${state.volumePct}%)`
    );
  }, [commitState, state]);

  const handleVolumeChange = useCallback(
    (event: ReactChangeEvent<HTMLInputElement>) => {
      const nextVolume = normalizePercentage(Number(event.target.value));
      const nextMuted = state.muted && nextVolume > 0 ? false : state.muted;
      commitState(
        { ...state, volumePct: nextVolume, muted: nextMuted },
        `Volume set to ${nextVolume}%`
      );
    },
    [commitState, state]
  );

  const handleSelectKeyboardLayout = useCallback(
    (layout: KeyboardLayoutOption) => {
      commitState(
        { ...state, keyboardLayout: layout.code },
        `Keyboard layout switched to ${layout.code} (${layout.name})`
      );
    },
    [commitState, state]
  );

  const merged = mergeProps({
    themeTarget: themeProps('system-tray-cluster', {
      open: activeIndicator !== null,
      activeIndicator: activeIndicator ?? undefined,
      disabled,
      wifi: state.wifiEnabled ? 'on' : 'off',
      bluetooth: state.bluetoothEnabled ? 'on' : 'off',
      lowPower: state.lowPowerMode,
      muted: state.muted,
    }),
    baseClassName:
      'prism-slab relative flex flex-col w-full max-w-full min-w-0 select-none',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const defaultStatusMessage = activeIndicator
    ? `${INDICATOR_META[activeIndicator].label} popover open`
    : `System tray ready · Battery ${state.batteryPct}% · ${clockDisplay}`;
  const liveStatusMessage = statusAnnouncement ?? defaultStatusMessage;

  const getTriggerStyle = (
    id: SystemTrayIndicatorId,
    isOpen: boolean
  ): OpticalStyleTokens => {
    if (isOpen) {
      return {
        borderColor: 'var(--prism-primary-main)',
        backgroundColor:
          'color-mix(in srgb, var(--prism-primary-main) 16%, transparent)',
        color: 'var(--prism-primary-main)',
      };
    }

    const baseColor = disabled
      ? 'var(--prism-text-disabled)'
      : 'var(--prism-text-primary)';

    if (id === 'battery' && !disabled && (state.lowPowerMode || state.batteryPct <= 20)) {
      return {
        borderColor: `color-mix(in srgb, ${batteryAccent} 45%, var(--prism-divider))`,
        color: baseColor,
      };
    }

    return {
      borderColor: 'var(--prism-divider)',
      color: baseColor,
    };
  };

  const renderIndicatorTriggerContent = (
    id: SystemTrayIndicatorId,
    isOpen: boolean
  ) => {
    switch (id) {
      case 'wifi': {
        const Icon = state.wifiEnabled ? Wifi : WifiOff;
        return (
          <Icon
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={{
              color: isOpen
                ? 'var(--prism-primary-main)'
                : state.wifiEnabled
                  ? 'var(--prism-secondary-main)'
                  : 'var(--prism-text-disabled)',
            }}
          />
        );
      }
      case 'bluetooth': {
        const Icon = state.bluetoothEnabled ? Bluetooth : BluetoothOff;
        return (
          <Icon
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={{
              color: isOpen
                ? 'var(--prism-primary-main)'
                : state.bluetoothEnabled
                  ? 'var(--prism-info-main)'
                  : 'var(--prism-text-disabled)',
            }}
          />
        );
      }
      case 'battery': {
        const Icon = state.charging
          ? BatteryCharging
          : state.batteryPct <= 20
            ? BatteryLow
            : Battery;
        return (
          <>
            <Icon
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{
                color: isOpen ? 'var(--prism-primary-main)' : batteryAccent,
              }}
            />
            <span className="tabular-nums text-[11px] font-semibold leading-none">
              {state.batteryPct}%
            </span>
          </>
        );
      }
      case 'volume': {
        const Icon =
          state.muted || state.volumePct === 0
            ? VolumeX
            : state.volumePct < 50
              ? Volume1
              : Volume2;
        return (
          <Icon
            aria-hidden="true"
            className="w-3.5 h-3.5 shrink-0"
            style={{
              color: isOpen ? 'var(--prism-primary-main)' : volumeAccent,
            }}
          />
        );
      }
      case 'keyboard':
        return (
          <>
            <Keyboard
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{
                color: isOpen
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
              }}
            />
            <span className="font-mono text-[11px] font-semibold leading-none tracking-tight">
              {state.keyboardLayout}
            </span>
          </>
        );
      case 'clock':
        return (
          <>
            <Clock
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{
                color: isOpen
                  ? 'var(--prism-primary-main)'
                  : 'var(--prism-text-secondary)',
              }}
            />
            <span className="tabular-nums text-[11px] font-semibold leading-none whitespace-nowrap">
              {clockDisplay}
            </span>
          </>
        );
    }
  };

  const getTriggerAriaLabel = (id: SystemTrayIndicatorId): string => {
    switch (id) {
      case 'wifi':
        return `Wi-Fi: ${state.wifiEnabled ? wifiNetworkLabel : 'Off'}`;
      case 'bluetooth':
        return `Bluetooth: ${state.bluetoothEnabled ? bluetoothDeviceLabel : 'Off'}`;
      case 'battery':
        return `Battery: ${state.batteryPct}%${state.charging ? ', charging' : ''}${state.lowPowerMode ? ', low power mode' : ''}`;
      case 'volume':
        return `Volume: ${state.muted ? 'Muted' : `${state.volumePct}%`}`;
      case 'keyboard':
        return `Keyboard Layout: ${state.keyboardLayout}`;
      case 'clock':
        return `Clock: ${clockDisplay}`;
    }
  };

  const renderPopoverBody = (indicator: SystemTrayIndicatorId) => {
    switch (indicator) {
      case 'wifi':
        return (
          <div className="flex flex-col gap-2.5 min-w-0">
            <TraySwitchRow
              label="Wi-Fi"
              description={state.wifiEnabled ? 'Connected' : 'Disconnected'}
              checked={state.wifiEnabled}
              accentToken="var(--prism-secondary-main)"
              onToggle={handleToggleWifi}
              testId="system-tray-wifi-switch"
            />
            <div
              className="prism-well rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 border min-w-0"
              style={STYLE_BORDER_DIVIDER}
            >
              <div className="flex flex-col min-w-0">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Active Network
                </span>
                <span
                  data-testid="system-tray-wifi-network"
                  className="text-xs font-semibold truncate"
                  style={{
                    color: state.wifiEnabled
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-disabled)',
                  }}
                >
                  {state.wifiEnabled ? wifiNetworkLabel : 'Not connected'}
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border"
                style={{
                  color: state.wifiEnabled
                    ? 'var(--prism-success-main)'
                    : 'var(--prism-text-disabled)',
                  borderColor: state.wifiEnabled
                    ? 'color-mix(in srgb, var(--prism-success-main) 44%, var(--prism-divider))'
                    : 'var(--prism-divider)',
                  backgroundColor: state.wifiEnabled
                    ? 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)'
                    : 'transparent',
                }}
              >
                {state.wifiEnabled ? 'Online' : 'Off'}
              </span>
            </div>
          </div>
        );

      case 'bluetooth':
        return (
          <div className="flex flex-col gap-2.5 min-w-0">
            <TraySwitchRow
              label="Bluetooth"
              description={state.bluetoothEnabled ? 'Discoverable' : 'Disabled'}
              checked={state.bluetoothEnabled}
              accentToken="var(--prism-info-main)"
              onToggle={handleToggleBluetooth}
              testId="system-tray-bluetooth-switch"
            />
            <div
              className="prism-well rounded-xl px-3 py-2.5 flex items-center justify-between gap-2 border min-w-0"
              style={STYLE_BORDER_DIVIDER}
            >
              <div className="flex flex-col min-w-0">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider"
                  style={STYLE_TEXT_SECONDARY}
                >
                  Connected Device
                </span>
                <span
                  data-testid="system-tray-bluetooth-device"
                  className="text-xs font-semibold truncate"
                  style={{
                    color: state.bluetoothEnabled
                      ? 'var(--prism-text-primary)'
                      : 'var(--prism-text-disabled)',
                  }}
                >
                  {state.bluetoothEnabled
                    ? bluetoothDeviceLabel
                    : 'Disconnected'}
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 border"
                style={{
                  color: state.bluetoothEnabled
                    ? 'var(--prism-info-main)'
                    : 'var(--prism-text-disabled)',
                  borderColor: state.bluetoothEnabled
                    ? 'color-mix(in srgb, var(--prism-info-main) 44%, var(--prism-divider))'
                    : 'var(--prism-divider)',
                  backgroundColor: state.bluetoothEnabled
                    ? 'color-mix(in srgb, var(--prism-info-main) 14%, transparent)'
                    : 'transparent',
                }}
              >
                {state.bluetoothEnabled ? 'Paired' : 'Off'}
              </span>
            </div>
          </div>
        );

      case 'battery':
        return (
          <div className="flex flex-col gap-2.5 min-w-0">
            <div
              className="prism-well rounded-xl px-3 py-2.5 flex flex-col gap-2 border min-w-0"
              style={STYLE_BORDER_DIVIDER}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span
                  data-testid="system-tray-battery-pct"
                  className="tabular-nums text-2xl font-bold tracking-tight"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {state.batteryPct}%
                </span>
                <span
                  data-testid="system-tray-battery-charging-badge"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0"
                  style={{
                    color: state.charging
                      ? 'var(--prism-success-main)'
                      : state.lowPowerMode
                        ? 'var(--prism-warning-main)'
                        : 'var(--prism-text-secondary)',
                    borderColor: state.charging
                      ? 'color-mix(in srgb, var(--prism-success-main) 44%, var(--prism-divider))'
                      : state.lowPowerMode
                        ? 'color-mix(in srgb, var(--prism-warning-main) 44%, var(--prism-divider))'
                        : 'var(--prism-divider)',
                    backgroundColor: state.charging
                      ? 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)'
                      : state.lowPowerMode
                        ? 'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)'
                        : 'transparent',
                  }}
                >
                  {state.charging ? (
                    <Zap aria-hidden="true" className="w-3 h-3 shrink-0" />
                  ) : null}
                  <span>{state.charging ? 'Charging' : 'On Battery'}</span>
                </span>
              </div>

              <div
                role="progressbar"
                aria-label="Battery charge level"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={state.batteryPct}
                aria-valuetext={`${state.batteryPct}%${state.charging ? ', charging' : ''}`}
                data-testid="system-tray-battery-progressbar"
                className="prism-well h-2.5 w-full rounded-full overflow-hidden p-0.5 border"
                style={STYLE_BORDER_DIVIDER}
              >
                <div
                  data-testid="system-tray-battery-fill"
                  className="h-full rounded-full transition-[color,background-color,border-color,opacity,transform]"
                  style={{
                    width: `${state.batteryPct}%`,
                    backgroundColor: batteryAccent,
                  }}
                />
              </div>
            </div>

            <TraySwitchRow
              label="Low Power Mode"
              description={
                state.lowPowerMode
                  ? 'Conserving optical telemetry'
                  : 'Standard performance'
              }
              checked={state.lowPowerMode}
              accentToken="var(--prism-warning-main)"
              onToggle={handleToggleLowPower}
              testId="system-tray-low-power-switch"
            />
          </div>
        );

      case 'volume':
        return (
          <div className="flex flex-col gap-2.5 min-w-0">
            <div
              className="prism-well rounded-xl px-3 py-2.5 flex flex-col gap-2.5 border min-w-0"
              style={STYLE_BORDER_DIVIDER}
            >
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span
                  data-testid="system-tray-volume-readout"
                  className="tabular-nums text-sm font-bold"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {state.muted ? 'Muted' : `${state.volumePct}%`}
                </span>
                <button
                  type="button"
                  aria-pressed={state.muted}
                  data-testid="system-tray-mute-button"
                  onClick={handleToggleMute}
                  className="prism-focus-ring inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors shrink-0"
                  style={
                    state.muted
                      ? {
                          borderColor: 'var(--prism-primary-main)',
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-primary-main) 16%, transparent)',
                          color: 'var(--prism-primary-main)',
                        }
                      : STYLE_BORDER_DIVIDER_TEXT_PRIMARY
                  }
                >
                  {state.muted ? (
                    <VolumeX aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Volume2 aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>Mute</span>
                </button>
              </div>

              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={state.volumePct}
                aria-label="System tray volume"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={state.volumePct}
                data-testid="system-tray-volume-slider"
                onChange={handleVolumeChange}
                className="prism-focus-ring w-full cursor-pointer"
                style={{
                  accentColor: state.muted
                    ? 'var(--prism-text-disabled)'
                    : 'var(--prism-primary-main)',
                }}
              />
            </div>
          </div>
        );

      case 'keyboard':
        return (
          <div
            data-testid="system-tray-keyboard-grid"
            className="grid grid-cols-2 gap-2 min-w-0"
          >
            {KEYBOARD_LAYOUTS.map((layout) => {
              const isSelected = state.keyboardLayout === layout.code;
              return (
                <button
                  key={layout.code}
                  type="button"
                  aria-pressed={isSelected}
                  data-layout={layout.code}
                  data-testid={`system-tray-layout-${layout.code}`}
                  onClick={() => handleSelectKeyboardLayout(layout)}
                  className={cx(
                    'prism-focus-ring rounded-xl px-2.5 py-2 border flex flex-col items-start gap-0.5 text-left cursor-pointer transition-colors min-w-0',
                    isSelected ? 'shadow-sm' : 'prism-well'
                  )}
                  style={
                    isSelected
                      ? {
                          borderColor: 'var(--prism-primary-main)',
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-primary-main) 16%, transparent)',
                          color: 'var(--prism-primary-main)',
                        }
                      : STYLE_BORDER_DIVIDER_TEXT_PRIMARY
                  }
                >
                  <span className="font-mono text-xs font-bold tracking-tight">
                    {layout.code}
                  </span>
                  <span
                    className="text-[10px] truncate w-full"
                    style={{
                      color: isSelected
                        ? 'var(--prism-primary-main)'
                        : 'var(--prism-text-secondary)',
                    }}
                  >
                    {layout.name}
                  </span>
                </button>
              );
            })}
          </div>
        );

      case 'clock':
        return (
          <div
            className="prism-well rounded-xl p-3 flex flex-col gap-2 border min-w-0"
            style={STYLE_BORDER_DIVIDER}
          >
            <span
              data-testid="system-tray-clock-time"
              className="tabular-nums text-2xl font-bold tracking-tight leading-none"
              style={STYLE_TEXT_PRIMARY}
            >
              {clockDisplay}
            </span>
            <span
              data-testid="system-tray-clock-date"
              className="text-xs font-medium"
              style={STYLE_TEXT_SECONDARY}
            >
              {dateDisplay}
            </span>
            <div
              className="pt-2 mt-0.5 border-t flex items-center justify-between gap-2 text-[11px] min-w-0"
              style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
            >
              <span className="inline-flex items-center gap-1.5 shrink-0">
                <Globe
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_SECONDARY_MAIN}
                />
                <span>Universal Time</span>
              </span>
              <span
                data-testid="system-tray-clock-utc"
                className="font-mono tabular-nums font-semibold truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {utcDisplay}
              </span>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      ref={mergedRef}
      role="region"
      aria-label="System tray cluster"
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Compact Right-Aligned Optical OS Menu-Bar Status Cluster */}
      <div
        data-part="bar"
        className={cx(
          barClass,
          'prism-crystal relative flex flex-wrap items-center justify-end gap-2 px-3 py-2 min-w-0 max-w-full rounded-t-[inherit] border-b'
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

        <div
          role="toolbar"
          aria-label="System tray indicators"
          data-part="toolbar"
          className={cx(
            toolbarClass,
            'flex flex-wrap items-center justify-end gap-1.5 min-w-0 max-w-full'
          )}
        >
          {INDICATOR_ORDER.map((id) => {
            const isOpen = activeIndicator === id;
            const isRoving = activeRovingId === id;

            return (
              <button
                key={id}
                ref={(node) => registerTriggerNode(id, node)}
                type="button"
                disabled={disabled}
                tabIndex={isRoving ? 0 : -1}
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-controls={isOpen ? popoverId : undefined}
                aria-label={getTriggerAriaLabel(id)}
                data-part="trigger"
                data-indicator={id}
                data-testid={`system-tray-trigger-${id}`}
                onFocus={() => setRovingIndicator(id)}
                onClick={() => handleTriggerClick(id)}
                onKeyDown={(event) => handleTriggerKeyDown(event, id)}
                className={cx(
                  triggerClass,
                  'prism-focus-ring h-8 px-2 rounded-lg border inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:cursor-not-allowed transition-colors',
                  isOpen ? 'shadow-sm' : 'prism-well',
                  disabled ? 'opacity-50' : ''
                )}
                style={getTriggerStyle(id, isOpen)}
              >
                {renderIndicatorTriggerContent(id, isOpen)}
              </button>
            );
          })}
        </div>

        {/* Dedicated Viewport-Clamped Popover */}
        {activeIndicator !== null ? (
          <div
            id={popoverId}
            role="dialog"
            aria-labelledby={popoverTitleId}
            data-part="popover"
            data-indicator={activeIndicator}
            data-testid="system-tray-popover"
            className={cx(
              popoverClass,
              'prism-slab absolute right-3 top-full mt-2 z-30 w-[min(19rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-3.5 flex flex-col gap-3'
            )}
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--prism-divider)',
            }}
          >
            <div className="flex items-center justify-between gap-2 min-w-0">
              <h3
                id={popoverTitleId}
                className="text-[11px] font-semibold uppercase tracking-wider truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                {INDICATOR_META[activeIndicator].label}
              </h3>
              <span
                className="prism-well px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                Esc
              </span>
            </div>

            {renderPopoverBody(activeIndicator)}
          </div>
        ) : null}
      </div>

      {/* Polite Live Status Strip */}
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
          data-testid="system-tray-status"
          className="min-w-0 break-words flex-1"
        >
          {liveStatusMessage}
        </div>

        <span
          aria-hidden="true"
          data-testid="system-tray-active-tag"
          className="font-mono text-[10px] font-semibold uppercase tracking-wide shrink-0"
          style={{
            color: activeIndicator
              ? 'var(--prism-primary-main)'
              : 'var(--prism-text-disabled)',
          }}
        >
          {activeIndicator ? INDICATOR_META[activeIndicator].shortTag : 'Idle'}
        </span>
      </div>
    </div>
  );
}

export const SystemTrayCluster = /*#__PURE__*/ memoWithDisplayName(SystemTrayClusterInner, 'SystemTrayCluster');
