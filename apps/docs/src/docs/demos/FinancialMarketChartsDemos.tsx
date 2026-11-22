import {
  BurndownBurnupChart,
  CandlestickOhlcChart,
  CohortRetentionGrid,
  MarimekkoChart,
  OrderBookDepthChart,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface FinancialMarketChartsDemosProps {
  componentId: string;
}

export function FinancialMarketChartsDemos({ componentId }: FinancialMarketChartsDemosProps) {
  const dispatch = useAppDispatch();

  switch (componentId) {
    case 'candlestick-ohlc-chart':
      return (
        <div className="w-full max-w-3xl">
          <CandlestickOhlcChart
            title="NVDA · 1D OHLC Candlestick"
            onSelectCandle={(candle) =>
              dispatch(
                pushToast({
                  title: `${candle.label}: Close $${candle.close.toFixed(2)}`,
                  tone: candle.close >= candle.open ? 'emerald' : 'critical',
                })
              )
            }
          />
        </div>
      );

    case 'order-book-depth-chart':
      return (
        <div className="w-full max-w-3xl">
          <OrderBookDepthChart
            symbol="RFR / USD"
            onSelectLevel={(level) =>
              dispatch(
                pushToast({
                  title: `${level.side.toUpperCase()} Wall @ $${level.price.toFixed(2)} (Cum ${level.cumulative.toFixed(1)})`,
                  tone: level.side === 'bid' ? 'emerald' : 'critical',
                })
              )
            }
          />
        </div>
      );

    case 'marimekko-chart':
      return (
        <div className="w-full max-w-3xl">
          <MarimekkoChart
            title="Global ARR by Region & Tier"
            onSelectSegment={(sel) =>
              dispatch(
                pushToast({
                  title: `${sel.columnLabel} · ${sel.segmentLabel} (${sel.totalSharePct.toFixed(1)}% global)`,
                  tone: 'info',
                })
              )
            }
          />
        </div>
      );

    case 'cohort-retention-grid':
      return (
        <div className="w-full max-w-3xl">
          <CohortRetentionGrid
            title="Enterprise SaaS Monthly Retention"
            onSelectCell={(cell) =>
              dispatch(
                pushToast({
                  title: `${cell.cohortLabel} · ${cell.periodLabel}: ${cell.retentionPct.toFixed(1)}% retained`,
                  tone: 'emerald',
                })
              )
            }
          />
        </div>
      );

    case 'burndown-burnup-chart':
      return (
        <div className="w-full max-w-3xl">
          <BurndownBurnupChart title="Sprint 24 Burn-Down & Scope Velocity" />
        </div>
      );

    default:
      return null;
  }
}
