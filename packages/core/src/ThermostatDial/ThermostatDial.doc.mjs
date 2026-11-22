export const docs = {
  name: 'ThermostatDial',
  displayName: 'Thermostat Dial',
  group: 'Hardware, IoT & Tactile Surfaces',
  category: 'hardware-iot-tactile',
  keywords: [
    'thermostat',
    'dial',
    'climate',
    'temperature',
    'hvac',
    'iot',
    'hardware',
    'smart-home',
    'tactile',
    'radial',
    'cooling',
    'heating',
    'eco',
    'fahrenheit',
    'celsius',
    'slider',
  ],
  usage: {
    description:
      'Radial touch-and-drag and keyboard optical-glass climate control thermostat dial inside a sculpted prism-slab card. Features a canonical Fahrenheit internal scale with zero-drift °F/°C conversion, semantic optical color states (cooling in --prism-info-main, heating in --prism-primary-main, eco in --prism-success-main, off in --prism-text-muted), a responsive 240x240 SVG 270-degree circular arc sweep (135deg to 405deg) with fine radial ticks, ambient temperature reference indicator, glowing draggable thumb handle, central prism-crystal bezel readout, fine -/+ stepper buttons, mode selector pills, °F/°C unit toggle, and an aria-live="polite" climate summary.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Store and persist climate setpoints in canonical Fahrenheit via onTargetChange so switching between °F and °C in the UI never introduces rounding drift across toggles.',
      },
      {
        guidance: true,
        description:
          'Provide live ambientTempF sensor telemetry alongside targetTempF so users can immediately see whether the system is actively cooling, heating, or in standby.',
      },
      {
        guidance: false,
        description:
          'Use ThermostatDial for arbitrary unipolar parameters like audio gain or percentages; prefer RotaryDial for generic knobs and reserve ThermostatDial for HVAC and thermal setpoint control.',
      },
    ],
    accessibility: [
      {
        name: 'WAI-ARIA Slider Semantics & IME-Safe Keyboard Controls',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes role="slider" with aria-valuemin, aria-valuemax, aria-valuenow, descriptive aria-valuetext, ArrowUp/ArrowRight (+1), ArrowDown/ArrowLeft (-1), PageUp/PageDown (±5), Home (min), and End (max)',
        description:
          'Guards keyboard adjustments against IME composition (!e.nativeEvent.isComposing) and modifier chords, disables dial focus/interaction when disabled or mode is off, and pairs the dial with labeled -/+ steppers, aria-pressed mode pills, and °F/°C unit toggles.',
      },
      {
        name: 'Window Pointer Lifecycle, Live Climate Summary & Keyboard-Only Focus Ring',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Detaches window pointermove/pointerup/pointercancel listeners on pointer release, pointer cancel, mode === off, disabled, or unmount; restricts focus outlines to prism-focus-ring (:focus-visible); and announces live setpoint and ambient status in an aria-live="polite" region',
        description:
          'Prevents leaked window listeners during interrupted drags or unmounts while delivering clear, non-intrusive screen reader feedback whenever target temperature, mode, or unit changes.',
      },
    ],
  },
  props: [
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Climate Control'",
      description: 'Panel header title and accessible region/slider name prefix.',
    },
    {
      name: 'targetTempF',
      type: 'number',
      defaultValue: 'undefined',
      description: 'Controlled target temperature in canonical Fahrenheit degrees.',
    },
    {
      name: 'defaultTargetTempF',
      type: 'number',
      defaultValue: '70',
      description: 'Initial uncontrolled target temperature in Fahrenheit degrees.',
    },
    {
      name: 'ambientTempF',
      type: 'number',
      defaultValue: '73',
      description: 'Current ambient room temperature in Fahrenheit degrees.',
    },
    {
      name: 'minTempF',
      type: 'number',
      defaultValue: '50',
      description: 'Minimum inclusive target temperature bound in Fahrenheit.',
    },
    {
      name: 'maxTempF',
      type: 'number',
      defaultValue: '90',
      description: 'Maximum inclusive target temperature bound in Fahrenheit.',
    },
    {
      name: 'mode',
      type: "'cooling' | 'heating' | 'eco' | 'off'",
      defaultValue: 'undefined',
      description: 'Controlled climate mode.',
    },
    {
      name: 'defaultMode',
      type: "'cooling' | 'heating' | 'eco' | 'off'",
      defaultValue: "'cooling'",
      description: 'Initial uncontrolled climate mode.',
    },
    {
      name: 'unit',
      type: "'F' | 'C'",
      defaultValue: 'undefined',
      description: 'Controlled display temperature unit.',
    },
    {
      name: 'defaultUnit',
      type: "'F' | 'C'",
      defaultValue: "'F'",
      description: 'Initial uncontrolled display temperature unit.',
    },
    {
      name: 'onTargetChange',
      type: '(targetTempF: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the next clamped target temperature in canonical Fahrenheit.',
    },
    {
      name: 'onModeChange',
      type: '(mode: ThermostatMode) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the climate mode changes.',
    },
    {
      name: 'onUnitChange',
      type: '(unit: ThermostatUnit) => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the display temperature unit changes.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables dial dragging, keyboard nudging, steppers, mode selector pills, and unit toggle.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<ThermostatDial\n  title="Living Room"\n  defaultTargetTempF={70}\n  ambientTempF={73}\n  defaultMode="cooling"\n  onTargetChange={(tempF) => console.warn(tempF)}\n/>`,
    `<ThermostatDial\n  title="Studio Climate"\n  targetTempF={targetF}\n  ambientTempF={68}\n  mode={mode}\n  unit={unit}\n  onTargetChange={setTargetF}\n  onModeChange={setMode}\n  onUnitChange={setUnit}\n/>`,
  ],
};

export default docs;
