export const docs = {
  name: 'HardwarePortStrip',
  displayName: 'Hardware Port Strip',
  group: 'Hardware, IoT & Tactile Surfaces',
  category: 'hardware-iot-tactile',
  keywords: [
    'hardware',
    'port',
    'strip',
    'patch-bay',
    'switch',
    '1u',
    'rack',
    'rj45',
    'sfp+',
    'usb-c',
    'poe',
    'ethernet',
    'fiber',
    'vlan',
    'network',
    'iot',
    'tactile',
    'led',
    'diagnostics',
  ],
  usage: {
    description:
      'Realistic 1U optical-glass network switch and hardware patch bay inside a prism-slab featuring a top chassis header with live Up/Warning/Down counters, active PoE wattage load, and status filters; a mobile-safe horizontally scrollable 1U faceplate with sculpted rack ears and accessible port bays displaying authentic RJ45, PoE, USB-C, and SFP+ SVG socket glyphs (`viewBox="0 0 28 22"`) and semantic status LED dots; plus an aria-live recessed port diagnostic inspector with interactive administrative Enable/Disable port toggling.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use HardwarePortStrip for switchport management, studio patch bays, PoE budget inspection, and edge IoT gateway diagnostics where physical port placement and instant status LED visibility matter.',
      },
      {
        guidance: true,
        description:
          'Bind controlled ports, selectedPortId, onSelectPort, and onTogglePortAdmin props when synchronizing faceplate telemetry and switchport admin state with SNMP, NETCONF, or REST management backends.',
      },
      {
        guidance: false,
        description:
          'Encode link states solely with color without pairing the semantic status badge and accessible port labels; HardwarePortStrip pairs every LED dot with explicit text readouts and aria-label metadata.',
      },
    ],
    accessibility: [
      {
        name: 'Roving Keyboard Navigation & IME Safety',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Implements roving tabindex across visible faceplate port buttons with IME-safe ArrowLeft, ArrowRight, Home, and End navigation plus keyboard-only .prism-focus-ring outlines',
        description:
          'Allows keyboard users to step across every visible switchport bay without tab-flooding while safely ignoring keystrokes during active IME composition.',
      },
      {
        name: 'Live Diagnostic Readouts & Semantic Controls',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Uses role="region" labeled by the chassis heading, aria-pressed on status filters, port tiles, and admin toggle controls, role="status" empty states, and an aria-live="polite" diagnostic inspector',
        description:
          'Communicates locked selection, hover/focus previews, empty filter results, and administrative Enable/Disable state changes cleanly to screen readers.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Refractor SW-12X · 1U Optical Patch Bay'",
      description: 'Visible chassis heading rendered in the top faceplate header and linked via aria-labelledby.',
    },
    {
      name: 'ports',
      type: 'ReadonlyArray<HardwarePortSpec>',
      defaultValue: 'undefined',
      description: 'Controlled list of hardware switchports rendered on the 1U faceplate.',
    },
    {
      name: 'defaultPorts',
      type: 'ReadonlyArray<HardwarePortSpec>',
      defaultValue: '12-port 1U switch (01-06 PoE/RJ45, 07-08 USB-C, 09-12 SFP+)',
      description: 'Initial switchport specifications used when operating in uncontrolled mode.',
    },
    {
      name: 'selectedPortId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled port ID for locked faceplate selection.',
    },
    {
      name: 'defaultSelectedPortId',
      type: 'string',
      defaultValue: "'port-01'",
      description: 'Initial locked port ID when operating in uncontrolled selection mode.',
    },
    {
      name: 'onSelectPort',
      type: '(port: HardwarePortSpec) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever a user clicks or activates a port bay to lock selection.',
    },
    {
      name: 'onTogglePortAdmin',
      type: '(portId: string, adminEnabled: boolean, nextPorts: ReadonlyArray<HardwarePortSpec>) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when toggling a port between administratively enabled and disabled states.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables filtering, port inspection/selection, keyboard navigation, and admin state toggling.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<HardwarePortStrip\n  title="Core Rack SW-12X · Bay A"\n  onSelectPort={(port) => console.info(port.id)}\n/>`,
    `<HardwarePortStrip\n  ports={switchPorts}\n  selectedPortId={activePortId}\n  onSelectPort={(port) => setActivePortId(port.id)}\n  onTogglePortAdmin={(_id, _enabled, nextPorts) => setSwitchPorts([...nextPorts])}\n/>`,
  ],
};

export default docs;
