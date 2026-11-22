export interface DistributedTraceSpanStatusMap {
  ok: true;
  slow: true;
  error: true;
}

export { DistributedTraceWaterfall } from './DistributedTraceWaterfall';
export type {
  DistributedTraceWaterfallProps,
  TraceServiceTone,
  TraceSpanItem,
  DistributedTraceSpanStatus,
} from './DistributedTraceWaterfall';
