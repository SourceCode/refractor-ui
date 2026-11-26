export interface EnergyRibbonStateMap {
  idle: true;
  listening: true;
  thinking: true;
  streaming: true;
  success: true;
  error: true;
}

export { StatefulEnergyRibbon } from './StatefulEnergyRibbon';
export type {
  EnergyRibbonPosition,
  EnergyRibbonState,
  StatefulEnergyRibbonProps,
} from './StatefulEnergyRibbon';
