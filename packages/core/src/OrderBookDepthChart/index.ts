export interface OrderBookSideMap {
  bid: true;
  ask: true;
}

export {
  OrderBookDepthChart,
  DEFAULT_ORDER_BOOK_BIDS,
  DEFAULT_ORDER_BOOK_ASKS,
} from './OrderBookDepthChart';
export type {
  OrderBookSide,
  OrderBookLevel,
  OrderBookCumulativeLevel,
  OrderBookDepthChartProps,
} from './OrderBookDepthChart';
