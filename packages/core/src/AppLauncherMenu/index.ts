export interface AppLauncherCategoryMap {
  pinned: true;
  all: true;
  design: true;
  engineering: true;
  utilities: true;
}

export interface AppLauncherPowerActionMap {
  lock: true;
  sleep: true;
  restart: true;
  shutdown: true;
}

export interface AppLauncherToneMap {
  primary: true;
  info: true;
  emerald: true;
  amber: true;
  rose: true;
}

export { AppLauncherMenu } from './AppLauncherMenu';
export type {
  AppLauncherCategory,
  AppLauncherItem,
  AppLauncherMenuProps,
  AppLauncherPowerAction,
  AppLauncherRecentDoc,
  AppLauncherTone,
} from './AppLauncherMenu';
