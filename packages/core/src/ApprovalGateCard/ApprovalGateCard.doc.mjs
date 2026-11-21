export const docs = {
  name: 'ApprovalGateCard',
  displayName: 'Approval Gate Card (HITL)',
  group: 'AI Agent Execution & Control',
  category: 'ai-agent-control',
  keywords: [
    'approval',
    'hitl',
    'human-in-the-loop',
    'gate',
    'agent',
    'permission',
    'risk',
    'confirm',
    'reject',
    'tool-call',
    'safety',
  ],
  usage: {
    description:
      'Blocking human-in-the-loop optical-glass slab card for authorizing high-impact AI agent actions, pairing a semantic risk badge (low, medium, high, critical), monospace action identifier, read-only and inline-editable parameter wells backed by a prototype-safe Map, optional rejection rationale input, Edit & Approve change detection, and resolved decision pills.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Mark only safe, bounded arguments (such as target branch or batch size) as editable: true while keeping destructive identifiers read-only for clear auditability.',
      },
      {
        guidance: true,
        description:
          'Pass controlled decision state when synchronizing approval status across multi-tab sessions or server-persisted agent runs.',
      },
      {
        guidance: false,
        description:
          'Auto-approve high or critical risk tool calls without displaying the exact monospace actionName and parameter values to the operator.',
      },
    ],
    accessibility: [
      {
        name: 'Named Landmark Region & Live Decision Status',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement: 'role="region" linked via aria-labelledby and role="status" aria-live="polite" decision pills',
        description:
          'Exposes the approval gate as a named region tied to its heading and announces approved or rejected resolution pills politely via a live status landmark.',
      },
      {
        name: 'Explicit Parameter Labels & IME-Safe Rejection Input',
        criterion: '3.3.2 Labels or Instructions & 2.1.1 Keyboard',
        requirement: 'Associated htmlFor labels for editable wells, !e.nativeEvent.isComposing guard, and prism-focus-ring',
        description:
          'Associates every editable parameter input with its visible label and guards Enter submission on the rejection reason input against IME composition.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: 'required',
      description: 'Heading summarizing the requested human-in-the-loop approval.',
    },
    {
      name: 'actionName',
      type: 'string',
      defaultValue: 'required',
      description: 'Monospace tool or action identifier awaiting confirmation.',
    },
    {
      name: 'description',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Optional prose explaining the impact or rationale of the pending action.',
    },
    {
      name: 'riskLevel',
      type: "'low' | 'medium' | 'high' | 'critical'",
      defaultValue: "'medium'",
      description: 'Semantic risk badge tier mapped to --prism-* status tokens.',
    },
    {
      name: 'parameters',
      type: 'ApprovalParameter[]',
      defaultValue: '[]',
      description: 'List of read-only or editable action parameters displayed in the gate card.',
    },
    {
      name: 'onApprove',
      type: '(updatedParams: Record<string, string>) => void',
      defaultValue: 'undefined',
      description: 'Invoked on approval with a prototype-safe record of final parameter key/value pairs.',
    },
    {
      name: 'onReject',
      type: '(reason?: string) => void',
      defaultValue: 'undefined',
      description: 'Invoked on rejection with the trimmed optional rejection reason or undefined.',
    },
    {
      name: 'decision',
      type: "'approved' | 'rejected'",
      defaultValue: 'undefined',
      description: 'Controlled decision state that renders the semantic resolution pill and hides action buttons.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all editable parameter inputs, rejection reason input, and action buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ApprovalGateCard\n  title="Deploy Production Migration"\n  actionName="db.apply_migration"\n  description="Applies schema migration 2026_11_orders_idx to the primary cluster."\n  riskLevel="high"\n  parameters={[\n    { key: 'cluster', label: 'Cluster', value: 'prod-us-east-1' },\n    { key: 'timeoutMs', label: 'Lock Timeout (ms)', value: '5000', editable: true },\n  ]}\n  onApprove={(params) => console.warn('Approved:', params)}\n  onReject={(reason) => console.warn('Rejected:', reason)}\n/>`,
  ],
};
