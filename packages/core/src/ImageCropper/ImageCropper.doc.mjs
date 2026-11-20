export const docs = {
  name: 'ImageCropper',
  displayName: 'Image Cropper & Media Editor',
  group: 'Rich Input & Content Creation',
  category: 'rich-input',
  keywords: ['image', 'cropper', 'crop', 'media', 'editor', 'zoom', 'rotate', 'aspect-ratio'],
  usage: {
    description:
      'Optical glass media editor with an interactive rule-of-thirds crop frame, aspect ratio locking, zoom slider, 90-degree rotation controls, full keyboard nudging, and strict URL sanitization.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide descriptive alt text and listen to onApplyCrop to persist final crop coordinates and transforms.',
      },
      {
        guidance: true,
        description:
          'Pick a locked defaultAspectRatio (such as 1:1 for avatars or 16:9 for hero banners) when downstream layouts require fixed proportions.',
      },
      {
        guidance: false,
        description:
          'Pass unvalidated user URLs directly into raw <img> tags; ImageCropper validates src via sanitizeUrl automatically.',
      },
    ],
    accessibility: [
      {
        name: 'Keyboard crop movement and resizing',
        criterion: '2.1.1 Keyboard',
        requirement: 'Arrow keys move the crop box by 2%; Shift+Arrow keys resize respecting aspect ratio',
        description:
          'The optical crop frame is keyboard-focusable with a focus-visible outline and announces coordinates and keyboard instructions.',
      },
      {
        name: 'Labeled transform controls',
        criterion: '4.1.2 Name, Role, Value',
        requirement: 'Zoom slider uses a bound <label>; aspect pills expose aria-pressed',
        description:
          'All aspect ratio buttons, rotation controls, reset, and Apply Crop expose accessible names and disabled states.',
      },
    ],
  },
  props: [
    {
      name: 'src',
      type: 'string',
      defaultValue: 'required',
      description: 'Image source URL validated strictly with sanitizeUrl(src, true).',
    },
    {
      name: 'alt',
      type: 'string',
      defaultValue: "'Editable media'",
      description: 'Accessible label and alt text for the preview image.',
    },
    {
      name: 'defaultCrop',
      type: 'CropRegion',
      defaultValue: '{ x: 15, y: 15, width: 70, height: 70 }',
      description: 'Initial percentage crop frame coordinates clamped within [0..100].',
    },
    {
      name: 'defaultAspectRatio',
      type: "'free' | '1:1' | '16:9' | '4:3'",
      defaultValue: "'free'",
      description: 'Initial aspect ratio preset applied to the crop frame.',
    },
    {
      name: 'onApplyCrop',
      type: '(result: CropResult) => void',
      defaultValue: 'undefined',
      description: 'Invoked when the user clicks Apply Crop with the finalized CropResult.',
    },
    {
      name: 'onCropChange',
      type: '(result: CropResult) => void',
      defaultValue: 'undefined',
      description: 'Invoked whenever crop region, zoom, rotation, or aspect ratio updates.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed CSS custom properties and style overrides.',
    },
  ],
  examples: [
    `<ImageCropper\n  src="/assets/studio-hero.jpg"\n  alt="Studio Hero Banner"\n  defaultAspectRatio="16:9"\n  onApplyCrop={(result) => saveCrop(result)}\n/>`,
  ],
};
