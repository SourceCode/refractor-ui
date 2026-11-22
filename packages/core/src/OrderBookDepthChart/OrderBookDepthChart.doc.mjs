export const docs = {
  name: 'OrderBookDepthChart',
  displayName: 'Order Book Depth Chart',
  group: 'Financial & Market Visualizations',
  category: 'financial-market-charts',
  keywords: [
    'order book',
    'market depth',
    'depth chart',
    'bids',
    'asks',
    'spread',
    'mid-price',
    'liquidity',
    'cumulative volume',
    'imbalance',
    'trading',
    'financial',
    'exchange',
    'svg',
  ],
  usage: {
    description:
      'Optical-glass order book market depth visualizer built on a sculpted prism-slab card with instrument symbol badge, live Mid-Price and Spread pills, a responsive 460x200 cumulative bid/ask stepped-area SVG inside a recessed prism-well shaded purely with --prism-success-main and --prism-error-main tokens, interactive clickable and keyboard-navigable depth level markers, a 2-column Bid/Ask depth and Imbalance % summary strip, an aria-live="polite" level inspector, and a clean role="status" empty state.',
    bestPractices: [
      {
        guidance: true,
        description:
          'Pass raw L2 order book snapshots directly via bids and asks; OrderBookDepthChart automatically sanitizes invalid entries, aggregates duplicate price levels, sorts bids descending and asks ascending from mid-price, and computes exact cumulative liquidity walls.',
      },
      {
        guidance: true,
        description:
          'Bind onSelectLevel to prefill limit-order tickets or inspect exact slippage impact when traders click or step across depth markers with ArrowLeft, ArrowRight, Home, End, Enter, or Space.',
      },
      {
        guidance: false,
        description:
          'Supply hardcoded hex/RGB fill colors or manually pre-sort cumulative arrays expecting mutated props; styling cascades exclusively from --prism-success-main, --prism-error-main, and surface tokens.',
      },
    ],
    accessibility: [
      {
        name: 'Interactive Depth Level Markers & Left-to-Right Keyboard Navigation',
        criterion: '2.1.1 Keyboard & 4.1.2 Name, Role, Value',
        requirement:
          'Every bid and ask depth marker exposes role="button", tabIndex={0}, aria-pressed, and a descriptive aria-label naming side, price, level size, and cumulative wall, supporting IME-safe Enter/Space activation and ArrowLeft/ArrowRight/Home/End traversal.',
        description:
          'Allows keyboard-only users to inspect buy and sell liquidity walls smoothly across the mid-price axis with keyboard-only prism-focus-ring indicators.',
      },
      {
        name: 'Polite Level Inspector & Empty State Status Landmark',
        criterion: '1.1.1 Non-text Content & 4.1.3 Status Messages',
        requirement:
          'Pairs a role="img" SVG depth chart and color-coded legend with an aria-live="polite" inspector announcing Side, Price, Level Size, and Cumulative Wall, plus a role="status" empty state when both bids and asks are empty.',
        description:
          'Ensures screen-reader and color-vision-deficient users receive full quantitative depth metrics without relying solely on green/red fills.',
      },
    ],
  },
  props: [
    {
      name: 'bids',
      type: 'ReadonlyArray<OrderBookLevel>',
      defaultValue: '8 realistic descending levels ($499.80 to $496.00)',
      description:
        'Buy order levels ({ price, size }). Automatically sorted descending from mid-price with cumulative bid walls computed.',
    },
    {
      name: 'asks',
      type: 'ReadonlyArray<OrderBookLevel>',
      defaultValue: '8 realistic ascending levels ($500.20 to $504.00)',
      description:
        'Sell order levels ({ price, size }). Automatically sorted ascending from mid-price with cumulative ask walls computed.',
    },
    {
      name: 'symbol',
      type: 'string',
      defaultValue: "'RFR / USD'",
      description: 'Trading pair or instrument symbol displayed in the optical header badge.',
    },
    {
      name: 'currencyPrefix',
      type: 'string',
      defaultValue: "'$'",
      description: 'Currency prefix prepended to formatted prices, mid-price, and spread values.',
    },
    {
      name: 'onSelectLevel',
      type: '(level: OrderBookCumulativeLevel) => void',
      defaultValue: 'undefined',
      description:
        'Callback fired with { side, price, size, cumulative } when a bid or ask depth marker is clicked or activated via keyboard.',
    },
    {
      name: 'title',
      type: 'string',
      defaultValue: "'Order Book Market Depth'",
      description: 'Visible card heading linked to the region landmark and SVG accessible label.',
    },
    {
      name: 'xstyle',
      type: 'OpticalStyleTokens',
      defaultValue: 'undefined',
      description: 'Typed --prism-* CSS custom properties and inline optical style overrides.',
    },
  ],
  examples: [
    `<OrderBookDepthChart\n  symbol="RFR / USD"\n  onSelectLevel={(level) => {\n    void level;\n  }}\n/>`,
    `<OrderBookDepthChart\n  title="Spot Liquidity Depth"\n  symbol="ETH / EUR"\n  currencyPrefix="€"\n  bids={[\n    { price: 3199.5, size: 14.2 },\n    { price: 3198.0, size: 22.8 },\n    { price: 3196.0, size: 35.0 },\n  ]}\n  asks={[\n    { price: 3200.5, size: 11.5 },\n    { price: 3202.0, size: 19.4 },\n    { price: 3204.5, size: 28.1 },\n  ]}\n/>`,
  ],
};

export default docs;
