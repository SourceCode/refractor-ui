export const docs = {
  name: 'TrashRecoveryBanner',
  displayName: 'Trash Recovery Banner',
  group: 'File Management & Operations',
  category: 'file-management-operations',
  keywords: [
    'trash',
    'recovery',
    'banner',
    'retention',
    'restore',
    'empty-trash',
    'recycle-bin',
    'auto-delete',
    'file-management',
    'operations',
    'destructive-confirmation',
    'two-step',
  ],
  usage: {
    description:
      'Contextual optical-glass Trash folder retention banner housed in a sculpted `prism-slab`. Displays sanitized item count, storage footprint, and automatic retention urgency across `--prism-info-main` (`normal`), `--prism-warning-main` (`warning`, <= 7 days), and `--prism-error-main` (`critical`, <= 3 days) tiers, with singular/plural copy, paused auto-delete and empty-trash states, `Restore Selected (N)` and `Restore All` actions, a polite `aria-live="polite"` feedback strip, and an inline two-step `Confirm Empty Trash` / `Cancel` safety confirmation (`Escape` cancels cleanly and IME-safely).',
    bestPractices: [
      {
        guidance: true,
        description:
          'Place `TrashRecoveryBanner` at the top of Trash or Recently Deleted views and wire `selectedCount`, `itemCount`, `totalSizeLabel`, and `retentionDays` to live folder state so restore and purge controls stay synchronized.',
      },
      {
        guidance: true,
        description:
          'Set `autoDeleteEnabled={false}` when enterprise retention holds or manual-purge policies are active so users see the `Auto-delete paused` indicator instead of a scheduled countdown.',
      },
      {
        guidance: false,
        description:
          'Trigger irreversible permanent deletion from a single click; `TrashRecoveryBanner` enforces an inline two-step confirmation (`Confirm Empty Trash` + `Cancel` + IME-safe `Escape` cancellation) before invoking `onEmptyTrash`.',
      },
    ],
    accessibility: [
      {
        name: 'Named Region Landmark & Polite Live Action Announcements',
        criterion: '1.3.1 Info and Relationships & 4.1.3 Status Messages',
        requirement:
          'Exposes role="region" linked via aria-labelledby (or custom aria-label), semantic role="group" action clusters, and a role="status" aria-live="polite" aria-atomic="true" strip announcing restore, confirmation, and cancellation events',
        description:
          'Ensures screen-reader users hear immediate confirmation when restoring selected files, restoring all items, entering permanent-delete confirmation, or cancelling via Cancel or Escape.',
      },
      {
        name: 'Two-Step Destructive Safety, IME-Safe Escape & Keyboard-Only Focus Rings',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 3.3.4 Error Prevention',
        requirement:
          'Requires explicit two-step confirmation before invoking onEmptyTrash, cancels confirmation cleanly on non-composing Escape (!event.nativeEvent.isComposing), and applies .prism-focus-ring (:focus-visible) with disabled:cursor-not-allowed across all buttons',
        description:
          'Prevents accidental irreversible data loss while supporting complete keyboard operability without interfering with IME composition sessions.',
      },
    ],
  },
  props: [
    {
      name: 'itemCount',
      type: 'number',
      defaultValue: '14',
      description:
        'Total number of items currently in Trash. Clamped safely to non-negative integers against NaN, Infinity, and negative inputs; renders "Trash is empty" when 0.',
    },
    {
      name: 'selectedCount',
      type: 'number',
      defaultValue: '3',
      description:
        'Number of currently selected items in Trash, sanitized and clamped to 0..itemCount.',
    },
    {
      name: 'totalSizeLabel',
      type: 'string',
      defaultValue: "'2.4 GB'",
      description: 'Formatted total storage footprint label displayed alongside the item count.',
    },
    {
      name: 'retentionDays',
      type: 'number',
      defaultValue: '30',
      description:
        'Remaining retention days before permanent auto-deletion (clamped >= 0). Drives semantic urgency: <= 3 critical, <= 7 warning, otherwise normal.',
    },
    {
      name: 'autoDeleteEnabled',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Whether automatic purge is enabled. When false, displays "Auto-delete paused" messaging.',
    },
    {
      name: 'onRestoreSelected',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the user clicks Restore Selected (N).',
    },
    {
      name: 'onRestoreAll',
      type: '() => void',
      defaultValue: 'undefined',
      description: 'Callback fired when the user clicks Restore All.',
    },
    {
      name: 'onEmptyTrash',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback fired only after the user explicitly activates Empty Trash and then Confirm Empty Trash.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description: 'Disables all recovery and empty-trash controls and hides any active confirmation panel.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<TrashRecoveryBanner\n  itemCount={14}\n  selectedCount={3}\n  totalSizeLabel="2.4 GB"\n  retentionDays={30}\n  onRestoreSelected={() => console.warn('Restore selected')}\n  onRestoreAll={() => console.warn('Restore all')}\n  onEmptyTrash={() => console.warn('Empty trash confirmed')}\n/>`,
    `<TrashRecoveryBanner\n  itemCount={5}\n  selectedCount={0}\n  totalSizeLabel="420 MB"\n  retentionDays={2}\n  onRestoreAll={() => console.warn('Restore all urgent items')}\n  onEmptyTrash={() => console.warn('Empty trash confirmed')}\n/>`,
  ],
};

export default docs;
