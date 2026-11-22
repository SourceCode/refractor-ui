export const docs = {
  name: 'BlockTransformHandle',
  displayName: 'Block Transform Handle',
  group: 'Document, Knowledge & Spreadsheet Tools',
  category: 'document-knowledge-spreadsheet',
  keywords: [
    'block',
    'transform',
    'handle',
    'grip',
    'editor',
    'notion',
    'document',
    'turn-into',
    'reorder',
    'drag-and-drop',
    'checklist',
    'callout',
    'knowledge',
    'optical-glass',
  ],
  usage: {
    description:
      'Optical-glass document block editor canvas built on a prism-slab shell where every document block exposes a left-hand GripVertical Block Handle button opening a viewport-clamped transformer menu. Supports in-place Turn Into conversions across Paragraph, Heading, Callout, Checklist, Quote, and Code blocks, Move Up / Move Down and native drag-and-drop reordering, collision-safe Duplicate, Delete, interactive checklist completion checkboxes, Escape and outside-click dismissal, and aria-live="polite" announcements for every mutation using strictly --prism-* design tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide stable unique block IDs in controlled mode so focus restoration, drag-and-drop transfers, and open menu anchors stay predictable across updates.',
      },
      {
        guidance: true,
        description:
          'Keep both pointer drag-and-drop and the Move Up / Move Down menu items (plus Alt+ArrowUp / Alt+ArrowDown on the handle) available so keyboard-only and touch users have full reorder parity.',
      },
      {
        guidance: false,
        description:
          'Hide block handles behind hover-only opacity on touch devices or omit polite status feedback when transforming, duplicating, or deleting blocks.',
      },
    ],
    accessibility: [
      {
        name: 'Menu Trigger Semantics & Keyboard Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each block handle exposes aria-label="Block actions for ...", aria-haspopup="menu", aria-expanded, and aria-controls, opens a role="menu" with ArrowUp/ArrowDown/Home/End navigation, IME-safe key handling, and Escape/outside-click dismissal restoring focus to the block handle',
        description:
          'Also supports Alt+ArrowUp and Alt+ArrowDown directly on the block grip for rapid keyboard reordering without opening the menu, and renders keyboard-only focus rings via prism-focus-ring (:focus-visible).',
      },
      {
        name: 'Polite Mutation Announcements & Empty-State Fallback',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Announces every block transformation, reorder, duplicate, delete, and checklist toggle inside an aria-live="polite" status region, and displays a clean role="status" empty state when blocks is []',
        description:
          'Screen reader users receive immediate confirmation of structural document edits and remaining block counts without stealing focus.',
      },
    ],
  },
  props: [
    {
      name: 'blocks',
      type: 'ReadonlyArray<DocumentBlockItem>',
      defaultValue: 'undefined',
      description:
        'Controlled ordered list of document blocks. Passing an explicit empty array ([]) renders a clean role="status" empty state.',
    },
    {
      name: 'defaultBlocks',
      type: 'ReadonlyArray<DocumentBlockItem>',
      defaultValue: '4 default document blocks (heading, paragraph, callout, checklist)',
      description:
        'Initial blocks when operating in uncontrolled mode. Passing [] initializes directly in the role="status" empty state.',
    },
    {
      name: 'onChange',
      type: '(blocks: DocumentBlockItem[]) => void',
      defaultValue: 'undefined',
      description:
        'Invoked with the updated DocumentBlockItem[] array whenever a block is transformed, reordered, duplicated, deleted, or has its checklist state toggled.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Block Editor Canvas'",
      description:
        'Canvas title displayed in the optical header and used as the default accessible label for the region.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables block handles, menu transforms, drag-and-drop reordering, and checklist toggles, displaying a read-only badge.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<BlockTransformHandle\n  title="Product Architecture Spec"\n  onChange={(nextBlocks) => console.warn(nextBlocks.length)}\n/>`,
    `<BlockTransformHandle\n  defaultBlocks={[\n    { id: 'intro', kind: 'heading', text: 'Release Readiness Checklist' },\n    { id: 'note', kind: 'callout', text: 'Verify all optical themes before tagging.' },\n    { id: 'todo', kind: 'checklist', text: 'Run strict ESLint and coverage gate', checked: false },\n  ]}\n/>`,
  ],
};

export default docs;
