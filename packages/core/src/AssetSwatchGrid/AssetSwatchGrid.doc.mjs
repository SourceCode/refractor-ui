export const docs = {
  name: 'AssetSwatchGrid',
  displayName: 'Asset & Swatch Grid',
  group: 'Design, 3D & Shader Inspector Controls',
  category: 'design-3d-shader',
  keywords: [
    'asset',
    'swatch',
    'grid',
    'library',
    'texture',
    'preset',
    'palette',
    'icon',
    'material',
    'shader',
    'pbr',
    'drag-and-drop',
    'preview',
    'inspector',
    '3d',
    'design',
  ],
  usage: {
    description:
      'Sculpted optical-glass prism-slab creative asset and swatch library featuring a searchable header (<input type="search" aria-label="Search assets and swatches">), category filter pills (All, Textures, Presets, Palettes, Icons) with live counts, a responsive 2/3/4-column thumbnail grid rendering procedural `--prism-*` SVG optical previews (`viewBox="0 0 96 64"`) with HTML5 drag-and-drop (`application/x-refractor-asset` + `text/plain`) and IME-safe keyboard selection, plus an instant recessed `aria-live="polite"` Live Asset Preview Inspector.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Listen for `onDragAssetStart` and read the `application/x-refractor-asset` MIME payload on viewport drop zones so designers can drag PBR textures, shader presets, palettes, and vector icons directly onto meshes or layers.',
      },
      {
        guidance: true,
        description:
          'Supply rich `meta` strings (resolution, IOR, color space) and `tags` arrays so live literal substring search and the recessed Live Asset Preview Inspector help artists locate and verify assets without opening separate modals.',
      },
      {
        guidance: false,
        description:
          'Hardcode raw hex or RGB colors into custom swatch themes; rely on semantic `tone` values (`primary`, `secondary`, `emerald`, `amber`, `rose`, `info`) so procedural SVG previews re-skin automatically across every Refractor theme and color mode.',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Search, Category Filters & Tile Selection',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `<input type="search" aria-label="Search assets and swatches">`, `aria-pressed` category filter buttons with live counts, and focusable swatch tiles supporting IME-safe Enter/Space selection (`!e.nativeEvent.isComposing`) with `aria-pressed` state',
        description:
          'Enables full keyboard navigation, filtering, and asset selection without interfering with CJK/IME text composition.',
      },
      {
        name: 'Polite Live Asset Preview Inspector & Keyboard-Only Focus Rings',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Updates the recessed `aria-live="polite"` Live Asset Preview Inspector on hover, keyboard focus, or selection, restricts outlines to `.prism-focus-ring` (`:focus-visible`), and renders a clean `role="status"` empty state when `items` is `[]`',
        description:
          'Keeps pointer browsing visually crisp while announcing hovered, focused, and selected asset metadata politely to screen readers.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'ReadonlyArray<AssetSwatchItem>',
      defaultValue: '8 realistic creative library items (textures, presets, palettes, icons)',
      description:
        'Asset items rendered in the swatch grid. Pass `[]` to display the `role="status"` empty library state.',
    },
    {
      name: 'selectedId',
      type: 'string | null',
      defaultValue: 'undefined',
      description: 'Controlled selected asset identifier (or `null` for no active selection).',
    },
    {
      name: 'defaultSelectedId',
      type: 'string | null',
      defaultValue: 'first item id',
      description: 'Initial selected asset identifier when operating in uncontrolled mode.',
    },
    {
      name: 'onSelectAsset',
      type: '(item: AssetSwatchItem) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when a swatch tile is selected via click or IME-safe Enter/Space.',
    },
    {
      name: 'onDragAssetStart',
      type: '(item: AssetSwatchItem) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when HTML5 drag starts on a draggable tile after populating `application/x-refractor-asset` and `text/plain` transfer data.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Asset & Swatch Library'",
      description: 'Visible panel heading in the prism-slab header and accessible region landmark label.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<AssetSwatchGrid\n  title="Shader & Material Vault"\n  onSelectAsset={(asset) => setActiveAssetId(asset.id)}\n  onDragAssetStart={(asset) => console.warn('Dragging asset:', asset.id)}\n/>`,
    `<AssetSwatchGrid\n  items={libraryAssets}\n  selectedId={selectedAssetId}\n  onSelectAsset={(asset) => setSelectedAssetId(asset.id)}\n/>`,
  ],
};

export default docs;
