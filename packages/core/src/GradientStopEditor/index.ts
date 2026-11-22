export interface GradientKindMap {
  linear: true;
  radial: true;
  conic: true;
}

export {
  GradientStopEditor,
  GRADIENT_KINDS,
  GRADIENT_STOP_TOKENS,
  DEFAULT_GRADIENT_STATE,
  buildGradientCss,
} from './GradientStopEditor';
export type {
  GradientKind,
  GradientStopToken,
  GradientColorStop,
  GradientEditorState,
  GradientKindMeta,
  GradientStopTokenMeta,
  GradientStopEditorProps,
} from './GradientStopEditor';
