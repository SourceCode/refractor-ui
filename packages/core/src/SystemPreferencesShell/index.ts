export interface PreferenceControlKindMap {
  toggle: true;
  select: true;
  slider: true;
  segmented: true;
}

export interface PreferenceSectionIconMap {
  sliders: true;
  sparkles: true;
  monitor: true;
  volume: true;
  wifi: true;
  shield: true;
}

export {
  DEFAULT_PREFERENCE_SECTIONS,
  SystemPreferencesShell,
} from './SystemPreferencesShell';
export type {
  PreferenceControlKind,
  PreferenceOption,
  PreferenceSection,
  PreferenceSectionIcon,
  PreferenceSettingItem,
  PreferenceValue,
  PreferenceValuesInput,
  SystemPreferencesShellProps,
} from './SystemPreferencesShell';
