export const docs = {
  name: 'PrismList',
  displayName: 'List',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['list', 'rows', 'activity', 'feed', 'items', 'action'],
  usage: {
    description:
      'Vertical stack of uniform crystal rows displaying optional leading icons, primary and secondary text, tabular metadata, and per-row action buttons.',
    bestPractices: [
      { guidance: true, description: 'Keep titles and subtitles concise so rows remain scannable on narrow viewports.' },
      { guidance: true, description: 'Provide concise actionLabel verbs when pairing with onItemAction.' },
      { guidance: false, description: 'Pack multi-column financial tables into PrismList; use DataTable instead.' },
    ],
    accessibility: [
      {
        name: 'Semantic list markup',
        criterion: '1.3.1 Info and Relationships',
        requirement: '<ul> / <li> list structure with keyboard-focusable action triggers',
        description: 'Items render inside a semantic unordered list and action buttons use native <button type="button"> elements with keyboard-only focus rings.',
      },
    ],
  },
  props: [
    { name: 'items', type: 'ReadonlyArray<PrismListItem>', defaultValue: 'required', description: 'Uniform row items with optional leading icons, metadata, and actions.' },
    { name: 'onItemAction', type: '(item: PrismListItem) => void', defaultValue: 'undefined', description: 'Callback invoked when an item action button is pressed.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<PrismList\n  items={[{ id: '1', title: 'Refraction Token Audit', subtitle: 'Verified WCAG AA contrast', meta: '2m ago', actionLabel: 'View' }]}\n  onItemAction={handleInspect}\n/>`,
  ],
};
