export interface SpeedDialDirectionMap {
  up: true;
  down: true;
  left: true;
  right: true;
  radial: true;
}

export interface SpeedDialToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  amber: true;
  rose: true;
}

export { SpeedDialButton } from './SpeedDialButton';
export type {
  SpeedDialAction,
  SpeedDialButtonProps,
  SpeedDialDirection,
  SpeedDialTone,
} from './SpeedDialButton';
