export interface TransportStateMap {
  stopped: true;
  playing: true;
  paused: true;
  recording: true;
}

export { TransportControlBar } from './TransportControlBar';
export type {
  TransportControlBarProps,
  TransportPlaybackState,
} from './TransportControlBar';
