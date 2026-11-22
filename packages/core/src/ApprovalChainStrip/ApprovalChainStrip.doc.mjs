export const docs = {
  name: 'ApprovalChainStrip',
  displayName: 'Approval Chain Strip',
  group: 'Enterprise Workflows, Data Ops & API Tooling',
  category: 'enterprise-ops-api',
  keywords: [
    'approval',
    'chain',
    'workflow',
    'sign-off',
    'signoff',
    'reviewer',
    'sequential',
    'parallel',
    'release',
    'gate',
    'enterprise',
    'governance',
    'audit',
    'compliance',
  ],
  usage: {
    description:
      'Multi-stage sequential or parallel sign-off approval workflow strip housed in a sculpted optical-glass prism-slab container. Displays a mode badge (Sequential Chain or Parallel Sign-Off), semantic overall chain verdict badge (Chain Approved, Rejected, Changes Requested, or Pending X/N Approved), compact progress bar, responsive flex-wrap reviewer cards with status-tinted initials avatar rings and directional optical connectors, strict sequential prior-stage gating, an interactive reviewer action bar with decision note input and aria-live="polite" status announcements, and a role="status" empty state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use mode="sequential" for ordered release or compliance gates (such as Security Review -> Design Systems -> Staff Engineering -> Release Manager) so downstream approvers cannot sign off before prerequisite stages are approved.',
      },
      {
        guidance: true,
        description:
          'Switch to mode="parallel" when cross-functional reviewers can audit and approve independently without blocking one another.',
      },
      {
        guidance: false,
        description:
          'Trust client-side sequential gating alone for production release authorization; always mirror stage ordering and reviewer identity checks on the server inside your onDecision handler.',
      },
    ],
    accessibility: [
      {
        name: 'Roving Keyboard Navigation & IME-Safe Decision Controls',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'ArrowLeft, ArrowRight, Home, and End navigation across reviewer cards with !e.nativeEvent.isComposing IME guards, native button semantics with aria-pressed, and keyboard-only .prism-focus-ring outlines',
        description:
          'Allows keyboard users to inspect every reviewer stage and record decisions smoothly without interfering with IME text composition inside the reviewer decision note input.',
      },
      {
        name: 'Non-Color Status Signifiers, Progress Semantics & Live Announcements',
        criterion: '1.4.1 Use of Color & 4.1.3 Status Messages',
        requirement:
          'role="region" linked via aria-labelledby, role="progressbar" with aria-valuemin/max/now/valuetext, icon + text status pills and verdict badges, role="status" empty state, and aria-live="polite" decision announcement banner',
        description:
          'Communicates chain verdicts, sequential gating blocks, and newly recorded reviewer decisions clearly to assistive technologies without relying solely on color tokens.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Production Release Approval Chain'",
      description: 'Visible heading rendered in the optical slab header and linked via aria-labelledby.',
    },
    {
      name: 'mode',
      type: "'sequential' | 'parallel'",
      defaultValue: "'sequential'",
      description:
        'Sequential mode numbers stages and blocks approving a stage until all earlier stages are approved; parallel mode permits independent decisions.',
    },
    {
      name: 'reviewers',
      type: 'ReadonlyArray<ApprovalReviewerNode>',
      defaultValue: 'undefined',
      description: 'Controlled array of reviewer stage nodes.',
    },
    {
      name: 'defaultReviewers',
      type: 'ReadonlyArray<ApprovalReviewerNode>',
      defaultValue:
        '4-stage enterprise release chain (Security Review approved, Design Systems approved, Staff Engineering pending, Release Manager pending)',
      description: 'Initial reviewer stage nodes when running in uncontrolled mode.',
    },
    {
      name: 'onDecision',
      type: '(reviewerId: string, status: ApprovalChainStatus, comment: string, nextReviewers: ReadonlyArray<ApprovalReviewerNode>) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired whenever Approve, Request Changes, Reject, or Reset Pending is executed for the selected reviewer.',
    },
    {
      name: 'readOnly',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Hides the interactive reviewer action bar while preserving stage inspection.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables reviewer cards, the decision note input, and all action buttons.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<ApprovalChainStrip\n  onDecision={(reviewerId, status, comment) => console.warn(reviewerId, status, comment)}\n/>`,
    `<ApprovalChainStrip\n  title="Schema Migration Sign-Off"\n  mode="parallel"\n  defaultReviewers={[\n    { id: 'dba', name: 'Hannah Wu', role: 'Database Lead', initials: 'HW', status: 'approved', updatedAt: '10:05 UTC' },\n    { id: 'sre', name: 'Devon Brooks', role: 'Site Reliability', initials: 'DB', status: 'pending' },\n  ]}\n/>`,
  ],
};

export default docs;
