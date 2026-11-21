export const docs = {
  name: 'SlideOverSheet',
  displayName: 'Slide-Over Panel / Bottom Sheet',
  group: 'Overlays & Popups',
  category: 'overlays-popups',
  keywords: ['sheet', 'drawer', 'slide-over', 'bottom-sheet', 'panel', 'overlay'],
  usage: {
    description:
      'Edge-anchored optical glass modal drawer supporting right-hand inspector panels and mobile-friendly bottom sheets with scrollable content and Escape dismissal.',
    bestPractices: [
      { guidance: true, description: 'Use mode="right" for detail inspectors, filters, and property editors on desktop.' },
      { guidance: true, description: 'Use mode="bottom" for compact mobile-friendly action sheets and drawers.' },
      { guidance: false, description: 'Use SlideOverSheet for urgent destructive confirmations; prefer ModalDialog instead.' },
    ],
    accessibility: [
      {
        name: 'Dialog landmark & Escape dismissal',
        criterion: '2.1.2 No Keyboard Trap & 4.1.2 Name, Role, Value',
        requirement: 'role="dialog", aria-modal="true", aria-labelledby, Escape close',
        description: 'Links the panel title and optional subtitle via generated IDs and supports dismissal via Escape, backdrop click, close icon, or Done button.',
      },
    ],
  },
  props: [
    { name: 'open', type: 'boolean', defaultValue: 'required', description: 'Controls whether the slide-over sheet is visible.' },
    { name: 'mode', type: "'right' | 'bottom'", defaultValue: "'right'", description: 'Edge anchoring layout mode.' },
    { name: 'title', type: 'string', defaultValue: 'required', description: 'Sheet header heading.' },
    { name: 'subtitle', type: 'string', defaultValue: 'undefined', description: 'Optional subtitle linked via aria-describedby.' },
    { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'Scrollable content inside the sheet.' },
    { name: 'onClose', type: '() => void', defaultValue: 'required', description: 'Dismissal callback.' },
  ],
  examples: [
    `<SlideOverSheet\n  open={open}\n  mode="right"\n  title="Token Inspector"\n  subtitle="Optical glass variables"\n  onClose={() => setOpen(false)}\n>\n  <p>Adjust blur radius and specular highlight intensity.</p>\n</SlideOverSheet>`,
  ],
};
