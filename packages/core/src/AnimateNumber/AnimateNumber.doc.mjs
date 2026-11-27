export const docs = {
  name: 'AnimateNumber',
  displayName: 'Animate Number',
  group: 'Animated Media & Motion Tooling',
  category: 'animated-media-tooling',
  keywords: ['number', 'counter', 'kpi', 'ticker', 'audio-db', 'tokens', 'tabular-nums'],
  usage: {
    description:
      'Smoothly rolls and spring-interpolates changing numeric values for KPI cards, audio dB meters, token counters, and live market tickers with `tabular-nums` alignment and zero layout shift.',
    bestPractices: [
      {
        guidance: true,
        description: 'Specify fixed `decimals` on live telemetry readouts so digit widths never jitter during rapid updates.',
      },
      {
        guidance: false,
        description: 'Leave `live="off"` on high-frequency (> 1Hz) tickers to avoid flooding screen readers.',
      },
    ],
    accessibility: [
      {
        name: 'Tabular Figures & Calm Instant Snap',
        criterion: '2.3.3 Animation from Interactions',
        requirement:
          'Uses `font-variant-numeric: tabular-nums` and snaps directly to the target value under `reducedMotion="calm"`.',
        description: 'Eliminates layout jitter and excessive visual motion.',
      },
    ],
  },
  props: [
    { name: 'value', type: 'number', defaultValue: 'required', description: 'Target numeric value to interpolate toward.' },
    { name: 'decimals', type: 'number', defaultValue: '0', description: 'Fixed decimal precision (0–6).' },
    { name: 'locale', type: 'string', defaultValue: "'en-US'", description: 'BCP-47 locale passed to Intl.NumberFormat.' },
    { name: 'prefix', type: 'string', defaultValue: "''", description: 'Optional prefix such as "$" or "+".' },
    { name: 'suffix', type: 'string', defaultValue: "''", description: 'Optional suffix such as " dB" or " tokens".' },
    { name: 'durationMs', type: 'number', defaultValue: '420', description: 'Spring interpolation duration in milliseconds.' },
  ],
};
