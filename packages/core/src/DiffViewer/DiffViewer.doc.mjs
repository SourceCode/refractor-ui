export const docs = {
  name: 'DiffViewer',
  displayName: 'Code & Text Diff Viewer',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['diff', 'compare', 'code', 'split', 'unified', 'patch', 'review', 'whitespace'],
  usage: {
    description:
      'Optical glass line-by-line diff viewer supporting side-by-side split and unified stream modes, live tabular change counters, and whitespace-insensitive comparison powered by deterministic LCS diffing.',
    bestPractices: [
      {
        guidance: true,
        description: 'Provide descriptive originalLabel and modifiedLabel values such as filenames, commit SHAs, or version numbers.',
      },
      {
        guidance: true,
        description: 'Use unified mode in narrow layouts and split mode on wide viewports for parallel code inspection.',
      },
      {
        guidance: false,
        description: 'Pre-escape HTML entities in original or modified strings; DiffViewer renders all lines strictly as literal React text nodes.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic diff tables & status announcements',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Structured thead/tbody tables, aria-pressed mode toggles, and role="status" identical banner',
        description: 'Split and unified panes use semantic table sections with column headers, keyboard-navigable view mode toggles, and live status banners when inputs match.',
      },
    ],
  },
  props: [
    { name: 'original', type: 'string', defaultValue: 'required', description: 'Baseline text or source code before changes.' },
    { name: 'modified', type: 'string', defaultValue: 'required', description: 'Target text or source code after changes.' },
    { name: 'originalLabel', type: 'string', defaultValue: "'Original'", description: 'Label displayed for the original pane/column.' },
    { name: 'modifiedLabel', type: 'string', defaultValue: "'Modified'", description: 'Label displayed for the modified pane/column.' },
    { name: 'viewMode', type: "'split' | 'unified'", defaultValue: 'undefined', description: 'Controlled diff presentation mode.' },
    { name: 'defaultViewMode', type: "'split' | 'unified'", defaultValue: "'split'", description: 'Initial presentation mode when uncontrolled.' },
    { name: 'onViewModeChange', type: '(mode: DiffViewMode) => void', defaultValue: 'undefined', description: 'Callback fired when switching between split and unified modes.' },
    { name: 'ignoreWhitespace', type: 'boolean', defaultValue: 'undefined', description: 'Controlled flag to ignore leading/trailing and repeated inline whitespace differences.' },
    { name: 'defaultIgnoreWhitespace', type: 'boolean', defaultValue: 'false', description: 'Initial ignore-whitespace state when uncontrolled.' },
    { name: 'title', type: 'string', defaultValue: "'Diff Viewer'", description: 'Heading displayed inside the crystal header bar.' },
  ],
  examples: [
    `<DiffViewer\n  title="Release Manifest Diff"\n  originalLabel="v1.1.0"\n  modifiedLabel="v1.2.0"\n  original={"version = 1.1.0\\nmode = standard"}\n  modified={"version = 1.2.0\\nmode = standard\\ncache = true"}\n/>`,
  ],
};
