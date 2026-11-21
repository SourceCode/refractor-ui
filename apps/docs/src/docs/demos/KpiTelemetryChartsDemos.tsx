import {
  BulletChart,
  CalendarHeatmap,
  LiveTelemetryChart,
  RadialGauge,
  type TelemetrySample,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface KpiTelemetryChartsDemosProps {
  componentId: string;
}

const CALENDAR_ENTRIES = [
  { date: '2026-09-14', count: 3, detail: 'Schema audit' },
  { date: '2026-09-16', count: 6, detail: 'Core tokens' },
  { date: '2026-09-21', count: 9, detail: 'Grid perf pass' },
  { date: '2026-09-24', count: 4, detail: 'A11y polish' },
  { date: '2026-10-02', count: 12, detail: 'Release v1.12' },
  { date: '2026-10-05', count: 7, detail: 'Chart primitives' },
  { date: '2026-10-08', count: 11, detail: 'Coverage sweep' },
  { date: '2026-10-12', count: 5, detail: 'Theme tuning' },
  { date: '2026-10-19', count: 14, detail: 'Release v1.15' },
  { date: '2026-10-20', count: 8, detail: 'Docs workbench' },
  { date: '2026-10-21', count: 10, detail: 'SVG cleanup' },
  { date: '2026-11-04', count: 6, detail: 'Security suite' },
  { date: '2026-11-11', count: 13, detail: 'Flow diagrams' },
  { date: '2026-11-18', count: 9, detail: 'Gauge geometry' },
  { date: '2026-11-19', count: 15, detail: 'Telemetry stream' },
  { date: '2026-11-20', count: 11, detail: 'Bullet bands' },
  { date: '2026-11-21', count: 14, detail: 'v1.18 release' },
];

const INITIAL_TELEMETRY_SAMPLES: TelemetrySample[] = [
  { id: 't-1', timestamp: '09:10:00', value: 42 },
  { id: 't-2', timestamp: '09:10:05', value: 46 },
  { id: 't-3', timestamp: '09:10:10', value: 51 },
  { id: 't-4', timestamp: '09:10:15', value: 48 },
  { id: 't-5', timestamp: '09:10:20', value: 64 },
  { id: 't-6', timestamp: '09:10:25', value: 78 },
  { id: 't-7', timestamp: '09:10:30', value: 72 },
  { id: 't-8', timestamp: '09:10:35', value: 59 },
  { id: 't-9', timestamp: '09:10:40', value: 54 },
  { id: 't-10', timestamp: '09:10:45', value: 61 },
  { id: 't-11', timestamp: '09:10:50', value: 84 },
  { id: 't-12', timestamp: '09:10:55', value: 67 },
];

export function KpiTelemetryChartsDemos({ componentId }: KpiTelemetryChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'radial-gauge':
      return (
        <div className="w-full max-w-md">
          <RadialGauge
            title="GPU Optical Pipeline Load"
            label="Compute Utilization"
            value={74}
            min={0}
            max={100}
            target={80}
            unit="%"
            sweep={180}
            onSelectBand={(band) =>
              dispatch(
                pushToast({
                  title: band.label,
                  description: `Threshold up to ${band.upTo}%`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'bullet-chart':
      return (
        <div className="w-full max-w-2xl">
          <BulletChart
            title="Quarterly Engineering KPIs"
            items={[
              {
                id: 'coverage',
                label: 'Test Coverage',
                subtitle: 'V8 statements across core',
                actual: 99.6,
                target: 93,
                max: 100,
                ranges: [75, 93, 100],
                unit: '%',
                tone: 'emerald',
              },
              {
                id: 'latency',
                label: 'Docs Build Speed',
                subtitle: 'Production bundle score',
                actual: 88,
                target: 85,
                max: 100,
                ranges: [60, 82, 100],
                unit: ' pts',
                tone: 'primary',
              },
              {
                id: 'adoption',
                label: 'Design Token Coverage',
                subtitle: 'Zero raw literals across themes',
                actual: 96,
                target: 100,
                max: 100,
                ranges: [70, 90, 100],
                unit: '%',
                tone: 'secondary',
              },
            ]}
            onSelectItem={(item, pct) =>
              dispatch(
                pushToast({
                  title: item.label,
                  description: `${pct}% of target`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'calendar-heatmap':
      return (
        <div className="w-full max-w-2xl">
          <CalendarHeatmap
            title="Daily Release & Build Velocity"
            weeks={12}
            endDate="2026-11-21"
            valueUnit="commits"
            tone="emerald"
            entries={CALENDAR_ENTRIES}
            onSelectDay={(entry) =>
              dispatch(
                pushToast({
                  title: entry.date,
                  description: `${entry.count} commits${entry.detail ? ` · ${entry.detail}` : ''}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'live-telemetry-chart':
      return (
        <div className="w-full max-w-2xl">
          <LiveTelemetryChart
            title="Edge Inference Latency Stream"
            unit="ms"
            tone="primary"
            samples={INITIAL_TELEMETRY_SAMPLES}
            warningThreshold={80}
            defaultWindowSize={20}
            onGenerateSample={(seq) => {
              const synthetic = 48 + ((seq * 17) % 42);
              const sec = String((seq * 5) % 60).padStart(2, '0');
              return {
                id: `step-${seq}`,
                timestamp: `09:11:${sec}`,
                value: synthetic,
              };
            }}
          />
        </div>
      );

    default:
      return null;
  }
}
