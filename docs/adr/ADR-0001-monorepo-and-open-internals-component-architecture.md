# ADR-0001: Monorepo Hierarchy & Open-Internals Component Architecture

- **Status:** Accepted
- **Date:** 2026-11-20
- **Decision Makers:** Refractor Principal Architecture & UX/UI Direction
- **Applies To:** Entire `refractor-ui` repository (`@refractor-ui/*`)

---

## 1. Context

The initial prototype placed all 46 components into six monolithic barrel files (`src/os/components/{buttons,inputs,navigation,dataDisplay,feedback,overlays}.tsx`) coupled directly to application storage types (`src/system/storage.ts`). That flat layout prevented tree-shakeable subpath imports, independent component swizzling, per-component documentation metadata, automated drift checking, and clean separation between the publishable UI library and the interactive documentation playground.

**Refractor UI** establishes the gold standard for modern React 19, agent-ready, open-internals component libraries.

## 2. Directives (Mandatory Invariants)

1. **Monorepo Package Boundaries (`pnpm-workspace.yaml`):**
   - `packages/core` (`@refractor-ui/core`): Standalone, publishable React 19 component library, theme engine, hooks, utilities, and CSS token stylesheets. **MUST NEVER** import from `apps/*`.
   - `packages/themes/*` (`@refractor-ui/theme-*`): Pre-compiled cascade optical theme packages (`alabaster`, `obsidian`, `amethyst`, `emerald-tide`, `solar-prism`).
   - `packages/cli` (`@refractor-ui/cli`): Agent-ready CLI (`docs`, `component`, `theme`, `swizzle`, `check`).
   - `apps/docs` (`@refractor-ui/docs`): Interactive Optical Workbench & Live Theme Customizer consuming `@refractor-ui/core` exclusively via public package exports.
   - `internal/eslint-plugin-refractor`: Repository-scoped AST ESLint plugin enforcing design-system invariants.
2. **Per-Component Directory Structure:**
   Every component `<ComponentName>` MUST reside in `packages/core/src/<ComponentName>/` with exactly these canonical files:
   - `<ComponentName>.tsx` — Implementation with `'use client';` directive, `displayName`, React 19 `ref` prop (NO `React.forwardRef`), extending `BaseProps<Element>`.
   - `<ComponentName>.doc.mjs` — Structured machine-readable documentation (`name`, `displayName`, `group`, `category`, `keywords`, `usage`, `bestPractices`, `accessibility`, `props`, `examples`).
   - `<ComponentName>.test.tsx` — Positive, negative, and adversarial Vitest + Testing Library tests.
   - `index.ts` — Component export barrel + extensible variant map interface where applicable.
3. **Open Internals Escalation Path:**
   Every component MUST support all five Open-Internals customization tiers:
   1. Typed Props
   2. Theme Tokens (`createPrismTheme` / `defineTheme`)
   3. Theme Component Overrides (`theme.components`)
   4. Stable `refractor-<kebab-name>` class + `data-*` state reflection via `themeProps()` + non-clobbering `className`/`style` merge via `mergeProps()`
   5. Swizzle ejection via `@refractor-ui/cli swizzle <Name>`
4. **Package Subpath Exports:**
   `packages/core/package.json` MUST expose `.` plus individual subpath exports (`./<ComponentName>`, `./BaseProps`, `./naming`, `./theme`, `./refractor.css`, `./reset.css`) synchronized by `scripts/sync-exports.mjs` and verified by `scripts/check-repo.mjs`.

## 3. Enforcement

- `node scripts/check-repo.mjs` fails CI if any component folder lacks `.tsx`, `.doc.mjs`, `.test.tsx`, or `index.ts`, or if `packages/core/src/index.ts` / `package.json` exports drift.
- `@refractor/require-base-props`, `@refractor/require-ref-prop`, `@refractor/no-classname-clobber`, and `@refractor/no-internal-barrel-import` enforce component API shape at lint time.

## 4. Consequences

- Consumers get full tree-shaking, predictable React 19 `ref` forwarding, zero styling lock-in, and Open-Internals-grade agent discoverability.
- Adding a new component requires authoring its `.doc.mjs` and `.test.tsx` atomically alongside `.tsx`, preventing undocumented or untested components from ever landing.
