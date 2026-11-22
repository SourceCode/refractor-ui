export const docs = {
  name: 'QuickLookPreviewer',
  displayName: 'Quick Look Previewer',
  group: 'Desktop OS & Windowing Metaphors',
  category: 'desktop-os-windowing',
  keywords: [
    'quick-look',
    'previewer',
    'spacebar',
    'finder',
    'file-preview',
    'modal',
    'inline',
    'image',
    'pdf',
    'audio',
    'waveform',
    'code',
    'desktop-os',
    'windowing',
    'inspector',
  ],
  usage: {
    description:
      'Desktop OS-inspired Quick Look optical-glass file previewer supporting Spacebar-triggered modal inspection and embedded inline preview modes, tailored renderers for images (with Fit / 100% zoom and strict URL sanitization), multi-line PDF document pages, SVG audio amplitude waveforms with Play/Pause state, and syntax-framed literal code blocks, complete with Prev/Next keyboard navigation, Open in Editor callback, and an aria-live="polite" metadata strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use mode="modal" inside file browsers, asset libraries, and desktop-style workspaces so users can select a card and press Spacebar to preview instantaneously without leaving their current context.',
      },
      {
        guidance: true,
        description:
          'Use mode="inline" inside side inspectors, documentation canvases, or split master-detail panes when the preview slab should stay mounted continuously.',
      },
      {
        guidance: false,
        description:
          'Inject unescaped HTML into code or PDF content fields; QuickLookPreviewer renders all text as literal React nodes and sanitizes image URLs via sanitizeUrl(src, true) automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Spacebar Launch, Modal Dialog Semantics & Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Spacebar on a focused file card opens the centered role="dialog" aria-modal="true" prism-slab; ArrowLeft/ArrowRight cycle files; Escape or Space dismisses the overlay; IME composition is guarded across all keydown handlers',
        description:
          'Delivers authentic macOS Quick Look keyboard ergonomics while preserving keyboard-only focus rings and preventing accidental Spacebar dismissal when operating buttons inside the dialog.',
      },
      {
        name: 'Polite Live Metadata Announcements & Safe Empty State',
        criterion: '4.1.3 Status Messages & 1.1.1 Non-text Content',
        requirement:
          'Announces active file metadata (name · sizeLabel · dimensionsOrMeta) via aria-live="polite", exposes aria-pressed on Fit/100% zoom and audio Play/Pause toggles, and renders a role="status" empty state when files is []',
        description:
          'Keeps screen reader users informed as they step across heterogeneous assets without interrupting focus or rendering unsafe media URLs.',
      },
    ],
  },
  props: [
    {
      name: 'files',
      type: 'ReadonlyArray<QuickLookFileItem>',
      defaultValue: '4 sample assets (Prism_Poster.png, Architecture_Spec.pdf, Ambient_Master.wav, themeEngine.ts)',
      description:
        'Ordered list of file items to inspect. Omit for built-in sample assets, or pass [] to render a clean role="status" empty state.',
    },
    {
      name: 'activeIndex',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled zero-based index of the active file item.',
    },
    {
      name: 'defaultActiveIndex',
      type: 'number',
      defaultValue: '0',
      description: 'Initial zero-based file index when used in uncontrolled mode.',
    },
    {
      name: 'mode',
      type: "'modal' | 'inline'",
      defaultValue: "'modal'",
      description:
        'Modal mode displays a tactile file strip with Spacebar/click modal launch; inline mode renders the optical Quick Look slab directly.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled visibility state of the modal dialog overlay.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial modal visibility state when used in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the Quick Look modal opens or closes.',
    },
    {
      name: 'onActiveIndexChange',
      type: '(index: number, file: QuickLookFileItem) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the new clamped index and file item when navigation occurs.',
    },
    {
      name: 'onOpenExternal',
      type: '(file: QuickLookFileItem) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the user triggers the Open in Editor action.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<QuickLookPreviewer\n  mode="modal"\n  onOpenExternal={(file) => console.warn('Open in editor:', file.name)}\n/>`,
    `<QuickLookPreviewer\n  mode="inline"\n  defaultActiveIndex={3}\n  onActiveIndexChange={(idx, file) => console.warn(idx, file.name)}\n/>`,
  ],
};

export default docs;
