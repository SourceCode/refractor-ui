import {
  AppDockBar,
  AppMenuBar,
  MillerColumnsBrowser,
  QuickLookPreviewer,
  RadialContextMenu,
  WindowTitlebar,
  WorkspaceStatusBar,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface DesktopOsWindowingDemosProps {
  componentId: string;
}

export function DesktopOsWindowingDemos({ componentId }: DesktopOsWindowingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'app-dock-bar':
      return (
        <div className="w-full max-w-2xl flex justify-center py-4">
          <AppDockBar
            defaultActiveId="code-ide"
            onLaunch={(item) =>
              dispatch(pushToast({ title: `Launched ${item.label}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'window-titlebar':
      return (
        <div className="w-full max-w-2xl">
          <WindowTitlebar
            title="Refractor Studio — Main.tsx"
            subtitle="~/projects/refractor-ui"
            modified
            chromeStyle="macos"
            onClose={() => dispatch(pushToast({ title: 'Window close requested', tone: 'amber' }))}
          >
            <div className="p-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Double-click the optical titlebar to toggle Maximize/Restore, or click Minimize to
              collapse the workspace viewport cleanly.
            </div>
          </WindowTitlebar>
        </div>
      );

    case 'app-menu-bar':
      return (
        <div className="w-full max-w-2xl pb-12">
          <AppMenuBar
            brandLabel="Refractor"
            onSelectAction={(item, menuId) =>
              dispatch(pushToast({ title: `${menuId}: ${item.label}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'workspace-status-bar':
      return (
        <div className="w-full max-w-3xl">
          <WorkspaceStatusBar
            branch="feat/optical-os"
            syncState="syncing"
            errorsCount={0}
            warningsCount={2}
            cursorLine={218}
            cursorColumn={14}
            backgroundTaskLabel="Indexing 245 symbols"
            backgroundTaskProgressPct={72}
            onSelectSegment={(seg) =>
              dispatch(pushToast({ title: `Clicked status segment: ${seg}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'miller-columns-browser':
      return (
        <div className="w-full max-w-3xl">
          <MillerColumnsBrowser
            title="Workspace Miller Columns"
            onSelectNode={(node) =>
              dispatch(pushToast({ title: `Opened ${node.name} (${node.kind})`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'radial-context-menu':
      return (
        <div className="w-full max-w-md mx-auto">
          <RadialContextMenu
            mode="inline"
            onSelectAction={(action) =>
              dispatch(
                pushToast({
                  title: `Radial action: ${action.label}`,
                  tone: action.tone === 'rose' ? 'critical' : 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'quick-look-previewer':
      return (
        <div className="w-full max-w-2xl">
          <QuickLookPreviewer
            mode="inline"
            onOpenExternal={(file) =>
              dispatch(pushToast({ title: `Opening ${file.name} in external editor`, tone: 'info' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
