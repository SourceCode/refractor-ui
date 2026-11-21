export interface WaterfallStepKindMap {
  start: true;
  increase: true;
  decrease: true;
  total: true;
}

export { WaterfallChart } from './WaterfallChart';
export type {
  WaterfallChartProps,
  WaterfallStep,
  WaterfallStepKind,
} from './WaterfallChart';
