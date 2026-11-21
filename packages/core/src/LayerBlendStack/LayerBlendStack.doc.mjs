export const docs = {
  name: 'LayerBlendStack',
  displayName: 'Layer & Blend Stack',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'layer',
    'blend',
    'stack',
    'compositing',
    'photo',
    'color-grading',
    'opacity',
    'clipping-mask',
    'adjustment',
    'mask',
    'lut',
    'multiply',
    'screen',
    'overlay',
    'soft-light',
    'color-dodge',
    'difference',
    'reorder',
  ],
  usage: {
    description:
      'Sculpted optical-glass prism-slab compositing and color-grading layer stack featuring a header with visible/total counter pill and Add Adjustment button, a recessed prism-well Active Layer Controls bar (blend mode selector, 0–100% opacity slider with tabular readout, Clip to Below clipping-mask toggle, and Lock toggle), a keyboard-selectable reorderable layer stack with semantic kind icons, clipping indent glyphs, visibility eye toggles, move up/down reordering, and protected deletion, plus an aria-live polite status summary.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind layers, selectedLayerId, onChange, and onSelectLayer in controlled mode when synchronizing the layer stack with a live canvas compositor or color-grading viewport.',
      },
      {
        guidance: true,
        description:
          'Lock base RAW plates or reference layers so editors can still toggle visibility for A/B inspection without accidentally modifying blend mode, opacity, stack order, or deleting the base plate.',
      },
      {
        guidance: false,
        description:
          'Allow destructive deletion of the final remaining layer; LayerBlendStack disables Delete when locked or when only 1 layer remains, while cleanly rendering an empty state if controlled layers is explicitly [].',
      },
    ],
    accessibility: [
      {
        name: 'Accessible Active Layer Controls & Per-Layer Action Labels',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Exposes labeled blend mode <select aria-label="Active layer blend mode">, opacity range slider <input aria-label="Active layer opacity">, aria-pressed toggles for Clip to Below, Lock, and per-layer visibility ("Toggle visibility for <name>"), and descriptive Move Up / Move Down / Delete labels',
        description:
          'Allows assistive technology users to identify and operate every layer row and active-layer parameter without relying on icon-only visual cues.',
      },
      {
        name: 'IME-Safe Keyboard Selection, Focus-Visible Rings & Live Status',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Supports Enter and Space layer selection guarded by !e.nativeEvent.isComposing, applies keyboard-only .prism-focus-ring outlines, and announces active layer name, blend mode, opacity, and clipping state inside a recessed aria-live="polite" region',
        description:
          'Keeps keyboard compositing workflows fast and IME-safe while announcing every active layer state transition politely.',
      },
    ],
  },
  props: [
    {
      name: 'layers',
      type: 'ReadonlyArray<BlendLayerItem>',
      defaultValue: 'undefined',
      description: 'Controlled ordered list of compositing layers (top to bottom).',
    },
    {
      name: 'defaultLayers',
      type: 'ReadonlyArray<BlendLayerItem>',
      defaultValue: '4 default grading & compositing layers',
      description: 'Initial ordered layers when operating in uncontrolled mode.',
    },
    {
      name: 'selectedLayerId',
      type: 'string | null',
      defaultValue: 'undefined',
      description: 'Controlled active layer ID (or null for no active selection).',
    },
    {
      name: 'defaultSelectedLayerId',
      type: 'string | null',
      defaultValue: 'first layer id',
      description: 'Initial active layer ID in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(layers: BlendLayerItem[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated layers array whenever layers are added, modified, reordered, or deleted.',
    },
    {
      name: 'onSelectLayer',
      type: '(layer: BlendLayerItem) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever a layer becomes selected.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Layer & Blend Stack'",
      description: 'Visible heading rendered in the prism-slab header and used for landmark labeling.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all active-layer controls, layer selection, adding, reordering, visibility toggles, and deletion.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<LayerBlendStack\n  title="Grade Compositor"\n  onChange={(nextLayers) => setLayers(nextLayers)}\n  onSelectLayer={(layer) => setActiveLayerId(layer.id)}\n/>`,
    `<LayerBlendStack\n  layers={layers}\n  selectedLayerId={selectedId}\n  onChange={setLayers}\n  onSelectLayer={(layer) => setSelectedId(layer.id)}\n/>`,
  ],
};

export default docs;
