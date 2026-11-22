export interface AppMenuItemKindMap {
  action: true;
  checkbox: true;
  submenu: true;
  separator: true;
}

export { AppMenuBar, DEFAULT_APP_MENUS } from './AppMenuBar';
export type {
  AppMenuActionItem,
  AppMenuBarProps,
  AppMenuEntry,
  AppMenuGroup,
  AppMenuItemKind,
  AppMenuSeparatorItem,
} from './AppMenuBar';
