export interface HardwarePortKindMap {
  rj45: true;
  'sfp+': true;
  'usb-c': true;
  poe: true;
}

export interface HardwarePortStatusMap {
  'up-10g': true;
  'up-1g': true;
  warning: true;
  down: true;
}

export { HardwarePortStrip } from './HardwarePortStrip';
export type {
  HardwarePortFilter,
  HardwarePortKind,
  HardwarePortSpec,
  HardwarePortStatus,
  HardwarePortStripProps,
} from './HardwarePortStrip';
