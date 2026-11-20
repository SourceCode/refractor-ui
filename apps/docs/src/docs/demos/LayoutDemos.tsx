import { useMemo, useState } from 'react';
import { Archive, Download, Layers, Sparkles, Trash2 } from 'lucide-react';
import {
  DockablePanel,
  type DockPosition,
  MasonryGrid,
  MasterDetailView,
  SecondaryButton,
  StickyActionBar,
  VirtualizedList,
  WindowSplitter,
} from '@refractor-ui/core';
import { pushToast, useAppDispatch } from '../../system/store';

export interface LayoutDemosProps {
  componentId: string;
}

const MASTER_ITEMS = [
  {
    id: 'spec-optics',
    title: 'Refractive Meniscus Shaders',
    subtitle: 'packages/core/src/refractor.css',
    badge: 'v1.1',
    meta: '98% cov',
    summary:
      'Calibrates top-edge white specular curves, inner bevel depth, and directional warm/cool edge caustics driven exclusively by --prism-* tokens.',
  },
  {
    id: 'spec-theme',
    title: 'Dual MUI + Astryx Theme Engine',
    subtitle: 'packages/core/src/theme/',
    badge: 'Core',
    meta: '5 presets',
    summary:
      'Auto-derives light, dark, WCAG 4.5:1 contrastText, and RGB channel triplets from a single hex input while supporting Astryx defineTheme cascade inheritance.',
  },
  {
    id: 'spec-eslint',
    title: 'Astryx Two-Tier ESLint Plugin',
    subtitle: 'internal/eslint-plugin-refractor/',
    badge: '17 rules',
    meta: 'Strict',
    summary:
      'Enforces React 19 ref-as-prop, BaseProps extension, zero raw color literals, IME composition guards, and zero any/unknown TypeScript strictness.',
  },
  {
    id: 'spec-a11y',
    title: 'Keyboard & Focus Governance',
    subtitle: 'docs/adr/ADR-0006',
    badge: 'WCAG AA',
    meta: '9.9/10',
    summary:
      'Guarantees full keyboard parity for splitters, dockable windows, kanban boards, sortable lists, and node graphs with keyboard-only focus rings.',
  },
];

const MASONRY_CARDS = [
  {
    id: 'm1',
    estimatedHeight: 150,
    title: 'Alabaster Light Lens',
    subtitle: '18px blur · 170% saturation',
    content: 'Clean daylight crystal optics calibrated for matte alabaster backdrops.',
  },
  {
    id: 'm2',
    estimatedHeight: 230,
    title: 'Dichroic Caustic Dispersion',
    subtitle: 'Warm tangerine + sky cyan edge bloom',
    content:
      'Multi-layer box-shadow dispersion reacts live to --prism-caustic-opacity across Subtle, Standard, and Vivid intensities without washing out foreground text contrast.',
  },
  {
    id: 'm3',
    estimatedHeight: 135,
    title: 'Porcelain 3D Thumb',
    subtitle: 'Tactile micro-elevation',
    content: 'Inner specular top highlight paired with soft ambient floor shadow.',
  },
  {
    id: 'm4',
    estimatedHeight: 205,
    title: 'Recessed Frosted Input Well',
    subtitle: 'Guaranteed >= 4.5:1 legibility',
    content:
      'Nesting opaque frosted input chambers inside refractive crystal bezels prevents translucent backgrounds from interfering with typed text.',
  },
  {
    id: 'm5',
    estimatedHeight: 170,
    title: 'MUI Palette Auto-Derivation',
    subtitle: 'Single hex -> full optical ramp',
    content: 'Derives light, dark, contrastText, and RGB triplets mathematically in pure TypeScript.',
  },
  {
    id: 'm6',
    estimatedHeight: 145,
    title: 'Zero any / Zero unknown',
    subtitle: 'Strict TypeScript + AST lint',
    content: 'Every prop, callback, and generic constraint is concretely typed.',
  },
];

export function LayoutDemos({ componentId }: LayoutDemosProps) {
  const dispatch = useAppDispatch();
  const [dockPos, setDockPos] = useState<DockPosition>('right');
  const [panelVisible, setPanelVisible] = useState(true);
  const [selectedMaster, setSelectedMaster] = useState<string | null>('spec-optics');
  const [stickyCount, setStickyCount] = useState(5);

  const virtualRows = useMemo(
    () =>
      Array.from({ length: 12000 }, (_, i) => ({
        id: `row-${i + 1}`,
        index: i + 1,
        token: `--prism-optical-layer-${String(i + 1).padStart(5, '0')}`,
        latencyMs: ((i * 17) % 42) + 1,
      })),
    []
  );

  switch (componentId) {
    case 'window-splitter':
      return (
        <div className="w-full">
          <WindowSplitter
            className="h-64"
            defaultSizes={[36, 64]}
            panes={[
              {
                id: 'explorer',
                label: 'Token Explorer',
                minSize: 20,
                maxSize: 70,
                content: (
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Optical Layers</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Drag the refractive crystal divider or focus it and press ArrowLeft / ArrowRight.
                      Double-click the handle to reset.
                    </p>
                  </div>
                ),
              },
              {
                id: 'canvas',
                label: 'Optical Viewport',
                minSize: 30,
                maxSize: 80,
                content: (
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Live Shader Canvas</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Smooth pointer drag clamping respects pane min/max bounds and preserves clean
                      optical slab geometry at every width.
                    </p>
                  </div>
                ),
              },
            ]}
          />
        </div>
      );

    case 'dockable-panel':
      return (
        <div className="w-full space-y-3">
          {!panelVisible ? (
            <div className="flex justify-center">
              <SecondaryButton size="sm" onClick={() => setPanelVisible(true)}>
                Restore Dockable Panel
              </SecondaryButton>
            </div>
          ) : (
            <div className="relative min-h-[240px] rounded-[24px] border border-dashed border-slate-300/80 dark:border-slate-700/80 p-4 flex items-start justify-end">
              <DockablePanel
                title="Optical Shader Inspector"
                subtitle={`Dock zone: ${dockPos}`}
                dockPosition={dockPos}
                onDockPositionChange={setDockPos}
                onClose={() => setPanelVisible(false)}
              >
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <p>
                    Switch between Left, Bottom, Right, or Pop-Out Floating modes using the crystal
                    header controls. When floating, drag the titlebar freely.
                  </p>
                </div>
              </DockablePanel>
            </div>
          )}
        </div>
      );

    case 'master-detail-view':
      return (
        <div className="w-full">
          <MasterDetailView
            masterTitle="Architecture Specs"
            items={MASTER_ITEMS}
            selectedId={selectedMaster}
            onSelectItem={(item) => setSelectedMaster(item.id)}
            renderDetail={(item) => (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                    {item.title}
                  </h4>
                  <span className="prism-crystal px-2.5 py-0.5 rounded-full text-[11px] font-mono tabular-nums text-slate-700 dark:text-slate-200">
                    {item.meta}
                  </span>
                </div>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  {item.subtitle}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {item.summary}
                </p>
              </div>
            )}
          />
        </div>
      );

    case 'virtualized-list':
      return (
        <div className="w-full max-w-2xl">
          <VirtualizedList
            items={virtualRows}
            itemHeight={46}
            height={280}
            renderItem={(row) => (
              <div className="h-full px-4 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/60 text-xs">
                <span className="font-mono text-slate-800 dark:text-slate-100">{row.token}</span>
                <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  #{row.index} · {row.latencyMs}ms
                </span>
              </div>
            )}
          />
        </div>
      );

    case 'masonry-grid':
      return (
        <div className="w-full">
          <MasonryGrid items={MASONRY_CARDS} columns={3} gapPx={16} />
        </div>
      );

    case 'sticky-action-bar':
      return (
        <div className="w-full space-y-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <SecondaryButton size="sm" onClick={() => setStickyCount((c) => c + 1)}>
              Select +1 Item
            </SecondaryButton>
            <SecondaryButton size="sm" onClick={() => setStickyCount(5)}>
              Reset to 5 Selected
            </SecondaryButton>
          </div>
          <StickyActionBar
            position="inline"
            selectedCount={stickyCount}
            totalCount={12}
            onSelectAll={() => setStickyCount(12)}
            onClearSelection={() => setStickyCount(0)}
            actions={[
              {
                id: 'export',
                label: 'Export',
                tone: 'secondary',
                icon: <Download className="w-3.5 h-3.5" />,
                onClick: () =>
                  dispatch(
                    pushToast({ title: `Exported ${stickyCount} selected items`, tone: 'info' })
                  ),
              },
              {
                id: 'archive',
                label: 'Archive',
                tone: 'cobalt',
                icon: <Archive className="w-3.5 h-3.5" />,
                onClick: () =>
                  dispatch(
                    pushToast({ title: `Archived ${stickyCount} items`, tone: 'emerald' })
                  ),
              },
              {
                id: 'delete',
                label: `Delete ${stickyCount}`,
                tone: 'destructive',
                icon: <Trash2 className="w-3.5 h-3.5" />,
                onClick: () => {
                  dispatch(pushToast({ title: `Deleted ${stickyCount} items`, tone: 'critical' }));
                  setStickyCount(0);
                },
              },
            ]}
          />
        </div>
      );

    default:
      return null;
  }
}
