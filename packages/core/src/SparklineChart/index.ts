export interface SparklineVariantMap {
  line: true;
  bar: true;
}

export interface SparklineToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  amber: true;
  rose: true;
}

export { SparklineChart } from './SparklineChart';
export type {
  SparklineChartProps,
  SparklineTone,
  SparklineVariant,
} from './SparklineChart';
