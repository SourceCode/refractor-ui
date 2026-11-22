import {
  DigitalLedReadout,
  HardwarePortStrip,
  StepSequencerMatrix,
  ThermostatDial,
  VirtualJoystickPad,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface HardwareIotTactileDemosProps {
  componentId: string;
}

export function HardwareIotTactileDemos({ componentId }: HardwareIotTactileDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'step-sequencer-matrix':
      return (
        <div className="w-full max-w-4xl">
          <StepSequencerMatrix title="Refractor TR-16 Optical Drum Sequencer" />
        </div>
      );

    case 'digital-led-readout':
      return (
        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
          <DigitalLedReadout
            label="Master Clock"
            value="128.4"
            unit="BPM"
            tone="primary"
            showStyleToggle
          />
          <DigitalLedReadout
            label="Optical Rail Voltage"
            value="24.08"
            unit="V"
            tone="emerald"
            defaultDisplayStyle="nixie"
            showStyleToggle
          />
        </div>
      );

    case 'thermostat-dial':
      return (
        <div className="w-full max-w-md mx-auto">
          <ThermostatDial
            title="Studio Climate Controller"
            defaultTargetTempF={70}
            ambientTempF={73}
            defaultMode="cooling"
          />
        </div>
      );

    case 'hardware-port-strip':
      return (
        <div className="w-full max-w-4xl">
          <HardwarePortStrip
            title="Refractor SW-12X · 1U Optical Patch Bay"
            onTogglePortAdmin={(portId, enabled) =>
              dispatch(
                pushToast({
                  title: `Port ${portId} ${enabled ? 'enabled' : 'administratively disabled'}`,
                  tone: enabled ? 'emerald' : 'amber',
                })
              )
            }
          />
        </div>
      );

    case 'virtual-joystick-pad':
      return (
        <div className="w-full max-w-md mx-auto">
          <VirtualJoystickPad title="Optical Gimbal & D-Pad Controller" />
        </div>
      );

    default:
      return null;
  }
}
