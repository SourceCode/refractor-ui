import { CanvasZoomSafeAreaBar, ExportRenderQueue } from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ViewportExportDemosProps {
  componentId: string;
}

export function ViewportExportDemos({ componentId }: ViewportExportDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'canvas-zoom-safe-area-bar':
      return (
        <div className="w-full max-w-3xl">
          <CanvasZoomSafeAreaBar
            canvasLabel="3840 × 2160 · Rec.709 · 24fps"
            defaultValue={{
              zoom: 'fit',
              ruleOfThirds: true,
              titleSafe: true,
              actionSafe: true,
              aspectMask: '2.39:1',
            }}
          />
        </div>
      );

    case 'export-render-queue':
      return (
        <div className="w-full max-w-3xl">
          <ExportRenderQueue
            title="Master Delivery & Render Queue"
            onEnqueue={(config) =>
              dispatch(
                pushToast({
                  title: `Queued ${config.name} (${config.codec.toUpperCase()} · ${config.resolution})`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    default:
      return null;
  }
}
