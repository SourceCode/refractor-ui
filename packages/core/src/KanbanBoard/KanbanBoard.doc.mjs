export const docs = {
  name: 'KanbanBoard',
  displayName: 'Kanban Board',
  group: 'Advanced Data & Visualization',
  category: 'advanced-data',
  keywords: ['kanban', 'board', 'columns', 'cards', 'drag-and-drop', 'workflow', 'wip', 'agile'],
  usage: {
    description:
      'Optical glass workflow board arranging draggable crystal task cards across slab status columns with WIP limit monitoring, accessible keyboard column transfers, and IME-safe inline Quick Add inputs.',
    bestPractices: [
      { guidance: true, description: 'Configure concise wipLimit budgets on active columns so throughput bottlenecks surface immediately.' },
      { guidance: true, description: 'Use controlled cards with onCardsChange when synchronizing drag-and-drop moves with a backend store.' },
      { guidance: false, description: 'Rely solely on pointer drag-and-drop; keep built-in Move Left / Move Right controls accessible for keyboard workflows.' },
    ],
    accessibility: [
      {
        name: 'Keyboard column movement & IME-safe Quick Add',
        criterion: '2.1.1 Keyboard',
        requirement: 'Accessible Move Left / Move Right buttons on every card and IME composition guard on Quick Add Enter',
        description: 'Every card provides labelled Move Left and Move Right buttons with keyboard-only prism-focus-ring styling, while Quick Add checks !e.nativeEvent.isComposing before committing on Enter.',
      },
      {
        name: 'WIP overflow indication',
        criterion: '1.4.1 Use of Color',
        requirement: 'Icon, tabular ratio, data-wip-exceeded state, and screen-reader text supplement warning styling',
        description: 'Exceeding a column wipLimit displays a warning icon, count/limit ratio, data-wip-exceeded="true" reflection, and screen-reader announcement.',
      },
    ],
  },
  props: [
    { name: 'columns', type: 'ReadonlyArray<KanbanColumnDef>', defaultValue: 'required', description: 'Ordered status column definitions with optional wipLimit.' },
    { name: 'cards', type: 'ReadonlyArray<KanbanCardItem>', defaultValue: 'undefined', description: 'Controlled list of cards across columns.' },
    { name: 'defaultCards', type: 'ReadonlyArray<KanbanCardItem>', defaultValue: '[]', description: 'Initial cards in uncontrolled mode.' },
    { name: 'onCardsChange', type: '(cards: KanbanCardItem[]) => void', defaultValue: 'undefined', description: 'Invoked with updated cards whenever a card is moved or added.' },
    { name: 'onCardMove', type: '(cardId: string, fromColumnId: string, toColumnId: string) => void', defaultValue: 'undefined', description: 'Invoked when a card transitions to another valid column.' },
    { name: 'onCardAdd', type: '(columnId: string, title: string) => void', defaultValue: 'undefined', description: 'Invoked when a non-empty card title is submitted via Quick Add.' },
    { name: 'onCardSelect', type: '(card: KanbanCardItem) => void', defaultValue: 'undefined', description: 'Invoked when a card title is clicked or activated via keyboard.' },
    { name: 'allowQuickAdd', type: 'boolean', defaultValue: 'true', description: 'Toggles the recessed inline Quick Add form at the base of each column.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<KanbanBoard\n  columns={[\n    { id: 'todo', title: 'Backlog' },\n    { id: 'doing', title: 'In Progress', wipLimit: 2 },\n    { id: 'done', title: 'Shipped' },\n  ]}\n  defaultCards={[\n    { id: 'k1', columnId: 'todo', title: 'Calibrate refraction curve', assignee: 'Ava', priority: 'high', tags: ['optics'] },\n  ]}\n/>`,
  ],
};
