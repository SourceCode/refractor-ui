import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  compileThemeCss,
  createPrismTheme,
  defineTheme,
  isDefinedPrismTheme,
  isResolvedPrismTheme,
  PrismThemeProvider,
  resolveDefinedTheme,
  themeToCssVariables,
  useComponentOverride,
  usePrismTheme,
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
      <span data-testid="primary-main">{theme.palette.primary.main}</span>
      <span data-testid="primary-rgb">{theme.palette.primary.rgb}</span>
      <span data-testid="override-cls">{btnOverride?.className ?? 'none'}</span>
    </div>
  );
}

describe('Dual MUI + Astryx Optical Theme Engine', () => {
  it('supports shorthand and MUI-style createPrismTheme with automatic palette derivation', () => {
    const darkDefault = createPrismTheme('dark', 'vivid');
    expect(darkDefault.palette.mode).toBe('dark');
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

    const vars = themeToCssVariables(custom);
    expect(vars['--prism-primary-main']).toBe('#7C3AED');
    expect(vars['--prism-blur-px']).toBe('24px');
    expect(vars['--prism-radius-slab']).toBe('28px');
  });

  it('supports Astryx defineTheme with extends, [light, dark] token tuples, and compileThemeCss', () => {
    const child = defineTheme({
      name: 'amethyst-pro',
      extends: baseAmethyst,
      tokens: {
        '--prism-radius-slab': ['20px', '18px'],
        '--prism-blur-px': '22px',
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
    expect(resolvedLight.customTokens['--prism-radius-slab']).toBe('20px');
    expect(resolvedDark.customTokens['--prism-radius-slab']).toBe('18px');
    expect(resolvedDark.optics.refraction).toBe('vivid');

    const css = compileThemeCss(child);
    expect(css).toContain('[data-refractor-theme="amethyst-pro"]');
    expect(css).toContain('--prism-primary-main: #7C3AED;');
  });

  it('injects root CSS variables and supports nested local scoped themes', () => {
    const nested = defineTheme({
      name: 'nested-brand',
      palette: { mode: 'dark', primary: { main: '#EC4899' } },
      components: { PrimaryButton: { className: 'pink-cta' } },
    });

    render(
      <PrismThemeProvider mode="light" refraction="standard">
        <PrismThemeProvider theme={nested} scope="local">
          <ThemeProbe />
        </PrismThemeProvider>
      </PrismThemeProvider>
    );

    expect(document.documentElement.getAttribute('data-color-mode')).toBe('light');
    expect(document.documentElement.style.getPropertyValue('--prism-primary-main')).toBe('#E75C24');
    expect(screen.getByTestId('theme-name')).toHaveTextContent('nested-brand');
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('primary-main')).toHaveTextContent('#EC4899');
    expect(screen.getByTestId('override-cls')).toHaveTextContent('pink-cta');
  });

  it('accepts resolved PrismTheme and partial MUI PrismThemeOptions in PrismThemeProvider', () => {
    const resolved = createPrismTheme({
      palette: { primary: { main: '#16A34A' } },
      components: { PrimaryButton: { className: 'a', style: { opacity: 0.95 } } },
    });
    const { rerender } = render(
      <PrismThemeProvider theme={resolved}>
        <ThemeProbe />
      </PrismThemeProvider>
    );
    expect(screen.getByTestId('primary-main')).toHaveTextContent('#16A34A');

    rerender(
      <PrismThemeProvider theme={resolved} mode="dark" refraction="vivid">
        <ThemeProbe />
      </PrismThemeProvider>
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    rerender(
      <PrismThemeProvider theme={{ palette: { primary: { main: '#0284C7' } } }} mode="light" refraction="subtle">
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
      <PrismThemeProvider theme={child} scope="local" className="local-wrap">
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
