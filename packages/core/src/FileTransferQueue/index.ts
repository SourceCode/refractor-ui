export interface FileTransferOpKindMap {
  copy: true;
  move: true;
  upload: true;
  extract: true;
}

export interface FileTransferStatusMap {
  running: true;
  paused: true;
  queued: true;
  completed: true;
  canceled: true;
}

export { FileTransferQueue } from './FileTransferQueue';
export type {
  FileTransferJob,
  FileTransferOpKind,
  FileTransferQueueProps,
  FileTransferStatus,
} from './FileTransferQueue';
