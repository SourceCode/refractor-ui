export const docs = {
  name: 'TimecodeScrubber',
  displayName: 'Timecode Scrubber',
  group: 'Transport & Playback Controls',
  category: 'transport-playback',
  keywords: [
    'timecode',
    'smpte',
    'scrubber',
    'transport',
    'playback',
    'frame',
    'fps',
    'bpm',
    'musical',
    'bbt',
    'bars',
    'beats',
    'ticks',
    'timeline',
    'daw',
    'video',
  ],
  usage: {
    description:
      'Optical-glass precision transport timecode scrubber inside a prism-slab card with SMPTE (HH:MM:SS:FF) and musical Bars:Beats:Ticks (BBB:B:TTT) format switching, rate/tempo pill badge, recessed prism-well horizontal pointer-scrub readout (Shift fine 1-frame, Alt coarse 10-frame), full keyboard stepping, and inline direct timestamp editing with validation.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use TimecodeScrubber in video editors, DAWs, motion-graphics timelines, and broadcast decks where frame-accurate horizontal scrubbing complements direct SMPTE, BBT, or raw frame entry.',
      },
      {
        guidance: true,
        description:
          'Bind frame and onFrameChange in controlled mode to synchronize playhead transport across sibling waveform, timeline, and viewport panels while letting users freely toggle SMPTE or BBT views.',
      },
      {
        guidance: false,
        description:
          'Treat the formatted string as the primary persistence key; store the canonical integer frame index and derive SMPTE or musical BBT strings from fps, bpm, and beatsPerBar.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Slider & Keyboard Transport Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="slider" with aria-valuenow, aria-valuemin, aria-valuemax, and aria-valuetext; supports ArrowLeft/ArrowRight (±1 frame, Alt ±10), PageUp/PageDown (±fps / 1 second), Home/End (0 / maxFrame), and Enter to edit',
        description:
          'Guarantees non-pointer users can scrub to any frame with fine, coarse, and 1-second jumps while screen readers announce the formatted SMPTE or musical BBT position.',
      },
      {
        name: 'IME-Safe Direct Entry, Validation & Window Drag Cleanup',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 3.3.1 Error Identification',
        requirement:
          'Guards keyboard handlers with !e.nativeEvent.isComposing, surfaces invalid parse states via role="alert" and aria-invalid, reverts cleanly on Escape, and detaches window pointer listeners on drag end and unmount',
        description:
          'Prevents IME composition hijacking during direct timecode entry, reports parse errors accessibly, and ensures active pointer sessions never leak across unmounts.',
      },
    ],
  },
  props: [
    {
      name: 'frame',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled current frame index (clamped integer >= 0).',
    },
    {
      name: 'defaultFrame',
      type: 'number',
      defaultValue: '0',
      description: 'Initial frame index in uncontrolled mode.',
    },
    {
      name: 'maxFrame',
      type: 'number',
      defaultValue: '108000',
      description: 'Maximum inclusive frame index (clamped >= 1; defaults to 1 hour @ 30fps).',
    },
    {
      name: 'fps',
      type: 'number',
      defaultValue: '30',
      description: 'Frames per second for SMPTE formatting and PageUp/PageDown 1-second jumps (clamped to [1..120]).',
    },
    {
      name: 'format',
      type: "'smpte' | 'musical'",
      defaultValue: 'undefined',
      description: 'Controlled display format: SMPTE (HH:MM:SS:FF) or musical BBT (BBB:B:TTT).',
    },
    {
      name: 'defaultFormat',
      type: "'smpte' | 'musical'",
      defaultValue: "'smpte'",
      description: 'Initial display format in uncontrolled mode.',
    },
    {
      name: 'onFormatChange',
      type: '(format: TimecodeFormat) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when switching between SMPTE and musical BBT format pills.',
    },
    {
      name: 'bpm',
      type: 'number',
      defaultValue: '120',
      description: 'Musical tempo in beats per minute used for BBT conversion (clamped to [30..300]).',
    },
    {
      name: 'beatsPerBar',
      type: 'number',
      defaultValue: '4',
      description: 'Beats per bar for musical BBT formatting and parsing (clamped to [2..12]).',
    },
    {
      name: 'onFrameChange',
      type: '(frame: number, formatted: string) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the frame index changes with both integer frame and formatted timestamp.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Timecode'",
      description: 'Visible card heading and accessible slider label.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables pointer scrubbing, keyboard stepping, format switching, and inline editing.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<TimecodeScrubber\n  label="Master Playhead"\n  defaultFrame={2535}\n  fps={30}\n  maxFrame={108000}\n  onFrameChange={(frame, formatted) => console.warn(frame, formatted)}\n/>`,
    `<TimecodeScrubber\n  label="DAW Transport"\n  defaultFormat="musical"\n  defaultFrame={690}\n  fps={30}\n  bpm={120}\n  beatsPerBar={4}\n  onFormatChange={(fmt) => console.warn(fmt)}\n/>`,
  ],
};
