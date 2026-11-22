export const docs = {
  name: 'CandlestickOhlcChart',
  displayName: 'Candlestick / OHLC Chart',
  group: 'Financial & Market Visualizations',
  category: 'financial-market-charts',
  keywords: [
    'candlestick',
    'ohlc',
    'financial',
    'market',
    'trading',
    'stocks',
    'price-action',
    'volume',
    'histogram',
    'crosshair',
    'svg',
    'chart',
  ],
  usage: {
    description:
      'Optical-glass financial price-action chart inside a sculpted prism-slab card with Candlestick and OHLC bar rendering toggles, latest session price and signed percentage pill, recessed prism-well 460x220 responsive SVG with tabular Y-axis price gridlines, semantic --prism-success-main bullish and --prism-error-main bearish wicks/bodies/ticks, optional lower translucent volume histogram, keyboard-steppable crosshair hit zones, and a live OHLC inspector strip.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Provide chronological OhlcCandlePoint sessions with optional volume values so traders can switch seamlessly between filled/hollow Candlestick bodies and left-open / right-close OHLC ticks while inspecting exact Session, O, H, L, C, delta percentage, and Vol readouts.',
      },
      {
        guidance: true,
        description:
          'Set currencyPrefix (e.g. "$", "€", "£", or "" for index points) and bind mode/onModeChange when synchronizing chart style across linked trading workspace panels.',
      },
      {
        guidance: false,
        description:
          'Pass raw unvalidated feeds without trusting sanitization; CandlestickOhlcChart safely normalizes non-finite OHLC inputs, enforces high >= max(open, close) and low <= min(open, close), clamps negative volumes to 0, and renders a clean role="status" empty state when data is [].',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Candle Hit Zones & Keyboard Stepping',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Each session hit zone exposes role="button", tabIndex={0}, aria-pressed, descriptive OHLC + delta + volume aria-label, IME-safe Enter/Space activation, ArrowLeft/ArrowRight session stepping with focus tracking, and keyboard-only prism-focus-ring outlines',
        description:
          'Enables full keyboard-only inspection across every trading session without requiring pointer hover.',
      },
      {
        name: 'Mode Toggle Semantics, Live Inspector & Empty State',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'Candlestick/OHLC toggle pills expose aria-pressed inside a role="group", SVG declares role="img", the recessed inspector strip uses aria-live="polite", and empty datasets render a role="status" notice',
        description:
          'Ensures assistive technologies announce active mode switches, inspected OHLC session figures, and empty market states clearly.',
      },
    ],
  },
  props: [
    {
      name: 'data',
      type: 'ReadonlyArray<OhlcCandlePoint>',
      defaultValue: 'DEFAULT_OHLC_DATA (14 realistic market sessions)',
      description:
        'Ordered array of { id, label, open, high, low, close, volume? } sessions. Pass [] to render the role="status" empty state.',
    },
    {
      name: 'mode',
      type: 'CandleStyleMode',
      defaultValue: 'undefined',
      description: "Controlled chart rendering style ('candlestick' | 'ohlc').",
    },
    {
      name: 'defaultMode',
      type: 'CandleStyleMode',
      defaultValue: "'candlestick'",
      description: "Initial rendering style when uncontrolled ('candlestick' | 'ohlc').",
    },
    {
      name: 'onModeChange',
      type: '(mode: CandleStyleMode) => void',
      defaultValue: 'undefined',
      description: 'Callback invoked when the user switches between Candlestick and OHLC mode pills.',
    },
    {
      name: 'showVolume',
      type: 'boolean',
      defaultValue: 'true',
      description: 'Shows or hides the lower translucent volume histogram bars beneath the price plot.',
    },
    {
      name: 'currencyPrefix',
      type: 'string',
      defaultValue: "'$'",
      description: 'Currency or unit prefix prepended to Y-axis ticks, latest price pill, and inspector OHLC readouts.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Market OHLC / Candlestick'",
      description: 'Visible card header heading and accessible SVG chart label prefix.',
    },
    {
      name: 'onSelectCandle',
      type: '(candle: OhlcCandlePoint, index: number) => void',
      defaultValue: 'undefined',
      description: 'Callback fired with the selected OhlcCandlePoint and its zero-based index on click or keyboard activation/stepping.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom property and optical inline style overrides.',
    },
  ],
  examples: [
    `<CandlestickOhlcChart title="NVDA · Daily Price Action" />`,
    `<CandlestickOhlcChart\n  title="EUR/USD · 4H OHLC"\n  defaultMode="ohlc"\n  currencyPrefix="€"\n  showVolume={false}\n  data={[\n    { id: 'h1', label: '08:00', open: 1.082, high: 1.089, low: 1.079, close: 1.087 },\n    { id: 'h2', label: '12:00', open: 1.087, high: 1.091, low: 1.081, close: 1.083 },\n    { id: 'h3', label: '16:00', open: 1.083, high: 1.095, low: 1.082, close: 1.094 },\n  ]}\n/>`,
  ],
};

export default docs;
