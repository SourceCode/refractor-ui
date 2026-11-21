export const docs = {
  name: 'FileDropzone',
  displayName: 'File Uploader / Dropzone',
  group: 'Form Inputs & Selection Controls',
  category: 'form-inputs',
  keywords: ['file', 'upload', 'dropzone', 'drag', 'drop', 'assets'],
  usage: {
    description:
      'Drag-and-drop or click-to-browse optical glass crystal surface for uploading files with tabular file-size badges.',
    bestPractices: [
      { guidance: true, description: 'Always pair drag-and-drop surfaces with an explicit keyboard-accessible browse button.' },
      { guidance: true, description: 'Display uploaded file sizes formatted cleanly with tabular numerals and optional removal triggers.' },
      { guidance: false, description: 'Silently accept dropped files without visual drag-over feedback or size validation.' },
    ],
    accessibility: [
      {
        name: 'Keyboard file selection and removal',
        criterion: '2.1.1 Keyboard',
        requirement: 'Browse and Remove controls are native focusable buttons with descriptive aria-labels',
        description: 'Hidden native <input type="file"> carries an accessible name and is activated via a focus-visible button.',
      },
    ],
  },
  props: [
    { name: 'files', type: 'ReadonlyArray<UploadedFileSummary>', defaultValue: 'required', description: 'Attached file metadata list.' },
    { name: 'onUploadFiles', type: '(files: UploadedFileSummary[]) => void', defaultValue: 'required', description: 'Callback invoked with dropped or chosen files.' },
    { name: 'onRemoveFile', type: '(name: string) => void', defaultValue: 'undefined', description: 'Optional callback rendered as a per-file remove button.' },
    { name: 'accept', type: 'string', defaultValue: 'undefined', description: 'Native file input accept attribute.' },
    { name: 'maxVisibleFiles', type: 'number', defaultValue: '4', description: 'Maximum number of file items shown in the list.' },
    { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables drag, browse, and remove interactions.' },
    { name: 'xstyle', type: 'OpticalStyleTokens', defaultValue: 'undefined', description: 'Typed CSS custom properties and style overrides.' },
  ],
  examples: [
    `<FileDropzone\n  files={uploadedFiles}\n  onUploadFiles={handleUpload}\n  onRemoveFile={handleRemove}\n/>`,
  ],
};
