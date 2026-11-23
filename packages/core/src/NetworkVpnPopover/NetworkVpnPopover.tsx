'use client';

import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  AlertTriangle,
  Globe,
  Lock,
  Plane,
  Shield,
  ShieldCheck,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_BORDER_DIVIDER_TEXT_PRIMARY, STYLE_BORDER_DIVIDER_TEXT_SECONDARY, STYLE_SUCCESS_MAIN, STYLE_TEXT_DISABLED, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type WifiSecurityKind = 'wpa3' | 'wpa2' | 'open';

export interface WifiNetworkEntry {
  id: string;
  ssid: string;
  signalBars: 1 | 2 | 3 | 4;
  security: WifiSecurityKind;
  bandLabel: string;
}

export interface VpnProfileEntry {
  id: string;
  name: string;
  region: string;
  protocol: string;
}

type NetworkVpnPopoverBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface NetworkVpnPopoverProps extends NetworkVpnPopoverBaseProps {
  /** Visible heading displayed in the optical popover header (defaults to `'Network & VPN'`). */
  title?: string;
  /** List of available Wi-Fi networks (defaults to 4 realistic optical studio/lab networks). */
  networks?: ReadonlyArray<WifiNetworkEntry>;
  /** List of VPN tunnel profiles (defaults to 2 WireGuard profiles). */
  vpnProfiles?: ReadonlyArray<VpnProfileEntry>;
  /** Initial connected Wi-Fi network ID (`null` starts disconnected; defaults to `'wifi-studio-5g'` when using default networks). */
  defaultConnectedNetworkId?: string | null;
  /** Initial active VPN profile ID (`null` starts with VPN off). */
  defaultActiveVpnId?: string | null;
  /** Initial Wi-Fi radio state (defaults to `true`, overridden to `false` when `defaultAirplaneMode` is `true`). */
  defaultWifiEnabled?: boolean;
  /** Initial Airplane Mode state (defaults to `false`; when `true`, suspends Wi-Fi and active VPN immediately). */
  defaultAirplaneMode?: boolean;
  /** Callback fired when connecting to or disconnecting from a Wi-Fi network (`null` on disconnect). */
  onConnectNetwork?: (networkId: string | null) => void;
  /** Callback fired when toggling a VPN tunnel profile (`null` when tunnel disconnects). */
  onToggleVpn?: (vpnId: string | null) => void;
  /** Callback fired when Airplane Mode toggles on or off. */
  onAirplaneModeChange?: (enabled: boolean) => void;
  /** Disables all switches and network connection actions (defaults to `false`). */
  disabled?: boolean;
}

interface SignalVisual {
  token: string;
  qualityLabel: string;
}

interface SecurityVisual {
  label: string;
  token: string;
  isWarning: boolean;
}

interface ConnectionStatusSummary {
  message: string;
  badgeLabel: string;
  badgeToken: string;
}

const DEFAULT_TITLE = 'Network & VPN';
const DEFAULT_CONNECTED_NETWORK_ID = 'wifi-studio-5g';
const SIGNAL_BAR_LEVELS: ReadonlyArray<1 | 2 | 3 | 4> = [1, 2, 3, 4];
const SIGNAL_BAR_HEIGHTS: Record<1 | 2 | 3 | 4, number> = {
  1: 4,
  2: 7,
  3: 10,
  4: 13,
};

const DEFAULT_NETWORKS: ReadonlyArray<WifiNetworkEntry> = [
  {
    id: 'wifi-studio-5g',
    ssid: 'Studio-5G-Optical',
    signalBars: 4,
    security: 'wpa3',
    bandLabel: '5 GHz',
  },
  {
    id: 'wifi-refractor-6e',
    ssid: 'Refractor-Lab-6E',
    signalBars: 3,
    security: 'wpa3',
    bandLabel: '6 GHz',
  },
  {
    id: 'wifi-conference-guest',
    ssid: 'Conference-Guest',
    signalBars: 2,
    security: 'open',
    bandLabel: '2.4 GHz',
  },
  {
    id: 'wifi-mesh-extender',
    ssid: 'Mesh-Extender',
    signalBars: 1,
    security: 'wpa2',
    bandLabel: '2.4 GHz',
  },
];

const DEFAULT_VPN_PROFILES: ReadonlyArray<VpnProfileEntry> = [
  {
    id: 'vpn-zerotrust-core',
    name: 'ZeroTrust Core',
    region: 'US-West',
    protocol: 'WireGuard',
  },
  {
    id: 'vpn-eu-central',
    name: 'EU-Central Optical',
    region: 'Frankfurt',
    protocol: 'WireGuard',
  },
];

function deduplicateNetworks(
  list: ReadonlyArray<WifiNetworkEntry>
): WifiNetworkEntry[] {
  const seen = new Set<string>();
  const normalized: WifiNetworkEntry[] = [];

  for (const entry of list) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    normalized.push({
      ...entry,
      ssid: entry.ssid.trim() || 'Unnamed Network',
      bandLabel: entry.bandLabel.trim() || '2.4 GHz',
    });
  }

  return normalized;
}

function deduplicateVpnProfiles(
  list: ReadonlyArray<VpnProfileEntry>
): VpnProfileEntry[] {
  const seen = new Set<string>();
  const normalized: VpnProfileEntry[] = [];

  for (const entry of list) {
    if (seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    normalized.push({
      ...entry,
      name: entry.name.trim() || 'Unnamed VPN',
      region: entry.region.trim() || 'Global',
      protocol: entry.protocol.trim() || 'WireGuard',
    });
  }

  return normalized;
}

function getSignalVisual(signalBars: 1 | 2 | 3 | 4): SignalVisual {
  if (signalBars === 4) {
    return { token: 'var(--prism-success-main)', qualityLabel: 'Excellent' };
  }
  if (signalBars === 3) {
    return { token: 'var(--prism-info-main)', qualityLabel: 'Good' };
  }
  if (signalBars === 2) {
    return { token: 'var(--prism-warning-main)', qualityLabel: 'Fair' };
  }
  return { token: 'var(--prism-warning-main)', qualityLabel: 'Weak' };
}

function getSecurityVisual(security: WifiSecurityKind): SecurityVisual {
  switch (security) {
    case 'wpa3':
      return {
        label: 'WPA3',
        token: 'var(--prism-success-main)',
        isWarning: false,
      };
    case 'wpa2':
      return {
        label: 'WPA2',
        token: 'var(--prism-info-main)',
        isWarning: false,
      };
    case 'open':
      return {
        label: 'Open',
        token: 'var(--prism-warning-main)',
        isWarning: true,
      };
  }
}

function getConnectionStatusSummary(
  airplaneMode: boolean,
  wifiEnabled: boolean,
  connectedNetwork: WifiNetworkEntry | null,
  activeVpn: VpnProfileEntry | null
): ConnectionStatusSummary {
  if (airplaneMode) {
    return {
      message: 'Airplane Mode enabled — wireless radios suspended',
      badgeLabel: 'Suspended',
      badgeToken: 'var(--prism-warning-main)',
    };
  }
  if (connectedNetwork && activeVpn) {
    return {
      message: `Connected to ${connectedNetwork.ssid} (${connectedNetwork.bandLabel}) · VPN active: ${activeVpn.name} (${activeVpn.region})`,
      badgeLabel: 'Protected',
      badgeToken: 'var(--prism-success-main)',
    };
  }
  if (connectedNetwork) {
    return {
      message: `Connected to ${connectedNetwork.ssid} (${connectedNetwork.bandLabel}) · VPN off`,
      badgeLabel: 'Connected',
      badgeToken: 'var(--prism-info-main)',
    };
  }
  if (activeVpn) {
    const radioPrefix = wifiEnabled ? 'Wi-Fi on (not connected)' : 'Wi-Fi off';
    return {
      message: `${radioPrefix} · VPN active: ${activeVpn.name} (${activeVpn.region})`,
      badgeLabel: 'VPN Active',
      badgeToken: 'var(--prism-success-main)',
    };
  }
  if (wifiEnabled) {
    return {
      message: 'Wi-Fi enabled · Not connected to a network · VPN off',
      badgeLabel: 'Ready',
      badgeToken: 'var(--prism-text-secondary)',
    };
  }
  return {
    message: 'Wi-Fi off · No active VPN tunnel',
    badgeLabel: 'Offline',
    badgeToken: 'var(--prism-text-disabled)',
  };
}

function handleInteractiveKeyDown(
  event: ReactKeyboardEvent<HTMLButtonElement>,
  isDisabled: boolean,
  action: () => void
): void {
  if (isDisabled || event.nativeEvent.isComposing) {
    return;
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    action();
  }
}

const headerClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'header');
const radioControlsClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'radio-controls');
const airplaneNoticeClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'airplane-notice');
const wifiSectionClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'wifi-section');
const wifiListClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'wifi-list');
const wifiRowClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'wifi-row');
const vpnSectionClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'vpn-section');
const vpnListClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'vpn-list');
const vpnRowClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'vpn-row');
const statusBarClass = /*#__PURE__*/ stableClassName('network-vpn-popover', 'status-bar');

function NetworkVpnPopoverInner({
  title = DEFAULT_TITLE,
  networks,
  vpnProfiles,
  defaultConnectedNetworkId,
  defaultActiveVpnId = null,
  defaultWifiEnabled = true,
  defaultAirplaneMode = false,
  onConnectNetwork,
  onToggleVpn,
  onAirplaneModeChange,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: NetworkVpnPopoverProps) {
  const titleId = useId();
  const wifiHeadingId = useId();
  const vpnHeadingId = useId();
  const override = useComponentOverride('NetworkVpnPopover');

  const normalizedNetworks = useMemo(
    () => deduplicateNetworks(networks ?? DEFAULT_NETWORKS),
    [networks]
  );
  const normalizedVpnProfiles = useMemo(
    () => deduplicateVpnProfiles(vpnProfiles ?? DEFAULT_VPN_PROFILES),
    [vpnProfiles]
  );

  const [airplaneMode, setAirplaneMode] = useState<boolean>(defaultAirplaneMode);
  const [wifiEnabled, setWifiEnabled] = useState<boolean>(() =>
    defaultAirplaneMode ? false : defaultWifiEnabled
  );
  const [connectedNetworkId, setConnectedNetworkId] = useState<string | null>(
    () => {
      if (defaultAirplaneMode || !defaultWifiEnabled) {
        return null;
      }
      const candidateId =
        defaultConnectedNetworkId !== undefined
          ? defaultConnectedNetworkId
          : networks === undefined
            ? DEFAULT_CONNECTED_NETWORK_ID
            : null;
      if (candidateId === null) {
        return null;
      }
      const initialList = deduplicateNetworks(networks ?? DEFAULT_NETWORKS);
      return initialList.some((entry) => entry.id === candidateId)
        ? candidateId
        : null;
    }
  );
  const [activeVpnId, setActiveVpnId] = useState<string | null>(() => {
    if (defaultAirplaneMode || !defaultActiveVpnId) {
      return null;
    }
    const initialList = deduplicateVpnProfiles(
      vpnProfiles ?? DEFAULT_VPN_PROFILES
    );
    return initialList.some((entry) => entry.id === defaultActiveVpnId)
      ? defaultActiveVpnId
      : null;
  });

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const effectiveWifiEnabled = !airplaneMode && wifiEnabled;
  const connectedNetwork =
    effectiveWifiEnabled && connectedNetworkId !== null
      ? (normalizedNetworks.find((entry) => entry.id === connectedNetworkId) ??
        null)
      : null;
  const activeVpn =
    !airplaneMode && activeVpnId !== null
      ? (normalizedVpnProfiles.find((entry) => entry.id === activeVpnId) ??
        null)
      : null;

  const statusSummary = getConnectionStatusSummary(
    airplaneMode,
    effectiveWifiEnabled,
    connectedNetwork,
    activeVpn
  );

  const handleToggleWifi = () => {
    const nextEnabled = !effectiveWifiEnabled;
    setWifiEnabled(nextEnabled);
    if (!nextEnabled && connectedNetwork !== null) {
      setConnectedNetworkId(null);
      onConnectNetwork?.(null);
    }
  };

  const handleToggleAirplaneMode = () => {
    const nextAirplaneMode = !airplaneMode;
    setAirplaneMode(nextAirplaneMode);
    if (nextAirplaneMode) {
      setWifiEnabled(false);
      if (connectedNetwork !== null) {
        setConnectedNetworkId(null);
        onConnectNetwork?.(null);
      }
      if (activeVpn !== null) {
        setActiveVpnId(null);
        onToggleVpn?.(null);
      }
    }
    onAirplaneModeChange?.(nextAirplaneMode);
  };

  const handleToggleNetwork = (network: WifiNetworkEntry) => {
    const isCurrentlyConnected = connectedNetwork?.id === network.id;
    const nextId = isCurrentlyConnected ? null : network.id;
    setConnectedNetworkId(nextId);
    onConnectNetwork?.(nextId);
  };

  const handleToggleVpnProfile = (profile: VpnProfileEntry) => {
    const isCurrentlyActive = activeVpn?.id === profile.id;
    const nextId = isCurrentlyActive ? null : profile.id;
    setActiveVpnId(nextId);
    onToggleVpn?.(nextId);
  };

  const merged = mergeProps({
    themeTarget: themeProps('network-vpn-popover', {
      wifi: effectiveWifiEnabled,
      airplaneMode,
      connected: connectedNetwork !== null,
      vpnActive: activeVpn !== null,
      disabled,
    }),
    baseClassName:
      'prism-slab relative flex flex-col w-full max-w-full min-w-0 select-none overflow-hidden',
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  const wifiSwitchDisabled = disabled || airplaneMode;
  const vpnSwitchesDisabled = disabled || airplaneMode;
  const wifiSublabel = airplaneMode
    ? 'Suspended'
    : effectiveWifiEnabled
      ? connectedNetwork
        ? 'Connected'
        : 'On'
      : 'Off';

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={titleId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      {/* Optical Popover Header */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'prism-crystal relative flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 min-w-0 max-w-full border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <span
          aria-hidden="true"
          data-part="sheen"
          className="pointer-events-none absolute inset-x-4 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--prism-primary-contrast) 70%, transparent) 30%, color-mix(in srgb, var(--prism-secondary-light) 55%, transparent) 70%, transparent 100%)',
          }}
        />

        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <span
            aria-hidden="true"
            className="w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0 border"
            style={{
              color: statusSummary.badgeToken,
              borderColor: `color-mix(in srgb, ${statusSummary.badgeToken} 42%, var(--prism-divider))`,
              backgroundColor: `color-mix(in srgb, ${statusSummary.badgeToken} 14%, transparent)`,
            }}
          >
            {airplaneMode ? (
              <Plane className="w-4 h-4 shrink-0" />
            ) : effectiveWifiEnabled ? (
              <Wifi className="w-4 h-4 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 shrink-0" />
            )}
          </span>

          <h2
            id={titleId}
            className="text-sm font-semibold tracking-[-0.01em] truncate min-w-0 max-w-full"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h2>
        </div>

        <span
          data-part="status-pill"
          data-testid="network-vpn-header-badge"
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0"
          style={{
            color: statusSummary.badgeToken,
            borderColor: `color-mix(in srgb, ${statusSummary.badgeToken} 44%, var(--prism-divider))`,
            backgroundColor: `color-mix(in srgb, ${statusSummary.badgeToken} 14%, transparent)`,
          }}
        >
          <span
            aria-hidden="true"
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{ backgroundColor: statusSummary.badgeToken }}
          />
          {statusSummary.badgeLabel}
        </span>
      </header>

      {/* Top Radio Controls */}
      <div
        data-part="radio-controls"
        data-testid="network-vpn-radio-controls"
        className={cx(
          radioControlsClass,
          'flex flex-wrap items-stretch gap-2.5 px-4 py-3 min-w-0 max-w-full border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        {/* Wi-Fi Switch Tile */}
        <div
          className="prism-well rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 flex-1 min-w-[10rem] border"
          style={{
            borderColor: effectiveWifiEnabled
              ? 'color-mix(in srgb, var(--prism-success-main) 40%, var(--prism-divider))'
              : 'var(--prism-divider)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {effectiveWifiEnabled ? (
              <Wifi
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={STYLE_SUCCESS_MAIN}
              />
            ) : (
              <WifiOff
                aria-hidden="true"
                className="w-4 h-4 shrink-0"
                style={STYLE_TEXT_DISABLED}
              />
            )}
            <div className="flex flex-col min-w-0">
              <span
                className="text-xs font-semibold truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                Wi-Fi
              </span>
              <span
                className="text-[11px] truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                {wifiSublabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={effectiveWifiEnabled}
            aria-label="Wi-Fi"
            disabled={wifiSwitchDisabled}
            data-part="wifi-switch"
            data-testid="network-vpn-wifi-switch"
            onClick={handleToggleWifi}
            onKeyDown={(event) =>
              handleInteractiveKeyDown(
                event,
                wifiSwitchDisabled,
                handleToggleWifi
              )
            }
            className={cx(
              'prism-focus-ring relative w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0',
              effectiveWifiEnabled ? 'prism-emerald' : 'prism-crystal'
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                'prism-thumb block w-5 h-5 rounded-full transition-transform duration-200',
                effectiveWifiEnabled ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>

        {/* Airplane Mode Switch Tile */}
        <div
          className="prism-well rounded-xl px-3 py-2 flex items-center justify-between gap-2.5 flex-1 min-w-[10rem] border"
          style={{
            borderColor: airplaneMode
              ? 'color-mix(in srgb, var(--prism-warning-main) 54%, var(--prism-divider))'
              : 'var(--prism-divider)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Plane
              aria-hidden="true"
              className="w-4 h-4 shrink-0"
              style={{
                color: airplaneMode
                  ? 'var(--prism-warning-main)'
                  : 'var(--prism-text-secondary)',
              }}
            />
            <div className="flex flex-col min-w-0">
              <span
                className="text-xs font-semibold truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                Airplane Mode
              </span>
              <span
                className="text-[11px] truncate"
                style={{
                  color: airplaneMode
                    ? 'var(--prism-warning-main)'
                    : 'var(--prism-text-secondary)',
                }}
              >
                {airplaneMode ? 'Suspended' : 'Off'}
              </span>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={airplaneMode}
            aria-label="Airplane Mode"
            disabled={disabled}
            data-part="airplane-switch"
            data-testid="network-vpn-airplane-switch"
            onClick={handleToggleAirplaneMode}
            onKeyDown={(event) =>
              handleInteractiveKeyDown(
                event,
                disabled,
                handleToggleAirplaneMode
              )
            }
            className={cx(
              'prism-focus-ring relative w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 border',
              airplaneMode ? '' : 'prism-crystal'
            )}
            style={
              airplaneMode
                ? {
                    backgroundColor: 'var(--prism-warning-main)',
                    borderColor: 'var(--prism-warning-main)',
                  }
                : STYLE_BORDER_DIVIDER
            }
          >
            <span
              aria-hidden="true"
              className={cx(
                'prism-thumb block w-5 h-5 rounded-full transition-transform duration-200',
                airplaneMode ? 'translate-x-5' : 'translate-x-0'
              )}
            />
          </button>
        </div>
      </div>

      {/* Body Sections */}
      <div className="flex flex-col gap-3.5 px-4 py-3.5 min-w-0 max-w-full">
        {/* Airplane Mode Semantic Warning Notice */}
        {airplaneMode ? (
          <div
            role="alert"
            data-part="airplane-notice"
            data-testid="network-vpn-airplane-notice"
            className={cx(
              airplaneNoticeClass,
              'rounded-xl px-3 py-2.5 border flex items-center gap-2.5 text-xs font-medium min-w-0'
            )}
            style={{
              color: 'var(--prism-warning-main)',
              borderColor:
                'color-mix(in srgb, var(--prism-warning-main) 52%, var(--prism-divider))',
              backgroundColor:
                'color-mix(in srgb, var(--prism-warning-main) 14%, transparent)',
            }}
          >
            <AlertTriangle aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span className="min-w-0 break-words">
              Airplane Mode enabled — wireless radios suspended
            </span>
          </div>
        ) : null}

        {/* Available Wi-Fi Networks Section */}
        {effectiveWifiEnabled ? (
          <section
            aria-labelledby={wifiHeadingId}
            data-part="wifi-section"
            data-testid="network-vpn-wifi-section"
            className={cx(wifiSectionClass, 'flex flex-col gap-2 min-w-0')}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
              <h3
                id={wifiHeadingId}
                className="text-[11px] font-semibold uppercase tracking-wider truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                Available Wi-Fi Networks
              </h3>
              <span
                className="font-mono text-[10px] font-semibold shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                {normalizedNetworks.length}{' '}
                {normalizedNetworks.length === 1 ? 'network' : 'networks'}
              </span>
            </div>

            {normalizedNetworks.length === 0 ? (
              <div
                data-part="empty-wifi"
                data-testid="network-vpn-empty-wifi"
                className="prism-well rounded-xl px-3 py-3 text-xs text-center border min-w-0"
                style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
              >
                No Wi-Fi networks detected in range.
              </div>
            ) : (
              <ul
                role="list"
                aria-labelledby={wifiHeadingId}
                className={cx(
                  wifiListClass,
                  'flex flex-col gap-2 min-w-0 max-w-full m-0 p-0 list-none'
                )}
              >
                {normalizedNetworks.map((network) => {
                  const isConnected = connectedNetwork?.id === network.id;
                  const signalVisual = getSignalVisual(network.signalBars);
                  const securityVisual = getSecurityVisual(network.security);

                  return (
                    <li
                      key={network.id}
                      data-part="wifi-row"
                      data-network-id={network.id}
                      data-connected={isConnected ? 'true' : 'false'}
                      data-testid={`network-vpn-wifi-row-${network.id}`}
                      className={cx(
                        wifiRowClass,
                        'prism-well rounded-xl px-3 py-2.5 border flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
                      )}
                      style={{
                        borderColor: isConnected
                          ? 'color-mix(in srgb, var(--prism-success-main) 54%, var(--prism-divider))'
                          : 'var(--prism-divider)',
                        backgroundColor: isConnected
                          ? 'color-mix(in srgb, var(--prism-success-main) 8%, transparent)'
                          : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* 4-Bar Optical Signal-Strength Graphic */}
                        <svg
                          width={18}
                          height={14}
                          viewBox="0 0 18 14"
                          role="img"
                          aria-label={`${network.signalBars} of 4 signal bars (${signalVisual.qualityLabel})`}
                          data-part="signal-bars"
                          data-signal-bars={String(network.signalBars)}
                          data-signal-token={signalVisual.token}
                          data-testid={`network-vpn-signal-${network.id}`}
                          className="block shrink-0 prism-contain-box"
                        >
                          {SIGNAL_BAR_LEVELS.map((barLevel) => {
                            const height = SIGNAL_BAR_HEIGHTS[barLevel];
                            const x = (barLevel - 1) * 4.5 + 0.5;
                            const y = 14 - height;
                            const isLit = barLevel <= network.signalBars;

                            return (
                              <rect
                                key={barLevel}
                                x={x}
                                y={y}
                                width={3}
                                height={height}
                                rx={1}
                                fill={
                                  isLit
                                    ? signalVisual.token
                                    : 'var(--prism-divider)'
                                }
                                data-active={isLit ? 'true' : 'false'}
                              />
                            );
                          })}
                        </svg>

                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span
                              className="text-xs sm:text-sm font-semibold truncate min-w-0 max-w-full"
                              style={STYLE_TEXT_PRIMARY}
                            >
                              {network.ssid}
                            </span>
                            {isConnected ? (
                              <span
                                data-testid={`network-vpn-connected-pill-${network.id}`}
                                className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0"
                                style={{
                                  color: 'var(--prism-success-main)',
                                  borderColor:
                                    'color-mix(in srgb, var(--prism-success-main) 44%, var(--prism-divider))',
                                  backgroundColor:
                                    'color-mix(in srgb, var(--prism-success-main) 14%, transparent)',
                                }}
                              >
                                Connected
                              </span>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                            <span
                              data-part="security-badge"
                              data-security={network.security}
                              data-testid={`network-vpn-security-${network.id}`}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border shrink-0"
                              style={{
                                color: securityVisual.token,
                                borderColor: `color-mix(in srgb, ${securityVisual.token} 44%, var(--prism-divider))`,
                                backgroundColor: `color-mix(in srgb, ${securityVisual.token} 12%, transparent)`,
                              }}
                            >
                              {securityVisual.isWarning ? (
                                <AlertTriangle
                                  aria-hidden="true"
                                  className="w-2.5 h-2.5 shrink-0"
                                />
                              ) : (
                                <Lock
                                  aria-hidden="true"
                                  className="w-2.5 h-2.5 shrink-0"
                                />
                              )}
                              {securityVisual.label}
                            </span>

                            <span
                              data-part="band-pill"
                              data-testid={`network-vpn-band-${network.id}`}
                              className="prism-well px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0"
                              style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
                            >
                              {network.bandLabel}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-pressed={isConnected}
                        aria-label={
                          isConnected
                            ? `Disconnect from ${network.ssid}`
                            : `Connect to ${network.ssid}`
                        }
                        disabled={disabled}
                        data-part="wifi-action"
                        data-testid={`network-vpn-connect-${network.id}`}
                        onClick={() => handleToggleNetwork(network)}
                        onKeyDown={(event) =>
                          handleInteractiveKeyDown(event, disabled, () =>
                            handleToggleNetwork(network)
                          )
                        }
                        className={cx(
                          'prism-focus-ring px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                          isConnected ? '' : 'prism-crystal'
                        )}
                        style={
                          isConnected
                            ? {
                                color: 'var(--prism-primary-main)',
                                borderColor:
                                  'color-mix(in srgb, var(--prism-primary-main) 50%, var(--prism-divider))',
                                backgroundColor:
                                  'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)',
                              }
                            : STYLE_BORDER_DIVIDER_TEXT_PRIMARY
                        }
                      >
                        {isConnected ? 'Disconnect' : 'Connect'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : !airplaneMode ? (
          <div
            data-part="wifi-off-notice"
            data-testid="network-vpn-wifi-off-notice"
            className="prism-well rounded-xl px-3 py-2.5 border flex items-center gap-2 text-xs min-w-0"
            style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
          >
            <WifiOff aria-hidden="true" className="w-4 h-4 shrink-0" />
            <span className="min-w-0 break-words">
              Wi-Fi is turned off. Enable Wi-Fi to browse nearby networks.
            </span>
          </div>
        ) : null}

        {/* VPN Profiles Section */}
        <section
          aria-labelledby={vpnHeadingId}
          data-part="vpn-section"
          data-testid="network-vpn-vpn-section"
          className={cx(
            vpnSectionClass,
            'flex flex-col gap-2 pt-3 border-t min-w-0'
          )}
          style={STYLE_BORDER_DIVIDER}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
            <h3
              id={vpnHeadingId}
              className="text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 truncate"
              style={STYLE_TEXT_SECONDARY}
            >
              {activeVpn ? (
                <ShieldCheck
                  aria-hidden="true"
                  className="w-3.5 h-3.5 shrink-0"
                  style={STYLE_SUCCESS_MAIN}
                />
              ) : (
                <Shield aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
              )}
              VPN Profiles
            </h3>
            <span
              className="font-mono text-[10px] font-semibold shrink-0"
              style={{
                color: activeVpn
                  ? 'var(--prism-success-main)'
                  : airplaneMode
                    ? 'var(--prism-warning-main)'
                    : 'var(--prism-text-secondary)',
              }}
            >
              {airplaneMode
                ? 'Suspended'
                : activeVpn
                  ? 'Tunnel Active'
                  : 'Standby'}
            </span>
          </div>

          {normalizedVpnProfiles.length === 0 ? (
            <div
              data-part="empty-vpn"
              data-testid="network-vpn-empty-vpn"
              className="prism-well rounded-xl px-3 py-3 text-xs text-center border min-w-0"
              style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
            >
              No VPN profiles configured.
            </div>
          ) : (
            <ul
              role="list"
              aria-labelledby={vpnHeadingId}
              className={cx(
                vpnListClass,
                'flex flex-col gap-2 min-w-0 max-w-full m-0 p-0 list-none'
              )}
            >
              {normalizedVpnProfiles.map((profile) => {
                const isActive = activeVpn?.id === profile.id;

                return (
                  <li
                    key={profile.id}
                    data-part="vpn-row"
                    data-vpn-id={profile.id}
                    data-active={isActive ? 'true' : 'false'}
                    data-testid={`network-vpn-vpn-row-${profile.id}`}
                    className={cx(
                      vpnRowClass,
                      'prism-well rounded-xl px-3 py-2.5 border flex flex-wrap items-center justify-between gap-2.5 min-w-0 max-w-full'
                    )}
                    style={{
                      borderColor: isActive
                        ? 'color-mix(in srgb, var(--prism-success-main) 54%, var(--prism-divider))'
                        : 'var(--prism-divider)',
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--prism-success-main) 8%, transparent)'
                        : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        aria-hidden="true"
                        className="w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 border"
                        style={{
                          color: isActive
                            ? 'var(--prism-success-main)'
                            : 'var(--prism-text-secondary)',
                          borderColor: isActive
                            ? 'color-mix(in srgb, var(--prism-success-main) 44%, var(--prism-divider))'
                            : 'var(--prism-divider)',
                          backgroundColor: isActive
                            ? 'color-mix(in srgb, var(--prism-success-main) 14%, transparent)'
                            : 'transparent',
                        }}
                      >
                        {isActive ? (
                          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Shield className="w-3.5 h-3.5 shrink-0" />
                        )}
                      </span>

                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span
                          className="text-xs sm:text-sm font-semibold truncate min-w-0 max-w-full"
                          style={STYLE_TEXT_PRIMARY}
                        >
                          {profile.name}
                        </span>

                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          <span
                            className="inline-flex items-center gap-1 text-[11px] truncate min-w-0"
                            style={STYLE_TEXT_SECONDARY}
                          >
                            <Globe
                              aria-hidden="true"
                              className="w-3 h-3 shrink-0"
                            />
                            {profile.region}
                          </span>
                          <span
                            data-part="protocol-pill"
                            data-testid={`network-vpn-protocol-${profile.id}`}
                            className="prism-well px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold border shrink-0"
                            style={{
                              color: isActive
                                ? 'var(--prism-success-main)'
                                : 'var(--prism-text-secondary)',
                              borderColor: 'var(--prism-divider)',
                            }}
                          >
                            {profile.protocol}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={isActive}
                      aria-label={`VPN ${profile.name}`}
                      disabled={vpnSwitchesDisabled}
                      data-part="vpn-switch"
                      data-testid={`network-vpn-vpn-switch-${profile.id}`}
                      onClick={() => handleToggleVpnProfile(profile)}
                      onKeyDown={(event) =>
                        handleInteractiveKeyDown(
                          event,
                          vpnSwitchesDisabled,
                          () => handleToggleVpnProfile(profile)
                        )
                      }
                      className={cx(
                        'prism-focus-ring relative w-11 h-6 rounded-full p-0.5 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0',
                        isActive ? 'prism-emerald' : 'prism-crystal'
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cx(
                          'prism-thumb block w-5 h-5 rounded-full transition-transform duration-200',
                          isActive ? 'translate-x-5' : 'translate-x-0'
                        )}
                      />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Polite Live Connection Status Summary Bar */}
      <footer
        data-part="status-bar"
        className={cx(
          statusBarClass,
          'px-4 py-2.5 border-t flex flex-wrap items-center justify-between gap-2 text-xs min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER_TEXT_SECONDARY}
      >
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          data-part="status"
          data-testid="network-vpn-status"
          className="min-w-0 break-words flex-1"
        >
          {statusSummary.message}
        </div>
      </footer>
    </div>
  );
}

export const NetworkVpnPopover = /*#__PURE__*/ memoWithDisplayName(NetworkVpnPopoverInner, 'NetworkVpnPopover');
