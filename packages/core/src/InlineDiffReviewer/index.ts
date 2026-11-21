export interface DiffHunkLineKindMap {
  context: true;
  add: true;
  remove: true;
}

export interface DiffHunkStatusMap {
  pending: true;
  accepted: true;
  rejected: true;
}

export { InlineDiffReviewer } from './InlineDiffReviewer';
export type {
  DiffHunk,
  DiffHunkLine,
  DiffHunkLineKind,
  DiffHunkStatus,
  InlineDiffReviewerProps,
} from './InlineDiffReviewer';
