export const docs = {
  name: 'Pagination',
  displayName: 'Pagination',
  group: 'Navigation',
  category: 'navigation',
  keywords: ['pagination', 'pages', 'pager', 'navigation', 'list'],
  usage: {
    description:
      'Circular optical crystal page controls with tabular monospace numerals, primary refractive active highlight, and boundary-clamped previous/next navigation.',
    bestPractices: [
      { guidance: true, description: 'Use Pagination when datasets are divided into discrete indexed pages.' },
      { guidance: true, description: 'Disable previous/next buttons cleanly at the first and last pages.' },
      { guidance: false, description: 'Render hundreds of unbounded page buttons without summarizing ranges.' },
    ],
    accessibility: [
      {
        name: 'Pagination landmark & active page',
        criterion: '1.3.1 Info and Relationships',
        requirement: 'nav[aria-label="Pagination"] with aria-current="page"',
        description: 'Each page button has an explicit aria-label and sets aria-current="page" on the active page.',
      },
    ],
  },
  props: [
    { name: 'currentPage', type: 'number', defaultValue: 'required', description: 'Current 1-based page index (safely clamped).' },
    { name: 'totalPages', type: 'number', defaultValue: 'required', description: 'Total number of pages.' },
    { name: 'onPageChange', type: '(page: number) => void', defaultValue: 'required', description: 'Callback invoked with the selected page number.' },
  ],
  examples: [
    `<Pagination currentPage={page} totalPages={5} onPageChange={setPage} />`,
  ],
};
