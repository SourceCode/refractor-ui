import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Grid,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from 'lucide-react';
import {
  Breadcrumbs,
  CommandPalette,
  CommandPaletteItem,
  PrimaryButton,
  SecondaryButton,
  SegmentedControl,
  ToastSnackbar,
} from '../../os';
import { RefractionIntensity } from '../../os/theme/prismTheme';
import {
  dismissToast,
  DocsCategoryFilter,
  pushToast,
  setActiveCategory,
  setCommandPaletteOpen,
  setFocusedComponent,
  setRefraction,
  setSearchQuery,
  setStudioGrid,
  toggleThemeMode,
  useAppDispatch,
  useAppSelector,
} from '../../system/store';
import { ComponentDocCard } from './ComponentDocCard';
import { ComponentLiveDemo } from './ComponentDemos';
import { ReferenceSpecimenBoard } from './ReferenceSpecimenBoard';
import {
  COMPONENT_REGISTRY,
  DOC_CATEGORIES,
  filterComponents,
  getCategoryCounts,
} from './registry';

export const DocsShell: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    themeMode,
    refraction,
    studioGrid,
    activeCategory,
    focusedComponentId,
    searchQuery,
    commandPaletteOpen,
    toasts,
  } = useAppSelector((s) => s.system);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        dispatch(setCommandPaletteOpen(!commandPaletteOpen));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandPaletteOpen, dispatch]);

  const categoryCounts = useMemo(() => getCategoryCounts(COMPONENT_REGISTRY), []);

  const visibleEntries = useMemo(
    () => filterComponents(COMPONENT_REGISTRY, activeCategory, searchQuery),
    [activeCategory, searchQuery]
  );

  const focusedEntry = useMemo(
    () =>
      focusedComponentId
        ? COMPONENT_REGISTRY.find((c) => c.id === focusedComponentId) ?? null
        : null,
    [focusedComponentId]
  );

  const focusedNeighbors = useMemo(() => {
    if (!focusedEntry) return { prev: null, next: null };
    const idx = COMPONENT_REGISTRY.findIndex((c) => c.id === focusedEntry.id);
    return {
      prev: idx > 0 ? COMPONENT_REGISTRY[idx - 1] : null,
      next: idx < COMPONENT_REGISTRY.length - 1 ? COMPONENT_REGISTRY[idx + 1] : null,
    };
  }, [focusedEntry]);

  const commandItems: CommandPaletteItem[] = useMemo(() => {
    const compCommands: CommandPaletteItem[] = COMPONENT_REGISTRY.map((entry) => ({
      id: `cmd-${entry.id}`,
      label: entry.title,
      group: entry.categoryTitle,
      shortcut: `<${entry.exportName} />`,
      onSelect: () => {
        dispatch(setFocusedComponent({ componentId: entry.id, category: entry.category }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    }));

    const sysCommands: CommandPaletteItem[] = [
      {
        id: 'sys-overview',
        label: 'Show All 46 Components & Specimen Overview',
        group: 'Workspace',
        onSelect: () => dispatch(setActiveCategory('overview')),
      },
      {
        id: 'sys-theme',
        label: `Switch to ${themeMode === 'light' ? 'Obsidian Dark' : 'Alabaster Light'} Mode`,
        group: 'Appearance',
        onSelect: () => dispatch(toggleThemeMode()),
      },
      {
        id: 'sys-grid',
        label: studioGrid ? 'Use Smooth Studio Surface' : 'Enable 24px Optical Alignment Grid',
        group: 'Appearance',
        onSelect: () => dispatch(setStudioGrid(!studioGrid)),
      },
    ];

    return [...sysCommands, ...compCommands];
  }, [dispatch, studioGrid, themeMode]);

  const jumpToComponent = (id: string, category: Exclude<DocsCategoryFilter, 'overview'>) => {
    dispatch(setFocusedComponent({ componentId: id, category }));
    setMobileNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 h-16 px-4 sm:px-8 border-b border-slate-300/60 dark:border-slate-800/80 bg-white/75 dark:bg-slate-950/75 backdrop-blur-xl flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Wordmark */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            dispatch(setActiveCategory('overview'));
            dispatch(setSearchQuery(''));
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0"
        >
          Refractor UI
        </a>

        {/* Zone 2: 5 Concise Single-Line Navigation Links */}
        <nav
          aria-label="Primary documentation sections"
          className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300"
        >
          {[
            { id: 'overview' as const, label: 'Overview' },
            { id: 'buttons-actions' as const, label: 'Buttons' },
            { id: 'form-inputs' as const, label: 'Inputs' },
            { id: 'navigation' as const, label: 'Navigation' },
            { id: 'data-display' as const, label: 'Data Display' },
          ].map((nav) => {
            const isCurrent = activeCategory === nav.id && !focusedComponentId;
            return (
              <button
                key={nav.id}
                type="button"
                onClick={() => dispatch(setActiveCategory(nav.id))}
                className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 ${
                  isCurrent
                    ? 'text-slate-900 dark:text-white font-semibold underline decoration-orange-500 decoration-2 underline-offset-8'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {nav.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Header Action (plus mobile menu button on narrow screens) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label="Toggle component sidebar"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="lg:hidden prism-crystal w-10 h-10 rounded-full inline-flex items-center justify-center text-slate-800 dark:text-slate-100 cursor-pointer"
          >
            {mobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <PrimaryButton
            size="sm"
            onClick={() => dispatch(setCommandPaletteOpen(true))}
            aria-label="Search components with Command Palette"
          >
            Search Docs ⌘K
          </PrimaryButton>
        </div>
      </header>

      {/* Workspace Body: Left Documentation Sidebar + Main Viewport */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto flex items-start">
        {/* Left Sidebar Explorer */}
        <aside
          aria-label="Component library explorer"
          className={`${
            mobileNavOpen
              ? 'fixed inset-y-16 left-0 z-40 w-72 bg-slate-100/95 dark:bg-slate-950/95 backdrop-blur-xl shadow-2xl'
              : 'hidden lg:block lg:sticky lg:top-16 lg:w-72 shrink-0'
          } h-[calc(100vh-4rem)] overflow-y-auto border-r border-slate-300/55 dark:border-slate-800/80 p-4 space-y-5`}
        >
          {/* Quick Filter Input */}
          <div className="prism-crystal rounded-full p-1">
            <div className="prism-well rounded-full h-9 px-3 flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <input
                type="search"
                aria-label="Filter component sidebar"
                value={searchQuery}
                onChange={(e) => {
                  dispatch(setSearchQuery(e.target.value));
                  if (focusedComponentId) {
                    dispatch(setFocusedComponent({ componentId: null }));
                  }
                }}
                placeholder="Filter 46 components..."
                className="w-full bg-transparent text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* All Components Overview Link */}
          <div>
            <button
              type="button"
              onClick={() => {
                dispatch(setActiveCategory('overview'));
                setMobileNavOpen(false);
              }}
              className={`w-full px-3.5 py-2 rounded-2xl flex items-center justify-between text-xs font-semibold cursor-pointer transition-all ${
                activeCategory === 'overview' && !focusedComponentId
                  ? 'prism-btn-primary text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-white/60 dark:hover:bg-white/5'
              }`}
            >
              <span className="relative z-10">Specimen &amp; Full Catalog</span>
              <span className="relative z-10 font-mono tabular-nums">46</span>
            </button>
          </div>

          {/* Categorized Component Tree */}
          <div className="space-y-5">
            {DOC_CATEGORIES.map((cat) => {
              const catItems = COMPONENT_REGISTRY.filter(
                (c) =>
                  c.category === cat.id &&
                  (!searchQuery.trim() ||
                    c.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
                    c.exportName.toLowerCase().includes(searchQuery.trim().toLowerCase()))
              );

              if (catItems.length === 0) return null;

              return (
                <div key={cat.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setActiveCategory(cat.id));
                      setMobileNavOpen(false);
                    }}
                    className="w-full px-2 py-1 flex items-center justify-between text-xs font-semibold text-slate-900 dark:text-slate-100 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
                  >
                    <span className="truncate">{cat.title}</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-400 shrink-0">
                      {categoryCounts[cat.id]}
                    </span>
                  </button>

                  <ul className="space-y-0.5 border-l border-slate-300/60 dark:border-slate-800 ml-2 pl-2">
                    {catItems.map((comp) => {
                      const selected = focusedComponentId === comp.id;
                      return (
                        <li key={comp.id}>
                          <button
                            type="button"
                            onClick={() => jumpToComponent(comp.id, comp.category)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors cursor-pointer truncate block ${
                              selected
                                ? 'prism-emerald text-white font-semibold'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                            }`}
                          >
                            {comp.title}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-10 py-6 sm:py-8 space-y-10">
          {/* Workspace Optical Calibration Toolbar */}
          <div className="prism-slab px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-slate-900 dark:text-white">Optical Bench</span>
              <span aria-hidden="true">·</span>
              <span>React 19 + Redux + TypeScript</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">6 Categories / 46 Components</span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <SegmentedControl
                ariaLabel="Refraction dispersion intensity"
                value={refraction}
                onChange={(v) => dispatch(setRefraction(v as RefractionIntensity))}
                options={[
                  { value: 'subtle', label: 'Subtle' },
                  { value: 'standard', label: 'Standard' },
                  { value: 'vivid', label: 'Vivid' },
                ]}
              />

              <button
                type="button"
                aria-label={studioGrid ? 'Disable alignment grid' : 'Enable alignment grid'}
                aria-pressed={studioGrid}
                onClick={() => dispatch(setStudioGrid(!studioGrid))}
                className={`prism-crystal h-9 px-3 rounded-full inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
                  studioGrid
                    ? 'text-orange-600 dark:text-orange-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                aria-label={
                  themeMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'
                }
                onClick={() => dispatch(toggleThemeMode())}
                className="prism-crystal h-9 px-3.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 cursor-pointer whitespace-nowrap"
              >
                {themeMode === 'light' ? (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    <span>Obsidian</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Alabaster</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Focused Single-Component Documentation View */}
          {focusedEntry ? (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <Breadcrumbs
                  items={[
                    { id: 'root', label: 'All Components' },
                    { id: 'cat', label: focusedEntry.categoryTitle },
                    { id: 'curr', label: focusedEntry.title },
                  ]}
                  onNavigate={(crumbId) => {
                    if (crumbId === 'root') {
                      dispatch(setActiveCategory('overview'));
                    } else if (crumbId === 'cat') {
                      dispatch(setActiveCategory(focusedEntry.category));
                    }
                  }}
                />

                <SecondaryButton
                  size="sm"
                  leadingIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  onClick={() => dispatch(setFocusedComponent({ componentId: null }))}
                >
                  Back to Category
                </SecondaryButton>
              </div>

              <ComponentDocCard entry={focusedEntry} isFocusedView>
                <ComponentLiveDemo componentId={focusedEntry.id} />
              </ComponentDocCard>

              {/* Prev / Next Component Pager */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-300/50 dark:border-slate-800">
                {focusedNeighbors.prev ? (
                  <SecondaryButton
                    size="sm"
                    onClick={() =>
                      jumpToComponent(focusedNeighbors.prev!.id, focusedNeighbors.prev!.category)
                    }
                  >
                    ← {focusedNeighbors.prev.title}
                  </SecondaryButton>
                ) : (
                  <span />
                )}

                {focusedNeighbors.next && (
                  <SecondaryButton
                    size="sm"
                    trailingIcon={<ChevronRight className="w-3.5 h-3.5" />}
                    onClick={() =>
                      jumpToComponent(focusedNeighbors.next!.id, focusedNeighbors.next!.category)
                    }
                  >
                    {focusedNeighbors.next.title}
                  </SecondaryButton>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Reference Specimen Board on Overview */}
              {activeCategory === 'overview' && !searchQuery.trim() && <ReferenceSpecimenBoard />}

              {/* Category Filter Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => dispatch(setActiveCategory('overview'))}
                  className={`h-9 px-4 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                    activeCategory === 'overview'
                      ? 'prism-btn-primary text-white'
                      : 'prism-crystal text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="relative z-10">All Categories (46)</span>
                </button>
                {DOC_CATEGORIES.map((cat) => {
                  const active = activeCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => dispatch(setActiveCategory(cat.id))}
                      className={`h-9 px-4 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                        active
                          ? 'prism-btn-primary text-white'
                          : 'prism-crystal text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="relative z-10">
                        {cat.shortLabel} ({categoryCounts[cat.id]})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Categorized Component Documentation Sections */}
              {visibleEntries.length === 0 ? (
                <div className="prism-slab p-10 text-center space-y-3">
                  <p className="text-base font-semibold text-slate-900 dark:text-white">
                    No components matched &ldquo;{searchQuery}&rdquo;
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Clear the search filter to browse all 46 optical UI primitives.
                  </p>
                  <PrimaryButton
                    size="sm"
                    onClick={() => {
                      dispatch(setSearchQuery(''));
                      dispatch(setActiveCategory('overview'));
                    }}
                  >
                    Reset Filter
                  </PrimaryButton>
                </div>
              ) : (
                <div className="space-y-12">
                  {DOC_CATEGORIES.map((cat) => {
                    const itemsInCat = visibleEntries.filter((e) => e.category === cat.id);
                    if (itemsInCat.length === 0) return null;

                    return (
                      <div key={cat.id} className="space-y-6">
                        <div className="border-b border-slate-300/60 dark:border-slate-800 pb-3">
                          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {cat.title}
                          </h2>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                            {cat.description}
                          </p>
                        </div>

                        <div className="space-y-8">
                          {itemsInCat.map((entry) => (
                            <ComponentDocCard
                              key={entry.id}
                              entry={entry}
                              onFocusSingle={(id) => jumpToComponent(id, entry.category)}
                            >
                              <ComponentLiveDemo componentId={entry.id} />
                            </ComponentDocCard>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Quiet Editorial Footer */}
          <footer className="pt-8 pb-6 border-t border-slate-300/55 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span>Refractor Optical Glass UI Kit · 46 Accessible React &amp; TypeScript Primitives</span>
            <button
              type="button"
              onClick={() => {
                dispatch(
                  pushToast({
                    title: 'Copied barrel import path',
                    description: "import * as Refractor from '@/src/os';",
                    tone: 'emerald',
                  })
                );
              }}
              className="hover:text-slate-900 dark:hover:text-white underline underline-offset-4 cursor-pointer"
            >
              Copy Library Barrel Import
            </button>
          </footer>
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onClose={() => dispatch(setCommandPaletteOpen(false))}
        items={commandItems}
      />

      {/* Global Live Corner Toast Queue */}
      {toasts.length > 0 && (
        <div
          aria-label="Notifications"
          className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2.5 pointer-events-none"
        >
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastSnackbar
                title={t.title}
                description={t.description}
                tone={t.tone}
                onDismiss={() => dispatch(dismissToast(t.id))}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
