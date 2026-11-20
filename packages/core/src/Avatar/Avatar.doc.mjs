export const docs = {
  name: 'Avatar',
  displayName: 'Avatar',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['avatar', 'profile', 'portrait', 'initials', 'user', 'image'],
  usage: {
    description:
      'Circular or squircle crystal-bezel portrait with automatic cobalt initials fallback if an image is absent, broken, or uses an unsafe URI scheme.',
    bestPractices: [
      { guidance: true, description: 'Always provide concise 1-2 character initials alongside descriptive alt text.' },
      { guidance: true, description: 'Use shape="squircle" for workspace or team icons and shape="circle" for individuals.' },
      { guidance: false, description: 'Pass unsanitized javascript: or untrusted SVG data URIs to src.' },
    ],
    accessibility: [
      {
        name: 'Non-text content alternatives',
        criterion: '1.1.1 Non-text Content',
        requirement: 'alt on <img> and role="img" + aria-label on initials fallback',
        description: 'Both portrait images and fallback initials badges expose the person or entity name to assistive technologies.',
      },
    ],
  },
  props: [
    { name: 'src', type: 'string', defaultValue: 'undefined', description: 'Optional portrait image URL (sanitized for safe protocols).' },
    { name: 'alt', type: 'string', defaultValue: 'required', description: 'Accessible name for the portrait or fallback badge.' },
    { name: 'initials', type: 'string', defaultValue: 'required', description: 'Resilient fallback initials displayed when image fails or is omitted.' },
    { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Dimensions scale (36px, 44px, or 56px).' },
    { name: 'shape', type: "'circle' | 'squircle'", defaultValue: "'circle'", description: 'Outer crystal frame geometry.' },
  ],
  examples: [
    `<Avatar src="/images/clara.jpg" alt="Clara Vance" initials="CV" size="lg" />`,
    `<Avatar alt="Elena Rostova" initials="ER" shape="squircle" />`,
  ],
};
