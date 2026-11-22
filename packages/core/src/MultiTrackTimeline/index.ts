export interface TimelineTrackKindMap {
  video: true;
  audio: true;
  effect: true;
  subtitle: true;
}

export { MultiTrackTimeline } from './MultiTrackTimeline';
export type {
  MultiTrackTimelineProps,
  TimelineClip,
  TimelineTrack,
  TimelineTrackKind,
} from './MultiTrackTimeline';
