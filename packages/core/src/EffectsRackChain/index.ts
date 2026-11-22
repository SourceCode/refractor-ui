export interface DspEffectCategoryMap {
  dynamics: true;
  eq: true;
  time: true;
  modulation: true;
  saturation: true;
}

export { EffectsRackChain } from './EffectsRackChain';
export type {
  DspEffectCategory,
  DspEffectModule,
  EffectsRackChainOrientation,
  EffectsRackChainProps,
} from './EffectsRackChain';
