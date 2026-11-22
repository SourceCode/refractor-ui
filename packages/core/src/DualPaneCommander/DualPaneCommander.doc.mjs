export const docs = {
  name: 'DualPaneCommander',
  displayName: 'Dual-Pane Commander',
  group: 'File Explorer Navigation & Views',
  category: 'file-explorer-navigation',
  keywords: [
    'dual-pane',
    'commander',
    'file-manager',
    'file-explorer',
    'copy',
    'move',
    'compare',
    'sync',
    'swap',
    'diff',
    'side-by-side',
    'directory',
    'backup',
    'navigation',
  ],
  usage: {
    description:
      'Optical-glass side-by-side dual-pane file commander inside a sculpted `prism-slab` separated by a central cross-folder action strip (`Copy`, `Move`, `Compare`, `Sync Newer`, `Swap Panes`). Each pane highlights its active optical ring (`--prism-primary-main`), exposes `Select All` and `Clear` controls, formats byte sizes cleanly (`B`/`KB`/`MB`/`GB`), computes prototype-safe `Map`-backed side-by-side diff badges (`Only Here`, `Newer`, `Match`, `Older`) when Compare mode is active, and announces operations via a polite `aria-live="polite"` status bar.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide distinct `modifiedTimestamp` values in milliseconds alongside human-readable `modifiedLabel` strings so `Compare` and `Sync Newer` highlight and synchronize fresher revisions accurately.',
      },
      {
        guidance: true,
        description:
          'Attach an `onAction` callback to persist or audit cross-folder `copy`, `move`, `compare`, `sync`, and `swap` operations against remote storage or local filesystems.',
      },
      {
        guidance: false,
        description:
          'Rely on HTML formatting inside file names or directory paths; `DualPaneCommander` renders all filenames and paths strictly as literal React text and indexes files exclusively with `Map` to stay immune to `__proto__` or XSS payloads.',
      },
    ],
    accessibility: [
      {
        name: 'Dual Multiselect Listboxes & Cross-Folder Action Toolbar',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'role="region" linked via aria-labelledby, paired role="listbox" aria-multiselectable="true" panes with role="option" aria-selected rows, role="toolbar" cross-folder action strip, and aria-pressed on active pane selectors and Compare toggle',
        description:
          'Communicates active pane context, multi-item selection state, directional transfer controls, and Compare toggle state cleanly to assistive technologies.',
      },
      {
        name: 'IME-Safe Keyboard Selection, Keyboard-Only Focus Rings & Polite Live Status',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'IME-safe Space and Enter row selection (!e.nativeEvent.isComposing), keyboard-only .prism-focus-ring outlines, disabled:cursor-not-allowed cues, and aria-live="polite" status bar summarizing cross-folder transfers',
        description:
          'Ensures fluid keyboard operation without hijacking active IME composition and announces Copy, Move, Compare, Sync Newer, and Swap Panes outcomes unobtrusively.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Dual-Pane Commander'",
      description: 'Visible commander heading displayed in the `prism-slab` header.',
    },
    {
      name: 'leftPath',
      type: 'string',
      defaultValue: "'/Volumes/StudioNVMe/Masters'",
      description: 'Initial directory path displayed inside the left pane badge.',
    },
    {
      name: 'rightPath',
      type: 'string',
      defaultValue: "'/Volumes/NAS-Backup/Masters'",
      description: 'Initial directory path displayed inside the right pane badge.',
    },
    {
      name: 'defaultLeftItems',
      type: 'ReadonlyArray<CommanderFileEntry>',
      defaultValue: '5 realistic studio master entries (shared, newer, older, and unique)',
      description:
        'Initial directory entries rendered in the left pane. Pass `[]` for an empty directory state.',
    },
    {
      name: 'defaultRightItems',
      type: 'ReadonlyArray<CommanderFileEntry>',
      defaultValue: '5 realistic NAS backup entries (shared, older, newer, and unique)',
      description:
        'Initial directory entries rendered in the right pane. Pass `[]` for an empty directory state.',
    },
    {
      name: 'onAction',
      type: '(action: CommanderActionKind, sourceSide: CommanderPaneSide, affectedNames: ReadonlyArray<string>) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked after Copy, Move, Compare, Sync Newer, or Swap Panes completes with the action kind, active source pane, and affected filenames (or swapped pane paths for `swap`).',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all pane selection toggles and cross-folder toolbar actions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<DualPaneCommander />`,
    `<DualPaneCommander\n  title="Release Asset Sync"\n  leftPath="/Volumes/StudioNVMe/Masters"\n  rightPath="/Volumes/NAS-Backup/Masters"\n  onAction={(action, side, names) => console.warn(action, side, names)}\n/>`,
  ],
};

export default docs;
