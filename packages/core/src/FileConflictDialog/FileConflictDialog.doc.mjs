export const docs = {
  name: 'FileConflictDialog',
  displayName: 'File Conflict Dialog',
  group: 'File Management & Operations',
  category: 'file-management-operations',
  keywords: [
    'file',
    'conflict',
    'dialog',
    'modal',
    'replace',
    'skip',
    'keep-both',
    'overwrite',
    'duplicate',
    'comparison',
    'sha-256',
    'batch',
    'transfer',
    'file-management',
  ],
  usage: {
    description:
      'Side-by-side optical-glass file conflict comparison dialog inside a sculpted `prism-slab`. Displays incoming source and existing destination versions in a responsive `grid-cols-1 sm:grid-cols-2` layout with sanitized byte-size formatting (`B`/`KB`/`MB`/`GB`), comparative size badges (`Larger` / `Smaller` / `Same size`), recency badges (`Newer` / `Older` / `Same time`), optional short SHA-256 digests, batch `Apply to all N remaining conflicts` selection, `Replace` / `Keep Both` / `Skip` / optional `Cancel` actions, modal frosted backdrop with `Escape` and backdrop dismissal, and a polite `aria-live="polite"` status banner.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Supply `mode="modal"` paired with controlled `open` and `onCancel` handlers when interrupting an active copy or move queue, or keep the default `mode="inline"` when embedding conflict resolution inside a transfer workbench.',
      },
      {
        guidance: true,
        description:
          'Pass accurate `modifiedTimestamp` values in epoch milliseconds alongside human-readable `modifiedAt` labels and optional `checksumShort` digests so operators can verify newer revisions and payload integrity before choosing `Replace`, `Keep Both`, or `Skip`.',
      },
      {
        guidance: false,
        description:
          'Pass raw HTML markup inside filenames, paths, timestamps, or checksums; all metadata renders strictly as literal React text nodes and non-finite or negative byte counts are sanitized safely to `0 B`.',
      },
    ],
    accessibility: [
      {
        name: 'Inline Region & Modal Dialog Landmarks',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Renders `role="region"` in inline mode and a frosted `role="dialog" aria-modal="true"` backdrop in modal mode, both linked via `aria-labelledby` (or caller `aria-label`) and `aria-describedby`, with structured `<dl>/<dt>/<dd>` metadata cards for incoming and existing versions',
        description:
          'Communicates dialog modality, file comparison metadata, and comparative size/recency indicators reliably to assistive technologies.',
      },
      {
        name: 'IME-Safe Escape Dismissal, Keyboard-Only Focus Rings & Polite Live Banner',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible & 4.1.3 Status Messages',
        requirement:
          'Guards modal `Escape` dismissal with `!event.isComposing` and `!disabled`, cleans up the `window` keydown listener on unmount, applies `.prism-focus-ring` to every interactive button and checkbox, and announces chosen resolutions in an `aria-live="polite"` status region',
        description:
          'Preserves IME composition workflows, prevents stray listeners after dismissal, and announces resolution outcomes without disrupting keyboard focus.',
      },
    ],
  },
  props: [
    {
      name: 'fileName',
      type: 'string',
      defaultValue: "'OpticalGlass_Master_v4.exr'",
      description: 'Conflicting filename highlighted in the header and live status banner.',
    },
    {
      name: 'incoming',
      type: 'FileConflictVersion',
      defaultValue: 'Built-in larger, newer optical master sample (148.4 MB)',
      description: 'Incoming source file version metadata rendered on the left comparison card.',
    },
    {
      name: 'existing',
      type: 'FileConflictVersion',
      defaultValue: 'Built-in smaller, older destination sample (118.4 MB)',
      description: 'Existing destination file version metadata rendered on the right comparison card.',
    },
    {
      name: 'remainingConflicts',
      type: 'number',
      defaultValue: '3',
      description:
        'Total conflicts remaining in the batch. When `> 1`, displays the `Apply to all N remaining conflicts` checkbox and remaining-conflicts pill.',
    },
    {
      name: 'mode',
      type: "'inline' | 'modal'",
      defaultValue: "'inline'",
      description:
        'Controls whether the dialog renders directly as an inline `prism-slab` region or centered inside a frosted modal backdrop.',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls dialog visibility in `modal` mode. When `mode === "modal"` and `open === false`, renders `null`.',
    },
    {
      name: 'onResolve',
      type: '(resolution: FileConflictResolution, applyToAll: boolean) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user clicks `Replace`, `Keep Both`, or `Skip`, passing the chosen resolution and whether `Apply to all` is checked.',
    },
    {
      name: 'onCancel',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Optional callback invoked via the `Cancel` button, modal close icon, backdrop click, or `Escape` key in modal mode.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables resolution buttons, the apply-to-all checkbox, and modal Escape/backdrop/Cancel dismissal.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed `--prism-*` CSS custom property and inline optical style overrides.',
    },
  ],
  examples: [
    `<FileConflictDialog />`,
    `<FileConflictDialog\n  mode="modal"\n  open={true}\n  fileName="OpticalGlass_Master_v4.exr"\n  remainingConflicts={5}\n  onResolve={(resolution, applyToAll) => console.warn(resolution, applyToAll)}\n  onCancel={() => console.warn('Cancelled conflict dialog')}\n/>`,
  ],
};

export default docs;
