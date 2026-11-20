export const docs = {
  name: 'RichTextEditor',
  displayName: 'Rich Text / WYSIWYG Editor',
  group: 'Forms & Inputs',
  category: 'forms-inputs',
  keywords: [
    'rich text',
    'wysiwyg',
    'editor',
    'markdown',
    'formatting',
    'toolbar',
    'sanitize',
    'preview',
    'xss-safe',
  ],
  usage: {
    description:
      'XSS-hardened optical glass Rich Text / WYSIWYG editor combining a prism-crystal formatting toolbar, recessed link & image URL popovers validated via sanitizeUrl(), live Write | Split | Preview rendering into pure React JSX elements without dangerouslySetInnerHTML, and tabular word/character telemetry.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a clear label prop so screen readers associate the editor textarea with its purpose.',
      },
      {
        guidance: true,
        description:
          'Keep showPreview enabled for authoring flows so users can inspect rendered headings, lists, links, and embedded images in real time.',
      },
      {
        guidance: false,
        description:
          'Render the emitted HTML with dangerouslySetInnerHTML without server-side validation; RichTextEditor always renders preview output as structured React elements.',
      },
    ],
    accessibility: [
      {
        name: 'Toolbar semantics, view-mode tabs, and live URL alerts',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'role="toolbar", role="tablist" with arrow navigation, role="alert" URL validation, and IME-safe shortcuts',
        description:
          'Every toolbar button exposes a descriptive aria-label and disables cleanly in readOnly mode; Write/Split/Preview tabs support Left/Right arrow navigation; invalid URLs announce errors via role="alert".',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled markdown or rich HTML document string.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description: 'Initial document value when uncontrolled.',
    },
    {
      name: 'onChange',
      type: '(sanitizedHtml: string) => void',
      defaultValue: 'undefined',
      description: 'Called with sanitized content after every input change, link insertion, image insertion, or formatting action.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Visible label bound to the editor textarea.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Write with rich formatting or markdown...'",
      description: 'Placeholder hint shown in the empty write surface.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Prevents edits and disables all toolbar formatting controls.',
    },
    {
      name: 'showPreview',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays Write | Split | Preview tabs and live rendered rich typography preview.',
    },
  ],
  examples: [
    `<RichTextEditor\n  label="Release Notes"\n  defaultValue={"# Refractor v1.4\\n\\nBuilt with **optical glass** and *zero* raw HTML injection."}\n  onChange={(safeHtml) => setNotes(safeHtml)}\n/>`,
  ],
};
