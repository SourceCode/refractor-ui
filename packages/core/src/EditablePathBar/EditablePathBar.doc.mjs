export const docs = {
  name: 'EditablePathBar',
  displayName: 'Editable Path Bar',
  group: 'File Explorer Navigation & Views',
  category: 'file-explorer-navigation',
  keywords: [
    'path',
    'breadcrumb',
    'address bar',
    'file explorer',
    'directory',
    'navigation',
    'history',
    'autocomplete',
    'combobox',
    'folder',
    'editable',
    'posix',
  ],
  usage: {
    description:
      'Hybrid optical-glass breadcrumb and raw path address bar pairing Back, Forward, and Up parent navigation buttons with a recessed `prism-well` trail of clickable folder segments that transforms on click, `Edit path`, or `Ctrl+L`/`Alt+D` into an IME-safe combobox input with linear-time path normalization and a viewport-safe autocomplete suggestion listbox.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide domain-specific `suggestions` with semantic `kind` values (`folder`, `mount`, `recent`) and concise `label` subtitles so keyboard users can Tab-complete directly to frequent project roots or mounted volumes.',
      },
      {
        guidance: true,
        description:
          'Use `path` and `onNavigate` together for controlled file explorer state synchronization while letting `EditablePathBar` manage linear-time path normalization (`//`, `\\`, `.`, `..`, empty -> `/`) and Back/Forward history traversal automatically.',
      },
      {
        guidance: false,
        description:
          'Inject raw HTML or unescaped markup into path strings or override surfaces with hardcoded hex/rgb values; `EditablePathBar` renders every path segment strictly as literal text and styles surfaces exclusively via `--prism-*` optical tokens.',
      },
    ],
    accessibility: [
      {
        name: 'Hybrid Breadcrumb Landmark & WAI-ARIA Combobox Autocomplete',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="toolbar" with labeled Back/Forward/Up controls, <nav aria-label="Directory breadcrumbs"> with aria-current="location", and an edit-mode role="combobox" input linked via aria-expanded, aria-autocomplete="list", aria-controls, and aria-activedescendant to a role="listbox" suggestion panel',
        description:
          'Allows assistive technologies to navigate ancestor folder breadcrumbs directly or switch seamlessly into keyboard-driven path entry and suggestion selection.',
      },
      {
        name: 'IME-Safe Keyboard Controls, Global Shortcuts & Polite Live Status',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Supports Ctrl+L / Cmd+L / Alt+D to enter edit mode, ArrowDown/ArrowUp suggestion highlighting, Tab completion, Enter commit, Escape revert with focus restoration, e.nativeEvent.isComposing guards, keyboard-only .prism-focus-ring outlines, and a polite role="status" aria-live="polite" region',
        description:
          'Prevents hijacking active IME composition sessions while announcing every navigation, completion, and cancellation transition cleanly to screen readers.',
      },
    ],
  },
  props: [
    {
      name: 'path',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Controlled active directory path (automatically normalized via linear-time path resolution).',
    },
    {
      name: 'defaultPath',
      type: 'string',
      defaultValue: "'/Users/clara/Projects/refractor-ui/packages/core'",
      description:
        'Initial directory path used in uncontrolled mode when `path` is omitted.',
    },
    {
      name: 'suggestions',
      type: 'ReadonlyArray<EditablePathSuggestion>',
      defaultValue: '5 workspace, recent, and mounted volume path suggestions',
      description:
        'Autocomplete candidate directory entries filtered in linear time via case-insensitive substring matching.',
    },
    {
      name: 'onNavigate',
      type: '(nextPath: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the normalized target path whenever the user navigates via breadcrumbs, history buttons, Up, Enter, or suggestion click.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Directory path navigation'",
      description:
        'Accessible region label applied to the root path bar container.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables history buttons, Up control, breadcrumb navigation, edit mode transitions, and keyboard shortcuts.',
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
    `<EditablePathBar\n  defaultPath="/Users/clara/Projects/refractor-ui/packages/core"\n  onNavigate={(nextPath) => console.warn('Navigate:', nextPath)}\n/>`,
    `<EditablePathBar\n  path={currentPath}\n  onNavigate={setCurrentPath}\n  suggestions={[\n    { path: '/Users/clara/Projects/refractor-ui/apps/docs', label: 'Docs Portal', kind: 'folder' },\n    { path: '/Volumes/StudioNVMe/Renders', label: 'Studio NVMe Renders', kind: 'mount' },\n  ]}\n/>`,
  ],
};

export default docs;
