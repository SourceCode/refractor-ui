export interface LayerBlendModeMap {
  normal: true;
  multiply: true;
  screen: true;
  overlay: true;
  'soft-light': true;
  'color-dodge': true;
  difference: true;
}

export { LayerBlendStack } from './LayerBlendStack';
export type {
  BlendLayerItem,
  LayerBlendMode,
  LayerBlendStackProps,
  LayerKind,
} from './LayerBlendStack';
