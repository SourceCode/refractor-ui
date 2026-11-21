import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Cpu,
  DollarSign,
  Download,
  FileSpreadsheet,
  FlaskConical,
  Globe,
  Radio,
  RotateCcw,
  Server,
  ShieldAlert,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import {
  AreaStackedChart,
  BadgeStatus,
  BoxWhiskerPlot,
  BulletChart,
  ChartCrosshairTooltip,
  ChartThresholdMarker,
  ChoroplethMap,
  ComboDualAxisChart,
  DonutPieChart,
  GeoFlowArcMap,
  HistogramChart,
  InteractiveLegend,
  KpiMetricCard,
  LiveTelemetryChart,
  MatrixHeatmap,
  MonthQuarterYearPicker,
  PivotTable,
  PointClusterMap,
  ProcessStatusPill,
  RadarSpiderChart,
  RadialGauge,
  ScatterBubblePlot,
  SecondaryButton,
  SegmentedControl,
  SparklineChart,
  TagChip,
  WaterfallChart,
  formatPeriodValue,
  type AreaSeries,
  type BoxWhiskerSeries,
  type BulletChartItem,
  type ChartEventMarker,
  type ChartThresholdLine,
  type ChoroplethRegion,
  type CrosshairSeries,
  type DonutSlice,
  type GeoFlowArc,
  type GeoHub,
  type GeoPoint,
  type HeatmapCell,
  type LegendSeriesItem,
  type PeriodValue,
  type PivotField,
  type PivotRecord,
  type ProcessStatus,
  type RadarSeries,
  type ScatterPoint,
  type SparklineTone,
  type TelemetrySample,
  type ThresholdDataPoint,
  type WaterfallStep,
} from '@refractor-ui/core';
import type { ExampleScreenSpec } from './types';

/* -------------------------------------------------------------------------- */
/* Screen 1: Executive Revenue & Growth Analytics Dashboard                   */
/* -------------------------------------------------------------------------- */

type TimeframeKey = '7d' | '30d' | '90d';

interface ExecutiveKpiTile {
  id: string;
  label: string;
  prefix?: string;
  value: string;
  unit?: string;
  deltaPercent: number;
  deltaLabel: string;
  invertDeltaSemantics?: boolean;
  sparkline: ReadonlyArray<number>;
}

interface ExecutiveDataset {
  caption: string;
  labels: string[];
  kpis: ReadonlyArray<ExecutiveKpiTile>;
  mrrSeries: AreaSeries[];
  legendSummaries: Record<string, string>;
  channels: DonutSlice[];
  pipelineLeads: number[];
  conversionRate: number[];
}

const EXECUTIVE_DATA: Record<TimeframeKey, ExecutiveDataset> = {
  '7d': {
    caption: 'Rolling 7-day cadence · synced 12s ago',
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    kpis: [
      {
        id: 'mrr',
        label: 'Net New MRR',
        prefix: '$',
        value: '218.4K',
        deltaPercent: 14.8,
        deltaLabel: 'vs prior 7d',
        sparkline: [26, 29, 31, 28, 34, 33, 37],
      },
      {
        id: 'nrr',
        label: 'Net Dollar Retention',
        value: '129.4',
        unit: '%',
        deltaPercent: 3.1,
        deltaLabel: 'enterprise cohort',
        sparkline: [125.8, 126.4, 127.1, 127.9, 128.4, 129.0, 129.4],
      },
      {
        id: 'cac',
        label: 'Blended CAC Payback',
        value: '8.2',
        unit: 'mo',
        deltaPercent: -9.4,
        deltaLabel: 'faster payback',
        invertDeltaSemantics: true,
        sparkline: [9.4, 9.2, 9.0, 8.8, 8.6, 8.4, 8.2],
      },
    ],
    mrrSeries: [
      { id: 'enterprise', label: 'Enterprise', tone: 'primary', values: [42, 46, 48, 51, 56, 59, 64] },
      { id: 'growth', label: 'Growth Tier', tone: 'secondary', values: [28, 31, 33, 34, 38, 41, 43] },
      { id: 'self-serve', label: 'Self-Serve', tone: 'emerald', values: [14, 16, 17, 19, 21, 22, 24] },
    ],
    legendSummaries: {
      enterprise: '$64.0k',
      growth: '$43.0k',
      'self-serve': '$24.0k',
    },
    channels: [
      { id: 'direct', label: 'Enterprise Direct', value: 94, tone: 'primary' },
      { id: 'partner', label: 'Cloud Marketplace', value: 62, tone: 'secondary' },
      { id: 'plg', label: 'Product-Led Self-Serve', value: 44, tone: 'emerald' },
      { id: 'inbound', label: 'Developer Docs Inbound', value: 18, tone: 'amber' },
    ],
    pipelineLeads: [142, 158, 164, 179, 204, 188, 216],
    conversionRate: [18.4, 19.1, 19.8, 20.6, 21.9, 22.4, 23.2],
  },
  '30d': {
    caption: 'Trailing 30-day revenue ledger · Q4 sprint',
    labels: ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'],
    kpis: [
      {
        id: 'mrr',
        label: 'Monthly Recurring Rev',
        prefix: '$',
        value: '1.84M',
        deltaPercent: 18.6,
        deltaLabel: 'vs last 30d',
        sparkline: [1.46, 1.54, 1.61, 1.69, 1.76, 1.84],
      },
      {
        id: 'nrr',
        label: 'Net Dollar Retention',
        value: '132.8',
        unit: '%',
        deltaPercent: 4.6,
        deltaLabel: 'expansion uplift',
        sparkline: [127.2, 128.5, 129.9, 130.6, 131.8, 132.8],
      },
      {
        id: 'cac',
        label: 'Blended CAC Payback',
        value: '7.6',
        unit: 'mo',
        deltaPercent: -12.8,
        deltaLabel: 'more efficient',
        invertDeltaSemantics: true,
        sparkline: [9.1, 8.8, 8.5, 8.2, 7.9, 7.6],
      },
    ],
    mrrSeries: [
      { id: 'enterprise', label: 'Enterprise', tone: 'primary', values: [420, 455, 492, 534, 578, 624] },
      { id: 'growth', label: 'Growth Tier', tone: 'secondary', values: [290, 312, 336, 362, 391, 418] },
      { id: 'self-serve', label: 'Self-Serve', tone: 'emerald', values: [148, 162, 179, 196, 214, 238] },
    ],
    legendSummaries: {
      enterprise: '$624k',
      growth: '$418k',
      'self-serve': '$238k',
    },
    channels: [
      { id: 'direct', label: 'Enterprise Direct', value: 780, tone: 'primary' },
      { id: 'partner', label: 'Cloud Marketplace', value: 520, tone: 'secondary' },
      { id: 'plg', label: 'Product-Led Self-Serve', value: 365, tone: 'emerald' },
      { id: 'inbound', label: 'Developer Docs Inbound', value: 175, tone: 'amber' },
    ],
    pipelineLeads: [620, 684, 735, 812, 874, 948],
    conversionRate: [19.2, 20.1, 21.0, 21.8, 22.9, 24.1],
  },
  '90d': {
    caption: 'Quarterly trajectory · board-verified telemetry',
    labels: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    kpis: [
      {
        id: 'mrr',
        label: 'Annualized Run Rate',
        prefix: '$',
        value: '22.1M',
        deltaPercent: 26.4,
        deltaLabel: 'QoQ acceleration',
        sparkline: [16.4, 17.5, 18.6, 19.7, 20.9, 22.1],
      },
      {
        id: 'nrr',
        label: 'Net Dollar Retention',
        value: '136.2',
        unit: '%',
        deltaPercent: 6.4,
        deltaLabel: 'multi-product attach',
        sparkline: [128.4, 130.1, 131.8, 133.2, 134.9, 136.2],
      },
      {
        id: 'cac',
        label: 'Blended CAC Payback',
        value: '7.1',
        unit: 'mo',
        deltaPercent: -16.5,
        deltaLabel: 'vs Q2 baseline',
        invertDeltaSemantics: true,
        sparkline: [8.8, 8.4, 8.1, 7.7, 7.4, 7.1],
      },
    ],
    mrrSeries: [
      { id: 'enterprise', label: 'Enterprise', tone: 'primary', values: [1180, 1290, 1410, 1540, 1690, 1860] },
      { id: 'growth', label: 'Growth Tier', tone: 'secondary', values: [780, 840, 910, 985, 1070, 1165] },
      { id: 'self-serve', label: 'Self-Serve', tone: 'emerald', values: [410, 455, 502, 560, 620, 695] },
    ],
    legendSummaries: {
      enterprise: '$1.86M',
      growth: '$1.17M',
      'self-serve': '$695k',
    },
    channels: [
      { id: 'direct', label: 'Enterprise Direct', value: 2340, tone: 'primary' },
      { id: 'partner', label: 'Cloud Marketplace', value: 1580, tone: 'secondary' },
      { id: 'plg', label: 'Product-Led Self-Serve', value: 1120, tone: 'emerald' },
      { id: 'inbound', label: 'Developer Docs Inbound', value: 540, tone: 'amber' },
    ],
    pipelineLeads: [1820, 2040, 2280, 2510, 2790, 3120],
    conversionRate: [18.9, 19.7, 20.8, 22.1, 23.4, 24.8],
  },
};

const TIMEFRAME_OPTIONS: Array<{ value: TimeframeKey; label: string }> = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
];

function isTimeframeKey(raw: string): raw is TimeframeKey {
  return raw === '7d' || raw === '30d' || raw === '90d';
}

function renderExecutiveKpiIcon(id: string) {
  if (id === 'mrr') return <DollarSign className="w-4 h-4" aria-hidden="true" />;
  if (id === 'nrr') return <TrendingUp className="w-4 h-4" aria-hidden="true" />;
  return <Zap className="w-4 h-4" aria-hidden="true" />;
}

function ExecutiveAnalyticsDashboardScreen() {
  const [timeframe, setTimeframe] = useState<TimeframeKey>('30d');
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<string[]>([]);
  const [highlightedSeriesId, setHighlightedSeriesId] = useState<string | null>(null);
  const [selectedChannelNote, setSelectedChannelNote] = useState<string>(
    'Enterprise Direct leads channel contribution at 42.4% share'
  );
  const [selectedFunnelIdx, setSelectedFunnelIdx] = useState<number>(5);

  const dataset = EXECUTIVE_DATA[timeframe];

  const legendItems = useMemo<LegendSeriesItem[]>(
    () =>
      dataset.mrrSeries.map((series) => ({
        id: series.id,
        label: series.label,
        value: dataset.legendSummaries[series.id] ?? '',
        tone: series.tone,
      })),
    [dataset]
  );

  const visibleMrrSeries = useMemo<AreaSeries[]>(
    () => dataset.mrrSeries.filter((series) => !hiddenSeriesIds.includes(series.id)),
    [dataset.mrrSeries, hiddenSeriesIds]
  );

  const safeFunnelIdx = Math.min(selectedFunnelIdx, dataset.labels.length - 1);
  const activeFunnelLabel = dataset.labels[safeFunnelIdx] ?? dataset.labels[0] ?? '';
  const activeLeads = dataset.pipelineLeads[safeFunnelIdx] ?? 0;
  const activeConv = dataset.conversionRate[safeFunnelIdx] ?? 0;

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <header className="prism-slab rounded-[22px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0">
              <BarChart3
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
                aria-hidden="true"
              />
            </span>
            <h4
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              Revenue &amp; Growth Cockpit
            </h4>
            <BadgeStatus label="Live Ledger" tone="online" />
          </div>
          <p className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
            {dataset.caption}
          </p>
        </div>

        <SegmentedControl
          ariaLabel="Analytics timeframe selector"
          options={TIMEFRAME_OPTIONS}
          value={timeframe}
          onChange={(next) => {
            if (isTimeframeKey(next)) {
              setTimeframe(next);
            }
          }}
        />
      </header>

      <section
        aria-label="Executive KPI summary"
        className="grid grid-cols-1 @2xl:grid-cols-3 gap-3.5"
      >
        {dataset.kpis.map((tile) => (
          <KpiMetricCard
            key={tile.id}
            label={tile.label}
            prefix={tile.prefix}
            value={tile.value}
            unit={tile.unit}
            deltaPercent={tile.deltaPercent}
            deltaLabel={tile.deltaLabel}
            invertDeltaSemantics={tile.invertDeltaSemantics}
            sparkline={tile.sparkline}
            icon={renderExecutiveKpiIcon(tile.id)}
            className="min-w-0"
          />
        ))}
      </section>

      <section className="prism-well rounded-[22px] p-3.5 sm:p-4 space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <span
            className="text-xs font-semibold uppercase tracking-[0.06em]"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            MRR Segment Filter ({visibleMrrSeries.length}/{dataset.mrrSeries.length} active)
          </span>
          {highlightedSeriesId ? (
            <span className="prism-emerald px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
              Inspecting: {highlightedSeriesId}
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: 'var(--prism-text-secondary)' }}>
              Click legend pills to filter or Solo a tier
            </span>
          )}
        </div>

        <InteractiveLegend
          title="Revenue Tiers"
          items={legendItems}
          hiddenIds={hiddenSeriesIds}
          onHiddenIdsChange={setHiddenSeriesIds}
          onHighlightSeries={setHighlightedSeriesId}
        />

        {visibleMrrSeries.length > 0 ? (
          <AreaStackedChart
            title={`Cumulative MRR Composition (${timeframe.toUpperCase()})`}
            labels={dataset.labels}
            valueUnit="k"
            height={210}
            series={visibleMrrSeries}
          />
        ) : (
          <div className="prism-crystal rounded-2xl p-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-medium" style={{ color: 'var(--prism-text-secondary)' }}>
              All MRR tiers are currently filtered out. Restore series visibility to resume area
              stacking.
            </p>
            <SecondaryButton
              size="sm"
              leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => setHiddenSeriesIds([])}
            >
              Restore All Tiers
            </SecondaryButton>
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
        <div className="min-w-0">
          <DonutPieChart
            title="Acquisition Channel Mix"
            centerLabel="Revenue"
            valueUnit="k"
            size={200}
            slices={dataset.channels}
            onSelectSlice={(slice, pct) =>
              setSelectedChannelNote(
                `${slice.label} accounts for ${pct.toFixed(1)}% ($${slice.value}k)`
              )
            }
          />
        </div>

        <div className="min-w-0">
          <ComboDualAxisChart
            title="Qualified Pipeline vs. Conversion"
            labels={dataset.labels}
            barLabel="Qualified Leads"
            barValues={dataset.pipelineLeads}
            lineLabel="Win Rate"
            lineValues={dataset.conversionRate}
            lineUnit="%"
            height={220}
            onSelectIndex={(idx) => setSelectedFunnelIdx(idx)}
          />
        </div>
      </section>

      <footer className="prism-crystal rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Users
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
            aria-hidden="true"
          />
          <span className="truncate font-medium" style={{ color: 'var(--prism-text-primary)' }}>
            {selectedChannelNote}
          </span>
        </div>
        <span
          className="prism-well px-3 py-1 rounded-full font-mono tabular-nums font-semibold whitespace-nowrap shrink-0"
          style={{ color: 'var(--prism-text-primary)' }}
        >
          {activeFunnelLabel}: {activeLeads} leads · {activeConv.toFixed(1)}% win rate
        </span>
      </footer>
    </div>
  );
}

const EXECUTIVE_FULL_CODE = `import { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, Zap } from 'lucide-react';
import {
  AreaStackedChart, BadgeStatus, ComboDualAxisChart, DonutPieChart,
  InteractiveLegend, KpiMetricCard, SegmentedControl,
  type AreaSeries, type DonutSlice, type LegendSeriesItem,
} from '@refractor-ui/core';

type Timeframe = '7d' | '30d' | '90d';

const LABELS: Record<Timeframe, string[]> = {
  '7d': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  '30d': ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4', 'Wk 5', 'Wk 6'],
  '90d': ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
};

const MRR_SERIES: Record<Timeframe, AreaSeries[]> = {
  '7d': [
    { id: 'ent', label: 'Enterprise', tone: 'primary', values: [42, 46, 48, 51, 56, 59, 64] },
    { id: 'grw', label: 'Growth', tone: 'secondary', values: [28, 31, 33, 34, 38, 41, 43] },
    { id: 'plg', label: 'Self-Serve', tone: 'emerald', values: [14, 16, 17, 19, 21, 22, 24] },
  ],
  '30d': [
    { id: 'ent', label: 'Enterprise', tone: 'primary', values: [420, 455, 492, 534, 578, 624] },
    { id: 'grw', label: 'Growth', tone: 'secondary', values: [290, 312, 336, 362, 391, 418] },
    { id: 'plg', label: 'Self-Serve', tone: 'emerald', values: [148, 162, 179, 196, 214, 238] },
  ],
  '90d': [
    { id: 'ent', label: 'Enterprise', tone: 'primary', values: [1180, 1290, 1410, 1540, 1690, 1860] },
    { id: 'grw', label: 'Growth', tone: 'secondary', values: [780, 840, 910, 985, 1070, 1165] },
    { id: 'plg', label: 'Self-Serve', tone: 'emerald', values: [410, 455, 502, 560, 620, 695] },
  ],
};

const CHANNELS: DonutSlice[] = [
  { id: 'direct', label: 'Enterprise Direct', value: 780, tone: 'primary' },
  { id: 'partner', label: 'Cloud Marketplace', value: 520, tone: 'secondary' },
  { id: 'plg', label: 'Self-Serve PLG', value: 365, tone: 'emerald' },
  { id: 'docs', label: 'Docs Inbound', value: 175, tone: 'amber' },
];

export function ExecutiveAnalyticsDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const allSeries = MRR_SERIES[timeframe];
  const visibleSeries = useMemo(
    () => allSeries.filter((s) => !hiddenIds.includes(s.id)),
    [allSeries, hiddenIds]
  );
  const legendItems: LegendSeriesItem[] = allSeries.map((s) => ({
    id: s.id, label: s.label, value: \`$\${s.values[s.values.length - 1] ?? 0}k\`, tone: s.tone,
  }));

  return (
    <div className="space-y-4 min-w-0">
      <div className="prism-slab rounded-[22px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-lg font-bold">Revenue &amp; Growth Cockpit</h2>
          <BadgeStatus label="Live Ledger" tone="online" />
        </div>
        <SegmentedControl
          value={timeframe}
          onChange={(v) => { if (v === '7d' || v === '30d' || v === '90d') setTimeframe(v); }}
          options={[{ value: '7d', label: '7D' }, { value: '30d', label: '30D' }, { value: '90d', label: '90D' }]}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiMetricCard label="Monthly Recurring Rev" prefix="$" value="1.84M" deltaPercent={18.6} deltaLabel="vs prior" icon={<DollarSign className="w-4 h-4" />} sparkline={[1.46, 1.54, 1.61, 1.69, 1.76, 1.84]} />
        <KpiMetricCard label="Net Dollar Retention" value="132.8" unit="%" deltaPercent={4.6} deltaLabel="expansion" icon={<TrendingUp className="w-4 h-4" />} sparkline={[127, 129, 130, 131, 132, 133]} />
        <KpiMetricCard label="CAC Payback" value="7.6" unit="mo" deltaPercent={-12.8} invertDeltaSemantics deltaLabel="faster" icon={<Zap className="w-4 h-4" />} sparkline={[9.1, 8.8, 8.5, 8.2, 7.9, 7.6]} />
      </div>
      <div className="prism-well rounded-[22px] p-4 space-y-3">
        <InteractiveLegend title="Revenue Tiers" items={legendItems} hiddenIds={hiddenIds} onHiddenIdsChange={setHiddenIds} />
        <AreaStackedChart title="MRR Composition" labels={LABELS[timeframe]} valueUnit="k" series={visibleSeries} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DonutPieChart title="Channel Mix" centerLabel="Revenue" valueUnit="k" slices={CHANNELS} />
        <ComboDualAxisChart title="Pipeline vs. Conversion" labels={LABELS[timeframe]} barLabel="Leads" barValues={[620, 684, 735, 812, 874, 948]} lineLabel="Win Rate" lineValues={[19.2, 20.1, 21.0, 21.8, 22.9, 24.1]} lineUnit="%" />
      </div>
    </div>
  );
}`;

/* -------------------------------------------------------------------------- */
/* Screen 2: Quarterly Financial & Operations Report View                     */
/* -------------------------------------------------------------------------- */

const REPORT_PIVOT_FIELDS: ReadonlyArray<PivotField> = [
  { key: 'region', label: 'Region' },
  { key: 'segment', label: 'Segment' },
  { key: 'channel', label: 'Channel' },
  { key: 'revenue', label: 'Revenue ($k)', numeric: true },
];

function computePeriodScale(period: PeriodValue): number {
  const yearOffset = (period.year - 2026) * 0.08;
  if (period.granularity === 'year') {
    return Number((3.85 * (1 + yearOffset)).toFixed(2));
  }
  if (period.granularity === 'month') {
    const monthFactor = 0.31 + ((period.month ?? 10) - 1) * 0.008;
    return Number((monthFactor * (1 + yearOffset)).toFixed(2));
  }
  const quarterIndex = period.quarter ?? 4;
  const quarterWeights: Record<number, number> = {
    1: 0.84,
    2: 0.91,
    3: 0.97,
    4: 1.08,
  };
  const baseWeight = quarterWeights[quarterIndex] ?? 1;
  return Number((baseWeight * (1 + yearOffset)).toFixed(2));
}

function ReportViewBuilderScreen() {
  const [period, setPeriod] = useState<PeriodValue>({
    granularity: 'quarter',
    year: 2026,
    quarter: 4,
  });
  const [auditNote, setAuditNote] = useState<string>(
    'Select any waterfall bar or KPI track to inspect line-item variance.'
  );
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const periodLabel = formatPeriodValue(period);
  const scale = computePeriodScale(period);

  const ebitdaSteps = useMemo<WaterfallStep[]>(() => {
    const gross = Math.round(1420 * scale);
    const expansion = Math.round(340 * scale);
    const services = Math.round(115 * scale);
    const cogs = -Math.round(295 * scale);
    const rnd = -Math.round(410 * scale);
    const gtm = -Math.round(355 * scale);
    const ebitda = gross + expansion + services + cogs + rnd + gtm;

    return [
      { id: 'gross', label: 'Core Revenue', value: gross, kind: 'start' },
      { id: 'exp', label: 'Expansion', value: expansion, kind: 'increase' },
      { id: 'svc', label: 'Advisory', value: services, kind: 'increase' },
      { id: 'cogs', label: 'Cloud COGS', value: cogs, kind: 'decrease' },
      { id: 'rnd', label: 'R&D Eng', value: rnd, kind: 'decrease' },
      { id: 'gtm', label: 'Sales & GTM', value: gtm, kind: 'decrease' },
      { id: 'ebitda', label: 'Net EBITDA', value: ebitda, kind: 'total' },
    ];
  }, [scale]);

  const closingEbitda = ebitdaSteps[ebitdaSteps.length - 1]?.value ?? 0;
  const grossRevenue = (ebitdaSteps[0]?.value ?? 0) + (ebitdaSteps[1]?.value ?? 0);
  const ebitdaMarginPct =
    grossRevenue > 0 ? ((closingEbitda / grossRevenue) * 100).toFixed(1) : '0.0';

  const departmentKpis = useMemo<BulletChartItem[]>(() => {
    const bonus = period.granularity === 'quarter' ? (period.quarter ?? 4) * 1.4 : 3.2;
    return [
      {
        id: 'enterprise-sales',
        label: 'Enterprise Bookings',
        subtitle: `${periodLabel} quota attainment`,
        actual: Math.min(118, Math.round(98 + bonus)),
        target: 100,
        max: 120,
        ranges: [75, 95, 120],
        unit: '%',
        tone: 'emerald',
      },
      {
        id: 'gross-margin',
        label: 'Cloud Gross Margin',
        subtitle: 'Optical edge compute efficiency',
        actual: Math.min(92, Number((81.5 + bonus * 0.45).toFixed(1))),
        target: 82,
        max: 100,
        ranges: [70, 82, 100],
        unit: '%',
        tone: 'primary',
      },
      {
        id: 'platform-sla',
        label: 'Support First-Response SLA',
        subtitle: 'Tier-1 enterprise accounts',
        actual: Math.min(99.5, Number((93.8 + bonus * 0.5).toFixed(1))),
        target: 96,
        max: 100,
        ranges: [85, 95, 100],
        unit: '%',
        tone: 'secondary',
      },
    ];
  }, [period.granularity, period.quarter, periodLabel]);

  const regionalPivotData = useMemo<PivotRecord[]>(
    () => [
      { region: 'North America', segment: 'Enterprise', channel: 'Direct', revenue: Math.round(520 * scale) },
      { region: 'North America', segment: 'Growth', channel: 'Marketplace', revenue: Math.round(285 * scale) },
      { region: 'Europe', segment: 'Enterprise', channel: 'Direct', revenue: Math.round(340 * scale) },
      { region: 'Europe', segment: 'Growth', channel: 'Marketplace', revenue: Math.round(195 * scale) },
      { region: 'APAC', segment: 'Enterprise', channel: 'Direct', revenue: Math.round(260 * scale) },
      { region: 'APAC', segment: 'Growth', channel: 'Marketplace', revenue: Math.round(168 * scale) },
      { region: 'LATAM', segment: 'Growth', channel: 'Marketplace', revenue: Math.round(108 * scale) },
    ],
    [scale]
  );

  const handleExportSummary = () => {
    setExportStatus(
      `Exported ${periodLabel} Board Pack · EBITDA $${closingEbitda}k (${ebitdaMarginPct}% margin)`
    );
  };

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <header className="prism-slab rounded-[22px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0">
              <FileSpreadsheet
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
                aria-hidden="true"
              />
            </span>
            <h4
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              Financial &amp; Operations Board Report
            </h4>
            <span className="prism-emerald px-2.5 py-0.5 rounded-full text-xs font-mono tabular-nums font-semibold">
              {periodLabel}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
            Audited EBITDA margin{' '}
            <strong style={{ color: 'var(--prism-text-primary)' }}>{ebitdaMarginPct}%</strong> ·
            Closing EBITDA{' '}
            <strong style={{ color: 'var(--prism-text-primary)' }}>${closingEbitda}k</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <BadgeStatus label="SOC2 Verified" tone="online" />
          <SecondaryButton
            size="sm"
            tone="cobalt"
            leadingIcon={<Download className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={handleExportSummary}
          >
            Export Summary
          </SecondaryButton>
        </div>
      </header>

      {exportStatus ? (
        <div
          role="status"
          className="prism-emerald rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{exportStatus}</span>
          </span>
          <button
            type="button"
            onClick={() => setExportStatus(null)}
            className="prism-focus-ring underline underline-offset-2 text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="grid grid-cols-1 @3xl:grid-cols-12 gap-4 items-start">
        <div className="@3xl:col-span-5 min-w-0 space-y-3">
          <MonthQuarterYearPicker
            label="Fiscal Reporting Period"
            value={period}
            onChange={(next) => {
              setPeriod(next);
              setExportStatus(null);
            }}
            minYear={2024}
            maxYear={2028}
            className="max-w-none"
          />

          <div className="prism-well rounded-2xl p-3.5 space-y-1.5">
            <div
              className="text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Active Audit Note
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--prism-text-primary)' }}>
              {auditNote}
            </p>
          </div>
        </div>

        <div className="@3xl:col-span-7 min-w-0">
          <WaterfallChart
            title={`EBITDA P&L Bridge (${periodLabel})`}
            valuePrefix="$"
            valueSuffix="k"
            height={250}
            steps={ebitdaSteps}
            onSelectStep={(step, runningTotal) =>
              setAuditNote(
                `${step.label}: ${step.value >= 0 ? '+' : ''}$${step.value}k · Running EBITDA balance $${runningTotal}k.`
              )
            }
          />
        </div>
      </section>

      <section className="min-w-0">
        <BulletChart
          title={`Departmental KPI Attainment · ${periodLabel}`}
          items={departmentKpis}
          onSelectItem={(item, pct) =>
            setAuditNote(
              `${item.label} achieved ${item.actual}${item.unit ?? ''} (${pct}% of ${item.target}${item.unit ?? ''} plan).`
            )
          }
        />
      </section>

      <section className="min-w-0">
        <PivotTable
          data={regionalPivotData}
          fields={REPORT_PIVOT_FIELDS}
          defaultRowField="region"
          defaultColumnField="segment"
          defaultValueField="revenue"
          defaultAggregation="sum"
        />
      </section>
    </div>
  );
}

const REPORT_VIEW_FULL_CODE = `import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import {
  BulletChart,
  MonthQuarterYearPicker,
  PivotTable,
  SecondaryButton,
  WaterfallChart,
  formatPeriodValue,
  type BulletChartItem,
  type PeriodValue,
  type PivotField,
  type PivotRecord,
  type WaterfallStep,
} from '@refractor-ui/core';

const PIVOT_FIELDS: ReadonlyArray<PivotField> = [
  { key: 'region', label: 'Region' },
  { key: 'segment', label: 'Segment' },
  { key: 'revenue', label: 'Revenue ($k)', numeric: true },
];

export function QuarterlyFinancialReportView() {
  const [period, setPeriod] = useState<PeriodValue>({ granularity: 'quarter', year: 2026, quarter: 4 });
  const [exportedNote, setExportedNote] = useState<string>('');
  const label = formatPeriodValue(period);
  const scale = period.granularity === 'year' ? 3.85 : 0.84 + ((period.quarter ?? 4) - 1) * 0.08;

  const steps = useMemo<WaterfallStep[]>(() => {
    const gross = Math.round(1420 * scale);
    const expansion = Math.round(340 * scale);
    const cogs = -Math.round(295 * scale);
    const opex = -Math.round(765 * scale);
    return [
      { id: 'gross', label: 'Core Rev', value: gross, kind: 'start' },
      { id: 'exp', label: 'Expansion', value: expansion, kind: 'increase' },
      { id: 'cogs', label: 'Cloud COGS', value: cogs, kind: 'decrease' },
      { id: 'opex', label: 'R&D + GTM', value: opex, kind: 'decrease' },
      { id: 'ebitda', label: 'Net EBITDA', value: gross + expansion + cogs + opex, kind: 'total' },
    ];
  }, [scale]);

  const kpis: BulletChartItem[] = [
    { id: 'sales', label: 'Enterprise Bookings', actual: 104, target: 100, max: 120, ranges: [75, 95, 120], unit: '%', tone: 'emerald' },
    { id: 'margin', label: 'Cloud Gross Margin', actual: 83.4, target: 82, max: 100, ranges: [70, 82, 100], unit: '%', tone: 'primary' },
  ];

  const rows: PivotRecord[] = [
    { region: 'North America', segment: 'Enterprise', revenue: Math.round(520 * scale) },
    { region: 'North America', segment: 'Growth', revenue: Math.round(285 * scale) },
    { region: 'Europe', segment: 'Enterprise', revenue: Math.round(340 * scale) },
    { region: 'APAC', segment: 'Growth', revenue: Math.round(168 * scale) },
  ];

  return (
    <div className="space-y-4 min-w-0">
      <div className="prism-slab rounded-[22px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">Financial &amp; Ops Board Report</h2>
          <span className="prism-emerald px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold">{label}</span>
        </div>
        <SecondaryButton size="sm" tone="cobalt" leadingIcon={<Download className="w-3.5 h-3.5" />} onClick={() => setExportedNote(\`Exported \${label} summary\`)}>
          Export Summary
        </SecondaryButton>
      </div>
      {exportedNote ? <div className="prism-emerald rounded-xl px-4 py-2 text-xs font-semibold">{exportedNote}</div> : null}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        <div className="md:col-span-5"><MonthQuarterYearPicker value={period} onChange={setPeriod} className="max-w-none" /></div>
        <div className="md:col-span-7"><WaterfallChart title={\`EBITDA Bridge (\${label})\`} valuePrefix="$" valueSuffix="k" steps={steps} /></div>
      </div>
      <BulletChart title="Departmental KPI Attainment" items={kpis} />
      <PivotTable data={rows} fields={PIVOT_FIELDS} defaultRowField="region" defaultColumnField="segment" defaultValueField="revenue" />
    </div>
  );
}`;

/* -------------------------------------------------------------------------- */
/* Screen 3: Real-Time SRE Telemetry & SLA Operations Center                  */
/* -------------------------------------------------------------------------- */

type ClusterNodeId = 'us-west-gpu-01' | 'eu-central-edge-04' | 'ap-east-core-02';

interface ClusterTelemetryProfile {
  id: ClusterNodeId;
  label: string;
  elapsedMs: number;
  gpuLoad: number;
  cpuLoad: number;
  warningThreshold: number;
  samples: TelemetrySample[];
  slaData: ThresholdDataPoint[];
  slaEvents: ChartEventMarker[];
  crosshairLabels: string[];
  crosshairSeries: CrosshairSeries[];
}

const CLUSTER_PROFILES: Record<ClusterNodeId, ClusterTelemetryProfile> = {
  'us-west-gpu-01': {
    id: 'us-west-gpu-01',
    label: 'us-west-gpu-01',
    elapsedMs: 428400,
    gpuLoad: 76,
    cpuLoad: 64,
    warningThreshold: 78,
    samples: [
      { id: 'u-1', timestamp: '14:20:00', value: 44 },
      { id: 'u-2', timestamp: '14:20:05', value: 48 },
      { id: 'u-3', timestamp: '14:20:10', value: 52 },
      { id: 'u-4', timestamp: '14:20:15', value: 49 },
      { id: 'u-5', timestamp: '14:20:20', value: 63 },
      { id: 'u-6', timestamp: '14:20:25', value: 74 },
      { id: 'u-7', timestamp: '14:20:30', value: 82 },
      { id: 'u-8', timestamp: '14:20:35', value: 68 },
      { id: 'u-9', timestamp: '14:20:40', value: 57 },
      { id: 'u-10', timestamp: '14:20:45', value: 61 },
    ],
    slaData: [
      { label: '09:00', value: 46 },
      { label: '10:00', value: 52 },
      { label: '11:00', value: 58 },
      { label: '12:00', value: 86 },
      { label: '13:00', value: 64 },
      { label: '14:00', value: 51 },
      { label: '15:00', value: 47 },
    ],
    slaEvents: [
      {
        id: 'rollout-us',
        index: 3,
        label: 'v2.4 Model Swap',
        detail: 'Brief cold-cache spike on US-West inference pods',
        tone: 'primary',
      },
      {
        id: 'scale-us',
        index: 5,
        label: 'HPA +8 GPUs',
        detail: 'Autoscaler restored P95 latency inside SLA band',
        tone: 'emerald',
      },
    ],
    crosshairLabels: ['14:00', '14:05', '14:10', '14:15', '14:20', '14:25', '14:30'],
    crosshairSeries: [
      { id: 'p95', label: 'P95 Latency', unit: 'ms', tone: 'primary', values: [48, 52, 57, 68, 63, 54, 50] },
      { id: 'p50', label: 'P50 Latency', unit: 'ms', tone: 'secondary', values: [24, 26, 28, 33, 30, 27, 25] },
      { id: 'cache', label: 'Cache Hit', unit: '%', tone: 'emerald', values: [95, 94, 92, 87, 91, 95, 96] },
    ],
  },
  'eu-central-edge-04': {
    id: 'eu-central-edge-04',
    label: 'eu-central-edge-04',
    elapsedMs: 612900,
    gpuLoad: 62,
    cpuLoad: 53,
    warningThreshold: 72,
    samples: [
      { id: 'e-1', timestamp: '14:20:00', value: 36 },
      { id: 'e-2', timestamp: '14:20:05', value: 39 },
      { id: 'e-3', timestamp: '14:20:10', value: 41 },
      { id: 'e-4', timestamp: '14:20:15', value: 44 },
      { id: 'e-5', timestamp: '14:20:20', value: 47 },
      { id: 'e-6', timestamp: '14:20:25', value: 54 },
      { id: 'e-7', timestamp: '14:20:30', value: 51 },
      { id: 'e-8', timestamp: '14:20:35', value: 46 },
      { id: 'e-9', timestamp: '14:20:40', value: 42 },
      { id: 'e-10', timestamp: '14:20:45', value: 45 },
    ],
    slaData: [
      { label: '09:00', value: 38 },
      { label: '10:00', value: 42 },
      { label: '11:00', value: 49 },
      { label: '12:00', value: 55 },
      { label: '13:00', value: 74 },
      { label: '14:00', value: 48 },
      { label: '15:00', value: 41 },
    ],
    slaEvents: [
      {
        id: 'failover-eu',
        index: 4,
        label: 'Frankfurt Cutover',
        detail: 'Planned BGP drain redirected 18% ingress traffic',
        tone: 'amber',
      },
    ],
    crosshairLabels: ['14:00', '14:05', '14:10', '14:15', '14:20', '14:25', '14:30'],
    crosshairSeries: [
      { id: 'p95', label: 'P95 Latency', unit: 'ms', tone: 'primary', values: [39, 41, 44, 52, 47, 43, 40] },
      { id: 'p50', label: 'P50 Latency', unit: 'ms', tone: 'secondary', values: [19, 20, 21, 25, 22, 21, 19] },
      { id: 'cache', label: 'Cache Hit', unit: '%', tone: 'emerald', values: [97, 97, 96, 93, 95, 97, 98] },
    ],
  },
  'ap-east-core-02': {
    id: 'ap-east-core-02',
    label: 'ap-east-core-02',
    elapsedMs: 184200,
    gpuLoad: 88,
    cpuLoad: 79,
    warningThreshold: 80,
    samples: [
      { id: 'a-1', timestamp: '14:20:00', value: 58 },
      { id: 'a-2', timestamp: '14:20:05', value: 64 },
      { id: 'a-3', timestamp: '14:20:10', value: 71 },
      { id: 'a-4', timestamp: '14:20:15', value: 76 },
      { id: 'a-5', timestamp: '14:20:20', value: 84 },
      { id: 'a-6', timestamp: '14:20:25', value: 89 },
      { id: 'a-7', timestamp: '14:20:30', value: 81 },
      { id: 'a-8', timestamp: '14:20:35', value: 74 },
      { id: 'a-9', timestamp: '14:20:40', value: 79 },
      { id: 'a-10', timestamp: '14:20:45', value: 83 },
    ],
    slaData: [
      { label: '09:00', value: 59 },
      { label: '10:00', value: 66 },
      { label: '11:00', value: 81 },
      { label: '12:00', value: 92 },
      { label: '13:00', value: 84 },
      { label: '14:00', value: 71 },
      { label: '15:00', value: 65 },
    ],
    slaEvents: [
      {
        id: 'burst-ap',
        index: 3,
        label: 'Tokyo Peak Surge',
        detail: '2.4x concurrent token throughput triggered rate guard',
        tone: 'rose',
      },
      {
        id: 'shed-ap',
        index: 5,
        label: 'Edge Shedding',
        detail: 'Overflow routed to Singapore standby ring',
        tone: 'secondary',
      },
    ],
    crosshairLabels: ['14:00', '14:05', '14:10', '14:15', '14:20', '14:25', '14:30'],
    crosshairSeries: [
      { id: 'p95', label: 'P95 Latency', unit: 'ms', tone: 'primary', values: [64, 71, 79, 89, 82, 74, 68] },
      { id: 'p50', label: 'P50 Latency', unit: 'ms', tone: 'secondary', values: [31, 35, 39, 44, 41, 36, 33] },
      { id: 'cache', label: 'Cache Hit', unit: '%', tone: 'emerald', values: [91, 89, 86, 83, 86, 90, 92] },
    ],
  },
};

const CLUSTER_ORDER: ReadonlyArray<ClusterNodeId> = [
  'us-west-gpu-01',
  'eu-central-edge-04',
  'ap-east-core-02',
];

const SLA_THRESHOLDS: ChartThresholdLine[] = [
  { id: 'sla-cap', label: 'SLA Budget Cap', value: 75, tone: 'rose', dashed: true },
  { id: 'warn-floor', label: 'Warning Floor', value: 60, tone: 'amber', dashed: true },
];

function RealtimeTelemetryNocScreen() {
  const [clusterId, setClusterId] = useState<ClusterNodeId>('us-west-gpu-01');
  const [probeStatus, setProbeStatus] = useState<ProcessStatus>('running');
  const [stepCount, setStepCount] = useState<number>(0);
  const [inspectorNote, setInspectorNote] = useState<string>(
    'Telemetry stream live · click Step on the latency stream or inspect SLA markers below.'
  );

  const profile = CLUSTER_PROFILES[clusterId];
  const isPaused = probeStatus !== 'running';

  const gpuCurrent = Math.min(98, Math.max(24, profile.gpuLoad + ((stepCount * 5) % 13) - 4));
  const cpuCurrent = Math.min(96, Math.max(18, profile.cpuLoad + ((stepCount * 3) % 11) - 3));

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <header className="prism-slab rounded-[22px] p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0">
              <Radio
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
                aria-hidden="true"
              />
            </span>
            <div className="min-w-0">
              <h4
                className="text-base sm:text-lg font-bold tracking-tight truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                SRE Telemetry &amp; SLA Operations Center
              </h4>
              <p className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
                Active cluster:{' '}
                <code className="font-mono font-semibold">{profile.label}</code> ·{' '}
                {stepCount > 0 ? `${stepCount} manual probe steps captured` : '10s rolling buffer'}
              </p>
            </div>
          </div>

          <ProcessStatusPill
            label={`probe://${profile.label}`}
            status={probeStatus}
            elapsedMs={profile.elapsedMs + stepCount * 5000}
            exitCode={probeStatus === 'cancelled' ? 130 : undefined}
            onStop={() => {
              setProbeStatus('cancelled');
              setInspectorNote(`Paused telemetry ingestion on ${profile.label} (exit 130).`);
            }}
            onRetry={() => {
              setProbeStatus('running');
              setInspectorNote(`Resumed live telemetry probe on ${profile.label}.`);
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-[0.06em] inline-flex items-center gap-1"
            style={{ color: 'var(--prism-text-secondary)' }}
          >
            <Server className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Cluster:</span>
          </span>
          {CLUSTER_ORDER.map((nodeId) => (
            <TagChip
              key={nodeId}
              label={nodeId}
              selected={clusterId === nodeId}
              onSelect={() => {
                setClusterId(nodeId);
                setStepCount(0);
                setInspectorNote(`Switched SRE telemetry context to ${nodeId}.`);
              }}
            />
          ))}
        </div>
      </header>

      <section className="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
        <div className="min-w-0">
          <RadialGauge
            title="GPU Optical Pipeline Load"
            label="Tensor Compute"
            value={gpuCurrent}
            min={0}
            max={100}
            target={82}
            unit="%"
            sweep={180}
            size={215}
            onSelectBand={(band) =>
              setInspectorNote(
                `GPU band "${band.label}" (≤ ${band.upTo}%) · current utilization ${gpuCurrent}%.`
              )
            }
          />
        </div>

        <div className="min-w-0">
          <RadialGauge
            title="Cluster CPU Saturation"
            label="Ingress Workers"
            value={cpuCurrent}
            min={0}
            max={100}
            target={75}
            unit="%"
            sweep={270}
            size={215}
            onSelectBand={(band) =>
              setInspectorNote(
                `CPU band "${band.label}" (≤ ${band.upTo}%) · current saturation ${cpuCurrent}%.`
              )
            }
          />
        </div>
      </section>

      <section className="min-w-0">
        <LiveTelemetryChart
          key={clusterId}
          title={`Streaming Inference Latency · ${profile.label}`}
          unit="ms"
          tone="primary"
          samples={profile.samples}
          warningThreshold={profile.warningThreshold}
          defaultWindowSize={20}
          paused={isPaused}
          onPausedChange={(nextPaused) => {
            setProbeStatus(nextPaused ? 'cancelled' : 'running');
            setInspectorNote(
              nextPaused
                ? `Frozen live telemetry window for ${profile.label}.`
                : `Live stream resumed for ${profile.label}.`
            );
          }}
          onGenerateSample={(seq) => {
            const synthetic = Math.round(profile.gpuLoad * 0.72 + ((seq * 19) % 38));
            const sec = String((seq * 5) % 60).padStart(2, '0');
            const sample: TelemetrySample = {
              id: `${clusterId}-step-${seq}`,
              timestamp: `14:21:${sec}`,
              value: synthetic,
            };
            setStepCount(seq);
            setInspectorNote(
              `Captured live probe sample ${sample.timestamp}: ${sample.value}ms ${
                sample.value >= profile.warningThreshold ? '(SLA warning)' : '(nominal)'
              }.`
            );
            return sample;
          }}
          onSelectSample={(sample) =>
            setInspectorNote(
              `Selected sample at ${sample.timestamp}: ${sample.value}ms on ${profile.label}.`
            )
          }
        />
      </section>

      <section className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
        <div className="min-w-0">
          <ChartThresholdMarker
            title="SLA Breach & Rollout Annotations"
            valueUnit="ms"
            height={220}
            data={profile.slaData}
            bands={[
              { id: 'optimal-sla', label: 'Optimal SLA Band', from: 32, to: 65, tone: 'emerald' },
            ]}
            thresholds={SLA_THRESHOLDS}
            events={profile.slaEvents}
            onSelectThreshold={(threshold, breaches) =>
              setInspectorNote(
                `${threshold.label} (${threshold.value}ms): ${breaches} breach window${breaches === 1 ? '' : 's'} detected.`
              )
            }
            onSelectEvent={(event, point) =>
              setInspectorNote(
                `Event "${event.label}" at ${point.label} (${point.value}ms) — ${event.detail ?? 'logged'}`
              )
            }
          />
        </div>

        <div className="min-w-0">
          <ChartCrosshairTooltip
            key={`crosshair-${clusterId}`}
            title="Multi-Metric Crosshair Inspector"
            defaultActiveIndex={3}
            height={220}
            labels={profile.crosshairLabels}
            series={profile.crosshairSeries}
            onActiveIndexChange={(snapshot) => {
              if (!snapshot) return;
              const summary = snapshot.items
                .map((it) => `${it.label} ${it.value}${it.unit}`)
                .join(' · ');
              setInspectorNote(`Snapshot ${snapshot.label} → ${summary}`);
            }}
          />
        </div>
      </section>

      <footer className="prism-well rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldAlert
            className="w-4 h-4 shrink-0"
            style={{ color: 'var(--prism-primary-main)' }}
            aria-hidden="true"
          />
          <span className="font-medium" style={{ color: 'var(--prism-text-primary)' }}>
            {inspectorNote}
          </span>
        </div>
        <span className="prism-crystal px-2.5 py-0.5 rounded-full font-mono tabular-nums text-[11px] inline-flex items-center gap-1 shrink-0">
          <Cpu className="w-3 h-3" aria-hidden="true" />
          <span>
            GPU {gpuCurrent}% · CPU {cpuCurrent}%
          </span>
        </span>
      </footer>
    </div>
  );
}

const REALTIME_NOC_FULL_CODE = `import { useState } from 'react';
import {
  ChartCrosshairTooltip,
  ChartThresholdMarker,
  LiveTelemetryChart,
  ProcessStatusPill,
  RadialGauge,
  type ProcessStatus,
  type TelemetrySample,
} from '@refractor-ui/core';

const INITIAL_SAMPLES: TelemetrySample[] = [
  { id: 't-1', timestamp: '14:20:00', value: 44 },
  { id: 't-2', timestamp: '14:20:05', value: 48 },
  { id: 't-3', timestamp: '14:20:10', value: 52 },
  { id: 't-4', timestamp: '14:20:15', value: 63 },
  { id: 't-5', timestamp: '14:20:20', value: 74 },
  { id: 't-6', timestamp: '14:20:25', value: 82 },
  { id: 't-7', timestamp: '14:20:30', value: 61 },
];

export function RealtimeTelemetryNoc() {
  const [status, setStatus] = useState<ProcessStatus>('running');
  const [stepCount, setStepCount] = useState<number>(0);
  const gpuLoad = Math.min(98, 76 + ((stepCount * 5) % 13) - 4);
  const cpuLoad = Math.min(95, 64 + ((stepCount * 3) % 11) - 3);

  return (
    <div className="space-y-4 min-w-0">
      <div className="prism-slab rounded-[22px] p-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">SRE Telemetry &amp; SLA Operations Center</h2>
        <ProcessStatusPill
          label="probe://us-west-gpu-01"
          status={status}
          elapsedMs={428400 + stepCount * 5000}
          onStop={() => setStatus('cancelled')}
          onRetry={() => setStatus('running')}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RadialGauge title="GPU Pipeline Load" label="Compute" value={gpuLoad} target={82} unit="%" sweep={180} />
        <RadialGauge title="CPU Saturation" label="Workers" value={cpuLoad} target={75} unit="%" sweep={270} />
      </div>
      <LiveTelemetryChart
        title="Streaming Inference Latency"
        unit="ms"
        samples={INITIAL_SAMPLES}
        warningThreshold={78}
        paused={status !== 'running'}
        onPausedChange={(nextPaused) => setStatus(nextPaused ? 'cancelled' : 'running')}
        onGenerateSample={(seq) => {
          setStepCount(seq);
          const sec = String((seq * 5) % 60).padStart(2, '0');
          return { id: \`step-\${seq}\`, timestamp: \`14:21:\${sec}\`, value: 52 + ((seq * 19) % 36) };
        }}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartThresholdMarker
          title="SLA Breach Annotations"
          valueUnit="ms"
          data={[
            { label: '09:00', value: 46 }, { label: '11:00', value: 58 },
            { label: '12:00', value: 86 }, { label: '14:00', value: 51 },
          ]}
          bands={[{ id: 'sla', label: 'Optimal SLA', from: 32, to: 65, tone: 'emerald' }]}
          thresholds={[{ id: 'cap', label: 'SLA Cap', value: 75, tone: 'rose', dashed: true }]}
          events={[{ id: 'rollout', index: 2, label: 'v2.4 Swap', tone: 'primary' }]}
        />
        <ChartCrosshairTooltip
          title="Multi-Metric Inspector"
          defaultActiveIndex={2}
          labels={['14:00', '14:10', '14:20', '14:30']}
          series={[
            { id: 'p95', label: 'P95 Latency', unit: 'ms', tone: 'primary', values: [48, 57, 68, 50] },
            { id: 'cache', label: 'Cache Hit', unit: '%', tone: 'emerald', values: [95, 92, 87, 96] },
          ]}
        />
      </div>
    </div>
  );
}`;

/* -------------------------------------------------------------------------- */
/* Screen 4: Global Traffic & Geospatial Edge Command                         */
/* -------------------------------------------------------------------------- */

type TrafficProfileMode = 'steady' | 'surge';

interface EdgeLatencyBadge {
  id: string;
  regionLabel: string;
  metricText: string;
  variant: 'line' | 'bar';
  tone: SparklineTone;
  values: ReadonlyArray<number>;
  note: string;
}

interface GeospatialDataset {
  regions: ChoroplethRegion[];
  flows: GeoFlowArc[];
  badges: ReadonlyArray<EdgeLatencyBadge>;
  totalTrafficLabel: string;
}

const EDGE_HUBS: GeoHub[] = [
  { id: 'sfo', label: 'San Francisco', lat: 37.77, lng: -122.42, tone: 'primary' },
  { id: 'nyc', label: 'New York', lat: 40.71, lng: -74.01, tone: 'primary' },
  { id: 'lon', label: 'London', lat: 51.51, lng: -0.13, tone: 'secondary' },
  { id: 'fra', label: 'Frankfurt', lat: 50.11, lng: 8.68, tone: 'secondary' },
  { id: 'sin', label: 'Singapore', lat: 1.35, lng: 103.82, tone: 'emerald' },
  { id: 'tok', label: 'Tokyo', lat: 35.68, lng: 139.65, tone: 'amber' },
  { id: 'syd', label: 'Sydney', lat: -33.87, lng: 151.21, tone: 'rose' },
];

const EDGE_POP_POINTS: GeoPoint[] = [
  { id: 'sfo-1', label: 'San Francisco Core', lat: 37.77, lng: -122.42, category: 'Primary', value: 99, tone: 'primary' },
  { id: 'sjc-1', label: 'San Jose Edge', lat: 37.34, lng: -121.89, category: 'Primary', value: 95, tone: 'primary' },
  { id: 'lax-1', label: 'Los Angeles Relay', lat: 34.05, lng: -118.24, category: 'Edge', value: 89, tone: 'secondary' },
  { id: 'nyc-1', label: 'New York Core', lat: 40.71, lng: -74.01, category: 'Primary', value: 98, tone: 'primary' },
  { id: 'iad-1', label: 'Ashburn Backbone', lat: 39.04, lng: -77.49, category: 'Primary', value: 97, tone: 'primary' },
  { id: 'lon-1', label: 'London Docklands', lat: 51.51, lng: -0.13, category: 'Primary', value: 96, tone: 'emerald' },
  { id: 'fra-1', label: 'Frankfurt DE-CIX', lat: 50.11, lng: 8.68, category: 'Primary', value: 96, tone: 'emerald' },
  { id: 'ams-1', label: 'Amsterdam IX', lat: 52.37, lng: 4.9, category: 'Edge', value: 92, tone: 'emerald' },
  { id: 'tok-1', label: 'Tokyo Otemachi', lat: 35.68, lng: 139.65, category: 'Primary', value: 98, tone: 'amber' },
  { id: 'sin-1', label: 'Singapore Jurong', lat: 1.35, lng: 103.82, category: 'Edge', value: 94, tone: 'amber' },
  { id: 'syd-1', label: 'Sydney Mascot', lat: -33.87, lng: 151.21, category: 'Edge', value: 90, tone: 'rose' },
];

const GEOSPATIAL_DATA: Record<TrafficProfileMode, GeospatialDataset> = {
  steady: {
    totalTrafficLabel: '642M req/hr · 1.82 Tbps backbone',
    regions: [
      { id: 'na', name: 'North America', value: 168, detail: '48 PoPs · 13ms median' },
      { id: 'eu', name: 'Europe', value: 142, detail: '42 PoPs · 16ms median' },
      { id: 'as', name: 'Asia-Pacific', value: 184, detail: '54 PoPs · 19ms median' },
      { id: 'sa', name: 'South America', value: 48, detail: '12 PoPs · 27ms median' },
      { id: 'me', name: 'Middle East', value: 44, detail: '10 PoPs · 22ms median' },
      { id: 'oc', name: 'Oceania', value: 34, detail: '8 PoPs · 18ms median' },
      { id: 'af', name: 'Africa', value: 22, detail: '8 PoPs · 32ms median' },
    ],
    flows: [
      { id: 'f-atl', origin: 'nyc', destination: 'lon', volume: 580, label: 'Trans-Atlantic Core', tone: 'primary' },
      { id: 'f-pac', origin: 'sfo', destination: 'tok', volume: 445, label: 'Trans-Pacific Fiber', tone: 'secondary' },
      { id: 'f-eur', origin: 'fra', destination: 'sin', volume: 340, label: 'EMEA → APAC Trunk', tone: 'emerald' },
      { id: 'f-eas', origin: 'tok', destination: 'sin', volume: 305, label: 'East Asia Mesh', tone: 'amber' },
      { id: 'f-oce', origin: 'sin', destination: 'syd', volume: 210, label: 'Oceania Relay', tone: 'rose' },
    ],
    badges: [
      {
        id: 'na-edge',
        regionLabel: 'US-West Edge',
        metricText: '13.2ms',
        variant: 'line',
        tone: 'emerald',
        values: [16.8, 15.9, 15.1, 14.4, 13.8, 13.5, 13.2],
        note: 'US-West Edge: 13.2ms median RTT across 48 North American PoPs.',
      },
      {
        id: 'eu-edge',
        regionLabel: 'EU-Central Mesh',
        metricText: '16.4ms',
        variant: 'line',
        tone: 'secondary',
        values: [19.2, 18.7, 17.9, 17.6, 17.0, 16.7, 16.4],
        note: 'EU-Central Mesh: Frankfurt + London peering at 98.4% cache hit.',
      },
      {
        id: 'ap-edge',
        regionLabel: 'APAC Throughput',
        metricText: '184M/h',
        variant: 'bar',
        tone: 'primary',
        values: [132, 145, 151, 162, 170, 178, 184],
        note: 'APAC Throughput: Tokyo + Singapore carrying 28.7% of global ingress.',
      },
      {
        id: 'err-edge',
        regionLabel: '5xx Packet Drop',
        metricText: '0.04%',
        variant: 'line',
        tone: 'amber',
        values: [0.09, 0.08, 0.07, 0.06, 0.05, 0.04, 0.04],
        note: 'Global packet loss remains well under the 0.10% SLA budget.',
      },
    ],
  },
  surge: {
    totalTrafficLabel: '1.14B req/hr · 3.16 Tbps peak burst',
    regions: [
      { id: 'na', name: 'North America', value: 312, detail: '48 PoPs · 18ms under burst' },
      { id: 'eu', name: 'Europe', value: 248, detail: '42 PoPs · 21ms under burst' },
      { id: 'as', name: 'Asia-Pacific', value: 338, detail: '54 PoPs · 26ms under burst' },
      { id: 'sa', name: 'South America', value: 79, detail: '12 PoPs · 33ms under burst' },
      { id: 'me', name: 'Middle East', value: 71, detail: '10 PoPs · 29ms under burst' },
      { id: 'oc', name: 'Oceania', value: 56, detail: '8 PoPs · 24ms under burst' },
      { id: 'af', name: 'Africa', value: 36, detail: '8 PoPs · 38ms under burst' },
    ],
    flows: [
      { id: 'f-atl', origin: 'nyc', destination: 'lon', volume: 960, label: 'Trans-Atlantic Burst', tone: 'primary' },
      { id: 'f-pac', origin: 'sfo', destination: 'tok', volume: 810, label: 'Trans-Pacific Surge', tone: 'secondary' },
      { id: 'f-eur', origin: 'fra', destination: 'sin', volume: 590, label: 'EMEA → APAC Spillover', tone: 'emerald' },
      { id: 'f-eas', origin: 'tok', destination: 'sin', volume: 515, label: 'East Asia Mesh Peak', tone: 'amber' },
      { id: 'f-oce', origin: 'sin', destination: 'syd', volume: 345, label: 'Oceania Overflow', tone: 'rose' },
    ],
    badges: [
      {
        id: 'na-edge',
        regionLabel: 'US-West Edge',
        metricText: '18.1ms',
        variant: 'line',
        tone: 'amber',
        values: [13.2, 14.5, 15.8, 16.9, 17.4, 17.9, 18.1],
        note: 'US-West Edge absorbing +86% surge traffic with zero dropped connections.',
      },
      {
        id: 'eu-edge',
        regionLabel: 'EU-Central Mesh',
        metricText: '21.3ms',
        variant: 'line',
        tone: 'secondary',
        values: [16.4, 17.5, 18.9, 19.6, 20.4, 20.9, 21.3],
        note: 'EU-Central Mesh activated Amsterdam overflow relays automatically.',
      },
      {
        id: 'ap-edge',
        regionLabel: 'APAC Throughput',
        metricText: '338M/h',
        variant: 'bar',
        tone: 'primary',
        values: [184, 214, 248, 279, 302, 321, 338],
        note: 'APAC Throughput peaked at 338M req/hr during regional launch window.',
      },
      {
        id: 'err-edge',
        regionLabel: '5xx Packet Drop',
        metricText: '0.11%',
        variant: 'line',
        tone: 'rose',
        values: [0.04, 0.05, 0.07, 0.08, 0.09, 0.1, 0.11],
        note: 'Minor tail packet elevation observed on Tokyo trans-Pacific ingress.',
      },
    ],
  },
};

const TRAFFIC_MODE_OPTIONS: Array<{ value: TrafficProfileMode; label: string }> = [
  { value: 'steady', label: 'Steady State' },
  { value: 'surge', label: 'Global Surge' },
];

function isTrafficMode(raw: string): raw is TrafficProfileMode {
  return raw === 'steady' || raw === 'surge';
}

function GeospatialNetworkCommandScreen() {
  const [mode, setMode] = useState<TrafficProfileMode>('steady');
  const [activeSelection, setActiveSelection] = useState<string>(
    'Select any continent, fiber arc, PoP cluster, or latency badge to inspect edge telemetry.'
  );

  const data = GEOSPATIAL_DATA[mode];

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <header className="prism-slab rounded-[22px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0">
              <Globe
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
                aria-hidden="true"
              />
            </span>
            <h4
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              Global Traffic &amp; Geospatial Edge Command
            </h4>
            <BadgeStatus label="182 PoPs Online" tone={mode === 'surge' ? 'warning' : 'online'} />
          </div>
          <p className="text-xs font-mono tabular-nums" style={{ color: 'var(--prism-text-secondary)' }}>
            {data.totalTrafficLabel}
          </p>
        </div>

        <SegmentedControl
          ariaLabel="Network load simulation"
          options={TRAFFIC_MODE_OPTIONS}
          value={mode}
          onChange={(next) => {
            if (isTrafficMode(next)) {
              setMode(next);
              setActiveSelection(
                next === 'surge'
                  ? 'Global Surge active: trans-oceanic fiber corridors operating at 1.74x steady volume.'
                  : 'Steady State active: all 7 macro-regions operating inside nominal latency bounds.'
              );
            }
          }}
        />
      </header>

      <section
        aria-label="Regional edge latency sparklines"
        className="grid grid-cols-1 @md:grid-cols-2 @3xl:grid-cols-4 gap-3"
      >
        {data.badges.map((badge) => (
          <button
            key={badge.id}
            type="button"
            onClick={() => setActiveSelection(badge.note)}
            className="prism-crystal prism-focus-ring rounded-2xl p-3.5 text-left flex flex-col gap-2 cursor-pointer transition-all hover:brightness-105 min-w-0"
          >
            <div className="flex items-center justify-between gap-2 w-full">
              <span
                className="text-xs font-semibold truncate"
                style={{ color: 'var(--prism-text-primary)' }}
              >
                {badge.regionLabel}
              </span>
              <span
                className="text-xs font-mono tabular-nums font-bold shrink-0"
                style={{ color: 'var(--prism-text-secondary)' }}
              >
                {badge.metricText}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <SparklineChart
                values={badge.values}
                variant={badge.variant}
                tone={badge.tone}
                width={96}
                height={26}
                showDelta
                ariaLabel={`${badge.regionLabel} trend`}
              />
            </div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
        <div className="min-w-0">
          <ChoroplethMap
            title="Regional Request Volume"
            tone={mode === 'surge' ? 'amber' : 'primary'}
            valueUnit="M"
            height={250}
            regions={data.regions}
            onSelectRegion={(region, sharePct) =>
              setActiveSelection(
                `${region.name}: ${region.value}M req/hr (${sharePct}% global share)${region.detail ? ` · ${region.detail}` : ''}`
              )
            }
          />
        </div>

        <div className="min-w-0">
          <GeoFlowArcMap
            title="Intercontinental Fiber Backbone"
            valueUnit=" Gbps"
            height={250}
            hubs={EDGE_HUBS}
            flows={data.flows}
            onSelectFlow={(flow, origin, dest) =>
              setActiveSelection(
                `${origin.label} → ${dest.label}: ${flow.volume} Gbps${flow.label ? ` (${flow.label})` : ''}`
              )
            }
          />
        </div>
      </section>

      <section className="min-w-0">
        <PointClusterMap
          title="Global PoP Cluster Density"
          defaultZoom={1}
          clusterRadius={52}
          height={260}
          points={EDGE_POP_POINTS}
          onSelectPoint={(pt) =>
            setActiveSelection(
              `Edge PoP ${pt.label} (${pt.category ?? 'Node'}) · ${pt.lat.toFixed(2)}°, ${pt.lng.toFixed(2)}° · Health ${pt.value ?? 100}%`
            )
          }
          onSelectCluster={(pts) =>
            setActiveSelection(
              `Cluster selected with ${pts.length} PoPs: ${pts.map((p) => p.label).join(', ')}`
            )
          }
        />
      </section>

      <footer className="prism-well rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs">
        <Activity
          className="w-4 h-4 shrink-0"
          style={{ color: 'var(--prism-success-main)' }}
          aria-hidden="true"
        />
        <span className="font-medium" style={{ color: 'var(--prism-text-primary)' }}>
          {activeSelection}
        </span>
      </footer>
    </div>
  );
}

const GEOSPATIAL_FULL_CODE = `import { useState } from 'react';
import {
  BadgeStatus, ChoroplethMap, GeoFlowArcMap, PointClusterMap,
  SegmentedControl, SparklineChart,
  type ChoroplethRegion, type GeoFlowArc, type GeoHub, type GeoPoint,
} from '@refractor-ui/core';

type LoadMode = 'steady' | 'surge';

const HUBS: GeoHub[] = [
  { id: 'sfo', label: 'San Francisco', lat: 37.77, lng: -122.42, tone: 'primary' },
  { id: 'nyc', label: 'New York', lat: 40.71, lng: -74.01, tone: 'primary' },
  { id: 'lon', label: 'London', lat: 51.51, lng: -0.13, tone: 'secondary' },
  { id: 'sin', label: 'Singapore', lat: 1.35, lng: 103.82, tone: 'emerald' },
  { id: 'tok', label: 'Tokyo', lat: 35.68, lng: 139.65, tone: 'amber' },
];

const POPS: GeoPoint[] = [
  { id: 'sfo', label: 'San Francisco Core', lat: 37.77, lng: -122.42, category: 'Primary', value: 99, tone: 'primary' },
  { id: 'nyc', label: 'New York Core', lat: 40.71, lng: -74.01, category: 'Primary', value: 98, tone: 'primary' },
  { id: 'lon', label: 'London Docklands', lat: 51.51, lng: -0.13, category: 'Primary', value: 96, tone: 'emerald' },
  { id: 'tok', label: 'Tokyo Otemachi', lat: 35.68, lng: 139.65, category: 'Primary', value: 98, tone: 'amber' },
  { id: 'sin', label: 'Singapore Jurong', lat: 1.35, lng: 103.82, category: 'Edge', value: 94, tone: 'amber' },
];

export function GeospatialNetworkCommand() {
  const [mode, setMode] = useState<LoadMode>('steady');
  const [readout, setReadout] = useState<string>('Select a region, fiber arc, or PoP node.');
  const mult = mode === 'surge' ? 1.8 : 1;

  const regions: ChoroplethRegion[] = [
    { id: 'na', name: 'North America', value: Math.round(168 * mult), detail: '48 PoPs' },
    { id: 'eu', name: 'Europe', value: Math.round(142 * mult), detail: '42 PoPs' },
    { id: 'as', name: 'Asia-Pacific', value: Math.round(184 * mult), detail: '54 PoPs' },
    { id: 'sa', name: 'South America', value: Math.round(48 * mult), detail: '12 PoPs' },
  ];

  const flows: GeoFlowArc[] = [
    { id: 'atl', origin: 'nyc', destination: 'lon', volume: Math.round(580 * mult), label: 'Trans-Atlantic', tone: 'primary' },
    { id: 'pac', origin: 'sfo', destination: 'tok', volume: Math.round(445 * mult), label: 'Trans-Pacific', tone: 'secondary' },
    { id: 'ap', origin: 'tok', destination: 'sin', volume: Math.round(305 * mult), label: 'East Asia Mesh', tone: 'emerald' },
  ];

  return (
    <div className="space-y-4 min-w-0">
      <div className="prism-slab rounded-[22px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">Global Edge Command</h2>
          <BadgeStatus label="182 PoPs Online" tone={mode === 'surge' ? 'warning' : 'online'} />
        </div>
        <SegmentedControl
          value={mode}
          onChange={(v) => { if (v === 'steady' || v === 'surge') setMode(v); }}
          options={[{ value: 'steady', label: 'Steady State' }, { value: 'surge', label: 'Global Surge' }]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="prism-crystal rounded-2xl p-3.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">US-West RTT</span>
          <SparklineChart values={[16.8, 15.9, 14.4, 13.8, 13.2]} tone="emerald" showDelta />
        </div>
        <div className="prism-crystal rounded-2xl p-3.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">EU-Central RTT</span>
          <SparklineChart values={[19.2, 18.4, 17.6, 16.9, 16.4]} tone="secondary" showDelta />
        </div>
        <div className="prism-crystal rounded-2xl p-3.5 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">APAC Volume</span>
          <SparklineChart values={[132, 148, 164, 176, 184]} variant="bar" tone="primary" showDelta />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChoroplethMap title="Regional Volume" valueUnit="M" regions={regions} onSelectRegion={(r, pct) => setReadout(\`\${r.name}: \${r.value}M (\${pct}%)\`)} />
        <GeoFlowArcMap title="Backbone Fiber Arcs" valueUnit=" Gbps" hubs={HUBS} flows={flows} onSelectFlow={(f, o, d) => setReadout(\`\${o.label} → \${d.label}: \${f.volume} Gbps\`)} />
      </div>
      <PointClusterMap title="PoP Cluster Density" points={POPS} onSelectPoint={(pt) => setReadout(\`PoP \${pt.label} (\${pt.lat}°, \${pt.lng}°)\`)} />
      <div className="prism-well rounded-2xl px-4 py-2.5 text-xs font-medium">{readout}</div>
    </div>
  );
}`;

/* -------------------------------------------------------------------------- */
/* Screen 5: A/B Experiment & ML Evaluation Report                            */
/* -------------------------------------------------------------------------- */

type ExperimentVariantKey = 'variant-b' | 'variant-a';

interface ExperimentDataset {
  confidenceBadge: string;
  summaryLine: string;
  latencySamples: number[];
  heatmapCells: HeatmapCell[];
  radarSeries: RadarSeries[];
}

const FRONTIER_MODELS: ScatterPoint[] = [
  { id: 'flash-v2', label: 'Refractor Flash v2', x: 145, y: 88.4, size: 9, group: 'Fast', tone: 'emerald' },
  { id: 'mini-v2', label: 'Refractor Mini v2', x: 215, y: 91.6, size: 16, group: 'Fast', tone: 'emerald' },
  { id: 'pro-v2', label: 'Refractor Pro v2 (B)', x: 380, y: 96.2, size: 34, group: 'Candidate', tone: 'primary' },
  { id: 'ultra-v2', label: 'Refractor Ultra', x: 640, y: 98.7, size: 72, group: 'Reasoning', tone: 'secondary' },
  { id: 'ctrl-a', label: 'Baseline Pro v1 (A)', x: 520, y: 90.1, size: 38, group: 'Control', tone: 'amber' },
  { id: 'legacy', label: 'Legacy v0.9', x: 840, y: 79.4, size: 54, group: 'Legacy', tone: 'rose' },
];

const RENDER_QUARTILES: BoxWhiskerSeries[] = [
  { id: 'flash', label: 'Flash v2', tone: 'emerald', values: [3.2, 4.1, 4.4, 4.8, 5.1, 5.4, 5.9, 6.2, 8.8] },
  { id: 'candidate', label: 'Variant B', tone: 'primary', values: [5.4, 6.1, 6.6, 7.0, 7.4, 7.8, 8.2, 8.9, 12.4] },
  { id: 'control', label: 'Variant A', tone: 'amber', values: [7.8, 8.9, 9.6, 10.4, 11.2, 11.9, 12.8, 14.1, 20.5] },
];

const RADAR_AXES: string[] = [
  'Accuracy',
  'Latency',
  'Calibration',
  'Safety',
  'Cost Eff.',
  'Determinism',
];

const HEATMAP_COHORTS: string[] = ['Code Gen', 'Tool Call', 'RAG Synth', 'SQL Plan'];
const HEATMAP_WINDOWS: string[] = ['00–06h', '06–12h', '12–18h', '18–24h'];

const EXPERIMENT_DATA: Record<ExperimentVariantKey, ExperimentDataset> = {
  'variant-b': {
    confidenceBadge: 'p = 0.002 · +6.1% Lift',
    summaryLine: 'Variant B (Refractor Pro v2) outperforms Control across latency and error density.',
    latencySamples: [
      18, 21, 23, 24, 26, 27, 28, 29, 31, 32, 33, 34, 35, 36, 37, 39, 41, 43, 46, 49, 54, 61, 68,
    ],
    heatmapCells: [
      { row: 0, col: 0, value: 0.4 }, { row: 0, col: 1, value: 0.7 }, { row: 0, col: 2, value: 1.1 }, { row: 0, col: 3, value: 0.6 },
      { row: 1, col: 0, value: 0.3 }, { row: 1, col: 1, value: 0.8 }, { row: 1, col: 2, value: 1.4 }, { row: 1, col: 3, value: 0.9 },
      { row: 2, col: 0, value: 0.5 }, { row: 2, col: 1, value: 0.9 }, { row: 2, col: 2, value: 1.6 }, { row: 2, col: 3, value: 1.0 },
      { row: 3, col: 0, value: 0.2 }, { row: 3, col: 1, value: 0.6 }, { row: 3, col: 2, value: 1.2 }, { row: 3, col: 3, value: 0.7 },
    ],
    radarSeries: [
      { id: 'var-b', label: 'Variant B (Pro v2)', tone: 'primary', values: [96, 92, 95, 98, 91, 94] },
      { id: 'var-a', label: 'Variant A (Control)', tone: 'secondary', values: [90, 78, 84, 92, 82, 85] },
    ],
  },
  'variant-a': {
    confidenceBadge: 'Control Baseline · n = 24,800',
    summaryLine: 'Variant A (Baseline Pro v1) exhibits higher tail latency during peak 12–18h windows.',
    latencySamples: [
      29, 34, 37, 39, 42, 44, 46, 48, 51, 53, 55, 58, 61, 64, 67, 71, 74, 79, 84, 89, 95, 104, 118,
    ],
    heatmapCells: [
      { row: 0, col: 0, value: 1.1 }, { row: 0, col: 1, value: 1.8 }, { row: 0, col: 2, value: 3.1 }, { row: 0, col: 3, value: 2.0 },
      { row: 1, col: 0, value: 0.9 }, { row: 1, col: 1, value: 2.2 }, { row: 1, col: 2, value: 3.8 }, { row: 1, col: 3, value: 2.4 },
      { row: 2, col: 0, value: 1.3 }, { row: 2, col: 1, value: 2.1 }, { row: 2, col: 2, value: 4.2 }, { row: 2, col: 3, value: 2.7 },
      { row: 3, col: 0, value: 0.8 }, { row: 3, col: 1, value: 1.6 }, { row: 3, col: 2, value: 2.9 }, { row: 3, col: 3, value: 1.9 },
    ],
    radarSeries: [
      { id: 'var-a', label: 'Variant A (Control)', tone: 'amber', values: [90, 78, 84, 92, 82, 85] },
      { id: 'legacy', label: 'Legacy v0.9', tone: 'rose', values: [79, 64, 72, 81, 70, 74] },
    ],
  },
};

const VARIANT_OPTIONS: Array<{ value: ExperimentVariantKey; label: string }> = [
  { value: 'variant-b', label: 'Variant B · Candidate' },
  { value: 'variant-a', label: 'Variant A · Control' },
];

const BIN_CHOICES: ReadonlyArray<number> = [6, 8, 12];

function isVariantKey(raw: string): raw is ExperimentVariantKey {
  return raw === 'variant-b' || raw === 'variant-a';
}

function StatisticalExperimentLabScreen() {
  const [variant, setVariant] = useState<ExperimentVariantKey>('variant-b');
  const [binCount, setBinCount] = useState<number>(8);
  const [evalNote, setEvalNote] = useState<string>(
    'Click any Pareto bubble, quartile box, histogram bin, heatmap cell, or radar axis to inspect.'
  );

  const data = EXPERIMENT_DATA[variant];

  return (
    <div className="@container w-full min-w-0 space-y-4">
      <header className="prism-slab rounded-[22px] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="prism-well w-8 h-8 rounded-xl inline-flex items-center justify-center shrink-0">
              <FlaskConical
                className="w-4 h-4 shrink-0"
                style={{ color: 'var(--prism-primary-main)' }}
                aria-hidden="true"
              />
            </span>
            <h4
              className="text-base sm:text-lg font-bold tracking-tight"
              style={{ color: 'var(--prism-text-primary)' }}
            >
              A/B Experiment &amp; ML Evaluation Lab
            </h4>
            <span className="prism-emerald px-2.5 py-0.5 rounded-full text-xs font-mono tabular-nums font-semibold">
              {data.confidenceBadge}
            </span>
          </div>
          <p className="text-xs" style={{ color: 'var(--prism-text-secondary)' }}>
            {data.summaryLine}
          </p>
        </div>

        <SegmentedControl
          ariaLabel="Experiment cohort selector"
          options={VARIANT_OPTIONS}
          value={variant}
          onChange={(next) => {
            if (isVariantKey(next)) {
              setVariant(next);
              setEvalNote(
                next === 'variant-b'
                  ? 'Inspecting Variant B (Refractor Pro v2): median latency reduced by 31.4%.'
                  : 'Inspecting Variant A (Control Baseline): reference cohort for significance testing.'
              );
            }
          }}
        />
      </header>

      <section className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
        <div className="min-w-0">
          <ScatterBubblePlot
            title="Latency vs. Benchmark Quality Frontier"
            xLabel="Latency (ms)"
            yLabel="Eval Score (%)"
            sizeLabel="Params (B)"
            showQuadrants
            height={250}
            points={FRONTIER_MODELS}
            onSelectPoint={(pt) =>
              setEvalNote(
                `Model "${pt.label}": ${pt.x}ms latency · ${pt.y}% quality${pt.size ? ` · ${pt.size}B params` : ''}`
              )
            }
          />
        </div>

        <div className="min-w-0">
          <RadarSpiderChart
            title="Multi-Axis Capability Scorecard"
            axes={RADAR_AXES}
            size={240}
            series={data.radarSeries}
            onSelectAxis={(axisIdx, axisLabel) => {
              const breakdown = data.radarSeries
                .map((s) => `${s.label}: ${s.values[axisIdx] ?? 0}/100`)
                .join(' vs ');
              setEvalNote(`Axis "${axisLabel}" → ${breakdown}`);
            }}
          />
        </div>
      </section>

      <section className="grid grid-cols-1 @3xl:grid-cols-2 gap-4">
        <div className="min-w-0">
          <BoxWhiskerPlot
            title="Frame Render Duration Quartiles"
            valueUnit="ms"
            height={240}
            series={RENDER_QUARTILES}
            onSelectSeries={(ser, stats) =>
              setEvalNote(
                `${ser.label}: Q1 ${stats.q1.toFixed(1)}ms · Median ${stats.median.toFixed(1)}ms · Q3 ${stats.q3.toFixed(1)}ms · ${stats.outliers.length} outlier(s)`
              )
            }
          />
        </div>

        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: 'var(--prism-text-secondary)' }}
            >
              Histogram Resolution
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {BIN_CHOICES.map((bins) => (
                <TagChip
                  key={`bins-${bins}`}
                  label={`${bins} Bins`}
                  selected={binCount === bins}
                  onSelect={() => {
                    setBinCount(bins);
                    setEvalNote(`Re-binned latency histogram into ${bins} equal-width intervals.`);
                  }}
                />
              ))}
            </div>
          </div>

          <HistogramChart
            title={`Latency Distribution (${variant === 'variant-b' ? 'Variant B' : 'Variant A'})`}
            valueUnit="ms"
            binCount={binCount}
            height={210}
            values={data.latencySamples}
            onSelectBin={(bin) =>
              setEvalNote(
                `Histogram bucket ${bin.min.toFixed(1)}–${bin.max.toFixed(1)}ms contains ${bin.count} observations.`
              )
            }
          />
        </div>
      </section>

      <section className="min-w-0">
        <MatrixHeatmap
          title={`Cohort Error Density by Traffic Window (${variant === 'variant-b' ? 'Variant B' : 'Variant A'})`}
          tone={variant === 'variant-b' ? 'primary' : 'rose'}
          valueUnit="%"
          rowLabels={HEATMAP_COHORTS}
          colLabels={HEATMAP_WINDOWS}
          cells={data.heatmapCells}
          onSelectCell={(cell, rowLabel, colLabel) =>
            setEvalNote(
              `Cohort "${rowLabel}" during ${colLabel}: ${cell.value}% error rate (${variant === 'variant-b' ? 'Candidate' : 'Control'}).`
            )
          }
        />
      </section>

      <footer className="prism-well rounded-2xl px-4 py-3 flex items-center gap-2.5 text-xs">
        <FlaskConical
          className="w-4 h-4 shrink-0"
          style={{ color: 'var(--prism-primary-main)' }}
          aria-hidden="true"
        />
        <span className="font-medium" style={{ color: 'var(--prism-text-primary)' }}>
          {evalNote}
        </span>
      </footer>
    </div>
  );
}

const EXPERIMENT_LAB_FULL_CODE = `import { useState } from 'react';
import {
  BoxWhiskerPlot,
  HistogramChart,
  MatrixHeatmap,
  RadarSpiderChart,
  ScatterBubblePlot,
  SegmentedControl,
  TagChip,
  type BoxWhiskerSeries,
  type HeatmapCell,
  type RadarSeries,
  type ScatterPoint,
} from '@refractor-ui/core';

type VariantKey = 'variant-b' | 'variant-a';

const MODELS: ScatterPoint[] = [
  { id: 'flash', label: 'Flash v2', x: 145, y: 88.4, size: 9, group: 'Fast', tone: 'emerald' },
  { id: 'pro-b', label: 'Pro v2 (B)', x: 380, y: 96.2, size: 34, group: 'Candidate', tone: 'primary' },
  { id: 'ctrl-a', label: 'Pro v1 (A)', x: 520, y: 90.1, size: 38, group: 'Control', tone: 'amber' },
  { id: 'ultra', label: 'Ultra', x: 640, y: 98.7, size: 72, group: 'Reasoning', tone: 'secondary' },
];

const QUARTILES: BoxWhiskerSeries[] = [
  { id: 'flash', label: 'Flash v2', tone: 'emerald', values: [3.2, 4.1, 4.8, 5.4, 6.2, 8.8] },
  { id: 'var-b', label: 'Variant B', tone: 'primary', values: [5.4, 6.6, 7.4, 8.2, 8.9, 12.4] },
  { id: 'var-a', label: 'Variant A', tone: 'amber', values: [7.8, 9.6, 11.2, 12.8, 14.1, 20.5] },
];

const RADAR_SERIES: RadarSeries[] = [
  { id: 'b', label: 'Variant B', tone: 'primary', values: [96, 92, 95, 98, 91, 94] },
  { id: 'a', label: 'Variant A', tone: 'secondary', values: [90, 78, 84, 92, 82, 85] },
];

const HEATMAP_B: HeatmapCell[] = [
  { row: 0, col: 0, value: 0.4 }, { row: 0, col: 1, value: 0.7 }, { row: 0, col: 2, value: 1.1 },
  { row: 1, col: 0, value: 0.3 }, { row: 1, col: 1, value: 0.8 }, { row: 1, col: 2, value: 1.4 },
  { row: 2, col: 0, value: 0.5 }, { row: 2, col: 1, value: 0.9 }, { row: 2, col: 2, value: 1.6 },
];

export function StatisticalExperimentLab() {
  const [variant, setVariant] = useState<VariantKey>('variant-b');
  const [binCount, setBinCount] = useState<number>(8);
  const samples = variant === 'variant-b'
    ? [18, 21, 24, 27, 29, 32, 34, 36, 39, 43, 49, 54, 61]
    : [31, 37, 42, 46, 51, 55, 61, 67, 74, 84, 95, 104, 118];

  return (
    <div className="space-y-4 min-w-0">
      <div className="prism-slab rounded-[22px] p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold">A/B Experiment &amp; ML Evaluation Lab</h2>
          <span className="prism-emerald px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold">p = 0.002 · +6.1%</span>
        </div>
        <SegmentedControl
          value={variant}
          onChange={(v) => { if (v === 'variant-b' || v === 'variant-a') setVariant(v); }}
          options={[{ value: 'variant-b', label: 'Variant B' }, { value: 'variant-a', label: 'Variant A' }]}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ScatterBubblePlot title="Latency vs. Quality Frontier" xLabel="Latency (ms)" yLabel="Score (%)" sizeLabel="Params (B)" showQuadrants points={MODELS} />
        <RadarSpiderChart title="Capability Scorecard" axes={['Accuracy', 'Latency', 'Calibration', 'Safety', 'Cost', 'Stability']} series={RADAR_SERIES} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BoxWhiskerPlot title="Frame Render Quartiles" valueUnit="ms" series={QUARTILES} />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {[6, 8, 12].map((b) => (
              <TagChip key={\`bin-\${b}\`} label={\`\${b} Bins\`} selected={binCount === b} onSelect={() => setBinCount(b)} />
            ))}
          </div>
          <HistogramChart title="Latency Distribution" valueUnit="ms" binCount={binCount} values={samples} />
        </div>
      </div>
      <MatrixHeatmap title="Cohort Error Density" valueUnit="%" rowLabels={['Code Gen', 'Tool Call', 'RAG Synth']} colLabels={['00–08h', '08–16h', '16–24h']} cells={HEATMAP_B} />
    </div>
  );
}`;

/* -------------------------------------------------------------------------- */
/* Exported Registry of Analytics, Telemetry & Reports Example Screens        */
/* -------------------------------------------------------------------------- */

export const ANALYTICS_REPORTING_EXAMPLES: ReadonlyArray<ExampleScreenSpec> = [
  {
    id: 'executive-analytics-dashboard',
    title: 'Executive Revenue & Growth Analytics Dashboard',
    domain: 'analytics-reporting',
    domainTitle: 'Analytics, Telemetry & Reports',
    summary:
      'Multi-widget SaaS revenue cockpit with synchronized 7D/30D/90D timeframe switching, 3 optical KPI sparkline tiles, legend-driven MRR tier filtering, channel attribution donut, and dual-axis pipeline conversion analysis.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'SegmentedControl',
      'BadgeStatus',
      'KpiMetricCard',
      'InteractiveLegend',
      'AreaStackedChart',
      'DonutPieChart',
      'ComboDualAxisChart',
      'SecondaryButton',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'Single timeframe SegmentedControl synchronously updates KPI tiles, stacked MRR curves, channel slices, and pipeline conversion bars.',
      'InteractiveLegend toggles and isolates tiers live inside AreaStackedChart with a graceful one-click restore fallback when all series are muted.',
      'Recessed crystal telemetry footer surfaces clicked channel attribution and dual-axis conversion spotlight in tabular numerals.',
    ],
    fullCode: EXECUTIVE_FULL_CODE,
    render: () => <ExecutiveAnalyticsDashboardScreen />,
  },
  {
    id: 'report-view-builder',
    title: 'Quarterly Financial & Operations Report View',
    domain: 'analytics-reporting',
    domainTitle: 'Analytics, Telemetry & Reports',
    summary:
      'Board-ready financial reporting canvas combining fiscal Month/Quarter/Year selection, an audited EBITDA P&L waterfall bridge, departmental KPI attainment bullets, regional revenue pivot cross-tab, and summary export.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'MonthQuarterYearPicker',
      'WaterfallChart',
      'BulletChart',
      'PivotTable',
      'SecondaryButton',
      'BadgeStatus',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Controlled MonthQuarterYearPicker dynamically recalculates EBITDA bridge steps, margin readout, KPI targets, and regional pivot figures.',
      'Interactive audit readout captures running waterfall totals and department target variance percentages on click or keyboard focus.',
      'Formula-safe board pack export trigger surfaces an inline emerald confirmation strip with live closing EBITDA metrics.',
    ],
    fullCode: REPORT_VIEW_FULL_CODE,
    render: () => <ReportViewBuilderScreen />,
  },
  {
    id: 'realtime-telemetry-noc',
    title: 'Real-Time SRE Telemetry & SLA Operations Center',
    domain: 'analytics-reporting',
    domainTitle: 'Analytics, Telemetry & Reports',
    summary:
      'Live infrastructure observability command center pairing an interactive cluster process probe pill, dual GPU/CPU radial gauges, steppable streaming latency monitor, SLA breach annotations, and multi-metric crosshair inspection.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'ProcessStatusPill',
      'TagChip',
      'RadialGauge',
      'LiveTelemetryChart',
      'ChartThresholdMarker',
      'ChartCrosshairTooltip',
    ],
    uxScore: 9.9,
    uxHighlights: [
      'ProcessStatusPill Stop/Retry lifecycle is bidirectionally synced with LiveTelemetryChart pause state and cluster elapsed uptime.',
      'Manual Step sample generation dynamically advances the latency buffer and modulates live GPU and CPU RadialGauge readings.',
      'Cluster TagChip switching reloads regional SLA breach markers, rollout annotations, and multi-series crosshair telemetry.',
    ],
    fullCode: REALTIME_NOC_FULL_CODE,
    render: () => <RealtimeTelemetryNocScreen />,
  },
  {
    id: 'geospatial-network-command',
    title: 'Global Traffic & Geospatial Edge Command',
    domain: 'analytics-reporting',
    domainTitle: 'Analytics, Telemetry & Reports',
    summary:
      'Worldwide CDN and edge backbone telemetry console uniting regional choropleth traffic share, intercontinental fiber flow arcs, zoomable PoP cluster density, and interactive regional latency sparkline badges.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'SegmentedControl',
      'BadgeStatus',
      'SparklineChart',
      'ChoroplethMap',
      'GeoFlowArcMap',
      'PointClusterMap',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Steady State vs. Global Surge mode shifts choropleth load density, fiber Gbps arc weights, and sparkline latency deltas simultaneously.',
      'Unified geospatial readout inspector responds to continent selections, fiber route clicks, PoP cluster expansions, and latency badges.',
      'Container-responsive grid architecture guarantees crisp SVG readability and zero overflow across desktop, tablet, and narrow frames.',
    ],
    fullCode: GEOSPATIAL_FULL_CODE,
    render: () => <GeospatialNetworkCommandScreen />,
  },
  {
    id: 'statistical-experiment-lab',
    title: 'A/B Experiment & ML Evaluation Report',
    domain: 'analytics-reporting',
    domainTitle: 'Analytics, Telemetry & Reports',
    summary:
      'Data science evaluation studio pairing a Pareto latency-vs-quality scatter frontier, multi-axis capability radar scorecard, frame render quartile box plot, re-binnable latency histogram, and cohort error density heatmap.',
    devices: ['web', 'tablet'],
    defaultPreviewFrame: 'web',
    componentsUsed: [
      'SegmentedControl',
      'TagChip',
      'ScatterBubblePlot',
      'RadarSpiderChart',
      'BoxWhiskerPlot',
      'HistogramChart',
      'MatrixHeatmap',
    ],
    uxScore: 9.8,
    uxHighlights: [
      'Variant B vs. Variant A cohort toggle updates histogram latency samples, error-density heatmap cells, radar profiles, and p-value badge.',
      'Interactive histogram resolution TagChips re-bin observations across 6, 8, or 12 intervals without losing inspection context.',
      'Unified statistical inspector reports exact bubble coordinates, Tukey quartiles, bucket counts, heatmap cells, and axis scores.',
    ],
    fullCode: EXPERIMENT_LAB_FULL_CODE,
    render: () => <StatisticalExperimentLabScreen />,
  },
];
