export interface ArchiveFormatKindMap {
  zip: true;
  tar: true;
  '7z': true;
}

export { ArchiveInspector, isSafeArchiveEntryPath } from './ArchiveInspector';
export type {
  ArchiveFormatKind,
  ArchiveInspectorProps,
  ArchiveVirtualEntry,
} from './ArchiveInspector';
