export const docs = {
  name: 'MarqueeTicker',
  displayName: 'Marquee Ticker',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'marquee',
    'ticker',
    'ribbon',
    'stream',
    'market',
    'telemetry',
    'live',
    'scroll',
    'news',
    'wcag-2-2-2',
    'pause',
    'micro-utility',
  ],
  usage: {
    description:
      'Sculpted optical-glass horizontal prism-slab ticker ribbon featuring a tactile WCAG 2.2.2 Pause / Play toggle button with controlled/uncontrolled state, a live/paused semantic indicator dot (--prism-success-main / --prism-warning-main), token-driven edge fade masks, hover/focus pause support, interactive IME-safe primary ticker pills, and an aria-hidden duplicate strip for seamless infinite looping.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Keep pauseOnHover enabled (default true) and retain the built-in Pause / Play toggle button so readers and assistive technology users can inspect moving metrics comfortably under WCAG 2.2.2.',
      },
      {
        guidance: true,
        description:
          'Provide concise label, value, and delta strings alongside semantic tone tokens (neutral, primary, emerald, amber, rose) so every pill scans cleanly at high velocity across light and dark optical themes.',
      },
      {
        guidance: false,
        description:
          'Rely on color alone to communicate positive or negative changes; pair semantic tones with explicit sign prefixes (such as "+2.4%" or "-1.2ms") and concise metric labels.',
      },
    ],
    accessibility: [
      {
        name: 'WCAG 2.2.2 Pause, Stop, Hide & Reduced Motion',
        criterion: '2.2.2 Pause, Stop, Hide & 2.3.3 Animation from Interactions',
        requirement:
          'Built-in tactile Pause / Play toggle button with aria-pressed, hover/focus auto-pause (pauseOnHover), and prefers-reduced-motion CSS pause guard',
        description:
          'Users can explicitly pause or resume continuous ticker motion via pointer or keyboard, hovering or tabbing onto items pauses playback automatically, and prefers-reduced-motion: reduce halts animation immediately.',
      },
      {
        name: 'Deduplicated Screen-Reader Tree & IME-Safe Pill Activation',
        criterion: '1.3.1 Info and Relationships & 2.1.1 Keyboard',
        requirement:
          'Primary strip renders semantic list items with keyboard-only prism-focus-ring buttons and IME-safe Enter/Space handling; duplicate loop strip is marked aria-hidden="true" with non-focusable spans',
        description:
          'Screen readers announce each live metric exactly once while keyboard users navigate primary pills smoothly without trapping focus or hijacking IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<MarqueeTickerItem>',
      defaultValue: '6 live market & telemetry ticker items',
      description:
        'Ordered array of ticker pill records ({ id, label, value?, delta?, tone? }). Pass [] to render an accessible role="status" empty state.',
    },
    {
      name: 'direction',
      type: "'left' | 'right'",
      defaultValue: "'left'",
      description: 'Horizontal scroll direction of the infinite marquee loop.',
    },
    {
      name: 'durationSec',
      type: 'number',
      defaultValue: '24',
      description:
        'Full animation cycle duration in seconds, clamped to [6, 120].',
    },
    {
      name: 'pauseOnHover',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Pauses marquee animation while the pointer hovers or keyboard focus rests inside the ticker.',
    },
    {
      name: 'paused',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled paused state for the built-in WCAG 2.2.2 Pause / Play toggle button.',
    },
    {
      name: 'defaultPaused',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Initial paused state when operating in uncontrolled mode.',
    },
    {
      name: 'onPausedChange',
      type: '(paused: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when the user toggles Pause / Play via click or keyboard.',
    },
    {
      name: 'onSelectItem',
      type: '(item: MarqueeTickerItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when a user clicks or activates (Enter/Space) a primary ticker pill.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Live marquee ticker'",
      description: 'Accessible region landmark label for the marquee ribbon.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<MarqueeTicker\n  ariaLabel="Live market and telemetry feed"\n  durationSec={24}\n  onSelectItem={(item) => console.warn(item.label, item.value)}\n/>`,
    `<MarqueeTicker\n  direction="right"\n  durationSec={18}\n  defaultPaused={false}\n  items={[\n    { id: 'sla', label: 'Edge SLA', value: '99.98%', delta: '+0.02%', tone: 'emerald' },\n    { id: 'lat', label: 'US-East p95', value: '14ms', delta: '-3ms', tone: 'primary' },\n    { id: 'err', label: 'Gateway 5xx', value: '0.09%', delta: '+0.03%', tone: 'rose' },\n  ]}\n/>`,
  ],
};

export default docs;
