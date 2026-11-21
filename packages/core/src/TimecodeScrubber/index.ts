export interface TimecodeFormatMap {
  smpte: true;
  musical: true;
}

export {
  TimecodeScrubber,
  formatSmpteTimecode,
  parseSmpteTimecode,
  formatMusicalTimecode,
  parseMusicalTimecode,
} from './TimecodeScrubber';
export type { TimecodeFormat, TimecodeScrubberProps } from './TimecodeScrubber';
