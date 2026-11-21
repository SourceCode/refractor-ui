import { useState } from 'react';
import { Check, Copy, Palette, RotateCcw } from 'lucide-react';
import {
  PrimaryButton,
  RangeSlider,
  SecondaryButton,
  SegmentedControl,
  SlideOverSheet,
  ToggleSwitch,
  type RefractionIntensity,
} from '@refractor-ui/core';
import {
  pushToast,
  resetCustomPalette,
  setCustomizerOpen,
  setRefraction,
  setThemeMode,
  setThemePreset,
  type ThemePresetId,
  updateCustomPalette,
  useAppDispatch,
  useAppSelector,
} from '../system/store';

const PRESETS: Array<{ id: Exclude<ThemePresetId, 'custom'>; label: string; swatch: string }> = [
  { id: 'alabaster', label: 'Alabaster', swatch: '#E75C24' },
  { id: 'obsidian', label: 'Obsidian', swatch: '#1E293B' },
  { id: 'amethyst', label: 'Amethyst', swatch: '#7C3AED' },
  { id: 'emerald-tide', label: 'Emerald Tide', swatch: '#0D9488' },
  { id: 'solar-prism', label: 'Solar Prism', swatch: '#D97706' },
];

export function ThemeCustomizerDrawer() {
  const dispatch = useAppDispatch();
  const { customizerOpen, themePreset, themeMode, refraction, customPalette } = useAppSelector(
    (s) => s.system
  );
  const [copied, setCopied] = useState(false);

  const generatedSnippet = `import { createPrismTheme, PrismThemeProvider } from '@refractor-ui/core';

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
    dispatch(pushToast({ title: 'Copied MUI-style theme snippet', tone: 'emerald' }));
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <SlideOverSheet
      open={customizerOpen}
      mode="right"
      title="Optical Theme Studio"
      subtitle="MUI-style palette controls + Astryx CSS variable cascade"
      onClose={() => dispatch(setCustomizerOpen(false))}
    >
      <div className="space-y-6">
        <div className="space-y-2.5">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5" />
            <span>Official Optical Theme Presets</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => {
              const active = themePreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => dispatch(setThemePreset(preset.id))}
                  className={`px-3 py-2 rounded-2xl text-xs font-medium flex items-center gap-2 cursor-pointer transition-all prism-focus-ring ${
                    active
                      ? 'prism-btn-primary'
                      : 'prism-crystal text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className="w-3.5 h-3.5 rounded-full border border-white/80 shrink-0 relative z-10"
                    style={{ backgroundColor: preset.swatch }}
                  />
                  <span className="relative z-10 truncate">{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">Surface Mode</div>
          <SegmentedControl
            ariaLabel="Theme color mode"
            value={themeMode}
            onChange={(v) => dispatch(setThemeMode(v === 'dark' ? 'dark' : 'light'))}
            options={[
              { value: 'light', label: 'Alabaster Light' },
              { value: 'dark', label: 'Obsidian Dark' },
            ]}
          />
        </div>

        <div className="space-y-3">
          <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            MUI-Style Palette Tokens (Auto-Derives Shades &amp; Contrast)
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
            min={4}
            max={36}
            value={customPalette.blurPx}
            unit="px"
            onChange={(blurPx) => dispatch(updateCustomPalette({ blurPx }))}
          />
          <RangeSlider
            label="Optical Slab Radius"
            min={8}
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
