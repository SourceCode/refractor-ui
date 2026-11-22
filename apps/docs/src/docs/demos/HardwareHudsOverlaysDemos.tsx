import {
  HardwareOsdHud,
  LockScreenOverlay,
  ScreenCaptureHud,
  SessionPowerOverlay,
  TaskManagerDialog,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface HardwareHudsOverlaysDemosProps {
  componentId: string;
}

export function HardwareHudsOverlaysDemos({ componentId }: HardwareHudsOverlaysDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'hardware-osd-hud':
      return (
        <div className="w-full max-w-xl mx-auto">
          <HardwareOsdHud autoHideMs={0} showDemoTriggers />
        </div>
      );

    case 'lock-screen-overlay':
      return (
        <div className="w-full max-w-xl mx-auto">
          <LockScreenOverlay
            mode="inline"
            onUnlock={(user) => {
              dispatch(pushToast({ title: `Unlocked session for ${user.name}`, tone: 'emerald' }));
              return true;
            }}
            onPowerAction={(action) =>
              dispatch(pushToast({ title: `Lock screen power action: ${action}`, tone: 'amber' }))
            }
          />
        </div>
      );

    case 'session-power-overlay':
      return (
        <div className="w-full max-w-2xl mx-auto">
          <SessionPowerOverlay
            mode="inline"
            onConfirmAction={(action, reopen) =>
              dispatch(
                pushToast({
                  title: `Confirmed session action: ${action}`,
                  description: reopen ? 'Reopen windows enabled' : 'Fresh session on next login',
                  tone: action === 'shutdown' ? 'critical' : 'amber',
                })
              )
            }
          />
        </div>
      );

    case 'task-manager-dialog':
      return (
        <div className="w-full max-w-4xl">
          <TaskManagerDialog
            title="Refractor System Task Manager"
            onForceQuit={(proc) =>
              dispatch(
                pushToast({
                  title: `Force quit ${proc.name} (PID ${proc.pid})`,
                  tone: 'amber',
                })
              )
            }
          />
        </div>
      );

    case 'screen-capture-hud':
      return (
        <div className="w-full max-w-4xl">
          <ScreenCaptureHud
            onCaptureComplete={(res) =>
              dispatch(
                pushToast({
                  title: `${res.output === 'recording' ? 'Saved recording' : 'Captured screenshot'} (${res.target})`,
                  description: `Saved to ${res.saveLocation}`,
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
