export const docs = {
  name: 'SystemTrayCluster',
  displayName: 'System Tray Cluster',
  group: 'System Tray & Control Center',
  category: 'system-tray-control-center',
  keywords: [
    'system-tray',
    'tray',
    'menu-bar',
    'status-bar',
    'control-center',
    'wifi',
    'bluetooth',
    'battery',
    'volume',
    'keyboard-layout',
    'clock',
    'popover',
    'os',
  ],
  usage: {
    description:
      'Compact right-aligned optical OS menu-bar status cluster inside a `prism-slab` shell with 6 live hardware and system indicators (**Wi-Fi**, **Bluetooth**, **Battery** with tabular `%`, **Volume**, **Keyboard Layout** code, and **Clock**). Each indicator acts as a tactile `role="toolbar"` button exposing `aria-haspopup="dialog"`, `aria-expanded`, `.prism-focus-ring`, semantic `--prism-*` status tinting, and IME-safe roving `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard navigation. Activating any indicator opens a dedicated viewport-clamped (`w-[min(19rem,calc(100vw-2rem))]`) `role="dialog"` popover with live switches, a `NaN`-safe clamped battery `role="progressbar"` and charging badge, mute toggle and volume range slider, `US`/`UK`/`DE`/`JP` layout switchers, or a large tabular clock with formatted date and UTC readout, plus outside `pointerdown` and IME-safe `Escape` dismissal restoring focus to the active trigger and a polite `aria-live="polite"` status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Place `SystemTrayCluster` on the trailing edge of desktop-class OS bars, studio shells, and kiosk control headers to surface live hardware telemetry and quick-toggle popovers without cluttering the workspace.',
      },
      {
        guidance: true,
        description:
          'Use controlled `value` / `onChange` and `openIndicator` / `onOpenIndicatorChange` when synchronizing Wi-Fi, Bluetooth, power, audio, or input-source settings with external system state.',
      },
      {
        guidance: false,
        description:
          'Do not clip `SystemTrayCluster` inside an ancestor with `overflow: hidden` because the anchored `role="dialog"` popover extends beneath the right-aligned indicator bar.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Toolbar Roving Navigation & Indicator Dialog Triggers',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `role="toolbar" aria-label="System tray indicators"` with roving `tabIndex`, IME-safe `ArrowLeft`/`ArrowRight`/`Home`/`End` focus movement, and `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls` on all 6 indicator triggers',
        description:
          'Lets keyboard and assistive-technology users traverse all six hardware indicators with a single Tab stop and inspect expanded popover state clearly.',
      },
      {
        name: 'Interactive Popover Controls, Escape Focus Restoration & Polite Live Strip',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Provides semantic `role="switch"` toggles, clamped `role="progressbar"` battery readout, `aria-pressed` mute and keyboard layout buttons, `aria-label="System tray volume"` range input, IME-safe `Escape` dismissal restoring trigger focus, keyboard-only `.prism-focus-ring`, and an `aria-live="polite"` status strip',
        description:
          'Ensures every hardware setting is operable via keyboard without IME hijacking and announces popover transitions and setting toggles politely.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'SystemTrayState',
      defaultValue: 'undefined',
      description:
        'Controlled full system tray state (`wifiEnabled`, `wifiNetwork`, `bluetoothEnabled`, `bluetoothDevice`, `batteryPct`, `charging`, `lowPowerMode`, `volumePct`, `muted`, `keyboardLayout`, `clockLabel`, `dateLabel`, `utcLabel`).',
    },
    {
      name: 'defaultValue',
      type: 'Partial<SystemTrayState>',
      defaultValue: 'DEFAULT_SYSTEM_TRAY_STATE',
      description:
        'Uncontrolled initial partial state overrides merged with `DEFAULT_SYSTEM_TRAY_STATE` when `value` is omitted.',
    },
    {
      name: 'openIndicator',
      type: 'SystemTrayIndicatorId | null',
      defaultValue: 'undefined',
      description:
        'Controlled active popover indicator (`"wifi" | "bluetooth" | "battery" | "volume" | "keyboard" | "clock" | null`).',
    },
    {
      name: 'defaultOpenIndicator',
      type: 'SystemTrayIndicatorId | null',
      defaultValue: 'null',
      description:
        'Initial uncontrolled open popover indicator when `openIndicator` is omitted.',
    },
    {
      name: 'onChange',
      type: '(state: SystemTrayState) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the complete normalized next `SystemTrayState` whenever Wi-Fi, Bluetooth, Low Power Mode, mute, volume, or keyboard layout changes.',
    },
    {
      name: 'onOpenIndicatorChange',
      type: '(indicator: SystemTrayIndicatorId | null) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the active indicator popover opens, switches, or dismisses.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all 6 indicator triggers and suppresses popover display.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical style overrides merged cleanly onto the root `prism-slab` container.',
    },
  ],
  examples: [
    `<SystemTrayCluster\n  onChange={(nextState) => console.warn(nextState)}\n  onOpenIndicatorChange={(indicator) => console.warn(indicator)}\n/>`,
    `<SystemTrayCluster\n  defaultOpenIndicator="battery"\n  defaultValue={{\n    batteryPct: 92,\n    charging: true,\n    wifiNetwork: 'Refractor Lab 6E',\n    keyboardLayout: 'JP',\n    clockLabel: '09:15 AM',\n  }}\n/>`,
  ],
};

export default docs;
