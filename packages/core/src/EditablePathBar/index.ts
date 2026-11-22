export interface EditablePathSuggestionKindMap {
  folder: true;
  mount: true;
  recent: true;
}

export {
  DEFAULT_EDITABLE_PATH,
  DEFAULT_EDITABLE_PATH_SUGGESTIONS,
  EditablePathBar,
  normalizeEditablePath,
} from './EditablePathBar';
export type {
  EditablePathBarProps,
  EditablePathSuggestion,
  EditablePathSuggestionKind,
} from './EditablePathBar';
