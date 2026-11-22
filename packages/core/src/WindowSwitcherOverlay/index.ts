export interface WindowSwitcherModeMap {
  inline: true;
  overlay: true;
}

export interface SwitcherWindowToneMap {
  primary: true;
  info: true;
  emerald: true;
  amber: true;
  rose: true;
}

export { WindowSwitcherOverlay } from './WindowSwitcherOverlay';
export type {
  SwitcherWindowItem,
  SwitcherWindowTone,
  WindowSwitcherMode,
  WindowSwitcherOverlayProps,
} from './WindowSwitcherOverlay';
