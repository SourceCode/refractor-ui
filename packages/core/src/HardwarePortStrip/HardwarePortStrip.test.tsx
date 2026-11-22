import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  HardwarePortStrip,
  type HardwarePortKindMap,
  type HardwarePortSpec,
  type HardwarePortStatusMap,
} from './index';

describe('HardwarePortStrip', () => {
  it('renders the default 12-port 1U faceplate across all 4 kinds and 4 statuses with PrismThemeProvider overrides, xstyle, and React 19 ref', () => {
    const ref = createRef<HTMLDivElement>();
    const kindMap: HardwarePortKindMap = {
      rj45: true,
      'sfp+': true,
      'usb-c': true,
      poe: true,
    };
    const statusMap: HardwarePortStatusMap = {
      'up-10g': true,
      'up-1g': true,
      warning: true,
      down: true,
    };
    expect(Object.keys(kindMap)).toEqual(['rj45', 'sfp+', 'usb-c', 'poe']);
    expect(Object.keys(statusMap)).toEqual(['up-10g', 'up-1g', 'warning', 'down']);
    expect(HardwarePortStrip.displayName).toBe('HardwarePortStrip');

    render(
      <PrismThemeProvider
        theme={{
          components: {
            HardwarePortStrip: {
              className: 'theme-port-strip-override',
              style: { letterSpacing: '0.2px' },
            },
          },
        }}
      >
        <HardwarePortStrip
          ref={ref}
          className="custom-strip-class"
          xstyle={{ '--prism-blur-px': '20px' }}
          style={{ minWidth: '320px' }}
          data-testid="hardware-strip"
        />
      </PrismThemeProvider>
    );

    const root = screen.getByTestId('hardware-strip');
    expect(ref.current).toBe(root);
    expect(root).toHaveClass(
      'refractor-hardware-port-strip',
      'prism-slab',
      'theme-port-strip-override',
      'custom-strip-class'
    );
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveAttribute('data-filter', 'all');
    expect(root).toHaveAttribute('data-port-count', '12');
    expect(root).not.toHaveAttribute('data-empty');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).toHaveStyle({ letterSpacing: '0.2px', minWidth: '320px' });

    expect(
      screen.getByRole('heading', { name: 'Refractor SW-12X · 1U Optical Patch Bay' })
    ).toBeInTheDocument();

    // Live summary pills & total active PoE load (18.4 + 12.6 + 24.8 = 55.8W)
    expect(screen.getByTestId('hardware-summary-up')).toHaveTextContent('Up 7');
    expect(screen.getByTestId('hardware-summary-warning')).toHaveTextContent('Warning 2');
    expect(screen.getByTestId('hardware-summary-down')).toHaveTextContent('Down 3');
    expect(screen.getByTestId('hardware-summary-poe')).toHaveTextContent('PoE 55.8W');

    // Faceplate wrapped directly inside <div className="overflow-x-auto"> with rack ears
    const faceplate = screen.getByTestId('hardware-faceplate');
    expect(faceplate.parentElement).toHaveClass('overflow-x-auto');
    expect(screen.getByTestId('hardware-rack-ear-left')).toBeInTheDocument();
    expect(screen.getByTestId('hardware-rack-ear-right')).toBeInTheDocument();

    // All 12 ports present across PoE, RJ45, USB-C, and SFP+
    const expectedKinds: Array<[string, string, string]> = [
      ['port-01', 'poe', 'PoE'],
      ['port-04', 'rj45', 'RJ45'],
      ['port-07', 'usb-c', 'USB-C'],
      ['port-09', 'sfp+', 'SFP+'],
    ];

    for (const [id, kind, tag] of expectedKinds) {
      const btn = screen.getByTestId(`hardware-port-${id}`);
      expect(btn).toHaveAttribute('data-port-kind', kind);
      expect(screen.getByTestId(`port-kind-${id}`)).toHaveTextContent(tag);
      const glyph = screen.getByTestId(`port-glyph-${id}`);
      expect(glyph).toHaveAttribute('viewBox', '0 0 28 22');
      expect(glyph).toHaveAttribute('data-port-glyph', kind);
    }

    // Status LED token colors for all 4 statuses
    expect(screen.getByTestId('port-led-port-09').style.backgroundColor).toBe(
      'var(--prism-success-main)'
    );
    expect(screen.getByTestId('port-led-port-01').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('port-led-port-03').style.backgroundColor).toBe(
      'var(--prism-warning-main)'
    );
    expect(screen.getByTestId('port-led-port-06').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('port-led-port-08').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );

    // Initial locked selection & diagnostic inspector
    expect(screen.getByTestId('hardware-port-port-01')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hardware-port-port-02')).toHaveAttribute('aria-pressed', 'false');

    const inspector = screen.getByTestId('hardware-port-inspector');
    expect(inspector).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 01');
    expect(screen.getByTestId('inspector-port-label')).toHaveTextContent('AP-Studio-North');
    expect(screen.getByTestId('inspector-port-kind')).toHaveTextContent('PoE');
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('1G Up');
    expect(screen.getByTestId('inspector-selection-mode')).toHaveTextContent('Selected');
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent('1G Full');
    expect(screen.getByTestId('inspector-vlan')).toHaveTextContent('VLAN 20');
    expect(screen.getByTestId('inspector-poe')).toHaveTextContent('18.4W');
    expect(screen.getByTestId('inspector-throughput')).toHaveTextContent('412 / 186 Mbps');
    expect(screen.getByTestId('inspector-device')).toHaveTextContent('UniFi U7-Pro Ceiling AP');
  });

  it('filters visible ports by All, Up, Warning, and Down and shows resettable empty state when 0 ports match', () => {
    render(<HardwarePortStrip />);

    const filterAll = screen.getByTestId('hardware-filter-all');
    const filterUp = screen.getByTestId('hardware-filter-up');
    const filterWarning = screen.getByTestId('hardware-filter-warning');
    const filterDown = screen.getByTestId('hardware-filter-down');

    expect(filterAll).toHaveAttribute('aria-pressed', 'true');
    expect(filterUp).toHaveAttribute('aria-pressed', 'false');

    // Filter Up -> 7 ports
    fireEvent.click(filterUp);
    expect(filterUp).toHaveAttribute('aria-pressed', 'true');
    expect(filterAll).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('hardware-port-bays').querySelectorAll('button')).toHaveLength(7);

    // Filter Warning -> 2 ports (port-03, port-11) and inspector switches to first visible warning port
    fireEvent.click(filterWarning);
    expect(filterWarning).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hardware-port-bays').querySelectorAll('button')).toHaveLength(2);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 03');
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('Warning');

    // Filter Down -> 3 ports (port-06, port-08, port-12)
    fireEvent.click(filterDown);
    expect(filterDown).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('hardware-port-bays').querySelectorAll('button')).toHaveLength(3);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 06');
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('Admin Down');

    // Back to All -> 12 ports
    fireEvent.click(filterAll);
    expect(screen.getByTestId('hardware-port-bays').querySelectorAll('button')).toHaveLength(12);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 01');
  });

  it('shows role="status" empty filter state and restores all ports on Show All Ports click', () => {
    const upOnlyPorts: HardwarePortSpec[] = [
      {
        id: 'up-1',
        portNumber: 1,
        label: 'Primary-Link',
        kind: 'rj45',
        status: 'up-1g',
        adminEnabled: true,
        speedLabel: '1G Full',
        vlan: 'VLAN 10',
        poeWatts: 0,
        rxMbps: 300,
        txMbps: 250,
        connectedDevice: 'Host A',
      },
    ];

    render(<HardwarePortStrip defaultPorts={upOnlyPorts} data-testid="filter-empty-strip" />);

    fireEvent.click(screen.getByTestId('hardware-filter-warning'));

    const empty = screen.getByRole('status');
    expect(empty).toHaveTextContent('No ports match the active status filter');
    expect(screen.getByTestId('filter-empty-strip')).toHaveAttribute('data-empty', 'true');
    expect(screen.queryByTestId('hardware-port-inspector')).toBeNull();

    fireEvent.click(screen.getByTestId('hardware-filter-reset'));
    expect(screen.queryByTestId('hardware-port-empty')).toBeNull();
    expect(screen.getByTestId('hardware-port-up-1')).toBeInTheDocument();
  });

  it('previews ports on hover/focus and locks selection on click with diagnostic updates', () => {
    const onSelectPort = vi.fn();
    render(<HardwarePortStrip onSelectPort={onSelectPort} />);

    const port01 = screen.getByTestId('hardware-port-port-01');
    const port07 = screen.getByTestId('hardware-port-port-07');
    const port09 = screen.getByTestId('hardware-port-port-09');

    // Hover previews port-09 without changing locked aria-pressed
    fireEvent.mouseEnter(port09);
    expect(port01).toHaveAttribute('aria-pressed', 'true');
    expect(port09).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 09');
    expect(screen.getByTestId('inspector-port-label')).toHaveTextContent('Core-Uplink-A');
    expect(screen.getByTestId('inspector-port-kind')).toHaveTextContent('SFP+');
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('10G Up');
    expect(screen.getByTestId('inspector-selection-mode')).toHaveTextContent('Preview');
    expect(screen.getByTestId('inspector-throughput')).toHaveTextContent('7,840 / 6,920 Mbps');

    // Leaving a non-previewed port keeps current preview intact
    fireEvent.mouseLeave(port07);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 09');

    // Leaving the previewed port returns to locked port-01
    fireEvent.mouseLeave(port09);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 01');
    expect(screen.getByTestId('inspector-selection-mode')).toHaveTextContent('Selected');

    // Focus previews port-07 and blur restores locked port-01
    fireEvent.focus(port07);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 07');
    expect(screen.getByTestId('inspector-port-kind')).toHaveTextContent('USB-C');
    expect(screen.getByTestId('inspector-selection-mode')).toHaveTextContent('Preview');

    // Blurring an unrelated port keeps focus preview intact
    fireEvent.blur(port09);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 07');

    fireEvent.blur(port07);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 01');

    // Clicking port-09 locks selection and invokes onSelectPort
    fireEvent.click(port09);
    expect(onSelectPort).toHaveBeenCalledTimes(1);
    expect(onSelectPort.mock.calls[0]?.[0]).toMatchObject({
      id: 'port-09',
      label: 'Core-Uplink-A',
      kind: 'sfp+',
    });
    expect(port09).toHaveAttribute('aria-pressed', 'true');
    expect(port01).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 09');
    expect(screen.getByTestId('inspector-selection-mode')).toHaveTextContent('Selected');
  });

  it('toggles Disable Port / Enable Port admin state, dropping status to down and PoE to 0W and restoring baseline on re-enable', () => {
    const onTogglePortAdmin = vi.fn();
    render(<HardwarePortStrip onTogglePortAdmin={onTogglePortAdmin} />);

    // Initial Port 01 active PoE 18.4W, total 55.8W
    const toggleBtn = screen.getByTestId('hardware-port-admin-toggle');
    expect(toggleBtn).toHaveTextContent('Disable Port');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'false');

    // Disable Port 01
    fireEvent.click(toggleBtn);

    expect(onTogglePortAdmin).toHaveBeenCalledTimes(1);
    expect(onTogglePortAdmin.mock.calls[0]?.[0]).toBe('port-01');
    expect(onTogglePortAdmin.mock.calls[0]?.[1]).toBe(false);
    const afterDisable = onTogglePortAdmin.mock.calls[0]?.[2] as ReadonlyArray<HardwarePortSpec>;
    expect(afterDisable.find((p) => p.id === 'port-01')).toMatchObject({
      adminEnabled: false,
      status: 'down',
      speedLabel: 'Admin Down',
      poeWatts: 0,
      rxMbps: 0,
      txMbps: 0,
    });

    expect(toggleBtn).toHaveTextContent('Enable Port');
    expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('Admin Down');
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent('Admin Down');
    expect(screen.getByTestId('inspector-poe')).toHaveTextContent('0W');
    expect(screen.getByTestId('inspector-throughput')).toHaveTextContent('0 / 0 Mbps');
    expect(screen.getByTestId('port-led-port-01').style.backgroundColor).toBe(
      'var(--prism-error-main)'
    );
    expect(screen.getByTestId('hardware-summary-up')).toHaveTextContent('Up 6');
    expect(screen.getByTestId('hardware-summary-down')).toHaveTextContent('Down 4');
    expect(screen.getByTestId('hardware-summary-poe')).toHaveTextContent('PoE 37.4W');

    // Re-enable Port 01 -> restores exact baseline speed, link status, throughput, and PoE draw
    fireEvent.click(toggleBtn);

    expect(onTogglePortAdmin).toHaveBeenCalledTimes(2);
    expect(onTogglePortAdmin.mock.calls[1]?.[0]).toBe('port-01');
    expect(onTogglePortAdmin.mock.calls[1]?.[1]).toBe(true);
    expect(toggleBtn).toHaveTextContent('Disable Port');
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('1G Up');
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent('1G Full');
    expect(screen.getByTestId('inspector-poe')).toHaveTextContent('18.4W');
    expect(screen.getByTestId('inspector-throughput')).toHaveTextContent('412 / 186 Mbps');
    expect(screen.getByTestId('port-led-port-01').style.backgroundColor).toBe(
      'var(--prism-info-main)'
    );
    expect(screen.getByTestId('hardware-summary-up')).toHaveTextContent('Up 7');
    expect(screen.getByTestId('hardware-summary-down')).toHaveTextContent('Down 3');
    expect(screen.getByTestId('hardware-summary-poe')).toHaveTextContent('PoE 55.8W');
  });

  it('enables initially admin-disabled ports across RJ45, SFP+, USB-C, and pre-disabled non-down specs', () => {
    const initialDisabledPorts: HardwarePortSpec[] = [
      {
        id: 'rj-down',
        portNumber: 1,
        label: 'RJ-Spare',
        kind: 'rj45',
        status: 'down',
        adminEnabled: false,
        speedLabel: 'Admin Down',
        vlan: 'VLAN 10',
        poeWatts: 0,
        rxMbps: 0,
        txMbps: 0,
        connectedDevice: 'Spare Bay',
      },
      {
        id: 'sfp-down',
        portNumber: 2,
        label: 'Fiber-Spare',
        kind: 'sfp+',
        status: 'down',
        adminEnabled: false,
        speedLabel: 'Admin Down',
        vlan: 'VLAN 50',
        poeWatts: 0,
        rxMbps: 0,
        txMbps: 0,
        connectedDevice: 'Optical Cage',
      },
      {
        id: 'usb-down',
        portNumber: 3,
        label: 'USB-Spare',
        kind: 'usb-c',
        status: 'down',
        adminEnabled: false,
        speedLabel: 'Admin Down',
        vlan: 'MGMT 01',
        poeWatts: 0,
        rxMbps: 0,
        txMbps: 0,
        connectedDevice: 'Console Port',
      },
      {
        id: 'poe-pre-disabled',
        portNumber: 4,
        label: 'Pre-Disabled-PoE',
        kind: 'poe',
        status: 'up-1g',
        adminEnabled: false,
        speedLabel: '1G Full',
        vlan: 'VLAN 20',
        poeWatts: 15,
        rxMbps: 120,
        txMbps: 80,
        connectedDevice: 'Dormant Camera',
      },
    ];

    render(<HardwarePortStrip defaultPorts={initialDisabledPorts} />);

    // Initially all 4 show down and 0W effective PoE
    expect(screen.getByTestId('hardware-summary-down')).toHaveTextContent('Down 4');
    expect(screen.getByTestId('hardware-summary-poe')).toHaveTextContent('PoE 0W');

    // Enable RJ45 spare -> 1G Full
    fireEvent.click(screen.getByTestId('hardware-port-admin-toggle'));
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('1G Up');
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent('1G Full');

    // Enable SFP+ spare -> 10G SR Fiber
    fireEvent.click(screen.getByTestId('hardware-port-sfp-down'));
    fireEvent.click(screen.getByTestId('hardware-port-admin-toggle'));
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('10G Up');
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent('10G SR Fiber');

    // Enable USB-C spare -> USB3 Telemetry
    fireEvent.click(screen.getByTestId('hardware-port-usb-down'));
    fireEvent.click(screen.getByTestId('hardware-port-admin-toggle'));
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('1G Up');
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent('USB3 Telemetry');

    // Enable pre-disabled PoE port -> restores baseline 15W and 1G Full
    fireEvent.click(screen.getByTestId('hardware-port-poe-pre-disabled'));
    expect(screen.getByTestId('inspector-poe')).toHaveTextContent('0W');
    fireEvent.click(screen.getByTestId('hardware-port-admin-toggle'));
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('1G Up');
    expect(screen.getByTestId('inspector-poe')).toHaveTextContent('15W');
    expect(screen.getByTestId('hardware-summary-poe')).toHaveTextContent('PoE 15W');
  });

  it('supports IME-safe ArrowLeft, ArrowRight, Home, and End roving keyboard navigation across visible ports', () => {
    render(<HardwarePortStrip />);

    const port01 = screen.getByTestId('hardware-port-port-01');
    const port02 = screen.getByTestId('hardware-port-port-02');
    const port12 = screen.getByTestId('hardware-port-port-12');

    expect(port01).toHaveAttribute('tabindex', '0');
    expect(port02).toHaveAttribute('tabindex', '-1');
    expect(port12).toHaveAttribute('tabindex', '-1');

    act(() => {
      port01.focus();
    });

    // ArrowRight -> port-02
    fireEvent.keyDown(port01, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(port02);
    expect(port02).toHaveAttribute('tabindex', '0');
    expect(port01).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 02');

    // End -> port-12
    fireEvent.keyDown(port02, { key: 'End' });
    expect(document.activeElement).toBe(port12);
    expect(port12).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 12');

    // ArrowRight wraps from port-12 -> port-01
    fireEvent.keyDown(port12, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(port01);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 01');

    // ArrowLeft wraps from port-01 -> port-12
    fireEvent.keyDown(port01, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(port12);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 12');

    // Home -> port-01
    fireEvent.keyDown(port12, { key: 'Home' });
    expect(document.activeElement).toBe(port01);
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 01');

    // Unhandled key leaves focus unchanged
    fireEvent.keyDown(port01, { key: 'a' });
    expect(document.activeElement).toBe(port01);

    // IME composition must be ignored
    const composingEvent = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEvent, 'isComposing', { value: true });
    act(() => {
      port01.dispatchEvent(composingEvent);
    });
    expect(document.activeElement).toBe(port01);
  });

  it('renders a clean role="status" empty state when ports={[]}', () => {
    render(<HardwarePortStrip ports={[]} data-testid="empty-chassis" />);

    expect(screen.getByTestId('empty-chassis')).toHaveAttribute('data-empty', 'true');
    expect(screen.getByTestId('empty-chassis')).toHaveAttribute('data-port-count', '0');
    expect(screen.getByTestId('hardware-summary-up')).toHaveTextContent('Up 0');
    expect(screen.getByTestId('hardware-summary-warning')).toHaveTextContent('Warning 0');
    expect(screen.getByTestId('hardware-summary-down')).toHaveTextContent('Down 0');
    expect(screen.getByTestId('hardware-summary-poe')).toHaveTextContent('PoE 0W');

    const empty = screen.getByRole('status');
    expect(empty).toHaveTextContent('No hardware ports installed in this chassis');
    expect(screen.queryByTestId('hardware-faceplate')).toBeNull();
    expect(screen.queryByTestId('hardware-port-inspector')).toBeNull();
    expect(screen.queryByTestId('hardware-filter-reset')).toBeNull();
  });

  it('operates in both defaultSelectedPortId uncontrolled mode and fully controlled ports + selectedPortId mode', () => {
    const seedPorts: HardwarePortSpec[] = [
      {
        id: 'ctrl-1',
        portNumber: 1,
        label: 'Edge-01',
        kind: 'poe',
        status: 'up-1g',
        adminEnabled: true,
        speedLabel: '1G Full',
        vlan: 'VLAN 10',
        poeWatts: 10,
        rxMbps: 100,
        txMbps: 50,
        connectedDevice: 'Sensor Node 1',
      },
      {
        id: 'ctrl-2',
        portNumber: 2,
        label: 'Uplink-02',
        kind: 'sfp+',
        status: 'up-10g',
        adminEnabled: true,
        speedLabel: '10G SR Fiber',
        vlan: 'TRUNK',
        poeWatts: 0,
        rxMbps: 5000,
        txMbps: 4200,
        connectedDevice: 'Core Spine',
      },
    ];

    function ControlledHarness() {
      const [ports, setPorts] = useState<ReadonlyArray<HardwarePortSpec>>(seedPorts);
      const [selectedId, setSelectedId] = useState<string>('ctrl-2');
      return (
        <HardwarePortStrip
          title="Controlled Core Switch"
          ports={ports}
          selectedPortId={selectedId}
          onSelectPort={(port) => setSelectedId(port.id)}
          onTogglePortAdmin={(_id, _enabled, nextPorts) => setPorts(nextPorts)}
        />
      );
    }

    const { unmount } = render(<ControlledHarness />);

    expect(screen.getByRole('heading', { name: 'Controlled Core Switch' })).toBeInTheDocument();
    expect(screen.getByTestId('hardware-port-ctrl-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('inspector-port-label')).toHaveTextContent('Uplink-02');

    // Click ctrl-1 updates controlled selection
    fireEvent.click(screen.getByTestId('hardware-port-ctrl-1'));
    expect(screen.getByTestId('hardware-port-ctrl-1')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('inspector-port-label')).toHaveTextContent('Edge-01');

    // Disable ctrl-1 updates controlled ports
    fireEvent.click(screen.getByTestId('hardware-port-admin-toggle'));
    expect(screen.getByTestId('inspector-port-status')).toHaveTextContent('Admin Down');
    expect(screen.getByTestId('hardware-summary-poe')).toHaveTextContent('PoE 0W');

    unmount();

    // Uncontrolled defaultSelectedPortId
    render(<HardwarePortStrip defaultPorts={seedPorts} defaultSelectedPortId="ctrl-2" />);
    expect(screen.getByTestId('hardware-port-ctrl-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('inspector-port-label')).toHaveTextContent('Uplink-02');
  });

  it('disables all interactive controls and blocks interaction when disabled is true', () => {
    const onSelectPort = vi.fn();
    const onTogglePortAdmin = vi.fn();

    render(
      <HardwarePortStrip
        disabled
        onSelectPort={onSelectPort}
        onTogglePortAdmin={onTogglePortAdmin}
        data-testid="disabled-strip"
      />
    );

    const root = screen.getByTestId('disabled-strip');
    expect(root).toHaveAttribute('aria-disabled', 'true');
    expect(root).toHaveAttribute('data-disabled', 'true');

    const filterUp = screen.getByTestId('hardware-filter-up');
    const port02 = screen.getByTestId('hardware-port-port-02');
    const adminToggle = screen.getByTestId('hardware-port-admin-toggle');

    expect(filterUp).toBeDisabled();
    expect(port02).toBeDisabled();
    expect(port02).toHaveAttribute('tabindex', '-1');
    expect(adminToggle).toBeDisabled();

    fireEvent.click(filterUp);
    fireEvent.mouseEnter(port02);
    fireEvent.focus(port02);
    fireEvent.click(port02);
    fireEvent.keyDown(port02, { key: 'ArrowRight' });
    fireEvent.click(adminToggle);

    expect(onSelectPort).not.toHaveBeenCalled();
    expect(onTogglePortAdmin).not.toHaveBeenCalled();
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 01');
  });

  it('sanitizes duplicate IDs, invalid numeric inputs, blank metadata, and renders XSS payloads as literal text', () => {
    const adversarialPorts: HardwarePortSpec[] = [
      {
        id: 'dup-port',
        portNumber: 1,
        label: '<script>alert("xss")</script>',
        kind: 'poe',
        status: 'up-1g',
        adminEnabled: true,
        speedLabel: '<img src=x onerror=alert(1)>',
        vlan: 'VLAN 10',
        poeWatts: 2500,
        rxMbps: -50,
        txMbps: Number.NaN,
        connectedDevice: '<svg onload=alert(1)>',
      },
      {
        id: 'dup-port',
        portNumber: 2,
        label: 'Duplicate Dropped',
        kind: 'rj45',
        status: 'up-1g',
        adminEnabled: true,
        speedLabel: '1G Full',
        vlan: 'VLAN 10',
        poeWatts: 0,
        rxMbps: 100,
        txMbps: 100,
        connectedDevice: 'Ignored',
      },
      {
        id: 'blank-port',
        portNumber: Number.NaN,
        label: '   ',
        kind: 'rj45',
        status: 'up-1g',
        adminEnabled: true,
        speedLabel: '   ',
        vlan: '   ',
        poeWatts: -10,
        rxMbps: 99999999,
        txMbps: 120,
        connectedDevice: '   ',
      },
    ];

    const { container } = render(
      <HardwarePortStrip title="   " ports={adversarialPorts} />
    );

    // Blank title falls back to default chassis name
    expect(
      screen.getByRole('heading', { name: 'Refractor SW-12X · 1U Optical Patch Bay' })
    ).toBeInTheDocument();

    // Duplicate ID dropped -> 2 ports remain
    expect(screen.getByTestId('hardware-port-bays').querySelectorAll('button')).toHaveLength(2);
    expect(screen.queryByText('Duplicate Dropped')).toBeNull();

    // XSS strings rendered strictly as literal text, no injected script/img tags
    expect(screen.getByTestId('inspector-port-label')).toHaveTextContent(
      '<script>alert("xss")</script>'
    );
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent(
      '<img src=x onerror=alert(1)>'
    );
    expect(screen.getByTestId('inspector-device')).toHaveTextContent('<svg onload=alert(1)>');
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();

    // Clamped numeric metrics on first port
    expect(screen.getByTestId('inspector-poe')).toHaveTextContent('1000W');
    expect(screen.getByTestId('inspector-throughput')).toHaveTextContent('0 / 0 Mbps');

    // Inspect blank fallback port
    fireEvent.click(screen.getByTestId('hardware-port-blank-port'));
    expect(screen.getByTestId('inspector-port-number')).toHaveTextContent('Port 03');
    expect(screen.getByTestId('inspector-port-label')).toHaveTextContent('Port 03');
    expect(screen.getByTestId('inspector-speed')).toHaveTextContent('No Link');
    expect(screen.getByTestId('inspector-vlan')).toHaveTextContent('Unassigned');
    expect(screen.getByTestId('inspector-poe')).toHaveTextContent('0W');
    expect(screen.getByTestId('inspector-throughput')).toHaveTextContent('1,000,000 / 120 Mbps');
    expect(screen.getByTestId('inspector-device')).toHaveTextContent('Unconnected');
  });

  it('restores original raw status when enabling a controlled port that had adminEnabled false without a cached baseline', () => {
    const onTogglePortAdmin = vi.fn();
    const preDisabledControlled: HardwarePortSpec[] = [
      {
        id: 'raw-up-disabled',
        portNumber: 1,
        label: 'Staged-Port',
        kind: 'rj45',
        status: 'up-1g',
        adminEnabled: false,
        speedLabel: '1G Full',
        vlan: 'VLAN 12',
        poeWatts: 0,
        rxMbps: 320,
        txMbps: 240,
        connectedDevice: 'Staged Host',
      },
    ];

    // Mount with empty ports first (so initial baseline map is empty), then rerender with pre-disabled port
    const { rerender } = render(
      <HardwarePortStrip ports={[]} onTogglePortAdmin={onTogglePortAdmin} />
    );

    rerender(
      <HardwarePortStrip ports={preDisabledControlled} onTogglePortAdmin={onTogglePortAdmin} />
    );

    fireEvent.click(screen.getByTestId('hardware-port-admin-toggle'));

    expect(onTogglePortAdmin).toHaveBeenCalledTimes(1);
    expect(onTogglePortAdmin.mock.calls[0]?.[1]).toBe(true);
    const emitted = onTogglePortAdmin.mock.calls[0]?.[2] as ReadonlyArray<HardwarePortSpec>;
    expect(emitted[0]).toMatchObject({
      id: 'raw-up-disabled',
      adminEnabled: true,
      status: 'up-1g',
      speedLabel: '1G Full',
    });
  });
});
