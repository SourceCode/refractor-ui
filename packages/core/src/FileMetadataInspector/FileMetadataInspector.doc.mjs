export const docs = {
  name: 'FileMetadataInspector',
  displayName: 'File Metadata Inspector',
  group: 'File Explorer Navigation & Views',
  category: 'file-explorer-navigation',
  keywords: [
    'file',
    'inspector',
    'metadata',
    'exif',
    'sha-256',
    'checksum',
    'tags',
    'color-tags',
    'preview',
    'side-panel',
    'file-explorer',
    'properties',
  ],
  usage: {
    description:
      'Toggleable optical-glass File Inspector & Metadata side panel inside a sculpted `prism-slab` surface. Renders a responsive procedural SVG optical preview canvas (`viewBox="0 0 240 132"`) tailored to `image`, `code`, `audio`, `document`, and `archive` files using strictly `--prism-*` tokens, a semantic `<dl>` metadata grid with resilient SHA-256 clipboard copy and polite announcements, an EXIF & Media Specs grid, editable semantic color tags with 6 quick color swatches and IME-safe keyboard entry, and a clean `role="status"` empty state when `file` is `null`.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pair `FileMetadataInspector` alongside file lists, tree views, or Miller columns and control `open` / `onOpenChange` when coordinating panel collapse state with a workspace layout.',
      },
      {
        guidance: true,
        description:
          'Provide `onTagsChange` to persist color-coded file tags to your application state or backend; whitespace trimming and case-insensitive deduplication are enforced automatically.',
      },
      {
        guidance: false,
        description:
          'Expect HTML interpretation in filenames, EXIF values, or tag labels; all fields render strictly as literal React text nodes and SHA-256 copying degrades safely when clipboard access is unavailable.',
      },
    ],
    accessibility: [
      {
        name: 'Collapsible Inspector Region & Semantic Definition Lists',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Root `role="region"` linked via `aria-labelledby`, collapse/expand toggle with `aria-expanded` and `aria-controls`, structured `<dl>/<dt>/<dd>` metadata and EXIF specs, and `role="status"` empty state when `file === null`',
        description:
          'Allows assistive technology users to navigate file properties, media specifications, and collapsible panel state reliably.',
      },
      {
        name: 'Polite Clipboard & Tag Announcements, Swatch Toggles & IME Safety',
        criterion: '2.1.1 Keyboard & 4.1.3 Status Messages',
        requirement:
          '6 color-tag swatches expose `aria-pressed`, removable tag buttons expose `Remove tag <label>`, inline tag input guards Enter with `!e.nativeEvent.isComposing`, keyboard-only `.prism-focus-ring` outlines, and `aria-live="polite"` status announcements confirm checksum copies and tag edits',
        description:
          'Provides clear non-intrusive feedback for clipboard fallbacks and tag mutations while preserving CJK IME composition workflows.',
      },
    ],
  },
  props: [
    {
      name: 'file',
      type: 'FileMetadataRecord | null',
      defaultValue: 'Built-in optical image sample (Optical_Refraction_Hero.png)',
      description:
        'File metadata record to inspect. Omit for the default sample record, or pass `null` to render the `role="status"` empty state.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled expanded/collapsed state of the inspector body.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial expanded state when used in uncontrolled mode.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the Collapse/Expand Inspector toggle is activated.',
    },
    {
      name: 'onTagsChange',
      type: '(nextTags: ReadonlyArray<FileMetadataTag>) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated tag array whenever a tag is added or removed.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the collapse toggle, SHA-256 copy button, color swatches, tag removal buttons, and inline tag input.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FileMetadataInspector />`,
    `<FileMetadataInspector\n  file={{\n    name: 'themeEngine.ts',\n    kind: 'code',\n    mimeType: 'application/typescript',\n    sizeLabel: '18.4 KB',\n    location: '/packages/core/src/theme',\n    createdAt: '2026-10-01 08:15 UTC',\n    modifiedAt: '2026-11-20 14:05 UTC',\n    checksumSha256: '3a7bd3e2360a3d29eea436fcfb7e44c735d117c42d1c1835420b6b9942dd4f1b',\n    tags: [{ id: 'core', label: 'Core Engine', color: 'info' }],\n  }}\n  onTagsChange={(nextTags) => console.warn('Updated tags:', nextTags)}\n/>`,
  ],
};

export default docs;
