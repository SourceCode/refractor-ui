export const docs = {
  name: 'CodeEditor',
  displayName: 'Optical Glass Code Editor',
  group: 'Rich Input & Content Creation',
  category: 'rich-input',
  keywords: [
    'code',
    'editor',
    'ide',
    'syntax',
    'highlighting',
    'typescript',
    'json',
    'css',
    'diagnostics',
    'gutter',
  ],
  usage: {
    description:
      'Optical glass IDE surface featuring a prism-crystal telemetry header (language badge, tabular line/col indicator, diagnostic counts, and copy button), synchronized line-number gutter with clickable severity markers, linear single-pass syntax highlighting in pure React spans (zero dangerouslySetInnerHTML), Tab and IME-safe Enter auto-indentation, and an interactive diagnostics panel.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide explicit language ("typescript", "json", or "css") and a descriptive label prop so syntax highlighting and assistive technology labels match the edited file.',
      },
      {
        guidance: true,
        description:
          'Pass 1-based line numbers in diagnostics so gutter indicators and the live diagnostic panel jump accurately to offending lines.',
      },
      {
        guidance: false,
        description:
          'Use dangerouslySetInnerHTML for syntax highlighting; CodeEditor renders every token strictly as escaped React <span> text nodes.',
      },
    ],
    accessibility: [
      {
        name: 'IME-safe keyboard editing, diagnostic navigation, and tabular telemetry',
        criterion: '2.1.1 Keyboard & 1.3.1 Info and Relationships',
        requirement: 'IME-guarded Enter/Tab handlers, keyboard-focusable gutter/diagnostic buttons, and prism-focus-ring',
        description:
          'Enter auto-indentation ignores IME composition events, gutter line buttons and diagnostic items provide explicit line/severity aria-labels, and focus outlines appear only on keyboard navigation.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled source code text.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description: 'Initial source code text when uncontrolled.',
    },
    {
      name: 'onChange',
      type: '(code: string) => void',
      defaultValue: 'undefined',
      description: 'Invoked with updated source code on edit, Tab indentation, or Enter auto-indentation.',
    },
    {
      name: 'language',
      type: "'typescript' | 'json' | 'css'",
      defaultValue: "'typescript'",
      description: 'Language grammar used by the linear single-pass syntax highlighter.',
    },
    {
      name: 'diagnostics',
      type: 'ReadonlyArray<CodeDiagnostic>',
      defaultValue: 'undefined',
      description: 'Line-level error and warning diagnostics displayed in the gutter and live diagnostic panel.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Prevents code edits while keeping Copy Code and diagnostic navigation enabled.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Visible IDE header title bound to the editor textarea.',
    },
    {
      name: 'tabSize',
      type: 'number',
      defaultValue: '2',
      description: 'Number of spaces inserted on Tab and block auto-indent (clamped 2..8).',
    },
    {
      name: 'showLineNumbers',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Toggles the synchronized 1-based line-number and diagnostic gutter.',
    },
  ],
  examples: [
    `<CodeEditor\n  label="theme.ts"\n  language="typescript"\n  defaultValue={"export const blurPx = 18;\\nexport function init() {\\n  return blurPx;\\n}"}\n  diagnostics={[{ line: 2, severity: 'warning', message: 'Consider returning a typed token object' }]}\n/>`,
  ],
};
