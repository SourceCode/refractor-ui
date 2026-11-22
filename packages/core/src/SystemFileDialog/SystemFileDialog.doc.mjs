export const docs = {
  name: 'SystemFileDialog',
  displayName: 'System File Open / Save Dialog',
  group: 'Desktop Surfaces & Native System Dialogs',
  category: 'desktop-surfaces-dialogs',
  keywords: [
    'file-dialog',
    'open-dialog',
    'save-dialog',
    'save-as',
    'file-picker',
    'file-browser',
    'filesystem',
    'places-sidebar',
    'breadcrumbs',
    'format-filter',
    'new-folder',
    'path-traversal',
    'modal',
    'desktop',
  ],
  usage: {
    description:
      'Standardized OS Open / Save As dialog rendered as an embedded optical `prism-slab` (`mode="inline"`) or centered frosted-glass modal backdrop (`mode="modal"`). Combines a window header with an optional uncontrolled `Open` / `Save` mode switcher, a responsive navigation toolbar (`Back`, `Up`, clickable directory breadcrumbs, linear-time substring search filter, and inline validated `New Folder` creation), a two-pane places sidebar and WAI-ARIA `role="listbox"` directory browser (folders always listed first with keyboard `ArrowUp`/`ArrowDown`/`Home`/`End`/`Space`/`Enter`, double-click navigation/confirmation, and optional multi-select in `open` mode), and a footer strip featuring strict path-traversal filename validation, automatic format extension appending, file-format `<select>` filtering, `Cancel` (`Escape` in modal mode), and primary `Open` / `Save` actions.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Use `mode="modal"` paired with controlled `open`, `dialogKind`, `onConfirm`, and `onCancel` when presenting a native-style Open or Save As flow over an active application canvas, and keep the default `mode="inline"` for embedded file pickers or interactive workbenches.',
      },
      {
        guidance: true,
        description:
          'Supply domain-specific `formats` (such as `JSON (.json)` or `TypeScript (.ts, .tsx)`) in `save` mode so `SystemFileDialog` filters visible files while keeping folders navigable and automatically appends the primary format extension when users omit an extension.',
      },
      {
        guidance: false,
        description:
          'Do not rely solely on client-side filename validation for server-side file writes; while `SystemFileDialog` strictly blocks `/`, `\\`, `..`, dots-only names, trailing dots, and null/control characters with `role="alert"` feedback, always re-validate paths on the backend.',
      },
    ],
    accessibility: [
      {
        name: 'Modal Dialog, Places Navigation & Directory Listbox Semantics',
        criterion: '1.3.1 Info and Relationships & 4.1.2 Name, Role, Value',
        requirement:
          'Exposes `role="dialog" aria-modal="true"` in modal mode (or `role="region"` inline) linked via `aria-labelledby`/`aria-describedby`, `<nav aria-label="Places">` and `<nav aria-label="Current directory path">` landmarks with `aria-current="location"`, and a `role="listbox"` directory browser with `aria-multiselectable`, `aria-activedescendant`, and `role="option"` rows',
        description:
          'Communicates dialog modality, current folder hierarchy, and single or multi-file selection reliably to screen readers and assistive technologies.',
      },
      {
        name: 'IME-Safe Keyboard Navigation, Validation Alerts & Polite Live Status',
        criterion: '2.1.1 Keyboard, 2.4.7 Focus Visible, 3.3.1 Error Identification & 4.1.3 Status Messages',
        requirement:
          'Guards listbox `ArrowUp`/`ArrowDown`/`Home`/`End`/`Space`/`Enter`, input `Enter`/`Escape`, and modal `Escape` handlers against IME composition (`isComposing`), applies keyboard-only `.prism-focus-ring`, reports invalid filenames/folder names via `role="alert"` + `aria-invalid`/`aria-describedby`, and announces directory and confirmation changes via `role="status" aria-live="polite"`',
        description:
          'Prevents accidental commits during CJK/IME composition while keeping keyboard users informed of validation errors and navigation state.',
      },
    ],
  },
  props: [
    {
      name: 'mode',
      type: "'inline' | 'modal'",
      defaultValue: "'inline'",
      description:
        'Presentation mode: embeds as an optical `prism-slab` region (`inline`) or mounts over a dimmed frosted backdrop (`modal`).',
    },
    {
      name: 'open',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Controls visibility when `mode="modal"`; renders `null` and cleans up listeners when `false`.',
    },
    {
      name: 'dialogKind',
      type: "'open' | 'save'",
      defaultValue: 'undefined',
      description:
        'Controlled dialog kind switching between Open File and Save As workflows.',
    },
    {
      name: 'defaultDialogKind',
      type: "'open' | 'save'",
      defaultValue: "'open'",
      description:
        'Initial uncontrolled dialog kind used when `dialogKind` is omitted.',
    },
    {
      name: 'allowKindSwitch',
      type: 'boolean',
      defaultValue: 'true',
      description:
        'Shows the `Open` / `Save` mode pill switcher in the header when `dialogKind` is uncontrolled.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Open File' | 'Save As'",
      description:
        'Custom dialog title overriding the automatic heading derived from the active kind.',
    },
    {
      name: 'places',
      type: 'ReadonlyArray<SystemFilePlace>',
      defaultValue: 'DEFAULT_FILE_DIALOG_PLACES',
      description:
        'Sidebar quick-access locations (`Favorites`, `Projects`, `Documents`, `Downloads`, `System Drive`).',
    },
    {
      name: 'entries',
      type: 'ReadonlyArray<SystemFileNode>',
      defaultValue: 'undefined',
      description:
        'Controlled virtual filesystem nodes across directories.',
    },
    {
      name: 'defaultEntries',
      type: 'ReadonlyArray<SystemFileNode>',
      defaultValue: 'DEFAULT_FILE_DIALOG_ENTRIES',
      description:
        'Initial uncontrolled virtual filesystem tree across `/`, `/Projects`, `/Projects/Refractor`, `/Documents`, and `/Downloads`.',
    },
    {
      name: 'initialPath',
      type: 'string',
      defaultValue: "'/Projects'",
      description:
        'Initial directory path opened on mount.',
    },
    {
      name: 'defaultFileName',
      type: 'string',
      defaultValue: "'optical-theme.json'",
      description:
        'Initial filename value displayed in the Save As input.',
    },
    {
      name: 'formats',
      type: 'ReadonlyArray<SystemFileFormatFilter>',
      defaultValue: 'DEFAULT_FILE_DIALOG_FORMATS',
      description:
        'Selectable file-format filters controlling visible files and automatic Save As extension appending.',
    },
    {
      name: 'allowMultiple',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Enables multi-file selection in `open` mode via Ctrl/Cmd+Click, Shift+Click, Space, or row selection checkboxes.',
    },
    {
      name: 'onConfirm',
      type: '(result: SystemFileDialogResult) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when the user confirms an Open or Save As operation with normalized path and selection metadata.',
    },
    {
      name: 'onCancel',
      type: '() => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked when canceled via the Cancel button, header close button, modal backdrop click, or Escape key.',
    },
    {
      name: 'onCreateFolder',
      type: '(folderPath: string) => void',
      defaultValue: 'undefined',
      description:
        'Callback invoked with the normalized path whenever a new folder is created.',
    },
    {
      name: 'disabled',
      type: 'boolean',
      defaultValue: 'false',
      description:
        'Disables all navigation, search, format filtering, folder creation, selection, confirm, and cancel interactions.',
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
    `<SystemFileDialog\n  onConfirm={(result) => console.warn('Confirmed:', result.fullPath)}\n  onCancel={() => console.warn('Canceled')}\n/>`,
    `<SystemFileDialog\n  mode="modal"\n  open={isSaveOpen}\n  dialogKind="save"\n  initialPath="/Projects/Refractor"\n  defaultFileName="custom-prism-theme"\n  onConfirm={(result) => {\n    saveProjectFile(result.fullPath);\n    setIsSaveOpen(false);\n  }}\n  onCancel={() => setIsSaveOpen(false)}\n/>`,
  ],
};

export default docs;
