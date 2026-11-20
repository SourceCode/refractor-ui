export const docs = {
  name: 'MasonryGrid',
  displayName: 'Masonry Grid',
  group: 'Layout & Workspace Controls',
  category: 'layout-workspace',
  keywords: ['masonry', 'grid', 'brickwork', 'cards', 'gallery', 'columns', 'layout', 'pinterest'],
  usage: {
    description:
      'Shortest-column greedy optical brickwork grid that balances variable-height prism-slab cards across 1 to 6 responsive lanes with zero awkward vertical gaps.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide accurate estimatedHeight hints on variable-height cards so the shortest-column allocator balances lane bottoms tightly.',
      },
      {
        guidance: true,
        description:
          'Use renderItem when cards require bespoke interactive media, badges, or action footers while retaining semantic listitem wrappers.',
      },
      {
        guidance: false,
        description:
          'Use MasonryGrid for tabular financial comparisons where strict row alignment matters; use DataTable instead.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic list & listitem structure',
        criterion: '1.3.1 Info and Relationships',
        requirement:
          'role="list" container with role="none" visual column lanes and role="listitem" card wrappers',
        description:
          'Column layout lanes use role="none" so assistive technologies perceive a flat, accessible list of cards with preserved original indices.',
      },
      {
        name: 'Empty state announcement',
        criterion: '4.1.3 Status Messages',
        requirement: 'Empty state renders inside a role="status" optical slab',
        description:
          'When items is empty, emptyMessage is rendered visibly across all grid tracks with status semantics.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<T extends MasonryItem>',
      defaultValue: 'required',
      description: 'Items distributed into shortest-column vertical lanes using estimatedHeight.',
    },
    {
      name: 'columns',
      type: 'number',
      defaultValue: '3',
      description:
        'Number of balanced columns (clamped to 1..6; non-finite values fall back to 3).',
    },
    {
      name: 'gapPx',
      type: 'number',
      defaultValue: '16',
      description: 'Pixel gap between lanes and stacked cards (clamped to 0..48; default 16).',
    },
    {
      name: 'renderItem',
      type: '(item: T, index: number) => ReactNode',
      defaultValue: 'undefined',
      description:
        'Custom renderer for each card; defaults to an optical prism-slab card with title, subtitle, and content.',
    },
    {
      name: 'emptyMessage',
      type: 'string',
      defaultValue: "'No items to display.'",
      description:
        'Fallback message rendered inside a full-width optical slab when items is empty.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<MasonryGrid\n  columns={3}\n  gapPx={16}\n  items={[\n    { id: 'c1', estimatedHeight: 280, title: 'Refractive Caustics', subtitle: 'Dispersion study on alabaster' },\n    { id: 'c2', estimatedHeight: 140, title: 'Specular Edge', subtitle: 'Top rim sheen calibration' },\n    { id: 'c3', estimatedHeight: 200, title: 'Obsidian Depth', subtitle: 'Dark-mode glass elevation' },\n  ]}\n/>`,
  ],
};
