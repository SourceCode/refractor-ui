export const docs = {
  name: 'VisualQueryBuilder',
  displayName: 'Visual Query Builder',
  group: 'Forms & Inputs',
  category: 'forms-inputs',
  keywords: [
    'query',
    'builder',
    'ast',
    'filter',
    'boolean',
    'and',
    'or',
    'rules',
    'groups',
    'predicate',
  ],
  usage: {
    description:
      'Recursive optical glass boolean query builder that produces immutable AND/OR QueryGroupNode ASTs with type-aware operators, nested prism-slab logical groups bounded by maxDepth, IME-safe inputs, prototype-safe field key guards, and a live expression + JSON AST preview without eval().',
    bestPractices: [
      {
        guidance: true,
        description:
          'Define explicit QueryFieldSpec types (text, number, date, select) so operator dropdowns and value controls adapt automatically when switching fields.',
      },
      {
        guidance: true,
        description:
          'Keep maxDepth between 1 and 3 for most end-user query workflows to prevent overly complex nested expressions.',
      },
      {
        guidance: false,
        description:
          'Pass formatted query expressions into eval() or Function(); interpret the structured QueryGroupNode AST directly in your data layer.',
      },
    ],
    accessibility: [
      {
        name: 'Grouped logical regions & accessible control labels',
        criterion: '1.3.1 Info and Relationships & 2.1.1 Keyboard',
        requirement: 'role="group" per logical group, aria-pressed combinator pills, keyboard-only prism-focus-ring',
        description:
          'Nested groups expose depth-scoped group roles, combinator pills report aria-pressed, disabled depth-limit controls communicate disabled state without hover lift, and every select/input exposes explicit aria-label text.',
      },
    ],
  },
  props: [
    {
      name: 'fields',
      type: 'ReadonlyArray<QueryFieldSpec>',
      defaultValue: 'required',
      description: 'Queryable field definitions with key, label, type, and optional select options.',
    },
    {
      name: 'value',
      type: 'QueryGroupNode',
      defaultValue: 'undefined',
      description: 'Controlled root query AST group node.',
    },
    {
      name: 'defaultValue',
      type: 'QueryGroupNode',
      defaultValue: 'undefined',
      description: 'Initial uncontrolled root query AST group node.',
    },
    {
      name: 'onChange',
      type: '(root: QueryGroupNode) => void',
      defaultValue: 'undefined',
      description: 'Called with the updated immutable QueryGroupNode AST on every change.',
    },
    {
      name: 'maxDepth',
      type: 'number',
      defaultValue: '3',
      description: 'Maximum nested group depth, clamped safely between 1 and 4.',
    },
    {
      name: 'showPreview',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays the recessed live expression and JSON AST preview footer.',
    },
  ],
  examples: [
    `<VisualQueryBuilder\n  fields={[\n    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Paused', 'Archived'] },\n    { key: 'created', label: 'Created', type: 'date' },\n    { key: 'budget', label: 'Budget', type: 'number' },\n  ]}\n  maxDepth={3}\n  onChange={(ast) => runQuery(ast)}\n/>`,
  ],
};
