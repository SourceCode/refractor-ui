export interface DesktopWallpaperPresetMap {
  'prism-aurora': true;
  'alabaster-mist': true;
  'obsidian-grid': true;
  'solar-refraction': true;
}

export interface DesktopIconKindMap {
  folder: true;
  app: true;
  document: true;
  archive: true;
  image: true;
  drive: true;
}

export {
  DEFAULT_DESKTOP_ICONS,
  DesktopIconCanvas,
} from './DesktopIconCanvas';
export type {
  DesktopIconCanvasProps,
  DesktopIconItem,
  DesktopIconKind,
  DesktopSortKey,
  DesktopWallpaperPreset,
} from './DesktopIconCanvas';
