export const docs = {
  name: 'BottomNavigationBar',
  displayName: 'Bottom Navigation Bar',
  group: 'Mobile, Touch & System Utilities',
  category: 'mobile-utilities',
  keywords: [
    'bottom-nav',
    'navigation',
    'mobile',
    'tab-bar',
    'thumb',
    'touch',
    'badge',
    'fixed',
    'app-bar',
  ],
  usage: {
    description:
      'Thumb-friendly optical-glass mobile bottom navigation bar built on a prism-slab surface with an equal-column grid, 48px minimum touch targets, active crystal pill highlight with aria-current="page", clamped unread badge counters (99+), controllable active state, and ArrowLeft/ArrowRight/Home/End keyboard navigation across enabled destinations.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Limit bottom navigation destinations to 3–5 concise single-word labels paired with clear icons for effortless one-handed thumb reach.',
      },
      {
        guidance: true,
        description:
          'Use mode="fixed" on mobile app shells to anchor the refractive slab to the bottom viewport edge, and mode="inline" inside preview frames, cards, or responsive sheets.',
      },
      {
        guidance: false,
        description:
          'Crowd destination labels with long sentences or display negative/non-finite badge numbers; BottomNavigationBar automatically suppresses non-positive counts and clamps counts above 99 to 99+.',
      },
    ],
    accessibility: [
      {
        name: 'Navigation Landmark & Active Page State',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'Semantic <nav aria-label> landmark with aria-current="page" on the active destination button',
        description:
          'Identifies the bar as a named navigation landmark and marks the currently active destination button with aria-current="page" while preventing disabled destinations from being activated.',
      },
      {
        name: 'Keyboard Traversal & Touch Target Ergonomics',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 2.5.8 Target Size',
        requirement: 'ArrowLeft/ArrowRight/Home/End navigation skipping disabled items, IME-safe guard, 48px targets, and prism-focus-ring',
        description:
          'Supports wrapping Left/Right and Home/End keyboard navigation across enabled items, ignores IME composing keystrokes, maintains >= 48px touch height, and uses keyboard-only :focus-visible outlines.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'BottomNavItem[]',
      defaultValue: 'required',
      description: 'Ordered destinations with id, label, optional icon, optional badgeCount, and optional disabled flag.',
    },
    {
      name: 'activeId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled active destination identifier.',
    },
    {
      name: 'defaultActiveId',
      type: 'string',
      defaultValue: 'first non-disabled item id',
      description: 'Initial active destination id when operating in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(id: string, item: BottomNavItem) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected destination id and full BottomNavItem descriptor.',
    },
    {
      name: 'mode',
      type: "'fixed' | 'inline'",
      defaultValue: "'inline'",
      description: 'Pins the bar to the viewport bottom (fixed bottom-0 inset-x-0 z-40) or renders an inline rounded optical slab.',
    },
    {
      name: 'ariaLabel',
      type: 'string',
      defaultValue: "'Bottom navigation'",
      description: 'Accessible label assigned to the <nav> landmark element.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and optical style overrides.',
    },
  ],
  examples: [
    `<BottomNavigationBar\n  items={[\n    { id: 'home', label: 'Home' },\n    { id: 'inbox', label: 'Inbox', badgeCount: 4 },\n    { id: 'alerts', label: 'Alerts', badgeCount: 128 },\n    { id: 'profile', label: 'Profile' },\n  ]}\n  defaultActiveId="home"\n  onChange={(id) => setActiveTab(id)}\n/>`,
  ],
};
