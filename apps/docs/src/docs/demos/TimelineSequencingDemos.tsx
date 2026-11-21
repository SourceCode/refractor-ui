import {
  ClipTrimHandle,
  KeyframeCurveEditor,
  MultiTrackTimeline,
  PlayheadScrubRuler,
  TimelineZoomNavigator,
  TrackHeaderStrip,
} from '@refractor-ui/core';
import type { TimelineTrack } from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface TimelineSequencingDemosProps {
  componentId: string;
}

const DEMO_TRACKS: TimelineTrack[] = [
  {
    id: 'v1',
    name: 'V1 · A-Roll 4K',
    kind: 'video',
    clips: [
      { id: 'c1', label: 'Intro Reveal', startSec: 0, durationSec: 16 },
      { id: 'c2', label: 'Studio B-Roll', startSec: 18, durationSec: 22 },
    ],
  },
  {
    id: 'a1',
    name: 'A1 · Dialogue Mix',
    kind: 'audio',
    clips: [
      { id: 'c3', label: 'Host VO Master', startSec: 2, durationSec: 36 },
    ],
  },
  {
    id: 'fx1',
    name: 'FX1 · Optical LUT',
    kind: 'effect',
    clips: [
      { id: 'c4', label: 'Prism Glow Grade', startSec: 10, durationSec: 24 },
    ],
  },
  {
    id: 'sub1',
    name: 'CC1 · Subtitles',
    kind: 'subtitle',
    clips: [
      { id: 'c5', label: 'EN-US Captions', startSec: 1, durationSec: 40 },
    ],
  },
];

export function TimelineSequencingDemos({ componentId }: TimelineSequencingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'multi-track-timeline':
      return (
        <div className="w-full max-w-3xl">
          <MultiTrackTimeline
            title="Master Commercial Cut · 24fps"
            tracks={DEMO_TRACKS}
            durationSec={48}
            defaultCurrentTimeSec={12.5}
            onSelectClip={(clip, track) =>
              dispatch(
                pushToast({
                  title: `Selected ${clip.label} on ${track.name}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'playhead-scrub-ruler':
      return (
        <div className="w-full max-w-3xl">
          <PlayheadScrubRuler
            durationSec={60}
            defaultTimeSec={14.5}
            fps={30}
            markers={[
              { id: 'm1', timeSec: 8, label: 'Beat Drop', tone: 'primary' },
              { id: 'm2', timeSec: 24, label: 'Color Cue', tone: 'emerald' },
              { id: 'm3', timeSec: 46, label: 'End Slate', tone: 'amber' },
            ]}
            onSelectMarker={(marker) =>
              dispatch(pushToast({ title: `Jumped to marker: ${marker.label}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'track-header-strip':
      return (
        <div className="w-full max-w-md space-y-3">
          <TrackHeaderStrip
            name="V1 · Cinema Master"
            trackType="video"
            defaultHeightMode="expanded"
            onRename={(next) =>
              dispatch(pushToast({ title: `Track renamed to "${next}"`, tone: 'emerald' }))
            }
          />
          <TrackHeaderStrip
            name="A1 · Dialogue Stem"
            trackType="audio"
            defaultSolo
            defaultHeightMode="compact"
          />
        </div>
      );

    case 'clip-trim-handle':
      return (
        <div className="w-full max-w-2xl">
          <ClipTrimHandle
            label="A004_C019_HeroShot.mov"
            totalDurationSec={30}
            defaultInSec={4}
            defaultOutSec={24}
            defaultFadeInSec={2}
            defaultFadeOutSec={3}
            onSplit={(atSec) =>
              dispatch(pushToast({ title: `Split clip at ${atSec.toFixed(1)}s`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'keyframe-curve-editor':
      return (
        <div className="w-full max-w-2xl">
          <KeyframeCurveEditor propertyName="Camera Scale" unit="%" />
        </div>
      );

    case 'timeline-zoom-navigator':
      return (
        <div className="w-full max-w-2xl">
          <TimelineZoomNavigator
            label="Sequence Overview"
            totalDurationSec={180}
            defaultWindowRange={{ startPct: 12, endPct: 58 }}
            playheadPct={32}
          />
        </div>
      );

    default:
      return null;
  }
}
