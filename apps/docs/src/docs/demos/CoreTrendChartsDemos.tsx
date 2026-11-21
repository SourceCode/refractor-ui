import {
  AreaStackedChart,
  BarColumnChart,
  ComboDualAxisChart,
  LineMultiSeriesChart,
  SparklineChart,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface CoreTrendChartsDemosProps {
  componentId: string;
}

export function CoreTrendChartsDemos({ componentId }: CoreTrendChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'line-multi-series-chart':
      return (
        <div className="w-full max-w-2xl">
          <LineMultiSeriesChart
            title="Weekly Optical Render Throughput"
            labels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']}
            valueUnit=" req/s"
            series={[
              { id: 'edge', label: 'Edge Cache', tone: 'primary', values: [420, 480, 515, 490, 610, 665, 720] },
              { id: 'origin', label: 'Origin API', tone: 'secondary', values: [210, 240, 230, 260, 295, 280, 310] },
              { id: 'sla', label: 'SLA Target', tone: 'emerald', values: [450, 450, 450, 450, 450, 450, 450], dashed: true },
            ]}
            onSelectPoint={(seriesId, idx, val) =>
              dispatch(pushToast({ title: `Selected ${seriesId}[${idx}]`, description: `${val} req/s`, tone: 'info' }))
            }
          />
        </div>
      );

    case 'area-stacked-chart':
      return (
        <div className="w-full max-w-2xl">
          <AreaStackedChart
            title="Cumulative Compute Volume by Tier"
            labels={['Q1', 'Q2', 'Q3', 'Q4', 'Q1+1', 'Q2+1']}
            valueUnit="k"
            series={[
              { id: 'core', label: 'Core Engine', tone: 'primary', values: [28, 36, 44, 52, 61, 74] },
              { id: 'ai', label: 'AI Inference', tone: 'secondary', values: [12, 19, 31, 46, 62, 85] },
              { id: 'edge', label: 'Edge Workers', tone: 'emerald', values: [10, 14, 18, 22, 29, 36] },
            ]}
          />
        </div>
      );

    case 'bar-column-chart':
      return (
        <div className="w-full max-w-2xl">
          <BarColumnChart
            title="Component Adoption by Surface"
            categories={['Web App', 'Docs', 'Studio', 'Mobile', 'CLI']}
            valueUnit="%"
            series={[
              { id: 'light', label: 'Alabaster Light', tone: 'primary', values: [64, 72, 58, 69, 44] },
              { id: 'dark', label: 'Obsidian Dark', tone: 'secondary', values: [81, 88, 92, 74, 96] },
            ]}
          />
        </div>
      );

    case 'combo-dual-axis-chart':
      return (
        <div className="w-full max-w-2xl">
          <ComboDualAxisChart
            title="Deployments vs. Success Rate"
            labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']}
            barLabel="Deploys"
            barValues={[124, 148, 165, 192, 210, 244]}
            lineLabel="Pass Rate"
            lineValues={[96.4, 97.1, 97.8, 98.5, 99.1, 99.6]}
            lineUnit="%"
          />
        </div>
      );

    case 'sparkline-chart':
      return (
        <div className="flex flex-wrap items-center gap-6">
          <div className="prism-crystal rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--prism-text-primary)]">API Latency</span>
            <SparklineChart values={[42, 39, 44, 36, 31, 29, 24]} variant="line" tone="emerald" showDelta />
          </div>
          <div className="prism-crystal rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--prism-text-primary)]">Daily Signups</span>
            <SparklineChart values={[12, 18, 15, 24, 31, 29, 42]} variant="bar" tone="primary" showDelta />
          </div>
          <div className="prism-crystal rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-xs font-semibold text-[var(--prism-text-primary)]">Error Rate</span>
            <SparklineChart values={[1.8, 2.1, 1.9, 2.6, 2.4, 2.9, 3.1]} variant="line" tone="rose" showDelta />
          </div>
        </div>
      );

    default:
      return null;
  }
}
