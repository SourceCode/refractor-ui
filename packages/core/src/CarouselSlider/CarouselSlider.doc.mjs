export const docs = {
  name: 'CarouselSlider',
  displayName: 'Carousel / Media Slider',
  group: 'Data Display & Content',
  category: 'data-display',
  keywords: ['carousel', 'slider', 'gallery', 'media', 'slides', 'showcase'],
  usage: {
    description:
      'Horizontal optical media showcase with crystal navigation buttons, high-contrast scrim captions, resilient broken-image fallback, keyboard arrow support, and slide indicator dots.',
    bestPractices: [
      { guidance: true, description: 'Provide descriptive titles and concise captions so text stays legible over the bottom contrast scrim.' },
      { guidance: true, description: 'Supply stable unique slide IDs and safe image URLs.' },
      { guidance: false, description: 'Auto-advance slides without offering explicit pause controls.' },
    ],
    accessibility: [
      {
        name: 'Carousel landmark & keyboard navigation',
        criterion: '2.1.1 Keyboard',
        requirement: 'role="region", aria-roledescription="carousel", and Left/Right arrow navigation',
        description: 'Previous/Next buttons, slide indicator dots, and ArrowLeft/ArrowRight keys allow complete keyboard operation with keyboard-only focus rings.',
      },
    ],
  },
  props: [
    { name: 'slides', type: 'ReadonlyArray<CarouselSlide>', defaultValue: 'required', description: 'Media slides with id, title, caption, and imageSrc.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<CarouselSlider\n  slides={[\n    { id: 's1', title: 'Optical Crystal Study', caption: 'Caustic dispersion on alabaster', imageSrc: '/images/study-1.jpg' },\n  ]}\n/>`,
  ],
};
