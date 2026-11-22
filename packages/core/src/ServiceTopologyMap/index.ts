export interface TopologyNodeKindMap {
  gateway: true;
  service: true;
  database: true;
  queue: true;
  cache: true;
}

export { ServiceTopologyMap } from './ServiceTopologyMap';
export type {
  ServiceTopologyMapProps,
  TopologyHealthState,
  TopologyNodeKind,
  TopologyServiceEdge,
  TopologyServiceNode,
} from './ServiceTopologyMap';
