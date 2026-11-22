export const docs = {
  name: 'CalloutAdmonition',
  displayName: 'Callout Admonition',
  group: 'Document, Knowledge & Spreadsheet Tools',
  category: 'document-knowledge-spreadsheet',
  keywords: [
    'callout',
    'admonition',
    'note',
    'tip',
    'warning',
    'danger',
    'abstract',
    'summary',
    'aside',
    'documentation',
    'knowledge',
    'collapsible',
  ],
  usage: {
    description:
      'Semantic optical-glass documentation callout and admonition box built on a sculpted prism-slab surface with a left vertical luminous accent stripe, tinted icon medallion, crisp kind badge, optional trailing header actionSlot, and controlled or uncontrolled collapsible body disclosure powered strictly by semantic --prism-* tokens.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Match the semantic kind to reader urgency: use note for neutral context, tip for productivity guidance, warning for migration caveats, danger for irreversible or security-critical alerts (emits role="alert"), and abstract for TL;DR document summaries.',
      },
      {
        guidance: true,
        description:
          'Enable collapsible for lengthy supplementary callouts such as migration checklists or architectural digests so readers can collapse details while keeping the header, kind badge, and actionSlot visible.',
      },
      {
        guidance: false,
        description:
          'Overuse danger admonitions for routine tips or informational notices; reserving danger for genuinely destructive or critical warnings preserves visual hierarchy and avoids alert fatigue.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Landmark & Alert Roles',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'Renders <aside role="note"> for note, tip, warning, and abstract kinds and upgrades to <aside role="alert"> for danger admonitions, linked via aria-labelledby unless caller provides aria-label',
        description:
          'Communicates supplemental documentation structure cleanly to assistive technologies and elevates critical danger warnings to live alert announcements without extra wrapper markup.',
      },
      {
        name: 'WAI-ARIA Disclosure Header & Non-Nested Actions',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Collapsible mode renders a native <button type="button"> with aria-expanded, aria-controls linked to the body region, keyboard-only prism-focus-ring styling, and keeps actionSlot outside the button',
        description:
          'Guarantees full Enter/Space keyboard operability, prevents invalid nested interactive elements when actionSlot contains links or buttons, and hides collapsed body content from tab order via the HTML hidden attribute.',
      },
    ],
  },
  props: [
    {
      name: 'kind',
      type: "'note' | 'tip' | 'warning' | 'danger' | 'abstract'",
      defaultValue: "'note'",
      description:
        'Semantic admonition variant controlling the accent stripe token, tinted icon medallion, default heading, kind badge, Lucide icon, and ARIA role.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Note' | 'Tip' | 'Warning' | 'Danger' | 'Summary'",
      description:
        'Optional custom heading overriding the canonical default heading for the active kind.',
    },
    {
      name: 'icon',
      type: 'ReactNode',
      defaultValue: 'Info | Lightbulb | AlertTriangle | ShieldAlert | FileText',
      description:
        'Optional custom icon node replacing the semantic Lucide icon inside the tinted medallion.',
    },
    {
      name: 'collapsible',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Enables an interactive disclosure toggle button with rotating ChevronDown in the header.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled expansion state when collapsible is enabled; pair with onOpenChange.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial expansion state for uncontrolled collapsible admonitions.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the next boolean state whenever the collapsible header is toggled.',
    },
    {
      name: 'actionSlot',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description:
        'Optional trailing link, badge, or action button placed in the header alongside the title.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Body content displayed inside the sculpted prism-slab admonition.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<CalloutAdmonition kind="tip" title="Keyboard Navigation">\n  Press Cmd+K anywhere in the documentation workspace to jump directly to a component API or token reference.\n</CalloutAdmonition>`,
    `<CalloutAdmonition\n  kind="danger"\n  title="Irreversible Migration"\n  collapsible\n  defaultOpen={false}\n  actionSlot={<a href="#backup-guide">Backup guide</a>}\n>\n  Running the schema compaction command rewrites historical revision snapshots. Export a verified backup before continuing.\n</CalloutAdmonition>`,
    `<CalloutAdmonition kind="abstract">\n  This RFC introduces token-driven optical glass admonitions with zero raw color literals and full light/dark cascade parity.\n</CalloutAdmonition>`,
  ],
};

export default docs;
