'use client';

import {
  memo,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { Activity, Power, Server, Zap } from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber } from '../utils/sanitize';
import { STYLE_BG_ERROR, STYLE_BG_SUCCESS, STYLE_BG_WARNING, STYLE_BORDER_DIVIDER, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY, formatUsNumber } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type HardwarePortKind = 'rj45' | 'sfp+' | 'usb-c' | 'poe';

export type HardwarePortStatus = 'up-10g' | 'up-1g' | 'warning' | 'down';

export type HardwarePortFilter = 'all' | 'up' | 'warning' | 'down';

export interface HardwarePortSpec {
  /** Unique identifier used for React keys, selection, and admin toggles. */
  id: string;
  /** Physical 1-based faceplate port index (rendered as zero-padded two-digit silkscreen). */
  portNumber: number;
  /** Human-readable patch label printed in the diagnostic inspector. */
  label: string;
  /** Physical connector geometry rendered in the 1U faceplate. */
  kind: HardwarePortKind;
  /** Live optical/copper link status controlling the status LED token. */
  status: HardwarePortStatus;
  /** Administrative switchport state; when false, the port is forced down and PoE drops to 0W. */
  adminEnabled: boolean;
  /** Negotiated PHY speed or optical transceiver link readout. */
  speedLabel: string;
  /** Assigned VLAN or trunk identifier. */
  vlan: string;
  /** Active Power-over-Ethernet draw in watts (0 when non-PoE or admin disabled). */
  poeWatts: number;
  /** Receive throughput in Mbps. */
  rxMbps: number;
  /** Transmit throughput in Mbps. */
  txMbps: number;
  /** Connected endpoint or transceiver identification text. */
  connectedDevice: string;
}

type HardwarePortStripBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface HardwarePortStripProps extends HardwarePortStripBaseProps {
  /** Visible chassis heading rendered in the top faceplate header. */
  title?: string;
  /** Controlled array of hardware switchports. */
  ports?: ReadonlyArray<HardwarePortSpec>;
  /** Initial array of hardware switchports in uncontrolled mode (defaults to a 12-port 1U switch). */
  defaultPorts?: ReadonlyArray<HardwarePortSpec>;
  /** Controlled locked port selection ID. */
  selectedPortId?: string;
  /** Initial locked port selection ID in uncontrolled mode. */
  defaultSelectedPortId?: string;
  /** Callback fired when the user clicks or activates a port bay to lock selection. */
  onSelectPort?: (port: HardwarePortSpec) => void;
  /** Callback fired when the user toggles a port's administrative enable/disable state. */
  onTogglePortAdmin?: (
    portId: string,
    adminEnabled: boolean,
    nextPorts: ReadonlyArray<HardwarePortSpec>
  ) => void;
  /** Disables filtering, port inspection/selection, keyboard navigation, and admin toggles. */
  disabled?: boolean;
}

interface PortBaseline {
  status: HardwarePortStatus;
  speedLabel: string;
  poeWatts: number;
  rxMbps: number;
  txMbps: number;
}

interface PortStatusVisual {
  label: string;
  ledToken: string;
}

interface FilterOption {
  id: HardwarePortFilter;
  label: string;
}

const DEFAULT_TITLE = 'Refractor SW-12X · 1U Optical Patch Bay';

const FILTER_OPTIONS: ReadonlyArray<FilterOption> = [
  { id: 'all', label: 'All' },
  { id: 'up', label: 'Up' },
  { id: 'warning', label: 'Warning' },
  { id: 'down', label: 'Down' },
];

const DEFAULT_PORTS: ReadonlyArray<HardwarePortSpec> = [
  {
    id: 'port-01',
    portNumber: 1,
    label: 'AP-Studio-North',
    kind: 'poe',
    status: 'up-1g',
    adminEnabled: true,
    speedLabel: '1G Full',
    vlan: 'VLAN 20',
    poeWatts: 18.4,
    rxMbps: 412,
    txMbps: 186,
    connectedDevice: 'UniFi U7-Pro Ceiling AP',
  },
  {
    id: 'port-02',
    portNumber: 2,
    label: 'Cam-Optic-01',
    kind: 'poe',
    status: 'up-1g',
    adminEnabled: true,
    speedLabel: '1G Full',
    vlan: 'VLAN 30',
    poeWatts: 12.6,
    rxMbps: 94,
    txMbps: 18,
    connectedDevice: 'Axis P3265-LV Dome',
  },
  {
    id: 'port-03',
    portNumber: 3,
    label: 'AP-Lab-East',
    kind: 'poe',
    status: 'warning',
    adminEnabled: true,
    speedLabel: '100M Half',
    vlan: 'VLAN 20',
    poeWatts: 24.8,
    rxMbps: 68,
    txMbps: 42,
    connectedDevice: 'PoE+ Sensor Array (CRC Warn)',
  },
  {
    id: 'port-04',
    portNumber: 4,
    label: 'Workstation-04',
    kind: 'rj45',
    status: 'up-1g',
    adminEnabled: true,
    speedLabel: '1G Full',
    vlan: 'VLAN 10',
    poeWatts: 0,
    rxMbps: 640,
    txMbps: 520,
    connectedDevice: 'Mac Studio · Color Suite',
  },
  {
    id: 'port-05',
    portNumber: 5,
    label: 'NAS-Edit-Bay',
    kind: 'rj45',
    status: 'up-10g',
    adminEnabled: true,
    speedLabel: '10GBASE-T',
    vlan: 'VLAN 40',
    poeWatts: 0,
    rxMbps: 4280,
    txMbps: 3910,
    connectedDevice: 'TrueNAS NVMe Vault',
  },
  {
    id: 'port-06',
    portNumber: 6,
    label: 'Patch-Spare-06',
    kind: 'rj45',
    status: 'down',
    adminEnabled: false,
    speedLabel: 'Admin Down',
    vlan: 'VLAN 99',
    poeWatts: 0,
    rxMbps: 0,
    txMbps: 0,
    connectedDevice: 'Unpatched Bay',
  },
  {
    id: 'port-07',
    portNumber: 7,
    label: 'Console-TTY0',
    kind: 'usb-c',
    status: 'up-1g',
    adminEnabled: true,
    speedLabel: 'USB3 Telemetry',
    vlan: 'MGMT 01',
    poeWatts: 0,
    rxMbps: 12,
    txMbps: 8,
    connectedDevice: 'Rack KVM Telemetry Bridge',
  },
  {
    id: 'port-08',
    portNumber: 8,
    label: 'Diag-USB-C',
    kind: 'usb-c',
    status: 'down',
    adminEnabled: true,
    speedLabel: 'Standby',
    vlan: 'MGMT 01',
    poeWatts: 0,
    rxMbps: 0,
    txMbps: 0,
    connectedDevice: 'No Console Attached',
  },
  {
    id: 'port-09',
    portNumber: 9,
    label: 'Core-Uplink-A',
    kind: 'sfp+',
    status: 'up-10g',
    adminEnabled: true,
    speedLabel: '10G SR Fiber',
    vlan: 'TRUNK 1-4094',
    poeWatts: 0,
    rxMbps: 7840,
    txMbps: 6920,
    connectedDevice: 'Spine-SW01 · OM4 LC',
  },
  {
    id: 'port-10',
    portNumber: 10,
    label: 'Core-Uplink-B',
    kind: 'sfp+',
    status: 'up-10g',
    adminEnabled: true,
    speedLabel: '10G SR Fiber',
    vlan: 'TRUNK 1-4094',
    poeWatts: 0,
    rxMbps: 7120,
    txMbps: 6410,
    connectedDevice: 'Spine-SW02 · OM4 LC',
  },
  {
    id: 'port-11',
    portNumber: 11,
    label: 'SAN-Fabric-11',
    kind: 'sfp+',
    status: 'warning',
    adminEnabled: true,
    speedLabel: '10G LR (-11dBm)',
    vlan: 'VLAN 50',
    poeWatts: 0,
    rxMbps: 2340,
    txMbps: 1890,
    connectedDevice: 'Optical Transceiver Rx Low',
  },
  {
    id: 'port-12',
    portNumber: 12,
    label: 'Dark-Fiber-12',
    kind: 'sfp+',
    status: 'down',
    adminEnabled: true,
    speedLabel: 'No SFP Module',
    vlan: 'VLAN 50',
    poeWatts: 0,
    rxMbps: 0,
    txMbps: 0,
    connectedDevice: 'Empty SFP+ Cage',
  },
];

const RJ45_PIN_X: ReadonlyArray<number> = [8, 9.7, 11.4, 13.1, 14.8, 16.5, 18.2, 19.9];
const POE_PIN_X: ReadonlyArray<number> = [8.2, 10.5, 12.8, 15.1, 17.4, 19.7];

function formatPortNumber(portNumber: number): string {
  return String(portNumber).padStart(2, '0');
}

function roundTenth(value: number): number {
  const rounded = Math.round(value * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}

function formatWatts(watts: number): string {
  return `${roundTenth(watts)}W`;
}

function formatMbps(mbps: number): string {
  return formatUsNumber(Math.round(mbps));
}

function getKindLabel(kind: HardwarePortKind): string {
  switch (kind) {
    case 'rj45':
      return 'RJ45';
    case 'sfp+':
      return 'SFP+';
    case 'usb-c':
      return 'USB-C';
    case 'poe':
      return 'PoE';
  }
}

function getDefaultSpeedForKind(kind: HardwarePortKind): string {
  switch (kind) {
    case 'sfp+':
      return '10G SR Fiber';
    case 'usb-c':
      return 'USB3 Telemetry';
    case 'rj45':
    case 'poe':
      return '1G Full';
  }
}

function getStatusMeta(status: HardwarePortStatus, adminEnabled: boolean): PortStatusVisual {
  switch (status) {
    case 'up-10g':
      return { label: '10G Up', ledToken: 'var(--prism-success-main)' };
    case 'up-1g':
      return { label: '1G Up', ledToken: 'var(--prism-info-main)' };
    case 'warning':
      return { label: 'Warning', ledToken: 'var(--prism-warning-main)' };
    case 'down':
      return {
        label: adminEnabled ? 'Link Down' : 'Admin Down',
        ledToken: 'var(--prism-error-main)',
      };
  }
}

function matchesFilter(status: HardwarePortStatus, filter: HardwarePortFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'up':
      return status === 'up-10g' || status === 'up-1g';
    case 'warning':
      return status === 'warning';
    case 'down':
      return status === 'down';
  }
}

function normalizePorts(list: ReadonlyArray<HardwarePortSpec>): HardwarePortSpec[] {
  const seen = new Set<string>();
  const normalized: HardwarePortSpec[] = [];

  for (let i = 0; i < list.length; i += 1) {
    const port = list[i];
    if (!port || seen.has(port.id)) {
      continue;
    }
    seen.add(port.id);

    const safeNumber = Math.round(clampNumber(port.portNumber, 1, 999, i + 1));
    const padded = formatPortNumber(safeNumber);

    normalized.push({
      ...port,
      portNumber: safeNumber,
      label: port.label.trim() || `Port ${padded}`,
      speedLabel: port.speedLabel.trim() || 'No Link',
      vlan: port.vlan.trim() || 'Unassigned',
      poeWatts: roundTenth(clampNumber(port.poeWatts, 0, 1000, 0)),
      rxMbps: Math.round(clampNumber(port.rxMbps, 0, 1000000, 0)),
      txMbps: Math.round(clampNumber(port.txMbps, 0, 1000000, 0)),
      connectedDevice: port.connectedDevice.trim() || 'Unconnected',
    });
  }

  return normalized;
}

function toEffectivePort(port: HardwarePortSpec): HardwarePortSpec {
  if (!port.adminEnabled) {
    return {
      ...port,
      status: 'down',
      speedLabel: 'Admin Down',
      poeWatts: 0,
      rxMbps: 0,
      txMbps: 0,
    };
  }
  return port;
}

function createInitialBaselines(ports: ReadonlyArray<HardwarePortSpec>): Map<string, PortBaseline> {
  const map = new Map<string, PortBaseline>();
  for (const port of ports) {
    if (port.status !== 'down') {
      map.set(port.id, {
        status: port.status,
        speedLabel: port.speedLabel,
        poeWatts: port.poeWatts,
        rxMbps: port.rxMbps,
        txMbps: port.txMbps,
      });
    }
  }
  return map;
}

function renderRackEar(side: 'left' | 'right'): ReactNode {
  return (
    <div
      aria-hidden="true"
      data-testid={`hardware-rack-ear-${side}`}
      className="prism-crystal rounded-xl px-1.5 py-2 flex flex-col items-center justify-center shrink-0 border select-none"
      style={STYLE_BORDER_DIVIDER}
    >
      <svg
        width={18}
        height={76}
        viewBox="0 0 18 76"
        aria-hidden="true"
        className="block shrink-0 pointer-events-none"
      >
        <rect
          x={3}
          y={7}
          width={12}
          height={9}
          rx={4.5}
          fill="var(--prism-well-start)"
          stroke="var(--prism-text-secondary)"
          strokeOpacity={0.55}
          strokeWidth={1.2}
        />
        <circle cx={9} cy={38} r={2.2} fill="var(--prism-text-disabled)" />
        <rect
          x={3}
          y={60}
          width={12}
          height={9}
          rx={4.5}
          fill="var(--prism-well-start)"
          stroke="var(--prism-text-secondary)"
          strokeOpacity={0.55}
          strokeWidth={1.2}
        />
      </svg>
    </div>
  );
}

function renderPortSocketGlyph(
  portId: string,
  kind: HardwarePortKind,
  status: HardwarePortStatus,
  ledToken: string
): ReactNode {
  const isActive = status !== 'down';
  const contactStroke = isActive ? 'var(--prism-primary-main)' : 'var(--prism-text-disabled)';

  return (
    <svg
      width={28}
      height={22}
      viewBox="0 0 28 22"
      aria-hidden="true"
      data-testid={`port-glyph-${portId}`}
      data-port-glyph={kind}
      className="block shrink-0 pointer-events-none"
    >
      {kind === 'rj45' ? (
        <>
          <rect
            x={2}
            y={2}
            width={24}
            height={18}
            rx={2.5}
            fill="var(--prism-well-start)"
            stroke="var(--prism-text-secondary)"
            strokeWidth={1.3}
          />
          <path
            d="M 6 17 L 6 8.5 L 9 8.5 L 9 6.2 L 11.4 6.2 L 11.4 4.5 L 16.6 4.5 L 16.6 6.2 L 19 6.2 L 19 8.5 L 22 8.5 L 22 17 Z"
            fill="var(--prism-well-end)"
            stroke="var(--prism-text-primary)"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          {RJ45_PIN_X.map((pinX) => (
            <line
              key={pinX}
              x1={pinX}
              y1={14.2}
              x2={pinX}
              y2={16.7}
              stroke={contactStroke}
              strokeWidth={0.95}
              strokeLinecap="round"
            />
          ))}
        </>
      ) : kind === 'poe' ? (
        <>
          <rect
            x={2}
            y={2}
            width={24}
            height={18}
            rx={2.5}
            fill="var(--prism-well-start)"
            stroke="var(--prism-text-secondary)"
            strokeWidth={1.3}
          />
          <path
            d="M 6 17 L 6 8.5 L 9 8.5 L 9 6.2 L 11.4 6.2 L 11.4 4.5 L 16.6 4.5 L 16.6 6.2 L 19 6.2 L 19 8.5 L 22 8.5 L 22 17 Z"
            fill="var(--prism-well-end)"
            stroke="var(--prism-text-primary)"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          {POE_PIN_X.map((pinX) => (
            <line
              key={pinX}
              x1={pinX}
              y1={15}
              x2={pinX}
              y2={16.8}
              stroke={contactStroke}
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          ))}
          <path
            d="M 15.2 6.8 L 11.6 11.3 L 14.1 11.3 L 12.9 14.6 L 16.7 10.1 L 14.2 10.1 Z"
            fill={isActive ? 'var(--prism-warning-main)' : 'var(--prism-text-disabled)'}
          />
        </>
      ) : kind === 'sfp+' ? (
        <>
          <rect
            x={1.5}
            y={2.5}
            width={25}
            height={17}
            rx={2}
            fill="var(--prism-well-start)"
            stroke="var(--prism-text-secondary)"
            strokeWidth={1.3}
          />
          <line
            x1={5}
            y1={5.5}
            x2={23}
            y2={5.5}
            stroke="var(--prism-text-disabled)"
            strokeWidth={1.1}
            strokeLinecap="round"
          />
          <rect
            x={4.8}
            y={8}
            width={7.6}
            height={8.2}
            rx={1.2}
            fill="var(--prism-well-end)"
            stroke="var(--prism-text-primary)"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <circle
            cx={8.6}
            cy={12.1}
            r={2}
            fill={isActive ? ledToken : 'var(--prism-text-disabled)'}
          />
          <rect
            x={15.6}
            y={8}
            width={7.6}
            height={8.2}
            rx={1.2}
            fill="var(--prism-well-end)"
            stroke="var(--prism-text-primary)"
            strokeOpacity={0.45}
            strokeWidth={1}
          />
          <circle
            cx={19.4}
            cy={12.1}
            r={2}
            fill={isActive ? ledToken : 'var(--prism-text-disabled)'}
          />
        </>
      ) : (
        <>
          <rect
            x={2}
            y={3}
            width={24}
            height={16}
            rx={3}
            fill="var(--prism-well-start)"
            stroke="var(--prism-divider)"
            strokeWidth={1.2}
          />
          <rect
            x={4.5}
            y={6.5}
            width={19}
            height={9}
            rx={4.5}
            fill="var(--prism-well-end)"
            stroke="var(--prism-text-primary)"
            strokeOpacity={0.65}
            strokeWidth={1.4}
          />
          <rect
            x={7.5}
            y={10.2}
            width={13}
            height={1.6}
            rx={0.8}
            fill={isActive ? 'var(--prism-secondary-main)' : 'var(--prism-text-disabled)'}
          />
        </>
      )}
    </svg>
  );
}

function HardwarePortStripInner({
  title = DEFAULT_TITLE,
  ports,
  defaultPorts,
  selectedPortId,
  defaultSelectedPortId,
  onSelectPort,
  onTogglePortAdmin,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: HardwarePortStripProps) {
  const headingId = useId();
  const override = useComponentOverride('HardwarePortStrip');
  const isPortsControlled = ports !== undefined;
  const isSelectionControlled = selectedPortId !== undefined;

  const [internalPorts, setInternalPorts] = useState<HardwarePortSpec[]>(() =>
    normalizePorts(defaultPorts ?? DEFAULT_PORTS)
  );
  const [baselines, setBaselines] = useState<Map<string, PortBaseline>>(() =>
    createInitialBaselines(normalizePorts(ports ?? defaultPorts ?? DEFAULT_PORTS))
  );
  const [internalSelectedId, setInternalSelectedId] = useState<string>(() => {
    const seedPorts = normalizePorts(ports ?? defaultPorts ?? DEFAULT_PORTS);
    return defaultSelectedPortId ?? seedPorts[0]?.id ?? '';
  });
  const [activeFilter, setActiveFilter] = useState<HardwarePortFilter>('all');
  const [previewPortId, setPreviewPortId] = useState<string | null>(null);
  const [rovingPortId, setRovingPortId] = useState<string | null>(null);

  const portButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const rawPorts = useMemo(
    () => (isPortsControlled ? normalizePorts(ports) : internalPorts),
    [isPortsControlled, ports, internalPorts]
  );

  const effectivePorts = useMemo(
    () => rawPorts.map((port) => toEffectivePort(port)),
    [rawPorts]
  );

  const visiblePorts = useMemo(
    () => effectivePorts.filter((port) => matchesFilter(port.status, activeFilter)),
    [effectivePorts, activeFilter]
  );

  const summaryCounts = useMemo(() => {
    let up = 0;
    let warning = 0;
    let down = 0;
    let poeWatts = 0;

    for (const port of effectivePorts) {
      if (port.status === 'up-10g' || port.status === 'up-1g') {
        up += 1;
      } else if (port.status === 'warning') {
        warning += 1;
      } else {
        down += 1;
      }
      poeWatts += port.poeWatts;
    }

    return {
      up,
      warning,
      down,
      poeWatts: roundTenth(poeWatts),
    };
  }, [effectivePorts]);

  const safeTitle = title.trim() || DEFAULT_TITLE;
  const lockedSelectedId = isSelectionControlled ? selectedPortId : internalSelectedId;
  const effectivePreviewId = disabled ? null : previewPortId;

  const inspectedPort = useMemo<HardwarePortSpec | null>(() => {
    const firstVisible = visiblePorts[0];
    if (!firstVisible) {
      return null;
    }
    const previewMatch = effectivePreviewId
      ? visiblePorts.find((port) => port.id === effectivePreviewId)
      : undefined;
    if (previewMatch) {
      return previewMatch;
    }
    return visiblePorts.find((port) => port.id === lockedSelectedId) ?? firstVisible;
  }, [visiblePorts, effectivePreviewId, lockedSelectedId]);

  const isPreviewingOther =
    inspectedPort !== null &&
    effectivePreviewId !== null &&
    inspectedPort.id === effectivePreviewId &&
    inspectedPort.id !== lockedSelectedId;

  const resolvedRovingId = useMemo<string | null>(() => {
    const firstVisible = visiblePorts[0];
    if (!firstVisible) {
      return null;
    }
    if (rovingPortId && visiblePorts.some((port) => port.id === rovingPortId)) {
      return rovingPortId;
    }
    if (visiblePorts.some((port) => port.id === lockedSelectedId)) {
      return lockedSelectedId;
    }
    return firstVisible.id;
  }, [visiblePorts, rovingPortId, lockedSelectedId]);

  const handleSelectFilter = (nextFilter: HardwarePortFilter) => {
    setActiveFilter(nextFilter);
    setPreviewPortId(null);
  };

  const handleSelectPort = (port: HardwarePortSpec) => {
    if (!isSelectionControlled) {
      setInternalSelectedId(port.id);
    }
    setRovingPortId(port.id);
    setPreviewPortId(null);
    onSelectPort?.(port);
  };

  const handlePortKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (disabled || event.nativeEvent.isComposing) {
      return;
    }

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % visiblePorts.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + visiblePorts.length) % visiblePorts.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = visiblePorts.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const targetPort = visiblePorts[nextIndex];
    if (targetPort) {
      setRovingPortId(targetPort.id);
      setPreviewPortId(targetPort.id);
      portButtonRefs.current.get(targetPort.id)?.focus();
    }
  };

  const handleToggleAdmin = (targetPort: HardwarePortSpec) => {
    const nextAdminEnabled = !targetPort.adminEnabled;
    const savedBaseline = baselines.get(targetPort.id);
    let capturedBaseline: PortBaseline | null = null;

    const nextPorts: HardwarePortSpec[] = rawPorts.map((item) => {
      if (item.id !== targetPort.id) {
        return item;
      }

      if (!nextAdminEnabled) {
        capturedBaseline = {
          status: item.status,
          speedLabel: item.speedLabel,
          poeWatts: item.poeWatts,
          rxMbps: item.rxMbps,
          txMbps: item.txMbps,
        };
        return {
          ...item,
          adminEnabled: false,
          status: 'down',
          speedLabel: 'Admin Down',
          poeWatts: 0,
          rxMbps: 0,
          txMbps: 0,
        };
      }

      if (savedBaseline) {
        return {
          ...item,
          adminEnabled: true,
          status: savedBaseline.status,
          speedLabel: savedBaseline.speedLabel,
          poeWatts: savedBaseline.poeWatts,
          rxMbps: savedBaseline.rxMbps,
          txMbps: savedBaseline.txMbps,
        };
      }

      if (item.status !== 'down') {
        return {
          ...item,
          adminEnabled: true,
        };
      }

      return {
        ...item,
        adminEnabled: true,
        status: item.kind === 'sfp+' ? 'up-10g' : 'up-1g',
        speedLabel: getDefaultSpeedForKind(item.kind),
      };
    });

    if (capturedBaseline) {
      const baselineToSave = capturedBaseline;
      setBaselines((prev) => {
        const next = new Map(prev);
        next.set(targetPort.id, baselineToSave);
        return next;
      });
    }

    if (!isPortsControlled) {
      setInternalPorts(nextPorts);
    }

    onTogglePortAdmin?.(targetPort.id, nextAdminEnabled, nextPorts);
  };

  const merged = mergeProps({
    themeTarget: themeProps('hardware-port-strip', {
      disabled,
      filter: activeFilter,
      empty: visiblePorts.length === 0,
      portCount: effectivePorts.length,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full p-4 flex flex-col gap-3.5 min-w-0',
      disabled ? 'opacity-65' : undefined
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('hardware-port-strip', 'header');
  const faceplateClass = stableClassName('hardware-port-strip', 'faceplate');
  const inspectorClass = stableClassName('hardware-port-strip', 'inspector');

  const inspectedStatusMeta = inspectedPort
    ? getStatusMeta(inspectedPort.status, inspectedPort.adminEnabled)
    : null;

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2.5 min-w-0 pb-2.5 border-b'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
            style={STYLE_PRIMARY_MAIN}
          >
            <Server className="w-3.5 h-3.5 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={STYLE_TEXT_PRIMARY}
          >
            {safeTitle}
          </h3>

          <div className="flex flex-wrap items-center gap-1.5">
            <span
              data-testid="hardware-summary-up"
              className="prism-well inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_SUCCESS}
              />
              <span>Up {summaryCounts.up}</span>
            </span>

            <span
              data-testid="hardware-summary-warning"
              className="prism-well inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_WARNING}
              />
              <span>Warning {summaryCounts.warning}</span>
            </span>

            <span
              data-testid="hardware-summary-down"
              className="prism-well inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0"
                style={STYLE_BG_ERROR}
              />
              <span>Down {summaryCounts.down}</span>
            </span>

            <span
              data-testid="hardware-summary-poe"
              className="prism-well inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
              style={STYLE_TEXT_PRIMARY}
            >
              <Zap
                aria-hidden="true"
                className="w-3 h-3 shrink-0"
                style={STYLE_PRIMARY_MAIN}
              />
              <span>PoE {formatWatts(summaryCounts.poeWatts)}</span>
            </span>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter ports by status"
          className="flex flex-wrap items-center gap-1.5 shrink-0"
        >
          {FILTER_OPTIONS.map((option) => {
            const isActiveFilter = activeFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                disabled={disabled}
                aria-pressed={isActiveFilter}
                data-testid={`hardware-filter-${option.id}`}
                data-active={isActiveFilter ? 'true' : undefined}
                onClick={() => handleSelectFilter(option.id)}
                className="prism-crystal prism-focus-ring px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
                style={
                  isActiveFilter
                    ? {
                        color: 'var(--prism-primary-main)',
                        boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                      }
                    : { color: 'var(--prism-text-secondary)' }
                }
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {!inspectedPort || !inspectedStatusMeta ? (
        <div
          role="status"
          data-testid="hardware-port-empty"
          className="prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center gap-2 min-w-0"
        >
          <Server
            aria-hidden="true"
            className="w-5 h-5"
            style={STYLE_TEXT_SECONDARY}
          />
          <p className="text-sm font-semibold" style={STYLE_TEXT_PRIMARY}>
            {effectivePorts.length === 0
              ? 'No hardware ports installed in this chassis'
              : 'No ports match the active status filter'}
          </p>
          <p className="text-xs" style={STYLE_TEXT_SECONDARY}>
            {effectivePorts.length === 0
              ? 'Provide a ports array to populate the 1U optical patch bay.'
              : 'Switch back to All ports to inspect every faceplate bay.'}
          </p>
          {effectivePorts.length > 0 ? (
            <button
              type="button"
              disabled={disabled}
              data-testid="hardware-filter-reset"
              onClick={() => handleSelectFilter('all')}
              className="prism-crystal prism-focus-ring mt-1 px-3 py-1 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform]"
              style={STYLE_PRIMARY_MAIN}
            >
              Show All Ports
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div
              data-testid="hardware-faceplate"
              className={cx(
                faceplateClass,
                'prism-well rounded-2xl p-2 flex items-stretch gap-2 min-w-max border'
              )}
              style={STYLE_BORDER_DIVIDER}
            >
              {renderRackEar('left')}

              <div
                role="group"
                aria-label={`${safeTitle} port bays`}
                data-testid="hardware-port-bays"
                className="flex items-stretch gap-1.5 px-1 py-0.5"
              >
                {visiblePorts.map((port, index) => {
                  const paddedNumber = formatPortNumber(port.portNumber);
                  const kindLabel = getKindLabel(port.kind);
                  const statusMeta = getStatusMeta(port.status, port.adminEnabled);
                  const isSelected = port.id === lockedSelectedId;
                  const isPreviewed =
                    effectivePreviewId === port.id && port.id !== lockedSelectedId;
                  const isRovingTarget = port.id === resolvedRovingId;

                  const portTarget = themeProps(
                    'hardware-port-strip',
                    {
                      portId: port.id,
                      kind: port.kind,
                      status: port.status,
                      selected: isSelected,
                      adminDisabled: !port.adminEnabled,
                    },
                    'port'
                  );

                  return (
                    <button
                      key={port.id}
                      ref={(node) => {
                        if (node) {
                          portButtonRefs.current.set(port.id, node);
                        } else {
                          portButtonRefs.current.delete(port.id);
                        }
                      }}
                      type="button"
                      disabled={disabled}
                      aria-pressed={isSelected}
                      aria-label={`Port ${paddedNumber} ${port.label} (${kindLabel}, ${statusMeta.label})`}
                      tabIndex={disabled ? -1 : isRovingTarget ? 0 : -1}
                      data-testid={`hardware-port-${port.id}`}
                      data-port-kind={port.kind}
                      data-port-status={port.status}
                      data-admin-enabled={port.adminEnabled ? 'true' : 'false'}
                      onMouseEnter={() => {
                        setPreviewPortId(port.id);
                      }}
                      onMouseLeave={() => {
                        setPreviewPortId((current) => (current === port.id ? null : current));
                      }}
                      onFocus={() => {
                        if (!disabled) {
                          setPreviewPortId(port.id);
                          setRovingPortId(port.id);
                        }
                      }}
                      onBlur={() => {
                        setPreviewPortId((current) => (current === port.id ? null : current));
                      }}
                      onClick={() => handleSelectPort(port)}
                      onKeyDown={(event) => handlePortKeyDown(event, index)}
                      {...mergeProps({
                        themeTarget: portTarget,
                        baseClassName: cx(
                          'prism-crystal prism-focus-ring w-[64px] rounded-xl px-1.5 py-2 flex flex-col items-center justify-between gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] select-none shrink-0',
                          !port.adminEnabled ? 'opacity-60' : undefined
                        ),
                        baseStyle: isSelected
                          ? {
                              boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
                            }
                          : isPreviewed
                            ? {
                                boxShadow: 'inset 0 0 0 1.5px var(--prism-secondary-main)',
                              }
                            : undefined,
                      })}
                    >
                      <div className="w-full flex items-center justify-between gap-1">
                        <span
                          data-testid={`port-number-${port.id}`}
                          className="font-mono text-[10px] font-bold tabular-nums leading-none"
                          style={STYLE_TEXT_SECONDARY}
                        >
                          {paddedNumber}
                        </span>
                        <span
                          aria-hidden="true"
                          data-testid={`port-led-${port.id}`}
                          data-status={port.status}
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: statusMeta.ledToken }}
                        />
                      </div>

                      {renderPortSocketGlyph(
                        port.id,
                        port.kind,
                        port.status,
                        statusMeta.ledToken
                      )}

                      <span
                        data-testid={`port-kind-${port.id}`}
                        className="font-mono text-[9px] font-semibold uppercase tracking-wider leading-none"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {kindLabel}
                      </span>
                    </button>
                  );
                })}
              </div>

              {renderRackEar('right')}
            </div>
          </div>

          <div
            aria-live="polite"
            data-testid="hardware-port-inspector"
            className={cx(
              inspectorClass,
              'prism-well rounded-2xl p-3.5 flex flex-col gap-3 min-w-0 border'
            )}
            style={STYLE_BORDER_DIVIDER}
          >
              <div className="flex flex-wrap items-center justify-between gap-2.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span
                    data-testid="inspector-port-number"
                    className="prism-crystal px-2 py-0.5 rounded-md font-mono text-xs font-bold tabular-nums shrink-0"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    Port {formatPortNumber(inspectedPort.portNumber)}
                  </span>
                  <span
                    data-testid="inspector-port-label"
                    className="text-sm font-semibold tracking-tight truncate min-w-0"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {inspectedPort.label}
                  </span>
                  <span
                    data-testid="inspector-port-kind"
                    className="prism-crystal px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold uppercase tracking-wider shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {getKindLabel(inspectedPort.kind)}
                  </span>
                  <span
                    data-testid="inspector-port-status"
                    className="prism-crystal inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold shrink-0"
                    style={{
                      color: inspectedStatusMeta.ledToken,
                      boxShadow: `inset 0 0 0 1px ${inspectedStatusMeta.ledToken}`,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: inspectedStatusMeta.ledToken }}
                    />
                    <span>{inspectedStatusMeta.label}</span>
                  </span>
                  <span
                    data-testid="inspector-selection-mode"
                    className="font-mono text-[10px] uppercase tracking-wider shrink-0"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    {isPreviewingOther ? 'Preview' : 'Selected'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  aria-pressed={!inspectedPort.adminEnabled}
                  data-testid="hardware-port-admin-toggle"
                  onClick={() => handleToggleAdmin(inspectedPort)}
                  className="prism-crystal prism-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed enabled:hover:brightness-105 transition-[color,background-color,border-color,opacity,transform] shrink-0"
                  style={
                    inspectedPort.adminEnabled
                      ? {
                          color: 'var(--prism-error-main)',
                          boxShadow: 'inset 0 0 0 1px var(--prism-error-main)',
                        }
                      : {
                          color: 'var(--prism-success-main)',
                          boxShadow: 'inset 0 0 0 1px var(--prism-success-main)',
                        }
                  }
                >
                  <Power aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  <span>{inspectedPort.adminEnabled ? 'Disable Port' : 'Enable Port'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 min-w-0">
                <div className="prism-crystal rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Negotiated Speed
                  </span>
                  <span
                    data-testid="inspector-speed"
                    className="font-mono text-xs font-semibold truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {inspectedPort.speedLabel}
                  </span>
                </div>

                <div className="prism-crystal rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    VLAN ID
                  </span>
                  <span
                    data-testid="inspector-vlan"
                    className="font-mono text-xs font-semibold truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {inspectedPort.vlan}
                  </span>
                </div>

                <div className="prism-crystal rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    PoE Draw
                  </span>
                  <span
                    data-testid="inspector-poe"
                    className="font-mono text-xs font-semibold tabular-nums truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {formatWatts(inspectedPort.poeWatts)}
                  </span>
                </div>

                <div className="prism-crystal rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0">
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    <Activity aria-hidden="true" className="w-3 h-3 shrink-0" />
                    <span>RX / TX</span>
                  </span>
                  <span
                    data-testid="inspector-throughput"
                    className="font-mono text-xs font-semibold tabular-nums truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {formatMbps(inspectedPort.rxMbps)} / {formatMbps(inspectedPort.txMbps)} Mbps
                  </span>
                </div>

                <div className="prism-crystal rounded-xl px-3 py-2 flex flex-col gap-0.5 min-w-0 col-span-2 sm:col-span-2 lg:col-span-1">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    Connected Device
                  </span>
                  <span
                    data-testid="inspector-device"
                    className="text-xs font-semibold truncate"
                    style={STYLE_TEXT_PRIMARY}
                  >
                    {inspectedPort.connectedDevice}
                  </span>
                </div>
              </div>
            </div>
        </>
      )}
    </div>
  );
}

export const HardwarePortStrip = memo(HardwarePortStripInner);
HardwarePortStrip.displayName = 'HardwarePortStrip';
