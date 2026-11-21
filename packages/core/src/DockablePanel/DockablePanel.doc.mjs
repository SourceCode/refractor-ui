export const docs = {
  name: 'DockablePanel',
  displayName: 'Dockable / Floating Panel',
  group: 'Layout & Workspace Controls',
  category: 'layout-workspace',
  keywords: ['dockable', 'floating', 'panel', 'window', 'workspace', 'inspector', 'draggable'],
  usage: {
    description:
      'Modular optical glass workspace window built with an elevated prism-slab frame and frosted prism-crystal titlebar that transitions seamlessly between edge-docked zones (left, right, bottom, center) and draggable floating mode with edge-snap detection, keyboard positioning, and collapsible body.',
    bestPractices: [
      { guidance: true, description: 'Use DockablePanel for inspectors, tool palettes, and auxiliary workspace consoles that users may reposition or float.' },
      { guidance: true, description: 'Supply concise titles and optional headerActions for panel-specific commands without overcrowding the crystal titlebar.' },
      { guidance: false, description: 'Use DockablePanel for blocking destructive confirmations; prefer ModalDialog instead.' },
    ],
    accessibility: [
      {
        name: 'Landmark labeling, collapse state & keyboard dragging',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'section aria-labelledby, aria-expanded toggle, aria-pressed dock buttons, Arrow key positioning',
        description: 'Links the panel title/subtitle to the section landmark, exposes aria-expanded on the collapse toggle, aria-pressed on dock-zone controls, and supports 16px Arrow-key movement on the floating drag handle.',
      },
    ],
  },
  props: [
    { name: 'title', type: 'string', defaultValue: 'required', description: 'Title rendered in the frosted crystal header and used for accessible labeling.' },
    { name: 'subtitle', type: 'string', defaultValue: 'undefined', description: 'Optional subtitle linked via aria-describedby.' },
    { name: 'dockPosition', type: "'left' | 'right' | 'bottom' | 'center' | 'floating'", defaultValue: 'undefined', description: 'Controlled dock zone or floating mode.' },
    { name: 'defaultDockPosition', type: "'left' | 'right' | 'bottom' | 'center' | 'floating'", defaultValue: "'right'", description: 'Initial uncontrolled dock position.' },
    { name: 'onDockPositionChange', type: '(position: DockPosition) => void', defaultValue: 'undefined', description: 'Called when dock position changes.' },
    { name: 'floatingPosition', type: 'FloatingCoords', defaultValue: 'undefined', description: 'Controlled { x, y } floating coordinates in pixels.' },
    { name: 'defaultFloatingPosition', type: 'FloatingCoords', defaultValue: '{ x: 40, y: 40 }', description: 'Initial uncontrolled floating coordinates.' },
    { name: 'onFloatingPositionChange', type: '(pos: FloatingCoords) => void', defaultValue: 'undefined', description: 'Called when floating coordinates update via drag or keyboard.' },
    { name: 'collapsed', type: 'boolean', defaultValue: 'undefined', description: 'Controlled collapsed state.' },
    { name: 'defaultCollapsed', type: 'boolean', defaultValue: 'false', description: 'Initial uncontrolled collapsed state.' },
    { name: 'onCollapsedChange', type: '(collapsed: boolean) => void', defaultValue: 'undefined', description: 'Called when collapse toggles.' },
    { name: 'onClose', type: '() => void', defaultValue: 'undefined', description: 'Optional close handler; renders the Close button when provided.' },
    { name: 'headerActions', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional custom controls rendered in the titlebar.' },
    { name: 'edgeSnap', type: 'boolean', defaultValue: 'true', description: 'Snaps back to left, right, or bottom dock zone when dragged near viewport edges.' },
    { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'Panel body content.' },
  ],
  examples: [
    `<DockablePanel\n  title="Optical Inspector"\n  subtitle="Refraction & Dispersion"\n  defaultDockPosition="right"\n  onClose={handleClose}\n>\n  <p>Inspect blur radius, specular sheen, and caustic layers.</p>\n</DockablePanel>`,
  ],
};
