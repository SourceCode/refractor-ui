# Changelog

All notable changes to **Refractor Optical Glass UI Kit** (`@refractor-ui/*`) are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres strictly to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-11-20

### Added
- **Advanced Search & Filtering (4 new Astryx-standard optical-glass components):**
  - `FacetedFilterBar`: Multi-criteria optical filtering bar with search, category multi-select chips, auto-clamped numeric/price range, date bounds, removable active-filter pills, and one-click reset (`RGU-16`).
  - `VisualQueryBuilder`: Nested `AND`/`OR` logical rule composer with type-aware field/operator dropdowns, bounded recursion depth, and live expression + JSON AST preview without `eval()` (`RGU-17`).
  - `MultiSelectCombobox`: Searchable WAI-ARIA combobox/token input stacking removable emerald pill tags inline, supporting Backspace removal, optional creatable custom tokens, and IME-safe Enter handling (`RGU-18`).
  - `GlobalSearchModal`: Multi-entity search overlay grouping results across Files, People, Components, and Settings via prototype-safe `Map`s, literal substring match highlighting (zero regex injection), recent queries, and full keyboard navigation (`RGU-36`).
- Interactive playground demos and prop specs in `apps/docs` under `Advanced Search & Filtering` (62 total components across 9 categories).

## [1.2.0] - 2026-11-20

### Added
- **Advanced Data & Visualization (6 new enterprise optical-glass components):**
  - `AdvancedDataGrid`: Inline cell editing (IME-safe Enter/Escape), column resizing & drag/button reordering, left/right column pinning, prototype-safe `Map` row grouping, sorting, and OWASP formula-safe CSV/Excel export (`RGU-32`).
  - `PivotTable`: Drag-and-drop & keyboard-accessible field assignment across Rows, Columns, and Values with Sum/Avg/Count/Min/Max aggregations and grand totals using prototype-pollution-immune `Map` storage (`RGU-33`).
  - `KanbanBoard`: Multi-column optical workflow board with drag-and-drop cards, WIP limit indicators, quick-add composer, and keyboard stage transitions (`RGU-34`).
  - `GanttChart`: Horizontal optical timeline scheduler with Days/Weeks/Months zoom scales, resource lane grouping, progress bars, today hairline, and SVG dependency connectors (`RGU-14`).
  - `DiffViewer`: Side-by-side and unified inline LCS diff viewer with whitespace toggle and zero raw HTML injection (`RGU-35`).
  - `KpiMetricCard`: Compact optical KPI dashboard card with headline tabular metric, inverted-semantics delta badge, and interactive token-driven SVG sparkline (`RGU-15`).
- Interactive playground demos and prop specs in `apps/docs` under `Advanced Data & Visualization` (58 total components across 8 categories).

## [1.1.0] - 2026-11-20

### Added
- **Layout & Workspace Controls (6 new Astryx-standard optical-glass components):**
  - `WindowSplitter`: Draggable horizontal/vertical multi-pane optical splitter with pointer drag, double-click reset, min/max clamping, and full keyboard `role="separator"` support (`RGU-9`).
  - `DockablePanel`: Modular workspace window supporting docked (`left`, `right`, `bottom`, `center`) and draggable floating modes, collapse/expand, and keyboard positioning (`RGU-10`).
  - `MasterDetailView`: Searchable split-screen master-detail workspace with Arrow/Home/End keyboard selection and responsive mobile detail toggle (`RGU-11`).
  - `VirtualizedList`: Windowed high-performance virtual scroller rendering only visible items + overscan across 10,000+ rows with infinite-scroll `onEndReached` and live telemetry pill (`RGU-12`).
  - `MasonryGrid`: Shortest-column balanced multi-column optical brickwork layout (`RGU-13`).
  - `StickyActionBar`: Floating/anchored optical bulk selection toolbar with tabular selection counter, Select All / Clear, Escape dismissal, and tone-aware action pills (`RGU-31`).
- Interactive playground demos and prop specs in `apps/docs` under the new `Layout & Workspace Controls` category (52 total components across 7 categories).

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

[Unreleased]: https://github.com/SourceCode/glass-ui-v1/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/SourceCode/glass-ui-v1/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/SourceCode/glass-ui-v1/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/SourceCode/glass-ui-v1/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/SourceCode/glass-ui-v1/releases/tag/v1.0.0
