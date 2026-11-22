import {
  ClockCalendarPopover,
  ControlCenterGrid,
  NetworkVpnPopover,
  PerAppAudioMixer,
  SystemTrayCluster,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface SystemTrayControlCenterDemosProps {
  componentId: string;
}

export function SystemTrayControlCenterDemos({ componentId }: SystemTrayControlCenterDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'system-tray-cluster':
      return (
        <div className="w-full max-w-2xl pb-16">
          <SystemTrayCluster defaultOpenIndicator="wifi" />
        </div>
      );

    case 'control-center-grid':
      return (
        <div className="w-full max-w-md mx-auto">
          <ControlCenterGrid title="Refractor OS Control Center" />
        </div>
      );

    case 'per-app-audio-mixer':
      return (
        <div className="w-full max-w-xl">
          <PerAppAudioMixer title="Per-Application Audio Mixer" />
        </div>
      );

    case 'network-vpn-popover':
      return (
        <div className="w-full max-w-md mx-auto">
          <NetworkVpnPopover
            title="Wireless & VPN Profiles"
            onConnectNetwork={(id) =>
              dispatch(
                pushToast({
                  title: id ? `Connected to Wi-Fi (${id})` : 'Disconnected from Wi-Fi',
                  tone: id ? 'emerald' : 'amber',
                })
              )
            }
            onToggleVpn={(vpnId) =>
              dispatch(
                pushToast({
                  title: vpnId ? `VPN tunnel active (${vpnId})` : 'VPN tunnel disconnected',
                  tone: vpnId ? 'info' : 'amber',
                })
              )
            }
          />
        </div>
      );

    case 'clock-calendar-popover':
      return (
        <div className="w-full max-w-2xl">
          <ClockCalendarPopover defaultOpen />
        </div>
      );

    default:
      return null;
  }
}
