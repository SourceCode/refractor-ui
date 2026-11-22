import {
  ChannelStripFader,
  EffectsRackChain,
  ParametricEqGraph,
  StereoPanKnob,
  VuPeakLevelMeter,
  WaveformSpectrogramView,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface AudioMixingDemosProps {
  componentId: string;
}

export function AudioMixingDemos({ componentId }: AudioMixingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'channel-strip-fader':
      return (
        <div className="flex flex-wrap gap-4 justify-center w-full max-w-xl">
          <ChannelStripFader label="CH 1 · Vocals" defaultValueDb={-2.5} />
          <ChannelStripFader label="CH 2 · Synth Bus" defaultValueDb={-6} />
          <ChannelStripFader label="MST · Stereo Out" defaultValueDb={0} />
        </div>
      );

    case 'vu-peak-level-meter':
      return (
        <div className="w-full max-w-md">
          <VuPeakLevelMeter
            label="Master Bus LUFS / Peak"
            channels={[
              { id: 'l', label: 'L', levelDb: -7.4, peakDb: -2.1 },
              { id: 'r', label: 'R', levelDb: -5.8, peakDb: 0.4 },
            ]}
            onClearClip={() =>
              dispatch(pushToast({ title: 'Peak hold and clip latch cleared', tone: 'info' }))
            }
          />
        </div>
      );

    case 'stereo-pan-knob':
      return (
        <div className="flex flex-wrap gap-4 justify-center w-full max-w-xl">
          <StereoPanKnob label="Lead Vox Pan" defaultValue={0} />
          <StereoPanKnob label="Acoustic L" defaultValue={-48} />
          <StereoPanKnob label="Harmony R" defaultValue={52} />
        </div>
      );

    case 'parametric-eq-graph':
      return (
        <div className="w-full max-w-3xl">
          <ParametricEqGraph title="Mastering 4-Band Parametric EQ" />
        </div>
      );

    case 'waveform-spectrogram-view':
      return (
        <div className="w-full max-w-3xl">
          <WaveformSpectrogramView
            title="Vocal Stem · 48kHz / 24-bit"
            defaultMode="split"
            defaultSelection={{ startPct: 22, endPct: 58 }}
            onEditSamples={(_samples, action) =>
              dispatch(pushToast({ title: `Audio edit applied: ${action}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'effects-rack-chain':
      return (
        <div className="w-full max-w-3xl">
          <EffectsRackChain title="Vocal Bus DSP Insert Chain" orientation="horizontal" />
        </div>
      );

    default:
      return null;
  }
}
