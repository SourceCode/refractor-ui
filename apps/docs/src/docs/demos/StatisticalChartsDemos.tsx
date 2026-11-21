import {
  BoxWhiskerPlot,
  HistogramChart,
  MatrixHeatmap,
  RadarSpiderChart,
  ScatterBubblePlot,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface StatisticalChartsDemosProps {
  componentId: string;
}

export function StatisticalChartsDemos({ componentId }: StatisticalChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'scatter-bubble-plot':
      return (
        <div className="w-full max-w-2xl">
          <ScatterBubblePlot
            title="Model Latency vs. Quality Score"
            xLabel="Latency (ms)"
            yLabel="Benchmark (%)"
            sizeLabel="Params (B)"
            showQuadrants
            points={[
              { id: 'p1', label: 'Prism Flash', x: 180, y: 84, size: 8, group: 'Fast', tone: 'emerald' },
              { id: 'p2', label: 'Prism Mini', x: 240, y: 87, size: 14, group: 'Fast', tone: 'emerald' },
              { id: 'p3', label: 'Prism Pro', x: 460, y: 93, size: 32, group: 'Balanced', tone: 'secondary' },
              { id: 'p4', label: 'Prism Ultra', x: 710, y: 98, size: 70, group: 'Reasoning', tone: 'primary' },
              { id: 'p5', label: 'Legacy v1', x: 890, y: 76, size: 50, group: 'Legacy', tone: 'rose' },
            ]}
            onSelectPoint={(pt) =>
              dispatch(
                pushToast({
                  title: pt.label,
                  description: `${pt.x}ms · ${pt.y}%`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'histogram-chart':
      return (
        <div className="w-full max-w-2xl">
          <HistogramChart
            title="API Response Time Distribution"
            valueUnit="ms"
            binCount={8}
            values={[
              18, 22, 24, 25, 29, 31, 33, 34, 35, 36, 38, 40, 41, 42, 44,
              46, 48, 51, 55, 58, 63, 72, 84, 96,
            ]}
          />
        </div>
      );

    case 'box-whisker-plot':
      return (
        <div className="w-full max-w-2xl">
          <BoxWhiskerPlot
            title="Frame Render Duration by Preset"
            valueUnit="ms"
            series={[
              { id: 'subtle', label: 'Subtle', tone: 'emerald', values: [4, 5, 5.5, 6, 6.5, 7, 7.2, 8, 12] },
              { id: 'std', label: 'Standard', tone: 'secondary', values: [6, 7, 8, 8.5, 9, 9.8, 10.5, 11.5, 16] },
              { id: 'vivid', label: 'Vivid', tone: 'primary', values: [8, 9.5, 10.2, 11, 12, 12.8, 14, 15.5, 22] },
            ]}
          />
        </div>
      );

    case 'matrix-heatmap':
      return (
        <div className="w-full max-w-2xl">
          <MatrixHeatmap
            title="Error Rate by Day & Window"
            tone="primary"
            valueUnit="%"
            rowLabels={['Mon', 'Tue', 'Wed', 'Thu', 'Fri']}
            colLabels={['00h', '06h', '12h', '18h']}
            cells={[
              { row: 0, col: 0, value: 0.2 }, { row: 0, col: 1, value: 0.5 }, { row: 0, col: 2, value: 1.8 }, { row: 0, col: 3, value: 1.1 },
              { row: 1, col: 0, value: 0.1 }, { row: 1, col: 1, value: 0.4 }, { row: 1, col: 2, value: 2.4 }, { row: 1, col: 3, value: 0.9 },
              { row: 2, col: 0, value: 0.3 }, { row: 2, col: 1, value: 0.8 }, { row: 2, col: 2, value: 3.2 }, { row: 2, col: 3, value: 1.5 },
              { row: 3, col: 0, value: 0.2 }, { row: 3, col: 1, value: 0.6 }, { row: 3, col: 2, value: 1.9 }, { row: 3, col: 3, value: 1.3 },
              { row: 4, col: 0, value: 0.4 }, { row: 4, col: 1, value: 0.9 }, { row: 4, col: 2, value: 2.7 }, { row: 4, col: 3, value: 2.1 },
            ]}
          />
        </div>
      );

    case 'radar-spider-chart':
      return (
        <div className="w-full max-w-xl">
          <RadarSpiderChart
            title="Optical System Capability Profile"
            axes={['A11y', 'Typing', 'Coverage', 'Security', 'Theming', 'Speed']}
            series={[
              { id: 'v1', label: 'Refractor v1.16', tone: 'primary', values: [99, 100, 99, 98, 97, 94] },
              { id: 'base', label: 'Baseline Kit', tone: 'secondary', values: [78, 72, 65, 74, 68, 82] },
            ]}
          />
        </div>
      );

    default:
      return null;
  }
}
