export const docs = {
  name: 'PrismaticCursorHalo',
  displayName: 'Prismatic Cursor Halo',
  group: 'Dynamic Gradient & AI-Glow FX',
  category: 'gradient-ai-glow-fx',
  keywords: ['cursor', 'halo', 'spotlight', 'radial-gradient', 'hover-glow', 'glass', 'fx'],
  usage: {
    description:
      'Cursor-tracking radial spotlight surface that softly illuminates underlying glass borders, bevels, and content as the pointer moves across the workspace. Updates `--prism-halo-x`/`--prism-halo-y` via a requestAnimationFrame-coalesced DOM ref for zero React re-renders during pointer movement.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Wrap dashboard cards, toolbar decks, or glass bento grids to provide tactile spatial lighting feedback without triggering React reconciliation on every pointermove.',
      },
      {
        guidance: false,
        description:
          'Avoid stacking multiple large radius halos directly inside one another; prefer a single workspace halo or per-card spotlight.',
      },
    ],
    accessibility: [
      {
        name: 'Decorative Lighting & Keyboard Focus Parity',
        criterion: '1.1.1 Non-text Content & 2.1.1 Keyboard',
        requirement:
          'Spotlight layers carry `aria-hidden="true"` and `pointer-events-none`, and keyboard focus inside the surface gracefully centers the halo without altering text contrast.',
        description:
          'Ensures screen readers and keyboard-only users experience clear semantic focus without pointer-only lockouts.',
      },
    ],
  },
  props: [
    { name: 'radiusPx', type: 'number', defaultValue: '240', description: 'Spotlight radius in pixels (clamped 80–520).' },
    { name: 'intensity', type: 'number', defaultValue: '0.78', description: 'Spotlight peak opacity from 0 to 1.' },
    { name: 'spectrum', type: "'prismatic' | 'aurora' | 'solar' | 'emerald'", defaultValue: "'prismatic'", description: 'Token-driven radial color spectrum.' },
    { name: 'borderGlow', type: 'boolean', defaultValue: 'true', description: 'Illuminates the outer glass border perimeter near the cursor.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables pointer tracking and spotlight lighting.' },
  ],
};
