# Changelog

All notable changes to **Refractor Optical Glass UI Kit** (`@refractor-ui/*`) are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres strictly to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-20

### Added
- **Astryx-Aligned Monorepo Hierarchy:** Restructured repository into a `pnpm` workspace (`packages/core`, `packages/themes/*`, `packages/cli`, `apps/docs`, `internal/eslint-plugin-refractor`, `scripts/`) mirroring Meta Astryx conventions.
- **Core Component Infrastructure (`@refractor-ui/core`):** Added `BaseProps`, `naming` (`refractor-*` stable class namespace), `themeProps` (`data-*` state reflection), `mergeProps` (non-clobbering `className`/`style` merge), `composeEventHandlers`, `useMergedRefs`, `useControllableState`, `colorMath`, `sanitize` (HTML/URL/CSV-injection defense), and `reset.css`.
- **Dual MUI + Astryx Optical Theme Engine:** Refactored all optical glass physics in `refractor.css` onto CSS custom properties (`--prism-*`). Implemented MUI-ergonomic `createPrismTheme()` (auto-deriving `light`, `dark`, WCAG `contrastText`, and RGB caustic channels from single hex inputs) and Astryx-style `defineTheme()` with `extends`, `[light, dark]` token tuples, and `components` overrides.
- **Five Optical Theme Presets (`packages/themes/*`):** Added `alabaster`, `obsidian`, `amethyst`, `emerald-tide`, and `solar-prism` themes plus an interactive **Live Theme Customizer Drawer** in `apps/docs`.
- **Astryx-Standard Migration of All 46 Core Primitives:** Migrated all 46 components across 6 categories (`Buttons & Actions`, `Form Inputs`, `Navigation`, `Data Display`, `Feedback`, `Overlays`) into dedicated `packages/core/src/<ComponentName>/{Name.tsx, Name.doc.mjs, Name.test.tsx, index.ts}` directories with React 19 `ref`-as-prop and subpath exports in `packages/core/package.json`.
- **Custom Two-Tier ESLint Plugin (`internal/eslint-plugin-refractor`):** Enforced 17 Astryx-aligned rules plus strict zero `any` and zero `unknown` TypeScript governance (`@refractor/no-unknown-type`), with human recommended mode and CI/agent strict mode (`REFRACTOR_STRICT_LINT=1`).
- **GitHub Best Practices & Six ADRs:** Added CI/CD & release verification workflows, YAML issue templates, PR template, `CODEOWNERS`, `dependabot.yml`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `AGENTS.md`, `CLAUDE.md`, and `docs/adr/ADR-0001` through `ADR-0006`.
- **93%+ Adversarial Vitest Coverage Gate:** Configured `@vitest/coverage-v8` with mandatory >= 93% thresholds across statements, branches, functions, and lines, covering positive, negative, and adversarial test suites.

### Changed
- Decoupled all core UI components (`DataTable`, `TreeView`, `CalendarView`, `DateTimePicker`, `FileDropzone`) from application-specific storage types so `@refractor-ui/core` is a clean, standalone design system package.
- Replaced hardcoded hex and `rgba()` styling across `refractor.css` and SVG visualizations with reactive `--prism-*` semantic CSS custom properties.

[Unreleased]: https://github.com/SourceCode/glass-ui-v1/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/SourceCode/glass-ui-v1/releases/tag/v1.0.0
