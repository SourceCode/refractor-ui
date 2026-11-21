export const docs = {
  name: 'MemoryPersonaInspector',
  displayName: 'Memory & Persona Inspector',
  group: 'AI Context, Memory & Configuration',
  category: 'ai-context-memory',
  keywords: [
    'memory',
    'persona',
    'inspector',
    'facts',
    'preferences',
    'rules',
    'context',
    'forget',
    'drawer',
    'agent',
    'ai',
  ],
  usage: {
    description:
      'Optical-glass inline panel or slide-over drawer for inspecting, filtering, adding, inline-editing, and forgetting persistent AI agent memories categorized into Facts, Preferences, and Rules.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Surface stored agent memories transparently so users can inspect, edit, or forget individual facts, preferences, and standing rules at any time.',
      },
      {
        guidance: true,
        description:
          'Use mode="drawer" with controlled open/onOpenChange when launching the inspector from a chat header or settings button, and mode="inline" inside dedicated settings pages.',
      },
      {
        guidance: false,
        description:
          'Persist blank memory edits or expose raw HTML inside memory content; MemoryPersonaInspector renders all memory text literally and ignores whitespace-only edits or additions.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Region & Modal Drawer Landmarks',
        criterion: '1.3.1 Info and Relationships & 2.1.1 Keyboard',
        requirement: 'role="region" in inline mode, role="dialog" aria-modal="true" in drawer mode with Escape/backdrop/Close dismissal',
        description:
          'Provides clear landmark semantics in both embedded and drawer presentations while protecting in-progress inline edits when Escape is pressed.',
      },
      {
        name: 'Filter Toggle Pills & IME-Safe Inline Editing',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'aria-pressed on category filter pills, unique Edit/Forget button labels per memory, and !e.nativeEvent.isComposing guards on Enter',
        description:
          'Announces active filter state and per-item actions clearly for assistive technologies and prevents CJK/IME composition commits from triggering premature saves.',
      },
    ],
  },
  props: [
    {
      name: 'memories',
      type: 'AgentMemoryItem[]',
      defaultValue: 'undefined',
      description: 'Controlled list of stored agent memories.',
    },
    {
      name: 'defaultMemories',
      type: 'AgentMemoryItem[]',
      defaultValue: '[]',
      description: 'Initial list of memories when operating in uncontrolled mode.',
    },
    {
      name: 'onMemoriesChange',
      type: '(items: AgentMemoryItem[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever memories are added, edited, or forgotten.',
    },
    {
      name: 'mode',
      type: "'inline' | 'drawer'",
      defaultValue: "'inline'",
      description: 'Renders as an embedded optical-glass card or a right-anchored modal slide-over drawer.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled open state when mode is "drawer".',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial open state in uncontrolled drawer mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when drawer visibility changes via Escape, backdrop click, or close button.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Memory & Persona'",
      description: 'Heading rendered at the top of the inspector panel.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Hides Edit, Forget, and Add Memory controls for audit or read-only inspection views.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<MemoryPersonaInspector\n  defaultMemories={[\n    { id: 'm1', category: 'fact', content: 'Primary stack is React 19 and TypeScript 5.', updatedAt: '2h ago' },\n    { id: 'm2', category: 'preference', content: 'Prefer concise diffs with strict typing.', updatedAt: '1d ago' },\n    { id: 'm3', category: 'rule', content: 'Never introduce any or unknown types.', updatedAt: '3d ago' },\n  ]}\n  onMemoriesChange={(items) => console.warn('Memories:', items.length)}\n/>`,
  ],
};
