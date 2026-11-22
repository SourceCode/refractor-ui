export const docs = {
  name: 'FileViewModeBar',
  displayName: 'File View Mode Bar',
  group: 'File Explorer Navigation & Views',
  category: 'file-explorer-navigation',
  keywords: [
    'file-explorer',
    'view-mode',
    'grid',
    'list',
    'columns',
    'gallery',
    'filmstrip',
    'thumbnail',
    'zoom',
    'slider',
    'radiogroup',
    'toolbar',
    'switcher',
    'navigation',
  ],
  usage: {
    description:
      'Sculpted `prism-slab` file explorer view mode switcher and thumbnail zoom bar featuring an accessible `role="radiogroup"` segmented selector (`Icon Grid`, `Compact List`, `Detailed Columns`, `Gallery`) with IME-safe roving `ArrowLeft`/`ArrowRight`/`Home`/`End` keyboard navigation, a `-`/slider/`+` thumbnail zoom cluster with live tabular pixel badge and sanitized bounds, a polite `aria-live="polite"` telemetry status strip, and an optional live multi-mode file preview stage (`showPreviewStage`) supporting zoom-responsive icon grid cards, compact list rows, horizontally scrollable detailed columns table, and a spotlight gallery with clickable zoom-scaled filmstrip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `FileViewModeBar` in file browsers, asset libraries, and media managers to pair view layout switching with smooth thumbnail magnification.',
      },
      {
        guidance: true,
        description:
          'Bind controlled `viewMode` / `onViewModeChange` and `zoomPx` / `onZoomChange` when persisting explorer layout preferences to workspace state or synchronizing external virtualized grids.',
      },
      {
        guidance: false,
        description:
          'Assume inverted or non-finite zoom bounds will crash rendering; `FileViewModeBar` automatically sanitizes `NaN`, `Infinity`, non-positive steps, and inverted `minZoomPx` / `maxZoomPx` values into safe pixel bounds.',
      },
    ],
    accessibility: [
      {
        name: 'Segmented Radio Group with Roving Tabindex & IME-Safe Navigation',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="radiogroup" aria-label="File view mode" with role="radio" aria-checked options, roving tabIndex, ArrowLeft/ArrowRight/Home/End focus management guarded by !event.nativeEvent.isComposing, and keyboard-only .prism-focus-ring outlines',
        description:
          'Lets keyboard users switch between Icon Grid, Compact List, Detailed Columns, and Gallery cleanly in a single tab stop without hijacking IME composition sessions.',
      },
      {
        name: 'Accessible Zoom Controls, Responsive Table & Polite Live Status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'Labels Zoom out (-), native <input type="range" aria-label="Thumbnail zoom size">, and Zoom in (+) with aria-valuemin/max/now/valuetext; wraps detailed columns <table> (with <thead>/<tbody>) directly in overflow-x-auto; announces active mode and pixel size via role="status" aria-live="polite"',
        description:
          'Provides full assistive-technology feedback whenever view layout, thumbnail zoom scale, or spotlight gallery selection changes.',
      },
    ],
  },
  props: [
    {
      name: 'viewMode',
      type: "FileViewModeId ('grid' | 'list' | 'columns' | 'gallery')",
      defaultValue: 'undefined',
      description: 'Controlled active file view mode.',
    },
    {
      name: 'defaultViewMode',
      type: "FileViewModeId ('grid' | 'list' | 'columns' | 'gallery')",
      defaultValue: "'grid'",
      description: 'Initial file view mode when used in uncontrolled mode.',
    },
    {
      name: 'zoomPx',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled thumbnail zoom size in pixels, clamped to sanitized min/max bounds.',
    },
    {
      name: 'defaultZoomPx',
      type: 'number',
      defaultValue: '96',
      description: 'Initial uncontrolled thumbnail zoom size in pixels.',
    },
    {
      name: 'minZoomPx',
      type: 'number',
      defaultValue: '48',
      description: 'Minimum thumbnail zoom size in pixels (sanitized safely against NaN, Infinity, or inverted bounds).',
    },
    {
      name: 'maxZoomPx',
      type: 'number',
      defaultValue: '160',
      description: 'Maximum thumbnail zoom size in pixels (sanitized safely against NaN, Infinity, or inverted bounds).',
    },
    {
      name: 'stepZoomPx',
      type: 'number',
      defaultValue: '8',
      description: 'Zoom increment in pixels used by the range slider and Zoom out / Zoom in buttons.',
    },
    {
      name: 'items',
      type: 'ReadonlyArray<FileViewSampleItem>',
      defaultValue: '6 built-in optical studio assets (image, code, document, audio)',
      description:
        'File items rendered when `showPreviewStage` is enabled. Pass `[]` to display the empty preview state.',
    },
    {
      name: 'showPreviewStage',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'When `true`, mounts the live multi-mode file preview stage synchronized with active view mode and thumbnail zoom.',
    },
    {
      name: 'onViewModeChange',
      type: '(mode: FileViewModeId) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the newly selected `FileViewModeId`.',
    },
    {
      name: 'onZoomChange',
      type: '(zoomPx: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the sanitized and clamped pixel size when zoom changes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables view mode switching, thumbnail zoom controls, and gallery filmstrip selection.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FileViewModeBar\n  defaultViewMode="grid"\n  defaultZoomPx={96}\n  onViewModeChange={(mode) => console.warn('Mode:', mode)}\n  onZoomChange={(px) => console.warn('Zoom:', px)}\n/>`,
    `<FileViewModeBar\n  showPreviewStage\n  defaultViewMode="gallery"\n  defaultZoomPx={112}\n  minZoomPx={48}\n  maxZoomPx={160}\n  stepZoomPx={8}\n/>`,
  ],
};

export default docs;
