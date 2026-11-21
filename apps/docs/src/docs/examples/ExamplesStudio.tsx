import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  LayoutGrid,
  Monitor,
  Search,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@refractor-ui/core';
import {
  pushToast,
  setFocusedComponent,
  useAppDispatch,
  useAppSelector,
} from '../../system/store';
import { COMPONENT_REGISTRY } from '../registry';
import {
  EXAMPLE_DOMAINS,
  type ExampleDeviceTarget,
  type ExampleDomainCategory,
  type ExampleScreenSpec,
} from './types';

export interface ExamplesStudioProps {
  examples: ReadonlyArray<ExampleScreenSpec>;
  activeExampleId: string | null;
  onSelectExample: (exampleId: string | null) => void;
}

type DeviceFilter = 'all' | ExampleDeviceTarget;
type DomainFilter = 'all' | ExampleDomainCategory;

const DEVICE_LABELS: Record<ExampleDeviceTarget, string> = {
  web: 'Web Desktop',
  tablet: 'Tablet (768px)',
  mobile: 'Mobile (390px)',
};

const DEVICE_BADGE_LABELS: Record<ExampleDeviceTarget, string> = {
  web: 'Web',
  tablet: 'Tablet',
  mobile: 'Mobile',
};

function renderDeviceIcon(target: ExampleDeviceTarget) {
  if (target === 'web') return <Monitor className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  if (target === 'tablet') return <Tablet className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
  return <Smartphone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />;
}

interface ExampleCardViewerProps {
  example: ExampleScreenSpec;
  isFocused?: boolean;
  onOpenFocused?: (id: string) => void;
}

function ExampleCardViewer({
  example,
  isFocused = false,
  onOpenFocused,
}: ExampleCardViewerProps) {
  const dispatch = useAppDispatch();
  const studioGrid = useAppSelector((s) => s.system.studioGrid);
  const [viewMode, setViewMode] = useState<'preview' | 'code'>('preview');
  const [frame, setFrame] = useState<ExampleDeviceTarget>(example.defaultPreviewFrame);
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(example.fullCode);
    } catch {
      // Clipboard fallback when running in restricted permissions
    }
    setCopied(true);
    dispatch(
      pushToast({
        title: `Copied ${example.title} TSX`,
        description: `${example.componentsUsed.length} Refractor primitives composed`,
        tone: 'emerald',
      })
    );
    window.setTimeout(() => setCopied(false), 1800);
  };

  const handleJumpToComponent = (exportName: string) => {
    const match = COMPONENT_REGISTRY.find((c) => c.exportName === exportName);
    if (match) {
      dispatch(setFocusedComponent({ componentId: match.id, category: match.category }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const frameWrapperClass =
    frame === 'mobile'
      ? 'w-full max-w-[390px] mx-auto rounded-[28px] border-2 border-slate-400/50 dark:border-slate-600/70 p-2.5 sm:p-3 bg-white/50 dark:bg-slate-950/60 shadow-xl'
      : frame === 'tablet'
        ? 'w-full max-w-[768px] mx-auto rounded-[26px] border-2 border-slate-400/45 dark:border-slate-600/65 p-3 sm:p-4 bg-white/40 dark:bg-slate-950/50 shadow-lg'
        : 'w-full min-w-0';

  return (
    <article
      id={`example-${example.id}`}
      data-testid={`example-screen-${example.id}`}
      className="scroll-mt-24 border border-slate-300/65 dark:border-slate-800 rounded-[24px] bg-white/45 dark:bg-slate-900/45 overflow-hidden"
    >
      <div className="px-4 sm:px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 max-w-2xl min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{example.domainTitle}</span>
              <span aria-hidden="true">·</span>
              <span className="prism-emerald px-2 py-0.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1">
                <Star className="w-3 h-3" aria-hidden="true" />
                <span>{example.uxScore.toFixed(1)}/10 UX</span>
              </span>
              {example.devices.map((dev) => (
                <span
                  key={dev}
                  className="prism-crystal px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1"
                >
                  {renderDeviceIcon(dev)}
                  <span>{DEVICE_BADGE_LABELS[dev]}</span>
                </span>
              ))}
            </div>

            <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
              {onOpenFocused && !isFocused ? (
                <button
                  type="button"
                  onClick={() => onOpenFocused(example.id)}
                  className="hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-left cursor-pointer"
                >
                  {example.title}
                </button>
              ) : (
                example.title
              )}
            </h3>

            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {example.summary}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div
              role="group"
              aria-label={`Device viewport frame for ${example.title}`}
              className="prism-crystal p-1 rounded-full inline-flex items-center gap-0.5"
            >
              {(['web', 'tablet', 'mobile'] as const).map((target) => {
                const active = frame === target;
                return (
                  <button
                    key={target}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${DEVICE_LABELS[target]} frame`}
                    onClick={() => {
                      setFrame(target);
                      setViewMode('preview');
                    }}
                    className={`h-8 px-2.5 rounded-full text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-all ${
                      active
                        ? 'prism-well text-slate-900 dark:text-white font-semibold'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {renderDeviceIcon(target)}
                    <span className="hidden sm:inline">{DEVICE_BADGE_LABELS[target]}</span>
                  </button>
                );
              })}
            </div>

            <div
              role="tablist"
              aria-label={`${example.title} view mode`}
              className="prism-crystal p-1 rounded-full inline-flex items-center gap-0.5"
            >
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'preview'}
                onClick={() => setViewMode('preview')}
                className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'preview'
                    ? 'prism-well text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'code'}
                onClick={() => setViewMode('code')}
                className={`h-8 px-3 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'code'
                    ? 'prism-well text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Full TSX</span>
              </button>
            </div>

            <button
              type="button"
              aria-label={`Copy ${example.title} full TSX code`}
              onClick={handleCopyCode}
              className="prism-crystal h-10 w-10 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 cursor-pointer"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mr-1">
            Primitives:
          </span>
          {example.componentsUsed.map((comp) => (
            <button
              key={comp}
              type="button"
              onClick={() => handleJumpToComponent(comp)}
              className="prism-well hover:brightness-105 px-2 py-0.5 rounded-full font-mono text-[11px] text-slate-700 dark:text-slate-200 cursor-pointer transition-all"
            >
              {comp}
            </button>
          ))}
        </div>
      </div>

      {viewMode === 'preview' ? (
        <div
          data-preview-frame={frame}
          className={`${
            studioGrid ? 'prism-studio-grid' : 'prism-studio-surface'
          } p-3.5 sm:p-6 overflow-x-auto`}
        >
          <div className={frameWrapperClass}>
            {frame !== 'web' ? (
              <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-slate-300/45 dark:border-slate-700/60 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  {renderDeviceIcon(frame)}
                  <span>{DEVICE_LABELS[frame]}</span>
                </span>
                <span>9:41 · 5G</span>
              </div>
            ) : null}
            <div className="w-full min-w-0">{example.render()}</div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-950 text-slate-100 p-4 sm:p-5 overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 mb-3 font-mono">
            <span>{example.id}.tsx · Complete Standalone React 19 Example</span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="prism-crystal h-7 px-3 rounded-full inline-flex items-center gap-1.5 text-[11px] font-sans font-semibold text-slate-900 dark:text-white cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Full TSX'}</span>
            </button>
          </div>
          <pre className="text-xs font-mono leading-relaxed text-sky-200">
            <code>{example.fullCode}</code>
          </pre>
        </div>
      )}
    </article>
  );
}

export function ExamplesStudio({
  examples,
  activeExampleId,
  onSelectExample,
}: ExamplesStudioProps) {
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>('all');
  const [domainFilter, setDomainFilter] = useState<DomainFilter>('all');
  const [query, setQuery] = useState('');

  const focusedExample = useMemo(
    () => (activeExampleId ? (examples.find((ex) => ex.id === activeExampleId) ?? null) : null),
    [activeExampleId, examples]
  );

  const focusedNeighbors = useMemo(() => {
    if (!focusedExample) return { prev: null, next: null };
    const idx = examples.findIndex((ex) => ex.id === focusedExample.id);
    return {
      prev: idx > 0 ? (examples[idx - 1] ?? null) : null,
      next: idx < examples.length - 1 ? (examples[idx + 1] ?? null) : null,
    };
  }, [examples, focusedExample]);

  const filteredExamples = useMemo(() => {
    const q = query.trim().toLowerCase();
    return examples.filter((ex) => {
      const matchesDevice = deviceFilter === 'all' || ex.devices.includes(deviceFilter);
      const matchesDomain = domainFilter === 'all' || ex.domain === domainFilter;
      const matchesQuery =
        !q ||
        ex.title.toLowerCase().includes(q) ||
        ex.summary.toLowerCase().includes(q) ||
        ex.domainTitle.toLowerCase().includes(q) ||
        ex.componentsUsed.some((c) => c.toLowerCase().includes(q));
      return matchesDevice && matchesDomain && matchesQuery;
    });
  }, [deviceFilter, domainFilter, examples, query]);

  const meanUxScore = useMemo(() => {
    if (examples.length === 0) return '0.00';
    const sum = examples.reduce((acc, ex) => acc + ex.uxScore, 0);
    return (sum / examples.length).toFixed(2);
  }, [examples]);

  if (focusedExample) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Example Screen Showcase · {focusedExample.domainTitle}
            </p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              {focusedExample.title}
            </h1>
          </div>

          <SecondaryButton
            size="sm"
            leadingIcon={<ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />}
            onClick={() => onSelectExample(null)}
          >
            All {examples.length} Example Screens
          </SecondaryButton>
        </div>

        <ExampleCardViewer example={focusedExample} isFocused />

        <div className="prism-slab p-4 sm:p-5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              UX/UI Quality Director Notes
            </h2>
            <span className="prism-emerald px-2.5 py-0.5 rounded-full text-xs font-semibold">
              Score: {focusedExample.uxScore.toFixed(1)} / 10
            </span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
            {focusedExample.uxHighlights.map((highlight) => (
              <li key={highlight} className="prism-well rounded-xl px-3 py-2">
                {highlight}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-300/50 dark:border-slate-800">
          {focusedNeighbors.prev ? (
            <SecondaryButton
              size="sm"
              className="max-w-full"
              onClick={() => {
                onSelectExample(focusedNeighbors.prev!.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span className="truncate">← {focusedNeighbors.prev.title}</span>
            </SecondaryButton>
          ) : (
            <span />
          )}

          {focusedNeighbors.next ? (
            <SecondaryButton
              size="sm"
              className="max-w-full"
              trailingIcon={<ChevronRight className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
              onClick={() => {
                onSelectExample(focusedNeighbors.next!.id);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span className="truncate">{focusedNeighbors.next.title}</span>
            </SecondaryButton>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="prism-slab p-5 sm:p-8 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span>Production Application Templates</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
              {examples.length} Interactive Example Screens — Web, Tablet &amp; Mobile
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Full end-to-end product screens composed exclusively from{' '}
              <code className="font-mono">@refractor-ui/core</code> primitives — spanning auth,
              analytics, reports, AI chat, autonomous workflows, code editing, product catalogs,
              forms, creative media, and mobile apps. Toggle live <strong>Web</strong>,{' '}
              <strong>Tablet</strong>, and <strong>Mobile</strong> frames or copy the complete TSX.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
            <div className="prism-well rounded-2xl px-3.5 py-2.5 text-center">
              <div className="text-lg font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                {examples.length}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Screens</div>
            </div>
            <div className="prism-well rounded-2xl px-3.5 py-2.5 text-center">
              <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                {meanUxScore}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Mean UX</div>
            </div>
            <div className="prism-well rounded-2xl px-3.5 py-2.5 text-center">
              <div className="text-lg font-bold font-mono tabular-nums text-slate-950 dark:text-white">
                3
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Form Factors</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="prism-crystal rounded-full p-1 flex-1">
            <div className="prism-well rounded-full h-9 px-3.5 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
              <input
                type="search"
                aria-label="Filter example screens"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search screens (login, analytics, AI chat, code, product, mobile)..."
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div
            role="group"
            aria-label="Filter example screens by device form factor"
            className="prism-crystal p-1 rounded-full inline-flex items-center gap-1 overflow-x-auto max-w-full"
          >
            {(
              [
                { id: 'all', label: 'All Devices' },
                { id: 'web', label: 'Web' },
                { id: 'tablet', label: 'Tablet' },
                { id: 'mobile', label: 'Mobile' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={deviceFilter === opt.id}
                onClick={() => setDeviceFilter(opt.id)}
                className={`h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                  deviceFilter === opt.id
                    ? 'prism-btn-primary text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="relative z-10">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div
          aria-label="Filter example screens by domain"
          className="flex flex-nowrap overflow-x-auto pb-2 sm:flex-wrap sm:overflow-visible sm:pb-0 items-center gap-2 -mx-1 px-1"
        >
          <button
            type="button"
            onClick={() => setDomainFilter('all')}
            className={`h-8 px-3.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
              domainFilter === 'all'
                ? 'prism-btn-primary text-white'
                : 'prism-crystal text-slate-700 dark:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 relative z-10" aria-hidden="true" />
            <span className="relative z-10">All Domains ({examples.length})</span>
          </button>

          {EXAMPLE_DOMAINS.map((dom) => {
            const count = examples.filter((e) => e.domain === dom.id).length;
            const active = domainFilter === dom.id;
            return (
              <button
                key={dom.id}
                type="button"
                onClick={() => setDomainFilter(dom.id)}
                className={`h-8 px-3.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'prism-btn-primary text-white'
                    : 'prism-crystal text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="relative z-10">
                  {dom.shortLabel} ({count})
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {filteredExamples.length === 0 ? (
        <div className="prism-slab p-10 text-center space-y-3">
          <p className="text-base font-semibold text-slate-900 dark:text-white">
            No example screens matched your filter
          </p>
          <PrimaryButton
            size="sm"
            onClick={() => {
              setQuery('');
              setDeviceFilter('all');
              setDomainFilter('all');
            }}
          >
            Reset Filters
          </PrimaryButton>
        </div>
      ) : (
        <div className="space-y-10">
          {EXAMPLE_DOMAINS.map((dom) => {
            const itemsInDom = filteredExamples.filter((ex) => ex.domain === dom.id);
            if (itemsInDom.length === 0) return null;

            return (
              <div key={dom.id} className="space-y-5">
                <div className="border-b border-slate-300/60 dark:border-slate-800 pb-3">
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {dom.title}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                    {dom.description}
                  </p>
                </div>

                <div className="space-y-8">
                  {itemsInDom.map((example) => (
                    <ExampleCardViewer
                      key={example.id}
                      example={example}
                      onOpenFocused={(id) => {
                        onSelectExample(id);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
