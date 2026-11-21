export const docs = {
  name: 'SwipeableActionRow',
  displayName: 'Swipeable Optical Action Row',
  group: 'Mobile, Touch & System Utilities',
  category: 'mobile-utilities',
  keywords: [
    'swipe',
    'swipeable',
    'row',
    'list',
    'touch',
    'gesture',
    'mobile',
    'actions',
    'archive',
    'delete',
  ],
  usage: {
    description:
      'Optical-glass swipeable list row featuring a draggable crystal foreground card over recessed left and right semantic action trays, smooth clamped travel, threshold snapping, compact reveal toggle buttons, and full keyboard navigation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Limit each tray to 1-3 concise actions (such as Pin, Archive, or Delete) so revealed capsules fit comfortably on narrow mobile viewports.',
      },
      {
        guidance: true,
        description:
          'Use semantic tones (emerald for confirm/complete, amber for snooze/archive, rose for destructive delete) so action intent is recognizable at a glance.',
      },
      {
        guidance: false,
        description:
          'Hide critical workflows solely behind touch swipes; SwipeableActionRow automatically provides compact reveal toggles and ArrowLeft/ArrowRight/Escape shortcuts for desktop and keyboard users.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard & Non-Touch Parity',
        criterion: '2.1.1 Keyboard & 2.5.1 Pointer Gestures',
        requirement:
          'ArrowRight/ArrowLeft reveal or dismiss trays, Escape closes open trays, and compact reveal toggle buttons expose aria-expanded state',
        description:
          'Guarantees every swipe action can be reached and triggered using standard keyboard controls or single-pointer clicks without requiring drag gestures.',
      },
      {
        name: 'Focus Management & IME Safety',
        criterion: '2.4.3 Focus Order & 2.4.7 Focus Visible',
        requirement:
          'Hidden tray buttons are removed from tab order until revealed; all interactive controls use keyboard-only prism-focus-ring and IME-safe key handlers',
        description:
          'Prevents offscreen tray actions from trapping focus while closed and ignores keyboard shortcuts during active IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'required',
      description: 'Foreground content rendered inside the draggable optical crystal row card.',
    },
    {
      name: 'leftActions',
      type: 'SwipeActionItem[]',
      defaultValue: '[]',
      description: 'Action items revealed in the left tray when swiping right.',
    },
    {
      name: 'rightActions',
      type: 'SwipeActionItem[]',
      defaultValue: '[]',
      description: 'Action items revealed in the right tray when swiping left.',
    },
    {
      name: 'threshold',
      type: 'number',
      defaultValue: '56',
      description: 'Drag distance in pixels required to snap a tray open, clamped between 24 and 160.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer dragging, keyboard reveal controls, and all action triggers.',
    },
    {
      name: 'onRevealChange',
      type: '(side: SwipeRevealSide) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the revealed side changes between none, left, and right.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<SwipeableActionRow\n  leftActions={[{ id: 'pin', label: 'Pin', tone: 'emerald', onTrigger: handlePin }]}\n  rightActions={[\n    { id: 'archive', label: 'Archive', tone: 'amber', onTrigger: handleArchive },\n    { id: 'delete', label: 'Delete', tone: 'rose', onTrigger: handleDelete },\n  ]}\n  onRevealChange={(side) => console.warn(side)}\n>\n  <div>\n    <p className="text-sm font-semibold">Optical Dispersion Release Notes</p>\n    <p className="text-xs opacity-75">Updated 2 minutes ago</p>\n  </div>\n</SwipeableActionRow>`,
  ],
};
