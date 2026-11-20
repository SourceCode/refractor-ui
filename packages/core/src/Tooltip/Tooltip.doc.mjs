export const docs = {
  name: 'Tooltip',
  displayName: 'Tooltip',
  group: 'Overlays & Floating Surfaces',
  category: 'overlays',
  keywords: ['tooltip', 'hint', 'hover', 'focus', 'popover', 'caption'],
  usage: {
    description:
      'Optical crystal hover and focus tooltip pill with top or bottom placement, aria-describedby linkage, and WCAG 1.4.13 Escape dismissal.',
    bestPractices: [
      { guidance: true, description: 'Use Tooltip for concise, non-essential supplemental hints or keyboard shortcut labels.' },
      { guidance: true, description: 'Wrap focusable interactive triggers so keyboard users can reveal and dismiss the tooltip.' },
      { guidance: false, description: 'Place interactive buttons, links, or critical error messages inside a Tooltip.' },
    ],
    accessibility: [
      {
        name: 'Hover/focus reveal & Escape dismissal',
        criterion: '1.4.13 Content on Hover or Focus',
        requirement: 'Keyboard focusable reveal and Escape dismissal',
        description: 'Shows on hover and focus, links via aria-describedby, and dismisses when Escape is pressed.',
      },
    ],
  },
  props: [
    { name: 'content', type: 'string', defaultValue: 'required', description: 'Text rendered inside the floating crystal tooltip.' },
    { name: 'placement', type: "'top' | 'bottom'", defaultValue: "'top'", description: 'Vertical position relative to the trigger.' },
    { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'Trigger element wrapped by the tooltip.' },
  ],
  examples: [
    `<Tooltip content="Toggle optical dispersion" placement="top">\n  <button type="button">Inspect</button>\n</Tooltip>`,
  ],
};
