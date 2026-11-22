export const docs = {
  name: 'WindowTitlebar',
  displayName: 'Window Titlebar',
  group: 'Desktop OS & Windowing Metaphors',
  category: 'desktop-os-windowing',
  keywords: [
    'window',
    'titlebar',
    'chrome',
    'desktop',
    'macos',
    'windows',
    'traffic-lights',
    'minimize',
    'maximize',
    'draggable',
    'shell',
  ],
  usage: {
    description:
      'Sculpted optical-glass desktop window shell featuring a frosted `prism-crystal` titlebar inside an elevated `prism-slab` frame. Supports macOS left-aligned semantic traffic lights (`--prism-error-main`, `--prism-warning-main`, `--prism-success-main`) and Windows right-aligned Minimize, Maximize/Restore, and Close icon controls, unsaved document indicator dot, double-click Maximize/Restore toggling, pointer-drag delta telemetry (`onDragMove`, `data-dragging`) with automatic window listener cleanup, active/unfocused specular sheen dimming, collapsible window body on minimize, trailing toolbar slot, and polite screen-reader state announcements.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `WindowTitlebar` for desktop-class workspace surfaces, floating IDE panes, terminal shells, and interactive preview windows that benefit from native OS windowing affordances.',
      },
      {
        guidance: true,
        description:
          'Match `chromeStyle` (`macos` or `windows`) to the target desktop metaphor and wire `onDragMove` to translate floating window containers cleanly via incremental `(dx, dy)` pixel deltas.',
      },
      {
        guidance: false,
        description:
          'Do not nest blocking confirmation alerts inside a minimized `WindowTitlebar`; use `ModalDialog` for modal confirmations that require an immediate decision.',
      },
    ],
    accessibility: [
      {
        name: 'Semantic Window Controls & State Announcements',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value & 4.1.3 Status Messages',
        requirement:
          'Landmark region linked via aria-labelledby/aria-describedby, IME-safe keyboard-activatable Minimize / Maximize / Restore / Close controls with explicit aria-labels and aria-pressed/aria-expanded states, plus an aria-live="polite" status region for window transitions',
        description:
          'Ensures keyboard-only and screen-reader users can identify the window title, unsaved modified status, and control states while receiving polite announcements when minimizing, maximizing, restoring, or closing.',
      },
      {
        name: 'Keyboard-Only Optical Focus Rings & Non-Blocking Drag',
        criterion: '2.4.7 Focus Visible & 2.5.1 Pointer Gestures',
        requirement:
          'Controls use :focus-visible (`prism-focus-ring`), drag handlers ignore interactive descendants and secondary pointer buttons, and double-click maximize is mirrored by an explicit Maximize/Restore button',
        description:
          'Prevents accidental window dragging when clicking buttons or trailing toolbar pills and ensures all window state operations remain accessible without pointer-only gestures.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Refractor Studio — Main.tsx'",
      description:
        'Primary document or application heading displayed in the optical titlebar.',
    },
    {
      name: 'subtitle',
      type: 'string',
      defaultValue: 'undefined',
      description:
        'Optional document path, repository branch, or workspace subtitle linked via aria-describedby.',
    },
    {
      name: 'modified',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Renders a subtle optical unsaved-changes indicator dot beside the title along with screen-reader text.',
    },
    {
      name: 'chromeStyle',
      type: "'macos' | 'windows'",
      defaultValue: "'macos'",
      description:
        'Selects left-aligned macOS semantic traffic lights or right-aligned Windows Minimize/Maximize/Close icon buttons.',
    },
    {
      name: 'windowState',
      type: "'normal' | 'minimized' | 'maximized'",
      defaultValue: 'undefined',
      description: 'Controlled window presentation state.',
    },
    {
      name: 'defaultWindowState',
      type: "'normal' | 'minimized' | 'maximized'",
      defaultValue: "'normal'",
      description: 'Initial uncontrolled window presentation state.',
    },
    {
      name: 'active',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Reflects window focus state; dims optical specular sheen and caustic dispersion when `false`.',
    },
    {
      name: 'draggable',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Enables pointer dragging on the titlebar header with live `data-dragging` telemetry and window listener cleanup.',
    },
    {
      name: 'onDragMove',
      type: '(dx: number, dy: number) => void',
      defaultValue: 'undefined',
      description:
        'Invoked on pointer move during dragging with incremental horizontal and vertical pixel deltas.',
    },
    {
      name: 'onMinimize',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the Minimize window control is triggered.',
    },
    {
      name: 'onMaximizeToggle',
      type: "(nextState: 'normal' | 'maximized') => void",
      defaultValue: 'undefined',
      description:
        'Callback fired when Maximize/Restore toggles via control button or titlebar double-click.',
    },
    {
      name: 'onClose',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the Close window control is triggered.',
    },
    {
      name: 'trailingSlot',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description:
        'Optional trailing toolbar pills or status controls rendered inside the titlebar.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description:
        'Optional window body content rendered inside the optical chrome frame; collapses cleanly when minimized.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and optical style overrides.',
    },
  ],
  examples: [
    `<WindowTitlebar\n  title="Refractor Studio — Main.tsx"\n  subtitle="~/projects/refractor-ui"\n  modified\n>\n  <p>Optical glass editor viewport ready.</p>\n</WindowTitlebar>`,
    `<WindowTitlebar\n  chromeStyle="windows"\n  title="Telemetry Console"\n  subtitle="main · 12ms"\n  trailingSlot={<span>Live</span>}\n  onDragMove={(dx, dy) => { void dx; void dy; }}\n/>`,
  ],
};

export default docs;
