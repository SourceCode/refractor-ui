export interface LockScreenDisplayModeMap {
  inline: true;
  fullscreen: true;
}

export interface LockScreenPowerActionMap {
  sleep: true;
  restart: true;
  shutdown: true;
}

export { LockScreenOverlay } from './LockScreenOverlay';
export type {
  LockScreenDisplayMode,
  LockScreenOverlayProps,
  LockScreenPowerAction,
  LockScreenUserAccount,
} from './LockScreenOverlay';
