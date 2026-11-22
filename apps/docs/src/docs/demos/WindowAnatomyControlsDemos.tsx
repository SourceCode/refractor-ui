import {
  FloatingInspectorPalette,
  MergedWindowTabBar,
  WindowAttachedSheet,
  WindowResizeFrame,
  WindowUtilityControls,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface WindowAnatomyControlsDemosProps {
  componentId: string;
}

export function WindowAnatomyControlsDemos({ componentId }: WindowAnatomyControlsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'merged-window-tab-bar':
      return (
        <div className="w-full max-w-4xl">
          <MergedWindowTabBar
            onTearOffTab={(tab) =>
              dispatch(pushToast({ title: `Detached "${tab.title}" to standalone window`, tone: 'info' }))
            }
            onWindowAction={(action) =>
              dispatch(pushToast({ title: `Window chrome action: ${action}`, tone: 'amber' }))
            }
          />
        </div>
      );

    case 'window-resize-frame':
      return (
        <div className="w-full max-w-4xl">
          <WindowResizeFrame
            title="Refractor Optical Canvas"
            onResizeCommit={(rect, edge) =>
              dispatch(
                pushToast({
                  title: `Resized via ${edge.toUpperCase()} -> ${rect.width}×${rect.height}px`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'window-utility-controls':
      return (
        <div className="w-full max-w-2xl">
          <WindowUtilityControls title="Optical Shader Monitor" showSampleBody />
        </div>
      );

    case 'floating-inspector-palette':
      return (
        <div className="w-full max-w-xl">
          <FloatingInspectorPalette
            title="Tool & Brush Inspector"
            parentWorkspaceName="Refractor Studio"
            showParentFocusSimulator
          />
        </div>
      );

    case 'window-attached-sheet':
      return (
        <div className="w-full max-w-4xl">
          <WindowAttachedSheet
            windowTitle="OpticalSpec_v2.md"
            sheetTitle="Save unsaved changes before closing?"
            tone="warning"
            showSiblingWindow
            onConfirm={() =>
              dispatch(pushToast({ title: 'Saved OpticalSpec_v2.md cleanly', tone: 'emerald' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
