import {
  BumpChart,
  DumbbellPlot,
  LollipopChart,
  QuadrantMatrix,
  SlopegraphChart,
  SmallMultiplesGrid,
  WaffleUnitGrid,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface ComparisonStorytellingDemosProps {
  componentId: string;
}

export function ComparisonStorytellingDemos({ componentId }: ComparisonStorytellingDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'slopegraph-chart':
      return (
        <div className="w-full max-w-3xl">
          <SlopegraphChart
            title="Q1 vs Q4 Product Adoption Slopegraph"
            onSelectItem={(sel) =>
              dispatch(
                pushToast({
                  title: `${sel.label}: ${sel.delta >= 0 ? '+' : ''}${sel.delta.toFixed(1)}% (Rank #${sel.startRank}→#${sel.endRank})`,
                  tone: sel.delta >= 0 ? 'emerald' : 'critical',
                })
              )
            }
          />
        </div>
      );

    case 'bump-chart':
      return (
        <div className="w-full max-w-3xl">
          <BumpChart
            title="Channel Growth Rank Trajectory"
            onSelectSeries={(sel) =>
              dispatch(
                pushToast({
                  title: `${sel.label} · ${sel.periodLabel}: Rank #${sel.rank}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'dumbbell-plot':
      return (
        <div className="w-full max-w-3xl">
          <DumbbellPlot
            title="Regional Conversion Lift vs Baseline"
            onSelectItem={(sel) =>
              dispatch(
                pushToast({
                  title: `${sel.label}: ${sel.gap >= 0 ? '+' : ''}${sel.gap.toFixed(1)}% variance`,
                  tone: sel.gap >= 0 ? 'emerald' : 'critical',
                })
              )
            }
          />
        </div>
      );

    case 'lollipop-chart':
      return (
        <div className="w-full max-w-3xl">
          <LollipopChart
            title="Feature Adoption Ranking (Low-Ink)"
            onSelectItem={(datum, rank) =>
              dispatch(
                pushToast({
                  title: `#${rank} ${datum.label}: ${datum.value}k active users`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'waffle-unit-grid':
      return (
        <div className="w-full max-w-2xl">
          <WaffleUnitGrid
            title="Cloud Revenue Mix (10×10 Unit Waffle)"
            onSelectSegment={(seg) =>
              dispatch(
                pushToast({
                  title: `${seg.label}: ${seg.cellCount}/100 units (${seg.sharePct.toFixed(1)}%)`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'quadrant-matrix':
      return (
        <div className="w-full max-w-2xl">
          <QuadrantMatrix
            title="H2 Product Roadmap Effort vs Impact"
            onSelectItem={(sel) =>
              dispatch(
                pushToast({
                  title: `${sel.label} · ${sel.quadrantLabel}`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'small-multiples-grid':
      return (
        <div className="w-full max-w-3xl">
          <SmallMultiplesGrid title="Synchronized Regional KPI Small Multiples" columns={3} />
        </div>
      );

    default:
      return null;
  }
}
