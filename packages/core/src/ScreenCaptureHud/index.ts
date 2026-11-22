export interface CaptureTargetModeMap {
  fullscreen: true;
  window: true;
  region: true;
}

export interface CaptureOutputKindMap {
  screenshot: true;
  recording: true;
}

export interface CaptureSaveLocationMap {
  desktop: true;
  clipboard: true;
  documents: true;
}

export { ScreenCaptureHud } from './ScreenCaptureHud';
export type {
  CaptureDelaySeconds,
  CaptureOutputKind,
  CaptureSaveLocation,
  CaptureTargetMode,
  ScreenCaptureHudProps,
  ScreenCaptureResult,
} from './ScreenCaptureHud';
