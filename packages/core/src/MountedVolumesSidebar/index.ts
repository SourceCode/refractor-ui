export interface VolumeMountKindMap {
  local: true;
  network: true;
  cloud: true;
  removable: true;
}

export interface PlacesSectionKindMap {
  favorite: true;
  smart: true;
}

export { MountedVolumesSidebar } from './MountedVolumesSidebar';
export type {
  MountedVolumeSpec,
  MountedVolumesSidebarProps,
  PlacesNavItem,
  PlacesSectionKind,
  VolumeMountKind,
} from './MountedVolumesSidebar';
