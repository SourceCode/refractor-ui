import {
  AppLauncherMenu,
  CascadingSubmenu,
  RichContextMenu,
  SystemSpotlightLauncher,
  TearOffMenu,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface MenusLaunchersDemosProps {
  componentId: string;
}

export function MenusLaunchersDemos({ componentId }: MenusLaunchersDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'cascading-submenu':
      return (
        <div className="w-full max-w-4xl">
          <CascadingSubmenu
            title="File & Export Commands (Safe-Triangle Cascade)"
            onSelectItem={(item, pathIds) =>
              dispatch(
                pushToast({
                  title: `Triggered ${item.label}`,
                  description: pathIds.join(' > '),
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'rich-context-menu':
      return (
        <div className="w-full max-w-md">
          <RichContextMenu
            targetLabel="HeroPrism_v4.png"
            onQuickAction={(id) =>
              dispatch(pushToast({ title: `Quick action: ${id}`, tone: 'emerald' }))
            }
            onSelectAction={(id) =>
              dispatch(pushToast({ title: `Selected action: ${id}`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'app-launcher-menu':
      return (
        <div className="w-full max-w-3xl">
          <AppLauncherMenu
            onLaunchApp={(app) =>
              dispatch(pushToast({ title: `Launched ${app.name}`, tone: 'emerald' }))
            }
            onPowerAction={(action) =>
              dispatch(pushToast({ title: `Session action requested: ${action}`, tone: 'amber' }))
            }
          />
        </div>
      );

    case 'system-spotlight-launcher':
      return (
        <div className="w-full max-w-4xl">
          <SystemSpotlightLauncher
            onLaunchResult={(item) =>
              dispatch(
                pushToast({
                  title: `Spotlight opened: ${item.title}`,
                  description: item.subtitle,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'tear-off-menu':
      return (
        <div className="w-full max-w-xl pb-8">
          <TearOffMenu
            menuLabel="View & Guides"
            defaultOpen
            onSelectItem={(item) =>
              dispatch(pushToast({ title: `Toggled "${item.label}"`, tone: 'info' }))
            }
          />
        </div>
      );

    default:
      return null;
  }
}
