export interface CropAspectPresetMap {
  free: true;
  '16:9': true;
  '4:5': true;
  '1:1': true;
  '2.39:1': true;
}

export { CropStraightenOverlay } from './CropStraightenOverlay';
export type {
  CropAspectPreset,
  CropRectPct,
  CropStraightenOverlayProps,
  CropTransformState,
} from './CropStraightenOverlay';
