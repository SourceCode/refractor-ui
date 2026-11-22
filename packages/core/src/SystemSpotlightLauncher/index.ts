export interface SpotlightResultKindMap {
  app: true;
  file: true;
  command: true;
  calculation: true;
}

export {
  SystemSpotlightLauncher,
  evaluateSpotlightExpression,
} from './SystemSpotlightLauncher';
export type {
  SpotlightEvalResult,
  SpotlightResultItem,
  SpotlightResultKind,
  SystemSpotlightLauncherProps,
} from './SystemSpotlightLauncher';
