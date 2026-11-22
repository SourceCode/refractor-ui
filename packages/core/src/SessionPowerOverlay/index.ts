export interface SessionPowerActionIdMap {
  sleep: true;
  restart: true;
  shutdown: true;
  logout: true;
}

export interface SessionPowerDisplayModeMap {
  inline: true;
  modal: true;
}

export { SessionPowerOverlay } from './SessionPowerOverlay';
export type {
  SessionPowerActionId,
  SessionPowerDisplayMode,
  SessionPowerOverlayProps,
} from './SessionPowerOverlay';
