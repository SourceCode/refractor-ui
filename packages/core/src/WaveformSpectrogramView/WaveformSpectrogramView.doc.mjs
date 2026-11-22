export const docs = {
  name: 'WaveformSpectrogramView',
  displayName: 'Waveform Spectrogram View',
  group: 'Audio Mixing & Signal Processing',
  category: 'audio-mixing-dsp',
  keywords: [
    'audio',
    'waveform',
    'spectrogram',
    'dsp',
    'mixing',
    'transient',
    'frequency',
    'selection',
    'silence',
    'cut',
    'decibel',
    'editing',
  ],
  usage: {
    description:
      'Optical-glass audio waveform and 6-band frequency spectrogram workstation inside a sculpted prism-slab surface. Supports Waveform, Spectrogram, and Split views, 1×/2×/4× horizontal zoom inside a scrollable prism-well, mirrored positive/negative amplitude bars with >0.82 transient peak markers, pointer-drag and keyboard range selection, destructive Silence/Cut/Reset sample editing, and a recessed aria-live="polite" telemetry footer showing duration, selection span, sample count, and peak dB.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use defaultMode="split" in primary mastering or vocal cleanup views so engineers can inspect time-domain transients directly above frequency-domain harmonic bands.',
      },
      {
        guidance: true,
        description:
          'Bind selection and onSelectionChange in controlled mode when synchronizing active range edits with external transport markers or undo stacks.',
      },
      {
        guidance: false,
        description:
          'Pass raw unnormalized dB values or NaN arrays expecting exceptions — WaveformSpectrogramView clamps sample amplitudes into [0..1], clamps durationSec >= 0.5, and renders a safe empty state when all samples are removed.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Roving Tablist & Accessible Range Selection Handles',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'View mode buttons implement a roving tablist (ArrowLeft/ArrowRight/Home/End); Selection Start and Selection End handles expose role="slider" with ArrowLeft/ArrowRight ±2% adjustments, PageUp/PageDown ±10%, Home/End bounds, and Escape to clear selection.',
        description:
          'Enables full keyboard-only range selection, view switching, zoom toggling, and destructive editing without requiring pointer drags, paired with IME-safe handlers and keyboard-only .prism-focus-ring outlines.',
      },
      {
        name: 'Polite Audio Telemetry Live Region',
        criterion: '4.1.3 Status Messages',
        requirement:
          'A recessed prism-well footer with role="status" and aria-live="polite" reports clip duration, active selection time span, sample count, and peak dB.',
        description:
          'Continuously conveys selection spans and post-edit peak level changes to assistive technologies without stealing focus.',
      },
    ],
  },
  props: [
    {
      name: 'samples',
      type: 'ReadonlyArray<number>',
      defaultValue: 'DEFAULT_AUDIO_SAMPLES (48 samples)',
      description: 'Normalized sample amplitudes in [0..1] rendered across waveform bars and spectrogram bands.',
    },
    {
      name: 'durationSec',
      type: 'number',
      defaultValue: '12.5',
      description: 'Total audio duration in seconds, clamped safely to >= 0.5.',
    },
    {
      name: 'mode',
      type: 'AudioCanvasMode',
      defaultValue: 'undefined',
      description: "Controlled canvas display mode ('waveform' | 'spectrogram' | 'split').",
    },
    {
      name: 'defaultMode',
      type: 'AudioCanvasMode',
      defaultValue: "'split'",
      description: 'Initial uncontrolled canvas display mode.',
    },
    {
      name: 'onModeChange',
      type: '(mode: AudioCanvasMode) => void',
      defaultValue: 'undefined',
      description: 'Callback fired whenever the canvas display mode changes.',
    },
    {
      name: 'selection',
      type: 'AudioSelectionRange | null',
      defaultValue: 'undefined',
      description: 'Controlled active range selection ({ startPct, endPct } in 0..100), or null when cleared.',
    },
    {
      name: 'defaultSelection',
      type: 'AudioSelectionRange | null',
      defaultValue: 'null',
      description: 'Initial uncontrolled range selection.',
    },
    {
      name: 'onSelectionChange',
      type: '(selection: AudioSelectionRange | null) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when range selection changes via pointer drag or keyboard handles, or clears via Escape/Cut.',
    },
    {
      name: 'onEditSamples',
      type: "(nextSamples: number[], action: 'silence' | 'cut' | 'reset') => void",
      defaultValue: 'undefined',
      description: 'Callback invoked after Silence Selection, Cut Selection, or Reset Audio updates the working sample buffer.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Audio Waveform & Spectrogram'",
      description: 'Visible card heading linked to the root region via aria-labelledby.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables view mode switching, zoom pills, pointer/keyboard selection, and sample edit actions.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<WaveformSpectrogramView\n  title="Lead Vocal Take 04"\n  durationSec={12.5}\n  defaultSelection={{ startPct: 20, endPct: 50 }}\n  onEditSamples={(next, action) => console.warn(action, next.length)}\n/>`,
    `<WaveformSpectrogramView\n  mode="spectrogram"\n  durationSec={8}\n  samples={[0.2, 0.55, 0.91, 0.72, 0.4, 0.18]}\n/>`,
  ],
};

export default docs;
