export const docs = {
  name: 'ArchiveInspector',
  displayName: 'Archive Inspector',
  group: 'File Management & Operations',
  category: 'file-management-operations',
  keywords: [
    'archive',
    'zip',
    'tar',
    '7z',
    'extract',
    'compression',
    'zip-slip',
    'path-traversal',
    'security',
    'inspector',
    'preview',
    'file-management',
    'virtual-directory',
  ],
  usage: {
    description:
      'Virtual optical-glass archive inspector inside a sculpted `prism-slab` for browsing, previewing, and selectively extracting `.zip`, `.tar`, and `.7z` archives. Enforces built-in Zip-Slip and path-traversal protection (`isSafeArchiveEntryPath`) that flags unsafe paths (`..` segments, leading `/` or `\\`, Windows drive letters, null bytes) with a `--prism-error-main` `Unsafe Path` warning badge, disables their selection checkboxes, and excludes them from both `Select All Safe` and `Extract All Safe`. Includes live sanitized compression ratio telemetry (`XX% saved`), linear-time IME-safe path search, a responsive virtual directory `<table>` directly inside `overflow-x-auto`, a recessed literal-text Virtual Entry Preview Pane, and polite `aria-live="polite"` extraction announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide `onExtract` to handle selectively extracted or full safe archive entry arrays while retaining client-side Zip-Slip filtering as defense-in-depth alongside server-side path canonicalization.',
      },
      {
        guidance: true,
        description:
          'Supply `previewText` for readable manifest, shader, token, or text files so operators can verify archive contents inside the recessed literal-text Virtual Entry Preview Pane before extracting.',
      },
      {
        guidance: false,
        description:
          'Pass raw HTML expecting rich rendering in `path` or `previewText`; `ArchiveInspector` renders every archive path and text preview strictly as literal React text without `dangerouslySetInnerHTML`.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Region, Responsive Directory Table & Select-All-Safe Tri-State Checkbox',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Root `role="region"` linked via `aria-labelledby`, semantic `<table>` (`<thead>` + `<tbody>`) wrapped directly in `overflow-x-auto`, tri-state `Select All Safe` checkbox, descriptive row checkbox labels, and `aria-pressed` state on entry `Preview` triggers',
        description:
          'Communicates virtual archive hierarchy, safe/unsafe extractability, selection totals, and active preview context clearly to assistive technologies.',
      },
      {
        name: 'IME-Safe Search Clear, Keyboard-Only Focus Rings & Polite Extraction Announcements',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'IME-safe `Escape` search clearing (`!e.nativeEvent.isComposing`), keyboard-only `.prism-focus-ring` indicators, `disabled:cursor-not-allowed` states, `role="status"` empty states, and `aria-live="polite"` extraction status announcements',
        description:
          'Ensures fluid keyboard operation without interrupting CJK composition while announcing selection, preview, and extraction outcomes unobtrusively.',
      },
    ],
  },
  props: [
    {
      name: 'archiveName',
      type: 'string',
      defaultValue: "'refractor-optical-assets.zip'",
      description: 'Archive filename rendered in the header and referenced in extraction announcements.',
    },
    {
      name: 'format',
      type: "'zip' | 'tar' | '7z'",
      defaultValue: "'zip'",
      description: 'Archive container format controlling the header extension pill (`.zip`, `.tar`, or `.7z`).',
    },
    {
      name: 'entries',
      type: 'ReadonlyArray<ArchiveVirtualEntry>',
      defaultValue: '6 realistic optical-glass virtual archive entries',
      description:
        'Virtual archive directory entries. Pass `[]` to display the `role="status"` empty archive state.',
    },
    {
      name: 'onExtract',
      type: '(entries: ReadonlyArray<ArchiveVirtualEntry>) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when `Extract Selected (N)` or `Extract All Safe` is pressed; receives strictly safe entries verified by `isSafeArchiveEntryPath`.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables path filtering, selection checkboxes, entry previews, and extraction actions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ArchiveInspector />`,
    `<ArchiveInspector\n  archiveName="release-bundle.tar"\n  format="tar"\n  onExtract={(safeEntries) => console.warn('Extracting safe entries:', safeEntries.length)}\n/>`,
  ],
};

export default docs;
