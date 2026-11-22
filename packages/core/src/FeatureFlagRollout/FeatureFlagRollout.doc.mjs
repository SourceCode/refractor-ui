export const docs = {
  name: 'FeatureFlagRollout',
  displayName: 'Feature Flag Rollout',
  group: 'Enterprise Workflows, Data Ops & API Tooling',
  category: 'enterprise-ops-api',
  keywords: [
    'feature-flag',
    'rollout',
    'release-management',
    'kill-switch',
    'canary',
    'progressive-delivery',
    'audience-targeting',
    'environments',
    'devops',
    'enterprise',
    'toggle',
    'percentage',
  ],
  usage: {
    description:
      'Sculpted optical-glass release-management feature flag and gradual rollout card built on a prism-slab shell with a monospace flag key pill, live semantic overall status indicator (Killed, Active, Partial Rollout, Standby), emergency Kill Switch / Restore Flag safety lock, per-environment accessible switches (Dev, Staging, Prod), segmented --prism-primary-main gradual percentage slider with quick presets (0%, 10%, 25%, 50%, 100%), interactive audience targeting segment rules with IME-safe rule creation, and an aria-live="polite" status summary footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use the Kill Switch during production incidents to immediately lock Prod OFF and clamp traffic rollout to 0% while keeping Dev and Staging available for diagnostics.',
      },
      {
        guidance: true,
        description:
          'Start progressive rollouts with targeted cohorts such as Internal Staff and Beta Cohort before ramping production traffic across 10%, 25%, 50%, and 100% milestones.',
      },
      {
        guidance: false,
        description:
          'Treat client-side feature flag UI toggles as the sole authorization barrier; persist flag state changes through authenticated server-side release pipelines via onChange.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Switches, Toggle Buttons & Native Range Slider',
        criterion: '4.1.2 Name, Role, Value & 2.1.1 Keyboard',
        requirement:
          'Per-environment role="switch" controls with aria-checked, aria-pressed on Kill Switch, rollout presets, and audience rules, plus a native labeled <input type="range"> with keyboard-only .prism-focus-ring outlines',
        description:
          'Ensures screen readers and keyboard operators can inspect and adjust every environment toggle, rollout percentage, kill-switch lock, and audience targeting segment without pointer focus clutter.',
      },
      {
        name: 'IME-Safe Rule Input & Polite Live Status Feedback',
        criterion: '4.1.3 Status Messages & 3.3.1 Error Identification',
        requirement:
          'Guards Enter submission with !e.nativeEvent.isComposing, surfaces blank/duplicate rule validation with aria-invalid + aria-live="polite", renders Kill Switch alerts with role="alert", and exposes a polite live summary footer',
        description:
          'Prevents hijacking active IME composition commits while announcing rollout mutations, kill-switch locks, and validation messages cleanly to assistive technology.',
      },
    ],
  },
  props: [
    {
      name: 'flagKey',
      type: 'string',
      defaultValue: "'prism.optical_raytracer_v2'",
      description: 'Monospace machine-readable feature flag key displayed in the header pill.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Raytracer Pipeline'",
      description: 'Visible card heading associated with the region landmark via aria-labelledby.',
    },
    {
      name: 'description',
      type: 'string',
      defaultValue:
        "'Progressive raytraced refraction shaders and specular caustic pipeline across deployment tiers.'",
      description: 'Optional release description rendered beneath the title; pass an empty string to omit.',
    },
    {
      name: 'value',
      type: 'FeatureFlagRolloutState',
      defaultValue: 'undefined',
      description:
        'Controlled rollout state containing environments, clamped rolloutPct (0..100), killed lock flag, and audienceRules.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<FeatureFlagRolloutState>',
      defaultValue: 'Dev/Staging/Prod ON, 25% rollout, 3 default audience rules',
      description: 'Initial partial rollout state merged with defaults when used in uncontrolled mode.',
    },
    {
      name: 'onChange',
      type: '(state: FeatureFlagRolloutState) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the sanitized next FeatureFlagRolloutState after every change.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all environment switches, rollout slider/presets, kill switch, and rule controls.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<FeatureFlagRollout\n  flagKey="prism.optical_raytracer_v2"\n  title="Optical Raytracer Pipeline"\n  onChange={(next) => console.warn(next.rolloutPct, next.killed)}\n/>`,
    `<FeatureFlagRollout\n  flagKey="checkout.instant_settlement"\n  title="Instant Settlement Engine"\n  description="Progressive canary rollout for real-time ledger settlement."\n  defaultValue={{\n    environments: { dev: true, staging: true, prod: true },\n    rolloutPct: 50,\n    killed: false,\n    audienceRules: [\n      { id: 'internal-staff', label: 'Internal Staff', enabled: true },\n      { id: 'canary-merchants', label: 'Canary Merchants', enabled: true },\n    ],\n  }}\n/>`,
  ],
};

export default docs;
