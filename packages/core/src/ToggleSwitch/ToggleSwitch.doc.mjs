export const docs = {
  name: 'ToggleSwitch',
  displayName: 'Toggle Switch',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['toggle', 'switch', 'boolean', 'binary', 'emerald', 'setting'],
  usage: {
    description:
      'Sliding translucent emerald liquid-glass track with a 3D porcelain circular thumb for immediate binary settings.',
    bestPractices: [
      { guidance: true, description: 'Use ToggleSwitch for settings that take effect immediately without a submit button.' },
      { guidance: true, description: 'Always pair with a visible label or an explicit ariaLabel.' },
      { guidance: false, description: 'Use ToggleSwitch inside multi-select forms that require a save step; prefer Checkbox.' },
    ],
    accessibility: [
      {
        name: 'Switch role and state',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="switch" with accurate aria-checked boolean state',
        description: 'Announces binary on/off state to screen readers and exposes keyboard-only focus rings via prism-focus-ring.',
      },
    ],
  },
  props: [
    { name: 'checked', type: 'boolean', defaultValue: 'required', description: 'Controlled binary state of the switch.' },
    { name: 'onChange', type: '(checked: boolean) => void', defaultValue: 'required', description: 'Callback invoked immediately on toggle.' },
    { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Optional visible label beside the track.' },
    { name: 'ariaLabel', type: 'string', defaultValue: 'undefined', description: 'Accessible name override for screen readers.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables user interaction and dims the track.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<ToggleSwitch\n  checked={refractionOn}\n  onChange={setRefractionOn}\n  label="Chromatic edge dispersion"\n/>`,
  ],
};
