export interface RecoveryRouteKindMap {
  retry: true;
  edit: true;
  switch: true;
  skip: true;
}

export { RecoveryRoutingCard } from './RecoveryRoutingCard';
export type {
  RecoveryRouteAction,
  RecoveryRouteKind,
  RecoveryRoutingCardProps,
} from './RecoveryRoutingCard';
