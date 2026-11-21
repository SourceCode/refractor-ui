export const docs = {
  name: 'CommandPalette',
  displayName: 'Command Palette',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['command', 'palette', 'cmd+k', 'search', 'launcher', 'dialog', 'shortcuts'],
  usage: {
    description:
      'Keyboard-first modal command launcher with frosted recessed search input, IME-safe Enter selection, arrow navigation, group filtering, and Escape dismissal.',
    bestPractices: [
      { guidance: true, description: 'Bind Cmd+K / Ctrl+K globally in the application shell to toggle CommandPalette.' },
      { guidance: true, description: 'Group commands logically (e.g., Navigation, Theme, Actions) and display concise shortcut hints.' },
      { guidance: false, description: 'Perform destructive commands without a follow-up confirmation dialog.' },
    ],
    accessibility: [
      {
        name: 'Modal command dialog & IME safety',
        criterion: '2.1.1 Keyboard & 2.1.2 No Keyboard Trap',
        requirement: 'Escape dismissal, arrow selection, and IME-safe Enter handling',
        description: 'Guards Enter execution with !e.nativeEvent.isComposing, autofocuses the search input on open, and closes cleanly on Escape or backdrop click.',
      },
    ],
  },
  props: [
    { name: 'open', type: 'boolean', defaultValue: 'required', description: 'Whether the command palette dialog is visible.' },
    { name: 'onClose', type: '() => void', defaultValue: 'required', description: 'Invoked when Escape is pressed, backdrop is clicked, or an item is chosen.' },
    { name: 'items', type: 'CommandPaletteItem[]', defaultValue: 'required', description: 'List of command entries with id, label, group, optional shortcut, and onSelect.' },
  ],
  examples: [
    `<CommandPalette\n  open={open}\n  onClose={() => setOpen(false)}\n  items={[\n    { id: 'dark', label: 'Toggle Dark Mode', group: 'Theme', shortcut: '⌘D', onSelect: toggleDark },\n  ]}\n/>`,
  ],
};
