export const docs = {
  name: 'CitationChip',
  displayName: 'Citation Chip (Inline Source Preview)',
  group: 'AI & Conversational Interfaces',
  category: 'ai-conversational',
  keywords: [
    'citation',
    'source',
    'reference',
    'footnote',
    'chip',
    'popover',
    'ai',
    'grounding',
    'rag',
  ],
  usage: {
    description:
      'Compact inline optical-crystal citation chip ([index] label) that opens a floating prism-slab source preview popover displaying the source title, domain, quoted snippet, sanitized external link, and optional source inspection trigger.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Place CitationChip inline immediately after grounded statements so readers can verify claims without leaving the response flow.',
      },
      {
        guidance: true,
        description:
          'Pair a short scannable label on the chip with a richer title and quoted snippet inside the popover.',
      },
      {
        guidance: false,
        description:
          'Trust raw model-generated URLs without sanitization; CitationChip automatically strips unsafe schemes such as javascript:, vbscript:, and data:.',
      },
    ],
    accessibility: [
      {
        name: 'Dialog Popover & Dismissal',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'aria-expanded, aria-haspopup="dialog", aria-controls, Escape and outside-click dismissal',
        description:
          'The inline crystal trigger announces its dialog popup state, links to the popover via aria-controls, and dismisses cleanly on Escape (restoring focus to the trigger), outside clicks, or the close button.',
      },
      {
        name: 'Safe External Navigation',
        criterion: 'Security & Predictable Context',
        requirement: 'Sanitized href with rel="noopener noreferrer" and target="_blank"',
        description:
          'Only renders an external anchor element after sanitizeUrl(href, false) validates the protocol, preventing reverse tabnabbing and script URI execution.',
      },
    ],
  },
  props: [
    {
      name: 'index',
      type: 'number | string',
      defaultValue: 'undefined',
      description: 'Optional citation marker rendered in brackets (e.g. [1] or [A]) before the chip label.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: 'required',
      description: 'Compact text label shown inside the inline optical crystal trigger button.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: 'label',
      description: 'Full source title displayed in the preview popover header; falls back to label when omitted.',
    },
    {
      name: 'snippet',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional source passage or quote rendered inside a recessed prism-well.',
    },
    {
      name: 'href',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional source URL validated via sanitizeUrl(href, false); unsafe schemes are stripped.',
    },
    {
      name: 'domain',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional publisher or host domain displayed in monospace below the popover title.',
    },
    {
      name: 'onInspect',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback invoked when clicking the Inspect source action button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<CitationChip\n  index={1}\n  label="ADR-0003"\n  title="Optical Token Cascade Contract"\n  domain="docs.refractor.dev"\n  snippet="Every glass surface reads exclusively from --prism-* CSS custom properties."\n  href="https://docs.refractor.dev/adr/0003"\n  onInspect={() => openDrawer('adr-0003')}\n/>`,
  ],
};
