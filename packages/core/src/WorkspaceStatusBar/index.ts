export interface StatusSyncStateMap {
  synced: true;
  syncing: true;
  dirty: true;
  offline: true;
}

export { WorkspaceStatusBar } from './WorkspaceStatusBar';
export type {
  StatusBarTone,
  StatusSyncState,
  WorkspaceStatusBarProps,
  WorkspaceStatusItem,
} from './WorkspaceStatusBar';
