export interface FileConflictResolutionMap {
  replace: true;
  skip: true;
  'keep-both': true;
}

export interface FileConflictDialogModeMap {
  inline: true;
  modal: true;
}

export { FileConflictDialog } from './FileConflictDialog';
export type {
  FileConflictDialogMode,
  FileConflictDialogProps,
  FileConflictResolution,
  FileConflictVersion,
} from './FileConflictDialog';
