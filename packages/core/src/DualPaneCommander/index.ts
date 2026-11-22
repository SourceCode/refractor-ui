export interface CommanderPaneSideMap {
  left: true;
  right: true;
}

export interface CommanderActionKindMap {
  copy: true;
  move: true;
  compare: true;
  sync: true;
  swap: true;
}

export { DualPaneCommander } from './DualPaneCommander';
export type {
  CommanderActionKind,
  CommanderFileEntry,
  CommanderPaneSide,
  DualPaneCommanderProps,
} from './DualPaneCommander';
