export const docs = {
  name: 'BrushRangeScrubber',
  displayName: 'Brush Range Scrubber',
  group: 'Chart Chrome & Interactive Controls',
  category: 'chart-chrome-controls',
  keywords: [
    'brush',
    'range',
    'scrubber',
    'timeline',
    'window',
    'pan',
    'zoom',
    'overview',
    'sparkline',
    'slider',
    'chart-chrome',
    'controls',
  ],
  usage: {
    description:
      'Interactive optical-glass timeline brush and pan scrubber featuring a miniature overview sparkline with semantic --prism-* gradient fill, shaded out-of-range scrims, dual start/end range handles, a draggable/keyboard-pannable selection window, quick range presets (All, Last 50%, Last 25%), and an aria-live recessed selection readout.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pair BrushRangeScrubber directly beneath detail time-series charts using controlled range + onRangeChange so slicing updates the primary visualization in real time.',
      },
      {
        guidance: true,
        description:
          'Configure minSpan to guarantee downstream charts always receive enough observations for meaningful trend or moving-average rendering.',
      },
      {
        guidance: false,
        description:
          'Hardcode hex or rgb stroke/fill colors; choose a semantic tone prop so sparkline gradients, scrims, handles, and focus outlines inherit active --prism-* theme tokens.',
      },
    ],
    accessibility: [
      {
        name: 'Dual WAI-ARIA Brush Handles',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement:
          'Start and end brush handles expose role="slider" with live aria-valuemin, aria-valuemax, aria-valuenow, and aria-valuetext',
        description:
          'Both handles enforce minSpan bounds, support ArrowLeft/ArrowRight/ArrowUp/ArrowDown/Home/End/PageUp/PageDown stepping, guard against IME composition, and display keyboard-only prism-focus-ring outlines.',
      },
      {
        name: 'Keyboard-Pannable Selection Window',
        criterion: '2.1.1 Keyboard',
        requirement:
          'Draggable middle window exposes role="group" with aria-label="Pan selected range" and ArrowLeft/ArrowRight/Home/End keyboard panning',
        description:
          'Allows keyboard users to shift the active time window left or right while strictly preserving the current index span.',
      },
      {
        name: 'Live Range Readout & Empty Status',
        criterion: '4.1.3 Status Messages',
        requirement:
          'Recessed prism-well readout announces active label boundaries and point counts via aria-live="polite", with a role="status" fallback when fewer than 2 finite points exist',
        description:
          'Screen-reader users receive immediate quantitative feedback as presets, handles, or pan gestures adjust the active slice.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'BrushPoint[]',
      defaultValue: 'required',
      description:
        'Ordered array of { label, value } points plotted in the miniature sparkline overview. Non-finite values are filtered safely; at least 2 finite points are required.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Timeline Brush Scrubber'",
      description: 'Visible card heading and accessible region title.',
    },
    {
      name: 'range',
      type: 'BrushIndexRange',
      defaultValue: 'undefined',
      description: 'Controlled inclusive index selection tuple [startIndex, endIndex].',
    },
    {
      name: 'defaultRange',
      type: 'BrushIndexRange',
      defaultValue: '[0, data.length - 1]',
      description: 'Initial inclusive index selection tuple for uncontrolled usage.',
    },
    {
      name: 'minSpan',
      type: 'number',
      defaultValue: '1',
      description:
        'Minimum index separation enforced between start and end handles, clamped to 1..maxSpan.',
    },
    {
      name: 'tone',
      type: "'primary' | 'secondary' | 'emerald' | 'amber' | 'rose'",
      defaultValue: "'primary'",
      description:
        'Semantic --prism-* CSS token palette applied to sparkline strokes, gradient fill, selection tint, and handle accents.',
    },
    {
      name: 'height',
      type: 'number',
      defaultValue: '96',
      description: 'Miniature overview SVG height in pixels, clamped to 64..200.',
    },
    {
      name: 'onRangeChange',
      type: '(range: BrushIndexRange, slice: BrushPoint[]) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever presets, handle dragging, window panning, or keyboard controls change the selected range.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline style overrides.',
    },
  ],
  examples: [
    `<BrushRangeScrubber\n  title="Throughput Window"\n  data={[\n    { label: '00:00', value: 120 },\n    { label: '04:00', value: 145 },\n    { label: '08:00', value: 210 },\n    { label: '12:00', value: 265 },\n    { label: '16:00', value: 240 },\n    { label: '20:00', value: 195 },\n  ]}\n  defaultRange={[1, 4]}\n  minSpan={1}\n  tone="secondary"\n  onRangeChange={(nextRange, slice) => setVisibleSlice(slice)}\n/>`,
    `<BrushRangeScrubber\n  title="Latency Brush"\n  data={latencySeries}\n  range={brushRange}\n  minSpan={2}\n  tone="emerald"\n  height={112}\n  onRangeChange={(nextRange) => setBrushRange(nextRange)}\n/>`,
  ],
};
