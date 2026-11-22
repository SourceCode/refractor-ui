export const docs = {
  name: 'AppLauncherMenu',
  displayName: 'App Launcher Menu',
  group: 'Menus & Launchers',
  category: 'menus-launchers',
  keywords: [
    'app-launcher',
    'start-menu',
    'launcher',
    'applications',
    'pinned',
    'recent-documents',
    'search',
    'power-controls',
    'desktop-os',
    'menus',
  ],
  usage: {
    description:
      'Categorized optical-glass Application Launcher / Start Menu overlay housed inside a sculpted `prism-slab` surface. Combines a linear-time ReDoS-safe search bar (with IME-safe `Escape` clearing), category filter pills (`Pinned`, `All Apps`, `Design`, `Engineering`, `Utilities` with `aria-pressed`), a responsive `grid-cols-2 sm:grid-cols-4` installed-applications grid with `--prism-*` tinted optical icon glyphs, edition badges, click/Enter launching, and adjacent `Pin <name>` / `Unpin <name>` toggle buttons, a compact Recent Documents feed, and a responsive `flex-wrap` user profile & tactile power control footer (`Lock`, `Sleep`, `Restart`, `Shut Down`) paired with a polite `aria-live="polite"` status banner.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Default to the `Pinned` view with 4–8 high-frequency applications distributed across `design`, `engineering`, and `utilities` so repeat launches require a single click or keystroke.',
      },
      {
        guidance: true,
        description:
          'Provide controlled `apps` paired with `onTogglePin` when persisting user pin customizations to workspace preferences or cloud profiles, or pass `defaultApps` for standalone uncontrolled shells.',
      },
      {
        guidance: false,
        description:
          'Use `AppLauncherMenu` for single-application dropdown commands like File/Edit/View menus; use `AppMenuBar` or `ContextMenuDropdown` for in-app menu hierarchies.',
      },
    ],
    accessibility: [
      {
        name: 'Linear Search, Pressed Category Pills & Distinct Tile Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `<input type="search" aria-label="Search applications and recent files">`, category buttons with `aria-pressed`, non-nested sibling `Launch <name>` and `Pin <name>` / `Unpin <name>` buttons (`aria-pressed={app.pinned}`), and keyboard-only `.prism-focus-ring` focus indicators',
        description:
          'Separates app launching from pinning into distinct accessible sibling controls so keyboard and screen reader users can launch or pin applications reliably without nested interactive elements.',
      },
      {
        name: 'IME-Safe Shortcuts, Empty State & Polite Status Announcements',
        criterion: '2.1.1 Keyboard & 4.1.3 Status Messages',
        requirement:
          'Guards search `Escape` clear and tile/document `Enter`/`Space` activation with `!event.nativeEvent.isComposing`, renders a `role="status"` empty state when filters match 0 apps, and broadcasts launch, pin, recent-file, and power actions through an `aria-live="polite"` footer banner',
        description:
          'Prevents active CJK/IME composition commits from clearing search text or launching apps prematurely while keeping assistive technology synchronized with every state change.',
      },
    ],
  },
  props: [
    {
      name: 'userName',
      type: 'string',
      defaultValue: "'Clara Vance'",
      description:
        'Profile display name shown in the footer along with derived optical initials.',
    },
    {
      name: 'userRole',
      type: 'string',
      defaultValue: "'Principal Designer'",
      description:
        'User role or workspace subtitle rendered below `userName` in the footer.',
    },
    {
      name: 'apps',
      type: 'ReadonlyArray<AppLauncherItem>',
      defaultValue: 'undefined',
      description:
        'Controlled list of installed applications (`{ id, name, category, pinned, badge?, tone? }`). Duplicate IDs are safely deduplicated.',
    },
    {
      name: 'defaultApps',
      type: 'ReadonlyArray<AppLauncherItem>',
      defaultValue: '8 realistic studio apps (4 pinned across design, engineering, utilities)',
      description:
        'Initial uncontrolled list of installed applications when `apps` is not supplied.',
    },
    {
      name: 'recentDocs',
      type: 'ReadonlyArray<AppLauncherRecentDoc>',
      defaultValue: '4 recent studio documents',
      description:
        'Recent document entries (`{ id, title, appName, openedAt }`) filtered live by the top search input.',
    },
    {
      name: 'onLaunchApp',
      type: '(app: AppLauncherItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when an enabled application tile is launched via click or keyboard Enter/Space.',
    },
    {
      name: 'onTogglePin',
      type: '(appId: string, pinned: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the application ID and next pinned boolean when the adjacent Pin/Unpin toggle is clicked.',
    },
    {
      name: 'onOpenRecent',
      type: '(doc: AppLauncherRecentDoc) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when a recent document row is opened via click or keyboard Enter/Space.',
    },
    {
      name: 'onPowerAction',
      type: "(action: 'lock' | 'sleep' | 'restart' | 'shutdown') => void",
      defaultValue: 'undefined',
      description:
        'Callback invoked when one of the footer power controls (`Lock`, `Sleep`, `Restart`, `Shut Down`) is clicked.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables search, category filtering, app launching, pinning, recent document opening, and power actions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical inline style overrides.',
    },
  ],
  examples: [
    `<AppLauncherMenu\n  onLaunchApp={(app) => console.warn('Launched:', app.name)}\n  onTogglePin={(id, pinned) => console.warn('Pin updated:', id, pinned)}\n  onOpenRecent={(doc) => console.warn('Opened:', doc.title)}\n  onPowerAction={(action) => console.warn('Power:', action)}\n/>`,
    `<AppLauncherMenu\n  userName="Devon Takahashi"\n  userRole="Staff Systems Engineer"\n  apps={installedApps}\n  onTogglePin={(id, nextPinned) =>\n    setInstalledApps((prev) =>\n      prev.map((app) => (app.id === id ? { ...app, pinned: nextPinned } : app))\n    )\n  }\n  onLaunchApp={(app) => launchWorkspaceApp(app.id)}\n/>`,
  ],
};

export default docs;
