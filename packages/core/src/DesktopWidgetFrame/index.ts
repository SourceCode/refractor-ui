export interface DesktopWidgetSizeMap {
  sm: true;
  md: true;
  lg: true;
}

export interface DesktopWidgetKindMap {
  telemetry: true;
  weather: true;
  notes: true;
  clock: true;
  custom: true;
}

export interface DesktopWidgetToneMap {
  primary: true;
  info: true;
  success: true;
  warning: true;
}

export { DesktopWidgetFrame } from './DesktopWidgetFrame';
export type {
  DesktopWidgetConfig,
  DesktopWidgetFrameProps,
  DesktopWidgetKind,
  DesktopWidgetRefreshInterval,
  DesktopWidgetSize,
  DesktopWidgetTone,
} from './DesktopWidgetFrame';
