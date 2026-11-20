export const docs = {
  name: 'Breadcrumbs',
  displayName: 'Breadcrumbs',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['breadcrumbs', 'trail', 'hierarchy', 'path', 'navigation'],
  usage: {
    description:
      'Optical crystal breadcrumb capsule displaying the current page hierarchy with clickable ancestor links and semantic aria-current="page" markup.',
    bestPractices: [
      { guidance: true, description: 'Use Breadcrumbs in hierarchical views with two or more levels of depth.' },
      { guidance: true, description: 'Render the terminal crumb as non-interactive text marked with aria-current="page".' },
      { guidance: false, description: 'Use Breadcrumbs to replace primary site navigation.' },
    ],
    accessibility: [
      {
        name: 'Breadcrumb landmark',
        criterion: '2.4.8 Location',
        requirement: 'nav[aria-label="Breadcrumb"] + ordered list',
        description: 'Wraps crumbs inside an ordered list within a Breadcrumb navigation landmark and hides slash separators from assistive technology.',
      },
    ],
  },
  props: [
    { name: 'items', type: 'BreadcrumbCrumb[]', defaultValue: 'required', description: 'Ordered array of breadcrumb items with id and label.' },
    { name: 'onNavigate', type: '(id: string) => void', defaultValue: 'required', description: 'Called with the clicked ancestor crumb ID.' },
  ],
  examples: [
    `<Breadcrumbs\n  items={[{ id: 'home', label: 'Home' }, { id: 'kit', label: 'UI Kit' }, { id: 'glass', label: 'Optics' }]}\n  onNavigate={navigateTo}\n/>`,
  ],
};
