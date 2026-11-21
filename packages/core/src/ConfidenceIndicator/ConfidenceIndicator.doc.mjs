export const docs = {
  name: 'ConfidenceIndicator',
  displayName: 'Confidence Indicator (Calibration Pill & Rationale Popover)',
  group: 'AI Context, Memory & Configuration',
  category: 'ai-context-memory',
  keywords: [
    'confidence',
    'calibration',
    'verified',
    'trust',
    'uncertainty',
    'rationale',
    'grounding',
    'ai',
    'pill',
    'popover',
  ],
  usage: {
    description:
      'Inline optical confidence pill displaying calibrated level (Verified, High, Moderate, or dashed Needs Review) and tabular percentage score, with an expandable prism-slab rationale popover, optional source count badge, and Mark Verified action.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pair ConfidenceIndicator with concise rationale copy and sourceCount so users understand why an answer is rated high, moderate, or needs-review.',
      },
      {
        guidance: true,
        description:
          'Provide onMarkVerified in human-in-the-loop review workflows so reviewers can promote unverified AI outputs into a verified state.',
      },
      {
        guidance: false,
        description:
          'Rely solely on raw percentages without explicit semantic level cues; ConfidenceIndicator combines distinct icons, labels, border styles, and --prism-* color tokens.',
      },
    ],
    accessibility: [
      {
        name: 'Expandable Rationale Dialog & Keyboard Dismissal',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'aria-expanded, aria-haspopup="dialog", aria-controls, Escape and outside-click dismissal',
        description:
          'The pill trigger exposes expansion state via aria-expanded and links to the rationale popover via aria-controls. Pressing Escape (when not IME-composing) closes the popover and restores focus to the trigger.',
      },
      {
        name: 'Non-Color-Only Confidence Differentiation',
        criterion: '1.4.1 Use of Color',
        requirement: 'Distinct icon, text label, score percentage, and dashed border for needs-review',
        description:
          'Every confidence tier combines a unique icon, explicit text label, tabular score, and (for needs-review) a dashed border rather than conveying status by color alone.',
      },
    ],
  },
  props: [
    {
      name: 'score',
      type: 'number',
      defaultValue: 'required',
      description: 'Numeric confidence score clamped safely to 0..100 (non-finite inputs fall back to 0).',
    },
    {
      name: 'level',
      type: "'verified' | 'high' | 'moderate' | 'needs-review'",
      defaultValue: 'derived from score',
      description: 'Optional explicit confidence level override when verified is false.',
    },
    {
      name: 'verified',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Forces the effective level to verified with solid emerald optical styling.',
    },
    {
      name: 'rationale',
      type: 'string',
      defaultValue: 'level default explanation',
      description: 'Optional explanation rendered inside the recessed optical well in the popover.',
    },
    {
      name: 'sourceCount',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Optional count of corroborating sources displayed as a badge when finite and > 0.',
    },
    {
      name: 'onMarkVerified',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Optional callback that renders a Mark Verified primary button when the indicator is not yet verified.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial open state of the rationale popover.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ConfidenceIndicator\n  score={74}\n  sourceCount={3}\n  rationale="Corroborated by 3 repository ADRs, with one pending benchmark confirmation."\n  onMarkVerified={() => setVerified(true)}\n/>`,
  ],
};
