export const docs = {
  name: 'WindowExposeGrid',
  displayName: 'Window Exposé Grid',
  group: 'Window Management & Desktop Tiling',
  category: 'window-management-tiling',
  keywords: [
    'window',
    'expose',
    'mission-control',
    'overview',
    'desktop',
    'tiling',
    'spatial-grid',
    'thumbnails',
    'workspaces',
    'switcher',
    'group-by-app',
  ],
  usage: {
    description:
      'Zoomed-out Mission Control / Exposé spatial window grid inside an optical `prism-slab` that spreads every open desktop window across a responsive non-overlapping grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`) with miniature chrome dots, procedural `--prism-*` glass previews, linear-time search filtering, dynamic `Set`-backed application filter pills, prototype-safe `Map`-backed `Group by App` mode, keyboard-accessible window focusing, and per-window close controls.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `WindowExposeGrid` for desktop-class workspaces, multi-window web IDEs, and spatial window switchers where users need to scan, filter, group by application, focus, or close open windows without visual overlap.',
      },
      {
        guidance: true,
        description:
          'Provide controlled `windows` alongside `onFocusWindow` and `onCloseWindow` when window lifecycle and active focus state are coordinated with an external desktop window manager store.',
      },
      {
        guidance: false,
        description:
          'Do not use `WindowExposeGrid` for splitting two adjacent live panes inside a single window frame; use `WindowSplitter` or `SplitArtifactCanvas` for side-by-side live editors.',
      },
    ],
    accessibility: [
      {
        name: 'Non-Nested Interactive Controls & IME-Safe Keyboard Focus',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Each window card separates its focusable thumbnail button (`aria-pressed`, IME-safe `Enter`/`Space`) from its sibling `Close <title>` button (`aria-label`), applies keyboard-only `.prism-focus-ring`, and guards search `Escape` clearing with `!event.nativeEvent.isComposing`.',
        description:
          'Prevents invalid nested interactive buttons while ensuring full keyboard operability and IME safety across focus, close, search, and filter controls.',
      },
      {
        name: 'Polite Live Announcements & Empty-State Status',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Exposes `role="region"` linked via `aria-labelledby`, `aria-pressed` states on app pills, `Group by App`, and focused window cards, a `role="status"` empty state when zero windows remain or match, and an `aria-live="polite"` status line announcing focus, close, filter, and grouping updates.',
        description:
          'Keeps screen-reader users informed of spatial grid updates without interrupting active keyboard navigation.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Window Exposé'",
      description: 'Visible heading displayed in the top Exposé bar and linked via `aria-labelledby`.',
    },
    {
      name: 'windows',
      type: 'ReadonlyArray<ExposeWindowCard>',
      defaultValue: 'undefined',
      description: 'Controlled array of open window cards rendered in the spatial grid.',
    },
    {
      name: 'defaultWindows',
      type: 'ReadonlyArray<ExposeWindowCard>',
      defaultValue: '6 realistic desktop windows across 4 apps and 2 workspaces',
      description: 'Initial uncontrolled open window cards used when `windows` is not provided.',
    },
    {
      name: 'onFocusWindow',
      type: '(windowCard: ExposeWindowCard) => void',
      defaultValue: 'undefined',
      description: 'Invoked with the selected `ExposeWindowCard` when a thumbnail card is focused via click, Enter, or Space.',
    },
    {
      name: 'onCloseWindow',
      type: '(windowId: string) => void',
      defaultValue: 'undefined',
      description: 'Invoked with the window `id` when the accessible `Close <title>` button is activated.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables search input, application filter pills, Group by App toggle, window focusing, and close actions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<WindowExposeGrid\n  title="Mission Control · Window Exposé"\n  onFocusWindow={(win) => { void win; }}\n  onCloseWindow={(id) => { void id; }}\n/>`,
    `<WindowExposeGrid\n  title="Studio Workspace Windows"\n  defaultWindows={[\n    { id: 'w1', appName: 'Refractor IDE', title: 'App.tsx', workspaceName: 'Workspace 1', tone: 'primary', active: true },\n    { id: 'w2', appName: 'Terminal', title: 'pnpm dev', workspaceName: 'Workspace 1', tone: 'emerald' },\n  ]}\n/>`,
  ],
};

export default docs;
