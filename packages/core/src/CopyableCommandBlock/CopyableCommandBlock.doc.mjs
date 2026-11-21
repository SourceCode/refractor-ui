export const docs = {
  name: 'CopyableCommandBlock',
  displayName: 'Copyable Command Block',
  group: 'CLI & Terminal Surfaces',
  category: 'cli-terminal',
  keywords: [
    'command',
    'cli',
    'terminal',
    'shell',
    'copy',
    'clipboard',
    'snippet',
    'pnpm',
    'npm',
    'yarn',
    'bun',
    'install',
  ],
  usage: {
    description:
      'Optical-glass CLI command snippet surface with optional package-manager/runner crystal tabs, linear single-pass shell syntax tokenization in pure React (highlighting executables, flags, quoted strings, and arguments via --prism-* tokens), prompt prefix, and resilient one-click clipboard copy with transient 1600ms emerald confirmation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply variants (e.g. pnpm, npm, yarn, bun) with stable ids and defaultVariantId so developers can switch runners without leaving the snippet.',
      },
      {
        guidance: true,
        description:
          'Set prefix="" for multi-line scripts or PowerShell/Windows snippets where a leading "$" prompt would be misleading.',
      },
      {
        guidance: false,
        description:
          'Embed secret tokens in copyable documentation commands; prefer environment variable placeholders like $API_TOKEN.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Tabs & Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'role="tablist", role="tab" with aria-selected/aria-controls, roving tabIndex, Arrow/Home/End navigation',
        description:
          'Links runner variant tabs to the active command tabpanel with IME-safe ArrowLeft, ArrowRight, Home, and End keyboard traversal and keyboard-only prism-focus-ring styling.',
      },
      {
        name: 'Polite Copy Confirmation Announcements',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="status" aria-live="polite" aria-atomic="true" live region',
        description:
          'Announces clipboard copy success politely for screen-reader users while displaying a 1600ms visual emerald "Copied" confirmation state.',
      },
    ],
  },
  props: [
    {
      name: 'command',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Standalone shell command rendered when variants are not provided.',
    },
    {
      name: 'variants',
      type: 'CommandVariant[]',
      defaultValue: 'undefined',
      description: 'Optional list of runner or package-manager command tabs ({ id, label, command }).',
    },
    {
      name: 'defaultVariantId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Initial selected variant id (falls back to the first variant).',
    },
    {
      name: 'onVariantChange',
      type: '(id: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the user selects a different command variant tab.',
    },
    {
      name: 'prefix',
      type: 'string',
      defaultValue: "'$'",
      description: 'Decorative non-selectable shell prompt prefix shown ahead of the command.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional title displayed above the recessed command well.',
    },
    {
      name: 'onCopy',
      type: '(command: string) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the active command text when Copy is activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CopyableCommandBlock\n  title="Install Refractor Core"\n  defaultVariantId="pnpm"\n  variants={[\n    { id: 'pnpm', label: 'pnpm', command: 'pnpm add @refractor-ui/core --save-exact' },\n    { id: 'npm', label: 'npm', command: 'npm install @refractor-ui/core --save-exact' },\n    { id: 'yarn', label: 'yarn', command: 'yarn add @refractor-ui/core --exact' },\n    { id: 'bun', label: 'bun', command: 'bun add @refractor-ui/core --exact' },\n  ]}\n/>`,
  ],
};
