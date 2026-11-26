export interface PipelineStageStatusMap {
  pending: true;
  active: true;
  completed: true;
  error: true;
}

export { DEFAULT_PIPELINE_STAGES, PipelinePulseLoader } from './PipelinePulseLoader';
export type {
  PipelinePulseLoaderProps,
  PipelineStageItem,
  PipelineStageStatus,
} from './PipelinePulseLoader';
