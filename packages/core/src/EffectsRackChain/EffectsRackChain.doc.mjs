export const docs = {
  name: 'EffectsRackChain',
  displayName: 'Effects Rack Chain',
  group: 'Audio Mixing & Signal Processing',
  category: 'audio-mixing-dsp',
  keywords: [
    'effects',
    'rack',
    'chain',
    'dsp',
    'audio',
    'mixing',
    'mastering',
    'signal-flow',
    'insert',
    'plugin',
    'bypass',
    'wet-dry',
    'dynamics',
    'eq',
    'time',
    'modulation',
    'saturation',
    'reorder',
  ],
  usage: {
    description:
      'Sculpted optical-glass prism-slab DSP effects rack chain featuring a header with active/total module counter, master Bypass All toggle, and Add Insert action; a responsive horizontal or vertical signal-flow chain of recessed prism-well plugin cards connected by directional arrows (→ / ↓) with slot index badges, semantic --prism-* category tags, tactile Power/Bypass pills, 0–100% Wet/Dry Mix sliders, accessible Move Earlier/Move Later reorder controls, and per-slot removal; plus a role="status" direct-dry empty state and aria-live="polite" signal-path summary footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use horizontal orientation for wide console and mastering strips, and switch to orientation="vertical" inside narrow channel strips or inspector drawers so signal-flow connectors adapt from → to ↓.',
      },
      {
        guidance: true,
        description:
          'Provide controlled effects and onChange props alongside onAddEffect when opening a custom plugin browser modal or synchronizing DSP insert state with a live Web Audio graph.',
      },
      {
        guidance: false,
        description:
          'Allow wet/dry parameter edits on bypassed inserts; EffectsRackChain disables each module’s Wet/Dry Mix slider automatically while bypassed or when the rack is disabled so signal state remains unambiguous.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Chain Structure & Per-Slot Control Labels',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Uses role="region" labeled by the rack heading, role="list"/role="listitem" for the signal chain, aria-pressed on Bypass All and per-module Power/Bypass pills, aria-label="<name> wet mix" with valuemin/valuemax/valuenow/valuetext on sliders, and descriptive Move Earlier / Move Later / Remove labels',
        description:
          'Allows assistive technology users to navigate every DSP insert slot, discern active vs. bypassed power state, adjust wet/dry mix precisely, and reorder or remove plugins without relying on visual cues.',
      },
      {
        name: 'IME-Safe Keyboard Controls, Focus-Visible Rings & Live Signal Summary',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards slider keyboard shortcuts (Home, End, PageUp/PageDown, Shift+Arrow) with !e.nativeEvent.isComposing, applies keyboard-only .prism-focus-ring outlines, renders a role="status" empty state, and announces the active signal path in an aria-live="polite" footer',
        description:
          'Keeps keyboard mixing fast and IME-safe while politely announcing changes to active signal routing.',
      },
    ],
  },
  props: [
    {
      name: 'effects',
      type: 'ReadonlyArray<DspEffectModule>',
      defaultValue: 'undefined',
      description: 'Controlled ordered list of DSP effect modules along the signal path.',
    },
    {
      name: 'defaultEffects',
      type: 'ReadonlyArray<DspEffectModule>',
      defaultValue: '4-stage mastering chain (Prism Gate, Optical Comp, Harmonic Tube, Crystal Hall)',
      description: 'Initial ordered DSP effect modules when operating in uncontrolled mode.',
    },
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      defaultValue: "'horizontal'",
      description: 'Controls chain layout direction and signal-flow arrows (→ in horizontal, ↓ in vertical).',
    },
    {
      name: 'onChange',
      type: '(effects: DspEffectModule[]) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated effects array whenever modules are added, toggled, mixed, reordered, or removed.',
    },
    {
      name: 'onAddEffect',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback invoked by the Add Insert button instead of appending a deterministic optical plugin slot.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'DSP Effects Rack'",
      description: 'Visible heading rendered in the prism-slab header and linked via aria-labelledby.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all header actions, per-module power pills, wet/dry sliders, reorder controls, and remove buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<EffectsRackChain\n  title="Master Bus Rack"\n  onChange={(nextChain) => setEffects(nextChain)}\n/>`,
    `<EffectsRackChain\n  effects={effects}\n  orientation="vertical"\n  onChange={setEffects}\n  onAddEffect={() => setPluginModalOpen(true)}\n/>`,
  ],
};

export default docs;
