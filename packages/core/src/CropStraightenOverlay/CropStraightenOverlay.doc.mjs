export const docs = {
  name: 'CropStraightenOverlay',
  displayName: 'Crop & Straighten Overlay',
  group: 'Photo & Color Grading Controls',
  category: 'photo-color-grading',
  keywords: [
    'crop',
    'straighten',
    'overlay',
    'photo',
    'color-grading',
    'aspect-ratio',
    'rotation',
    'horizon',
    'rule-of-thirds',
    'framing',
    'cinema',
    'dial',
  ],
  usage: {
    description:
      'Optical-glass photo and color-grading crop and straighten studio overlay built on a prism-slab shell with aspect ratio lock pills (Free, 16:9, 4:5, 1:1, 2.39:1), a 16:9 prism-well interactive viewport with auto-scaling rotated backdrop and level horizon grid reference, dimmed outside scrim mask, Rule-of-Thirds interior guides, draggable crop frame with four corner resize sliders (pointer and keyboard), a calibrated -45.0° to +45.0° Straighten Dial with quick -5°/0°/+5° pills, and an aria-live geometry telemetry footer.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass controlled value and onChange when synchronizing live crop and straighten transforms with a WebGL/Canvas color-grading pipeline or non-destructive RAW sidecar state.',
      },
      {
        guidance: true,
        description:
          'Provide onApply when the overlay is mounted in a modal or editing session that requires explicit confirmation before committing crop coordinates.',
      },
      {
        guidance: false,
        description:
          'Pass unclamped or NaN crop rectangles expecting raw passthrough; CropStraightenOverlay enforces normalized 0..100 bounds, a 15% minimum frame dimension, and -45°..+45° rotation limits automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Four Corner Resize Sliders & Draggable Frame Keyboard Parity',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Crop body exposes role="group" ("Move crop frame") and each corner handle exposes role="slider" ("Resize crop top-left", etc.) supporting Arrow (±2%) and Shift+Arrow (±10%) nudging',
        description:
          'Guards all keydown handlers with !e.nativeEvent.isComposing, renders keyboard-only focus outlines via .prism-focus-ring, and removes elements from tab order when disabled.',
      },
      {
        name: 'Calibrated Straighten Slider, Live Telemetry & Window Pointer Hygiene',
        criterion: '2.4.7 Focus Visible, 2.5.1 Pointer Gestures & 4.1.3 Status Messages',
        requirement:
          'Straighten range slider exposes aria-label="Straighten rotation degrees" with -45..45 bounds and 0-key reset; geometry telemetry announces via aria-live="polite"; window pointer listeners detach cleanly on pointerup, pointercancel, disable, and unmount',
        description:
          'Ensures assistive technology announces live framing changes and prevents leaked global pointer listeners across mid-drag state transitions or unmounts.',
      },
    ],
  },
  props: [
    {
      name: 'value',
      type: 'CropTransformState',
      defaultValue: 'undefined',
      description: 'Controlled { crop, rotationDeg, aspect } transform state.',
    },
    {
      name: 'defaultCrop',
      type: 'CropRectPct',
      defaultValue: '{ x: 10, y: 10, width: 80, height: 80 }',
      description: 'Initial normalized 0..100 percentage crop frame in uncontrolled mode (min size 15%).',
    },
    {
      name: 'defaultRotationDeg',
      type: 'number',
      defaultValue: '0',
      description: 'Initial straighten rotation angle in degrees, clamped to [-45..45].',
    },
    {
      name: 'defaultAspect',
      type: "'free' | '16:9' | '4:5' | '1:1' | '2.39:1'",
      defaultValue: "'free'",
      description: 'Initial aspect ratio preset applied to the crop frame.',
    },
    {
      name: 'onChange',
      type: '(state: CropTransformState) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked with the normalized CropTransformState on any move, resize, aspect change, rotation, or reset.',
    },
    {
      name: 'onApply',
      type: '(state: CropTransformState) => void',
      defaultValue: 'undefined',
      description: 'Optional callback that reveals the primary Apply Crop button and receives the finalized transform state.',
    },
    {
      name: 'mediaLabel',
      type: 'string',
      defaultValue: "'RAW_Studio_Frame_01.dng'",
      description: 'Filename or media label rendered in the sculpted optical header and region aria-label.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description: 'Optional preview media rendered inside the rotated viewport backdrop; falls back to an optical gradient placeholder stage.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables crop dragging, corner resizing, aspect pills, straighten controls, reset, and Apply Crop.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<CropStraightenOverlay\n  mediaLabel="A012_GoldenHour_RAW.dng"\n  defaultAspect="2.39:1"\n  defaultRotationDeg={-1.5}\n  onChange={(state) => console.warn(state)}\n  onApply={(state) => console.warn('Applied:', state)}\n/>`,
    `<CropStraightenOverlay\n  value={transformState}\n  onChange={setTransformState}\n  mediaLabel="Portrait_Grade_Master.tiff"\n>\n  <img src="/assets/portrait.jpg" alt="Color graded portrait" className="w-full h-full object-cover" />\n</CropStraightenOverlay>`,
  ],
};

export default docs;
