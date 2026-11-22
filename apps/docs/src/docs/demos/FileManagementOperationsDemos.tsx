import {
  ArchiveInspector,
  BatchRenameUtility,
  FileConflictDialog,
  FileTransferQueue,
  PermissionsSharingMatrix,
  TrashRecoveryBanner,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface FileManagementOperationsDemosProps {
  componentId: string;
}

export function FileManagementOperationsDemos({ componentId }: FileManagementOperationsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'file-transfer-queue':
      return (
        <div className="w-full max-w-3xl">
          <FileTransferQueue title="Active File Transfers" />
        </div>
      );

    case 'file-conflict-dialog':
      return (
        <div className="w-full max-w-2xl">
          <FileConflictDialog
            mode="inline"
            onResolve={(resolution, applyToAll) =>
              dispatch(
                pushToast({
                  title: `Conflict resolved: ${resolution}`,
                  description: applyToAll ? 'Applied to all remaining conflicts' : undefined,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'batch-rename-utility':
      return (
        <div className="w-full max-w-4xl">
          <BatchRenameUtility
            title="Optical Studio Batch Rename Utility"
            onApplyRename={(rows) =>
              dispatch(
                pushToast({
                  title: `Renamed ${rows.filter((r) => r.changed).length} file(s)`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'permissions-sharing-matrix':
      return (
        <div className="w-full max-w-3xl">
          <PermissionsSharingMatrix resourceName="prism-shader-kernel.sh" />
        </div>
      );

    case 'archive-inspector':
      return (
        <div className="w-full max-w-4xl">
          <ArchiveInspector
            archiveName="refractor-optical-assets.zip"
            onExtract={(entries) =>
              dispatch(
                pushToast({
                  title: `Extracted ${entries.length} archive item(s)`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'trash-recovery-banner':
      return (
        <div className="w-full max-w-3xl">
          <TrashRecoveryBanner
            itemCount={14}
            selectedCount={3}
            totalSizeLabel="2.4 GB"
            retentionDays={30}
            onRestoreSelected={() =>
              dispatch(pushToast({ title: 'Restored 3 selected items from Trash', tone: 'emerald' }))
            }
            onRestoreAll={() =>
              dispatch(pushToast({ title: 'Restored all 14 items from Trash', tone: 'emerald' }))
            }
            onEmptyTrash={() =>
              dispatch(pushToast({ title: 'Trash emptied cleanly', tone: 'amber' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
