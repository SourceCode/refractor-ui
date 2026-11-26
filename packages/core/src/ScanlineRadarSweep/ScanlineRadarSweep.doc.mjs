export const docs = {
  name: 'ScanlineRadarSweep',
  displayName: 'Scanline / Radar Sweep',
  group: 'Loaders, Skeletons & Data Transitions',
  category: 'loaders-skeletons-transitions',
  keywords: ['scanline', 'radar', 'sweep', 'beam', 'security-scan', 'indexing', 'analysis', 'loader'],
  usage: {
    description:
      'Thin luminous optical beam sweeping across a preview canvas, image, or code block in `vertical`, `horizontal`, or `radar` modes to signal active analysis, indexing, or security scanning. Powered purely by compositor-thread transform animations with automatic reduced-motion and `performanceMode="max"` pauses.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wrap code blocks, uploaded media, or visual diffs with `active={isScanning}` so users clearly see live analysis progress without obscuring the underlying artifact.',
      },
      {
        guidance: false,
        description:
          'Avoid leaving `active={true}` once indexing or scanning finishes; toggle `active={false}` to remove the overlay cleanly.',
      },
    ],
    accessibility: [
      {
        name: 'ARIA Busy Region & Polite Scan Status',
        criterion: '2.3.3 Animation from Interactions & 4.1.3 Status Messages',
        requirement:
          'Marks the scanned region `aria-busy={active}`, announces status via `role="status" aria-live="polite"`, marks the beam `aria-hidden="true"`, and disables sweep animation under `prefers-reduced-motion: reduce`.',
        description:
          'Keeps background analysis clearly communicated without blocking interaction or violating motion preferences.',
      },
    ],
  },
  props: [
    { name: 'active', type: 'boolean', defaultValue: 'true', description: 'Toggles the active scanning beam and status pill.' },
    { name: 'mode', type: "'vertical' | 'horizontal' | 'radar'", defaultValue: "'vertical'", description: 'Beam trajectory geometry.' },
    { name: 'tone', type: "'cyan' | 'prism' | 'emerald' | 'amber'", defaultValue: "'cyan'", description: 'Semantic optical beam hue.' },
    { name: 'speedSeconds', type: 'number', defaultValue: '2.2', description: 'Beam sweep cycle duration in seconds (0.8–8).' },
    { name: 'statusLabel', type: 'string', defaultValue: "'Scanning optical surface…'", description: 'Polite status caption displayed while active.' },
  ],
};
