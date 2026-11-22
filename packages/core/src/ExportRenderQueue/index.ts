export interface ExportCodecMap {
  h264: true;
  'prores-422': true;
  av1: true;
  'wav-24bit': true;
}

export { ExportRenderQueue } from './ExportRenderQueue';
export type {
  ExportCodec,
  ExportResolution,
  ExportSampleRate,
  RenderJobStatus,
  ExportJobConfig,
  RenderQueueJob,
  ExportRenderQueueProps,
} from './ExportRenderQueue';
