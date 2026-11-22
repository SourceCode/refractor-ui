export const docs = {
  name: 'FloatingTableOfContents',
  displayName: 'Floating Table of Contents',
  group: 'Document, Knowledge & Spreadsheet Tools',
  category: 'document-knowledge-spreadsheet',
  keywords: [
    'table-of-contents',
    'toc',
    'outline',
    'scroll-spy',
    'reading-progress',
    'navigation',
    'headings',
    'document',
    'knowledge',
    'sticky',
    'anchor',
  ],
  usage: {
    description:
      'Sticky optical-glass document outline built on a semantic <nav> prism-slab shell featuring a header title, live reading progress pill and hairline progress bar, vertical optical tracking rail with a glowing active section indicator (aria-current="location"), hierarchical H1/H2/H3 indentation, optional DOM scroll-spy tracking, IME-safe keyboard traversal, and smooth click navigation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Enable observeDocumentScroll when rendering alongside long-form articles or API docs whose heading elements expose matching id attributes so active progress tracks automatically as the reader scrolls.',
      },
      {
        guidance: true,
        description:
          'Use controlled activeId and scrollProgressPct when integrating with custom scroll containers, virtualized documents, or router hash state.',
      },
      {
        guidance: false,
        description:
          'Populate headings with deeply nested prose or duplicate non-unique anchor IDs; keep section titles scannable across levels 1, 2, and 3 for clear visual hierarchy.',
      },
    ],
    accessibility: [
      {
        name: 'Navigation Landmark & Active Location Semantics',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Semantic <nav aria-label={title}> wrapping an ordered <ol> outline whose active button exposes aria-current="location", plus a role="status" empty state when headings is empty',
        description:
          'Screen readers announce the outline landmark by its title and identify the currently active section programmatically.',
      },
      {
        name: 'IME-Safe Keyboard Traversal & Keyboard-Only Focus Ring',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'ArrowUp, ArrowDown, Home, and End traverse heading buttons smoothly while Enter and Space activate navigation; IME composition is guarded via !event.nativeEvent.isComposing and focus rings appear only on :focus-visible via prism-focus-ring',
        description:
          'Allows full keyboard exploration of long documents without hijacking IME composition or triggering pointer focus outlines.',
      },
      {
        name: 'Reading Progress Bar Semantics',
        criterion: '4.1.2 Name, Role, Value & 1.4.1 Use of Color',
        requirement:
          'Hairline reading progress track exposes role="progressbar", aria-valuemin={0}, aria-valuemax={100}, aria-valuenow, aria-valuetext, and a visible percentage pill',
        description:
          'Communicates reading progress numerically and programmatically across all optical themes.',
      },
    ],
  },
  props: [
    {
      name: 'headings',
      type: 'ReadonlyArray<TocHeadingEntry>',
      defaultValue: '6 default nested H1/H2/H3 sections',
      description:
        'Ordered heading descriptors ({ id, title, level: 1 | 2 | 3 }). Omit for realistic preview sections or pass [] to render the clean role="status" empty state.',
    },
    {
      name: 'activeId',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Controlled active heading identifier highlighted with aria-current="location" and the glowing rail indicator.',
    },
    {
      name: 'defaultActiveId',
      type: 'string',
      defaultValue: 'headings[0]?.id',
      description:
        'Initial active heading identifier in uncontrolled mode.',
    },
    {
      name: 'scrollProgressPct',
      type: 'number',
      defaultValue: 'computed from active heading index',
      description:
        'Optional explicit reading progress percentage clamped to 0..100; automatically derived from the active heading position when omitted.',
    },
    {
      name: 'observeDocumentScroll',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'When true, attaches passive window scroll and resize listeners tracking matching DOM heading IDs via getBoundingClientRect().top and cleans up on unmount.',
    },
    {
      name: 'onSelectHeading',
      type: '(heading: TocHeadingEntry) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the selected TocHeadingEntry when a user clicks or keyboard-activates a heading item.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'On This Page'",
      description:
        'Header title and accessible aria-label applied to the root <nav> landmark.',
    },
    {
      name: 'sticky',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Enables sticky top-6 floating positioning so the outline card remains anchored in the viewport while reading.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FloatingTableOfContents\n  title="On This Page"\n  defaultActiveId="refraction-tokens"\n  onSelectHeading={(heading) => console.warn('Navigate to:', heading.id)}\n/>`,
    `<FloatingTableOfContents\n  title="Specification Outline"\n  observeDocumentScroll\n  headings={[\n    { id: 'overview', title: 'Overview', level: 1 },\n    { id: 'tokens', title: 'Optical Tokens', level: 2 },\n    { id: 'caustics', title: 'Caustic Dispersion', level: 3 },\n    { id: 'migration', title: 'Migration Guide', level: 1 },\n  ]}\n/>`,
  ],
};

export default docs;
