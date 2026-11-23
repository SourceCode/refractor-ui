'use client';

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  Monitor,
  RotateCcw,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Volume2,
  Wifi,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { clampNumber, splitLiteralHighlight } from '../utils/sanitize';
import { STYLE_BORDER_DIVIDER, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { themeProps } from '../utils/themeProps';

export type PreferenceControlKind = 'toggle' | 'select' | 'slider' | 'segmented';

export type PreferenceValue = boolean | string | number;

export interface PreferenceOption {
  /** Stable option value stored in the preferences map. */
  value: string;
  /** Visible option label rendered inside select or segmented controls. */
  label: string;
}

export interface PreferenceSettingItem {
  /** Stable unique identifier for the setting (stored safely inside a Map). */
  id: string;
  /** Primary setting label displayed in the preference row. */
  label: string;
  /** Optional supporting explanation displayed beneath the label. */
  description?: string;
  /** Interactive control kind rendered for this setting. */
  kind: PreferenceControlKind;
  /** Canonical default value used for initial state, modified detection, and section reset. */
  defaultValue: PreferenceValue;
  /** Selectable options required for `select` and `segmented` controls. */
  options?: ReadonlyArray<PreferenceOption>;
  /** Minimum numeric bound for `slider` controls (defaults to `0`). */
  min?: number;
  /** Maximum numeric bound for `slider` controls (defaults to `100`). */
  max?: number;
  /** Numeric step increment for `slider` controls (defaults to `1`). */
  step?: number;
  /** Optional unit suffix rendered alongside the tabular `slider` readout. */
  unit?: string;
  /** Group heading used to organize related settings into optical `prism-crystal` cards. */
  group: string;
  /** Disables interaction for this individual preference control. */
  disabled?: boolean;
}

export type PreferenceSectionIcon =
  | 'sliders'
  | 'sparkles'
  | 'monitor'
  | 'volume'
  | 'wifi'
  | 'shield';

export interface PreferenceSection {
  /** Stable unique section identifier used for routing and selection. */
  id: string;
  /** Category title displayed in the sidebar and section detail header. */
  title: string;
  /** Concise section description rendered beneath the active category heading. */
  subtitle: string;
  /** Semantic icon identifier rendered in the sidebar badge and section header. */
  icon: PreferenceSectionIcon;
  /** Settings belonging to this category, grouped into optical cards by `setting.group`. */
  settings: ReadonlyArray<PreferenceSettingItem>;
}

export type PreferenceValuesInput =
  | ReadonlyMap<string, PreferenceValue>
  | ReadonlyArray<readonly [string, PreferenceValue]>;

type SystemPreferencesShellBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface SystemPreferencesShellProps extends SystemPreferencesShellBaseProps {
  /** Shell title displayed in the header bar (defaults to `'System Settings'`). */
  title?: string;
  /** Catalog of preference categories and grouped settings (defaults to a 6-section OS catalog). */
  sections?: ReadonlyArray<PreferenceSection>;
  /** Controlled active section identifier. */
  activeSectionId?: string;
  /** Initial uncontrolled active section identifier (falls back to the first section). */
  defaultActiveSectionId?: string;
  /** Controlled prototype-safe preference values supplied as a `ReadonlyMap` or entry tuples. */
  values?: PreferenceValuesInput;
  /** Initial uncontrolled preference overrides supplied as a `ReadonlyMap` or entry tuples. */
  defaultValues?: PreferenceValuesInput;
  /** Callback fired whenever the active preference category changes. */
  onActiveSectionChange?: (sectionId: string) => void;
  /** Callback fired whenever an individual setting value changes. */
  onSettingChange?: (
    settingId: string,
    value: PreferenceValue,
    sectionId: string
  ) => void;
  /** Callback fired when `Reset Section Defaults` is activated for the current category. */
  onResetSection?: (sectionId: string) => void;
  /** Disables search filtering, category switching, preference editing, and section reset. */
  disabled?: boolean;
}

interface IndexedSettingEntry {
  setting: PreferenceSettingItem;
  domId: string;
}

interface IndexedSectionEntry {
  section: PreferenceSection;
  indexedSettings: ReadonlyArray<IndexedSettingEntry>;
}

interface FilteredSectionEntry {
  section: PreferenceSection;
  settings: ReadonlyArray<IndexedSettingEntry>;
  matchCount: number;
}

interface SettingGroupBlock {
  groupName: string;
  items: ReadonlyArray<IndexedSettingEntry>;
}

interface SliderBounds {
  min: number;
  max: number;
  step: number;
}

const DEFAULT_TITLE = 'System Settings';

export const DEFAULT_PREFERENCE_SECTIONS: ReadonlyArray<PreferenceSection> = [
  {
    id: 'general',
    title: 'General',
    subtitle: 'Language, startup behavior, and background software updates',
    icon: 'sliders',
    settings: [
      {
        id: 'general.startup-behavior',
        label: 'Startup Behavior',
        description:
          'Choose what restores automatically when signing into your desktop session.',
        kind: 'select',
        defaultValue: 'restore-windows',
        options: [
          { value: 'restore-windows', label: 'Restore Open Windows' },
          { value: 'clean-desktop', label: 'Clean Desktop' },
          { value: 'resume-workspace', label: 'Resume Last Workspace' },
        ],
        group: 'Session & Updates',
      },
      {
        id: 'general.auto-updates',
        label: 'Automatic System Updates',
        description:
          'Download and stage verified security and optical runtime updates in the background.',
        kind: 'toggle',
        defaultValue: true,
        group: 'Session & Updates',
      },
      {
        id: 'general.handoff',
        label: 'Cross-Device Continuity',
        description:
          'Allow nearby trusted devices to hand off clipboard items and active workspace tabs.',
        kind: 'toggle',
        defaultValue: true,
        group: 'Continuity',
      },
    ],
  },
  {
    id: 'appearance',
    title: 'Appearance & Glass',
    subtitle: 'Optical refraction intensity, surface luminance, and motion comfort',
    icon: 'sparkles',
    settings: [
      {
        id: 'appearance.theme-mode',
        label: 'Color Mode',
        description:
          'Select system-wide light, dark, or ambient adaptive glass luminance.',
        kind: 'segmented',
        defaultValue: 'adaptive',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'adaptive', label: 'Auto' },
        ],
        group: 'Surface Finish',
      },
      {
        id: 'appearance.blur-radius',
        label: 'Optical Blur Depth',
        description:
          'Adjust frosted backdrop refraction intensity across floating windows and slabs.',
        kind: 'slider',
        defaultValue: 20,
        min: 4,
        max: 36,
        step: 2,
        unit: 'px',
        group: 'Surface Finish',
      },
      {
        id: 'appearance.reduce-motion',
        label: 'Reduce Spring Motion',
        description:
          'Replace spring window transitions with gentle optical cross-fades.',
        kind: 'toggle',
        defaultValue: false,
        group: 'Accessibility',
      },
    ],
  },
  {
    id: 'displays',
    title: 'Displays',
    subtitle: 'Luminance calibration, compositor refresh rate, and color gamut',
    icon: 'monitor',
    settings: [
      {
        id: 'displays.brightness',
        label: 'Display Brightness',
        description: 'Control primary HDR optical display backlight output.',
        kind: 'slider',
        defaultValue: 78,
        min: 0,
        max: 100,
        step: 2,
        unit: '%',
        group: 'Luminance & Color',
      },
      {
        id: 'displays.color-profile',
        label: 'Color Profile',
        description: 'Calibrated gamut profile applied to the display compositor.',
        kind: 'select',
        defaultValue: 'display-p3',
        options: [
          { value: 'display-p3', label: 'Display P3 (Optical Wide)' },
          { value: 'srgb', label: 'sRGB IEC61966-2.1' },
          { value: 'rec2020', label: 'HDR Rec. 2020' },
        ],
        group: 'Luminance & Color',
      },
      {
        id: 'displays.refresh-rate',
        label: 'Refresh Rate',
        description:
          'Select target compositor cadence for motion smoothness or power savings.',
        kind: 'segmented',
        defaultValue: '120hz',
        options: [
          { value: '60hz', label: '60 Hz' },
          { value: '120hz', label: '120 Hz' },
          { value: 'adaptive', label: 'Adaptive' },
        ],
        group: 'Timing & Cadence',
      },
    ],
  },
  {
    id: 'sound',
    title: 'Sound',
    subtitle: 'Master output gain, endpoint routing, and tactile system cues',
    icon: 'volume',
    settings: [
      {
        id: 'sound.output-volume',
        label: 'Master Output Volume',
        description: 'Primary desktop output gain across active audio endpoints.',
        kind: 'slider',
        defaultValue: 64,
        min: 0,
        max: 100,
        step: 2,
        unit: '%',
        group: 'Output & Mixing',
      },
      {
        id: 'sound.output-device',
        label: 'Output Device',
        description:
          'Route system audio to built-in speakers or external studio interfaces.',
        kind: 'select',
        defaultValue: 'studio-monitors',
        options: [
          { value: 'studio-monitors', label: 'Studio Monitors (USB-C)' },
          { value: 'built-in', label: 'Built-in Spatial Array' },
          { value: 'headphones', label: 'Reference Headphones' },
        ],
        group: 'Output & Mixing',
      },
      {
        id: 'sound.ui-sound-effects',
        label: 'Play Interface Sound Effects',
        description:
          'Emit subtle tactile chimes for notifications, window snaps, and confirmations.',
        kind: 'toggle',
        defaultValue: true,
        group: 'System Alerts',
      },
    ],
  },
  {
    id: 'network',
    title: 'Network',
    subtitle: 'Wireless radios, encrypted DNS resolvers, and VPN tunnel profiles',
    icon: 'wifi',
    settings: [
      {
        id: 'network.wifi-enabled',
        label: 'Wi-Fi Radio',
        description: 'Connect automatically to known WPA3 wireless networks.',
        kind: 'toggle',
        defaultValue: true,
        group: 'Wireless & Interfaces',
      },
      {
        id: 'network.dns-mode',
        label: 'Encrypted DNS',
        description: 'Select resolver protocol for outbound domain lookups.',
        kind: 'segmented',
        defaultValue: 'doh',
        options: [
          { value: 'auto', label: 'Auto' },
          { value: 'doh', label: 'DoH' },
          { value: 'dot', label: 'DoT' },
        ],
        group: 'Routing & DNS',
      },
      {
        id: 'network.vpn-profile',
        label: 'VPN Tunnel Profile',
        description: 'Active WireGuard tunnel profile for encrypted workspace traffic.',
        kind: 'select',
        defaultValue: 'wireguard-us-west',
        options: [
          { value: 'direct', label: 'Direct (No VPN)' },
          { value: 'wireguard-us-west', label: 'WireGuard — US West' },
          { value: 'wireguard-eu-central', label: 'WireGuard — EU Central' },
        ],
        group: 'Routing & DNS',
      },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy & Security',
    subtitle: 'Application firewall, diagnostic hygiene, and idle session lock',
    icon: 'shield',
    settings: [
      {
        id: 'privacy.firewall',
        label: 'Application Firewall',
        description:
          'Block unsolicited incoming network connections to local applications.',
        kind: 'toggle',
        defaultValue: true,
        group: 'System Protection',
      },
      {
        id: 'privacy.lock-timeout',
        label: 'Auto-Lock Idle Timeout',
        description:
          'Minutes of inactivity before locking the optical session automatically.',
        kind: 'slider',
        defaultValue: 5,
        min: 1,
        max: 30,
        step: 1,
        unit: ' min',
        group: 'System Protection',
      },
      {
        id: 'privacy.telemetry-level',
        label: 'Telemetry Level',
        description:
          'Control whether crash diagnostics stay strictly local or are anonymized.',
        kind: 'segmented',
        defaultValue: 'minimal',
        options: [
          { value: 'off', label: 'Off' },
          { value: 'minimal', label: 'Minimal' },
          { value: 'full', label: 'Full' },
        ],
        group: 'Diagnostics',
      },
    ],
  },
];

function buildIndexedSections(
  list: ReadonlyArray<PreferenceSection>,
  safeBaseId: string
): ReadonlyArray<IndexedSectionEntry> {
  const seenSections = new Set<string>();
  const out: IndexedSectionEntry[] = [];
  let seq = 0;

  for (const section of list) {
    if (seenSections.has(section.id)) {
      continue;
    }
    seenSections.add(section.id);

    const indexedSettings: IndexedSettingEntry[] = [];
    for (const setting of section.settings) {
      seq += 1;
      indexedSettings.push({
        setting,
        domId: `${safeBaseId}-pref-${seq}`,
      });
    }

    out.push({ section, indexedSettings });
  }

  return out;
}

function toPreferenceMap(
  input?: PreferenceValuesInput
): Map<string, PreferenceValue> {
  const map = new Map<string, PreferenceValue>();
  if (!input) {
    return map;
  }
  for (const [key, value] of input) {
    map.set(key, value);
  }
  return map;
}

function getSliderBounds(setting: PreferenceSettingItem): SliderBounds {
  const rawMin =
    setting.min !== undefined && Number.isFinite(setting.min) ? setting.min : 0;
  const rawMax =
    setting.max !== undefined && Number.isFinite(setting.max)
      ? setting.max
      : 100;
  const min = Math.min(rawMin, rawMax);
  const max = Math.max(rawMin, rawMax);
  const step =
    setting.step !== undefined &&
    Number.isFinite(setting.step) &&
    setting.step > 0
      ? setting.step
      : 1;
  return { min, max, step };
}

function normalizeSettingValue(
  setting: PreferenceSettingItem,
  rawValue: PreferenceValue,
  fallbackValue?: PreferenceValue
): PreferenceValue {
  switch (setting.kind) {
    case 'toggle':
      return Boolean(rawValue);
    case 'slider': {
      const bounds = getSliderBounds(setting);
      const safeFallback =
        typeof fallbackValue === 'number'
          ? clampNumber(fallbackValue, bounds.min, bounds.max, bounds.min)
          : bounds.min;
      const numeric =
        typeof rawValue === 'number' ? rawValue : Number(rawValue);
      return clampNumber(numeric, bounds.min, bounds.max, safeFallback);
    }
    case 'select':
    case 'segmented': {
      const candidate = String(rawValue);
      const options = setting.options ?? [];
      const firstOption = options[0];
      if (!firstOption) {
        return candidate;
      }
      if (options.some((opt) => opt.value === candidate)) {
        return candidate;
      }
      const fallbackStr =
        fallbackValue !== undefined ? String(fallbackValue) : '';
      if (options.some((opt) => opt.value === fallbackStr)) {
        return fallbackStr;
      }
      return firstOption.value;
    }
  }
}

function resolveSettingValue(
  setting: PreferenceSettingItem,
  valuesMap: ReadonlyMap<string, PreferenceValue>
): PreferenceValue {
  const normalizedDefault = normalizeSettingValue(setting, setting.defaultValue);
  const stored = valuesMap.get(setting.id);
  if (stored === undefined) {
    return normalizedDefault;
  }
  return normalizeSettingValue(setting, stored, normalizedDefault);
}

function formatSettingAnnouncementValue(
  setting: PreferenceSettingItem,
  value: PreferenceValue
): string {
  switch (setting.kind) {
    case 'toggle':
      return value ? 'On' : 'Off';
    case 'slider':
      return `${String(value)}${setting.unit ?? ''}`;
    case 'select':
    case 'segmented': {
      const strValue = String(value);
      const matched = setting.options?.find((opt) => opt.value === strValue);
      return matched ? matched.label : strValue;
    }
  }
}

function groupSettingsByCategory(
  entries: ReadonlyArray<IndexedSettingEntry>
): ReadonlyArray<SettingGroupBlock> {
  const grouped = new Map<string, IndexedSettingEntry[]>();
  for (const entry of entries) {
    const groupKey = entry.setting.group.trim() || 'General';
    const existing = grouped.get(groupKey);
    if (existing) {
      existing.push(entry);
    } else {
      grouped.set(groupKey, [entry]);
    }
  }
  return Array.from(grouped.entries()).map(([groupName, items]) => ({
    groupName,
    items,
  }));
}

function renderSectionIcon(
  icon: PreferenceSectionIcon,
  className: string
): ReactNode {
  switch (icon) {
    case 'sliders':
      return <SlidersHorizontal aria-hidden="true" className={className} />;
    case 'sparkles':
      return <Sparkles aria-hidden="true" className={className} />;
    case 'monitor':
      return <Monitor aria-hidden="true" className={className} />;
    case 'volume':
      return <Volume2 aria-hidden="true" className={className} />;
    case 'wifi':
      return <Wifi aria-hidden="true" className={className} />;
    case 'shield':
      return <Shield aria-hidden="true" className={className} />;
  }
}

function renderSearchText(
  source: string,
  trimmedQuery: string,
  keyPrefix: string
): ReactNode {
  if (!trimmedQuery) {
    return source;
  }
  const segments = splitLiteralHighlight(source, trimmedQuery);
  let offset = 0;
  return segments.map((segment) => {
    const startOffset = offset;
    offset += segment.text.length;
    const key = `${keyPrefix}-${startOffset}-${segment.highlighted ? 'h' : 'n'}-${segment.text.length}`;
    if (segment.highlighted) {
      return (
        <mark
          key={key}
          className="rounded-sm px-0.5 font-semibold"
          style={{
            color: 'var(--prism-text-primary)',
            backgroundColor:
              'color-mix(in srgb, var(--prism-warning-main) 28%, transparent)',
          }}
        >
          {segment.text}
        </mark>
      );
    }
    return <span key={key}>{segment.text}</span>;
  });
}

function SystemPreferencesShellInner({
  title = DEFAULT_TITLE,
  sections = DEFAULT_PREFERENCE_SECTIONS,
  activeSectionId,
  defaultActiveSectionId,
  values,
  defaultValues,
  onActiveSectionChange,
  onSettingChange,
  onResetSection,
  disabled = false,
  'aria-label': ariaLabelProp,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: SystemPreferencesShellProps) {
  const baseId = useId();
  const safeBaseId = baseId.replace(/[^a-zA-Z0-9_-]/g, '');
  const override = useComponentOverride('SystemPreferencesShell');

  const indexedSections = useMemo<ReadonlyArray<IndexedSectionEntry>>(
    () => buildIndexedSections(sections, safeBaseId),
    [safeBaseId, sections]
  );

  const isActiveSectionControlled = activeSectionId !== undefined;
  const [internalActiveSectionId, setInternalActiveSectionId] =
    useState<string>(() => {
      if (
        defaultActiveSectionId &&
        indexedSections.some((entry) => entry.section.id === defaultActiveSectionId)
      ) {
        return defaultActiveSectionId;
      }
      return indexedSections[0]?.section.id ?? '';
    });

  const isValuesControlled = values !== undefined;
  const [internalValues, setInternalValues] = useState<
    Map<string, PreferenceValue>
  >(() => toPreferenceMap(defaultValues));

  const effectiveValuesMap = useMemo<ReadonlyMap<string, PreferenceValue>>(
    () => (isValuesControlled ? toPreferenceMap(values) : internalValues),
    [internalValues, isValuesControlled, values]
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const trimmedQuery = searchQuery.trim();
  const lowerQuery = trimmedQuery.toLowerCase();
  const isFiltering = lowerQuery.length > 0;

  const visibleSections = useMemo<ReadonlyArray<FilteredSectionEntry>>(() => {
    if (!isFiltering) {
      return indexedSections.map((entry) => ({
        section: entry.section,
        settings: entry.indexedSettings,
        matchCount: entry.indexedSettings.length,
      }));
    }

    const entries: FilteredSectionEntry[] = [];
    for (const entry of indexedSections) {
      const { section, indexedSettings } = entry;
      const matchingSettings = indexedSettings.filter(({ setting }) => {
        const labelMatch = setting.label.toLowerCase().includes(lowerQuery);
        const descriptionMatch = (setting.description ?? '')
          .toLowerCase()
          .includes(lowerQuery);
        const groupMatch = setting.group.toLowerCase().includes(lowerQuery);
        return labelMatch || descriptionMatch || groupMatch;
      });

      const sectionHeaderMatches =
        section.title.toLowerCase().includes(lowerQuery) ||
        section.subtitle.toLowerCase().includes(lowerQuery);

      if (!sectionHeaderMatches && matchingSettings.length === 0) {
        continue;
      }

      const displayedSettings =
        matchingSettings.length > 0 ? matchingSettings : indexedSettings;

      entries.push({
        section,
        settings: displayedSettings,
        matchCount: displayedSettings.length,
      });
    }

    return entries;
  }, [indexedSections, isFiltering, lowerQuery]);

  const requestedSectionId = isActiveSectionControlled
    ? activeSectionId
    : internalActiveSectionId;

  const activeEntry: FilteredSectionEntry | undefined =
    visibleSections.find((entry) => entry.section.id === requestedSectionId) ??
    visibleSections[0];
  const activeSection = activeEntry?.section;

  const activeSectionModifiedCount = useMemo<number>(() => {
    if (!activeSection) {
      return 0;
    }
    let count = 0;
    for (const setting of activeSection.settings) {
      const currentValue = resolveSettingValue(setting, effectiveValuesMap);
      const defaultValue = normalizeSettingValue(setting, setting.defaultValue);
      if (currentValue !== defaultValue) {
        count += 1;
      }
    }
    return count;
  }, [activeSection, effectiveValuesMap]);

  const activeGroups = useMemo<ReadonlyArray<SettingGroupBlock>>(
    () => (activeEntry ? groupSettingsByCategory(activeEntry.settings) : []),
    [activeEntry]
  );

  const handleSelectSection = useCallback(
    (section: PreferenceSection) => {
      if (
        section.id === activeSection?.id &&
        section.id === requestedSectionId
      ) {
        return;
      }
      if (!isActiveSectionControlled) {
        setInternalActiveSectionId(section.id);
      }
      onActiveSectionChange?.(section.id);
      setAnnouncement(`Switched to ${section.title} preferences.`);
    },
    [
      activeSection?.id,
      isActiveSectionControlled,
      onActiveSectionChange,
      requestedSectionId,
    ]
  );

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (disabled) {
        return;
      }
      setSearchQuery(event.target.value);
      setAnnouncement('');
    },
    [disabled]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setAnnouncement('Search cleared.');
    searchInputRef.current?.focus();
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing || disabled) {
        return;
      }
      if (event.key === 'Escape' && searchQuery.length > 0) {
        event.preventDefault();
        setSearchQuery('');
        setAnnouncement('Search cleared.');
      }
    },
    [disabled, searchQuery.length]
  );

  const handleCategoryKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
      if (
        event.nativeEvent.isComposing ||
        disabled ||
        visibleSections.length <= 1
      ) {
        return;
      }

      let nextIndex: number | null = null;
      if (event.key === 'ArrowDown') {
        nextIndex = (currentIndex + 1) % visibleSections.length;
      } else if (event.key === 'ArrowUp') {
        nextIndex =
          (currentIndex - 1 + visibleSections.length) % visibleSections.length;
      } else if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = visibleSections.length - 1;
      }

      if (nextIndex !== null) {
        event.preventDefault();
        const target = visibleSections[nextIndex];
        if (target) {
          handleSelectSection(target.section);
          categoryButtonRefs.current.get(target.section.id)?.focus();
        }
      }
    },
    [disabled, handleSelectSection, visibleSections]
  );

  const handleImeSafeButtonKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if (event.nativeEvent.isComposing) {
        event.preventDefault();
      }
    },
    []
  );

  const handleSettingChange = useCallback(
    (
      sectionId: string,
      setting: PreferenceSettingItem,
      nextRawValue: PreferenceValue
    ) => {
      if (disabled || setting.disabled) {
        return;
      }

      const defaultValue = normalizeSettingValue(setting, setting.defaultValue);
      const currentValue = resolveSettingValue(setting, effectiveValuesMap);
      const normalized = normalizeSettingValue(
        setting,
        nextRawValue,
        currentValue
      );

      if (!isValuesControlled) {
        setInternalValues((prev) => {
          const next = new Map(prev);
          if (normalized === defaultValue) {
            next.delete(setting.id);
          } else {
            next.set(setting.id, normalized);
          }
          return next;
        });
      }

      onSettingChange?.(setting.id, normalized, sectionId);
      setAnnouncement(
        `${setting.label} set to ${formatSettingAnnouncementValue(setting, normalized)}.`
      );
    },
    [disabled, effectiveValuesMap, isValuesControlled, onSettingChange]
  );

  const handleResetSection = useCallback(
    (section: PreferenceSection) => {
      if (!isValuesControlled) {
        setInternalValues((prev) => {
          const next = new Map(prev);
          for (const setting of section.settings) {
            next.delete(setting.id);
          }
          return next;
        });
      }
      onResetSection?.(section.id);
      setAnnouncement(`Reset ${section.title} preferences to defaults.`);
    },
    [isValuesControlled, onResetSection]
  );

  const resolvedTitle = title.trim() || DEFAULT_TITLE;
  const resolvedAriaLabel = ariaLabelProp?.trim() || resolvedTitle;
  const headingId = `${safeBaseId}-heading`;

  const idleStatusText = activeSection
    ? isFiltering
      ? `Showing ${activeEntry.matchCount} matching ${activeEntry.matchCount === 1 ? 'setting' : 'settings'} in ${activeSection.title}.`
      : `${activeSection.title} — ${activeSectionModifiedCount} modified.`
    : isFiltering
      ? `No settings match "${trimmedQuery}".`
      : 'No preference categories available.';

  const liveStatusText = !activeSection
    ? idleStatusText
    : announcement || idleStatusText;

  const merged = mergeProps({
    themeTarget: themeProps('system-preferences-shell', {
      activeSection: activeSection?.id,
      filtering: isFiltering,
      modified: activeSectionModifiedCount > 0,
      disabled,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full min-w-0 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden',
      disabled ? 'opacity-65' : ''
    ),
    overrideClassName: override?.className,
    userClassName: className,
    baseStyle: {
      color: 'var(--prism-text-primary)',
    },
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('system-preferences-shell', 'header');
  const sidebarClass = stableClassName('system-preferences-shell', 'sidebar');
  const detailClass = stableClassName('system-preferences-shell', 'detail');
  const groupClass = stableClassName('system-preferences-shell', 'group');
  const rowClass = stableClassName('system-preferences-shell', 'row');
  const statusClass = stableClassName('system-preferences-shell', 'status');

  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
    >
      {/* Top Shell Header */}
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            aria-hidden="true"
            className="prism-crystal w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0"
            style={{
              color: disabled
                ? 'var(--prism-text-disabled)'
                : 'var(--prism-primary-main)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--prism-divider)',
            }}
          >
            <Settings className="w-4 h-4 shrink-0" />
          </span>
          <h2
            id={headingId}
            className="text-sm sm:text-base font-semibold tracking-tight truncate"
            style={STYLE_TEXT_PRIMARY}
          >
            {resolvedTitle}
          </h2>
        </div>

        <span
          data-testid="preferences-category-count"
          className="prism-well px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
          style={{
            color: 'var(--prism-text-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          {visibleSections.length}{' '}
          {visibleSections.length === 1 ? 'category' : 'categories'}
        </span>
      </div>

      {/* Responsive Two-Pane Shell */}
      <div className="flex flex-col md:flex-row gap-4 min-w-0 max-w-full">
        {/* Left Searchable Icon Sidebar */}
        <nav
          aria-label="System preference categories"
          data-testid="preferences-sidebar"
          className={cx(
            sidebarClass,
            'w-full md:w-64 md:shrink-0 min-w-0 flex flex-col gap-3'
          )}
        >
          {/* Search Input Well */}
          <div
            className="prism-well rounded-2xl px-3 py-1.5 flex items-center gap-2 min-w-0 w-full"
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--prism-well-border)',
            }}
          >
            <Search
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={STYLE_TEXT_SECONDARY}
            />
            <input
              ref={searchInputRef}
              type="search"
              value={searchQuery}
              disabled={disabled}
              placeholder="Search settings..."
              aria-label="Search settings"
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              className="prism-focus-ring min-w-0 flex-1 bg-transparent text-xs sm:text-sm py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              style={STYLE_TEXT_PRIMARY}
            />
            {searchQuery.length > 0 ? (
              <button
                type="button"
                disabled={disabled}
                aria-label="Clear search"
                onClick={handleClearSearch}
                onKeyDown={handleImeSafeButtonKeyDown}
                className="prism-crystal prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
                style={STYLE_TEXT_SECONDARY}
              >
                <X aria-hidden="true" className="w-3 h-3 shrink-0" />
              </button>
            ) : null}
          </div>

          {/* Category List */}
          {visibleSections.length > 0 ? (
            <div className="flex flex-col gap-1 min-w-0">
              {visibleSections.map((entry, index) => {
                const { section, matchCount } = entry;
                const isActive = activeSection?.id === section.id;

                return (
                  <button
                    key={section.id}
                    ref={(node) => {
                      if (node) {
                        categoryButtonRefs.current.set(section.id, node);
                      } else {
                        categoryButtonRefs.current.delete(section.id);
                      }
                    }}
                    type="button"
                    disabled={disabled}
                    aria-current={isActive ? 'page' : undefined}
                    tabIndex={disabled ? -1 : isActive ? 0 : -1}
                    data-testid={`preferences-category-${section.id}`}
                    data-active={isActive ? 'true' : undefined}
                    onClick={() => handleSelectSection(section)}
                    onKeyDown={(event) => handleCategoryKeyDown(event, index)}
                    className={cx(
                      'prism-focus-ring w-full min-w-0 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 text-left transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                      isActive
                        ? 'prism-crystal'
                        : 'enabled:hover:brightness-105'
                    )}
                    style={{
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--prism-primary-main) 12%, transparent)'
                        : 'transparent',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: isActive
                        ? 'color-mix(in srgb, var(--prism-primary-main) 40%, var(--prism-divider))'
                        : 'transparent',
                    }}
                  >
                    <span className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span
                        aria-hidden="true"
                        className="prism-well w-7 h-7 rounded-xl inline-flex items-center justify-center shrink-0"
                        style={{
                          color: isActive
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-text-secondary)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: isActive
                            ? 'color-mix(in srgb, var(--prism-primary-main) 36%, var(--prism-well-border))'
                            : 'var(--prism-well-border)',
                        }}
                      >
                        {renderSectionIcon(section.icon, 'w-3.5 h-3.5 shrink-0')}
                      </span>
                      <span
                        className="text-xs sm:text-sm font-semibold tracking-tight truncate"
                        style={{
                          color: isActive
                            ? 'var(--prism-text-primary)'
                            : 'var(--prism-text-secondary)',
                        }}
                      >
                        {renderSearchText(
                          section.title,
                          trimmedQuery,
                          `cat-${section.id}`
                        )}
                      </span>
                    </span>

                    {isFiltering ? (
                      <span
                        data-testid={`preferences-match-badge-${section.id}`}
                        className="prism-well px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums shrink-0"
                        style={{
                          color: isActive
                            ? 'var(--prism-primary-main)'
                            : 'var(--prism-text-secondary)',
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: 'var(--prism-well-border)',
                        }}
                      >
                        {matchCount}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              data-testid="preferences-sidebar-empty"
              className="prism-well rounded-2xl p-3 text-center min-w-0"
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--prism-well-border)',
              }}
            >
              <p
                className="text-xs break-words max-w-full"
                style={STYLE_TEXT_SECONDARY}
              >
                {isFiltering
                  ? 'No matching categories.'
                  : 'No preference categories.'}
              </p>
            </div>
          )}
        </nav>

        {/* Right Grouped Preference Detail Pane */}
        <div
          data-testid="preferences-detail-pane"
          className={cx(detailClass, 'flex-1 min-w-0 flex flex-col gap-4')}
        >
          {activeSection ? (
            <>
              {/* Active Section Header */}
              <div
                className="prism-well rounded-2xl p-4 flex flex-wrap items-start justify-between gap-3 min-w-0"
                style={{
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderColor: 'var(--prism-well-border)',
                }}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <span
                    aria-hidden="true"
                    data-testid="preferences-active-icon"
                    className="prism-crystal w-10 h-10 rounded-2xl inline-flex items-center justify-center shrink-0"
                    style={{
                      color: 'var(--prism-primary-main)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor:
                        'color-mix(in srgb, var(--prism-primary-main) 34%, var(--prism-divider))',
                    }}
                  >
                    {renderSectionIcon(activeSection.icon, 'w-5 h-5 shrink-0')}
                  </span>

                  <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <h3
                        data-testid="preferences-section-title"
                        className="text-sm sm:text-base font-semibold tracking-tight break-words"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {renderSearchText(
                          activeSection.title,
                          trimmedQuery,
                          `sec-title-${activeSection.id}`
                        )}
                      </h3>
                      <span
                        data-testid="preferences-modified-pill"
                        className="inline-flex items-center px-2 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums whitespace-nowrap shrink-0"
                        style={{
                          color:
                            activeSectionModifiedCount > 0
                              ? 'var(--prism-primary-main)'
                              : 'var(--prism-text-secondary)',
                          backgroundColor:
                            activeSectionModifiedCount > 0
                              ? 'color-mix(in srgb, var(--prism-primary-main) 14%, transparent)'
                              : 'color-mix(in srgb, var(--prism-text-secondary) 12%, transparent)',
                        }}
                      >
                        {activeSectionModifiedCount} modified
                      </span>
                    </div>
                    <p
                      data-testid="preferences-section-subtitle"
                      className="text-xs break-words"
                      style={STYLE_TEXT_SECONDARY}
                    >
                      {renderSearchText(
                        activeSection.subtitle,
                        trimmedQuery,
                        `sec-sub-${activeSection.id}`
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={disabled || activeSectionModifiedCount === 0}
                  onClick={() => handleResetSection(activeSection)}
                  onKeyDown={handleImeSafeButtonKeyDown}
                  className="prism-btn-secondary prism-focus-ring h-8 px-3 inline-flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <RotateCcw
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 relative z-10"
                  />
                  <span className="relative z-10">Reset Section Defaults</span>
                </button>
              </div>

              {/* Grouped Optical Preference Cards */}
              {activeGroups.length > 0 ? (
                <div className="flex flex-col gap-3 min-w-0">
                  {activeGroups.map((group) => (
                    <section
                      key={`${activeSection.id}-${group.groupName}`}
                      aria-label={group.groupName}
                      data-testid={`preferences-group-${group.groupName}`}
                      className={cx(
                        groupClass,
                        'prism-crystal rounded-2xl p-4 flex flex-col gap-3 min-w-0'
                      )}
                      style={{
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: 'var(--prism-divider)',
                      }}
                    >
                      <h4
                        className="text-[11px] font-semibold uppercase tracking-wider truncate"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {renderSearchText(
                          group.groupName,
                          trimmedQuery,
                          `grp-${activeSection.id}-${group.groupName}`
                        )}
                      </h4>

                      <div className="flex flex-col divide-y min-w-0">
                        {group.items.map(({ setting, domId }, itemIndex) => {
                          const descriptionDomId = `${domId}-desc`;
                          const isItemDisabled = Boolean(
                            disabled || setting.disabled
                          );
                          const currentValue = resolveSettingValue(
                            setting,
                            effectiveValuesMap
                          );
                          const defaultValue = normalizeSettingValue(
                            setting,
                            setting.defaultValue
                          );
                          const isModified = currentValue !== defaultValue;

                          return (
                            <div
                              key={setting.id}
                              data-testid={`preferences-row-${setting.id}`}
                              data-modified={isModified ? 'true' : undefined}
                              className={cx(
                                rowClass,
                                'flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0',
                                itemIndex > 0 ? 'pt-3' : '',
                                itemIndex < group.items.length - 1 ? 'pb-3' : ''
                              )}
                              style={STYLE_BORDER_DIVIDER}
                            >
                              {/* Setting Label & Description */}
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  {setting.kind === 'select' ||
                                  setting.kind === 'slider' ? (
                                    <label
                                      htmlFor={domId}
                                      className="text-xs sm:text-sm font-semibold tracking-tight break-words"
                                      style={{
                                        color: isItemDisabled
                                          ? 'var(--prism-text-disabled)'
                                          : 'var(--prism-text-primary)',
                                      }}
                                    >
                                      {renderSearchText(
                                        setting.label,
                                        trimmedQuery,
                                        `lbl-${setting.id}`
                                      )}
                                    </label>
                                  ) : (
                                    <span
                                      className="text-xs sm:text-sm font-semibold tracking-tight break-words"
                                      style={{
                                        color: isItemDisabled
                                          ? 'var(--prism-text-disabled)'
                                          : 'var(--prism-text-primary)',
                                      }}
                                    >
                                      {renderSearchText(
                                        setting.label,
                                        trimmedQuery,
                                        `lbl-${setting.id}`
                                      )}
                                    </span>
                                  )}

                                  {isModified ? (
                                    <span
                                      aria-hidden="true"
                                      className="w-1.5 h-1.5 rounded-full shrink-0"
                                      style={{
                                        backgroundColor:
                                          'var(--prism-primary-main)',
                                      }}
                                    />
                                  ) : null}
                                </div>

                                {setting.description ? (
                                  <p
                                    id={descriptionDomId}
                                    className="text-xs break-words"
                                    style={STYLE_TEXT_SECONDARY}
                                  >
                                    {renderSearchText(
                                      setting.description,
                                      trimmedQuery,
                                      `desc-${setting.id}`
                                    )}
                                  </p>
                                ) : null}
                              </div>

                              {/* Interactive Control */}
                              <div className="flex items-center sm:justify-end min-w-0 shrink-0">
                                {setting.kind === 'toggle'
                                  ? (() => {
                                      const isChecked = currentValue === true;
                                      return (
                                        <button
                                          type="button"
                                          role="switch"
                                          aria-checked={isChecked}
                                          aria-label={setting.label}
                                          aria-describedby={
                                            setting.description
                                              ? descriptionDomId
                                              : undefined
                                          }
                                          disabled={isItemDisabled}
                                          onClick={() =>
                                            handleSettingChange(
                                              activeSection.id,
                                              setting,
                                              !isChecked
                                            )
                                          }
                                          onKeyDown={handleImeSafeButtonKeyDown}
                                          className={cx(
                                            'prism-focus-ring relative inline-flex items-center w-12 h-7 rounded-full p-0.5 transition-[color,background-color,border-color,opacity,transform] duration-150 shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                                            isChecked
                                              ? 'prism-emerald'
                                              : 'prism-well'
                                          )}
                                          style={{
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            borderColor: isChecked
                                              ? 'color-mix(in srgb, var(--prism-success-main) 50%, transparent)'
                                              : 'var(--prism-well-border)',
                                          }}
                                        >
                                          <span
                                            aria-hidden="true"
                                            className={cx(
                                              'prism-thumb block w-5 h-5 rounded-full transition-transform duration-150',
                                              isChecked
                                                ? 'translate-x-5'
                                                : 'translate-x-0'
                                            )}
                                          />
                                        </button>
                                      );
                                    })()
                                  : null}

                                {setting.kind === 'segmented' ? (
                                  <div
                                    role="group"
                                    aria-label={setting.label}
                                    aria-describedby={
                                      setting.description
                                        ? descriptionDomId
                                        : undefined
                                    }
                                    className="prism-well inline-flex flex-wrap items-center gap-1 rounded-full p-1 max-w-full"
                                    style={{
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      borderColor: 'var(--prism-well-border)',
                                    }}
                                  >
                                    {(setting.options ?? []).map((option) => {
                                      const isSelected =
                                        String(currentValue) === option.value;
                                      return (
                                        <button
                                          key={option.value}
                                          type="button"
                                          aria-pressed={isSelected}
                                          disabled={isItemDisabled}
                                          onClick={() =>
                                            handleSettingChange(
                                              activeSection.id,
                                              setting,
                                              option.value
                                            )
                                          }
                                          onKeyDown={handleImeSafeButtonKeyDown}
                                          className={cx(
                                            'prism-focus-ring h-7 px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] duration-150 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                                            isSelected
                                              ? 'prism-crystal'
                                              : 'enabled:hover:brightness-105'
                                          )}
                                          style={{
                                            color: isSelected
                                              ? 'var(--prism-primary-main)'
                                              : 'var(--prism-text-secondary)',
                                            borderWidth: '1px',
                                            borderStyle: 'solid',
                                            borderColor: isSelected
                                              ? 'color-mix(in srgb, var(--prism-primary-main) 42%, transparent)'
                                              : 'transparent',
                                          }}
                                        >
                                          {option.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : null}

                                {setting.kind === 'select' ? (
                                  <div className="relative inline-flex items-center w-full sm:w-56 min-w-0 max-w-full">
                                    <select
                                      id={domId}
                                      aria-label={setting.label}
                                      aria-describedby={
                                        setting.description
                                          ? descriptionDomId
                                          : undefined
                                      }
                                      value={String(currentValue)}
                                      disabled={isItemDisabled}
                                      onChange={(event) =>
                                        handleSettingChange(
                                          activeSection.id,
                                          setting,
                                          event.target.value
                                        )
                                      }
                                      className="prism-well prism-focus-ring w-full min-w-0 h-9 rounded-xl pl-3 pr-8 text-xs font-semibold appearance-none cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                                      style={{
                                        color: 'var(--prism-text-primary)',
                                        borderWidth: '1px',
                                        borderStyle: 'solid',
                                        borderColor: 'var(--prism-well-border)',
                                      }}
                                    >
                                      {(setting.options ?? []).map((option) => (
                                        <option
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown
                                      aria-hidden="true"
                                      className="w-3.5 h-3.5 pointer-events-none absolute right-2.5 shrink-0"
                                      style={STYLE_TEXT_SECONDARY}
                                    />
                                  </div>
                                ) : null}

                                {setting.kind === 'slider'
                                  ? (() => {
                                      const bounds = getSliderBounds(setting);
                                      const numericValue = Number(currentValue);

                                      return (
                                        <div className="flex items-center gap-3 w-full sm:w-56 min-w-0">
                                          <input
                                            id={domId}
                                            type="range"
                                            min={bounds.min}
                                            max={bounds.max}
                                            step={bounds.step}
                                            value={numericValue}
                                            disabled={isItemDisabled}
                                            aria-label={setting.label}
                                            aria-describedby={
                                              setting.description
                                                ? descriptionDomId
                                                : undefined
                                            }
                                            onChange={(event) => {
                                              const parsed = Number(
                                                event.target.value
                                              );
                                              handleSettingChange(
                                                activeSection.id,
                                                setting,
                                                clampNumber(
                                                  parsed,
                                                  bounds.min,
                                                  bounds.max,
                                                  numericValue
                                                )
                                              );
                                            }}
                                            className="prism-focus-ring flex-1 min-w-0 h-2 rounded-full cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                                            style={{
                                              accentColor:
                                                'var(--prism-primary-main)',
                                            }}
                                          />
                                          <span
                                            data-testid={`preferences-slider-readout-${setting.id}`}
                                            className="prism-well px-2 py-0.5 rounded-lg font-mono text-xs font-semibold tabular-nums whitespace-nowrap shrink-0"
                                            style={{
                                              color:
                                                'var(--prism-text-primary)',
                                              borderWidth: '1px',
                                              borderStyle: 'solid',
                                              borderColor:
                                                'var(--prism-well-border)',
                                            }}
                                          >
                                            {numericValue}
                                            {setting.unit ?? ''}
                                          </span>
                                        </div>
                                      );
                                    })()
                                  : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                <div
                  role="status"
                  data-testid="preferences-section-empty"
                  className="prism-crystal rounded-2xl p-6 text-center min-w-0"
                  style={{
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: 'var(--prism-divider)',
                  }}
                >
                  <p
                    className="text-xs sm:text-sm"
                    style={STYLE_TEXT_SECONDARY}
                  >
                    No preferences configured in {activeSection.title}.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div
              role="status"
              data-testid="preferences-empty-state"
              className="prism-crystal rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center gap-3 min-w-0"
              style={{
                borderWidth: '1px',
                borderStyle: 'solid',
                borderColor: 'var(--prism-divider)',
              }}
            >
              <span
                aria-hidden="true"
                className="prism-well w-11 h-11 rounded-2xl inline-flex items-center justify-center shrink-0"
                style={STYLE_TEXT_SECONDARY}
              >
                <Search className="w-5 h-5" />
              </span>
              <div className="flex flex-col gap-1 min-w-0 max-w-md">
                <p
                  className="text-sm font-semibold break-words"
                  style={STYLE_TEXT_PRIMARY}
                >
                  {isFiltering
                    ? `No settings match "${trimmedQuery}"`
                    : 'No preference categories configured'}
                </p>
                <p
                  className="text-xs break-words"
                  style={STYLE_TEXT_SECONDARY}
                >
                  {isFiltering
                    ? 'Try a different setting name, category, or clear your search filter.'
                    : 'Provide at least one category in the sections prop to configure system preferences.'}
                </p>
              </div>
              {isFiltering ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={handleClearSearch}
                  onKeyDown={handleImeSafeButtonKeyDown}
                  className="prism-btn-primary prism-focus-ring h-9 px-4 text-xs font-semibold whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <span className="relative z-10">Clear Search</span>
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Polite Live Status Banner */}
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-testid="preferences-status-banner"
        className={cx(
          statusClass,
          'prism-well rounded-xl px-3 py-1.5 text-[11px] truncate min-w-0 max-w-full'
        )}
        style={{
          color: 'var(--prism-text-secondary)',
          borderWidth: '1px',
          borderStyle: 'solid',
          borderColor: 'var(--prism-well-border)',
        }}
      >
        {liveStatusText}
      </p>
    </div>
  );
}

export const SystemPreferencesShell = memo(SystemPreferencesShellInner);
SystemPreferencesShell.displayName = 'SystemPreferencesShell';
