export const docs = {
  name: 'SlashCommandMenu',
  displayName: 'Slash Command Menu',
  group: 'Document, Knowledge & Spreadsheet Tools',
  category: 'document-knowledge-spreadsheet',
  keywords: [
    'slash',
    'command',
    'menu',
    'editor',
    'document',
    'notion',
    'blocks',
    'insert',
    'markdown',
    'callout',
    'table',
    'ai',
    'knowledge',
  ],
  usage: {
    description:
      'Sculpted optical-glass document block editor with an inline cursor-anchored floating prism-slab slash command palette (role="listbox"). Typing `/` opens and live-filters categorized block commands across Blocks, Media, Data, and AI with literal match highlighting via splitLiteralHighlight, full ArrowDown/ArrowUp/Enter/Escape keyboard navigation with IME safety, clean role="status" zero-match feedback, and an aria-live="polite" insertion confirmation pill.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide `keywords` and concise `shortcut` hints on custom `SlashCommandOption` entries so writers can trigger blocks rapidly with partial queries like `/tab`, `/call`, or `/ai`.',
      },
      {
        guidance: true,
        description:
          'Keep `defaultMenuOpen={true}` in interactive playgrounds or onboarding tours so users immediately see the available block palette, and set `defaultMenuOpen={false}` inside dense production editors until `/` is typed.',
      },
      {
        guidance: false,
        description:
          'Build raw RegExp matchers from user slash queries or inject raw HTML into option labels; SlashCommandMenu relies strictly on splitLiteralHighlight for safe, ReDoS-free literal highlighting.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Listbox Combobox Pattern & IME-Safe Keyboard Insertion',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Links the Document editor textarea via aria-expanded, aria-haspopup="listbox", aria-controls, and aria-activedescendant to the floating role="listbox" with grouped role="group" / role="option" rows',
        description:
          'Supports circular ArrowDown/ArrowUp highlighting, guards Enter with !event.nativeEvent.isComposing so CJK/IME commits are never hijacked, cleanly replaces the `/query` trigger on insert, and dismisses via Escape or outside click.',
      },
      {
        name: 'Polite Insertion Feedback & Zero-Match Status Announcements',
        criterion: '4.1.3 Status Messages & 1.4.10 Reflow',
        requirement:
          'Announces inserted block names through an aria-live="polite" feedback pill, exposes role="status" when filtering yields no matches, and clamps palette width via w-[min(22rem,calc(100vw-2rem))]',
        description:
          'Guarantees screen reader feedback for every insertion or empty search state while preventing horizontal overflow across mobile, tablet, and desktop viewports.',
      },
    ],
  },
  props: [
    {
      name: 'commands',
      type: 'ReadonlyArray<SlashCommandOption>',
      defaultValue:
        '8 default commands (Heading 2, Callout Admonition, Checklist, Code Block, Optical Divider, Embed Link, Data Table, AI Summary)',
      description:
        'Searchable block insertion commands organized into Blocks, Media, Data, and AI groups.',
    },
    {
      name: 'defaultValue',
      type: 'string',
      defaultValue: "''",
      description:
        'Initial document text rendered inside the editor textarea (placeholder reads "Type / to insert a block...").',
    },
    {
      name: 'defaultMenuOpen',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls whether the floating slash palette is open on initial mount.',
    },
    {
      name: 'onInsertCommand',
      type: '(command: SlashCommandOption, nextDocumentText: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever a command is inserted via Enter or click, receiving the chosen option and the resulting document string.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Document Editor with Slash Commands'",
      description:
        'Editor header title and accessible aria-label for the region container.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<SlashCommandMenu\n  onInsertCommand={(command, nextText) => console.warn(command.id, nextText)}\n/>`,
    `<SlashCommandMenu\n  title="Release Notes Draft"\n  defaultValue="# v2.0 Launch Notes\\n\\n"\n  defaultMenuOpen={false}\n  onInsertCommand={(command, nextText) => handleDocumentUpdate(command, nextText)}\n/>`,
  ],
};

export default docs;
