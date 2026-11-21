# ADR-0003: Dual MUI + Astryx Optical Glass Theme Engine & CSS Custom Property Cascade

- **Status:** Accepted
- **Date:** 2026-11-20
- **Decision Makers:** Refractor Creative UX/UI Direction & Core Architecture
- **Applies To:** `packages/core/src/theme/*`, `packages/core/src/refractor.css`, `packages/themes/*`, `apps/docs`

---

## 1. Context

Refractor's visual identity is defined by tactile prismatic refractive glass — glossy specular highlights, multi-layer inner rim bevels, recessed frosted wells, translucent seafoam emerald controls, and warm/cool chromatic caustic edge dispersion. However, hardcoding hex and `rgba()` values inside CSS classes breaks brand customization. Consumers expect **MUI-like simplicity** (supplying `{ palette: { primary: { main: '#7C3AED' } } }` and having the entire design system harmonize automatically) combined with **Astryx-like CSS custom property cascade theming** (zero re-render overhead, scoped nested themes, and `defineTheme({ extends, tokens, components })`).

## 2. Directives (Mandatory Invariants)

1. **100% Token-Backed Optical CSS (`packages/core/src/refractor.css`):**
   - Every optical surface class (`.prism-btn-primary`, `.prism-btn-secondary`, `.prism-btn-cobalt`, `.prism-crystal`, `.prism-well`, `.prism-emerald`, `.prism-thumb`, `.prism-toast`, `.prism-slab`) MUST read its colors, RGB channels, blur radius, specular intensity, caustic opacity, and border radii from `--prism-*` CSS custom properties.
   - Default `:root` and `.dark` / `[data-color-mode="dark"]` tokens in `refractor.css` reproduce the exact Alabaster Light and Obsidian Dark optical reference specimen even without a React theme provider.
2. **MUI-Ergonomic `createPrismTheme(options)`:**
   - Accepting a partial `PrismThemeOptions` object (`palette`, `typography`, `shape`, `optics`, `components`) MUST automatically derive missing tonal variants (`light`, `dark`, WCAG 4.5:1 `contrastText`, and `R, G, B` channel triplets) via pure deterministic color math in `packages/core/src/utils/colorMath.ts`.
   - Changing `palette.primary.main`, `palette.secondary.main`, `palette.success.main`, `palette.info.main`, `palette.warning.main`, `palette.error.main`, `shape.borderRadius`, or `optics.{refraction, blurPx, specularOpacity, causticOpacity}` MUST immediately re-skin every component without sacrificing glass depth or text readability.
3. **Astryx-Style `defineTheme()` & Cascade Scopes:**
   - `defineTheme({ name, extends?, tokens?, palette?, optics?, components? })` produces a serializable `DefinedPrismTheme` supporting `[light, dark]` token tuples, theme inheritance (`extends`), and per-component override maps (`components: { PrimaryButton: { className, style } }`).
   - `<PrismThemeProvider>` supports both root document theming (`scope="root"`) and nested isolated theme subtrees (`scope="local"`) by applying CSS custom properties directly onto a scoped container without forcing descendant React re-renders on token updates.
4. **Shipped Theme Preset Packages (`packages/themes/*`):**
   - Maintain five official optical theme packages: `alabaster` (signature warm-tangerine & ice-crystal light), `obsidian` (high-contrast dark bench), `amethyst` (violet & cyan refraction), `emerald-tide` (jade & teal refraction), and `solar-prism` (gold & cobalt refraction).

## 3. Enforcement

- `@refractor/no-raw-color` prevents raw color literals in component TSX files.
- `colorMath.test.ts` and `theme.test.tsx` verify automatic WCAG contrast derivation, RGB token emission, nested scoped themes, and adversarial invalid color strings.

## 4. Consequences

- Developers achieve full brand re-skinning with a 3-line MUI-style palette config OR deep Astryx token/component overrides while preserving 9.8/10+ optical glass craftsmanship.
