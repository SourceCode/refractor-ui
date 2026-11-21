export const docs = {
  name: 'TerminalEmulator',
  displayName: 'Terminal Emulator',
  group: 'CLI & Terminal Surfaces',
  category: 'cli-terminal',
  keywords: [
    'terminal',
    'shell',
    'console',
    'cli',
    'ansi',
    'stdout',
    'stderr',
    'logs',
    'command',
    'emulator',
  ],
  usage: {
    description:
      'Optical glass terminal emulator slab featuring a crystal window header with live line-count badge and Clear action, a recessed scrollable monospace ANSI log rendering linear-time parsed SGR spans strictly via --prism-* tokens, and an IME-safe interactive shell prompt with ArrowUp/ArrowDown history and Ctrl+L clear.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Return structured TerminalLine[] objects from onExecute when commands produce stderr diagnostics, timestamps, or ANSI-colored output.',
      },
      {
        guidance: true,
        description:
          'Set readOnly={true} when streaming build logs or read-only audit output where command execution should be hidden.',
      },
      {
        guidance: false,
        description:
          'Render ANSI output via dangerouslySetInnerHTML; TerminalEmulator parses SGR sequences in O(n) time into safe React spans.',
      },
    ],
    accessibility: [
      {
        name: 'Polite Log Region & Output Announcements',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="log", aria-live="polite", and aria-relevant="additions text" on the output viewport',
        description:
          'Announces appended terminal output politely to screen readers without interrupting command typing.',
      },
      {
        name: 'IME-Safe Shell Input & Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'Guards Enter with !e.nativeEvent.isComposing and supports ArrowUp/ArrowDown history and Ctrl+L clear',
        description:
          'Protects CJK/IME composition sessions while providing full keyboard ergonomics and keyboard-only prism-focus-ring outlines.',
      },
    ],
  },
  props: [
    {
      name: 'lines',
      type: 'TerminalLine[]',
      defaultValue: 'undefined',
      description: 'Controlled array of terminal output lines.',
    },
    {
      name: 'defaultLines',
      type: 'TerminalLine[]',
      defaultValue: '[]',
      description: 'Initial terminal output lines when operating in uncontrolled mode.',
    },
    {
      name: 'onLinesChange',
      type: '(lines: TerminalLine[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever terminal lines are appended or cleared.',
    },
    {
      name: 'prompt',
      type: 'string',
      defaultValue: "'refractor@prism:~$'",
      description: 'Monospace shell prompt prefix shown before submitted commands and beside the input.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Shell'",
      description: 'Window title displayed in the crystal header bar.',
    },
    {
      name: 'onExecute',
      type: '(command: string) => string | TerminalLine[] | void',
      defaultValue: 'undefined',
      description: 'Custom command executor returning plain/ANSI text, structured TerminalLine[], or void.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Hides the Clear action and bottom interactive prompt when true.',
    },
    {
      name: 'maxLines',
      type: 'number',
      defaultValue: '500',
      description: 'Maximum retained lines in the scrollback buffer (clamped between 10 and 5000).',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Enter command (try help or clear)...'",
      description: 'Placeholder text rendered inside the interactive command prompt.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<TerminalEmulator\n  title="Refractor Build Shell"\n  defaultLines={[\n    { id: '1', text: '\\x1b[1;32mReady\\x1b[0m — Refractor optical runtime online', kind: 'system' },\n  ]}\n  onExecute={(cmd) => {\n    if (cmd === 'status') return '\\x1b[32mAll optical pipelines healthy\\x1b[0m';\n    return [{ id: 'err-1', text: \`Unknown command: \${cmd}\`, kind: 'stderr' }];\n  }}\n/>`,
  ],
};
