export const docs = {
  name: 'VirtualDesktopBar',
  displayName: 'Virtual Desktop Bar',
  group: 'Window Management & Desktop Tiling',
  category: 'window-management-tiling',
  keywords: [
    'virtual-desktop',
    'workspaces',
    'mission-control',
    'task-view',
    'desktop-switcher',
    'window-management',
    'tiling',
    'drag-and-drop',
    'multi-desktop',
    'spaces',
  ],
  usage: {
    description:
      'Overview strip of miniature optical-glass virtual desktop workspaces inside a sculpted `prism-slab` container. Supports workspace switching (click and IME-safe roving `ArrowLeft`/`ArrowRight`/`Home`/`End` navigation), collision-safe `+ New Desktop` creation up to `maxSpaces`, safe workspace closing with automatic window evacuation and a >=1 workspace guard, HTML5 drag-and-drop window reassignment across miniature workspace canvases, an active workspace window transfer strip with `Move <window> to` `<select>` controls for 100% keyboard and touch parity, and a polite `aria-live="polite"` status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `VirtualDesktopBar` for desktop-class web OS shells, multi-context studio workspaces, and mission-control overviews where users organize windows across isolated virtual desktops.',
      },
      {
        guidance: true,
        description:
          'Wire `spaces`, `activeSpaceId`, `onSelectSpace`, `onSpacesChange`, and `onMoveWindow` when persisting workspace layouts or synchronizing window focus with a tiling window manager.',
      },
      {
        guidance: false,
        description:
          'Do not rely solely on pointer drag-and-drop for window transfers; preserve the active workspace `Move <window> to` `<select>` controls so keyboard and touch users always have single-step transfer parity.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Tablist, Roving Tabindex & IME-Safe Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'role="tablist" with aria-label="Virtual desktops", role="tab" workspace triggers with aria-selected and aria-controls linked to role="tabpanel", roving tabIndex, and IME-safe ArrowLeft/ArrowRight/Home/End workspace switching',
        description:
          'Enables rapid keyboard workspace switching while preventing IME composition commits from hijacking navigation and cleanly separating per-workspace close controls from tab triggers.',
      },
      {
        name: 'Keyboard & Touch Window Transfer Parity with Live Announcements',
        criterion: '2.5.7 Dragging Movements & 4.1.3 Status Messages',
        requirement:
          'Every window in the active workspace provides a labeled "Move <window> to" <select> alongside HTML5 drag-and-drop, paired with :focus-visible (`prism-focus-ring`) outlines and an aria-live="polite" status strip',
        description:
          'Guarantees single-action non-dragging window reassignment for keyboard, switch, and touch users while politely announcing workspace switches, additions, closures, and transfers.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Virtual Desktops'",
      description:
        'Heading rendered in the top optical crystal bar header and used to label the outer region landmark.',
    },
    {
      name: 'spaces',
      type: 'ReadonlyArray<VirtualDesktopSpace>',
      defaultValue: 'undefined',
      description:
        'Controlled ordered list of virtual desktop workspaces (`{ id, name, windows }`).',
    },
    {
      name: 'defaultSpaces',
      type: 'ReadonlyArray<VirtualDesktopSpace>',
      defaultValue:
        '3 default workspaces (Desktop 1 · Design with 2 windows, Desktop 2 · Code with 2 windows, Desktop 3 · Telemetry with 1 window)',
      description:
        'Initial virtual desktop workspaces when operating in uncontrolled mode.',
    },
    {
      name: 'activeSpaceId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active virtual desktop workspace identifier.',
    },
    {
      name: 'defaultActiveSpaceId',
      type: 'string',
      defaultValue: 'First workspace id',
      description:
        'Initial active workspace identifier when operating in uncontrolled mode.',
    },
    {
      name: 'maxSpaces',
      type: 'number',
      defaultValue: '6',
      description:
        'Maximum number of virtual desktop workspaces permitted before disabling the `+ New Desktop` button (clamped to a minimum of `1`).',
    },
    {
      name: 'onSelectSpace',
      type: '(spaceId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever the active workspace changes via click, keyboard navigation, workspace creation, or closing the active workspace.',
    },
    {
      name: 'onSpacesChange',
      type: '(nextSpaces: ReadonlyArray<VirtualDesktopSpace>) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the updated workspace list whenever a workspace is created, closed, or receives/sends a window.',
    },
    {
      name: 'onMoveWindow',
      type: '(windowId: string, fromSpaceId: string, toSpaceId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever a window is moved to another workspace via drag-and-drop or the `Move <window> to` transfer dropdown.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables workspace switching, creation, closing, window drag-and-drop, and window transfer dropdowns.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<VirtualDesktopBar\n  onSelectSpace={(spaceId) => console.warn('Active desktop:', spaceId)}\n  onMoveWindow={(windowId, fromId, toId) => console.warn('Moved:', windowId, fromId, toId)}\n/>`,
    `<VirtualDesktopBar\n  title="Mission Control"\n  maxSpaces={5}\n  defaultActiveSpaceId="desktop-2"\n  onSpacesChange={(next) => { void next; }}\n/>`,
  ],
};

export default docs;
