export const docs = {
  name: 'PerAppAudioMixer',
  displayName: 'Per-App Audio Mixer',
  group: 'System Tray & Control Center',
  category: 'system-tray-control-center',
  keywords: [
    'audio',
    'mixer',
    'volume',
    'per-app',
    'sound',
    'system-tray',
    'control-center',
    'popover',
    'output',
    'input',
    'device',
    'master',
    'mute',
    'channels',
    'slider',
  ],
  usage: {
    description:
      'Optical-glass system sound mixer popover built inside a prism-slab shell featuring recessed prism-well output and input device selectors, a master volume bus with mute toggle, tabular effective readout, and 3-band segmented token-tinted level bar (<=70% --prism-success-main, 71–88% --prism-warning-main, >88% --prism-error-main), plus per-application channel strips that compute live effective output percentages with master mute propagation and Reset Mix recovery.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Bind controlled value and onChange to your desktop shell or OS audio daemon bridge so external hardware volume keys and tray popover adjustments remain synchronized.',
      },
      {
        guidance: true,
        description:
          'Assign distinct semantic tones (primary, info, emerald, amber) across running application channels so users can quickly identify creative DAWs, browsers, voice comms, and system sounds at a glance.',
      },
      {
        guidance: false,
        description:
          'Pass raw hex or rgb colors or non-normalized floating-point gains without clamping; rely on PerAppAudioMixer semantic --prism-* tokens and 0..100 volume sanitization.',
      },
    ],
    accessibility: [
      {
        name: 'Device Routing, Slider, and Toggle Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes native <select aria-label="Audio output device"> and <select aria-label="Audio input device">, aria-pressed toggles on Mute master and Mute <appName> buttons, native <input type="range"> sliders with aria-valuetext, and role="meter" on the segmented master level bar',
        description:
          'Ensures complete keyboard operability with IME-safe M-key mute shortcuts, keyboard-only prism-focus-ring outlines, and unambiguous state announcements across screen readers.',
      },
      {
        name: 'Empty Stream Fallback & Polite Live Announcements',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Renders a role="status" empty-channel fallback when channels is empty and publishes concise aria-live="polite" announcements for routing, volume, mute, and Reset Mix changes',
        description:
          'Keeps assistive technology users informed of effective output percentages and routing changes without stealing focus.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Audio Mixer'",
      description:
        'Visible popover title rendered in the mixer header and referenced via aria-labelledby.',
    },
    {
      name: 'outputDevices',
      type: 'ReadonlyArray<AudioMixerDeviceOption>',
      defaultValue:
        "['Studio Monitors (USB-C)', 'Prism Headphones', 'Built-in Speakers']",
      description:
        'Selectable audio output devices rendered inside the recessed Output selector.',
    },
    {
      name: 'inputDevices',
      type: 'ReadonlyArray<AudioMixerDeviceOption>',
      defaultValue: "['Broadcast Mic', 'Built-in Array']",
      description:
        'Selectable audio input devices rendered inside the recessed Input selector.',
    },
    {
      name: 'value',
      type: 'PerAppAudioMixerState',
      defaultValue: 'undefined',
      description:
        'Controlled mixer state containing active output/input device IDs, master volume and mute state, and per-app channels.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<PerAppAudioMixerState>',
      defaultValue: 'undefined',
      description:
        'Initial uncontrolled mixer state overrides and baseline target restored by Reset Mix.',
    },
    {
      name: 'onChange',
      type: '(state: PerAppAudioMixerState) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the complete sanitized PerAppAudioMixerState whenever devices, volumes, mutes, or Reset Mix change.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all routing selectors, master controls, per-app sliders, mute buttons, and Reset Mix.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<PerAppAudioMixer\n  title="System Audio Mixer"\n  onChange={(nextState) => console.warn('Mixer updated:', nextState.masterVolumePct)}\n/>`,
    `<PerAppAudioMixer\n  value={mixerState}\n  onChange={setMixerState}\n  outputDevices={[\n    { id: 'studio-monitors', label: 'Studio Monitors (USB-C)' },\n    { id: 'prism-headphones', label: 'Prism Headphones' },\n  ]}\n  inputDevices={[\n    { id: 'broadcast-mic', label: 'Broadcast Mic' },\n    { id: 'built-in-array', label: 'Built-in Array' },\n  ]}\n/>`,
  ],
};

export default docs;
