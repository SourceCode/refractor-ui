export const docs = {
  name: 'TransportControlBar',
  displayName: 'Transport Control Bar',
  group: 'Transport & Playback Controls',
  category: 'transport-playback',
  keywords: [
    'transport',
    'control',
    'bar',
    'playback',
    'play',
    'pause',
    'stop',
    'record',
    'loop',
    'skip',
    'media',
    'daw',
    'toolbar',
  ],
  usage: {
    description:
      'Optical-glass prism-slab media transport toolbar providing Jump to Start, Play/Pause toggle (highlighted with prism-btn-primary when playing), Stop, optional Record arm/capture button styled with --prism-error-main, Loop toggle with prism-emerald activation, Jump to End, recessed prism-well live status readout (STOPPED / PLAYING / PAUSED / RECORDING + optional statusLabel and LOOP pill), and IME-safe keyboard shortcuts.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use controlled playbackState and loop props alongside onPlaybackStateChange and onLoopChange when synchronizing the deck with Web Audio, video elements, or timeline engines.',
      },
      {
        guidance: true,
        description:
          'Pass a concise statusLabel (such as "REC · Ch 1–2" or "48kHz · 24-bit") to surface channel or session context directly inside the recessed live status well.',
      },
      {
        guidance: false,
        description:
          'Leave allowRecord enabled on read-only playback surfaces; set allowRecord={false} to omit the Record button and disable the R keyboard shortcut.',
      },
    ],
    accessibility: [
      {
        name: 'Toolbar Landmark & Live Status Announcements',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement: 'role="toolbar" with accessible label, aria-pressed toggle states, and role="status" aria-live="polite" readout well',
        description:
          'Groups transport buttons inside a semantic media toolbar with clear toggle semantics and polite status announcements on every state transition.',
      },
      {
        name: 'IME-Safe Keyboard Shortcuts & Disabled Guards',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'Supports Space (Play/Pause), Home (Jump Start), End (Jump End), L (Loop), and R (Record when allowRecord) while guarding isComposing, modifier keys, and disabled state',
        description:
          'Preserves CJK/IME composition, ignores browser modifier chords (Ctrl/Cmd/Alt), prevents Space hijacking on focused child buttons, and applies keyboard-only prism-focus-ring outlines.',
      },
    ],
  },
  props: [
    {
      name: 'playbackState',
      type: "'stopped' | 'playing' | 'paused' | 'recording'",
      defaultValue: 'undefined',
      description: 'Controlled transport playback state.',
    },
    {
      name: 'defaultPlaybackState',
      type: "'stopped' | 'playing' | 'paused' | 'recording'",
      defaultValue: "'stopped'",
      description: 'Initial transport playback state when operating in uncontrolled mode.',
    },
    {
      name: 'onPlaybackStateChange',
      type: '(state: TransportPlaybackState) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever playback state changes via buttons or keyboard shortcuts.',
    },
    {
      name: 'loop',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled loop playback flag.',
    },
    {
      name: 'defaultLoop',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial loop flag in uncontrolled mode.',
    },
    {
      name: 'onLoopChange',
      type: '(loop: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever loop mode is toggled.',
    },
    {
      name: 'allowRecord',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Controls visibility of the Record button and availability of the R keyboard shortcut.',
    },
    {
      name: 'onJumpStart',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when Jump to Start is clicked or Home is pressed.',
    },
    {
      name: 'onJumpEnd',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when Jump to End is clicked or End is pressed.',
    },
    {
      name: 'statusLabel',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional custom readout rendered safely inside the recessed status well.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all transport controls and ignores keyboard shortcuts.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<TransportControlBar\n  defaultPlaybackState="stopped"\n  defaultLoop={false}\n  statusLabel="REC · Ch 1–2"\n  onPlaybackStateChange={(state) => console.warn('Playback:', state)}\n  onLoopChange={(loop) => console.warn('Loop:', loop)}\n  onJumpStart={() => console.warn('Jump start')}\n  onJumpEnd={() => console.warn('Jump end')}\n/>`,
  ],
};
