export const docs = {
  name: 'WindowUtilityControls',
  displayName: 'Window Utility Controls',
  group: 'Window Anatomy & Controls',
  category: 'window-anatomy-controls',
  keywords: [
    'window',
    'utility',
    'titlebar',
    'pin',
    'always-on-top',
    'shade',
    'roll-up',
    'opacity',
    'translucency',
    'glass',
    'desktop',
    'hud',
  ],
  usage: {
    description:
      'Compact optical-glass titlebar utility cluster inside a `prism-slab` shell providing Always-on-Top Pin toggling (`--prism-primary-main` elevation ring & status pill), Window Shade roll-up (`--prism-info-main` status pill collapsing the sample body to a floating titlebar), live Background Opacity translucency slider (`[30..100]`, step `2`), quick presets (`50%`, `75%`, `100%`), Reset action, and polite `aria-live` status announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `WindowUtilityControls` on floating inspector panes, shader monitors, HUDs, and companion desktop tools where users need Always-on-Top pinning, instant window-shade roll-up, or live translucency blending.',
      },
      {
        guidance: true,
        description:
          'Pass controlled `value` and `onChange` when syncing pin z-layer elevation, shaded height collapse, and window surface opacity with a multi-window desktop shell manager.',
      },
      {
        guidance: false,
        description:
          'Do not rely on `opacityPct` below `30%` for critical readable controls; `WindowUtilityControls` sanitizes `NaN`, `Infinity`, and out-of-range inputs cleanly into `[30..100]` to preserve legibility.',
      },
    ],
    accessibility: [
      {
        name: 'Toggle Press State, Shade Expansion & Range Slider Semantics',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `aria-pressed` on Pin, Shade, and Opacity preset buttons, `aria-expanded` / `aria-controls` on the Window Shade roll-up toggle, and a labeled `<input type="range" min={30} max={100} step={2}>` with `aria-valuetext`',
        description:
          'Allows keyboard and assistive technology users to inspect and adjust Always-on-Top, Window Shade collapse, opacity translucency, and Reset controls with IME-safe key handling.',
      },
      {
        name: 'Polite Live Status Updates & Keyboard-Only Focus Rings',
        criterion: '2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Announces pin, shade, opacity, and reset changes in an `aria-live="polite"` status region and uses `:focus-visible` (`prism-focus-ring`) for keyboard focus indication',
        description:
          'Ensures screen-reader users receive concise, non-intrusive feedback on every titlebar utility change while avoiding pointer focus clutter.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Shader Monitor'",
      description:
        'Window title displayed inside the optical titlebar and linked to the region landmark via `aria-labelledby`.',
    },
    {
      name: 'value',
      type: 'WindowUtilityState',
      defaultValue: 'undefined',
      description:
        'Controlled utility state `{ pinned, shaded, opacityPct }`. Out-of-bounds or non-finite `opacityPct` values are sanitized into `[30..100]`.',
    },
    {
      name: 'defaultValue',
      type: 'Partial<WindowUtilityState>',
      defaultValue: '{ pinned: false, shaded: false, opacityPct: 92 }',
      description:
        'Initial uncontrolled utility state overrides (`pinned`, `shaded`, `opacityPct`).',
    },
    {
      name: 'showSampleBody',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Displays the translucent sample window body below the titlebar whenever `shaded` is `false`.',
    },
    {
      name: 'onChange',
      type: '(state: WindowUtilityState) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever Pin, Window Shade, Opacity slider/presets, or Reset updates the utility state.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables Pin, Shade, Opacity range slider, quick presets, and Reset button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<WindowUtilityControls\n  title="Optical Shader Monitor"\n  defaultValue={{ pinned: false, shaded: false, opacityPct: 92 }}\n/>`,
    `<WindowUtilityControls\n  title="Telemetry Overlay"\n  value={{ pinned: true, shaded: false, opacityPct: 75 }}\n  onChange={(next) => console.warn(next)}\n/>`,
  ],
};

export default docs;
