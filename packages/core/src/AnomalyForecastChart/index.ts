export interface AnomalyDirectionMap {
  normal: true;
  'upper-breach': true;
  'lower-breach': true;
}

export {
  AnomalyForecastChart,
  DEFAULT_ANOMALY_FORECAST_DATA,
} from './AnomalyForecastChart';
export type {
  AnomalyDirection,
  AnomalyForecastPoint,
  AnomalyDetectionSummary,
  AnomalyForecastChartProps,
} from './AnomalyForecastChart';
