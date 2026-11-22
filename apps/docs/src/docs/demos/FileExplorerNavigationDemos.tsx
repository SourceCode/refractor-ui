import {
  DirectoryFilterBar,
  DualPaneCommander,
  EditablePathBar,
  FileMetadataInspector,
  FileViewModeBar,
  MarqueeSelectionBox,
  MountedVolumesSidebar,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface FileExplorerNavigationDemosProps {
  componentId: string;
}

export function FileExplorerNavigationDemos({ componentId }: FileExplorerNavigationDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'editable-path-bar':
      return (
        <div className="w-full max-w-3xl">
          <EditablePathBar
            onNavigate={(nextPath) =>
              dispatch(pushToast({ title: `Navigated to ${nextPath}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'file-view-mode-bar':
      return (
        <div className="w-full max-w-4xl">
          <FileViewModeBar showPreviewStage />
        </div>
      );

    case 'dual-pane-commander':
      return (
        <div className="w-full max-w-5xl">
          <DualPaneCommander
            title="Studio Optical Dual-Pane Commander"
            onAction={(action, side, names) =>
              dispatch(
                pushToast({
                  title: `Commander ${action} (${side})`,
                  description: names.length > 0 ? names.join(', ') : 'Workspace updated',
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'mounted-volumes-sidebar':
      return (
        <div className="w-full max-w-sm">
          <MountedVolumesSidebar
            title="Places & Mounted Volumes"
            onSelectLocation={(_id, path, label) =>
              dispatch(pushToast({ title: `Opened ${label}`, description: path, tone: 'info' }))
            }
            onEjectVolume={(volumeId) =>
              dispatch(pushToast({ title: `Safely ejected volume ${volumeId}`, tone: 'amber' }))
            }
          />
        </div>
      );

    case 'file-metadata-inspector':
      return (
        <div className="w-full max-w-md">
          <FileMetadataInspector />
        </div>
      );

    case 'marquee-selection-box':
      return (
        <div className="w-full max-w-4xl">
          <MarqueeSelectionBox title="Optical Marquee Lasso Canvas" />
        </div>
      );

    case 'directory-filter-bar':
      return (
        <div className="w-full max-w-4xl">
          <DirectoryFilterBar title="Directory Filter & Grouping Toolbar" showResultsPreview />
        </div>
      );

    default:
      return null;
  }
}
