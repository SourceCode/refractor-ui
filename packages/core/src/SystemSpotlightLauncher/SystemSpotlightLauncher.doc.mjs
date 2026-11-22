export const docs = {
  name: 'SystemSpotlightLauncher',
  displayName: 'System Spotlight Launcher',
  group: 'Menus & Launchers',
  category: 'menus-launchers',
  keywords: [
    'spotlight',
    'launcher',
    'run-launcher',
    'command-palette',
    'search',
    'calculator',
    'math',
    'unit-conversion',
    'preview-pane',
    'combobox',
    'menus-launchers',
    'optical-glass',
  ],
  usage: {
    description:
      'Centered floating OS Spotlight and Run Launcher housed inside a sculpted prism-slab with a pure, zero-eval recursive-descent arithmetic and deterministic unit conversion engine (evaluateSpotlightExpression) paired with a split two-column results listbox and right-hand optical preview pane. Supports quick example query chips, linear-time case-insensitive substring matching across apps, files, and system commands, live Calculation hits with large tabular-nums output and resilient clipboard copy fallback, IME-safe ArrowDown/ArrowUp/Home/End/Enter/Escape navigation, role="status" empty states, and polite aria-live announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide rich literal previewBody strings and concise meta label/value pills for every catalog item so users can verify files, commands, and applications in the split right-hand pane before executing.',
      },
      {
        guidance: true,
        description:
          'Use the exported pure evaluateSpotlightExpression() helper whenever you need identical zero-eval arithmetic and unit conversions (px/rem, km/mi, kg/lb, C/F, GB/MB) in external search bars or telemetry previews.',
      },
      {
        guidance: false,
        description:
          'Inject unescaped HTML into previewBody or pass untrusted expressions to eval()/Function(); SystemSpotlightLauncher renders previewBody strictly as literal React text and evaluates math via a bounded recursive-descent parser (max length 120, max depth 32).',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Combobox & Listbox Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Combines role="combobox" (aria-expanded="true", aria-autocomplete="list", aria-controls, aria-activedescendant) with role="listbox" options, IME-safe ArrowDown/ArrowUp/Home/End/Enter/Escape handling, and keyboard-only prism-focus-ring outlines',
        description:
          'Keeps focus anchored in the Spotlight search input while moving active selection across calculation hits and catalog matches, guarding every keydown action with !e.nativeEvent.isComposing.',
      },
      {
        name: 'Polite Live Announcements & Empty-State Feedback',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Provides an aria-live="polite" announcement region for calculation hits, selection changes, clipboard copies, launches, and query resets, alongside a clear role="status" empty state when zero items match',
        description:
          'Ensures screen-reader users receive immediate confirmation of evaluated math results, copied outputs, and zero-result queries without interrupting typing.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<SpotlightResultItem>',
      defaultValue: '6 curated studio apps, files, and system commands',
      description:
        'Searchable catalog of SpotlightResultItem entries ({ id, title, subtitle, kind, pathOrShortcut?, previewBody, meta? }) filtered via linear-time case-insensitive substring matching.',
    },
    {
      name: 'defaultQuery',
      type: 'string',
      defaultValue: "''",
      description:
        'Initial search query string populated into the Spotlight combobox input.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Search apps, files, commands, or enter math (e.g. 100 km to mi)...'",
      description:
        'Placeholder text rendered inside the recessed prism-well search input.',
    },
    {
      name: 'onLaunchResult',
      type: '(item: SpotlightResultItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the active SpotlightResultItem when launched via Enter, double-click, or the right-hand Open / Run or Copy Result button.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the search input, quick query chips, result list options, and preview action button.',
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
    `<SystemSpotlightLauncher\n  onLaunchResult={(item) => console.warn('Launched:', item.title)}\n/>`,
    `<SystemSpotlightLauncher\n  defaultQuery="(24 + 16) * 3"\n  onLaunchResult={(item) => console.warn(item.kind, item.title)}\n/>`,
  ],
};

export default docs;
