export interface BatchRenameCaseModeMap {
  preserve: true;
  lower: true;
  upper: true;
  title: true;
  kebab: true;
  snake: true;
}

export interface BatchRenamePatternPresetMap {
  none: true;
  'strip-spaces': true;
  'remove-brackets': true;
  'digits-only-prefix': true;
}

export { BatchRenameUtility } from './BatchRenameUtility';
export type {
  BatchRenameCaseMode,
  BatchRenamePatternPreset,
  BatchRenamePreviewRow,
  BatchRenameUtilityProps,
} from './BatchRenameUtility';
