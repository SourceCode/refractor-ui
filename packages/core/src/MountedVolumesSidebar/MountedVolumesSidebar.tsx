'use client';

import {
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Cloud,
  Compass,
  Download,
  FileText,
  Folder,
  HardDrive,
  Monitor,
  Pin,
  RefreshCw,
  Server,
  Star,
  Trash2,
  Usb,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { themeProps } from '../utils/themeProps';

export type VolumeMountKind = 'local' | 'network' | 'cloud' | 'removable';

export type PlacesSectionKind = 'favorite' | 'smart';

export interface PlacesNavItem {
  /** Stable unique identifier for the place or smart folder entry. */
  id: string;
  /** Visible navigation label rendered strictly as literal text. */
  label: string;
  /** Filesystem or virtual URI path associated with this location. */
  path: string;
  /** Section bucket placing the item under Favorites or Smart Folders. */
  section: PlacesSectionKind;
  /** Optional item count badge displayed on the trailing edge. */
  count?: number;
  /** Optional pinned indicator displayed for quick-access favorites. */
  pinned?: boolean;
}

export interface MountedVolumeSpec {
  /** Stable unique identifier for the mounted or unmounted storage volume. */
  id: string;
  /** Human-readable volume label rendered strictly as literal text. */
  name: string;
  /** Filesystem mount point path (e.g., `/`, `/Volumes/StudioNAS`). */
  mountPath: string;
  /** Storage bus/transport category controlling grouping and iconography. */
  kind: VolumeMountKind;
  /** Currently allocated storage capacity in gigabytes. */
  usedGb: number;
  /** Total addressable storage capacity in gigabytes. */
  totalGb: number;
  /** Whether the volume exposes an accessible Eject control when mounted. */
  ejectable: boolean;
  /** Whether the volume is currently mounted (`false` reveals the unmounted chip with Mount trigger). */
  mounted: boolean;
}

type MountedVolumesSidebarBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface MountedVolumesSidebarProps extends MountedVolumesSidebarBaseProps {
  /** Visible rail heading linked to the region landmark via `aria-labelledby`. */
  title?: string;
  /** Custom favorites and smart-folder navigation entries (defaults to standard desktop places & smart folders). */
  places?: ReadonlyArray<PlacesNavItem>;
  /** Initial local drives and network/cloud/removable mounts for uncontrolled mount/eject transitions. */
  defaultVolumes?: ReadonlyArray<MountedVolumeSpec>;
  /** Controlled active location identifier across places and mounted volumes. */
  activeId?: string;
  /** Initial active location identifier in uncontrolled mode. */
  defaultActiveId?: string;
  /** Callback fired whenever a place or mounted volume is selected (or safely reset on active volume eject). */
  onSelectLocation?: (id: string, path: string, label: string) => void;
  /** Callback fired when an ejectable mounted volume is ejected. */
  onEjectVolume?: (volumeId: string) => void;
  /** Callback fired when an unmounted volume is remounted via its recovery trigger. */
  onRemountVolume?: (volumeId: string) => void;
  /** Disables section toggles, location selection, eject/remount controls, and keyboard traversal. */
  disabled?: boolean;
}

type SidebarSectionKey = 'favorites' | 'smart' | 'local' | 'mounts';

interface ExpandedSectionsState {
  favorites: boolean;
  smart: boolean;
  local: boolean;
  mounts: boolean;
}

interface ActiveLocationSummary {
  id: string;
  path: string;
  label: string;
}

interface VolumeCapacityMetrics {
  usedGb: number;
  totalGb: number;
  percent: number;
  tone: 'info' | 'warning' | 'error';
  colorToken: string;
}

const DEFAULT_TITLE = 'Places & Mounted Volumes';

const DEFAULT_PLACES: ReadonlyArray<PlacesNavItem> = [
  {
    id: 'fav-desktop',
    label: 'Desktop',
    path: '/Users/studio/Desktop',
    section: 'favorite',
    pinned: true,
  },
  {
    id: 'fav-documents',
    label: 'Documents',
    path: '/Users/studio/Documents',
    section: 'favorite',
    pinned: true,
  },
  {
    id: 'fav-downloads',
    label: 'Downloads',
    path: '/Users/studio/Downloads',
    section: 'favorite',
    count: 14,
  },
  {
    id: 'fav-projects',
    label: 'Projects',
    path: '/Users/studio/Projects',
    section: 'favorite',
    pinned: true,
    count: 8,
  },
  {
    id: 'smart-recent',
    label: 'Recent',
    path: 'smart://recent',
    section: 'smart',
    count: 24,
  },
  {
    id: 'smart-starred',
    label: 'Starred',
    path: 'smart://starred',
    section: 'smart',
    count: 9,
  },
  {
    id: 'smart-trash',
    label: 'Trash',
    path: 'smart://trash',
    section: 'smart',
    count: 3,
  },
];

const DEFAULT_VOLUMES: ReadonlyArray<MountedVolumeSpec> = [
  {
    id: 'vol-system-nvme',
    name: 'System NVMe',
    mountPath: '/',
    kind: 'local',
    usedGb: 612,
    totalGb: 1000,
    ejectable: false,
    mounted: true,
  },
  {
    id: 'vol-render-scratch',
    name: 'Render Scratch',
    mountPath: '/Volumes/RenderScratch',
    kind: 'local',
    usedGb: 1840,
    totalGb: 2000,
    ejectable: false,
    mounted: true,
  },
  {
    id: 'vol-studio-nas',
    name: 'Studio NAS (SMB)',
    mountPath: '/Volumes/StudioNAS',
    kind: 'network',
    usedGb: 6480,
    totalGb: 8000,
    ejectable: true,
    mounted: true,
  },
  {
    id: 'vol-prism-cloud',
    name: 'Prism Cloud Drive',
    mountPath: '/Volumes/PrismCloud',
    kind: 'cloud',
    usedGb: 320,
    totalGb: 1000,
    ejectable: true,
    mounted: true,
  },
  {
    id: 'vol-cfexpress',
    name: 'CFexpress Card',
    mountPath: '/Volumes/CFexpress_A',
    kind: 'removable',
    usedGb: 216,
    totalGb: 256,
    ejectable: true,
    mounted: true,
  },
];

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizePlaces(items: ReadonlyArray<PlacesNavItem>): PlacesNavItem[] {
  const seen = new Set<string>();
  const normalized: PlacesNavItem[] = [];

  for (const item of items) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);

    const safeCount =
      item.count === undefined
        ? undefined
        : Number.isFinite(item.count)
          ? Math.max(0, Math.round(item.count))
          : 0;

    normalized.push({
      ...item,
      label: item.label.trim() || item.id,
      path: item.path.trim() || '/',
      count: safeCount,
    });
  }

  return normalized;
}

function normalizeVolumes(items: ReadonlyArray<MountedVolumeSpec>): MountedVolumeSpec[] {
  const seen = new Set<string>();
  const normalized: MountedVolumeSpec[] = [];

  for (const vol of items) {
    if (seen.has(vol.id)) {
      continue;
    }
    seen.add(vol.id);

    normalized.push({
      ...vol,
      name: vol.name.trim() || vol.id,
      mountPath: vol.mountPath.trim() || '/',
    });
  }

  return normalized;
}

function computeCapacityMetrics(usedGb: number, totalGb: number): VolumeCapacityMetrics {
  const safeTotal = Number.isFinite(totalGb) && totalGb > 0 ? roundTenth(totalGb) : 0;
  const rawUsed = Number.isFinite(usedGb) && usedGb > 0 ? roundTenth(usedGb) : 0;
  const safeUsed = safeTotal > 0 ? Math.min(rawUsed, safeTotal) : 0;
  const percent =
    safeTotal > 0 ? Math.min(100, Math.max(0, Math.round((safeUsed / safeTotal) * 100))) : 0;

  if (percent >= 90) {
    return {
      usedGb: safeUsed,
      totalGb: safeTotal,
      percent,
      tone: 'error',
      colorToken: 'var(--prism-error-main)',
    };
  }
  if (percent >= 75) {
    return {
      usedGb: safeUsed,
      totalGb: safeTotal,
      percent,
      tone: 'warning',
      colorToken: 'var(--prism-warning-main)',
    };
  }
  return {
    usedGb: safeUsed,
    totalGb: safeTotal,
    percent,
    tone: 'info',
    colorToken: 'var(--prism-info-main)',
  };
}

function findFallbackLocation(
  places: ReadonlyArray<PlacesNavItem>,
  volumes: ReadonlyArray<MountedVolumeSpec>
): ActiveLocationSummary | null {
  const firstFavorite = places.find((item) => item.section === 'favorite');
  if (firstFavorite) {
    return { id: firstFavorite.id, path: firstFavorite.path, label: firstFavorite.label };
  }
  const firstSmart = places.find((item) => item.section === 'smart');
  if (firstSmart) {
    return { id: firstSmart.id, path: firstSmart.path, label: firstSmart.label };
  }
  const firstMounted = volumes.find((vol) => vol.mounted);
  if (firstMounted) {
    return { id: firstMounted.id, path: firstMounted.mountPath, label: firstMounted.name };
  }
  return null;
}

function findLocationById(
  id: string,
  places: ReadonlyArray<PlacesNavItem>,
  volumes: ReadonlyArray<MountedVolumeSpec>
): ActiveLocationSummary | null {
  const place = places.find((item) => item.id === id);
  if (place) {
    return { id: place.id, path: place.path, label: place.label };
  }
  const volume = volumes.find((vol) => vol.id === id && vol.mounted);
  if (volume) {
    return { id: volume.id, path: volume.mountPath, label: volume.name };
  }
  return null;
}

function getVolumeKindLabel(kind: VolumeMountKind): string {
  switch (kind) {
    case 'local':
      return 'Local';
    case 'network':
      return 'Network';
    case 'cloud':
      return 'Cloud';
    case 'removable':
      return 'Removable';
  }
}

function renderPlaceIcon(item: PlacesNavItem, colorToken: string): ReactNode {
  const iconClass = 'w-3.5 h-3.5 shrink-0';
  const iconStyle = { color: colorToken };
  const normalized = item.label.trim().toLowerCase();

  if (item.section === 'smart') {
    if (normalized.includes('recent')) {
      return <Clock aria-hidden="true" className={iconClass} style={iconStyle} />;
    }
    if (normalized.includes('star')) {
      return <Star aria-hidden="true" className={iconClass} style={iconStyle} />;
    }
    if (normalized.includes('trash')) {
      return <Trash2 aria-hidden="true" className={iconClass} style={iconStyle} />;
    }
    return <Compass aria-hidden="true" className={iconClass} style={iconStyle} />;
  }

  if (normalized.includes('desktop')) {
    return <Monitor aria-hidden="true" className={iconClass} style={iconStyle} />;
  }
  if (normalized.includes('doc')) {
    return <FileText aria-hidden="true" className={iconClass} style={iconStyle} />;
  }
  if (normalized.includes('download')) {
    return <Download aria-hidden="true" className={iconClass} style={iconStyle} />;
  }
  return <Folder aria-hidden="true" className={iconClass} style={iconStyle} />;
}

function renderVolumeIcon(kind: VolumeMountKind, colorToken: string): ReactNode {
  const iconClass = 'w-3.5 h-3.5 shrink-0';
  const iconStyle = { color: colorToken };

  switch (kind) {
    case 'local':
      return <HardDrive aria-hidden="true" className={iconClass} style={iconStyle} />;
    case 'network':
      return <Server aria-hidden="true" className={iconClass} style={iconStyle} />;
    case 'cloud':
      return <Cloud aria-hidden="true" className={iconClass} style={iconStyle} />;
    case 'removable':
      return <Usb aria-hidden="true" className={iconClass} style={iconStyle} />;
  }
}

function renderEjectGlyph(): ReactNode {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      aria-hidden="true"
      className="block shrink-0 pointer-events-none"
    >
      <path d="M8 3.2L3.2 9.2h9.6L8 3.2zM3.2 11h9.6v1.8H3.2V11z" fill="currentColor" />
    </svg>
  );
}

export function MountedVolumesSidebar({
  title = DEFAULT_TITLE,
  places,
  defaultVolumes,
  activeId,
  defaultActiveId,
  onSelectLocation,
  onEjectVolume,
  onRemountVolume,
  disabled = false,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: MountedVolumesSidebarProps) {
  const headingId = useId();
  const basePanelId = useId();
  const override = useComponentOverride('MountedVolumesSidebar');
  const isActiveControlled = activeId !== undefined;

  const normalizedPlaces = useMemo(
    () => normalizePlaces(places ?? DEFAULT_PLACES),
    [places]
  );

  const [volumes, setVolumes] = useState<MountedVolumeSpec[]>(() =>
    normalizeVolumes(defaultVolumes ?? DEFAULT_VOLUMES)
  );

  const [internalActiveId, setInternalActiveId] = useState<string>(() => {
    if (defaultActiveId !== undefined) {
      return defaultActiveId;
    }
    const seedPlaces = normalizePlaces(places ?? DEFAULT_PLACES);
    const seedVolumes = normalizeVolumes(defaultVolumes ?? DEFAULT_VOLUMES);
    return findFallbackLocation(seedPlaces, seedVolumes)?.id ?? '';
  });

  const [expanded, setExpanded] = useState<ExpandedSectionsState>({
    favorites: true,
    smart: true,
    local: true,
    mounts: true,
  });

  const [announcement, setAnnouncement] = useState<string | null>(null);
  const itemButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const resolvedActiveId = isActiveControlled ? activeId : internalActiveId;

  const favoritePlaces = useMemo(
    () => normalizedPlaces.filter((item) => item.section === 'favorite'),
    [normalizedPlaces]
  );

  const smartPlaces = useMemo(
    () => normalizedPlaces.filter((item) => item.section === 'smart'),
    [normalizedPlaces]
  );

  const localVolumes = useMemo(
    () => volumes.filter((vol) => vol.kind === 'local'),
    [volumes]
  );

  const networkCloudVolumes = useMemo(
    () => volumes.filter((vol) => vol.kind !== 'local'),
    [volumes]
  );

  const mountedCount = useMemo(
    () => volumes.filter((vol) => vol.mounted).length,
    [volumes]
  );

  const activeLocation = useMemo(
    () => findLocationById(resolvedActiveId, normalizedPlaces, volumes),
    [resolvedActiveId, normalizedPlaces, volumes]
  );

  const visibleLocationIds = useMemo<string[]>(() => {
    const ids: string[] = [];
    if (expanded.favorites) {
      for (const item of favoritePlaces) {
        ids.push(item.id);
      }
    }
    if (expanded.smart) {
      for (const item of smartPlaces) {
        ids.push(item.id);
      }
    }
    if (expanded.local) {
      for (const vol of localVolumes) {
        if (vol.mounted) {
          ids.push(vol.id);
        }
      }
    }
    if (expanded.mounts) {
      for (const vol of networkCloudVolumes) {
        if (vol.mounted) {
          ids.push(vol.id);
        }
      }
    }
    return ids;
  }, [expanded, favoritePlaces, smartPlaces, localVolumes, networkCloudVolumes]);

  const safeTitle = title.trim() || DEFAULT_TITLE;

  const toggleSection = (key: SidebarSectionKey) => {
    setExpanded((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSectionKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    key: SidebarSectionKey
  ) => {
    if (disabled || event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === 'ArrowLeft' && expanded[key]) {
      event.preventDefault();
      setExpanded((prev) => ({ ...prev, [key]: false }));
    } else if (event.key === 'ArrowRight' && !expanded[key]) {
      event.preventDefault();
      setExpanded((prev) => ({ ...prev, [key]: true }));
    }
  };

  const handleSelectLocation = (id: string, path: string, label: string) => {
    if (!isActiveControlled) {
      setInternalActiveId(id);
    }
    setAnnouncement(`Selected ${label} (${path})`);
    onSelectLocation?.(id, path, label);
  };

  const handleItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    itemId: string
  ) => {
    if (disabled || event.nativeEvent.isComposing) {
      return;
    }
    const index = visibleLocationIds.indexOf(itemId);
    let nextIndex: number | null = null;

    if (event.key === 'ArrowDown') {
      nextIndex = (index + 1) % visibleLocationIds.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (index - 1 + visibleLocationIds.length) % visibleLocationIds.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = visibleLocationIds.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    const targetId = visibleLocationIds[nextIndex];
    if (targetId) {
      itemButtonRefs.current.get(targetId)?.focus();
    }
  };

  const handleEjectVolume = (target: MountedVolumeSpec) => {
    const nextVolumes = volumes.map((vol) =>
      vol.id === target.id ? { ...vol, mounted: false } : vol
    );
    setVolumes(nextVolumes);

    if (resolvedActiveId === target.id) {
      const fallback = findFallbackLocation(normalizedPlaces, nextVolumes);
      if (!isActiveControlled) {
        setInternalActiveId(fallback?.id ?? '');
      }
      if (fallback) {
        onSelectLocation?.(fallback.id, fallback.path, fallback.label);
        setAnnouncement(`Ejected ${target.name}. Active location reset to ${fallback.label}.`);
      } else {
        setAnnouncement(`Ejected ${target.name}. No active location selected.`);
      }
    } else {
      setAnnouncement(`Ejected ${target.name}.`);
    }

    onEjectVolume?.(target.id);
  };

  const handleRemountVolume = (target: MountedVolumeSpec) => {
    setVolumes((prev) =>
      prev.map((vol) => (vol.id === target.id ? { ...vol, mounted: true } : vol))
    );
    setAnnouncement(`Remounted ${target.name} at ${target.mountPath}.`);
    onRemountVolume?.(target.id);
  };

  const merged = mergeProps({
    themeTarget: themeProps('mounted-volumes-sidebar', {
      disabled,
      mountedCount,
      volumeCount: volumes.length,
    }),
    baseClassName: cx(
      'prism-slab w-full max-w-full p-3.5 flex flex-col gap-3 min-w-0',
      disabled ? 'opacity-65' : undefined
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });

  const headerClass = stableClassName('mounted-volumes-sidebar', 'header');
  const navClass = stableClassName('mounted-volumes-sidebar', 'nav');
  const sectionClass = stableClassName('mounted-volumes-sidebar', 'section');
  const itemClass = stableClassName('mounted-volumes-sidebar', 'item');
  const volumeClass = stableClassName('mounted-volumes-sidebar', 'volume');
  const footerClass = stableClassName('mounted-volumes-sidebar', 'footer');

  const statusText =
    announcement ??
    (activeLocation
      ? `Active: ${activeLocation.label} (${activeLocation.path})`
      : 'No active location selected');

  const renderSectionHeader = (
    key: SidebarSectionKey,
    label: string,
    count: number
  ): ReactNode => {
    const isOpen = expanded[key];
    const panelId = `${basePanelId}-${key}`;
    return (
      <button
        type="button"
        disabled={disabled}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        data-testid={`volumes-section-toggle-${key}`}
        onClick={() => toggleSection(key)}
        onKeyDown={(event) => handleSectionKeyDown(event, key)}
        className="prism-focus-ring w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-all min-w-0"
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          {isOpen ? (
            <ChevronDown
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
          ) : (
            <ChevronRight
              aria-hidden="true"
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
          )}
          <span
            className="text-[11px] font-semibold uppercase tracking-wider truncate"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            {label}
          </span>
        </span>
        <span
          data-testid={`volumes-section-count-${key}`}
          className="prism-well px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums shrink-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {count}
        </span>
      </button>
    );
  };

  const renderPlaceRow = (item: PlacesNavItem): ReactNode => {
    const isActive = resolvedActiveId === item.id;
    const iconColor = isActive ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)';
    return (
      <button
        key={item.id}
        ref={(node) => {
          if (node) {
            itemButtonRefs.current.set(item.id, node);
          } else {
            itemButtonRefs.current.delete(item.id);
          }
        }}
        type="button"
        disabled={disabled}
        aria-current={isActive ? 'location' : undefined}
        data-testid={`places-item-${item.id}`}
        data-active={isActive ? 'true' : undefined}
        data-section={item.section}
        onClick={() => handleSelectLocation(item.id, item.path, item.label)}
        onKeyDown={(event) => handleItemKeyDown(event, item.id)}
        className={cx(
          itemClass,
          'prism-crystal prism-focus-ring w-full rounded-xl px-2.5 py-2 flex items-center justify-between gap-2 min-w-0 text-left cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-all'
        )}
        style={
          isActive
            ? {
                color: 'var(--prism-primary-main)',
                boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)',
              }
            : { color: 'var(--prism-text-primary)' }
        }
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          {renderPlaceIcon(item, iconColor)}
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold truncate">{item.label}</span>
            <span
              className="block font-mono text-[10px] truncate"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {item.path}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-1.5 shrink-0">
          {item.pinned ? (
            <Pin
              aria-hidden="true"
              className="w-3 h-3 shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            />
          ) : null}
          {item.count !== undefined ? (
            <span
              data-testid={`places-count-${item.id}`}
              className="prism-well px-1.5 py-0.5 rounded-full font-mono text-[10px] font-semibold tabular-nums shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {item.count}
            </span>
          ) : null}
        </span>
      </button>
    );
  };

  const renderVolumeRow = (volume: MountedVolumeSpec): ReactNode => {
    if (!volume.mounted) {
      return (
        <div
          key={volume.id}
          data-testid={`volume-unmounted-chip-${volume.id}`}
          data-mounted="false"
          data-volume-kind={volume.kind}
          className={cx(
            volumeClass,
            'prism-well rounded-xl px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 min-w-0 border'
          )}
          style={{ borderColor: 'var(--prism-divider)' }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="shrink-0">
              {renderVolumeIcon(volume.kind, 'var(--prism-text-disabled)')}
            </span>
            <div className="min-w-0 flex-1">
              <span
                className="block text-xs font-medium truncate"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {volume.name}
              </span>
              <span
                className="block font-mono text-[10px] uppercase tracking-wider"
                style={{ color: 'var(--prism-text-disabled)' }}
              >
                Unmounted
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            aria-label={`Mount ${volume.name}`}
            data-testid={`volume-mount-${volume.id}`}
            onClick={() => handleRemountVolume(volume)}
            className="prism-crystal prism-focus-ring inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-all"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <RefreshCw aria-hidden="true" className="w-3 h-3 shrink-0" />
            <span>Mount</span>
          </button>
        </div>
      );
    }

    const isActive = resolvedActiveId === volume.id;
    const capacity = computeCapacityMetrics(volume.usedGb, volume.totalGb);
    const iconColor = isActive ? 'var(--prism-primary-main)' : 'var(--prism-text-secondary)';

    return (
      <div
        key={volume.id}
        data-testid={`volume-row-${volume.id}`}
        data-mounted="true"
        data-volume-kind={volume.kind}
        className={cx(
          volumeClass,
          'prism-crystal rounded-xl p-2 flex flex-col gap-1.5 min-w-0 transition-all'
        )}
        style={
          isActive
            ? { boxShadow: 'inset 0 0 0 1.5px var(--prism-primary-main)' }
            : undefined
        }
      >
        <div className="flex items-start justify-between gap-2 min-w-0">
          <button
            ref={(node) => {
              if (node) {
                itemButtonRefs.current.set(volume.id, node);
              } else {
                itemButtonRefs.current.delete(volume.id);
              }
            }}
            type="button"
            disabled={disabled}
            aria-current={isActive ? 'location' : undefined}
            data-testid={`volume-select-${volume.id}`}
            data-active={isActive ? 'true' : undefined}
            onClick={() => handleSelectLocation(volume.id, volume.mountPath, volume.name)}
            onKeyDown={(event) => handleItemKeyDown(event, volume.id)}
            className="prism-focus-ring flex-1 min-w-0 text-left flex items-center gap-2 rounded-lg p-0.5 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-all"
          >
            <span className="prism-well w-6 h-6 rounded-lg inline-flex items-center justify-center shrink-0">
              {renderVolumeIcon(volume.kind, iconColor)}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className="block text-xs font-semibold truncate"
                style={{
                  color: isActive ? 'var(--prism-primary-main)' : 'var(--prism-text-primary)',
                }}
              >
                {volume.name}
              </span>
              <span
                className="block font-mono text-[10px] truncate"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {volume.mountPath}
              </span>
            </span>
          </button>

          {volume.ejectable ? (
            <button
              type="button"
              disabled={disabled}
              aria-label={`Eject ${volume.name}`}
              data-testid={`volume-eject-${volume.id}`}
              onClick={() => handleEjectVolume(volume)}
              className="prism-well prism-focus-ring w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:brightness-105 transition-all"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {renderEjectGlyph()}
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1 min-w-0 px-0.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5 min-w-0">
            <span
              className="font-mono text-[10px] uppercase tracking-wider shrink-0"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {getVolumeKindLabel(volume.kind)}
            </span>
            <span
              data-testid={`volume-capacity-label-${volume.id}`}
              className="font-mono text-[10px] font-semibold tabular-nums truncate"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              {capacity.usedGb}/{capacity.totalGb} GB ({capacity.percent}%)
            </span>
          </div>

          <div
            role="progressbar"
            aria-label={`${volume.name} storage capacity`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={capacity.percent}
            data-testid={`volume-capacity-bar-${volume.id}`}
            data-capacity-tone={capacity.tone}
            className="prism-well h-1.5 w-full rounded-full overflow-hidden"
          >
            <div
              data-testid={`volume-capacity-fill-${volume.id}`}
              className="h-full rounded-full transition-all"
              style={{
                width: `${capacity.percent}%`,
                backgroundColor: capacity.colorToken,
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={ref}
      role="region"
      aria-labelledby={headingId}
      aria-disabled={disabled || undefined}
      {...rest}
      {...merged}
    >
      <div
        className={cx(
          headerClass,
          'flex flex-wrap items-center justify-between gap-2 min-w-0 pb-2.5 border-b'
        )}
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            aria-hidden="true"
            className="prism-well w-7 h-7 rounded-lg inline-flex items-center justify-center shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
          >
            <HardDrive className="w-3.5 h-3.5 shrink-0" />
          </span>
          <h3
            id={headingId}
            className="text-sm font-semibold tracking-tight truncate min-w-0"
            style={{ color: 'var(--prism-text-primary)' }}
          >
            {safeTitle}
          </h3>
        </div>

        <span
          data-testid="mounted-volumes-summary"
          className="prism-well inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono text-[11px] font-semibold tabular-nums whitespace-nowrap shrink-0"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          <span
            aria-hidden="true"
            className="w-2 h-2 rounded-full shrink-0"
            style={{
              backgroundColor:
                mountedCount > 0 ? 'var(--prism-success-main)' : 'var(--prism-text-disabled)',
            }}
          />
          <span>
            {mountedCount}/{volumes.length} Mounted
          </span>
        </span>
      </div>

      <nav aria-label={safeTitle} className={cx(navClass, 'flex flex-col gap-2.5 min-w-0')}>
        <section
          aria-label="Favorites"
          data-testid="volumes-section-favorites"
          className={cx(sectionClass, 'flex flex-col gap-1 min-w-0')}
        >
          {renderSectionHeader('favorites', 'Favorites', favoritePlaces.length)}
          {expanded.favorites ? (
            <div
              id={`${basePanelId}-favorites`}
              data-testid="volumes-panel-favorites"
              className="flex flex-col gap-1.5 pt-0.5 min-w-0"
            >
              {favoritePlaces.length > 0 ? (
                favoritePlaces.map((item) => renderPlaceRow(item))
              ) : (
                <p
                  data-testid="volumes-empty-favorites"
                  className="px-2.5 py-1.5 text-xs"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  No favorite places
                </p>
              )}
            </div>
          ) : null}
        </section>

        <section
          aria-label="Smart Folders"
          data-testid="volumes-section-smart"
          className={cx(sectionClass, 'flex flex-col gap-1 min-w-0')}
        >
          {renderSectionHeader('smart', 'Smart Folders', smartPlaces.length)}
          {expanded.smart ? (
            <div
              id={`${basePanelId}-smart`}
              data-testid="volumes-panel-smart"
              className="flex flex-col gap-1.5 pt-0.5 min-w-0"
            >
              {smartPlaces.length > 0 ? (
                smartPlaces.map((item) => renderPlaceRow(item))
              ) : (
                <p
                  data-testid="volumes-empty-smart"
                  className="px-2.5 py-1.5 text-xs"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  No smart folders
                </p>
              )}
            </div>
          ) : null}
        </section>

        <section
          aria-label="Local Drives"
          data-testid="volumes-section-local"
          className={cx(sectionClass, 'flex flex-col gap-1 min-w-0')}
        >
          {renderSectionHeader('local', 'Local Drives', localVolumes.length)}
          {expanded.local ? (
            <div
              id={`${basePanelId}-local`}
              data-testid="volumes-panel-local"
              className="flex flex-col gap-1.5 pt-0.5 min-w-0"
            >
              {localVolumes.length > 0 ? (
                localVolumes.map((vol) => renderVolumeRow(vol))
              ) : (
                <p
                  data-testid="volumes-empty-local"
                  className="px-2.5 py-1.5 text-xs"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  No local drives attached
                </p>
              )}
            </div>
          ) : null}
        </section>

        <section
          aria-label="Network & Cloud Mounts"
          data-testid="volumes-section-mounts"
          className={cx(sectionClass, 'flex flex-col gap-1 min-w-0')}
        >
          {renderSectionHeader('mounts', 'Network & Cloud Mounts', networkCloudVolumes.length)}
          {expanded.mounts ? (
            <div
              id={`${basePanelId}-mounts`}
              data-testid="volumes-panel-mounts"
              className="flex flex-col gap-1.5 pt-0.5 min-w-0"
            >
              {networkCloudVolumes.length > 0 ? (
                networkCloudVolumes.map((vol) => renderVolumeRow(vol))
              ) : (
                <p
                  data-testid="volumes-empty-mounts"
                  className="px-2.5 py-1.5 text-xs"
                  style={{ color: 'var(--prism-text-secondary)' }}
                >
                  No network or cloud mounts
                </p>
              )}
            </div>
          ) : null}
        </section>
      </nav>

      <div
        role="status"
        aria-live="polite"
        data-testid="mounted-volumes-status"
        className={cx(
          footerClass,
          'prism-well rounded-xl px-3 py-2 flex items-center gap-2 min-w-0 border'
        )}
        style={{ borderColor: 'var(--prism-divider)' }}
      >
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: activeLocation
              ? 'var(--prism-primary-main)'
              : 'var(--prism-text-disabled)',
          }}
        />
        <span
          className="text-xs font-medium truncate min-w-0"
          style={{ color: 'var(--prism-text-secondary)' }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}

MountedVolumesSidebar.displayName = 'MountedVolumesSidebar';
