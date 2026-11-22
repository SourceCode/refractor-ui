export interface HardwareOsdKindMap {
  volume: true;
  brightness: true;
  media: true;
  'caps-lock': true;
}

export {
  DEFAULT_HARDWARE_OSD_PAYLOAD,
  HardwareOsdHud,
} from './HardwareOsdHud';
export type {
  HardwareOsdHudProps,
  HardwareOsdKind,
  HardwareOsdPayload,
} from './HardwareOsdHud';
