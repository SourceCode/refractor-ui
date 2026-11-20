export const docs = {
  name: 'PrismTabs',
  displayName: 'Prism Tabs',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['tabs', 'tablist', 'tabpanel', 'navigation', 'views', 'specimen'],
  usage: {
    description:
      'Optical crystal pill tab bar with recessed frosted well active indicator, optional cycle specimen pill, and WAI-ARIA keyboard navigation.',
    bestPractices: [
      { guidance: true, description: 'Use PrismTabs to switch between closely related views within the same context.' },
      { guidance: true, description: 'Support ArrowLeft, ArrowRight, Home, and End keyboard navigation.' },
      { guidance: false, description: 'Use tabs for multi-step linear wizards; prefer Stepper instead.' },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Tabs pattern',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'tablist / tab / tabpanel linkage and arrow navigation',
        description: 'Links each tab to its tabpanel via aria-controls and aria-labelledby and handles ArrowLeft/ArrowRight/Home/End keys.',
      },
    ],
  },
  props: [
    { name: 'tabs', type: 'TabItem[]', defaultValue: 'required', description: 'Array of tabs with id, label, and optional panel content.' },
    { name: 'activeTabId', type: 'string', defaultValue: 'required', description: 'ID of the currently active tab.' },
    { name: 'onChange', type: '(id: string) => void', defaultValue: 'required', description: 'Callback triggered when a tab is activated.' },
    { name: 'showSpecimenPill', type: 'boolean', defaultValue: 'false', description: 'Displays the optical crystal "Tabs" quick-cycle button.' },
  ],
  examples: [
    `<PrismTabs\n  tabs={[\n    { id: 'design', label: 'Design', content: <p>Optical tokens</p> },\n    { id: 'code', label: 'Code', content: <p>React 19 API</p> },\n  ]}\n  activeTabId="design"\n  onChange={setActiveTab}\n  showSpecimenPill\n/>`,
  ],
};
