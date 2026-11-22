import { useMemo, useState } from 'react';
import { RotateCcw, Search, Sparkles } from 'lucide-react';
import {
  BadgeStatus,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  ToggleSwitch,
  type ThemeCollectionCategory,
  type ThemeMode,
} from '@refractor-ui/core';
import {
  ALL_THEME_ENTRIES,
  getThemeEntryById,
  listThemes,
  THEME_CATEGORIES,
} from '@refractor-ui/themes';
import {
  pushToast,
  resetCustomPalette,
  setThemePreset,
  useAppDispatch,
  useAppSelector,
} from '../system/store';

export function ThemeGallerySection() {
  const dispatch = useAppDispatch();
  const activePreset = useAppSelector((s) => s.system.themePreset);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ThemeCollectionCategory | 'all'>('all');
  const [modeFilter, setModeFilter] = useState<ThemeMode | 'all'>('all');
  const [specimenToggle, setSpecimenToggle] = useState(true);
  const [specimenInput, setSpecimenInput] = useState('Refractor Multi-Material');

  const activeEntry = useMemo(
    () => (activePreset === 'custom' ? undefined : getThemeEntryById(activePreset)),
    [activePreset]
  );

  const visibleThemes = useMemo(
    () =>
      listThemes({
        category,
        mode: modeFilter,
        query,
      }),
    [category, modeFilter, query]
  );

  return (
    <div className="space-y-6">
      {/* Live Transformation Specimen Preview */}
      <div className="prism-slab p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Live Transformation Specimen</span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white truncate">
              {activeEntry ? `${activeEntry.name} (${activeEntry.id})` : 'Custom Studio Theme'}
            </h2>
            {activeEntry ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5 text-[11px] font-mono">
                <span className="prism-crystal px-2.5 py-0.5 rounded-full">
                  material: {activeEntry.material}
                </span>
                <span className="prism-crystal px-2.5 py-0.5 rounded-full">
                  fx: {activeEntry.wallpaperOverlay}
                </span>
                <span className="prism-crystal px-2.5 py-0.5 rounded-full">
                  mode: {activeEntry.mode}
                </span>
              </div>
            ) : null}
          </div>

          {activePreset !== 'alabaster' ? (
            <SecondaryButton
              size="sm"
              leadingIcon={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
              onClick={() => {
                dispatch(resetCustomPalette());
                dispatch(pushToast({ title: 'Restored Alabaster Light optical default', tone: 'info' }));
              }}
            >
              Reset to Alabaster
            </SecondaryButton>
          ) : null}
        </div>

        <div className="prism-crystal rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <PrimaryButton
            size="sm"
            onClick={() =>
              dispatch(
                pushToast({
                  title: `Active theme: ${activeEntry?.name ?? 'Custom Studio'}`,
                  tone: 'emerald',
                })
              )
            }
          >
            Primary Action
          </PrimaryButton>
          <SecondaryButton size="sm">Secondary</SecondaryButton>
          <BadgeStatus tone="online" label="WCAG AA Verified" />
          <ToggleSwitch
            checked={specimenToggle}
            onChange={setSpecimenToggle}
            label="Live FX"
          />
          <div className="w-full sm:flex-1 sm:min-w-[240px] max-w-sm">
            <TextInput
              aria-label="Theme specimen input"
              value={specimenInput}
              onChange={(e) => setSpecimenInput(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="prism-slab p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="prism-well rounded-xl px-3 py-2 flex items-center gap-2 flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <input
              type="search"
              aria-label="Search 69 themes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search all ${ALL_THEME_ENTRIES.length} themes by name, material, FX, or font...`}
              className="w-full min-w-0 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div
            role="group"
            aria-label="Filter themes by color mode"
            className="flex items-center gap-1.5 shrink-0"
          >
            {(['all', 'light', 'dark'] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={modeFilter === m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize cursor-pointer prism-focus-ring ${
                  modeFilter === m
                    ? 'prism-btn-primary'
                    : 'prism-crystal text-slate-700 dark:text-slate-200'
                }`}
              >
                <span className="relative z-10">{m}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter themes by collection">
          <button
            type="button"
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer prism-focus-ring ${
              category === 'all'
                ? 'prism-btn-primary'
                : 'prism-crystal text-slate-700 dark:text-slate-200'
            }`}
          >
            <span className="relative z-10">All ({ALL_THEME_ENTRIES.length})</span>
          </button>
          {THEME_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={category === cat.id}
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer prism-focus-ring ${
                category === cat.id
                  ? 'prism-btn-primary'
                  : 'prism-crystal text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="relative z-10">{cat.shortLabel}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 69-Theme Responsive Grid */}
      <div
        data-testid="theme-gallery-grid"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {visibleThemes.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              data-theme-card={preset.id}
              aria-pressed={active}
              onClick={() => {
                dispatch(setThemePreset(preset.id));
                dispatch(
                  pushToast({
                    title: `Activated ${preset.name}`,
                    description: `${preset.material} · ${preset.wallpaperOverlay} · ${preset.mode}`,
                    tone: 'emerald',
                  })
                );
              }}
              className={`prism-slab prism-focus-ring p-4 text-left space-y-3 cursor-pointer transition-transform duration-150 min-w-0 ${
                active ? 'ring-2 ring-[var(--prism-primary-main)]' : 'hover:-translate-y-0.5'
              }`}
            >
              {/* Authentic Wallpaper & Swatch Strip */}
              <div
                aria-hidden="true"
                className="h-14 w-full rounded-xl border border-black/15 p-2 flex items-end justify-between gap-2 overflow-hidden"
                style={{ background: preset.wallpaper }}
              >
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/55 text-white backdrop-blur-sm">
                  {preset.material}
                  {preset.wallpaperOverlay !== 'none' ? ` · ${preset.wallpaperOverlay}` : ''}
                </span>
                <span className="inline-flex items-center gap-1">
                  {(
                    [
                      { role: 'primary', hex: preset.swatches[0] },
                      { role: 'accent', hex: preset.swatches[1] },
                      { role: 'surface', hex: preset.swatches[2] },
                      { role: 'ink', hex: preset.swatches[3] },
                    ] as const
                  ).map((swatch) => (
                    <span
                      key={`${preset.id}-${swatch.role}`}
                      className="w-3.5 h-3.5 rounded-full border border-white/85 shadow-sm"
                      style={{ backgroundColor: swatch.hex }}
                    />
                  ))}
                </span>
              </div>

              <div className="space-y-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-sm font-semibold text-slate-900 dark:text-white truncate"
                    style={{ fontFamily: preset.fontFamily }}
                  >
                    {preset.name}
                  </span>
                  {active ? (
                    <span className="prism-emerald px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 shrink-0">
                      {preset.mode}
                    </span>
                  )}
                </div>
                <code className="block text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate">
                  {preset.id}
                </code>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                  {preset.description}
                </p>
              </div>
            </button>
          );
        })}

        {visibleThemes.length === 0 ? (
          <div className="col-span-full prism-slab p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              No themes matched &ldquo;{query}&rdquo;
            </p>
            <SecondaryButton
              size="sm"
              onClick={() => {
                setQuery('');
                setCategory('all');
                setModeFilter('all');
              }}
            >
              Reset Theme Filters
            </SecondaryButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
