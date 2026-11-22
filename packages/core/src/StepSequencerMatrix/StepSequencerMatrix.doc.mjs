export const docs = {
  name: 'StepSequencerMatrix',
  displayName: 'Step Sequencer Matrix',
  group: 'Hardware, IoT & Tactile Surfaces',
  category: 'hardware-iot-tactile',
  keywords: [
    'step',
    'sequencer',
    'matrix',
    'drum-machine',
    'groovebox',
    'pattern',
    'bpm',
    'tempo',
    'transport',
    'playhead',
    '16-step',
    'tactile',
    'hardware',
    'iot',
    'midi',
    'synthesizer',
    'pads',
  ],
  usage: {
    description:
      'Sculpted optical-glass 16-step × 4-track hardware step sequencer matrix housed inside a prism-slab panel. Ships with a classic 4-on-the-floor House groove across Kick (primary), Snare (amber), Hi-Hat (info), and Synth (emerald), a responsive flex-wrap transport bar with Play/Stop, 60–200 BPM slider and tabular readout, live Step 01/16 playhead counter, House/Breakbeat/Clear pattern presets, an overflow-x-auto step grid with beat downbeat highlights (01, 05, 09, 13), per-track Mute/Clear buttons, IME-safe Arrow/Enter/Space keyboard grid navigation, a deterministic 16th-note step clock, and a polite aria-live status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Connect onStepTick(stepIndex, activeTrackIds) to a Web Audio synthesizer or MIDI trigger engine; muted tracks are automatically excluded from activeTrackIds on every 16th-note tick.',
      },
      {
        guidance: true,
        description:
          'Use controlled tracks/onPatternChange and bpm/onBpmChange when synchronizing pattern edits or tempo automation across an arrangement view or shared hardware controller.',
      },
      {
        guidance: false,
        description:
          'Strip the overflow-x-auto wrapper around the 16-step grid on narrow viewports; horizontal scrolling preserves ergonomic hardware pad hit targets without distorting column alignment.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Grid Semantics, Toggle Pads & Per-Track Controls',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="region" for the sequencer slab, role="grid"/role="row"/role="columnheader"/role="rowheader"/role="gridcell" for the 16-step matrix, aria-pressed on Play/Stop, Mute, and every step pad, plus descriptive aria-label="<name> step <1..16>" labels',
        description:
          'Enables assistive technology users to identify every track, step position, mute state, and transport status accurately without relying on LED illumination alone.',
      },
      {
        name: 'IME-Safe 2D Keyboard Grid Navigation, Focus Rings & Polite Live Announcements',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Supports bounded ArrowLeft/ArrowRight/ArrowUp/ArrowDown focus traversal and Space/Enter pad toggling guarded by !e.nativeEvent.isComposing, applies keyboard-only .prism-focus-ring outlines, and announces transport, preset, mute, and clear actions in an aria-live="polite" status strip',
        description:
          'Provides full hardware-style keyboard parity without hijacking IME composition or spamming screen readers on every 16th-note clock tick.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Step Sequencer Matrix'",
      description: 'Visible heading rendered in the transport bar and used as the accessible region label.',
    },
    {
      name: 'tracks',
      type: 'ReadonlyArray<SequencerTrackSpec>',
      defaultValue: 'undefined',
      description: 'Controlled array of track specifications (each normalized to 16 boolean steps).',
    },
    {
      name: 'defaultTracks',
      type: 'ReadonlyArray<SequencerTrackSpec>',
      defaultValue: '4-track 16-step House groove (Kick, Snare, Hi-Hat, Synth)',
      description: 'Initial track specifications when operating in uncontrolled mode.',
    },
    {
      name: 'defaultBpm',
      type: 'number',
      defaultValue: '120',
      description: 'Initial tempo in BPM in uncontrolled mode, safely clamped to [60..200] with NaN/Infinity fallback.',
    },
    {
      name: 'bpm',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled tempo in BPM, safely clamped to [60..200].',
    },
    {
      name: 'onBpmChange',
      type: '(bpm: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the sanitized BPM whenever the Tempo BPM range slider changes.',
    },
    {
      name: 'onPatternChange',
      type: '(tracks: ReadonlyArray<SequencerTrackSpec>) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the updated track array after any pad toggle, Mute toggle, Clear track, or preset load.',
    },
    {
      name: 'onStepTick',
      type: '(stepIndex: number, activeTrackIds: ReadonlyArray<string>) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked on each 16th-note clock tick (Math.round(60000 / bpm / 4) ms) with the active step (0..15) and unmuted active track IDs.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables transport, BPM slider, presets, per-track Mute/Clear controls, and step pads, and halts any running clock interval.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<StepSequencerMatrix\n  title="TR-Prism 16-Step Drum Matrix"\n  defaultBpm={124}\n  onStepTick={(step, activeTrackIds) => triggerAudioVoices(step, activeTrackIds)}\n/>`,
    `<StepSequencerMatrix\n  tracks={patternTracks}\n  bpm={tempoBpm}\n  onBpmChange={setTempoBpm}\n  onPatternChange={setPatternTracks}\n  onStepTick={handleStepTick}\n/>`,
  ],
};

export default docs;
