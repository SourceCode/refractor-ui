import {
  ContourDensityPlot,
  HexbinDensityPlot,
  ParallelCoordinatesPlot,
  PolarAreaRoseChart,
  RidgelinePlot,
  SurfaceMesh3DPlot,
  ViolinPlot,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ScientificChartsDemosProps {
  componentId: string;
}

export function ScientificChartsDemos({ componentId }: ScientificChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'violin-plot':
      return (
        <div className="w-full max-w-3xl">
          <ViolinPlot
            title="API Latency Distribution (KDE + IQR)"
            onSelectSeries={(summary) =>
              dispatch(
                pushToast({
                  title: `${summary.label}: Median ${summary.median.toFixed(1)}ms (N=${summary.count})`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'ridgeline-plot':
      return (
        <div className="w-full max-w-3xl">
          <RidgelinePlot
            title="Seasonal Temperature Ridgeline"
            onSelectRow={(sel) =>
              dispatch(
                pushToast({
                  title: `${sel.label}: Peak ${sel.peakValue.toFixed(1)}°C`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'parallel-coordinates-plot':
      return (
        <div className="w-full max-w-3xl">
          <ParallelCoordinatesPlot
            title="Foundation Model Multi-Axis Benchmark"
            onSelectRecord={(rec) =>
              dispatch(pushToast({ title: `Inspecting ${rec.label}`, tone: 'emerald' }))
            }
          />
        </div>
      );

    case 'contour-density-plot':
      return (
        <div className="w-full max-w-2xl">
          <ContourDensityPlot title="Bimodal Optical Sensor Density Contours" />
        </div>
      );

    case 'hexbin-density-plot':
      return (
        <div className="w-full max-w-2xl">
          <HexbinDensityPlot
            title="Payload vs Latency Hexbin Density"
            onSelectHex={(bin) =>
              dispatch(
                pushToast({
                  title: `Hex (${bin.col}, ${bin.row}): ${bin.count} pts (${bin.sharePct.toFixed(1)}%)`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'polar-area-rose-chart':
      return (
        <div className="w-full max-w-xl">
          <PolarAreaRoseChart
            title="Compass Wind Velocity Rose"
            onSelectSlice={(slice, pct) =>
              dispatch(
                pushToast({
                  title: `${slice.label}: ${slice.value} kt (${pct.toFixed(1)}%)`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'surface-mesh-3d-plot':
      return (
        <div className="w-full max-w-3xl">
          <SurfaceMesh3DPlot title="3D Damped Acoustic Ripple Surface" />
        </div>
      );

    default:
      return null;
  }
}
