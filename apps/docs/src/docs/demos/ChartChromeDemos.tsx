import {
  BrushRangeScrubber,
  ChartCrosshairTooltip,
  ChartThresholdMarker,
  InteractiveLegend,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ChartChromeDemosProps {
  componentId: string;
}

export function ChartChromeDemos({ componentId }: ChartChromeDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'interactive-legend':
      return (
        <div className="w-full max-w-2xl">
          <InteractiveLegend
            title="Cluster Throughput Series"
            items={[
              { id: 'us-west', label: 'US-West', value: '48.2', unit: 'k rps', tone: 'primary' },
              { id: 'eu-central', label: 'EU-Central', value: '39.6', unit: 'k rps', tone: 'secondary' },
              { id: 'ap-south', label: 'AP-South', value: '31.4', unit: 'k rps', tone: 'emerald' },
              { id: 'forecast', label: 'Capacity Target', value: '55.0', unit: 'k rps', tone: 'amber', dashed: true },
            ]}
            onHiddenIdsChange={(hidden) =>
              dispatch(
                pushToast({
                  title: 'Legend Visibility Updated',
                  description: hidden.length === 0 ? 'All series visible' : `${hidden.length} hidden`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'brush-range-scrubber':
      return (
        <div className="w-full max-w-2xl">
          <BrushRangeScrubber
            title="14-Day Telemetry Timeline Brush"
            tone="primary"
            defaultRange={[3, 10]}
            minSpan={2}
            data={[
              { label: 'Nov 08', value: 42 },
              { label: 'Nov 09', value: 49 },
              { label: 'Nov 10', value: 46 },
              { label: 'Nov 11', value: 58 },
              { label: 'Nov 12', value: 64 },
              { label: 'Nov 13', value: 61 },
              { label: 'Nov 14', value: 73 },
              { label: 'Nov 15', value: 79 },
              { label: 'Nov 16', value: 75 },
              { label: 'Nov 17', value: 84 },
              { label: 'Nov 18', value: 91 },
              { label: 'Nov 19', value: 88 },
              { label: 'Nov 20', value: 94 },
              { label: 'Nov 21', value: 97 },
            ]}
          />
        </div>
      );

    case 'chart-crosshair-tooltip':
      return (
        <div className="w-full max-w-2xl">
          <ChartCrosshairTooltip
            title="Multi-Series Latency & Error Inspector"
            defaultActiveIndex={3}
            labels={['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30']}
            series={[
              { id: 'p95', label: 'P95 Latency', unit: 'ms', tone: 'primary', values: [44, 48, 53, 62, 58, 49, 46] },
              { id: 'p50', label: 'P50 Latency', unit: 'ms', tone: 'secondary', values: [22, 24, 26, 31, 29, 25, 23] },
              { id: 'cache', label: 'Cache Hit', unit: '%', tone: 'emerald', values: [94, 93, 91, 88, 90, 94, 96] },
            ]}
          />
        </div>
      );

    case 'chart-threshold-marker':
      return (
        <div className="w-full max-w-2xl">
          <ChartThresholdMarker
            title="SLA Latency & Deployment Annotations"
            valueUnit="ms"
            data={[
              { label: 'Mon', value: 42 },
              { label: 'Tue', value: 48 },
              { label: 'Wed', value: 54 },
              { label: 'Thu', value: 86 },
              { label: 'Fri', value: 61 },
              { label: 'Sat', value: 49 },
              { label: 'Sun', value: 45 },
            ]}
            bands={[
              { id: 'target-zone', label: 'Optimal SLA Band', from: 35, to: 65, tone: 'emerald' },
            ]}
            thresholds={[
              { id: 'sla-cap', label: 'SLA Budget Cap', value: 75, tone: 'rose', dashed: true },
              { id: 'warn-cap', label: 'Warning Floor', value: 60, tone: 'amber', dashed: true },
            ]}
            events={[
              {
                id: 'deploy-v120',
                index: 3,
                label: 'v1.20 Rollout',
                detail: 'Warm cache rebuild during region cutover',
                tone: 'primary',
              },
              {
                id: 'autoscale',
                index: 5,
                label: 'Edge Autoscale',
                detail: 'Added 12 optical edge workers',
                tone: 'secondary',
              },
            ]}
            onSelectEvent={(event, point) =>
              dispatch(
                pushToast({
                  title: event.label,
                  description: `${point.label}: ${point.value}ms`,
                  tone: 'info',
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
