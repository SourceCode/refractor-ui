export interface QuickLookMediaKindMap {
  image: true;
  pdf: true;
  audio: true;
  code: true;
}

export { QuickLookPreviewer } from './QuickLookPreviewer';
export type {
  QuickLookDisplayMode,
  QuickLookFileItem,
  QuickLookMediaKind,
  QuickLookPreviewerProps,
} from './QuickLookPreviewer';
