export const docs = {
  name: 'Slot',
  displayName: 'Slot (Polymorphic asChild)',
  group: 'Optical Material, A11y & Composition',
  category: 'optical-material-a11y-dx',
  keywords: ['slot', 'asChild', 'polymorphic', 'composition', 'router-link', 'merge-props'],
  usage: {
    description:
      'Polymorphic composition primitive (`asChild` / Slot pattern) that merges Refractor optical classes, `xstyle` tokens, event handlers, ARIA attributes, and React 19 refs directly onto a custom child element without creating nested wrapper `<div>` soup.',
    bestPractices: [
      {
        guidance: true,
        description: 'Use `<Slot>` to apply glass button or card styling directly onto framework router links (`<Link>`) or semantic `<a href>` elements.',
      },
      {
        guidance: false,
        description: 'Pass a single React element as the direct child of `<Slot>`.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Element Preservation',
        criterion: '4.1.2 Name, Role, Value',
        requirement:
          'Preserves the native HTML semantics (`<a>`, `<button>`, `<summary>`) of the slotted element while forwarding all ARIA attributes and refs.',
        description: 'Prevents invalid nested interactive elements.',
      },
    ],
  },
  props: [
    { name: 'children', type: 'ReactElement', defaultValue: 'undefined', description: 'Single element receiving merged Refractor props and refs.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Optical CSS custom property overrides merged onto the child.' },
  ],
};
