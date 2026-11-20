export const docs = {
  name: 'RangeSlider',
  displayName: 'Range Slider',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['slider', 'range', 'input', 'numeric', 'continuous', 'blur'],
  usage: {
    description:
      'Crystal track with an emerald fill bar and tactile porcelain thumb for picking continuous numeric values.',
    bestPractices: [
      { guidance: true, description: 'Always display the current numeric value and unit in tabular monospace figures.' },
      { guidance: true, description: 'Choose sensible min, max, and step bounds matching the domain parameter.' },
      { guidance: false, description: 'Use RangeSlider when exact multi-digit entry is required without a companion input.' },
    ],
    accessibility: [
      {
        name: 'Native range input semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Bound <label htmlFor> and native slider keyboard stepping',
        description: 'Renders a native <input type="range"> linked to its label with keyboard-only focus-visible thumb outlines.',
      },
    ],
  },
  props: [
    { name: 'label', type: 'string', defaultValue: 'required', description: 'Accessible label associated with the slider input.' },
    { name: 'min', type: 'number', defaultValue: '0', description: 'Minimum numeric bound of the slider.' },
    { name: 'max', type: 'number', defaultValue: '100', description: 'Maximum numeric bound of the slider.' },
    { name: 'step', type: 'number', defaultValue: '1', description: 'Step increment for slider adjustments.' },
    { name: 'value', type: 'number', defaultValue: 'required', description: 'Controlled current numeric value.' },
    { name: 'unit', type: 'string', defaultValue: "'%'", description: 'Suffix rendered next to the tabular value readout.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables slider interaction.' },
    { name: 'onChange', type: '(value: number) => void', defaultValue: 'required', description: 'Invoked with clamped numeric values on change.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<RangeSlider\n  label="Backdrop Blur Radius"\n  min={4}\n  max={32}\n  unit="px"\n  value={blur}\n  onChange={setBlur}\n/>`,
  ],
};
