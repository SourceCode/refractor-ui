export const docs = {
  name: 'AudioWaveformPlayer',
  displayName: 'Audio Waveform Player',
  group: 'Media, Audio & Spatial Controls',
  category: 'media-spatial',
  keywords: [
    'audio',
    'waveform',
    'player',
    'sound',
    'podcast',
    'voice',
    'scrubber',
    'playback',
    'speed',
    'peaks',
  ],
  usage: {
    description:
      'Optical-glass audio player built on a prism-slab shell with a circular prism-btn-primary play/pause control, track title and subtitle header, tabular MM:SS timing, playback speed cycling (1x, 1.25x, 1.5x, 2x, 0.75x), and an accessible interactive waveform scrubber whose optical amplitude bars reflect played and unplayed progress with graceful empty-peak fallback.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass 16 to 64 normalized amplitude peaks (0..1) so every vertical optical bar remains clearly clickable and scannable across narrow and wide containers.',
      },
      {
        guidance: true,
        description:
          'Use currentTimeSeconds with onSeek when synchronizing the waveform scrubber to an external HTMLAudioElement or Web Audio engine.',
      },
      {
        guidance: false,
        description:
          'Leave durationSeconds or peaks unsanitized when reading untrusted metadata; AudioWaveformPlayer automatically clamps NaN, Infinity, and out-of-range values.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Waveform Slider Semantics',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'role="slider" with aria-valuemin, aria-valuemax, aria-valuenow, aria-valuetext, and ArrowLeft/ArrowRight/Home/End keyboard seeking',
        description:
          'The waveform container acts as a single keyboard-focusable slider with focus-visible outline while individual optical bars provide direct pointer seek targets.',
      },
      {
        name: 'Transport & Speed Button Labels',
        criterion: '2.4.6 Headings and Labels',
        requirement: 'Explicit aria-label and aria-pressed states on play/pause and speed pill controls',
        description:
          'Screen readers announce current playback state, tabular MM:SS position, and selected playback rate clearly.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Audio Track'",
      description: 'Primary track title displayed in the player header and bound as the region label.',
    },
    {
      name: 'subtitle',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional artist, episode, or channel metadata rendered below the title.',
    },
    {
      name: 'peaks',
      type: 'ReadonlyArray<number>',
      defaultValue: 'required',
      description: 'Normalized amplitude peaks (0..1) sanitized and clamped to [0.08..1], with automatic fallback waveform when empty.',
    },
    {
      name: 'durationSeconds',
      type: 'number',
      defaultValue: '120',
      description: 'Total track duration in seconds clamped safely to [1..86400].',
    },
    {
      name: 'currentTimeSeconds',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled playback position in seconds.',
    },
    {
      name: 'defaultTimeSeconds',
      type: 'number',
      defaultValue: '0',
      description: 'Initial playback position in seconds for uncontrolled mode.',
    },
    {
      name: 'onSeek',
      type: '(seconds: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the user seeks via bar click or keyboard navigation.',
    },
    {
      name: 'onPlayStateChange',
      type: '(playing: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever playback toggles between playing and paused.',
    },
    {
      name: 'defaultSpeed',
      type: 'number',
      defaultValue: '1',
      description: 'Initial playback rate chosen from [1, 1.25, 1.5, 2, 0.75].',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<AudioWaveformPlayer\n  title="Optical Acoustics — Session 04"\n  subtitle="Refractor Sound Lab"\n  durationSeconds={185}\n  defaultTimeSeconds={42}\n  peaks={[0.25, 0.55, 0.82, 0.64, 0.91, 0.48, 0.73, 0.39, 0.88, 0.61, 0.44, 0.77]}\n  onSeek={(seconds) => audioEngine.seek(seconds)}\n/>`,
  ],
};
