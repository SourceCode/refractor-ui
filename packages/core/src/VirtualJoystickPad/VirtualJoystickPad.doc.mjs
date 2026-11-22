export const docs = {
  name: 'VirtualJoystickPad',
  displayName: 'Virtual Joystick Pad',
  group: 'Hardware, IoT & Tactile Surfaces',
  category: 'hardware-iot-tactile',
  keywords: [
    'joystick',
    'thumbstick',
    'gimbal',
    'dpad',
    'd-pad',
    'controller',
    'gamepad',
    'robotics',
    'drone',
    'ptz',
    'camera',
    'iot',
    'hardware',
    'tactile',
    'spring-return',
    'deadzone',
    'compass',
    'vector',
  ],
  usage: {
    description:
      'Sculpted optical-glass circular spring-return analog thumbstick and discrete 5-way cruciform tactile D-Pad controller housed inside a prism-slab shell. Features unit-circle vector projection with deadzone snapping, compass heading (0°=North, 90°=East, 180°=South, 270°=West) and 8-way cardinal direction resolution, a responsive 220x220 recessed gimbal SVG with concentric calibration rings and luminous token-driven vector ray, spring-return vs hold latch toggle, IME-safe Arrow/WASD + Shift fine keyboard steering, and an aria-live="polite" telemetry footer displaying tabular X, Y, MAG, HDG, and DIR pill readouts.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use VirtualJoystickPad for PTZ camera gimbals, robotics teleoperation, UAV/drone thruster decks, CNC jog tables, or dual-mode game/HMI controllers requiring seamless switching between analog vector steering and discrete 5-way D-Pad pulses.',
      },
      {
        guidance: true,
        description:
          'Keep springReturn enabled (default) for momentary thruster or PTZ velocity inputs that must self-center on pointer release, or toggle Spring Return off to latch persistent heading vectors.',
      },
      {
        guidance: false,
        description:
          'Assume raw client or external coordinates stay within the unit circle; VirtualJoystickPad automatically clamps magnitudes onto the unit disk, sanitizes NaN/Infinity values to 0, and snaps micro-jitter inside the configured deadzone back to CENTER.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Slider & Tactile D-Pad Semantics with IME-Safe Steering',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Analog gimbal exposes role="slider" with aria-valuemin=0, aria-valuemax=100, aria-valuenow (magnitude %), full vector aria-valuetext, Arrow/WASD ±0.25 nudging, Shift ±0.10 fine nudging, and Home/Space centering; D-Pad exposes 5 labeled toggle buttons with aria-pressed and Enter/Space activation',
        description:
          'Guards all keyboard handlers against active IME composition (!e.nativeEvent.isComposing), removes disabled controls from tab order, and preserves keyboard-only .prism-focus-ring visibility.',
      },
      {
        name: 'Leak-Free Window Pointer Lifecycle & Live Telemetry Announcements',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Detaches window pointermove/pointerup/pointercancel listeners on release, cancel, mode switch, disable, and unmount while streaming X, Y, MAG, HDG, and DIR changes in an aria-live="polite" footer',
        description:
          'Guarantees zero dangling global pointer listeners during rapid mode switches or mid-drag unmounts while keeping assistive technologies synchronized with vector telemetry.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Optical Gimbal & D-Pad Controller'",
      description: 'Panel header title and accessible region/control name prefix.',
    },
    {
      name: 'value',
      type: '{ x: number; y: number }',
      defaultValue: 'undefined',
      description: 'Controlled 2D vector coordinate normalized onto the unit circle.',
    },
    {
      name: 'defaultValue',
      type: '{ x: number; y: number }',
      defaultValue: '{ x: 0, y: 0 }',
      description: 'Initial uncontrolled 2D vector coordinate.',
    },
    {
      name: 'mode',
      type: "'analog' | 'dpad'",
      defaultValue: 'undefined',
      description: 'Controlled input mode selecting Analog Stick gimbal or Tactile D-Pad.',
    },
    {
      name: 'defaultMode',
      type: "'analog' | 'dpad'",
      defaultValue: "'analog'",
      description: 'Initial uncontrolled input mode.',
    },
    {
      name: 'springReturn',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'When true, releasing the analog thumbstick or D-Pad pointer automatically springs back to { x: 0, y: 0 }.',
    },
    {
      name: 'deadzone',
      type: 'number',
      defaultValue: '0.08',
      description: 'Inner radial deadzone threshold clamped to [0..0.45]; vectors below this radius snap to CENTER.',
    },
    {
      name: 'onChange',
      type: '(vector: JoystickVector) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the normalized JoystickVector { x, y, magnitude, angleDeg, direction } changes.',
    },
    {
      name: 'onModeChange',
      type: '(mode: JoystickControlMode) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when toggling between Analog Stick and Tactile D-Pad modes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables analog drag, keyboard steering, D-Pad buttons, mode switcher, spring toggle, and center button.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<VirtualJoystickPad\n  title="PTZ Camera Gimbal"\n  onChange={(vector) => console.warn(vector)}\n/>`,
    `<VirtualJoystickPad\n  title="Rover Thruster Deck"\n  value={vector}\n  mode={mode}\n  springReturn={false}\n  deadzone={0.12}\n  onChange={(next) => setVector({ x: next.x, y: next.y })}\n  onModeChange={(nextMode) => setMode(nextMode)}\n/>`,
  ],
};

export default docs;
