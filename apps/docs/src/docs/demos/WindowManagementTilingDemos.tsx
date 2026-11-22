import {
  MinimizedWindowTray,
  SnapZoneOverlay,
  VirtualDesktopBar,
  WindowExposeGrid,
  WindowLayoutPopover,
  WindowSwitcherOverlay,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface WindowManagementTilingDemosProps {
  componentId: string;
}

export function WindowManagementTilingDemos({ componentId }: WindowManagementTilingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'snap-zone-overlay':
      return (
        <div className="w-full max-w-4xl">
          <SnapZoneOverlay
            windowTitle="Optical Studio — main.tsx"
            onSnapZone={(slot) =>
              dispatch(
                pushToast({
                  title: slot ? `Snapped to ${slot.label} (${slot.colSpanLabel})` : 'Cleared snap zone',
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'window-layout-popover':
      return (
        <div className="w-full max-w-2xl pb-16">
          <WindowLayoutPopover
            windowTitle="Refractor IDE — ThemeEngine.ts"
            defaultOpen
            onSelectLayout={(sel) =>
              dispatch(
                pushToast({
                  title: `Applied ${sel.templateLabel}`,
                  description: `Target pane: ${sel.slotLabel}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'window-switcher-overlay':
      return (
        <div className="w-full max-w-4xl">
          <WindowSwitcherOverlay
            mode="inline"
            onFocusWindow={(win) =>
              dispatch(pushToast({ title: `Focused ${win.appName} — ${win.title}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'virtual-desktop-bar':
      return (
        <div className="w-full max-w-4xl">
          <VirtualDesktopBar
            title="Virtual Desktops & Workspaces"
            onMoveWindow={(winId, fromId, toId) =>
              dispatch(
                pushToast({
                  title: `Moved window ${winId}`,
                  description: `${fromId} -> ${toId}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'window-expose-grid':
      return (
        <div className="w-full max-w-5xl">
          <WindowExposeGrid
            title="Mission Control — All Open Windows"
            onFocusWindow={(win) =>
              dispatch(pushToast({ title: `Focused ${win.title}`, description: win.appName, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'minimized-window-tray':
      return (
        <div className="w-full max-w-4xl">
          <MinimizedWindowTray
            title="Minimized Window Shelf"
            onRestoreWindow={(win) =>
              dispatch(pushToast({ title: `Restored "${win.title}"`, tone: 'info' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
