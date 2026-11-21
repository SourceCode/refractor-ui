export interface CropAspectRatioMap {
  free: true;
  '1:1': true;
  '16:9': true;
  '4:3': true;
}

export { ImageCropper } from './ImageCropper';
export type {
  CropAspectRatio,
  CropRegion,
  CropResult,
  ImageCropperProps,
} from './ImageCropper';
