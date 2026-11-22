export interface LedDisplayStyleMap {
  '7-segment': true;
  nixie: true;
}

export interface LedPhosphorToneMap {
  primary: true;
  emerald: true;
  amber: true;
  info: true;
  rose: true;
}

export interface LedReadoutSizeMap {
  sm: true;
  md: true;
  lg: true;
}

export { DigitalLedReadout } from './DigitalLedReadout';
export type {
  DigitalLedReadoutProps,
  LedDisplayStyle,
  LedPhosphorTone,
  LedReadoutSize,
} from './DigitalLedReadout';
