import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PrismThemeProvider } from '../theme/PrismThemeProvider';
import {
  NetworkVpnPopover,
  type VpnProfileEntry,
  type WifiNetworkEntry,
} from './index';

describe('NetworkVpnPopover', () => {
  it('renders default networks, VPN profiles, signal graphics, security badges, ref passthrough, responsive classes, and theme overrides', () => {
    const ref = createRef<HTMLDivElement>();

    render(
      <PrismThemeProvider
        theme={{
          components: {
            NetworkVpnPopover: {
              className: 'theme-network-vpn-popover',
              style: { opacity: '0.97' },
            },
          },
        }}
      >
        <NetworkVpnPopover
          ref={ref}
          className="local-network-popover"
          xstyle={{ '--prism-blur-px': '20px' }}
          data-testid="network-vpn-root"
        />
      </PrismThemeProvider>
    );

    expect(NetworkVpnPopover.displayName).toBe('NetworkVpnPopover');

    const root = screen.getByTestId('network-vpn-root');
    expect(ref.current).toBe(root);
    expect(root).toHaveAttribute('role', 'region');
    expect(root).toHaveClass(
      'refractor-network-vpn-popover',
      'prism-slab',
      'theme-network-vpn-popover',
      'local-network-popover'
    );
    expect(root).toHaveStyle({ opacity: '0.97' });
    expect(root).toHaveAttribute('data-wifi', 'true');
    expect(root).toHaveAttribute('data-connected', 'true');
    expect(root).not.toHaveAttribute('data-airplane-mode');
    expect(root).not.toHaveAttribute('data-vpn-active');
    expect(root).not.toHaveAttribute('data-disabled');
    expect(root).not.toHaveAttribute('aria-disabled');

    expect(
      screen.getByRole('heading', { name: 'Network & VPN' })
    ).toBeInTheDocument();

    const radioControls = screen.getByTestId('network-vpn-radio-controls');
    expect(radioControls).toHaveClass('flex-wrap', 'min-w-0');

    const wifiSwitch = screen.getByRole('switch', { name: 'Wi-Fi' });
    const airplaneSwitch = screen.getByRole('switch', {
      name: 'Airplane Mode',
    });
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'true');
    expect(wifiSwitch).toHaveClass('prism-focus-ring');
    expect(wifiSwitch).not.toBeDisabled();
    expect(airplaneSwitch).toHaveAttribute('aria-checked', 'false');
    expect(airplaneSwitch).toHaveClass('prism-focus-ring');
    expect(airplaneSwitch).not.toBeDisabled();

    // 4 default Wi-Fi networks with signal bars, security badges, band pills, and Connect/Disconnect buttons
    expect(screen.getByText('Studio-5G-Optical')).toBeInTheDocument();
    expect(screen.getByText('Refractor-Lab-6E')).toBeInTheDocument();
    expect(screen.getByText('Conference-Guest')).toBeInTheDocument();
    expect(screen.getByText('Mesh-Extender')).toBeInTheDocument();

    expect(
      screen.getByTestId('network-vpn-connected-pill-wifi-studio-5g')
    ).toHaveTextContent('Connected');

    const signalCases: ReadonlyArray<{
      id: string;
      bars: number;
      token: string;
      label: string;
    }> = [
      {
        id: 'wifi-studio-5g',
        bars: 4,
        token: 'var(--prism-success-main)',
        label: '4 of 4 signal bars (Excellent)',
      },
      {
        id: 'wifi-refractor-6e',
        bars: 3,
        token: 'var(--prism-info-main)',
        label: '3 of 4 signal bars (Good)',
      },
      {
        id: 'wifi-conference-guest',
        bars: 2,
        token: 'var(--prism-warning-main)',
        label: '2 of 4 signal bars (Fair)',
      },
      {
        id: 'wifi-mesh-extender',
        bars: 1,
        token: 'var(--prism-warning-main)',
        label: '1 of 4 signal bars (Weak)',
      },
    ];

    for (const signalCase of signalCases) {
      const svg = screen.getByTestId(`network-vpn-signal-${signalCase.id}`);
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-label', signalCase.label);
      expect(svg).toHaveAttribute('data-signal-bars', String(signalCase.bars));
      expect(svg).toHaveAttribute('data-signal-token', signalCase.token);
      const activeBars = svg.querySelectorAll('rect[data-active="true"]');
      const inactiveBars = svg.querySelectorAll('rect[data-active="false"]');
      expect(activeBars).toHaveLength(signalCase.bars);
      expect(inactiveBars).toHaveLength(4 - signalCase.bars);
      for (const bar of activeBars) {
        expect(bar).toHaveAttribute('fill', signalCase.token);
      }
      for (const bar of inactiveBars) {
        expect(bar).toHaveAttribute('fill', 'var(--prism-divider)');
      }
    }

    // Security badges (WPA3, WPA2, Open with --prism-warning-main)
    const studioSec = screen.getByTestId('network-vpn-security-wifi-studio-5g');
    expect(studioSec).toHaveTextContent('WPA3');
    expect(studioSec.style.color).toBe('var(--prism-success-main)');

    const guestSec = screen.getByTestId(
      'network-vpn-security-wifi-conference-guest'
    );
    expect(guestSec).toHaveTextContent('Open');
    expect(guestSec.style.color).toBe('var(--prism-warning-main)');

    const meshSec = screen.getByTestId(
      'network-vpn-security-wifi-mesh-extender'
    );
    expect(meshSec).toHaveTextContent('WPA2');
    expect(meshSec.style.color).toBe('var(--prism-info-main)');

    // Band pills
    expect(
      screen.getByTestId('network-vpn-band-wifi-studio-5g')
    ).toHaveTextContent('5 GHz');
    expect(
      screen.getByTestId('network-vpn-band-wifi-refractor-6e')
    ).toHaveTextContent('6 GHz');
    expect(
      screen.getByTestId('network-vpn-band-wifi-conference-guest')
    ).toHaveTextContent('2.4 GHz');

    // 2 default VPN profiles
    expect(screen.getByText('ZeroTrust Core')).toBeInTheDocument();
    expect(screen.getByText('US-West')).toBeInTheDocument();
    expect(
      screen.getByTestId('network-vpn-protocol-vpn-zerotrust-core')
    ).toHaveTextContent('WireGuard');
    expect(screen.getByText('EU-Central Optical')).toBeInTheDocument();
    expect(screen.getByText('Frankfurt')).toBeInTheDocument();
    expect(
      screen.getByTestId('network-vpn-protocol-vpn-eu-central')
    ).toHaveTextContent('WireGuard');

    expect(
      screen.getByRole('switch', { name: 'VPN ZeroTrust Core' })
    ).toHaveAttribute('aria-checked', 'false');
    expect(
      screen.getByRole('switch', { name: 'VPN EU-Central Optical' })
    ).toHaveAttribute('aria-checked', 'false');

    // Polite live status summary
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent(
      'Connected to Studio-5G-Optical (5 GHz) · VPN off'
    );
  });

  it('connects and disconnects across Wi-Fi networks via click and IME-safe keyboard input', () => {
    const onConnectNetwork = vi.fn<(networkId: string | null) => void>();

    render(<NetworkVpnPopover onConnectNetwork={onConnectNetwork} />);

    const studioBtn = screen.getByRole('button', {
      name: 'Disconnect from Studio-5G-Optical',
    });
    expect(studioBtn).toHaveAttribute('aria-pressed', 'true');
    expect(studioBtn).toHaveTextContent('Disconnect');

    // Disconnect currently connected network
    fireEvent.click(studioBtn);
    expect(onConnectNetwork).toHaveBeenLastCalledWith(null);
    expect(
      screen.getByRole('button', { name: 'Connect to Studio-5G-Optical' })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi enabled · Not connected to a network · VPN off'
    );

    // Connect to 6 GHz WPA3 network via click
    const labBtn = screen.getByRole('button', {
      name: 'Connect to Refractor-Lab-6E',
    });
    fireEvent.click(labBtn);
    expect(onConnectNetwork).toHaveBeenLastCalledWith('wifi-refractor-6e');
    expect(
      screen.getByRole('button', { name: 'Disconnect from Refractor-Lab-6E' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connected to Refractor-Lab-6E (6 GHz) · VPN off'
    );

    // Switch directly to Open 2.4 GHz network via Enter key
    const guestBtn = screen.getByRole('button', {
      name: 'Connect to Conference-Guest',
    });

    // Composing Enter must be ignored
    const composingEnter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(composingEnter, 'isComposing', { value: true });
    fireEvent(guestBtn, composingEnter);
    expect(onConnectNetwork).toHaveBeenLastCalledWith('wifi-refractor-6e');

    // Unrelated key must be ignored
    fireEvent.keyDown(guestBtn, { key: 'a' });
    expect(onConnectNetwork).toHaveBeenLastCalledWith('wifi-refractor-6e');

    // Non-composing Enter connects
    fireEvent.keyDown(guestBtn, { key: 'Enter' });
    expect(onConnectNetwork).toHaveBeenLastCalledWith('wifi-conference-guest');
    expect(
      screen.getByRole('button', { name: 'Connect to Refractor-Lab-6E' })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Disconnect from Conference-Guest' })
    ).toHaveAttribute('aria-pressed', 'true');

    // Space switches to 1-bar WPA2 Mesh-Extender
    const meshBtn = screen.getByRole('button', {
      name: 'Connect to Mesh-Extender',
    });
    fireEvent.keyDown(meshBtn, { key: ' ' });
    expect(onConnectNetwork).toHaveBeenLastCalledWith('wifi-mesh-extender');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connected to Mesh-Extender (2.4 GHz) · VPN off'
    );
  });

  it('toggles Wi-Fi radio off and back on, hiding and restoring the Wi-Fi networks list', () => {
    const onConnectNetwork = vi.fn<(networkId: string | null) => void>();

    render(<NetworkVpnPopover onConnectNetwork={onConnectNetwork} />);

    const wifiSwitch = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(screen.getByTestId('network-vpn-wifi-section')).toBeInTheDocument();

    // Turning Wi-Fi off disconnects active Wi-Fi and hides network list
    fireEvent.click(wifiSwitch);
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'false');
    expect(onConnectNetwork).toHaveBeenCalledTimes(1);
    expect(onConnectNetwork).toHaveBeenCalledWith(null);
    expect(screen.queryByTestId('network-vpn-wifi-section')).toBeNull();
    expect(
      screen.getByTestId('network-vpn-wifi-off-notice')
    ).toHaveTextContent(
      'Wi-Fi is turned off. Enable Wi-Fi to browse nearby networks.'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi off · No active VPN tunnel'
    );

    // Turning Wi-Fi back on via Space restores the Available Wi-Fi Networks list
    fireEvent.keyDown(wifiSwitch, { key: ' ' });
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByTestId('network-vpn-wifi-section')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi enabled · Not connected to a network · VPN off'
    );

    // Turning Wi-Fi off while already disconnected does not emit another disconnect callback
    fireEvent.click(wifiSwitch);
    expect(onConnectNetwork).toHaveBeenCalledTimes(1);
  });

  it('switches between mutually exclusive VPN profiles and updates live status across Wi-Fi states', () => {
    const onToggleVpn = vi.fn<(vpnId: string | null) => void>();

    render(<NetworkVpnPopover onToggleVpn={onToggleVpn} />);

    const zeroTrustSwitch = screen.getByRole('switch', {
      name: 'VPN ZeroTrust Core',
    });
    const euCentralSwitch = screen.getByRole('switch', {
      name: 'VPN EU-Central Optical',
    });

    // Enable ZeroTrust Core
    fireEvent.click(zeroTrustSwitch);
    expect(onToggleVpn).toHaveBeenLastCalledWith('vpn-zerotrust-core');
    expect(zeroTrustSwitch).toHaveAttribute('aria-checked', 'true');
    expect(euCentralSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('network-vpn-header-badge')).toHaveTextContent(
      'Protected'
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connected to Studio-5G-Optical (5 GHz) · VPN active: ZeroTrust Core (US-West)'
    );

    // Enable EU-Central Optical via Enter -> automatically deactivates ZeroTrust Core
    fireEvent.keyDown(euCentralSwitch, { key: 'Enter' });
    expect(onToggleVpn).toHaveBeenLastCalledWith('vpn-eu-central');
    expect(zeroTrustSwitch).toHaveAttribute('aria-checked', 'false');
    expect(euCentralSwitch).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connected to Studio-5G-Optical (5 GHz) · VPN active: EU-Central Optical (Frankfurt)'
    );

    // Disconnect Wi-Fi network while VPN stays active -> Wi-Fi on (not connected) + VPN active
    fireEvent.click(
      screen.getByRole('button', { name: 'Disconnect from Studio-5G-Optical' })
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi on (not connected) · VPN active: EU-Central Optical (Frankfurt)'
    );

    // Turn Wi-Fi off while VPN stays active -> Wi-Fi off + VPN active
    fireEvent.click(screen.getByRole('switch', { name: 'Wi-Fi' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi off · VPN active: EU-Central Optical (Frankfurt)'
    );

    // Disable active VPN tunnel
    fireEvent.click(euCentralSwitch);
    expect(onToggleVpn).toHaveBeenLastCalledWith(null);
    expect(euCentralSwitch).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi off · No active VPN tunnel'
    );
  });

  it('suspends Wi-Fi and active VPN immediately when Airplane Mode is enabled, shows warning notice, disables dependent switches, and restores controls when turned off', () => {
    const onConnectNetwork = vi.fn<(networkId: string | null) => void>();
    const onToggleVpn = vi.fn<(vpnId: string | null) => void>();
    const onAirplaneModeChange = vi.fn<(enabled: boolean) => void>();

    render(
      <NetworkVpnPopover
        defaultActiveVpnId="vpn-zerotrust-core"
        onConnectNetwork={onConnectNetwork}
        onToggleVpn={onToggleVpn}
        onAirplaneModeChange={onAirplaneModeChange}
        data-testid="airplane-root"
      />
    );

    const root = screen.getByTestId('airplane-root');
    const wifiSwitch = screen.getByRole('switch', { name: 'Wi-Fi' });
    const airplaneSwitch = screen.getByRole('switch', {
      name: 'Airplane Mode',
    });
    const zeroTrustSwitch = screen.getByRole('switch', {
      name: 'VPN ZeroTrust Core',
    });
    const euCentralSwitch = screen.getByRole('switch', {
      name: 'VPN EU-Central Optical',
    });

    expect(wifiSwitch).toHaveAttribute('aria-checked', 'true');
    expect(zeroTrustSwitch).toHaveAttribute('aria-checked', 'true');

    // Toggle Airplane Mode ON via Space key
    fireEvent.keyDown(airplaneSwitch, { key: ' ' });

    expect(onAirplaneModeChange).toHaveBeenLastCalledWith(true);
    expect(onConnectNetwork).toHaveBeenLastCalledWith(null);
    expect(onToggleVpn).toHaveBeenLastCalledWith(null);

    expect(root).toHaveAttribute('data-airplane-mode', 'true');
    expect(airplaneSwitch).toHaveAttribute('aria-checked', 'true');
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'false');
    expect(wifiSwitch).toBeDisabled();
    expect(zeroTrustSwitch).toHaveAttribute('aria-checked', 'false');
    expect(zeroTrustSwitch).toBeDisabled();
    expect(euCentralSwitch).toHaveAttribute('aria-checked', 'false');
    expect(euCentralSwitch).toBeDisabled();

    // Wi-Fi list hidden and warning notice displayed with --prism-warning-main
    expect(screen.queryByTestId('network-vpn-wifi-section')).toBeNull();
    const notice = screen.getByTestId('network-vpn-airplane-notice');
    expect(notice).toHaveAttribute('role', 'alert');
    expect(notice).toHaveTextContent(
      'Airplane Mode enabled — wireless radios suspended'
    );
    expect(notice.style.color).toBe('var(--prism-warning-main)');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Airplane Mode enabled — wireless radios suspended'
    );

    // Keyboard activation on disabled Wi-Fi/VPN switches is blocked during Airplane Mode
    fireEvent.keyDown(wifiSwitch, { key: 'Enter' });
    fireEvent.keyDown(zeroTrustSwitch, { key: 'Enter' });
    expect(wifiSwitch).toHaveAttribute('aria-checked', 'false');
    expect(zeroTrustSwitch).toHaveAttribute('aria-checked', 'false');

    // Turn Airplane Mode OFF -> removes notice and re-enables switches
    fireEvent.click(airplaneSwitch);
    expect(onAirplaneModeChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByTestId('network-vpn-airplane-notice')).toBeNull();
    expect(wifiSwitch).not.toBeDisabled();
    expect(zeroTrustSwitch).not.toBeDisabled();
    expect(euCentralSwitch).not.toBeDisabled();

    // Enabling Airplane Mode when Wi-Fi and VPN are already off does not emit duplicate disconnect calls
    const netCallsBefore = onConnectNetwork.mock.calls.length;
    const vpnCallsBefore = onToggleVpn.mock.calls.length;
    fireEvent.click(airplaneSwitch);
    expect(onConnectNetwork).toHaveBeenCalledTimes(netCallsBefore);
    expect(onToggleVpn).toHaveBeenCalledTimes(vpnCallsBefore);
  });

  it('handles empty lists, deduplication, blank field fallbacks, initial overrides, and dynamic list updates', () => {
    const { rerender } = render(
      <NetworkVpnPopover
        title="   "
        networks={[]}
        vpnProfiles={[]}
        defaultConnectedNetworkId={null}
      />
    );

    expect(
      screen.getByRole('heading', { name: 'Network & VPN' })
    ).toBeInTheDocument();
    expect(screen.getByTestId('network-vpn-empty-wifi')).toHaveTextContent(
      'No Wi-Fi networks detected in range.'
    );
    expect(screen.getByTestId('network-vpn-empty-vpn')).toHaveTextContent(
      'No VPN profiles configured.'
    );

    // Duplicate IDs + blank metadata fallbacks + singular "1 network" count
    const customNetworks: ReadonlyArray<WifiNetworkEntry> = [
      {
        id: 'net-dup',
        ssid: '   ',
        signalBars: 3,
        security: 'wpa3',
        bandLabel: '  ',
      },
      {
        id: 'net-dup',
        ssid: 'Duplicate-Ignored',
        signalBars: 1,
        security: 'open',
        bandLabel: '5 GHz',
      },
    ];
    const customVpns: ReadonlyArray<VpnProfileEntry> = [
      {
        id: 'vpn-dup',
        name: '  ',
        region: ' ',
        protocol: ' ',
      },
      {
        id: 'vpn-dup',
        name: 'Ignored VPN',
        region: 'Tokyo',
        protocol: 'OpenVPN',
      },
    ];

    rerender(
      <NetworkVpnPopover networks={customNetworks} vpnProfiles={customVpns} />
    );

    expect(screen.getByText('1 network')).toBeInTheDocument();
    expect(screen.getByText('Unnamed Network')).toBeInTheDocument();
    expect(screen.queryByText('Duplicate-Ignored')).toBeNull();
    expect(screen.getByTestId('network-vpn-band-net-dup')).toHaveTextContent(
      '2.4 GHz'
    );
    expect(screen.getByText('Unnamed VPN')).toBeInTheDocument();
    expect(screen.getByText('Global')).toBeInTheDocument();
    expect(
      screen.getByTestId('network-vpn-protocol-vpn-dup')
    ).toHaveTextContent('WireGuard');
    expect(screen.queryByText('Ignored VPN')).toBeNull();

    // Connect then remove active entries via prop rerender
    fireEvent.click(
      screen.getByRole('button', { name: 'Connect to Unnamed Network' })
    );
    fireEvent.click(screen.getByRole('switch', { name: 'VPN Unnamed VPN' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Connected to Unnamed Network (2.4 GHz) · VPN active: Unnamed VPN (Global)'
    );

    rerender(<NetworkVpnPopover networks={[]} vpnProfiles={[]} />);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi enabled · Not connected to a network · VPN off'
    );
  });

  it('respects initial airplane mode, initial Wi-Fi off, and non-existent initial IDs safely', () => {
    const { unmount } = render(
      <NetworkVpnPopover
        defaultAirplaneMode
        defaultWifiEnabled
        defaultConnectedNetworkId="wifi-studio-5g"
        defaultActiveVpnId="vpn-zerotrust-core"
      />
    );

    expect(screen.getByRole('switch', { name: 'Airplane Mode' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toBeDisabled();
    expect(
      screen.getByTestId('network-vpn-airplane-notice')
    ).toBeInTheDocument();
    unmount();

    const { unmount: unmountCustom } = render(
      <NetworkVpnPopover
        networks={[
          {
            id: 'custom-1',
            ssid: 'Lab-Fiber-6E',
            signalBars: 4,
            security: 'wpa3',
            bandLabel: '6 GHz',
          },
        ]}
        defaultConnectedNetworkId="missing-network-id"
        defaultActiveVpnId="missing-vpn-id"
      />
    );
    expect(
      screen.getByRole('button', { name: 'Connect to Lab-Fiber-6E' })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Wi-Fi enabled · Not connected to a network · VPN off'
    );
    unmountCustom();

    const { unmount: unmountCustomDefault } = render(
      <NetworkVpnPopover
        networks={[
          {
            id: 'custom-2',
            ssid: 'Studio-Mesh-6E',
            signalBars: 4,
            security: 'wpa3',
            bandLabel: '6 GHz',
          },
        ]}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Connect to Studio-Mesh-6E' })
    ).toHaveAttribute('aria-pressed', 'false');
    unmountCustomDefault();

    render(
      <NetworkVpnPopover
        defaultWifiEnabled={false}
        defaultConnectedNetworkId="wifi-studio-5g"
      />
    );
    expect(screen.getByRole('switch', { name: 'Wi-Fi' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.queryByTestId('network-vpn-wifi-section')).toBeNull();
  });

  it('blocks all switches and network connection actions when disabled', () => {
    const onConnectNetwork = vi.fn<(networkId: string | null) => void>();
    const onToggleVpn = vi.fn<(vpnId: string | null) => void>();
    const onAirplaneModeChange = vi.fn<(enabled: boolean) => void>();

    render(
      <NetworkVpnPopover
        disabled
        onConnectNetwork={onConnectNetwork}
        onToggleVpn={onToggleVpn}
        onAirplaneModeChange={onAirplaneModeChange}
        data-testid="disabled-root"
      />
    );

    const root = screen.getByTestId('disabled-root');
    expect(root).toHaveAttribute('data-disabled', 'true');
    expect(root).toHaveAttribute('aria-disabled', 'true');

    const wifiSwitch = screen.getByRole('switch', { name: 'Wi-Fi' });
    const airplaneSwitch = screen.getByRole('switch', {
      name: 'Airplane Mode',
    });
    const studioBtn = screen.getByRole('button', {
      name: 'Disconnect from Studio-5G-Optical',
    });
    const vpnSwitch = screen.getByRole('switch', {
      name: 'VPN ZeroTrust Core',
    });

    expect(wifiSwitch).toBeDisabled();
    expect(airplaneSwitch).toBeDisabled();
    expect(studioBtn).toBeDisabled();
    expect(vpnSwitch).toBeDisabled();

    for (const control of [wifiSwitch, airplaneSwitch, studioBtn, vpnSwitch]) {
      fireEvent.click(control);
      fireEvent.keyDown(control, { key: 'Enter' });
      fireEvent.keyDown(control, { key: ' ' });
    }

    expect(onConnectNetwork).not.toHaveBeenCalled();
    expect(onToggleVpn).not.toHaveBeenCalled();
    expect(onAirplaneModeChange).not.toHaveBeenCalled();
  });

  it('renders adversarial XSS SSIDs, titles, and VPN names strictly as escaped text and works with omitted callbacks', () => {
    const xssPayload =
      '<script>window.__netVpnXss=1</script><img src=x onerror=alert(1)>';

    render(
      <NetworkVpnPopover
        title={xssPayload}
        networks={[
          {
            id: 'xss-wifi',
            ssid: xssPayload,
            signalBars: 4,
            security: 'open',
            bandLabel: '5 GHz',
          },
        ]}
        vpnProfiles={[
          {
            id: 'xss-vpn',
            name: xssPayload,
            region: 'US-East',
            protocol: 'WireGuard',
          },
        ]}
        defaultConnectedNetworkId="xss-wifi"
      />
    );

    expect(document.querySelector('script')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
    expect(
      screen.getByRole('heading', { name: xssPayload })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: `Disconnect from ${xssPayload}` })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: `VPN ${xssPayload}` })
    ).toBeInTheDocument();

    // Full interaction cycle with omitted callbacks never throws
    fireEvent.click(
      screen.getByRole('switch', { name: `VPN ${xssPayload}` })
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Airplane Mode' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Airplane Mode' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Wi-Fi' }));
    fireEvent.click(
      screen.getByRole('button', { name: `Connect to ${xssPayload}` })
    );
    expect(
      screen.getByRole('button', { name: `Disconnect from ${xssPayload}` })
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
