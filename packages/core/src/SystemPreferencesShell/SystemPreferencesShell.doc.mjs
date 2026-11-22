export const docs = {
  name: 'SystemPreferencesShell',
  displayName: 'System Preferences Shell',
  group: 'Desktop Surfaces & Native System Dialogs',
  category: 'desktop-surfaces-dialogs',
  keywords: [
    'system-preferences',
    'settings',
    'preferences-shell',
    'control-panel',
    'os-settings',
    'two-pane',
    'sidebar',
    'search',
    'toggle',
    'slider',
    'select',
    'segmented',
    'desktop-surfaces',
  ],
  usage: {
    description:
      'Two-pane optical-glass OS configuration shell (`prism-slab`) pairing a searchable icon category sidebar (`<nav aria-label="System preference categories">`) on the left with grouped `prism-crystal` preference cards on the right. Stacks cleanly on narrow mobile viewports (`flex-col md:flex-row` with `min-w-0`) and ships with a rich 6-section default catalog (`General`, `Appearance & Glass`, `Displays`, `Sound`, `Network`, `Privacy & Security`) spanning `toggle`, `select`, `slider`, and `segmented` controls. Performs linear-time, zero-regex literal search across section headers and individual setting labels, descriptions, and groups with `splitLiteralHighlight` match highlighting, roving keyboard navigation (`ArrowUp`/`ArrowDown`/`Home`/`End`), prototype-safe `Map` value storage, clamped numeric sliders, per-section modified tracking with `Reset Section Defaults`, and a polite `aria-live="polite"` status banner.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass controlled `values` as a `ReadonlyMap<string, PreferenceValue>` (or entry tuples) paired with `onSettingChange` and `onResetSection` when syncing preferences with a backend profile or OS daemon.',
      },
      {
        guidance: true,
        description:
          'Group related settings via `setting.group` so each category automatically partitions into scannable `prism-crystal` cards with clear visual hierarchy across desktop and mobile viewports.',
      },
      {
        guidance: false,
        description:
          'Store setting overrides in plain JavaScript objects indexed by arbitrary keys; `SystemPreferencesShell` uses prototype-safe `Map` storage internally and clamps slider bounds against `NaN`/`Infinity` values automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Searchable Category Navigation & Roving Keyboard Focus',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 1.3.1 Info and Relationships',
        requirement:
          'Renders the category sidebar as `<nav aria-label="System preference categories">` with an explicitly labeled `<input type="search" aria-label="Search settings">`, IME-safe `Escape` clearing, roving `ArrowUp`/`ArrowDown`/`Home`/`End` navigation across visible category buttons with `aria-current="page"`, and keyboard-only `.prism-focus-ring` indicators',
        description:
          'Enables rapid keyboard traversal through system preference categories without disrupting CJK/IME composition or displaying distracting focus rings on pointer clicks.',
      },
      {
        name: 'Accessible Preference Controls & Polite Live Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Uses `role="switch"` + `aria-checked` for toggles, `aria-pressed` button groups for segmented selectors, labeled native `<select>` and `<input type="range">` controls linked via `htmlFor`/`aria-describedby`, and announces preference edits and section resets inside an `aria-live="polite"` status banner',
        description:
          'Communicates control semantics, descriptions, modified counts, and live update confirmations clearly to assistive technologies.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'System Settings'",
      description:
        'Heading displayed in the top optical header bar and used as the default region `aria-label`.',
    },
    {
      name: 'sections',
      type: 'ReadonlyArray<PreferenceSection>',
      defaultValue:
        '6 default OS categories (General, Appearance & Glass, Displays, Sound, Network, Privacy & Security)',
      description:
        'Catalog of preference categories and grouped setting definitions; duplicate section IDs are deduplicated safely.',
    },
    {
      name: 'activeSectionId',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Controlled active category identifier; pair with `onActiveSectionChange`.',
    },
    {
      name: 'defaultActiveSectionId',
      type: 'string',
      defaultValue: 'First section id',
      description:
        'Initial active category identifier used in uncontrolled mode when `activeSectionId` is omitted.',
    },
    {
      name: 'values',
      type: 'ReadonlyMap<string, PreferenceValue> | ReadonlyArray<readonly [string, PreferenceValue]>',
      defaultValue: 'undefined',
      description:
        'Controlled prototype-safe preference values overriding setting defaults.',
    },
    {
      name: 'defaultValues',
      type: 'ReadonlyMap<string, PreferenceValue> | ReadonlyArray<readonly [string, PreferenceValue]>',
      defaultValue: 'undefined',
      description:
        'Initial uncontrolled preference overrides applied on mount.',
    },
    {
      name: 'onActiveSectionChange',
      type: '(sectionId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user switches to a different preference category.',
    },
    {
      name: 'onSettingChange',
      type: '(settingId: string, value: PreferenceValue, sectionId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the setting identifier, sanitized value, and owning section identifier whenever a control changes.',
    },
    {
      name: 'onResetSection',
      type: '(sectionId: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when `Reset Section Defaults` is activated for the currently displayed category.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables search input, category navigation, all preference controls, and section reset.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical inline style overrides merged onto the root `prism-slab`.',
    },
  ],
  examples: [
    `<SystemPreferencesShell\n  onSettingChange={(id, value, sectionId) => console.warn(sectionId, id, value)}\n  onResetSection={(sectionId) => console.warn('Reset section:', sectionId)}\n/>`,
    `<SystemPreferencesShell\n  title="Workstation Preferences"\n  defaultActiveSectionId="appearance"\n  defaultValues={[['appearance.blur-radius', 28]]}\n/>`,
  ],
};

export default docs;
