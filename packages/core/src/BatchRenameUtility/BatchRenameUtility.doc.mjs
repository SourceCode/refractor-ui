export const docs = {
  name: 'BatchRenameUtility',
  displayName: 'Batch Rename Utility',
  group: 'File Management & Operations',
  category: 'file-management-operations',
  keywords: [
    'batch',
    'rename',
    'bulk-rename',
    'files',
    'file-management',
    'find-replace',
    'case-formatting',
    'numbering',
    'prefix',
    'suffix',
    'extension',
    'preview',
    'conflicts',
    'utility',
  ],
  usage: {
    description:
      'Multi-file optical-glass batch rename workbench inside a sculpted `prism-slab` with live `Before -> After` preview table. Combines linear-time literal Find & Replace (with optional `Match Case`, zero `new RegExp(userInput)` ReDoS risk), curated deterministic Pattern Presets (`None`, `Replace Spaces with Hyphens`, `Remove [Bracket] Tags`, `Extract Leading Numeric Tag`), six Case Formatting modes (`Preserve`, `lowercase`, `UPPERCASE`, `Title Case`, `kebab-case`, `snake_case`), Sequential Numbering with Prefix, Suffix, sanitized Start Index, Zero Pad (`1..5`), and `Preserve Extension`. Detects duplicate target collisions via ES `Map` (immune to `__proto__` filenames) and rejects empty or path-traversal (`/`, `\\`, `..`) target names before enabling `Apply Rename`.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass your real selected filenames via `files` and handle `onApplyRename(rows)` to execute atomic rename operations using the pre-validated `before` and `after` pairs.',
      },
      {
        guidance: true,
        description:
          'Keep `Preserve Extension` enabled when applying aggressive transformations like `kebab-case`, `snake_case`, or `Extract Leading Numeric Tag` so file extensions remain intact.',
      },
      {
        guidance: false,
        description:
          'Compile user find patterns into `new RegExp(...)` or track filename collisions in plain `{}` objects; `BatchRenameUtility` uses linear-time `indexOf` splitting/joining and ES `Map` counting to stay immune to ReDoS and prototype pollution.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Region, Labeled Form Controls & Responsive Preview Table',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'role="region" linked via aria-labelledby, explicit <label> associations for all inputs and checkboxes, aria-label="Pattern preset" and aria-label="Case formatting" selectors, and a structured <table> with <thead> and <tbody> wrapped directly inside overflow-x-auto',
        description:
          'Presents transformation rules and live Before -> After previews with clear programmatic labels, semantic row headers, and explicit status badges.',
      },
      {
        name: 'IME-Safe Inputs, Keyboard-Only Focus Rings & Polite Live Confirmation',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards Enter handling with !e.nativeEvent.isComposing, applies .prism-focus-ring (:focus-visible) and disabled:cursor-not-allowed across all interactive controls, and announces applied renames and rule resets in an aria-live="polite" region',
        description:
          'Prevents disrupting active IME composition sessions while announcing rename outcomes without stealing keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Batch Rename Utility'",
      description: 'Visible workbench heading linked to the root region via `aria-labelledby`.',
    },
    {
      name: 'files',
      type: 'ReadonlyArray<string>',
      defaultValue: '5 realistic studio filenames spanning spaces, [Bracket] tags, leading digits, and extensions',
      description: 'Input filenames to transform and preview. Pass `[]` for an empty queue state.',
    },
    {
      name: 'onApplyRename',
      type: '(rows: ReadonlyArray<BatchRenamePreviewRow>) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user clicks `Apply Rename` (enabled only when at least one row changed with zero duplicate conflicts and zero invalid names).',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all rename controls, reset button, and apply trigger.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<BatchRenameUtility />`,
    `<BatchRenameUtility\n  title="Asset Batch Renamer"\n  files={['001 [RAW] Hero Shot.png', '002 [RAW] Detail View.png']}\n  onApplyRename={(rows) => console.warn(rows)}\n/>`,
  ],
};

export default docs;
