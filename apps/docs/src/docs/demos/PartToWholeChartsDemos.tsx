import {
  DonutPieChart,
  FunnelChart,
  SunburstChart,
  TreemapChart,
  WaterfallChart,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface PartToWholeChartsDemosProps {
  componentId: string;
}

export function PartToWholeChartsDemos({ componentId }: PartToWholeChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'donut-pie-chart':
      return (
        <div className="w-full max-w-2xl">
          <DonutPieChart
            title="Bundle Weight Composition"
            centerLabel="Gzipped"
            valueUnit=" kB"
            slices={[
              { id: 'core', label: 'Core Primitives', value: 42, tone: 'primary' },
              { id: 'charts', label: 'SVG Visualizations', value: 28, tone: 'secondary' },
              { id: 'theme', label: 'Theme Engine', value: 14, tone: 'emerald' },
              { id: 'utils', label: 'Sanitizers & Utils', value: 9, tone: 'amber' },
            ]}
            onSelectSlice={(slice, pct) =>
              dispatch(
                pushToast({
                  title: `${slice.label}: ${pct.toFixed(1)}%`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'treemap-chart':
      return (
        <div className="w-full max-w-2xl">
          <TreemapChart
            title="Cloud Spend Allocation & MoM Delta"
            valueUnit="k"
            tiles={[
              { id: 'compute', label: 'GPU Compute', group: 'Infra', value: 420, changePct: 12.4 },
              { id: 'storage', label: 'Object Storage', group: 'Infra', value: 210, changePct: -4.2 },
              { id: 'edge', label: 'Edge CDN', group: 'Network', value: 160, changePct: 5.8 },
              { id: 'db', label: 'Vector DB', group: 'Data', value: 145, changePct: 18.1 },
              { id: 'obs', label: 'Telemetry Logs', group: 'Ops', value: 95, changePct: -8.5 },
              { id: 'ci', label: 'CI Runners', group: 'Ops', value: 70, changePct: 0 },
            ]}
          />
        </div>
      );

    case 'sunburst-chart':
      return (
        <div className="w-full max-w-2xl">
          <SunburstChart
            title="Design System Surface Hierarchy"
            valueUnit=" comps"
            root={{
              id: 'kit',
              label: 'Refractor',
              children: [
                {
                  id: 'inputs',
                  label: 'Inputs',
                  tone: 'primary',
                  children: [
                    { id: 'date', label: 'Date & Time', value: 7 },
                    { id: 'num', label: 'Numeric', value: 6 },
                    { id: 'rich', label: 'Rich Input', value: 6 },
                  ],
                },
                {
                  id: 'ai',
                  label: 'AI & Agents',
                  tone: 'secondary',
                  children: [
                    { id: 'chat', label: 'Chat', value: 6 },
                    { id: 'ctrl', label: 'Control', value: 7 },
                    { id: 'ctx', label: 'Context', value: 6 },
                  ],
                },
                {
                  id: 'viz',
                  label: 'Charts',
                  tone: 'emerald',
                  children: [
                    { id: 'trend', label: 'Trends', value: 5 },
                    { id: 'hier', label: 'Hierarchy', value: 5 },
                    { id: 'stat', label: 'Stats', value: 5 },
                  ],
                },
              ],
            }}
          />
        </div>
      );

    case 'funnel-chart':
      return (
        <div className="w-full max-w-2xl">
          <FunnelChart
            title="Developer Adoption Funnel"
            stages={[
              { id: 'visits', label: 'Docs Visitors', value: 48200, tone: 'secondary' },
              { id: 'installs', label: 'CLI / Package Installs', value: 19400, tone: 'primary' },
              { id: 'studio', label: 'Theme Studio Customized', value: 11200, tone: 'amber' },
              { id: 'prod', label: 'Production Deployments', value: 6850, tone: 'emerald' },
            ]}
          />
        </div>
      );

    case 'waterfall-chart':
      return (
        <div className="w-full max-w-2xl">
          <WaterfallChart
            title="Quarterly Operating Cash Bridge"
            valuePrefix="$"
            valueSuffix="k"
            steps={[
              { id: 'open', label: 'Opening ARR', value: 420, kind: 'start' },
              { id: 'new', label: 'New Logos', value: 165, kind: 'increase' },
              { id: 'exp', label: 'Expansion', value: 84, kind: 'increase' },
              { id: 'churn', label: 'Churn', value: -42, kind: 'decrease' },
              { id: 'infra', label: 'Cloud Cost', value: -38, kind: 'decrease' },
              { id: 'net', label: 'Closing ARR', value: 589, kind: 'total' },
            ]}
          />
        </div>
      );

    default:
      return null;
  }
}
