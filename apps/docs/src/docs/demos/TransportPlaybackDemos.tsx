import {
  FrameStepperRateSelector,
  JogShuttleWheel,
  TimecodeScrubber,
  TransportControlBar,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface TransportPlaybackDemosProps {
  componentId: string;
}

export function TransportPlaybackDemos({ componentId }: TransportPlaybackDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'transport-control-bar':
      return (
        <div className="w-full max-w-2xl">
          <TransportControlBar
            defaultPlaybackState="paused"
            defaultLoop
            statusLabel="Deck A · 24fps"
            onPlaybackStateChange={(state) =>
              dispatch(pushToast({ title: `Transport: ${state.toUpperCase()}`, tone: 'info' }))
            }
            onJumpStart={() => dispatch(pushToast({ title: 'Jumped to 00:00:00:00', tone: 'info' }))}
            onJumpEnd={() => dispatch(pushToast({ title: 'Jumped to sequence end', tone: 'info' }))}
          />
        </div>
      );

    case 'timecode-scrubber':
      return (
        <div className="w-full max-w-md">
          <TimecodeScrubber
            label="Master Sequence Timecode"
            defaultFrame={2535}
            fps={30}
            bpm={124}
          />
        </div>
      );

    case 'jog-shuttle-wheel':
      return (
        <div className="w-full max-w-xl">
          <JogShuttleWheel
            title="Precision Jog / Shuttle Deck"
            defaultFrame={420}
            maxFrame={3600}
            springReturn
          />
        </div>
      );

    case 'frame-stepper-rate-selector':
      return (
        <div className="w-full max-w-2xl">
          <FrameStepperRateSelector
            defaultFrame={144}
            totalFrames={1800}
            fps={24}
            defaultRate={1}
          />
        </div>
      );

    default:
      return null;
  }
}
