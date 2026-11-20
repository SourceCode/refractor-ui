export const docs = {
  name: 'TopNavBar',
  displayName: 'Top Navigation Bar',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['navbar', 'navigation', 'header', 'top-bar', 'brand', 'search'],
  usage: {
    description:
      'Floating optical crystal navigation bar containing a brand mark, primary destination links, an optional quick-search trigger, and a user avatar badge.',
    bestPractices: [
      { guidance: true, description: 'Limit top-level links to 4-6 high-frequency destinations.' },
      { guidance: true, description: 'Connect onSearchClick to CommandPalette for instant keyboard discovery.' },
      { guidance: false, description: 'Overload the capsule bar with multi-line labels or nested dropdown trees.' },
    ],
    accessibility: [
      {
        name: 'Navigation landmark',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'Semantic <nav> with active page indication',
        description: 'Renders a labeled <nav> landmark and marks the selected link with aria-current="page".',
      },
    ],
  },
  props: [
    { name: 'brand', type: 'string', defaultValue: 'required', description: 'Brand label displayed on the leading edge.' },
    { name: 'links', type: 'NavLinkItem[]', defaultValue: 'required', description: 'List of navigation items with id and label.' },
    { name: 'activeLinkId', type: 'string', defaultValue: 'required', description: 'ID of the currently active link.' },
    { name: 'onSelectLink', type: '(id: string) => void', defaultValue: 'required', description: 'Called when a navigation link is clicked.' },
    { name: 'onSearchClick', type: '() => void', defaultValue: 'undefined', description: 'Optional handler that displays the quick-search button.' },
    { name: 'userInitials', type: 'string', defaultValue: "'CV'", description: 'Short user initials rendered in the trailing cobalt avatar pill.' },
  ],
  examples: [
    `<TopNavBar\n  brand="Refractor"\n  links={[{ id: 'overview', label: 'Overview' }, { id: 'tokens', label: 'Tokens' }]}\n  activeLinkId="overview"\n  onSelectLink={setActive}\n  onSearchClick={() => setPaletteOpen(true)}\n/>`,
  ],
};
