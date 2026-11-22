export const docs = {
  name: 'DirectoryFilterBar',
  displayName: 'Directory Filter Bar',
  group: 'File Explorer Navigation & Views',
  category: 'file-explorer-navigation',
  keywords: [
    'directory',
    'filter',
    'grouping',
    'explorer',
    'files',
    'extensions',
    'tags',
    'sort',
    'search',
    'toolbar',
    'size-buckets',
    'file-manager',
  ],
  usage: {
    description:
      'Inline optical-glass Directory Filter & Grouping toolbar housed in a sculpted `prism-slab`, combining a linear-time case-insensitive filename search input (zero `RegExp`, IME-safe `Escape` clear), dynamically derived extension filter pills via `Set`, semantic `--prism-*` color tag filter pills (`primary`, `emerald`, `amber`, `info`, `rose`), a `Group by` selector (`None`, `Kind`, `Date Modified`, `Size`), an ascending/descending sort toggle, one-click `Reset Filters`, a polite `aria-live="polite"` match counter, and an ES `Map`-backed live grouped preview resilient against prototype-keyed directory metadata.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass real directory metadata (`extension`, `kind`, `sizeBytes`, `modifiedGroup`, and optional `tag`) so extension pills derive automatically via `Set` and size bucketing classifies files into `< 100 KB`, `100 KB–10 MB`, and `> 10 MB` groups.',
      },
      {
        guidance: true,
        description:
          'Set `showResultsPreview={false}` and listen to `onChange(state, matchingCount)` when pairing `DirectoryFilterBar` above a separate custom table, virtualized file list, or Miller columns browser.',
      },
      {
        guidance: false,
        description:
          'Compile user filename queries into `new RegExp(...)` or group entries via plain `{}` objects indexed by untrusted kind/date strings; `DirectoryFilterBar` performs linear-time literal substring matching and groups strictly through ES `Map`.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Filter Controls, Pressed States & Polite Live Match Status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'role="region" linked via aria-labelledby, aria-label="Filter folder by filename", aria-label="Group directory items by", aria-pressed on extension/tag/sort toggle buttons, aria-live="polite" match counter, and role="status" empty state',
        description:
          'Exposes every filter dimension with semantic grouping and explicit accessible names while announcing live match counts without shifting keyboard focus.',
      },
      {
        name: 'IME-Safe Search Reset & Keyboard-Only Focus Outlines',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Guards Escape and Enter handling with !e.nativeEvent.isComposing and applies .prism-focus-ring (:focus-visible) across every interactive input, pill, select, and button',
        description:
          'Prevents interrupting active IME composition sessions while ensuring crisp keyboard focus navigation and disabled cursor semantics.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Directory Filter & Grouping'",
      description: 'Visible toolbar heading linked to the region landmark via `aria-labelledby`.',
    },
    {
      name: 'items',
      type: 'ReadonlyArray<DirectoryFilterItem>',
      defaultValue:
        '8 realistic directory items spanning .tsx, .png, .pdf, .zip, .wav across sizes, dates, and color tags',
      description:
        'Directory entries filtered, grouped, and sorted by the toolbar and optional live preview.',
    },
    {
      name: 'value',
      type: 'DirectoryFilterState',
      defaultValue: 'undefined',
      description: 'Controlled filter, grouping, and sort state.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<DirectoryFilterState>',
      defaultValue: 'undefined',
      description: 'Initial uncontrolled filter, grouping, and sort state.',
    },
    {
      name: 'showResultsPreview',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Toggles the built-in live filtered & grouped directory preview panel (including the `role="status"` empty state).',
    },
    {
      name: 'onChange',
      type: '(state: DirectoryFilterState, matchingCount: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever query, extension, tag, groupBy, or sortDir changes, supplying the normalized state and matching item count.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all search, pill, grouping, sorting, and reset interactions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<DirectoryFilterBar />`,
    `<DirectoryFilterBar\n  title="Release Assets"\n  defaultValue={{ groupBy: 'size', sortDir: 'asc' }}\n  onChange={(state, count) => console.warn(state.groupBy, count)}\n/>`,
  ],
};

export default docs;
