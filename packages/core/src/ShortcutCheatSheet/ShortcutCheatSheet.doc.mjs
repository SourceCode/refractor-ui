export const docs = {
  name: 'ShortcutCheatSheet',
  displayName: 'Shortcut Cheat Sheet',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'shortcuts',
    'cheat-sheet',
    'hotkeys',
    'keybindings',
    'keyboard',
    'kbd',
    'keycap',
    'modal',
    'help',
    'reference',
    'accessibility',
  ],
  usage: {
    description:
      'Optical-glass keyboard shortcut reference supporting both a crystal-triggered modal overlay (`Shortcuts · ?`) and an embedded inline prism-slab surface. Includes global IME-safe `?` toggle detection (guarded against typing inside inputs, textareas, selects, and contentEditable regions), instant literal search filtering across category titles, action labels, descriptions, and key tokens, a responsive 2-column category grid, embossed crystal `<kbd>` keycaps, optional shortcut row activation, and accessible empty search status states.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use the default `mode="modal"` in workspace toolbars or help menus so power users can press `?` anywhere outside text fields to inspect hotkeys and press `Escape` or `?` to return immediately.',
      },
      {
        guidance: true,
        description:
          'Use `mode="inline"` inside documentation playgrounds, onboarding panels, or settings tabs where the categorized keycap grid should remain continuously visible without a backdrop overlay.',
      },
      {
        guidance: false,
        description:
          'Mount multiple `mode="modal"` ShortcutCheatSheet instances simultaneously with `enableQuestionMarkHotkey={true}` on the same page; disable `enableQuestionMarkHotkey` on secondary instances to avoid duplicate toggles.',
      },
    ],
    accessibility: [
      {
        name: 'Modal Dialog Semantics & Focus Restoration',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Trigger declares aria-haspopup="dialog" and aria-expanded; modal surface exposes role="dialog", aria-modal="true", aria-labelledby, moves focus into the dialog on open, dismisses via Escape/backdrop/Close, and restores focus to the trigger on close',
        description:
          'Ensures screen reader and keyboard-only users experience predictable dialog boundaries and focus return without getting trapped.',
      },
      {
        name: 'IME-Safe Global `?` Hotkey & Search Filtering',
        criterion: '2.1.4 Character Key Shortcuts & 4.1.3 Status Messages',
        requirement:
          'Guards global `?` and search input keydown handlers with !isComposing, skips editable elements (input, textarea, select, contentEditable), labels the search input explicitly, and announces zero-match states via role="status"',
        description:
          'Prevents accidental modal toggles while typing in forms or composing CJK/IME characters, while keeping live search results accessible.',
      },
    ],
  },
  props: [
    {
      name: 'groups',
      type: 'ReadonlyArray<ShortcutCategoryGroup>',
      defaultValue: '3 default groups (Navigation, Editing & Canvas, Playback & View)',
      description:
        'Categorized hotkey groups rendered in the responsive 2-column grid.',
    },
    {
      name: 'mode',
      type: "'modal' | 'inline'",
      defaultValue: "'modal'",
      description:
        'Switches between a crystal trigger + backdrop dialog overlay (`modal`) and an embedded prism-slab card (`inline`).',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled visibility state when `mode="modal"`.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial uncontrolled visibility state when `mode="modal"`.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the modal opens or closes via trigger, `?` hotkey, Escape, backdrop click, or Close button.',
    },
    {
      name: 'enableQuestionMarkHotkey',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Enables pressing `?` outside editable fields to open or toggle modal mode.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Keyboard Shortcuts'",
      description: 'Heading displayed at the top of the cheat sheet surface.',
    },
    {
      name: 'onSelectShortcut',
      type: '(shortcut: ShortcutBinding) => void',
      defaultValue: 'undefined',
      description:
        'Optional callback fired when a shortcut row is clicked or triggered with Enter from the search input.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<ShortcutCheatSheet />`,
    `<ShortcutCheatSheet mode="inline" title="Studio Hotkeys" onSelectShortcut={(shortcut) => { void shortcut; }} />`,
    `<ShortcutCheatSheet defaultOpen title="Editor Shortcuts" enableQuestionMarkHotkey />`,
  ],
};

export default docs;
