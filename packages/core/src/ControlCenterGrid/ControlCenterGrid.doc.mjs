export const docs = {
  name: 'ControlCenterGrid',
  displayName: 'Control Center Grid',
  group: 'System Tray & Control Center',
  category: 'system-tray-control-center',
  keywords: [
    'control-center',
    'quick-settings',
    'system-tray',
    'bento',
    'wifi',
    'bluetooth',
    'do-not-disturb',
    'theme',
    'brightness',
    'volume',
    'now-playing',
    'media-card',
  ],
  usage: {
    description:
      'Modular bento-style optical-glass Control Center and Quick Settings panel housed inside a sculpted prism-slab container. Combines a responsive 2×2 grid of large pill toggle tiles (Wi-Fi, Bluetooth, Do Not Disturb, Theme) with semantic --prism-* active glows, tactile Display Brightness and Output Volume range sliders with tabular percentage pills and NaN/Infinity/range clamping, a mini Now Playing media card with safe track-index wraparound and empty-queue fallback, and a polite aria-live status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled value and onChange when synchronizing system toggles, display brightness, output volume, and media playback state directly with a desktop shell or PrismThemeProvider mode switch.',
      },
      {
        guidance: true,
        description:
          'Provide concise track titles, artist names, and formatted duration labels in the tracks array so the mini Now Playing card remains balanced across compact mobile and desktop bento widths.',
      },
      {
        guidance: false,
        description:
          'Pass raw unsanitized out-of-range brightnessPct, volumePct, or trackIndex values expecting them to overflow; ControlCenterGrid clamps percentages to [0..100], guards NaN/Infinity, and wraps track indices safely even for empty queues.',
      },
    ],
    accessibility: [
      {
        name: 'Toggle Buttons, Range Sliders & Media Transport Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Uses native toggle buttons with aria-pressed for Wi-Fi, Bluetooth, Do Not Disturb, Theme, and Play/Pause, alongside labeled range inputs ("Display brightness", "Output volume") and IME-safe keyboard handling',
        description:
          'Exposes full pressed state, numeric slider values, and media transport actions ("Previous Track", "Play"/"Pause", "Next Track") to assistive technologies while guarding IME composition events.',
      },
      {
        name: 'Polite Live Announcements & Keyboard-Only Focus Rings',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Publishes toggle, slider, and playback state updates to an aria-live="polite" status strip and restricts focus outlines to :focus-visible via prism-focus-ring',
        description:
          'Ensures screen-reader users hear immediate confirmation for radio switches, brightness/volume changes, and track skips without displaying intrusive focus outlines on pointer interaction.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Control Center'",
      description:
        'Header title and accessible aria-label for the root Control Center region landmark.',
    },
    {
      name: 'value',
      type: 'ControlCenterState',
      defaultValue: 'undefined',
      description:
        'Controlled state object ({ wifi, bluetooth, doNotDisturb, theme, brightnessPct, volumePct, playing, trackIndex }).',
    },
    {
      name: 'defaultValue',
      type: 'Partial<ControlCenterState>',
      defaultValue:
        "{ wifi: true, bluetooth: true, doNotDisturb: false, theme: 'light', brightnessPct: 80, volumePct: 65, playing: false, trackIndex: 0 }",
      description:
        'Optional partial initial state merged with defaults when running in uncontrolled mode.',
    },
    {
      name: 'tracks',
      type: 'ReadonlyArray<ControlCenterTrack>',
      defaultValue:
        "3 built-in studio tracks ('Refractive Resonance', 'Caustic Horizon', 'Alabaster Pulse')",
      description:
        'Ordered track queue rendered in the mini Now Playing media card. Passing [] displays a graceful empty-queue fallback with safe track index clamping.',
    },
    {
      name: 'onChange',
      type: '(state: ControlCenterState) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the complete sanitized ControlCenterState whenever any toggle, slider, or media control changes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all quick-settings pill toggles, brightness and volume sliders, and media playback controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ControlCenterGrid\n  title="Studio Quick Settings"\n  defaultValue={{ theme: 'dark', brightnessPct: 72, volumePct: 50 }}\n  onChange={(next) => console.warn('Control Center:', next)}\n/>`,
    `<ControlCenterGrid\n  value={controlState}\n  tracks={[\n    { id: 't1', title: 'Refractive Resonance', artist: 'Prism Acoustics', durationLabel: '3:42' },\n    { id: 't2', title: 'Caustic Horizon', artist: 'Alabaster Ensemble', durationLabel: '4:18' },\n  ]}\n  onChange={setControlState}\n/>`,
  ],
};

export default docs;
