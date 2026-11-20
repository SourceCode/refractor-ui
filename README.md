# Refractor Optical Glass UI Kit

A tactile, prismatic optical-glass **React 19 & TypeScript** component library and interactive Optical Workbench featuring **Astryx-aligned Open-Internals architecture**, **MUI-ergonomic dynamic color & optical theming**, **zero `any`/`unknown` strictness**, **>= 93% adversarial unit test coverage**, and **75 accessible components across 12 categories** (planned through `v1.7.0`).

---

## Key Capabilities

- **Astryx-Aligned Component Setup:** Every component lives in its own modular directory (`packages/core/src/<ComponentName>/`) containing `<Name>.tsx`, `<Name>.doc.mjs`, `<Name>.test.tsx`, and `index.ts`, with React 19 `ref`-as-prop, `BaseProps` footgun filtering, `themeProps()` stable class + `data-*` reflection, `mergeProps()` non-clobbering overrides, and package subpath exports.
- **Dual MUI + Astryx Optical Theme Engine:**
  - **MUI-style effortless color & style control:** Pass a single hex color to `createPrismTheme({ palette: { primary: { main: '#7C3AED' } }, shape: { borderRadius: 20 }, optics: { refraction: 'vivid', blurPx: 22 } })` and Refractor automatically computes `light`, `dark`, WCAG 4.5:1 `contrastText`, RGB caustic channels, and specular dispersion tokens.
  - **Astryx-style CSS cascade theming:** Use `defineTheme({ name, extends, tokens, components })` or pre-compiled `@refractor-ui/theme-*` CSS files (`alabaster`, `obsidian`, `amethyst`, `emerald-tide`, `solar-prism`) with zero provider re-render cost.
- **Strict Two-Tier ESLint Governance (`internal/eslint-plugin-refractor`):** Enforces Astryx component contracts (`require-base-props`, `require-ref-prop`, `no-classname-clobber`, `no-raw-color`, `no-hover-on-disabled`, `disabled-cursor`, `focus-outline-keyboard-only`, `no-unguarded-ime-keydown`, `no-dangerous-html`) plus **zero `any` and zero `unknown`** (`@refractor/no-unknown-type`).
- **Agent-Ready CLI (`@refractor-ui/cli`):** Query docs, inspect component props, list themes, validate structural integrity, or `swizzle` any component's source code directly into your application.
- **Deep Security & Adversarial Validation:** Built-in HTML/URL allowlist sanitization, CSV/Excel formula injection neutralization, prototype-pollution-safe `Map` aggregations, and >= 93% V8 coverage across statements, branches, functions, and lines.

---

## Monorepo Structure

```text
├── .github/                      # CI/CD workflows, issue/PR templates, CODEOWNERS, Dependabot
├── docs/
│   ├── adr/                      # Six authoritative Architecture Decision Records (ADR-0001..0006)
│   └── reviews/                  # Creative UX/UI Director visual audit (>= 9.8/10)
├── internal/
│   └── eslint-plugin-refractor/  # Custom Astryx-aligned ESLint plugin (17 rules)
├── packages/
│   ├── core/                     # @refractor-ui/core — components, theme engine, CSS tokens
│   ├── themes/                   # alabaster, obsidian, amethyst, emerald-tide, solar-prism
│   └── cli/                      # @refractor-ui/cli — docs, component, theme, swizzle, check
├── apps/
│   └── docs/                     # Interactive Optical Workbench & Live Theme Customizer
└── scripts/                      # Structural drift harness (check-repo) & export sync
```

---

## Quick Start

```bash
pnpm install
pnpm dev              # Launch interactive Optical Workbench (http://localhost:3000)
pnpm check:repo       # Run Astryx structural & zero-any/unknown verification
pnpm lint:strict      # Run two-tier ESLint in CI/agent strict mode
pnpm typecheck        # Run strict TypeScript checks
pnpm test:coverage    # Run Vitest unit & adversarial suite (>= 93% gate)
pnpm build            # Build all packages and documentation app
```

### MUI-Style & Astryx-Style Theming Example

```tsx
import '@refractor-ui/core/reset.css';
import '@refractor-ui/core/refractor.css';
import {
  PrismThemeProvider,
  createPrismTheme,
  PrimaryButton,
  PrismCard,
} from '@refractor-ui/core';

const brandTheme = createPrismTheme({
  palette: {
    mode: 'light',
    primary: { main: '#7C3AED' },
    secondary: { main: '#06B6D4' },
    success: { main: '#10B981' },
  },
  shape: { borderRadius: 18, slabRadius: 26 },
  optics: { refraction: 'vivid', blurPx: 20 },
});

export function App() {
  return (
    <PrismThemeProvider theme={brandTheme}>
      <PrismCard title="Custom Prismatic Brand" kicker="MUI + Astryx Cascade">
        <PrimaryButton size="md">Launch Studio</PrimaryButton>
      </PrismCard>
    </PrismThemeProvider>
  );
}
```

---

## Versioning & Governance

This project strictly adheres to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html) and [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/). See [`CHANGELOG.md`](./CHANGELOG.md), [`docs/adr/README.md`](./docs/adr/README.md), [`CONTRIBUTING.md`](./CONTRIBUTING.md), and [`SECURITY.md`](./SECURITY.md).

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
