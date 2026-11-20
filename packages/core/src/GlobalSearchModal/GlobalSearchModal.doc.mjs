export const docs = {
  name: 'GlobalSearchModal',
  displayName: 'Global Search Modal',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['global search', 'modal', 'spotlight', 'cmd+k', 'filter', 'highlight', 'recent'],
  usage: {
    description:
      'A centered optical glass spotlight modal with recessed search input, instant category filter tabs with tabular counts, prototype-safe grouped sections, literal match highlighting, recent query quick-fill chips, and keyboard navigation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Categorize heterogeneous resources (Files, People, Components, Settings) via `item.type` so users can narrow results in one click.',
      },
      {
        guidance: true,
        description:
          'Provide `recentQueries` to accelerate repeat navigation before typing begins.',
      },
      {
        guidance: false,
        description:
          'Build raw RegExp matchers from user search strings — GlobalSearchModal relies exclusively on splitLiteralHighlight for safe literal highlighting.',
      },
    ],
    accessibility: [
      {
        name: 'Modal Search Dialog & Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 2.1.2 No Keyboard Trap',
        requirement: 'role="dialog", aria-modal="true", ArrowDown/ArrowUp, IME-safe Enter, Escape dismissal',
        description:
          'Autofocuses the search input on open, cycles across flattened grouped results via Arrow keys, guards Enter with !e.nativeEvent.isComposing, and dismisses cleanly on Escape or backdrop click.',
      },
    ],
  },
  props: [
    { name: 'open', type: 'boolean', defaultValue: 'required', description: 'Controls visibility of the global search modal.' },
    { name: 'onClose', type: '() => void', defaultValue: 'required', description: 'Callback invoked on Escape, backdrop click, ESC button, or item selection.' },
    { name: 'items', type: 'ReadonlyArray<GlobalSearchItem>', defaultValue: 'required', description: 'Searchable items grouped and tabbed by `type`.' },
    { name: 'onSelectItem', type: '(item: GlobalSearchItem) => void', defaultValue: 'required', description: 'Callback fired with the selected GlobalSearchItem before closing.' },
    { name: 'recentQueries', type: 'ReadonlyArray<string>', defaultValue: 'undefined', description: 'Optional recent search queries displayed as quick-fill chips when the query is empty.' },
    { name: 'placeholder', type: 'string', defaultValue: "'Search files, people, components, settings...'", description: 'Placeholder text displayed in the search input.' },
    { name: 'emptyMessage', type: 'string', defaultValue: 'undefined', description: 'Optional custom empty-state message when no items match.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<GlobalSearchModal\n  open={open}\n  onClose={() => setOpen(false)}\n  items={[\n    { id: 'f1', title: 'refractor.css', subtitle: 'packages/core/src', type: 'Files', shortcut: '⌘1' },\n    { id: 'c1', title: 'PrimaryButton', subtitle: 'Optical capsule CTA', type: 'Components', meta: 'Core' },\n  ]}\n  recentQueries={['PrimaryButton', 'Tokens']}\n  onSelectItem={handleOpenItem}\n/>`,
  ],
};
