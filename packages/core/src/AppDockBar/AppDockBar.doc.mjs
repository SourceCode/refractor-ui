export const docs = {
  name: 'AppDockBar',
  displayName: 'App Dock Bar',
  group: 'Desktop OS & Windowing Metaphors',
  category: 'desktop-os-windowing',
  keywords: [
    'dock',
    'app-dock',
    'launcher',
    'taskbar',
    'desktop-os',
    'windowing',
    'macos',
    'magnification',
    'badge',
    'attention',
    'toolbar',
    'application-bar',
  ],
  usage: {
    description:
      'Floating optical-glass desktop application dock built on a sculpted prism-slab tray with smooth hover and keyboard-focus neighbor magnification scaling (1.0x, 1.12x, 1.28x), glowing --prism-primary-main running-app indicator dots, clamped numeric badge pills (99+ via --prism-error-main), attention bounce indicators (data-attention="true"), edge-aware floating tooltips, controlled/uncontrolled active selection, and IME-safe roving-tabindex toolbar navigation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pin 4–8 high-frequency workspace applications with concise 1–2 word labels and distinct semantic tones so the floating tooltip and optical magnification wave read effortlessly.',
      },
      {
        guidance: true,
        description:
          'Choose position="bottom" for standard horizontal desktop shells, or position="left" / position="right" for widescreen vertical workspace rails—arrow keys automatically adapt between ArrowLeft/ArrowRight and ArrowUp/ArrowDown.',
      },
      {
        guidance: false,
        description:
          'Use attention={true} simultaneously across every pinned icon; reserve attention bounce indicators for urgent unread notifications or completed background builds, and respect users with prefers-reduced-motion.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Toolbar Landmark & Roving Tabindex Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'role="toolbar" with aria-orientation, roving tabIndex across enabled apps, ArrowLeft/ArrowRight (or ArrowUp/ArrowDown when vertical), Home/End, Enter/Space launch, and IME composition guard',
        description:
          'Exposes the dock as a single keyboard tab stop with wrapping directional arrow traversal that skips disabled apps, ignores IME composing events, and exposes active, running, badge, and attention state via aria-label and aria-pressed.',
      },
      {
        name: 'Hover & Focus Tooltip Ergonomics & Reduced Motion',
        criterion: '1.4.13 Content on Hover or Focus, 2.3.3 Animation from Interactions & 2.4.7 Focus Visible',
        requirement:
          'Floating role="tooltip" linked via aria-describedby, Escape dismissal, keyboard-only prism-focus-ring, and prefers-reduced-motion animation pause',
        description:
          'Displays the app title above or beside the hovered/focused icon without clipping, dismisses cleanly on Escape or blur, avoids mouse-click focus rings via :focus-visible, and disables bounce/scale transitions when prefers-reduced-motion: reduce is active.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<AppDockItem>',
      defaultValue: '6 iconic studio apps (Finder, Code IDE, Prism Studio, Terminal, Messages, Settings)',
      description:
        'Ordered array of dock application entries ({ id, label, icon?, running?, badgeCount?, attention?, tone?, disabled? }). Pass [] to render an accessible role="status" empty state.',
    },
    {
      name: 'activeId',
      type: 'string | null',
      defaultValue: 'undefined',
      description:
        'Controlled active application identifier (null indicates no active app).',
    },
    {
      name: 'defaultActiveId',
      type: 'string | null',
      defaultValue: 'null',
      description:
        'Initial active application identifier when operating in uncontrolled mode.',
    },
    {
      name: 'position',
      type: "'bottom' | 'left' | 'right'",
      defaultValue: "'bottom'",
      description:
        'Edge placement and orientation of the floating dock bar, controlling layout direction, running dot alignment, tooltip anchor, and arrow key axis.',
    },
    {
      name: 'magnification',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Enables smooth hover and keyboard-focus magnification scaling (1.28x spotlight, 1.12x immediate neighbors, 1.0x rest).',
    },
    {
      name: 'onLaunch',
      type: '(item: AppDockItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the launched AppDockItem when an enabled dock icon is clicked or activated via Enter/Space.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Application dock'",
      description:
        'Accessible landmark label applied to the root toolbar element.',
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
    `<AppDockBar\n  defaultActiveId="code-ide"\n  onLaunch={(app) => console.warn('Launched:', app.label)}\n/>`,
    `<AppDockBar\n  position="left"\n  magnification\n  activeId={activeAppId}\n  items={[\n    { id: 'finder', label: 'Finder', running: true, tone: 'info' },\n    { id: 'ide', label: 'Code IDE', running: true, tone: 'primary' },\n    { id: 'mail', label: 'Messages', running: true, badgeCount: 124, attention: true, tone: 'rose' },\n    { id: 'prefs', label: 'Settings', running: false, tone: 'amber' },\n  ]}\n  onLaunch={(app) => setActiveAppId(app.id)}\n/>`,
  ],
};

export default docs;
