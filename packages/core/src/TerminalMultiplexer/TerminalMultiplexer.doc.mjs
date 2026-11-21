export const docs = {
  name: 'TerminalMultiplexer',
  displayName: 'Terminal Multiplexer',
  group: 'CLI & Terminal Surfaces',
  category: 'cli-terminal',
  keywords: [
    'terminal',
    'multiplexer',
    'tmux',
    'shell',
    'cli',
    'console',
    'tabs',
    'split',
    'sessions',
    'panes',
  ],
  usage: {
    description:
      'Optical-glass multi-session terminal workspace with status-badged session tabs, controlled or uncontrolled pane management, Tabs and responsive Split grid layouts, per-pane working directories, scrollable monospace output logs, IME-safe inline command inputs, and a clean empty state with New Session recovery.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wire onCommand to execute CLI actions or route inputs to a backend runner and return synchronous output strings to append directly into the target pane.',
      },
      {
        guidance: true,
        description:
          'Use layout="split" when operators need to monitor concurrent build, test, and server sessions side by side.',
      },
      {
        guidance: false,
        description:
          'Exceed maxPanes without giving users a way to close idle tabs; maxPanes is clamped safely to 1..12 and disables the New Session button at capacity.',
      },
    ],
    accessibility: [
      {
        name: 'Session Tablist & Split Pane Regions',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'role="tablist", role="tab" with aria-selected, descriptive Close {title} buttons, and ArrowLeft/ArrowRight navigation',
        description:
          'Exposes session tabs and close controls as sibling accessible buttons (never nested buttons) with keyboard switching and active pane focus indication.',
      },
      {
        name: 'IME-Safe Command Input & Disabled Controls',
        criterion: '2.1.1 Keyboard & 3.3.2 Labels or Instructions',
        requirement: 'e.nativeEvent.isComposing guard on Enter submission, per-pane aria-label inputs, and disabled:cursor-not-allowed at pane capacity',
        description:
          'Prevents IME composition commits from prematurely executing shell commands and labels every pane input and run trigger with its session title.',
      },
    ],
  },
  props: [
    {
      name: 'panes',
      type: 'TerminalSessionPane[]',
      defaultValue: 'undefined',
      description: 'Controlled array of open terminal session panes.',
    },
    {
      name: 'defaultPanes',
      type: 'TerminalSessionPane[]',
      defaultValue: '[{ id: "session-1", title: "Session 1", cwd: "~", status: "idle", lines: [...] }]',
      description: 'Initial terminal session panes for uncontrolled usage.',
    },
    {
      name: 'onPanesChange',
      type: '(panes: TerminalSessionPane[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever panes are created, closed, or updated with command output.',
    },
    {
      name: 'activePaneId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active session pane identifier.',
    },
    {
      name: 'defaultActivePaneId',
      type: 'string',
      defaultValue: 'first pane id',
      description: 'Initial active pane identifier when operating uncontrolled.',
    },
    {
      name: 'onActivePaneChange',
      type: '(id: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active session pane changes.',
    },
    {
      name: 'layout',
      type: "'tabs' | 'split'",
      defaultValue: 'undefined',
      description: 'Controlled layout mode switching between single-pane Tabs and 2-column Split grid.',
    },
    {
      name: 'defaultLayout',
      type: "'tabs' | 'split'",
      defaultValue: "'tabs'",
      description: 'Initial layout mode in uncontrolled usage.',
    },
    {
      name: 'onLayoutChange',
      type: "(layout: 'tabs' | 'split') => void",
      defaultValue: 'undefined',
      description: 'Callback invoked whenever layout changes between tabs and split.',
    },
    {
      name: 'onCommand',
      type: '(paneId: string, command: string) => string | void',
      defaultValue: 'undefined',
      description: 'Handler called when a non-blank command is submitted; returned string is appended to pane output.',
    },
    {
      name: 'maxPanes',
      type: 'number',
      defaultValue: '6',
      description: 'Maximum number of concurrent panes allowed, clamped safely to 1..12.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<TerminalMultiplexer\n  defaultLayout="split"\n  defaultPanes={[\n    { id: 'dev', title: 'Dev Server', cwd: '~/app', status: 'running', lines: ['$ pnpm dev', 'Listening on :5173'] },\n    { id: 'test', title: 'Vitest', cwd: '~/app', status: 'idle', lines: ['Waiting for changes...'] },\n  ]}\n  onCommand={(_paneId, cmd) => \`Executed: \${cmd}\`}\n/>`,
  ],
};
