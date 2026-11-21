import {
  CurrencyInput,
  InternationalPhoneInput,
  MaskedPatternInput,
  MeasurementUnitInput,
  NumericStepper,
  ScrubbableNumberField,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface NumberCurrencyDemosProps {
  componentId: string;
}

export function NumberCurrencyDemos({ componentId }: NumberCurrencyDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'numeric-stepper':
      return (
        <div className="flex flex-wrap items-end gap-4">
          <NumericStepper label="Retry Limit" defaultValue={3} min={0} max={12} unit="tries" />
          <NumericStepper label="Font Size" defaultValue={16} min={10} max={48} step={2} unit="px" size="lg" />
        </div>
      );

    case 'scrubbable-number-field':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <ScrubbableNumberField label="Blur Radius" defaultValue={18} min={0} max={64} step={0.5} suffix="px" />
          <ScrubbableNumberField label="Refraction Index" defaultValue={1.45} min={1} max={2.5} step={0.05} precision={2} />
        </div>
      );

    case 'currency-input':
      return (
        <div className="w-full max-w-md">
          <CurrencyInput
            label="Monthly Allocation"
            defaultValue={{ amount: 2450.75, currency: 'USD' }}
            onChange={(val) =>
              dispatch(
                pushToast({
                  title: 'Updated budget',
                  description: `${val.amount} ${val.currency}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'measurement-unit-input':
      return (
        <div className="w-full max-w-md">
          <MeasurementUnitInput
            label="Cache Memory Quota"
            defaultValue={{ amount: 512, unit: 'MB' }}
            convertOnUnitChange
            units={[
              { id: 'KB', label: 'KB', factorToBase: 1 },
              { id: 'MB', label: 'MB', factorToBase: 1024 },
              { id: 'GB', label: 'GB', factorToBase: 1048576 },
            ]}
          />
        </div>
      );

    case 'international-phone-input':
      return (
        <div className="w-full max-w-md">
          <InternationalPhoneInput
            defaultCountryIso="US"
            defaultNationalDigits="4155550199"
            onChange={(val) =>
              dispatch(pushToast({ title: 'Phone updated', description: val.e164, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'masked-pattern-input':
      return (
        <div className="w-full max-w-lg space-y-3">
          <MaskedPatternInput
            preset="license"
            label="License Key"
            defaultValue="RF9X-4K2P-8M7Q-1B5Z"
          />
          <MaskedPatternInput
            preset="mac"
            label="Hardware MAC Address"
            defaultValue="A4:5E:60:C1:8F:02"
          />
        </div>
      );

    default:
      return null;
  }
}
