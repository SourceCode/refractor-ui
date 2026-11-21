export const docs = {
  name: 'SidebarDrawer',
  displayName: 'Sidebar Navigation Drawer',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['sidebar', 'drawer', 'navigation', 'rail', 'collapsible', 'aside'],
  usage: {
    description:
      'Collapsible optical glass navigation drawer with icon support, tabular counter badges, and refractive active-state highlighting.',
    bestPractices: [
      { guidance: true, description: 'Provide icons for every item when collapsible is enabled so compact mode remains recognizable.' },
      { guidance: true, description: 'Use short 1-2 word item labels to prevent truncation at w-64.' },
      { guidance: false, description: 'Nest deep sub-trees inside the compact rail without disclosure controls.' },
    ],
    accessibility: [
      {
        name: 'Complementary landmark & collapsed labels',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Accessible names preserved when collapsed',
        description: 'Sets aria-label and title on each item in collapsed mode and exposes aria-expanded on the collapse toggle.',
      },
    ],
  },
  props: [
    { name: 'title', type: 'string', defaultValue: 'required', description: 'Section heading and accessible name for the drawer.' },
    { name: 'items', type: 'DrawerNavItem[]', defaultValue: 'required', description: 'Navigation entries with id, label, optional icon, and optional count.' },
    { name: 'activeId', type: 'string', defaultValue: 'required', description: 'ID of the currently selected item.' },
    { name: 'onSelect', type: '(id: string) => void', defaultValue: 'required', description: 'Called with the item ID on click.' },
    { name: 'collapsible', type: 'boolean', defaultValue: 'true', description: 'Shows the collapse/expand toggle button.' },
  ],
  examples: [
    `<SidebarDrawer\n  title="Workspace"\n  items={[{ id: 'inbox', label: 'Inbox', count: 12 }, { id: 'archive', label: 'Archive' }]}\n  activeId="inbox"\n  onSelect={setActiveId}\n/>`,
  ],
};
