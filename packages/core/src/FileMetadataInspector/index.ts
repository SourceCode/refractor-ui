export interface FileInspectorKindMap {
  image: true;
  code: true;
  audio: true;
  document: true;
  archive: true;
}

export interface FileInspectorTagColorMap {
  primary: true;
  rose: true;
  emerald: true;
  info: true;
  amber: true;
  secondary: true;
}

export { FileMetadataInspector } from './FileMetadataInspector';
export type {
  FileExifEntry,
  FileInspectorKind,
  FileInspectorTagColor,
  FileMetadataInspectorProps,
  FileMetadataRecord,
  FileMetadataTag,
} from './FileMetadataInspector';
