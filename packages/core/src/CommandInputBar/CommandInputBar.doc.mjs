export const docs = {
  name: 'CommandInputBar',
  displayName: 'Command Input Bar',
  group: 'CLI & Terminal Surfaces',
  category: 'cli-terminal',
  keywords: [
    'command',
    'cli',
    'input',
    'bar',
    'prompt',
    'autocomplete',
    'ghost',
    'history',
    'terminal',
    'shell',
  ],
  usage: {
    description:
      'Compact optical-glass command bar combining a recessed frosted monospace input well, configurable prompt glyph, live case-insensitive prefix ghost autocomplete accepted via Tab or end-of-line ArrowRight, ArrowUp/ArrowDown combined history cycling, Escape clear, IME-safe Enter submission, and a refractive primary Run button.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide high-frequency CLI verbs in suggestions so operators can accept inline ghost completions with a single Tab or ArrowRight keystroke.',
      },
      {
        guidance: true,
        description:
          'Pass persisted session commands via history so ArrowUp immediately recalls prior commands alongside newly submitted ones.',
      },
      {
        guidance: false,
        description:
          'Trap Tab focus navigation when no prefix suggestion matches; CommandInputBar only intercepts Tab while a ghost completion is active.',
      },
    ],
    accessibility: [
      {
        name: 'No Keyboard Trap & IME-Safe Submission',
        criterion: '2.1.1 Keyboard & 2.1.2 No Keyboard Trap',
        requirement: 'Intercepts Tab only when a ghost suggestion matches and guards Enter with !e.nativeEvent.isComposing',
        description:
          'Preserves standard Tab focus traversal when no completion is active and prevents premature submission during CJK/IME composition.',
      },
      {
        name: 'Disabled & Empty Action Safeguards',
        criterion: '4.1.2 Name, Role, Value & 2.4.7 Focus Visible',
        requirement: 'Disables Run when disabled or blank with disabled:cursor-not-allowed and prism-focus-ring',
        description:
          'Communicates unavailable execution state clearly while keeping keyboard-only focus rings visible on interactive controls.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled command string value.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description: 'Initial command string when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(val: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the command input value changes.',
    },
    {
      name: 'onSubmit',
      type: '(command: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the trimmed command string on non-blank submission.',
    },
    {
      name: 'prompt',
      type: 'string',
      defaultValue: "'$'",
      description: 'Monospace prompt glyph displayed before the text input.',
    },
    {
      name: 'suggestions',
      type: 'string[]',
      defaultValue: 'undefined',
      description: 'Prefix-matched command suggestions rendered as inline ghost completion text.',
    },
    {
      name: 'history',
      type: 'string[]',
      defaultValue: 'undefined',
      description: 'External chronological command history combined with internally submitted commands.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Type a command...'",
      description: 'Placeholder copy shown inside the recessed command well when empty.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables the input, keyboard shortcuts, and Run button.',
    },
    {
      name: 'submitLabel',
      type: 'string',
      defaultValue: "'Run'",
      description: 'Label rendered inside the refractive primary action button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CommandInputBar\n  prompt="prism>"\n  suggestions={['deploy --prod', 'dev --watch', 'test --coverage']}\n  history={['pnpm lint:strict', 'pnpm typecheck']}\n  onSubmit={(cmd) => {\n    void cmd;\n  }}\n/>`,
  ],
};
