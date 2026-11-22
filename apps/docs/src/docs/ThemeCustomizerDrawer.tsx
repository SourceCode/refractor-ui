import { useMemo, useState } from 'react';
import { Check, Copy, Palette, RotateCcw, Search, Sparkles } from 'lucide-react';
import {
  PrimaryButton,
  RangeSlider,
  SecondaryButton,
  SegmentedControl,
  SlideOverSheet,
  ToggleSwitch,
  type RefractionIntensity,
  type ThemeCollectionCategory,
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
  setCustomizerOpen,
  setRefraction,
  setThemeMode,
  setThemePreset,
  updateCustomPalette,
  useAppDispatch,
  useAppSelector,
} from '../system/store';

export function ThemeCustomizerDrawer() {
  const dispatch = useAppDispatch();
  const { customizerOpen, themePreset, themeMode, refraction, customPalette } = useAppSelector(
    (s) => s.system
  );
  const [copied, setCopied] = useState(false);
  const [themeQuery, setThemeQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<ThemeCollectionCategory | 'all'>('all');

  const activeEntry = useMemo(
    () => (themePreset === 'custom' ? undefined : getThemeEntryById(themePreset)),
    [themePreset]
  );

  const filteredThemes = useMemo(
    () =>
      listThemes({
        category: activeCategory,
        query: themeQuery,
      }),
    [activeCategory, themeQuery]
  );

  const generatedSnippet =
    activeEntry && activeEntry.category !== 'optical-glass'
      ? `import { PrismThemeProvider } from '@refractor-ui/core';
import { getThemeById } from '@refractor-ui/themes';

const theme = getThemeById('${activeEntry.id}');

export function App() {
  return (
    <PrismThemeProvider theme={theme} loadFonts>
      {/* All 314 components transform to ${activeEntry.name} (${activeEntry.material}) */}
    </PrismThemeProvider>
  );
}`
      : `import { createPrismTheme, PrismThemeProvider } from '@refractor-ui/core';

const theme = createPrismTheme({
  palette: {
    mode: '${themeMode}',
    primary: { main: '${customPalette.primaryMain}' },
    secondary: { main: '${customPalette.secondaryMain}' },
    success: { main: '${customPalette.successMain}' },
    info: { main: '${customPalette.infoMain}' },
  },
  shape: { slabRadius: ${customPalette.slabRadius} },
  optics: {
    refraction: '${refraction}',
    blurPx: ${customPalette.blurPx},
    specularHighlight: ${String(customPalette.specularHighlight)},
  },
});`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedSnippet);
    } catch {
      // Clipboard may be unavailable in restricted contexts
    }
    setCopied(true);
    dispatch(pushToast({ title: 'Copied theme configuration snippet', tone: 'emerald' }));
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SlideOverSheet
      open={customizerOpen}
      mode="right"
      title="Multi-Material Theme Studio"
      subtitle={`${ALL_THEME_ENTRIES.length} full-transformation themes (Optical Glass + 63 WebOS-v3)`}
      onClose={() => dispatch(setCustomizerOpen(false))}
    >
      <div className="space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Theme Collection ({filteredThemes.length} / {ALL_THEME_ENTRIES.length})</span>
            </div>
            {activeEntry ? (
              <span className="prism-crystal px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold text-slate-700 dark:text-slate-200">
                {activeEntry.material} · {activeEntry.wallpaperOverlay}
              </span>
            ) : null}
          </div>

          <div className="prism-well rounded-xl px-3 py-2 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" aria-hidden="true" />
            <input
              type="search"
              aria-label="Filter 68 themes"
              value={themeQuery}
              onChange={(e) => setThemeQuery(e.target.value)}
              placeholder="Search 68 themes (Win95, Mica, Nord)..."
              className="w-full min-w-0 bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Theme collection categories">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              aria-pressed={activeCategory === 'all'}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all prism-focus-ring ${
                activeCategory === 'all'
                  ? 'prism-btn-primary'
                  : 'prism-crystal text-slate-700 dark:text-slate-200'
              }`}
            >
              <span className="relative z-10">All ({ALL_THEME_ENTRIES.length})</span>
            </button>
            {THEME_CATEGORIES.map((cat) => {
              const selected = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  aria-pressed={selected}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium cursor-pointer transition-all prism-focus-ring ${
                    selected
                      ? 'prism-btn-primary'
                      : 'prism-crystal text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span className="relative z-10">{cat.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {filteredThemes.map((preset) => {
              const active = themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    dispatch(setThemePreset(preset.id));
                    dispatch(
                      pushToast({
                        title: `Activated ${preset.name}`,
                        description: `${preset.material} material · ${preset.mode} mode`,
                        tone: 'emerald',
                      })
                    );
                  }}
                  style={active ? { color: 'var(--prism-primary-contrast)' } : undefined}
                  className={`p-2 rounded-2xl text-left cursor-pointer transition-transform duration-150 prism-focus-ring space-y-1.5 ${
                    active
                      ? 'prism-btn-primary'
                      : 'prism-crystal text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className="h-5 w-full rounded-lg border border-black/15 relative z-10 flex items-center justify-end gap-1 px-1.5"
                    style={{ background: preset.wallpaper }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/80"
                      style={{ backgroundColor: preset.swatches[0] }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/80"
                      style={{ backgroundColor: preset.swatches[1] }}
                    />
                  </div>
                  <div
                    className="relative z-10 flex items-center justify-between gap-1"
                    style={active ? { color: 'var(--prism-primary-contrast)' } : undefined}
                  >
                    <span className="text-[11px] font-semibold truncate">{preset.name}</span>
                    <span className="text-[9px] font-mono opacity-85 shrink-0">
                      {preset.material}
                    </span>
                  </div>
                </button>
              );
            })}
            {filteredThemes.length === 0 ? (
              <div className="col-span-2 prism-well rounded-xl p-4 text-center text-xs text-slate-500">
                No themes match &ldquo;{themeQuery}&rdquo;.
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Surface Mode Override</span>
          </div>
          <SegmentedControl
            ariaLabel="Theme color mode"
            value={themeMode}
            onChange={(v) => dispatch(setThemeMode(v === 'dark' ? 'dark' : 'light'))}
            options={[
              { value: 'light', label: 'Light Mode' },
              { value: 'dark', label: 'Dark Mode' },
            ]}
          />
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Custom Optical Palette Tokens (Auto-Derives Shades &amp; Contrast)
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: 'primaryMain', label: 'Primary' },
                { key: 'secondaryMain', label: 'Secondary' },
                { key: 'successMain', label: 'Emerald / Success' },
                { key: 'infoMain', label: 'Cobalt / Info' },
              ] as const
            ).map((field) => (
              <label
                key={field.key}
                className="prism-well rounded-2xl px-3 py-2 flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="min-w-0">
                  <span className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                    {field.label}
                  </span>
                  <span className="block text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {customPalette[field.key]}
                  </span>
                </span>
                <input
                  type="color"
                  aria-label={`${field.label} color`}
                  value={customPalette[field.key]}
                  onChange={(e) =>
                    dispatch(updateCustomPalette({ [field.key]: e.target.value.toUpperCase() }))
                  }
                  className="w-8 h-8 rounded-xl border border-white/70 bg-transparent cursor-pointer shrink-0"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Refraction Dispersion &amp; Geometry
          </div>
          <SegmentedControl
            ariaLabel="Theme refraction intensity"
            value={refraction}
            onChange={(v) => dispatch(setRefraction(v as RefractionIntensity))}
            options={[
              { value: 'subtle', label: 'Subtle' },
              { value: 'standard', label: 'Standard' },
              { value: 'vivid', label: 'Vivid' },
            ]}
          />
          <RangeSlider
            label="Backdrop Blur Radius"
            min={0}
            max={36}
            value={customPalette.blurPx}
            unit="px"
            onChange={(blurPx) => dispatch(updateCustomPalette({ blurPx }))}
          />
          <RangeSlider
            label="Optical Slab Radius"
            min={0}
            max={36}
            value={customPalette.slabRadius}
            unit="px"
            onChange={(slabRadius) => dispatch(updateCustomPalette({ slabRadius }))}
          />
          <ToggleSwitch
            checked={customPalette.specularHighlight}
            onChange={(specularHighlight) =>
              dispatch(updateCustomPalette({ specularHighlight }))
            }
            label="Specular Top Meniscus Highlight"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              Generated Theme Code
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white inline-flex items-center gap-1 cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <pre className="bg-slate-950 text-sky-200 rounded-2xl p-3 text-[11px] font-mono overflow-x-auto leading-relaxed">
            <code>{generatedSnippet}</code>
          </pre>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2">
          <SecondaryButton
            size="sm"
            leadingIcon={<RotateCcw className="w-3.5 h-3.5" />}
            onClick={() => dispatch(resetCustomPalette())}
          >
            Reset Defaults
          </SecondaryButton>
          <PrimaryButton size="sm" onClick={() => dispatch(setCustomizerOpen(false))}>
            Apply Theme
          </PrimaryButton>
        </div>
      </div>
    </SlideOverSheet>
  );
}
