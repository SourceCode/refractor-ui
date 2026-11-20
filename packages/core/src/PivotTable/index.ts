export interface PivotAggregationMap {
  sum: true;
  avg: true;
  count: true;
  min: true;
  max: true;
}

export { PivotTable } from './PivotTable';
export type {
  PivotAggregation,
  PivotConfig,
  PivotField,
  PivotRecord,
  PivotScalar,
  PivotTableProps,
} from './PivotTable';
