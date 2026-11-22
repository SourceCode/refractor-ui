export const docs = {
  name: 'WindowAttachedSheet',
  displayName: 'Window Attached Sheet',
  group: 'Window Anatomy & Controls',
  category: 'window-anatomy-controls',
  keywords: [
    'window',
    'sheet',
    'attached-sheet',
    'titlebar',
    'window-modal',
    'dialog',
    'macos-sheet',
    'document-modal',
    'sibling-window',
    'save-prompt',
    'window-anatomy',
  ],
  usage: {
    description:
      'Window-attached modal sheet sliding down directly from a specific window titlebar inside a sculpted `prism-slab` workspace. Anchors a flat-top, rounded-bottom `role="dialog" aria-modal="false"` sheet with a semantic top accent stripe (`info`, `warning`, `critical`) directly below the target window titlebar, dimming and blocking ONLY that window body (`pointer-events-none`, `aria-hidden`, disabled buttons) while keeping an optional `Reference Notes` sibling window 100% interactive. Supports controlled and uncontrolled open states, custom sheet `children`, `Confirm` and `Cancel` actions, IME-safe `Escape` dismissal, and a polite `aria-live="polite"` status strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `WindowAttachedSheet` for document-scoped confirmations (such as saving unsaved changes, export settings, or destructive sheet actions) so users can continue referencing or working in sibling workspace windows without an application-wide modal lock.',
      },
      {
        guidance: true,
        description:
          'Match `tone` (`info`, `warning`, `critical`) to the severity of the decision and pair `open` with `onOpenChange` when synchronizing sheet visibility with external window close or tab-switch handlers.',
      },
      {
        guidance: false,
        description:
          'Use `WindowAttachedSheet` for system-wide blocking alerts that must halt every open window simultaneously; use `ModalDialog` for full-application modality.',
      },
    ],
    accessibility: [
      {
        name: 'Window-Scoped Dialog Semantics & Body Suppression',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Renders the attached sheet as `role="dialog" aria-modal="false"` linked via `aria-labelledby` and optional `aria-describedby`, while setting `aria-hidden="true"`, `pointer-events-none`, `tabIndex={-1}`, and `disabled` exclusively on the occluded target window body',
        description:
          'Ensures assistive technologies and keyboard users understand that only the owning window is blocked while sibling windows remain fully reachable and operable.',
      },
      {
        name: 'IME-Safe Escape Dismissal, Keyboard-Only Focus Rings & Polite Status Strip',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards sheet `Escape` dismissal with `!event.nativeEvent.isComposing` and `!disabled`, applies `.prism-focus-ring` (`:focus-visible`) to all controls, restores focus between the titlebar trigger and dialog, and announces sheet open, confirm, cancel, and sibling interactions in an `aria-live="polite"` status region',
        description:
          'Protects active IME composition sessions, avoids pointer focus-ring clutter, and keeps screen-reader users informed of state transitions across both windows.',
      },
    ],
  },
  props: [
    {
      name: 'windowTitle',
      type: 'string',
      defaultValue: "'OpticalSpec_v2.md'",
      description:
        'Document or window heading displayed in the primary target window titlebar.',
    },
    {
      name: 'sheetTitle',
      type: 'string',
      defaultValue: "'Save unsaved changes before closing?'",
      description:
        'Primary heading displayed inside the titlebar-attached modal sheet.',
    },
    {
      name: 'sheetDescription',
      type: 'string',
      defaultValue:
        "'Unsaved edits to this document will be lost unless you save first. Sibling workspace windows stay interactive while this sheet is open.'",
      description:
        'Supporting explanation displayed beneath the sheet title and linked via `aria-describedby` when non-empty.',
    },
    {
      name: 'tone',
      type: "'info' | 'warning' | 'critical'",
      defaultValue: "'warning'",
      description:
        'Semantic visual tone driving the top accent stripe (`--prism-info-main`, `--prism-warning-main`, `--prism-error-main`), icon tint, and confirm button emphasis.',
    },
    {
      name: 'confirmLabel',
      type: 'string',
      defaultValue: "'Confirm'",
      description: 'Text label rendered on the sheet confirmation button.',
    },
    {
      name: 'cancelLabel',
      type: 'string',
      defaultValue: "'Cancel'",
      description: 'Text label rendered on the sheet cancellation button.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'undefined',
      description:
        'Controlled visibility state for the attached sheet; pair with `onOpenChange`.',
    },
    {
      name: 'defaultOpen',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Initial uncontrolled visibility state when `open` is omitted.',
    },
    {
      name: 'showSiblingWindow',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Displays an adjacent `Reference Notes` sibling window with an interactive counter to illustrate window-scoped modality.',
    },
    {
      name: 'onOpenChange',
      type: '(open: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked whenever the attached sheet opens or closes.',
    },
    {
      name: 'onConfirm',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user activates the Confirm button.',
    },
    {
      name: 'onCancel',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user activates the Cancel button or dismisses the sheet via Escape.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables the sheet trigger, Confirm/Cancel buttons, Escape dismissal, and workspace actions.',
    },
    {
      name: 'children',
      type: 'ReactNode',
      defaultValue: 'undefined',
      description:
        'Optional custom content rendered inside a recessed `prism-well` section within the attached sheet.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description:
        'Typed `--prism-*` CSS custom property and optical inline style overrides.',
    },
  ],
  examples: [
    `<WindowAttachedSheet\n  windowTitle="OpticalSpec_v2.md"\n  sheetTitle="Save unsaved changes before closing?"\n  tone="warning"\n  confirmLabel="Save & Close"\n  cancelLabel="Discard"\n  onConfirm={() => console.warn('Saved document')}\n  onCancel={() => console.warn('Cancelled close')}\n/>`,
    `<WindowAttachedSheet\n  tone="critical"\n  showSiblingWindow={false}\n  sheetTitle="Delete calibration snapshot?"\n  confirmLabel="Delete Snapshot"\n>\n  <p>Snapshot #14 will be permanently removed from local storage.</p>\n</WindowAttachedSheet>`,
  ],
};

export default docs;
