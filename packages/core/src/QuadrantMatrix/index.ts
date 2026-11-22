export interface QuadrantZoneMap {
  'top-left': true;
  'top-right': true;
  'bottom-left': true;
  'bottom-right': true;
}

export {
  QuadrantMatrix,
  DEFAULT_QUADRANT_ITEMS,
  DEFAULT_QUADRANT_LABELS,
} from './QuadrantMatrix';
export type {
  QuadrantZoneId,
  QuadrantLabels,
  QuadrantItem,
  QuadrantSelection,
  QuadrantMatrixProps,
} from './QuadrantMatrix';
