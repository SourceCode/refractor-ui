export const docs = {
  name: 'ExpandableTextClamp',
  displayName: 'Expandable Text Clamp',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'text',
    'clamp',
    'truncate',
    'ellipsis',
    'read-more',
    'show-less',
    'expandable',
    'line-clamp',
    'typography',
    'collapse',
    'disclosure',
    'utility',
  ],
  usage: {
    description:
      'Optical-glass multi-line text truncation container using CSS -webkit-line-clamp / lineClamp with a soft --prism-surface bottom fade overlay when clamped, deterministic character-threshold gating (20..2000), controlled and uncontrolled expansion state, accessible aria-expanded/aria-controls toggle morphing between Read more (ChevronDown) and Show less (ChevronUp), and compact monospace reading telemetry when expanded.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use ExpandableTextClamp for long product descriptions, changelogs, commit notes, or AI summaries where scanning a compact 2-to-6-line preview improves page density while keeping full copy one click away.',
      },
      {
        guidance: true,
        description:
          'Tune charThreshold (20..2000) alongside lines (2..6) so short passages omit the redundant toggle cleanly even across server-rendered and headless layouts.',
      },
      {
        guidance: false,
        description:
          'Pass raw HTML markup expecting formatted rich text; ExpandableTextClamp intentionally renders text as literal React text to eliminate XSS risks.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Disclosure Button & Content Linkage',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Native <button type="button"> with aria-expanded, aria-controls linked to the text paragraph id, and keyboard-only prism-focus-ring styling',
        description:
          'Provides full keyboard activation via Enter and Space, clearly announces expanded or collapsed state to assistive technologies, and hides decorative chevrons and fade gradients with aria-hidden="true".',
      },
      {
        name: 'Safe Literal Text & Zero Redundant Controls',
        criterion: '1.3.1 Info and Relationships & Security',
        requirement:
          'Renders plain text safely without dangerouslySetInnerHTML and omits the toggle button whenever text.trim().length <= charThreshold',
        description:
          'Prevents XSS payloads from executing and keeps short passages free of extraneous tab stops or non-functional disclosure buttons.',
      },
    ],
  },
  props: [
    {
      name: 'text',
      type: 'string',
      defaultValue: 'required',
      description: 'Plain text content rendered literally inside the optical glass typography container.',
    },
    {
      name: 'lines',
      type: '2 | 3 | 4 | 5 | 6',
      defaultValue: '3',
      description: 'Maximum number of visible lines applied via -webkit-line-clamp and lineClamp while collapsed.',
    },
    {
      name: 'charThreshold',
      type: 'number',
      defaultValue: '140',
      description:
        'Trimmed character length threshold above which clamping and the expand/collapse toggle activate (clamped to 20..2000).',
    },
    {
      name: 'expanded',
      type: 'boolean',
      defaultValue: 'undefined',
      description: 'Controlled expansion state; pair with onExpandedChange for external state management.',
    },
    {
      name: 'defaultExpanded',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial expansion state when operating in uncontrolled mode.',
    },
    {
      name: 'onExpandedChange',
      type: '(expanded: boolean) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the next boolean state whenever the user toggles expansion.',
    },
    {
      name: 'expandLabel',
      type: 'string',
      defaultValue: "'Read more'",
      description: 'Toggle button label rendered while text is collapsed.',
    },
    {
      name: 'collapseLabel',
      type: 'string',
      defaultValue: "'Show less'",
      description: 'Toggle button label rendered while text is expanded.',
    },
    {
      name: 'showFadeMask',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Displays a soft optical bottom fade gradient via --prism-surface while clamped.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ExpandableTextClamp\n  lines={3}\n  text="Refractor Optical Glass surfaces combine calibrated specular highlights, caustic ambient dispersion, and strict WCAG contrast ratios across light and dark themes. Long descriptions clamp cleanly to three lines with a soft bottom fade and expand smoothly on demand."\n/>`,
    `<ExpandableTextClamp\n  lines={2}\n  charThreshold={80}\n  expandLabel="Expand summary"\n  collapseLabel="Collapse summary"\n  showFadeMask={false}\n  text="Custom thresholds and labels let product teams tailor progressive disclosure for release notes, audit logs, and compact mobile cards."\n/>`,
  ],
};

export default docs;
