export const docs = {
  name: 'ScrollShadowArea',
  displayName: 'Scroll Shadow Area',
  group: 'Foundational Primitives & Micro-Utilities',
  category: 'foundational-micro-utilities',
  keywords: [
    'scroll',
    'shadow',
    'overflow',
    'fade',
    'gradient',
    'viewport',
    'container',
    'edge',
    'scrollable',
    'region',
    'utility',
  ],
  usage: {
    description:
      'Sculpted optical-glass scroll container built on a prism-slab bezel and recessed prism-well frame with dynamic pointer-events-none edge-fade gradients (--prism-bg-start / --prism-divider), live data-shadow-top/bottom/left/right root state reflection, keyboard-focusable scrollable region, automatic mount/scroll/resize measurement with clean listener teardown, and optional Back-to-Top / Jump-to-End optical glass controls.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide a descriptive viewportLabel (such as "Audit log entries" or "Metric matrix") so keyboard and screen-reader users know what content resides inside the scrollable region.',
      },
      {
        guidance: true,
        description:
          'Choose axis="vertical", axis="horizontal", or axis="both" to match your content layout so only relevant overflow edge gradients and scrollbars appear.',
      },
      {
        guidance: false,
        description:
          'Set shadowSizePx outside 12..64 expecting unguarded giant overlays; ScrollShadowArea clamps shadowSizePx to 12..64px and normalizes invalid maxHeight inputs back to 260px.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard-Scrollable Landmark Region',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement: 'tabIndex={0}, role="region", descriptive aria-label, and keyboard-only prism-focus-ring',
        description:
          'Allows keyboard-only users to tab directly into overflowing content and scroll via Arrow, PageUp/PageDown, Home, and End keys with a keyboard-only focus ring.',
      },
      {
        name: 'Non-Obstructive Edge Overlays & Accessible Jump Controls',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement: 'aria-hidden pointer-events-none gradient fades and disabled-guarded Back-to-Top / Jump-to-End buttons',
        description:
          'Marks all decorative fade overlays aria-hidden="true" and pointer-events-none so clicks and assistive tech pass straight through, while optional scroll buttons expose explicit aria-labels and disabled edge states.',
      },
    ],
  },
  props: [
    {
      name: 'axis',
      type: "'vertical' | 'horizontal' | 'both'",
      defaultValue: "'vertical'",
      description: 'Scroll direction and active optical edge-fade axes.',
    },
    {
      name: 'maxHeight',
      type: 'number | string',
      defaultValue: '260',
      description: 'Maximum height of the scrollable viewport in pixels or any valid CSS length.',
    },
    {
      name: 'shadowSizePx',
      type: 'number',
      defaultValue: '28',
      description: 'Depth of the optical edge-fade gradients in pixels, clamped to 12..64.',
    },
    {
      name: 'showScrollButtons',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Displays a subtle Back-to-Top / Jump-to-End optical glass pill whenever vertical overflow exists.',
    },
    {
      name: 'onEdgeChange',
      type: '(edges: ScrollShadowEdgeState) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked whenever the active top, bottom, left, or right overflow edge state changes.',
    },
    {
      name: 'viewportLabel',
      type: 'string',
      defaultValue: "'Scrollable content region'",
      description: 'Accessible aria-label assigned to the inner keyboard-scrollable region.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Scrollable content rendered inside the viewport.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ScrollShadowArea maxHeight={240} showScrollButtons viewportLabel="Recent telemetry events">\n  <ul className="divide-y p-3 space-y-2">\n    {items.map((item) => (\n      <li key={item.id}>{item.label}</li>\n    ))}\n  </ul>\n</ScrollShadowArea>`,
    `<ScrollShadowArea axis="both" maxHeight="20rem" shadowSizePx={36} onEdgeChange={(edges) => console.warn(edges)}>\n  <div className="w-[900px] p-4">Wide two-dimensional optical grid content</div>\n</ScrollShadowArea>`,
  ],
};

export default docs;
