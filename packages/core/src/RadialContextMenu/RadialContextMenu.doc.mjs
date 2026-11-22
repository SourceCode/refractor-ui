export const docs = {
  name: 'RadialContextMenu',
  displayName: 'Radial Context Menu',
  group: 'Desktop OS & Windowing Metaphors',
  category: 'desktop-os-windowing',
  keywords: [
    'radial',
    'context-menu',
    'pie-menu',
    'wheel',
    'actions',
    'desktop',
    'windowing',
    'right-click',
    'creative-tool',
    'shortcuts',
    'optical-glass',
  ],
  usage: {
    description:
      'Optical-glass radial pie context menu built on a prism-slab shell with a 280×280 interactive SVG circular action wheel that divides 360° into equal annular pie sectors shaded strictly with --prism-* semantic tokens around a central crystal hub displaying the hovered or focused action label and shortcut. Supports both pointer-blooming trigger mode (right-click, click, or Space/Enter) and persistent inline stage mode for effortless docs exploration, with full ArrowLeft/ArrowRight spin navigation skipping disabled slices, IME-safe Enter/Space activation, Escape dismissal, and an aria-live="polite" last-selected action status pill.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use 4 to 8 concise creative actions with distinct semantic tones (such as Duplicate, Transform, Group, Inspect, Export, and Delete) so directional muscle memory develops quickly.',
      },
      {
        guidance: true,
        description:
          'Use mode="inline" inside documentation playgrounds, toolbars, or inspector drawers where keeping the optical wheel immediately explorable improves discoverability, and mode="trigger" over canvas workspaces.',
      },
      {
        guidance: false,
        description:
          'Rely exclusively on right-click discovery without keyboard parity; RadialContextMenu always supports Space/Enter surface activation, ArrowLeft/ArrowRight spin navigation, and Escape dismissal.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Radial Menu Semantics & Active Descendant Tracking',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="menu" with aria-activedescendant tracking the focused role="menuitem" annular sector, skips aria-disabled="true" slices cleanly on ArrowLeft/ArrowRight, and supports IME-safe Enter/Space activation and Escape dismissal',
        description:
          'Guards every keyboard handler with !e.nativeEvent.isComposing, returns focus cleanly to the trigger surface on dismissal, and ensures keyboard-only focus outlines via prism-focus-ring (:focus-visible).',
      },
      {
        name: 'Polite Action Status Announcements & Empty-State Fallback',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Announces the most recently executed action and shortcut inside an aria-live="polite" pill and renders a clean role="status" empty state when actions is explicitly []',
        description:
          'Ensures assistive technologies receive immediate confirmation of radial selections without stealing focus or relying solely on visual hub highlights.',
      },
    ],
  },
  props: [
    {
      name: 'actions',
      type: 'ReadonlyArray<RadialMenuAction>',
      defaultValue: '6 default creative actions (Duplicate, Transform, Group, Inspect, Export, Delete)',
      description:
        'Radial actions divided equally across 360°. Passing an explicit empty array ([]) renders a clean role="status" empty state.',
    },
    {
      name: 'mode',
      type: "RadialMenuDisplayMode ('trigger' | 'inline')",
      defaultValue: "'trigger'",
      description:
        "Presentation mode: 'trigger' blooms the radial wheel from pointer coordinates on click/right-click (or centered on Space/Enter); 'inline' keeps the wheel persistently open inside the optical stage.",
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled open visibility of the radial wheel.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: "true in 'inline', false in 'trigger'",
      description: 'Initial open state when operating in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Invoked whenever the radial wheel opens or dismisses.',
    },
    {
      name: 'onSelectAction',
      type: '(action: RadialMenuAction) => void',
      defaultValue: 'undefined',
      description: 'Invoked with the chosen RadialMenuAction when an enabled sector is clicked or activated via Enter/Space.',
    },
    {
      name: 'surfaceLabel',
      type: 'string',
      defaultValue: "'Right-click or press Space for Radial Menu'",
      description: 'Prompt copy displayed inside the interactive trigger surface.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<RadialContextMenu\n  mode="inline"\n  onSelectAction={(action) => console.warn(action.id)}\n/>`,
    `<RadialContextMenu\n  mode="trigger"\n  surfaceLabel="Right-click canvas or press Space for Radial Tools"\n  onSelectAction={(action) => console.warn(action.label)}\n/>`,
  ],
};

export default docs;
