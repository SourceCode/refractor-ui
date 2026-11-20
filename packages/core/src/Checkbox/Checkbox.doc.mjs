export const docs = {
  name: 'Checkbox',
  displayName: 'Optical Glass Checkbox',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['checkbox', 'check', 'toggle', 'indeterminate', 'mixed', 'form', 'emerald'],
  usage: {
    description:
      'An optical glass checkbox transitioning between a clear frosted crystal square and a liquid emerald glass check tile, with full support for mixed/indeterminate state and descriptive subtitles.',
    bestPractices: [
      { guidance: true, description: 'Use Checkbox for independent boolean preferences or multi-select table rows.' },
      { guidance: true, description: 'Set indeterminate={true} on parent "Select all" checkboxes when only a subset of children are selected.' },
      { guidance: false, description: 'Use Checkbox for mutually exclusive choices; use RadioGroup instead.' },
    ],
    accessibility: [
      {
        name: 'Tri-state ARIA reflection',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'role="checkbox" with aria-checked="true" | "false" | "mixed"',
        description: 'Announces exact boolean or mixed state to assistive technologies and reflects data-checked / data-indeterminate attributes.',
      },
      {
        name: 'Keyboard-only focus ring & disabled hover guard',
        criterion: '2.4.7 Focus Visible',
        requirement: 'prism-focus-ring and disabled:cursor-not-allowed',
        description: 'Hover scale is guarded with enabled:group-hover: so disabled checkboxes do not suggest interactivity.',
      },
    ],
  },
  props: [
    { name: 'checked', type: 'boolean', defaultValue: 'required', description: 'Controlled checked state.' },
    { name: 'indeterminate', type: 'boolean', defaultValue: 'false', description: 'Displays minus icon and sets aria-checked="mixed".' },
    { name: 'onChange', type: '(checked: boolean) => void', defaultValue: 'required', description: 'Callback invoked with the next checked boolean.' },
    { name: 'label', type: 'string', defaultValue: 'required', description: 'Primary label text and accessible name.' },
    { name: 'description', type: 'string', defaultValue: 'undefined', description: 'Optional helper description rendered below the label.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables pointer and keyboard toggling.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<Checkbox checked={enabled} onChange={setEnabled} label="Enable caustic reflections" description="Adds prismatic light dispersion to elevated slabs." />`,
  ],
};
