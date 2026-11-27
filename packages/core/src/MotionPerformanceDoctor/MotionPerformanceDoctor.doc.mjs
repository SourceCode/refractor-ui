export const docs = {
  name: 'MotionPerformanceDoctor',
  displayName: 'Motion Performance Doctor',
  group: 'Animated Media & Motion Tooling',
  category: 'animated-media-tooling',
  keywords: ['motion-score', 'performance', 'audit', 'fps', 'layout-thrash', 'doctor', 'profiler'],
  usage: {
    description:
      'Profiles animation source code and live runtime frame timings to compute an A–F `MotionScore` (0–100), flagging layout-thrashing properties, animated backdrop-blur churn, and dropped frames.',
    bestPractices: [
      {
        guidance: true,
        description: 'Feed live `requestAnimationFrame` delta samples into `frameDurationsMs` during QA to verify 60–120fps headroom under glassmorphism.',
      },
      {
        guidance: false,
        description: 'Resolve all `critical` layout-thrashing findings before shipping new motion surfaces.',
      },
    ],
    accessibility: [
      {
        name: 'Textual Severity & Score Announcement',
        criterion: '1.4.1 Use of Color',
        requirement:
          'Conveys grade, numeric score, severity, and remediation guidance with explicit text rather than color badges alone.',
        description: 'Readable by screen readers and color-vision-deficient developers.',
      },
    ],
  },
  props: [
    { name: 'sourceCode', type: 'string', defaultValue: "''", description: 'CSS/TSX snippet to statically inspect.' },
    { name: 'frameDurationsMs', type: 'ReadonlyArray<number>', defaultValue: 'undefined', description: 'Live frame duration samples in milliseconds.' },
    { name: 'title', type: 'string', defaultValue: "'MotionScore Performance Doctor'", description: 'Audit card heading.' },
  ],
};
