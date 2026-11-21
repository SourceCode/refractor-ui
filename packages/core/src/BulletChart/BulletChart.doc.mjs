export const docs = {
  name: 'BulletChart',
  displayName: 'Bullet Chart',
  group: 'KPI, Progress & Telemetry Visuals',
  category: 'kpi-telemetry-charts',
  keywords: [
    'bullet',
    'bullet-chart',
    'kpi',
    'target',
    'performance',
    'benchmark',
    'variance',
    'qualitative-ranges',
    'telemetry',
    'chart',
  ],
  usage: {
    description:
      'Optical-glass KPI bullet chart comparing actual performance against vertical target threshold markers across stepped qualitative performance bands (Poor, Satisfactory, Good), powered exclusively by --prism-* CSS custom properties with optional variance delta badges and an interactive recessed telemetry inspection strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide explicit qualitative ranges ([poorMax, satisfactoryMax, goodMax]) and a concise unit suffix (such as "k", "%", or "ms") so executives can immediately judge performance band standing and exact target attainment.',
      },
      {
        guidance: true,
        description:
          'Keep showVariance enabled when comparing actuals against quarterly or SLA targets so on-target metrics surface in prism-emerald glass while lagging metrics highlight amber or rose variance.',
      },
      {
        guidance: false,
        description:
          'Hardcode hex or rgb colors or rely on raw unvalidated numbers; non-finite, negative, unsorted, and zero-target entries are sanitized safely without division by zero or NaN.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Metric Row Selection & Live Telemetry Strip',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each KPI bullet row is a native button with aria-pressed, descriptive aria-label, keyboard-only prism-focus-ring, IME-safe Enter/Space activation, and an aria-live="polite" recessed telemetry strip',
        description:
          'Keyboard and assistive-technology users can traverse every KPI row, activate selection, and hear qualitative band classification (Below Plan, On Track, Exceeding Target), actual, target, and achievement percentage.',
      },
      {
        name: 'Token-Driven Stepped Contrast & Non-Color Redundancy',
        criterion: '1.4.3 Contrast (Minimum) & 1.4.1 Use of Color',
        requirement:
          'Renders stepped qualitative bands via --prism-text-secondary and --prism-divider opacities paired with explicit text readouts, signed variance badges, and band classification labels',
        description:
          'All bullet tracks, threshold markers, variance pills, and telemetry readouts adapt seamlessly across light, dark, and custom Refractor themes without relying solely on color.',
      },
    ],
  },
  props: [
    {
      name: 'items',
      type: 'BulletChartItem[]',
      defaultValue: 'required',
      description:
        'Ordered array of { id, label, subtitle?, actual, target, max?, ranges?, unit?, tone? } KPI metrics rendered as horizontal bullet tracks.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Target Performance Bullet Chart'",
      description: 'Heading displayed in the optical card header and linked to the chart region.',
    },
    {
      name: 'showVariance',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Controls visibility of signed actual-vs-target percentage variance badges on each row.',
    },
    {
      name: 'onSelectItem',
      type: '(item: BulletChartItem, achievementPct: number) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the selected BulletChartItem and its rounded target achievement percentage.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<BulletChart\n  title="Q4 Revenue & SLA Targets"\n  items={[\n    { id: 'arr', label: 'Net New ARR', subtitle: 'Enterprise USD', actual: 275, target: 250, max: 300, ranges: [150, 225, 300], unit: 'k', tone: 'primary' },\n    { id: 'retention', label: 'Gross Retention', actual: 91, target: 95, max: 100, ranges: [75, 90, 100], unit: '%', tone: 'emerald' },\n    { id: 'onboarding', label: 'Onboarding Velocity', actual: 38, target: 80, max: 100, ranges: [50, 80, 100], unit: '%', tone: 'rose' },\n  ]}\n/>`,
  ],
};
