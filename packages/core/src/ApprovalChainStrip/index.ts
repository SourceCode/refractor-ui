export interface ApprovalChainStatusMap {
  pending: true;
  approved: true;
  'changes-requested': true;
  rejected: true;
}

export interface ApprovalChainModeMap {
  sequential: true;
  parallel: true;
}

export { ApprovalChainStrip } from './ApprovalChainStrip';
export type {
  ApprovalChainMode,
  ApprovalChainStatus,
  ApprovalChainStripProps,
  ApprovalReviewerNode,
} from './ApprovalChainStrip';
