import {
  BrushHudControl,
  CropStraightenOverlay,
  EyedropperPixelLoupe,
  LayerBlendStack,
  LiveColorScopes,
  ThreeWayColorWheels,
  ToneCurveEditor,
  WipeCompareOverlay,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface PhotoColorGradingDemosProps {
  componentId: string;
}

export function PhotoColorGradingDemos({ componentId }: PhotoColorGradingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'tone-curve-editor':
      return (
        <div className="w-full max-w-xl">
          <ToneCurveEditor title="Master RGB + Luma Tone Curve" />
        </div>
      );

    case 'three-way-color-wheels':
      return (
        <div className="w-full max-w-3xl">
          <ThreeWayColorWheels title="Primary 3-Way Color Balance" />
        </div>
      );

    case 'live-color-scopes':
      return (
        <div className="w-full max-w-3xl">
          <LiveColorScopes title="Broadcast Color Scopes (Rec.709)" defaultMode="all" />
        </div>
      );

    case 'crop-straighten-overlay':
      return (
        <div className="w-full max-w-2xl">
          <CropStraightenOverlay
            mediaLabel="A009_Prism_Master_RAW.dng"
            defaultAspect="16:9"
            onApply={(state) =>
              dispatch(
                pushToast({
                  title: `Crop applied (${state.crop.width.toFixed(0)}×${state.crop.height.toFixed(0)}%, ${state.rotationDeg.toFixed(1)}°)`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'layer-blend-stack':
      return (
        <div className="w-full max-w-xl">
          <LayerBlendStack
            title="Composite Layer Stack"
            onSelectLayer={(layer) =>
              dispatch(pushToast({ title: `Active layer: ${layer.name}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'eyedropper-pixel-loupe':
      return (
        <div className="w-full max-w-2xl">
          <EyedropperPixelLoupe
            title="Optical Pixel Sampler"
            onSample={(pixel) =>
              dispatch(
                pushToast({
                  title: `Sampled ${pixel.hex} at (${pixel.x}, ${pixel.y})`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'brush-hud-control':
      return (
        <div className="w-full max-w-xl">
          <BrushHudControl title="Retouch Brush HUD" />
        </div>
      );

    case 'wipe-compare-overlay':
      return (
        <div className="w-full max-w-2xl">
          <WipeCompareOverlay
            beforeLabel="Original (Log-C)"
            afterLabel="Graded (Prism LUT)"
            defaultPositionPct={52}
          />
        </div>
      );

    default:
      return null;
  }
}
