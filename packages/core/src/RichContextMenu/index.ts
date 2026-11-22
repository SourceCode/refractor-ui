export interface RichContextQuickActionIdMap {
  cut: true;
  copy: true;
  paste: true;
  rename: true;
  delete: true;
}

export interface RichContextTagToneMap {
  primary: true;
  rose: true;
  emerald: true;
  info: true;
  amber: true;
  secondary: true;
}

export { RichContextMenu } from './RichContextMenu';
export type {
  RichContextMenuAction,
  RichContextMenuProps,
  RichContextQuickActionId,
  RichContextTagTone,
} from './RichContextMenu';
