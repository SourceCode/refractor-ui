export interface AudioMixerChannelToneMap {
  primary: true;
  info: true;
  emerald: true;
  amber: true;
}

export { PerAppAudioMixer } from './PerAppAudioMixer';
export type {
  AudioMixerAppChannel,
  AudioMixerChannelTone,
  AudioMixerDeviceOption,
  PerAppAudioMixerProps,
  PerAppAudioMixerState,
} from './PerAppAudioMixer';
