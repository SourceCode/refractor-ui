# Refractor Optical Glass UI Kit — Repository Guidance (AGENTS.md)

This `AGENTS.md` is the canonical, tool-agnostic instruction surface for AI coding agents and human contributors working in **Refractor Optical Glass UI Kit** (`@refractor-ui/*`).

## Architectural Blueprint (Astryx-Aligned)

Refractor adopts the exact component architecture and engineering discipline of Meta's Astryx design system (`https://astryx.atmeta.com/`):

- **Monorepo Layout:**
  - `packages/core` (`@refractor-ui/core`): Production React 19 optical-glass component library, `BaseProps`, `themeProps`, `mergeProps`, `naming`, dual MUI+Astryx theme engine, and `refractor.css` token stylesheet.
  - `packages/themes/*`: Pre-built cascade optical themes (`alabaster`, `obsidian`, `amethyst`, `emerald-tide`, `solar-prism`).
  - `packages/cli` (`@refractor-ui/cli`): Agent-ready CLI (`docs`, `component`, `theme`, `swizzle`, `check`).
  - `apps/docs` (`@refractor-ui/docs`): Interactive Optical Workbench playground & live MUI-style Theme Customizer.
  - `internal/eslint-plugin-refractor`: Custom AST ESLint rules enforcing Astryx contracts and zero `any`/`unknown`.
  - `docs/adr/`: Authoritative Architecture Decision Records (`ADR-0001` through `ADR-0006`).

## Non-Negotiable Coding Rules

1. **Per-Component Directory Structure:** Every component MUST reside in `packages/core/src/<ComponentName>/` with:
   - `<ComponentName>.tsx` — React 19 component (`ref` in props, NEVER `forwardRef`), extends `BaseProps<Element>`, sets `displayName`, uses `themeProps()` + `mergeProps()`, zero raw color literals, IME-safe keydown (`!e.nativeEvent.isComposing`), keyboard-only focus rings (`:focus-visible`).
   - `<ComponentName>.doc.mjs` — Machine-readable documentation block consumed by `@refractor-ui/cli` and docs tooling.
   - `<ComponentName>.test.tsx` — Deep Vitest + Testing Library suite with positive, negative, and adversarial tests.
   - `index.ts` — Barrel export + extensible TypeScript variant map where applicable.
2. **Zero `any` and Zero `unknown` Types:** Enforced by `@typescript-eslint/no-explicit-any`, `@refractor/no-unknown-type`, and `scripts/check-repo.mjs`. Always define concrete interfaces, discriminated unions, or generic constraints.
3. **Two-Tier Linting:**
   - Local human dev: `pnpm lint` (recommended mode).
   - CI & AI agents: `pnpm lint:strict` (`REFRACTOR_STRICT_LINT=1` — every rule is an error).
4. **Escalation Path (Open Internals):**
   1. Typed Props
   2. Theme Tokens (`createPrismTheme` MUI-style palette/typography/shape/optics OR `defineTheme`)
   3. Theme Component Overrides (`theme.components`)
   4. Stable `refractor-*` classes & `className` / `xstyle` composition
   5. Swizzle (`node packages/cli/bin/refractor.mjs swizzle <Name>`)
5. **Coverage & Security Gate:**
   - Global & per-metric coverage MUST remain **>= 93%** (statements, branches, functions, lines).
   - Never use unsanitized HTML, regex-injection patterns, raw CSV exports without `sanitizeCsvCell`, or plain-object dynamic key indexing susceptible to prototype pollution.
6. **SemVer 2.0.0 & Pinnacle Release-First Workflow:**
   - Track all epics, releases, and tickets in Pinnacle project `RGU` on `nemesis` (`http://192.168.86.68:4201`).
   - Keep `package.json`, `packages/*/package.json`, `CHANGELOG.md`, and Git tags strictly aligned to SemVer 2.0.0.

## Agent Bootstrap Commands

```bash
node packages/cli/bin/refractor.mjs help
node packages/cli/bin/refractor.mjs component --list
node packages/cli/bin/refractor.mjs component PrimaryButton --dense
pnpm check:repo
pnpm lint:strict
pnpm typecheck
pnpm test:coverage
pnpm build
```
