export interface TelemetryToneMap {
  primary: true;
  secondary: true;
  emerald: true;
  amber: true;
  rose: true;
}

export { LiveTelemetryChart } from './LiveTelemetryChart';
export type {
  LiveTelemetryChartProps,
  TelemetrySample,
  TelemetryTone,
  TelemetryWindowSize,
} from './LiveTelemetryChart';
