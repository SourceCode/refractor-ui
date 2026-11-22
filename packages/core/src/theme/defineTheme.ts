import { createPrismTheme, themeToCssVariables } from './createPrismTheme';
import type {
  ComponentOverridesMap,
  DefinedPrismTheme,
  DefinePrismThemeInput,
  PrismTheme,
  PrismThemeOptions,
  RefractionIntensity,
  ThemeMode,
  ThemeTokenMap,
} from './types';

function mergeComponents(
  base?: ComponentOverridesMap,
  own?: ComponentOverridesMap
): ComponentOverridesMap {
  const result: ComponentOverridesMap = {};
  if (base) {
    for (const [key, value] of Object.entries(base)) {
      result[key] = { ...value, style: value.style ? { ...value.style } : undefined };
    }
  }
  if (own) {
    for (const [key, value] of Object.entries(own)) {
      const prev = result[key];
      result[key] = {
        className: [prev?.className, value.className].filter(Boolean).join(' ') || undefined,
        style: prev?.style || value.style ? { ...prev?.style, ...value.style } : undefined,
      };
    }
  }
  return result;
}

function mergeOptions(base?: PrismThemeOptions, own?: PrismThemeOptions): PrismThemeOptions {
  return {
    name: own?.name ?? base?.name,
    displayName: own?.displayName ?? base?.displayName,
    description: own?.description ?? base?.description,
    category: own?.category ?? base?.category,
    material: own?.material ?? base?.material,
    palette: {
      ...base?.palette,
      ...own?.palette,
      background: {
        ...base?.palette?.background,
        ...own?.palette?.background,
      },
      text: {
        ...base?.palette?.text,
        ...own?.palette?.text,
      },
    },
    typography: {
      ...base?.typography,
      ...own?.typography,
    },
    shape: {
      ...base?.shape,
      ...own?.shape,
    },
    optics: {
      ...base?.optics,
      ...own?.optics,
    },
    fx: {
      ...base?.fx,
      ...own?.fx,
    },
    motion: {
      ...base?.motion,
      ...own?.motion,
    },
    editor: {
      ...base?.editor,
      ...own?.editor,
    },
    components: mergeComponents(base?.components, own?.components),
    customTokens: {
      ...base?.customTokens,
      ...own?.customTokens,
    },
  };
}

/**
 * Composable, cascade-ready theme builder supporting `extends`, `[light, dark]` token tuples,
 * palette shortcuts, material/FX configs, typography, and component overrides.
 */
export function defineTheme(input: DefinePrismThemeInput): DefinedPrismTheme {
  const base = input.extends;
  const mergedOptions = mergeOptions(base?.options, input);
  const mergedTokens: ThemeTokenMap = {
    ...(base?.tokens ?? {}),
    ...(input.tokens ?? {}),
  };
  const mergedComponents = mergeComponents(base?.components, input.components);

  return {
    __kind: 'DefinedPrismTheme',
    name: input.name,
    options: { ...mergedOptions, name: input.name },
    tokens: mergedTokens,
    components: mergedComponents,
  };
}

export function isDefinedPrismTheme(
  candidate: PrismTheme | DefinedPrismTheme | PrismThemeOptions
): candidate is DefinedPrismTheme {
  return '__kind' in candidate && candidate.__kind === 'DefinedPrismTheme';
}

export function isResolvedPrismTheme(
  candidate: PrismTheme | DefinedPrismTheme | PrismThemeOptions
): candidate is PrismTheme {
  return (
    'palette' in candidate &&
    candidate.palette !== undefined &&
    'primary' in candidate.palette &&
    candidate.palette.primary !== undefined &&
    'rgb' in candidate.palette.primary &&
    'fx' in candidate &&
    candidate.fx !== undefined
  );
}

/**
 * Resolves a DefinedPrismTheme for a target color mode and optional refraction intensity.
 */
export function resolveDefinedTheme(
  defined: DefinedPrismTheme,
  modeOverride?: ThemeMode,
  refractionOverride?: RefractionIntensity
): PrismTheme {
  const mode: ThemeMode = modeOverride ?? defined.options.palette?.mode ?? 'light';
  const resolvedTokens: Record<`--prism-${string}`, string> = {
    ...(defined.options.customTokens ?? {}),
  };

  for (const [tokenName, tokenValue] of Object.entries(defined.tokens)) {
    const key = tokenName as `--prism-${string}`;
    if (Array.isArray(tokenValue)) {
      resolvedTokens[key] = mode === 'dark' ? tokenValue[1] : tokenValue[0];
    } else if (typeof tokenValue === 'string') {
      resolvedTokens[key] = tokenValue;
    }
  }

  return createPrismTheme({
    ...defined.options,
    name: defined.name,
    palette: {
      ...defined.options.palette,
      mode,
    },
    optics: {
      ...defined.options.optics,
      ...(refractionOverride ? { refraction: refractionOverride } : {}),
    },
    components: defined.components,
    customTokens: resolvedTokens,
  });
}

/**
 * Compiles a DefinedPrismTheme to static cascade CSS for `[data-refractor-theme="<name>"]`.
 */
export function compileThemeCss(defined: DefinedPrismTheme): string {
  const lightTheme = resolveDefinedTheme(defined, 'light');
  const darkTheme = resolveDefinedTheme(defined, 'dark');
  const lightVars = themeToCssVariables(lightTheme);
  const darkVars = themeToCssVariables(darkTheme);

  const formatBlock = (vars: Record<string, string>): string =>
    Object.entries(vars)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join('\n');

  return [
    `[data-refractor-theme="${defined.name}"] {\n${formatBlock(lightVars)}\n}`,
    `.dark[data-refractor-theme="${defined.name}"],\n.dark [data-refractor-theme="${defined.name}"],\n[data-refractor-theme="${defined.name}"][data-color-mode="dark"] {\n${formatBlock(darkVars)}\n}`,
  ].join('\n\n');
}
