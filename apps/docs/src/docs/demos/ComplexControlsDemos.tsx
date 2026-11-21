import { useState } from 'react';
import { Cpu, Layers, Shield, Sparkles } from 'lucide-react';
import {
  CascadingSelect,
  CreatableCombobox,
  DualThumbSlider,
  HistogramRangeSlider,
  RichSelectionCards,
  RotaryDial,
  TriStateCheckbox,
  type TriCheckboxState,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ComplexControlsDemosProps {
  componentId: string;
}

export function ComplexControlsDemos({ componentId }: ComplexControlsDemosProps) {
  const dispatch = useAppDispatch();
  const [triState, setTriState] = useState<TriCheckboxState>('indeterminate');

  switch (componentId) {
    case 'tri-state-checkbox':
      return (
        <div className="w-full max-w-md space-y-3">
          <TriStateCheckbox
            label="Select All Optical Components"
            description="Parent checkbox automatically toggles between checked, unchecked, and partial selection."
            state={triState}
            selectedCount={triState === 'checked' ? 7 : triState === 'indeterminate' ? 4 : 0}
            totalCount={7}
            onChange={(next) => {
              setTriState(next);
              dispatch(pushToast({ title: `Checkbox state: ${next}`, tone: 'info' }));
            }}
          />
        </div>
      );

    case 'dual-thumb-slider':
      return (
        <div className="w-full max-w-lg">
          <DualThumbSlider
            label="Latency Budget Window"
            min={0}
            max={500}
            step={10}
            minDistance={40}
            defaultValue={{ min: 80, max: 320 }}
            formatValue={(v) => `${v}ms`}
          />
        </div>
      );

    case 'histogram-range-slider':
      return (
        <div className="w-full max-w-xl">
          <HistogramRangeSlider
            label="Listing Price Distribution"
            formatValue={(v) => `$${v}`}
            defaultValue={{ min: 40, max: 140 }}
            bins={[
              { min: 0, max: 20, count: 6 },
              { min: 20, max: 40, count: 14 },
              { min: 40, max: 60, count: 29 },
              { min: 60, max: 80, count: 44 },
              { min: 80, max: 100, count: 38 },
              { min: 100, max: 120, count: 25 },
              { min: 120, max: 140, count: 18 },
              { min: 140, max: 160, count: 11 },
              { min: 160, max: 180, count: 7 },
              { min: 180, max: 200, count: 4 },
            ]}
          />
        </div>
      );

    case 'cascading-select':
      return (
        <div className="w-full max-w-xl">
          <CascadingSelect
            label="Deployment Region"
            defaultOpen
            defaultValue={['na', 'us-west', 'sfo']}
            options={[
              {
                id: 'na',
                label: 'North America',
                children: [
                  {
                    id: 'us-west',
                    label: 'US West',
                    children: [
                      { id: 'sfo', label: 'San Francisco (SFO)' },
                      { id: 'sea', label: 'Seattle (SEA)' },
                    ],
                  },
                  {
                    id: 'us-east',
                    label: 'US East',
                    children: [
                      { id: 'iad', label: 'Virginia (IAD)' },
                      { id: 'nyc', label: 'New York (NYC)' },
                    ],
                  },
                ],
              },
              {
                id: 'eu',
                label: 'Europe',
                children: [
                  {
                    id: 'eu-central',
                    label: 'Central Europe',
                    children: [
                      { id: 'fra', label: 'Frankfurt (FRA)' },
                      { id: 'zur', label: 'Zurich (ZUR)' },
                    ],
                  },
                ],
              },
            ]}
            onChange={(pathIds, nodes) =>
              dispatch(
                pushToast({
                  title: 'Selected hierarchy path',
                  description: nodes.map((n) => n.label).join(' → ') || pathIds.join('/'),
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'creatable-combobox':
      return (
        <div className="w-full max-w-md">
          <CreatableCombobox
            label="Component Tag"
            defaultOptions={[
              { value: 'optical', label: 'Optical Glass', group: 'Design' },
              { value: 'a11y', label: 'WCAG AA', group: 'Quality' },
              { value: 'react-19', label: 'React 19', group: 'Runtime' },
            ]}
            onCreateOption={(createdLabel) => {
              dispatch(pushToast({ title: `Created tag "${createdLabel}"`, tone: 'emerald' }));
            }}
          />
        </div>
      );

    case 'rich-selection-cards':
      return (
        <div className="w-full max-w-2xl">
          <RichSelectionCards
            label="Choose Rendering Pipeline"
            mode="single"
            defaultValue={['prism-vivid']}
            columns={2}
            options={[
              {
                id: 'prism-vivid',
                title: 'Vivid Prism Caustics',
                description: 'Full specular rim highlights with calibrated backdrop refraction.',
                badge: 'Recommended',
                icon: <Sparkles className="h-4 w-4" />,
              },
              {
                id: 'layered-css',
                title: 'Layered Token Cascade',
                description: 'Lightweight @layer components with zero runtime style overhead.',
                badge: '0 kB JS',
                icon: <Layers className="h-4 w-4" />,
              },
              {
                id: 'gpu-accel',
                title: 'Hardware Composited',
                description: 'Isolates animated surfaces on dedicated compositor layers.',
                icon: <Cpu className="h-4 w-4" />,
              },
              {
                id: 'strict-csp',
                title: 'Strict CSP Safe',
                description: 'Zero inline script evaluation or unsafe HTML sinks.',
                badge: 'OWASP',
                icon: <Shield className="h-4 w-4" />,
              },
            ]}
          />
        </div>
      );

    case 'rotary-dial':
      return (
        <div className="flex flex-wrap items-center gap-6">
          <RotaryDial label="Hue Shift" defaultValue={145} min={0} max={360} step={5} unit="°" />
          <RotaryDial label="Audio Gain" defaultValue={72} min={0} max={100} step={1} unit="%" />
        </div>
      );

    default:
      return null;
  }
}
