export const docs = {
  name: 'ModalDialog',
  displayName: 'Modal Dialog',
  group: 'Overlays & Floating Surfaces',
  category: 'overlays',
  keywords: ['modal', 'dialog', 'overlay', 'confirm', 'alert', 'popup'],
  usage: {
    description:
      'Centered optical glass modal slab over a frosted backdrop with accessible heading linkage, Escape dismissal, and paired Cancel/Confirm actions.',
    bestPractices: [
      { guidance: true, description: 'Use ModalDialog for focused decisions or concise forms that require user confirmation.' },
      { guidance: true, description: 'Provide a clear verb in confirmLabel matching the modal title.' },
      { guidance: false, description: 'Stack multiple modal dialogs on top of one another.' },
    ],
    accessibility: [
      {
        name: 'ARIA modal semantics',
        criterion: '4.1.2 Name, Role, Value & 2.1.2 No Keyboard Trap',
        requirement: 'role="dialog", aria-modal="true", aria-labelledby, Escape dismissal',
        description: 'Links title and optional description via generated IDs and dismisses on Escape, Cancel, Close button, or backdrop click.',
      },
    ],
  },
  props: [
    { name: 'open', type: 'boolean', defaultValue: 'required', description: 'Controls whether the modal dialog is mounted.' },
    { name: 'title', type: 'string', defaultValue: 'required', description: 'Dialog heading displayed in the header.' },
    { name: 'description', type: 'string', defaultValue: 'undefined', description: 'Optional subheading linked via aria-describedby.' },
    { name: 'children', type: 'ReactNode', defaultValue: 'required', description: 'Body content inside the optical slab.' },
    { name: 'confirmLabel', type: 'string', defaultValue: "'Save changes'", description: 'Label on the primary confirm button.' },
    { name: 'onConfirm', type: '() => void', defaultValue: 'undefined', description: 'Optional confirm handler; button is hidden when omitted.' },
    { name: 'onClose', type: '() => void', defaultValue: 'required', description: 'Dismissal callback.' },
  ],
  examples: [
    `<ModalDialog\n  open={open}\n  title="Publish optical preset"\n  description="Share your custom dispersion tokens with the workspace."\n  confirmLabel="Publish"\n  onConfirm={handlePublish}\n  onClose={() => setOpen(false)}\n>\n  <p>All team members will receive the updated CSS cascade tokens.</p>\n</ModalDialog>`,
  ],
};
