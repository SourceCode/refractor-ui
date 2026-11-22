export const docs = {
  name: 'OpticalDivider',
  displayName: 'Optical Divider',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'divider',
    'separator',
    'hairline',
    'rule',
    'seam',
    'specular',
    'dashed',
    'horizontal',
    'vertical',
    'medallion',
    'label',
    'optical',
    'primitive',
    'utility',
  ],
  usage: {
    description:
      'Optical-glass structural divider and light-seam primitive supporting horizontal and vertical orientations, three token-driven rail finishes (tapered specular gleam, crisp architectural seam, and precision dashed hairline), an optional prism-crystal label/icon medallion with start/center/end alignment, and semantic separator vs. purely decorative accessibility modes.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use the default specular variant to separate high-level optical slabs or content sections with a subtle tapered light-seam derived from --prism-divider, --prism-primary-main, and --prism-secondary-main.',
      },
      {
        guidance: true,
        description:
          'Set decorative={true} when the hairline is purely visual spacing inside a layout that already exposes headings or landmarks, keeping assistive technology trees uncluttered.',
      },
      {
        guidance: true,
        description:
          'Use orientation="vertical" inside flex toolbars, stat strips, or action bars so the divider stretches cleanly via self-stretch and min-h-[2rem].',
      },
      {
        guidance: false,
        description:
          'Inject raw hex/rgb border colors via inline styles; override --prism-divider, --prism-primary-main, or --prism-secondary-main through xstyle or PrismThemeProvider so all five optical themes stay cohesive.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Separator Role & Axis Announcement',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Emits role="separator" with aria-orientation="horizontal" or "vertical" by default, and switches to role="none" with aria-hidden="true" (omitting aria-orientation) when decorative={true}',
        description:
          'Communicates structural section boundaries accurately to screen readers while allowing purely visual seams to opt out of the accessibility tree cleanly.',
      },
      {
        name: 'Hidden Decorative Rails & Icon Slot',
        criterion: '1.1.1 Non-text Content',
        requirement:
          'Marks hairline rails and medallion icon wrappers aria-hidden="true" while exposing visible label text naturally',
        description:
          'Prevents decorative optical rules and icon glyphs from generating redundant announcements while preserving readable divider labels and caller-supplied aria-label attributes.',
      },
    ],
  },
  props: [
    {
      name: 'orientation',
      type: "'horizontal' | 'vertical'",
      defaultValue: "'horizontal'",
      description: 'Axis along which the optical glass seam spans.',
    },
    {
      name: 'variant',
      type: "'seam' | 'specular' | 'dashed'",
      defaultValue: "'specular'",
      description:
        'Visual rail finish: tapered specular light-seam gradient, solid 1px --prism-divider seam, or precision dashed hairline.',
    },
    {
      name: 'label',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Optional text pill or metadata chip rendered inside the prism-crystal seam medallion.',
    },
    {
      name: 'icon',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Optional icon rendered beside label or standalone inside a circular crystal medallion.',
    },
    {
      name: 'labelAlign',
      type: "'start' | 'center' | 'end'",
      defaultValue: "'center'",
      description: 'Alignment of the optional medallion along the rail axis (short leading, balanced, or short trailing rail).',
    },
    {
      name: 'decorative',
      type: 'boolean',
      defaultValue: 'false',
      description: 'When true, sets role="none" and aria-hidden="true" instead of role="separator" and aria-orientation.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<OpticalDivider />`,
    `<OpticalDivider variant="specular" label="Optical Telemetry" labelAlign="start" />`,
    `<OpticalDivider variant="seam" icon={<Sparkles className="w-3.5 h-3.5" />} label="Refraction Pass" />`,
    `<OpticalDivider orientation="vertical" variant="dashed" decorative />`,
  ],
};

export default docs;
