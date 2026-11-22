export interface TaskProcessStatusMap {
  running: true;
  unresponsive: true;
  sleeping: true;
}

export interface TaskProcessSortKeyMap {
  cpu: true;
  memory: true;
  name: true;
}

export { TaskManagerDialog } from './TaskManagerDialog';
export type {
  TaskManagerDialogProps,
  TaskProcessItem,
  TaskProcessSortKey,
  TaskProcessStatus,
} from './TaskManagerDialog';
