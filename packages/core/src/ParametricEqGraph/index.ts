export interface EqBandFilterTypeMap {
  'low-shelf': true;
  bell: true;
  'high-shelf': true;
}

export {
  ParametricEqGraph,
  DEFAULT_EQ_BANDS,
  EQ_FILTER_TYPES,
} from './ParametricEqGraph';
export type {
  EqBandFilterType,
  EqBand,
  EqFilterTypeMeta,
  ParametricEqGraphProps,
} from './ParametricEqGraph';
