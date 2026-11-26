# Contributing to Refractor Optical Glass UI Kit

Thank you for contributing to **Refractor Optical Glass UI Kit** (`@refractor-ui/*`)! This repository follows the component architecture and quality standards pioneered by Refractor's Open-Internals design system, paired with MUI-ergonomic color & optical theme customization.

## Prerequisites

- **Node.js:** `>= 24` (see `.nvmrc`)
- **pnpm:** `>= 11`
- **React:** `>= 19.0.0`

## Mandatory Governance Directives

Before submitting code, read all six Architecture Decision Records in [`docs/adr/`](./docs/adr/README.md) and [`AGENTS.md`](./AGENTS.md):

1. **Open-Internals Per-Component Setup (`ADR-0001`):** Every component lives in `packages/core/src/<ComponentName>/` containing `<Name>.tsx`, `<Name>.doc.mjs`, `<Name>.test.tsx`, and `index.ts`.
2. **Strict TypeScript — Zero `any` and Zero `unknown` (`ADR-0002`):** Neither `any` nor `unknown` is permitted anywhere in TypeScript source or test files. Define precise interfaces, discriminated unions, or generics.
3. **Two-Tier Open-Internals Linting (`ADR-0002`):** Local dev runs recommended warnings (`pnpm lint`). CI and AI agents MUST pass strict mode (`pnpm lint:strict` with `REFRACTOR_STRICT_LINT=1`).
4. **Dual-Mode Optical Theming (`ADR-0003`):** Never hardcode hex/RGB colors inside components. Consume `--prism-*` semantic tokens and `prism-*` optical glass surfaces so every component adapts seamlessly to `createPrismTheme()`, `defineTheme()`, dark mode, and custom palettes.
5. **Semantic Versioning 2.0.0 & Changelog Discipline (`ADR-0004`):** Follow SemVer 2.0.0 strictly, keep all workspace package manifests in lockstep, and update `CHANGELOG.md` (Keep a Changelog 1.1.0).
6. **93%+ Coverage & Adversarial Testing (`ADR-0005`):** Every PR must keep statement, branch, function, and line coverage at **>= 93%** with positive, negative, and adversarial tests (XSS payloads, prototype pollution, CSV formula injection, malformed inputs, IME composition).

## Local Development Workflow

```bash
pnpm install
pnpm dev              # Start interactive Optical Workbench docs site
pnpm check:repo       # Verify Open-Internals directory structure, exports & zero any/unknown
pnpm lint:plugin      # Run custom ESLint rule unit tests
pnpm lint:strict      # Run two-tier ESLint in strict error mode
pnpm typecheck        # Run strict TypeScript checks across all packages
pnpm test:coverage    # Run Vitest suite with >= 93% coverage gate
pnpm build            # Build packages/core and apps/docs
pnpm build:pages      # Verify GitHub Pages production bundle
```

## Pull Request Checklist

1. Reference the related GitHub issue (or open a Component Proposal issue first for new primitives).
2. Run `pnpm check:repo && pnpm lint:plugin && pnpm lint:strict && pnpm typecheck && pnpm test:coverage && pnpm build && pnpm build:pages`.
3. Verify light mode, dark mode, and custom palette rendering visually.
4. Update `CHANGELOG.md` under `## [Unreleased]`.
