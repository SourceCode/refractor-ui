export const docs = {
  name: 'MergedWindowTabBar',
  displayName: 'Merged Window Tab Bar',
  group: 'Window Anatomy & Controls',
  category: 'window-anatomy-controls',
  keywords: [
    'window',
    'tab-bar',
    'merged-tabs',
    'titlebar',
    'chrome',
    'tear-off',
    'detach',
    'merge-back',
    'reorder',
    'drag-and-drop',
    'browser-tabs',
    'desktop-os',
  ],
  usage: {
    description:
      'Browser-style merged window tab strip integrated directly into an optical-glass window titlebar inside a sculpted `prism-slab` frame. Combines semantic window chrome controls (`--prism-error-main`, `--prism-warning-main`, `--prism-success-main`), a horizontally scrollable `role="tablist"` with unsaved dirty indicators (`--prism-primary-main`), per-tab detach and close actions, collision-safe `+ New Tab` creation, HTML5 drag-and-drop and `Alt+ArrowLeft`/`Alt+ArrowRight` keyboard reordering, IME-safe roving tab switching (`ArrowLeft`/`ArrowRight`/`Home`/`End`), an interactive `Detached Windows` tear-off/merge-back shelf, a compact active tab preview pane (or `role="status"` empty state), and an `aria-live="polite"` status bar.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `MergedWindowTabBar` for multi-document optical workspaces, studio editors, and desktop-class shells where users merge documents into a single titlebar and tear tabs off into standalone windows.',
      },
      {
        guidance: true,
        description:
          'Wire `onTabsChange`, `onSelectTab`, and `onTearOffTab` in controlled workspaces so detached tabs can spawn native floating windows or sync across split panes while preserving clean keyboard reordering.',
      },
      {
        guidance: false,
        description:
          'Do not rely solely on pointer drag-and-drop for tab ordering; keep tabs focusable so keyboard users can always reorder tabs with `Alt+ArrowLeft` / `Alt+ArrowRight` and switch tabs with arrow keys.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Tablist, Roving Tabindex & Keyboard Reordering',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'role="tablist" with aria-label="Merged window tabs", role="tab" with aria-selected and aria-controls linked to role="tabpanel", roving tabIndex, IME-safe ArrowLeft/ArrowRight/Home/End navigation, and Alt+ArrowLeft/Alt+ArrowRight keyboard reordering',
        description:
          'Provides full keyboard parity with pointer dragging and tab switching while guarding against IME composition commits and separating detach/close action buttons cleanly from tab buttons.',
      },
      {
        name: 'Live Status Telemetry & Keyboard-Only Optical Focus Rings',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'All interactive controls use :focus-visible (`prism-focus-ring`), semantic --prism-* tokens, disabled cursor/hover guards, an aria-live="polite" status bar for tear-off/merge/reorder updates, and a role="status" empty state when all tabs are closed',
        description:
          'Ensures screen-reader users receive polite confirmation when detaching, merging back, reordering, opening, or closing tabs without flashing focus outlines on pointer clicks.',
      },
    ],
  },
  props: [
    {
      name: 'tabs',
      type: 'ReadonlyArray<MergedWindowTabItem>',
      defaultValue: 'undefined',
      description:
        'Controlled ordered list of merged window tabs (`{ id, title, subtitle?, dirty?, closable? }`). Pass `[]` to display the `role="status"` empty state.',
    },
    {
      name: 'defaultTabs',
      type: 'ReadonlyArray<MergedWindowTabItem>',
      defaultValue: "3 default studio tabs (DesignSystem.fig dirty, TokenEngine.ts, ReleaseNotes.md)",
      description:
        'Initial ordered list of window tabs when operating in uncontrolled mode.',
    },
    {
      name: 'activeTabId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active window tab identifier.',
    },
    {
      name: 'defaultActiveTabId',
      type: 'string',
      defaultValue: 'First tab id',
      description:
        'Initial active tab identifier when operating in uncontrolled mode.',
    },
    {
      name: 'onSelectTab',
      type: '(tabId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when the active tab changes via click, keyboard navigation, creation, close fallback, or merge-back.',
    },
    {
      name: 'onTabsChange',
      type: '(nextTabs: ReadonlyArray<MergedWindowTabItem>) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the updated tab array whenever tabs are added, closed, reordered, torn off, or merged back.',
    },
    {
      name: 'onTearOffTab',
      type: '(tab: MergedWindowTabItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the detached `MergedWindowTabItem` when a tab is torn off into the Detached Windows tray.',
    },
    {
      name: 'onAddTab',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Optional custom callback invoked when the `+ New Tab` button is pressed; when omitted, appends a collision-safe untitled tab automatically.',
    },
    {
      name: 'onWindowAction',
      type: "(action: 'close' | 'minimize' | 'maximize') => void",
      defaultValue: 'undefined',
      description:
        'Callback fired when leading window chrome buttons (`Close window`, `Minimize window`, `Maximize window`) are activated.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all window chrome buttons, tab selection, drag-and-drop and keyboard reordering, tear-off, merge-back, tab closing, and new tab creation.',
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
    `<MergedWindowTabBar\n  onTearOffTab={(tab) => console.warn('Detached:', tab.title)}\n  onWindowAction={(action) => console.warn('Window action:', action)}\n/>`,
    `<MergedWindowTabBar\n  tabs={[\n    { id: 'design', title: 'DesignSystem.fig', subtitle: 'Canvas · v2.4', dirty: true },\n    { id: 'engine', title: 'TokenEngine.ts', subtitle: 'packages/core/src/theme', closable: false },\n  ]}\n  activeTabId="design"\n  onSelectTab={(id) => { void id; }}\n  onTabsChange={(next) => { void next; }}\n/>`,
  ],
};

export default docs;
