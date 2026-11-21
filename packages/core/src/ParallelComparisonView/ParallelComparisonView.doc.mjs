export const docs = {
  name: 'ParallelComparisonView',
  displayName: 'Parallel Comparison View',
  group: 'Multi-Agent & Orchestration',
  category: 'multi-agent',
  keywords: [
    'parallel',
    'comparison',
    'candidates',
    'winner',
    'multi-agent',
    'orchestration',
    'benchmark',
    'ab-test',
    'evaluation',
    'copy',
  ],
  usage: {
    description:
      'Optical-glass side-by-side candidate evaluator for parallel model or multi-agent runs, pairing a prism-slab header (title, candidate count, active winner pill, and resilient Copy Winner button with 1600ms emerald confirmation) with responsive prism-crystal candidate cards, tabular telemetry badges, literal prism-well output panels, and controlled or uncontrolled winner selection.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide stable candidate ids alongside finite latencyMs, tokens, and 0..100 score telemetry so operators can weigh quality against speed and token cost.',
      },
      {
        guidance: true,
        description:
          'Use winnerId with onSelectWinner when synchronizing the chosen candidate to upstream workflow state, or defaultWinnerId for lightweight local evaluation.',
      },
      {
        guidance: false,
        description:
          'Pre-escape HTML inside candidate output strings; ParallelComparisonView renders every candidate response strictly as literal text with whitespace-pre-wrap.',
      },
    ],
    accessibility: [
      {
        name: 'Toggleable Winner Selection Semantics',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement: 'Native button controls with aria-pressed state and keyboard-only prism-focus-ring',
        description:
          'Communicates selected vs unselected candidate status via explicit aria-pressed attributes and clear Selected Winner / Select Winner copy rather than ring highlight color alone.',
      },
      {
        name: 'Polite Winner & Clipboard Announcements',
        criterion: '4.1.3 Status Messages',
        requirement: 'role="status" aria-live="polite" aria-atomic="true" live region with disabled Copy Winner guard',
        description:
          'Announces both winner selection changes and clipboard copy confirmation politely while disabling Copy Winner until a valid candidate is selected.',
      },
    ],
  },
  props: [
    {
      name: 'candidates',
      type: 'ComparisonCandidate[]',
      defaultValue: 'required',
      description: 'Ordered list of parallel candidate responses ({ id, label, model?, output, latencyMs?, tokens?, score? }).',
    },
    {
      name: 'winnerId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Controlled selected winner candidate id.',
    },
    {
      name: 'defaultWinnerId',
      type: 'string',
      defaultValue: 'undefined',
      description: 'Initial selected winner candidate id in uncontrolled mode (defaults to empty string).',
    },
    {
      name: 'onSelectWinner',
      type: '(candidate: ComparisonCandidate) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the chosen ComparisonCandidate when Select Winner is activated.',
    },
    {
      name: 'onCopyWinner',
      type: '(candidate: ComparisonCandidate) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the active winning ComparisonCandidate when Copy Winner is activated.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Parallel Candidate Comparison'",
      description: 'Header heading displayed in the optical comparison slab.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ParallelComparisonView\n  title="Code Synthesis Evaluation"\n  defaultWinnerId="cand-a"\n  candidates={[\n    {\n      id: 'cand-a',\n      label: 'Agent Alpha',\n      model: 'gemini-2.5-pro',\n      output: 'Refactored pipeline into 3 pure stages with zero allocations.',\n      latencyMs: 840,\n      tokens: 1120,\n      score: 96,\n    },\n    {\n      id: 'cand-b',\n      label: 'Agent Beta',\n      model: 'claude-3.7-sonnet',\n      output: 'Split pipeline into modular helpers with inline memoization.',\n      latencyMs: 1420,\n      tokens: 1480,\n      score: 91,\n    },\n  ]}\n  onSelectWinner={(candidate) => console.warn('winner', candidate.id)}\n  onCopyWinner={(candidate) => console.warn('copied', candidate.id)}\n/>`,
  ],
};
