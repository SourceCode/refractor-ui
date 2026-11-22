export const docs = {
  name: 'DocumentPageViewer',
  displayName: 'Document Page Viewer',
  group: 'Document, Knowledge & Spreadsheet Tools',
  category: 'document-knowledge-spreadsheet',
  keywords: [
    'document',
    'pdf',
    'page-viewer',
    'reader',
    'thumbnails',
    'zoom',
    'pagination',
    'search',
    'highlight',
    'knowledge',
    'specification',
    'optical-paper',
  ],
  usage: {
    description:
      'Optical-glass multi-page PDF and technical document reader combining a sculpted prism-slab toolbar, collapsible miniature page-thumbnail rail, IME-safe numeric page jump navigation, 75%–150% zoom presets with step controls, literal <mark> text search highlighting with cross-page match jumping, and polite aria-live status announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled page and onPageChange props when synchronizing the active document page with URL hash fragments, side outlines, or review comment threads.',
      },
      {
        guidance: true,
        description:
          'Set defaultShowThumbnails={false} inside narrow split panes or embedded knowledge cards so the optical paper-glass reading canvas starts with maximum width while remaining expandable.',
      },
      {
        guidance: false,
        description:
          'Pass raw HTML markup expecting rich rendering inside DocumentViewerPage paragraphs; all document text and search highlights render strictly as literal React nodes to guarantee XSS safety.',
      },
    ],
    accessibility: [
      {
        name: 'Toolbar Controls, Toggle States & IME-Safe Page Jump',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes aria-pressed on the thumbnails rail toggle and zoom presets, aria-current="page" on the active thumbnail, explicit aria-label values on numeric page jump and search inputs, and guards Enter key commits against IME composition',
        description:
          'Ensures full keyboard operability and predictable screen-reader announcements without hijacking CJK or accented character composition.',
      },
      {
        name: 'Polite Live Readouts & Safe Literal Search Highlighting',
        criterion: '4.1.3 Status Messages & 1.4.3 Contrast',
        requirement:
          'Announces active page, zoom scale, and live search match counts via aria-live="polite", styles <mark> highlights exclusively with semantic --prism-* tokens, and renders a clean role="status" empty state when pages is []',
        description:
          'Keeps assistive technologies synchronized as users step through pages or jump across literal search matches while preserving WCAG contrast in light and dark cascade themes.',
      },
    ],
  },
  props: [
    {
      name: 'pages',
      type: 'ReadonlyArray<DocumentViewerPage>',
      defaultValue: '4 sample Refractor Optical Spec v2 technical pages',
      description:
        'Ordered pages rendered in the thumbnail rail and optical paper-glass reading canvas. Omit for realistic default pages, or pass [] for a clean role="status" empty state.',
    },
    {
      name: 'page',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled 1-based active page number clamped safely to 1..N.',
    },
    {
      name: 'defaultPage',
      type: 'number',
      defaultValue: '1',
      description: 'Initial 1-based active page number when operating in uncontrolled mode.',
    },
    {
      name: 'onPageChange',
      type: '(pageNumber: number) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the clamped 1-based page number when navigating via Prev/Next, numeric page jump, thumbnails, or cross-page search jump.',
    },
    {
      name: 'defaultZoomPct',
      type: '75 | 100 | 125 | 150',
      defaultValue: '100',
      description: 'Initial optical reading canvas zoom percentage preset.',
    },
    {
      name: 'defaultShowThumbnails',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial open/collapsed state of the miniature page-thumbnail rail.',
    },
    {
      name: 'documentTitle',
      type: 'string',
      defaultValue: "'Refractor_Optical_Spec_v2.pdf'",
      description: 'Document filename or title displayed in the sculpted reader toolbar.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<DocumentPageViewer\n  documentTitle="Refractor_Optical_Spec_v2.pdf"\n  onPageChange={(nextPage) => console.warn('Page:', nextPage)}\n/>`,
    `<DocumentPageViewer\n  defaultPage={2}\n  defaultZoomPct={125}\n  defaultShowThumbnails={false}\n/>`,
  ],
};

export default docs;
