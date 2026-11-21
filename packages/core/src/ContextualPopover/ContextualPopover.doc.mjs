export const docs = {
  name: 'ContextualPopover',
  displayName: 'Contextual Popover Card',
  group: 'Overlays & Popups',
  category: 'overlays-popups',
  keywords: ['popover', 'contextual', 'card', 'callout', 'upsell', 'floating'],
  usage: {
    description:
      'Floating optical glass contextual card featuring a dismissible header, secondary action line, and full-width cobalt refractive call-to-action capsule.',
    bestPractices: [
      { guidance: true, description: 'Use ContextualPopover for lightweight anchored actions, quick upsells, or inline collaborator prompts.' },
      { guidance: true, description: 'Use inlineSpecimen when showcasing the glass card directly in documentation or static callout slots.' },
      { guidance: false, description: 'Place long multi-field forms inside a narrow 280px popover; use ModalDialog or SlideOverSheet instead.' },
    ],
    accessibility: [
      {
        name: 'Disclosure & Escape dismissal',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement: 'aria-expanded trigger and Escape key dismissal',
        description: 'Exposes aria-expanded and aria-controls on the trigger button and closes the floating card when Escape is pressed.',
      },
    ],
  },
  props: [
    { name: 'title', type: 'string', defaultValue: "'Find files...'", description: 'Primary header text inside the popover card.' },
    { name: 'subtitle', type: 'string', defaultValue: "'Add collaborator'", description: 'Secondary clickable prompt text.' },
    { name: 'ctaLabel', type: 'string', defaultValue: "'Pro plan'", description: 'Label for the cobalt refractive CTA button.' },
    { name: 'onCtaClick', type: '() => void', defaultValue: 'undefined', description: 'Handler invoked when subtitle or CTA button is clicked.' },
    { name: 'onClose', type: '() => void', defaultValue: 'undefined', description: 'Handler invoked when the card is closed.' },
    { name: 'inlineSpecimen', type: 'boolean', defaultValue: 'false', description: 'Renders the card directly inline without a toggle button.' },
    { name: 'triggerLabel', type: 'string', defaultValue: "'Open Contextual Card'", description: 'Trigger button text when not inline.' },
  ],
  examples: [
    `<ContextualPopover\n  title="Find files..."\n  subtitle="Add collaborator"\n  ctaLabel="Pro plan"\n  onCtaClick={openBilling}\n/>`,
  ],
};
