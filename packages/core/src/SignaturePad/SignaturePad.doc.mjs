export const docs = {
  name: 'SignaturePad',
  displayName: 'Signature Pad',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['signature', 'pad', 'draw', 'ink', 'svg', 'vector', 'sign', 'approval'],
  usage: {
    description:
      'Retina-crisp optical glass SVG vector signature pad supporting pointer drawing, ink color swatches, instant undo/clear, keyboard signing shortcuts, and deterministic SVG data URL export.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Consume the onSave payload svgDataUrl and strokes to persist tamper-evident vector signatures without lossy raster blur.',
      },
      {
        guidance: true,
        description:
          'Provide a clear domain-specific label such as "Authorized Signer" to bind screen-reader context to the signing surface.',
      },
      {
        guidance: false,
        description:
          'Rely solely on pointer input without preserving keyboard signing, undo, and clear controls.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard signing and editing shortcuts',
        criterion: '2.1.1 Keyboard',
        requirement: 'Enter/Space inserts a keyboard stroke; Backspace/Ctrl+Z undoes; Delete/Escape clears',
        description:
          'The signing SVG carries aria-labelledby, aria-describedby keyboard instructions, and a focus-visible outline.',
      },
      {
        name: 'Disabled state semantics',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Undo, Clear, Save Signature, and ink swatches expose native disabled attributes',
        description:
          'When disabled, the pad sets aria-disabled="true", removes itself from tab order, and blocks pointer drawing.',
      },
    ],
  },
  props: [
    {
      name: 'width',
      type: 'number',
      defaultValue: '480',
      description: 'Logical SVG width clamped between 200 and 900.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '180',
      description: 'Logical SVG height clamped between 100 and 450.',
    },
    {
      name: 'strokeColor',
      type: 'string',
      defaultValue: "'#18202C'",
      description: 'Initial ink stroke color (sanitized hex value).',
    },
    {
      name: 'strokeWidth',
      type: 'number',
      defaultValue: '2.5',
      description: 'Ink stroke width clamped between 1 and 10.',
    },
    {
      name: 'label',
      type: 'string',
      defaultValue: "'Digital Signature'",
      description: 'Visible and accessible label for the signature pad.',
    },
    {
      name: 'placeholder',
      type: 'string',
      defaultValue: "'Sign inside the frosted glass pad'",
      description: 'Hint displayed inside the frosted well when empty.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables drawing, swatches, undo, clear, and save actions.',
    },
    {
      name: 'onChange',
      type: '(data: SignatureExportData) => void',
      defaultValue: 'undefined',
      description: 'Callback fired after every completed stroke, undo, or clear.',
    },
    {
      name: 'onSave',
      type: '(data: SignatureExportData) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when Save Signature is clicked with a non-empty signature.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<SignaturePad\n  label="Applicant Signature"\n  onSave={(data) => submitSignature(data.svgDataUrl)}\n/>`,
  ],
};
