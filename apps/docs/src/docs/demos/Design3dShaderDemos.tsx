import {
  AlignmentToolbar,
  AssetSwatchGrid,
  GradientStopEditor,
  OpticalMaterialInspector,
  SpringEasingPicker,
  TransformInspector,
  VectorXyPad,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface Design3dShaderDemosProps {
  componentId: string;
}

export function Design3dShaderDemos({ componentId }: Design3dShaderDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'vector-xy-pad':
      return (
        <div className="w-full max-w-md mx-auto">
          <VectorXyPad
            title="Key Light Azimuth / Elevation"
            xLabel="Azimuth (X)"
            yLabel="Elevation (Y)"
            defaultValue={{ x: 24, y: 38 }}
          />
        </div>
      );

    case 'transform-inspector':
      return (
        <div className="w-full max-w-xl">
          <TransformInspector
            title="Glass Slab 3D Transform"
            defaultValue={{
              position: { x: 120, y: 48, z: 0 },
              rotation: { x: 4, y: -12, z: 0 },
              scale: { x: 1, y: 1, z: 1 },
              scaleLocked: true,
            }}
          />
        </div>
      );

    case 'gradient-stop-editor':
      return (
        <div className="w-full max-w-2xl">
          <GradientStopEditor title="Prismatic Multi-Stop Gradient" />
        </div>
      );

    case 'spring-easing-picker':
      return (
        <div className="w-full max-w-2xl">
          <SpringEasingPicker title="UI Transition Spring & Easing Physics" />
        </div>
      );

    case 'optical-material-inspector':
      return (
        <div className="w-full max-w-3xl">
          <OpticalMaterialInspector title="Refractive Glass Shader Properties" />
        </div>
      );

    case 'alignment-toolbar':
      return (
        <div className="w-full max-w-2xl">
          <AlignmentToolbar
            selectedCount={3}
            showMiniStage
            onAlign={(action, anchor) =>
              dispatch(pushToast({ title: `Applied ${action} (${anchor})`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'asset-swatch-grid':
      return (
        <div className="w-full max-w-3xl">
          <AssetSwatchGrid
            title="Studio Optical Asset & Swatch Library"
            onSelectAsset={(asset) =>
              dispatch(pushToast({ title: `Selected ${asset.name} (${asset.kind})`, tone: 'emerald' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
