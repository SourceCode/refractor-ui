export interface SystemFileDialogModeMap {
  inline: true;
  modal: true;
}

export interface SystemFileDialogKindMap {
  open: true;
  save: true;
}

export {
  DEFAULT_FILE_DIALOG_ENTRIES,
  DEFAULT_FILE_DIALOG_FORMATS,
  DEFAULT_FILE_DIALOG_PLACES,
  SystemFileDialog,
} from './SystemFileDialog';
export type {
  SystemFileDialogKind,
  SystemFileDialogMode,
  SystemFileDialogProps,
  SystemFileDialogResult,
  SystemFileFormatFilter,
  SystemFileNode,
  SystemFileNodeKind,
  SystemFilePlace,
} from './SystemFileDialog';
