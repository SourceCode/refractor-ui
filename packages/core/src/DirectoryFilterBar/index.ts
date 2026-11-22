export interface DirectoryGroupByMap {
  none: true;
  kind: true;
  date: true;
  size: true;
}

export interface DirectoryTagToneMap {
  primary: true;
  emerald: true;
  amber: true;
  info: true;
  rose: true;
}

export { DirectoryFilterBar } from './DirectoryFilterBar';
export type {
  DirectoryFilterBarProps,
  DirectoryFilterItem,
  DirectoryFilterState,
  DirectoryGroupBy,
  DirectorySortDir,
  DirectoryTagTone,
} from './DirectoryFilterBar';
