export interface CandleStyleModeMap {
  candlestick: true;
  ohlc: true;
}

export { CandlestickOhlcChart, DEFAULT_OHLC_DATA } from './CandlestickOhlcChart';
export type {
  CandleStyleMode,
  CandlestickOhlcChartProps,
  OhlcCandlePoint,
} from './CandlestickOhlcChart';
