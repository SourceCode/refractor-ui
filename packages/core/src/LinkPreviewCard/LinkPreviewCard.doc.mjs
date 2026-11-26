export const docs = {
  name: 'LinkPreviewCard',
  displayName: 'Link Preview Card (Optical Inline Hover Card)',
  group: 'Document, Knowledge & Spreadsheet Tools',
  category: 'document-knowledge-spreadsheet',
  keywords: [
    'link',
    'preview',
    'hover-card',
    'unfurl',
    'document',
    'wiki',
    'issue',
    'repo',
    'knowledge',
    'popover',
    'tooltip',
    'inline',
  ],
  usage: {
    description:
      'Inline optical-glass anchor trigger underlined with --prism-primary-main that reveals a viewport-clamped floating prism-slab preview card on hover, focus, or internal/prevented click. Displays an entity kind badge (Doc, Wiki, Issue, Repo, Link), sanitized optional thumbnail, title, two-line summary, author and updated timestamp metadata, and optical tag pills with hover-bridge persistence and Escape/blur dismissal.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use LinkPreviewCard inline inside knowledge-base prose, specifications, or issue descriptions so readers can inspect referenced documents, wikis, issues, or repositories without losing reading context.',
      },
      {
        guidance: true,
        description:
          'Provide a concise 1–2 sentence summary and 2–4 scannable tags so the miniature viewport-clamped preview slab communicates relevance immediately.',
      },
      {
        guidance: false,
        description:
          'Pass unsanitized user-authored URLs directly into raw anchors; LinkPreviewCard sanitizes both href and preview.thumbnailSrc via sanitizeUrl and blocks unsafe schemes like javascript:, vbscript:, and data:text/html.',
      },
    ],
    accessibility: [
      {
        name: 'Content on Hover or Focus & Keyboard Dismissal',
        criterion: '1.4.13 Content on Hover or Focus & 2.1.1 Keyboard',
        requirement:
          'Hover-bridge persistence, focus reveal, blur dismissal, and IME-safe Escape key dismissal',
        description:
          'Reveals the preview dialog on hover (with clamped open/close delays and an interactive hover bridge) and on keyboard focus, and dismisses cleanly on blur or Escape while ignoring active IME compositions.',
      },
      {
        name: 'Dialog Semantics & Safe External Navigation',
        criterion: '4.1.2 Name, Role, Value & Security',
        requirement:
          'aria-haspopup="dialog", aria-expanded, aria-controls, role="dialog" with aria-labelledby/aria-describedby, and sanitized href with rel="noopener noreferrer" when external',
        description:
          'Announces dialog state from the inline trigger, associates title and summary text with the preview card, adds target="_blank" rel="noopener noreferrer" only for safe external URLs, and falls back to an inert button trigger when href is unsafe.',
      },
    ],
  },
  props: [
    {
      name: 'href',
      type: 'string',
      defaultValue: 'required',
      description:
        'Destination URL strictly sanitized via sanitizeUrl(href, false). Unsafe protocols (javascript:, vbscript:, data:text/html, protocol-relative) are blocked.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description: 'Visible inline anchor text paired with the subtle entity icon.',
    },
    {
      name: 'preview',
      type: 'LinkPreviewMetadata',
      defaultValue: 'required',
      description:
        'Metadata rendered inside the floating prism-slab card ({ title, summary, kind?, updatedAt?, author?, tags?, thumbnailSrc? }).',
    },
    {
      name: 'placement',
      type: "'top' | 'bottom'",
      defaultValue: "'bottom'",
      description: 'Vertical placement of the floating preview card relative to the inline link.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled open state of the preview card.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial open state when operating in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the preview card opens or closes.',
    },
    {
      name: 'openDelayMs',
      type: 'number',
      defaultValue: '120',
      description: 'Hover open delay in milliseconds, clamped between 0 and 1000.',
    },
    {
      name: 'closeDelayMs',
      type: 'number',
      defaultValue: '150',
      description: 'Hover close delay in milliseconds, clamped between 0 and 1000.',
    },
    {
      name: 'external',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'When true and href is safe, adds target="_blank" and rel="noopener noreferrer" plus an External indicator in the card header.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<p>\n  Review the{' '}\n  <LinkPreviewCard\n    href="/docs/adr-0003"\n    label="ADR-0003 Optical Cascade"\n    preview={{\n      title: 'ADR-0003: Optical Token Cascade Contract',\n      summary: 'Defines the strict --prism-* CSS custom property surface contract shared by all glass components.',\n      kind: 'doc',\n      author: 'Elena Vance',\n      updatedAt: 'Updated 2h ago',\n      tags: ['architecture', 'tokens', 'glass'],\n    }}\n  />{' '}\n  before introducing new surface utilities.\n</p>`,
    `<LinkPreviewCard\n  href="https://github.com/refractor-ui/core"\n  label="refractor-ui/core"\n  external\n  placement="top"\n  preview={{\n    title: 'refractor-ui/core',\n    summary: 'React 19 optical-glass component kit with Open-Internals contracts and dual-mode theming.',\n    kind: 'repo',\n    author: 'Refractor Team',\n    updatedAt: 'v1.34.0',\n    tags: ['react-19', 'typescript'],\n  }}\n/>`,
  ],
};

export default docs;
