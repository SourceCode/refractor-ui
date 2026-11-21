export interface KanbanPriorityMap {
  low: true;
  medium: true;
  high: true;
  critical: true;
}

export { KanbanBoard } from './KanbanBoard';
export type {
  KanbanBoardProps,
  KanbanCardItem,
  KanbanColumnDef,
  KanbanPriority,
} from './KanbanBoard';
