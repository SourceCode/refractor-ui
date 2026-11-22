export const docs = {
  name: 'DesktopWidgetFrame',
  displayName: 'Desktop Widget Frame',
  group: 'Desktop Surfaces & Native System Dialogs',
  category: 'desktop-surfaces-dialogs',
  keywords: [
    'desktop-widget',
    'gadget',
    'widget-frame',
    'desktop-surface',
    'telemetry',
    'weather',
    'sticky-notes',
    'clock',
    'pin',
    'lock',
    'inline-config',
    'resizable',
  ],
  usage: {
    description:
      'Lightweight persistent optical-glass container pinned to the desktop layer with responsive size presets (`Small 1×1`, `Medium 2×1`, `Large 2×2`), compact lock/pin/refresh/edit/remove chrome, safe two-step inline removal confirmation, an inline configuration editor, and five built-in or custom widget modes (`telemetry`, `weather`, `notes`, `clock`, `custom`). Built strictly on `--prism-*` semantic tokens and `color-mix()` optical accents so Alabaster, Obsidian, Amethyst, Emerald Tide, and Solar Prism themes preserve contrast across every gadget size.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Lock mission-critical widgets (`locked` / `defaultLocked`) once positioned on the desktop layer so accidental clicks cannot resize, unpin, edit sticky notes, or trigger removal.',
      },
      {
        guidance: true,
        description:
          'Use `onConfigChange`, `onSizeChange`, `onRefresh`, and `onRemove` with controlled props when persisting user desktop widget layouts to local storage or a workspace backend.',
      },
      {
        guidance: false,
        description:
          'Do not bypass the built-in two-step remove confirmation with destructive one-click delete overlays; desktop gadgets live alongside active work and require intentional confirmation.',
      },
    ],
    accessibility: [
      {
        name: 'Toggle Press State, Expanded Configuration & Polite Refresh Announcements',
        criterion: '4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Applies `aria-pressed` to Pin, Lock, Size, Tone, and Refresh cadence toggles, `aria-expanded` + `aria-controls` to the Edit Widget trigger, `role="alertdialog"` to the inline removal guard, and a polite `role="status" aria-live="polite"` announcer for refresh and state transitions',
        description:
          'Communicates widget pin, lock, edit, refresh, and removal state changes clearly to screen readers without hijacking focus or causing destructive accidental deletion.',
      },
      {
        name: 'IME-Safe Input Handling & Keyboard-Only Optical Focus Rings',
        criterion: '2.1.1 Keyboard & 2.4.7 Focus Visible',
        requirement:
          'Guards keyboard events on buttons, the title input (`Escape` closes edit mode, `Enter` commits), and the sticky-note `<textarea>` with `event.nativeEvent.isComposing` and uses keyboard-only `.prism-focus-ring`',
        description:
          'Prevents CJK/IME composition commits from accidentally closing edit mode or triggering controls while keeping focus rings visible exclusively for keyboard navigation.',
      },
    ],
  },
  props: [
    {
      name: 'kind',
      type: "'telemetry' | 'weather' | 'notes' | 'clock' | 'custom'",
      defaultValue: "'telemetry'",
      description:
        'Selects one of four deterministic built-in desktop gadget views (`telemetry`, `weather`, `notes`, `clock`) or renders `children` directly in `custom` mode.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Controlled widget title displayed in the top chrome bar (trimmed and bounded to 64 characters).',
    },
    {
      name: 'defaultTitle',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Initial uncontrolled widget title. Falls back to the canonical label for the active `kind` when omitted or blank.',
    },
    {
      name: 'size',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: 'undefined',
      description:
        'Controlled desktop grid size preset (`sm` 1×1, `md` 2×1, `lg` 2×2), reflected onto `data-size`.',
    },
    {
      name: 'defaultSize',
      type: "'sm' | 'md' | 'lg'",
      defaultValue: "'md'",
      description: 'Initial uncontrolled grid size preset.',
    },
    {
      name: 'tone',
      type: "'primary' | 'info' | 'success' | 'warning'",
      defaultValue: 'undefined',
      description:
        'Controlled semantic accent tone mapped strictly to `--prism-*-main` optical tokens.',
    },
    {
      name: 'defaultTone',
      type: "'primary' | 'info' | 'success' | 'warning'",
      defaultValue: "'primary'",
      description: 'Initial uncontrolled semantic accent tone.',
    },
    {
      name: 'locked',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled lock flag preventing size preset changes, unpinning, sticky-note editing, and widget removal.',
    },
    {
      name: 'defaultLocked',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Initial uncontrolled lock state.',
    },
    {
      name: 'pinned',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled desktop pin state reflected via the `Pinned` optical badge and `data-pinned`.',
    },
    {
      name: 'defaultPinned',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Initial uncontrolled desktop pin state.',
    },
    {
      name: 'refreshSeconds',
      type: '0 | 15 | 60 | 300',
      defaultValue: 'undefined',
      description:
        'Controlled refresh cadence in seconds (`0` Manual, `15` 15s, `60` 1m, `300` 5m).',
    },
    {
      name: 'defaultRefreshSeconds',
      type: '0 | 15 | 60 | 300',
      defaultValue: '60',
      description: 'Initial uncontrolled refresh cadence in seconds.',
    },
    {
      name: 'lastUpdatedLabel',
      type: 'string',
      defaultValue: "'Just now'",
      description:
        'Deterministic timestamp label rendered in the footer metadata strip.',
    },
    {
      name: 'onSizeChange',
      type: '(size: DesktopWidgetSize) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when the user selects a new size preset inside the inline configuration editor.',
    },
    {
      name: 'onConfigChange',
      type: '(config: DesktopWidgetConfig) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with the full `DesktopWidgetConfig` snapshot when clicking `Done` in edit mode or toggling Pin / Lock.',
    },
    {
      name: 'onRefresh',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback fired when the user triggers the header `Refresh` action.',
    },
    {
      name: 'onRemove',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback fired only after the user confirms the two-step inline removal prompt.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description:
        'Rendered directly inside the optical body for `kind="custom"`, or as optional supplementary footer content for built-in widget kinds.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all chrome controls, inline editor fields, and sticky-note input, setting `aria-disabled="true"` on the root frame.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom properties and inline optical style overrides merged cleanly onto the root `prism-slab`.',
    },
  ],
  examples: [
    `<DesktopWidgetFrame\n  kind="telemetry"\n  defaultSize="md"\n  defaultTone="primary"\n  onConfigChange={(config) => console.warn('Widget config:', config)}\n  onRefresh={() => console.warn('Widget refreshed')}\n/>`,
    `<DesktopWidgetFrame\n  kind="weather"\n  defaultSize="lg"\n  defaultTone="info"\n  defaultLocked={true}\n/>`,
    `<DesktopWidgetFrame kind="custom" title="Build Pipeline" size="md" tone="success">\n  <div className="text-xs font-mono">All 14 checks passing</div>\n</DesktopWidgetFrame>`,
  ],
};

export default docs;
