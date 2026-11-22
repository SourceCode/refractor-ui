export const docs = {
  name: 'NetworkVpnPopover',
  displayName: 'Network & VPN Popover',
  group: 'System Tray & Control Center',
  category: 'system-tray-control-center',
  keywords: [
    'network',
    'vpn',
    'wifi',
    'wi-fi',
    'airplane-mode',
    'popover',
    'system-tray',
    'control-center',
    'wireguard',
    'wpa3',
    'wpa2',
    'signal-strength',
    'radios',
    'tunnel',
  ],
  usage: {
    description:
      'Live optical-glass Network & VPN selector popover housed inside a `prism-slab` surface for system trays and desktop control centers. Features responsive `flex-wrap` top radio controls for **Wi-Fi** (`role="switch"`, disabled while Airplane Mode is active) and **Airplane Mode** (`role="switch"`, immediately suspending Wi-Fi and active VPN tunnels while displaying a `--prism-warning-main` radio-suspension alert). Displays an **Available Wi-Fi Networks** list with 4-bar optical signal-strength SVG graphics tinted exclusively via `--prism-success-main` / `--prism-info-main` / `--prism-warning-main`, security lock/warning badges (`WPA3`, `WPA2`, and `--prism-warning-main` `Open`), frequency band pills (`6 GHz`, `5 GHz`, `2.4 GHz`), and accessible `Connect` / `Disconnect` buttons (`aria-pressed`), alongside a **VPN Profiles** section with mutually exclusive `role="switch"` tunnel toggles and an `aria-live="polite"` connection status summary bar.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `NetworkVpnPopover` inside desktop-style menu bars, control center flyouts, and edge workstation dashboards where operators switch Wi-Fi SSIDs, toggle WireGuard VPN tunnels, or suspend wireless radios in one glance.',
      },
      {
        guidance: true,
        description:
          'Connect `onConnectNetwork`, `onToggleVpn`, and `onAirplaneModeChange` callbacks to your network manager or OS daemon bridge to reflect real link and tunnel transitions.',
      },
      {
        guidance: false,
        description:
          'Do not rely solely on signal bar color to convey reception strength or security risk; `NetworkVpnPopover` pairs every signal graphic with an accessible `role="img"` label and explicit `WPA3`, `WPA2`, or `Open` badges.',
      },
    ],
    accessibility: [
      {
        name: 'Switch & Toggle Button Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `role="switch"` with `aria-checked` on Wi-Fi, Airplane Mode, and VPN profile toggles, `aria-pressed` on per-network Connect/Disconnect buttons, and `role="img"` signal-bar descriptions',
        description:
          'Ensures screen readers announce live radio, tunnel, and network connection states clearly and supports IME-safe keyboard activation via Enter and Space.',
      },
      {
        name: 'Keyboard-Only Focus Rings, Warning Alerts & Live Status Summary',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Applies `.prism-focus-ring` (`:focus-visible`) across every interactive control, renders a semantic `role="alert"` notice when Airplane Mode suspends wireless radios, and maintains an `aria-live="polite"` status summary bar',
        description:
          'Keeps focus feedback crisp for keyboard navigation without pointer click rings while promptly announcing network, VPN, and radio transitions.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Network & VPN'",
      description:
        'Visible heading displayed in the optical header bar and linked to the region landmark via `aria-labelledby`.',
    },
    {
      name: 'networks',
      type: 'ReadonlyArray<WifiNetworkEntry>',
      defaultValue:
        '4 default networks (Studio-5G-Optical, Refractor-Lab-6E, Conference-Guest, Mesh-Extender)',
      description:
        'Available Wi-Fi networks rendered when Wi-Fi is enabled and Airplane Mode is off.',
    },
    {
      name: 'vpnProfiles',
      type: 'ReadonlyArray<VpnProfileEntry>',
      defaultValue:
        '2 default profiles (ZeroTrust Core US-West WireGuard, EU-Central Optical Frankfurt WireGuard)',
      description:
        'VPN tunnel profiles rendered with mutually exclusive `role="switch"` toggles.',
    },
    {
      name: 'defaultConnectedNetworkId',
      type: 'string | null',
      defaultValue: "'wifi-studio-5g' (when default networks are used)",
      description:
        'Initial connected Wi-Fi network ID. Pass `null` to start disconnected.',
    },
    {
      name: 'defaultActiveVpnId',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'Initial active VPN profile ID. Ignored when `defaultAirplaneMode` is `true`.',
    },
    {
      name: 'defaultWifiEnabled',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial Wi-Fi radio state when Airplane Mode is off.',
    },
    {
      name: 'defaultAirplaneMode',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Initial Airplane Mode state. When `true`, wireless radios and VPN tunnels start suspended.',
    },
    {
      name: 'onConnectNetwork',
      type: '(networkId: string | null) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when connecting to a network ID or disconnecting (`null`).',
    },
    {
      name: 'onToggleVpn',
      type: '(vpnId: string | null) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when activating a VPN profile ID or disconnecting (`null`).',
    },
    {
      name: 'onAirplaneModeChange',
      type: '(enabled: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever Airplane Mode is toggled on or off.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all radio switches, Wi-Fi Connect/Disconnect buttons, and VPN profile toggles.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<NetworkVpnPopover\n  onConnectNetwork={(id) => console.warn('Wi-Fi:', id)}\n  onToggleVpn={(id) => console.warn('VPN:', id)}\n  onAirplaneModeChange={(enabled) => console.warn('Airplane:', enabled)}\n/>`,
    `<NetworkVpnPopover\n  title="Workstation Radios"\n  defaultActiveVpnId="vpn-zerotrust-core"\n/>`,
  ],
};

export default docs;
