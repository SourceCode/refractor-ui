import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  buildGoogleFontsHref,
  compileThemeCss,
  createPrismTheme,
  defineTheme,
  ensureThemeFontsLoaded,
  extractGoogleFontsFromStack,
  getLoadedThemeFontKeys,
  isDefinedPrismTheme,
  isResolvedPrismTheme,
  PrismThemeProvider,
  resolveDefinedTheme,
  SUPPORTED_THEME_FONT_FAMILIES,
  themeToCssVariables,
  useComponentOverride,
  usePrismTheme,
  type ThemeMaterial,
  type ThemeOverlayFx,
} from '../theme';

const baseAmethyst = defineTheme({
  name: 'amethyst',
  palette: {
    mode: 'light',
    primary: { main: '#7C3AED', light: '#A78BFA', dark: '#5B21B6', contrastText: '#FFFFFF' },
    secondary: { main: '#06B6D4', light: '#A5F3FC', dark: '#0E7490', contrastText: '#151E2C' },
  },
  optics: { refraction: 'vivid', blurPx: 20, specularHighlight: true },
});

function ThemeProbe() {
  const theme = usePrismTheme();
  const btnOverride = useComponentOverride('PrimaryButton');
  return (
    <div>
      <span data-testid="theme-name">{theme.name}</span>
      <span data-testid="theme-mode">{theme.palette.mode}</span>
      <span data-testid="theme-material">{theme.material}</span>
      <span data-testid="theme-fx">{theme.fx.wallpaperOverlay}</span>
      <span data-testid="primary-main">{theme.palette.primary.main}</span>
      <span data-testid="primary-rgb">{theme.palette.primary.rgb}</span>
      <span data-testid="override-cls">{btnOverride?.className ?? 'none'}</span>
    </div>
  );
}

afterEach(() => {
  document.head
    .querySelectorAll('link[data-refractor-font-key], link[data-refractor-font-preconnect]')
    .forEach((n) => n.remove());
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('data-refractor-material');
  document.documentElement.removeAttribute('data-refractor-fx');
  document.documentElement.removeAttribute('data-refractor-theme');
  document.documentElement.removeAttribute('data-refractor-theme-adaptive');
  document.documentElement.removeAttribute('data-refractor-sharp');
  document.documentElement.removeAttribute('data-refractor-controls-layout');
});

describe('Dual Multi-Material & Optical Theme Engine', () => {
  it('supports shorthand and object createPrismTheme with automatic palette derivation', () => {
    const darkDefault = createPrismTheme('dark', 'vivid');
    expect(darkDefault.palette.mode).toBe('dark');
    expect(darkDefault.material).toBe('glass');
    expect(darkDefault.fx.adaptiveInk).toBe(false);
    expect(darkDefault.fx.sharpCorners).toBe(false);
    expect(darkDefault.optics.causticOpacity).toBe(1.35);

    const custom = createPrismTheme({
      name: 'violet-brand',
      palette: {
        mode: 'light',
        primary: { main: '#7C3AED' },
        secondary: { main: '#06B6D4' },
      },
      shape: { borderRadius: 20, slabRadius: 28 },
      optics: { refraction: 'subtle', blurPx: 24, specularHighlight: false },
      components: {
        PrimaryButton: { className: 'brand-cta' },
      },
    });

    expect(custom.palette.primary.rgb).toBe('124, 58, 237');
    expect(custom.palette.primary.contrastText).toBe('#FFFFFF');
    expect(custom.optics.specularOpacity).toBe(0);
    expect(custom.optics.causticOpacity).toBe(0.45);
    expect(custom.shape.buttonRadius).toBe(9999);

    const vars = themeToCssVariables(custom);
    expect(vars['--prism-primary-main']).toBe('#7C3AED');
    expect(vars['--prism-blur-px']).toBe('24px');
    expect(vars['--prism-radius-slab']).toBe('28px');
    expect(vars['--prism-radius-btn']).toBe('9999px');
  });

  it('derives authentic material defaults, sharp corners, FX overlays, motion, and editor tokens across all 13 materials and 9 overlays', () => {
    const materials: ReadonlyArray<ThemeMaterial> = [
      'glass',
      'mica',
      'bevel',
      'brutalist',
      'neon',
      'crt',
      'neumorphic',
      'clay',
      'paper',
      'flat',
      'chrome',
      'pixel',
      'resin',
    ];
    const overlays: ReadonlyArray<ThemeOverlayFx> = [
      'none',
      'noise',
      'scanlines',
      'cyber-grid',
      'retro-grid',
      'dot-matrix',
      'paper-grain',
      'crt-rgb',
      'hazard-stripes',
    ];

    for (const material of materials) {
      const theme = createPrismTheme({
        name: `mat-${material}`,
        material,
        palette: { mode: material === 'neon' || material === 'crt' ? 'dark' : 'light' },
      });
      expect(theme.material).toBe(material);
      const vars = themeToCssVariables(theme);
      expect(vars['--prism-wallpaper']).toBeTruthy();
      expect(vars['--prism-editor-bg']).toBeTruthy();
      expect(vars['--prism-motion-fast']).toBe('120ms');
      if (material === 'glass') {
        expect(theme.fx.adaptiveInk).toBe(false);
        expect(vars['--prism-slab-top']).toBeUndefined();
      } else {
        expect(theme.fx.adaptiveInk).toBe(true);
        expect(vars['--prism-slab-top']).toBe(theme.fx.windowBg);
      }
    }

    for (const overlay of overlays) {
      const theme = createPrismTheme({
        name: `fx-${overlay}`,
        material: 'neon',
        fx: { wallpaperOverlay: overlay },
      });
      expect(theme.fx.wallpaperOverlay).toBe(overlay);
      expect(theme.fx.overlayOpacity).toBeGreaterThanOrEqual(0);
      expect(theme.fx.overlayOpacity).toBeLessThanOrEqual(0.4);
    }

    // Clamps adversarial numeric values cleanly
    const clamped = createPrismTheme({
      name: 'clamped',
      material: 'brutalist',
      shape: { borderRadius: -10, buttonRadius: Number.NaN, slabRadius: 999 },
      fx: {
        overlayOpacity: 99,
        glowIntensity: Number.POSITIVE_INFINITY,
        borderWidthPx: -5,
        titleBarHeightPx: 400,
      },
    });
    expect(clamped.shape.borderRadius).toBe(0);
    expect(clamped.shape.slabRadius).toBe(48);
    expect(clamped.fx.overlayOpacity).toBe(0.4);
    expect(clamped.fx.glowIntensity).toBe(0.4);
    expect(clamped.fx.borderWidthPx).toBe(0);
    expect(clamped.fx.titleBarHeightPx).toBe(48);

    // Invalid runtime material/overlay values fall back gracefully
    const fallback = createPrismTheme({
      material: 'invalid-mat' as ThemeMaterial,
      fx: { wallpaperOverlay: 'invalid-fx' as ThemeOverlayFx },
    });
    expect(fallback.material).toBe('glass');
    expect(fallback.fx.wallpaperOverlay).toBe('none');
  });

  it('supports defineTheme with extends, material/fx/motion/editor inheritance, token tuples, and compileThemeCss', () => {
    const retroBase = defineTheme({
      name: 'retro-base',
      displayName: 'Retro Base',
      description: 'Sharp bevel OS baseline',
      category: 'classic-os',
      material: 'bevel',
      palette: {
        mode: 'light',
        primary: { main: '#000080', contrastText: '#FFFFFF' },
      },
      typography: {
        fontFamily: '"Orbitron", "Inter", sans-serif',
      },
      fx: {
        wallpaper: '#008080',
        wallpaperOverlay: 'scanlines',
        borderWidthPx: 2,
        controlsLayout: 'left',
      },
      motion: { durationFast: '60ms' },
      editor: { keyword: '#000080', string: '#008000' },
    });

    const child = defineTheme({
      name: 'retro-pro',
      extends: retroBase,
      tokens: {
        '--prism-radius-slab': ['0px', '2px'],
        '--prism-blur-px': '0px',
      },
      fx: {
        wallpaperOverlay: 'crt-rgb',
      },
      components: {
        PrimaryButton: { className: 'pro-btn', style: { letterSpacing: '0.02em' } },
      },
    });

    expect(isDefinedPrismTheme(child)).toBe(true);
    expect(isResolvedPrismTheme(child)).toBe(false);

    const resolvedLight = resolveDefinedTheme(child, 'light');
    const resolvedDark = resolveDefinedTheme(child, 'dark', 'vivid');
    expect(isResolvedPrismTheme(resolvedLight)).toBe(true);
    expect(resolvedLight.material).toBe('bevel');
    expect(resolvedLight.fx.wallpaper).toBe('#008080');
    expect(resolvedLight.fx.wallpaperOverlay).toBe('crt-rgb');
    expect(resolvedLight.fx.controlsLayout).toBe('left');
    expect(resolvedLight.motion.durationFast).toBe('60ms');
    expect(resolvedLight.editor.keyword).toBe('#000080');
    expect(resolvedLight.typography.googleFonts).toContain('Orbitron:wght@400;600;700');
    expect(resolvedLight.typography.googleFonts).toContain('Inter:wght@400;500;600;700');
    expect(resolvedLight.customTokens['--prism-radius-slab']).toBe('0px');
    expect(resolvedDark.customTokens['--prism-radius-slab']).toBe('2px');
    expect(resolvedDark.optics.refraction).toBe('vivid');

    const css = compileThemeCss(child);
    expect(css).toContain('[data-refractor-theme="retro-pro"]');
    expect(css).toContain('--prism-primary-main: #000080;');
    expect(css).toContain('--prism-wallpaper: #008080;');
  });

  it('lazily loads allowlisted Google Fonts and blocks adversarial URL injection payloads', () => {
    expect(SUPPORTED_THEME_FONT_FAMILIES.length).toBeGreaterThanOrEqual(20);
    expect(extractGoogleFontsFromStack('')).toEqual([]);
    expect(
      extractGoogleFontsFromStack('"VT323", "Press Start 2P", "Press Start 2P", monospace')
    ).toEqual(['VT323', 'Press+Start+2P']);
    expect(extractGoogleFontsFromStack('"Garamond", "Georgia", serif')).toEqual([
      'EB+Garamond:wght@400;500;600;700',
    ]);

    const safeHref = buildGoogleFontsHref(['Orbitron', 'Rajdhani', 'Orbitron']);
    expect(safeHref).toBe(
      'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;600;700&family=Rajdhani:wght@500;600;700&display=swap'
    );

    // Adversarial payloads MUST be rejected
    expect(
      buildGoogleFontsHref([
        'javascript:alert(1)',
        'Orbitron&display=swap&evil=1',
        '../etc/passwd',
        'Inter" onload="alert(1)',
        'https://evil.example/font.css',
        '',
      ])
    ).toBeNull();

    expect(ensureThemeFontsLoaded([])).toBe(false);
    expect(ensureThemeFontsLoaded(['javascript:alert(1)'])).toBe(false);

    const injectedFirst = ensureThemeFontsLoaded(['Orbitron:wght@400;600;700']);
    expect(injectedFirst).toBe(true);
    expect(getLoadedThemeFontKeys()).toContain('Orbitron:wght@400;600;700');

    // Deduplicated on second call
    const injectedSecond = ensureThemeFontsLoaded(['Orbitron:wght@400;600;700']);
    expect(injectedSecond).toBe(false);
    expect(
      document.head.querySelectorAll('link[data-refractor-font-preconnect]').length
    ).toBe(2);

    // Gracefully handles headless document stubs without throwing
    const fakeDocWithoutHead = {} as Document;
    expect(ensureThemeFontsLoaded(['Orbitron'], fakeDocWithoutHead)).toBe(false);
    expect(getLoadedThemeFontKeys(fakeDocWithoutHead)).toEqual([]);

    // Gracefully skips empty/duplicate font-family entries
    expect(extractGoogleFontsFromStack('  , "UnknownFont" , "Inter" , "Inter" ')).toEqual([
      'Inter:wght@400;500;600;700',
    ]);
  });

  it('injects root material/FX attributes, cleans stale custom tokens on switch, and respects loadFonts={false}', () => {
    const cyberpunk = defineTheme({
      name: 'cyberpunk-test',
      material: 'neon',
      palette: { mode: 'dark', primary: { main: '#00F0FF', contrastText: '#000000' } },
      typography: { fontFamily: '"Rajdhani", sans-serif' },
      fx: { wallpaperOverlay: 'cyber-grid', sharpCorners: true },
      tokens: { '--prism-custom-cyber': '1' },
    });

    const nested = defineTheme({
      name: 'nested-brand',
      material: 'brutalist',
      palette: { mode: 'light', primary: { main: '#EC4899' } },
      fx: { wallpaperOverlay: 'paper-grain', controlsLayout: 'left' },
      components: { PrimaryButton: { className: 'pink-cta' } },
    });

    const { rerender, container } = render(
      <PrismThemeProvider theme={cyberpunk} loadFonts={true}>
        <PrismThemeProvider theme={nested} scope="local" loadFonts={false}>
          <ThemeProbe />
        </PrismThemeProvider>
      </PrismThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-color-mode')).toBe('dark');
    expect(document.documentElement.getAttribute('data-refractor-material')).toBe('neon');
    expect(document.documentElement.getAttribute('data-refractor-fx')).toBe('cyber-grid');
    expect(document.documentElement.getAttribute('data-refractor-theme-adaptive')).toBe('true');
    expect(document.documentElement.getAttribute('data-refractor-sharp')).toBe('true');
    expect(document.documentElement.style.getPropertyValue('--prism-custom-cyber')).toBe('1');
    expect(getLoadedThemeFontKeys().some((k) => k.includes('Rajdhani'))).toBe(true);

    // Scoped local container carries its own material & FX attributes cleanly
    const localDiv = container.querySelector('[data-refractor-theme="nested-brand"]');
    expect(localDiv).not.toBeNull();
    expect(localDiv?.getAttribute('data-refractor-material')).toBe('brutalist');
    expect(localDiv?.getAttribute('data-refractor-fx')).toBe('paper-grain');
    expect(localDiv?.getAttribute('data-refractor-controls-layout')).toBe('left');
    expect(screen.getByTestId('theme-name')).toHaveTextContent('nested-brand');
    expect(screen.getByTestId('theme-material')).toHaveTextContent('brutalist');
    expect(screen.getByTestId('override-cls')).toHaveTextContent('pink-cta');

    // Switch back to default optical glass — stale custom token MUST be removed
    rerender(
      <PrismThemeProvider mode="light" refraction="standard" loadFonts={false}>
        <ThemeProbe />
      </PrismThemeProvider>
    );
    expect(document.documentElement.getAttribute('data-refractor-material')).toBe('glass');
    expect(document.documentElement.getAttribute('data-refractor-theme-adaptive')).toBe('false');
    expect(document.documentElement.style.getPropertyValue('--prism-custom-cyber')).toBe('');
  });

  it('accepts resolved PrismTheme and partial PrismThemeOptions in PrismThemeProvider', () => {
    const resolved = createPrismTheme({
      material: 'chrome',
      palette: { primary: { main: '#16A34A' } },
      components: { PrimaryButton: { className: 'a', style: { opacity: 0.95 } } },
    });
    const { rerender } = render(
      <PrismThemeProvider theme={resolved} loadFonts={false}>
        <ThemeProbe />
      </PrismThemeProvider>
    );
    expect(screen.getByTestId('primary-main')).toHaveTextContent('#16A34A');
    expect(screen.getByTestId('theme-material')).toHaveTextContent('chrome');

    rerender(
      <PrismThemeProvider theme={resolved} mode="dark" refraction="vivid" loadFonts={false}>
        <ThemeProbe />
      </PrismThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(screen.getByTestId('theme-material')).toHaveTextContent('chrome');

    rerender(
      <PrismThemeProvider
        theme={{ palette: { primary: { main: '#0284C7' } } }}
        mode="light"
        refraction="subtle"
        loadFonts={false}
      >
        <ThemeProbe />
      </PrismThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(screen.getByTestId('primary-main')).toHaveTextContent('#0284C7');

    const parent = defineTheme({
      name: 'parent',
      components: { PrimaryButton: { className: 'p1', style: { padding: '4px' } } },
    });
    const child = defineTheme({
      name: 'child',
      extends: parent,
      components: { PrimaryButton: { className: 'p2', style: { margin: '2px' } } },
    });
    render(
      <PrismThemeProvider theme={child} scope="local" className="local-wrap" loadFonts={false}>
        <ThemeProbe />
      </PrismThemeProvider>
    );
    expect(screen.getAllByTestId('override-cls')[1]).toHaveTextContent('p1 p2');
  });

  it('generates valid cascade CSS for defined themes', () => {
    expect(isDefinedPrismTheme(baseAmethyst)).toBe(true);
    expect(compileThemeCss(baseAmethyst)).toContain('[data-refractor-theme="amethyst"]');
  });
});
