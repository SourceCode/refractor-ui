import {
  DesktopIconCanvas,
  DesktopWidgetFrame,
  SystemAboutCard,
  SystemFileDialog,
  SystemPreferencesShell,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface DesktopSurfacesDialogsDemosProps {
  componentId: string;
}

export function DesktopSurfacesDialogsDemos({ componentId }: DesktopSurfacesDialogsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'desktop-icon-canvas':
      return (
        <div className="w-full max-w-4xl">
          <DesktopIconCanvas
            onOpenItem={(item) =>
              dispatch(
                pushToast({
                  title: `Opened desktop item: ${item.name}`,
                  description: `Kind: ${item.kind} at grid (${item.col}, ${item.row})`,
                  tone: 'emerald',
                })
              )
            }
            onWallpaperChange={(preset) =>
              dispatch(pushToast({ title: `Applied wallpaper preset: ${preset}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'desktop-widget-frame':
      return (
        <div className="w-full max-w-3xl grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <DesktopWidgetFrame
            kind="telemetry"
            defaultSize="md"
            onRefresh={() =>
              dispatch(pushToast({ title: 'Refreshed Optical Telemetry gadget', tone: 'emerald' }))
            }
            onRemove={() =>
              dispatch(pushToast({ title: 'Removed widget from desktop layer', tone: 'amber' }))
            }
          />
          <DesktopWidgetFrame
            kind="weather"
            defaultSize="sm"
            defaultTone="info"
            onRefresh={() =>
              dispatch(pushToast({ title: 'Updated studio weather gadget', tone: 'info' }))
            }
          />
        </div>
      );

    case 'system-preferences-shell':
      return (
        <div className="w-full max-w-4xl">
          <SystemPreferencesShell
            onSettingChange={(settingId, value, sectionId) =>
              dispatch(
                pushToast({
                  title: `Updated ${settingId}`,
                  description: `${sectionId}: ${String(value)}`,
                  tone: 'info',
                })
              )
            }
            onResetSection={(sectionId) =>
              dispatch(pushToast({ title: `Restored defaults for ${sectionId}`, tone: 'amber' }))
            }
          />
        </div>
      );

    case 'system-file-dialog':
      return (
        <div className="w-full max-w-4xl">
          <SystemFileDialog
            mode="inline"
            defaultDialogKind="open"
            allowKindSwitch
            onConfirm={(result) =>
              dispatch(
                pushToast({
                  title: `${result.dialogKind === 'save' ? 'Saved' : 'Opened'} ${result.fileName}`,
                  description: result.fullPath,
                  tone: 'emerald',
                })
              )
            }
            onCreateFolder={(folderPath) =>
              dispatch(pushToast({ title: `Created folder ${folderPath}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'system-about-card':
      return (
        <div className="w-full max-w-xl mx-auto">
          <SystemAboutCard
            mode="inline"
            onCopyDiagnostics={() =>
              dispatch(pushToast({ title: 'Copied system diagnostics to clipboard', tone: 'emerald' }))
            }
            onCheckUpdates={() =>
              dispatch(pushToast({ title: 'Checking for Refractor OS updates…', tone: 'info' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
