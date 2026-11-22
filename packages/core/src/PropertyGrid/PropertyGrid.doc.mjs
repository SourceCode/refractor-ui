export const docs = {
  name: 'PropertyGrid',
  displayName: 'Property Grid',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'property',
    'grid',
    'inspector',
    'metadata',
    'key-value',
    'definition-list',
    'dl',
    'dt',
    'dd',
    'object',
    'attributes',
    'copy',
    'searchable',
    'density',
  ],
  usage: {
    description:
      'Sculpted optical-glass prism-slab key-value inspector panel housing semantic `<dl>` (`<dt>` label + `<dd>` value/control) rows separated by `--prism-divider` hairlines. Supports 1- or 2-column responsive layouts with `spanFull` rows, compact and comfortable densities, horizontal and stacked orientations, arbitrary ReactNode value controls (badges, switches, pills, links), optional monospace formatting, resilient inline clipboard copy with transient 1600ms emerald confirmation, optional live label/hint search filtering, and a clean `role="status"` empty state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide `copyValue` and `monospace: true` for identifiers, commit SHAs, container digests, and endpoints so operators can inspect and copy exact values with one click.',
      },
      {
        guidance: true,
        description:
          'Use `columns={2}` with `spanFull: true` on wide entries (such as long URIs, JSON badges, or inline control clusters) to balance multi-column inspector density across desktop and mobile viewports.',
      },
      {
        guidance: false,
        description:
          'Hardcode raw hex or rgb colors inside custom ReactNode values; rely on Refractor `--prism-*` tokens and utility classes (`prism-emerald`, `prism-crystal`, `prism-well`) for light/dark theme parity.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Description List & Region Landmark',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'role="region" linked via aria-labelledby, semantic <dl>/<dt>/<dd> property rows, and role="status" empty/no-matches states',
        description:
          'Associates every field label and optional hint with its value or interactive control using native HTML description list semantics so screen readers navigate metadata cleanly.',
      },
      {
        name: 'IME-Safe Keyboard Controls & Polite Copy Announcements',
        criterion: '2.1.1 Keyboard & 4.1.3 Status Messages',
        requirement:
          'Keyboard-only .prism-focus-ring outlines, IME-safe Escape clear and Enter/Space copy activation (!e.nativeEvent.isComposing), and aria-live="polite" copy confirmation',
        description:
          'Announces clipboard copy confirmations politely while ensuring inline search filtering and copy actions never hijack IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'entries',
      type: 'ReadonlyArray<PropertyGridEntry>',
      defaultValue: '6 realistic deployment inspector metadata items',
      description:
        'Ordered list of property entries (`{ id, label, value, copyValue?, hint?, spanFull?, monospace? }`). Pass `[]` to display the `role="status"` empty state.',
    },
    {
      name: 'columns',
      type: '1 | 2',
      defaultValue: '1',
      description:
        'Responsive grid column count; `2` switches to `grid-cols-1 sm:grid-cols-2` with support for `entry.spanFull`.',
    },
    {
      name: 'density',
      type: "'compact' | 'comfortable'",
      defaultValue: "'comfortable'",
      description: 'Controls panel padding and vertical row spacing density.',
    },
    {
      name: 'layout',
      type: "'horizontal' | 'stacked'",
      defaultValue: "'horizontal'",
      description:
        'Positions labels alongside values on `sm:`+ viewports (`horizontal`) or stacks labels above values (`stacked`).',
    },
    {
      name: 'searchable',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Renders a compact recessed filter input in the header that filters entries case-insensitively by `label` and `hint`.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Object Metadata Inspector'",
      description: 'Visible inspector panel heading linked to the region via `aria-labelledby`.',
    },
    {
      name: 'onCopyEntry',
      type: '(entry: PropertyGridEntry, copiedText: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the entry and copied plain-text payload whenever a row copy button is activated.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<PropertyGrid searchable columns={2} />`,
    `<PropertyGrid\n  title="Service Endpoint"\n  density="compact"\n  layout="stacked"\n  entries={[\n    { id: 'endpoint', label: 'Cluster URL', value: 'https://edge.refractor.dev', copyValue: 'https://edge.refractor.dev', monospace: true, spanFull: true },\n    { id: 'tls', label: 'mTLS Mode', value: <span className="prism-emerald px-2 py-0.5 rounded-full text-xs">Strict</span>, hint: 'Client certificate verification' },\n  ]}\n  onCopyEntry={(entry, text) => console.warn(entry.id, text)}\n/>`,
  ],
};

export default docs;
