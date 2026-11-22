export interface DocBlockKindMap {
  paragraph: true;
  heading: true;
  callout: true;
  checklist: true;
  quote: true;
  code: true;
}

export { BlockTransformHandle } from './BlockTransformHandle';
export type {
  BlockTransformHandleProps,
  DocBlockKind,
  DocumentBlockItem,
} from './BlockTransformHandle';
