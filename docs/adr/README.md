# Architecture Decision Records (ADRs)

This directory contains the authoritative Architecture Decision Records governing maintenance, architecture, quality enforcement, theming, security, and release management for **Refractor Optical Glass UI Kit** (`@refractor-ui/*`).

Every human engineer and autonomous AI coding agent contributing to this repository **MUST** obey all `Accepted` ADRs below.

| ADR | Title | Status | Enforcement |
| :--- | :--- | :--- | :--- |
| [ADR-0001](./ADR-0001-monorepo-and-astryx-component-architecture.md) | Monorepo Hierarchy & Astryx-Aligned Component Architecture | Accepted | `scripts/check-repo.mjs`, `eslint-plugin-refractor` |
| [ADR-0002](./ADR-0002-strict-typescript-zero-any-unknown-and-lint-governance.md) | Strict TypeScript (Zero `any`/`unknown`) & Two-Tier Astryx Lint Governance | Accepted | `eslint.config.js`, `tsconfig.json`, `pnpm lint:strict` |
| [ADR-0003](./ADR-0003-dual-mui-astryx-optical-theming-and-token-cascade.md) | Dual MUI + Astryx Optical Glass Theme Engine & CSS Custom Property Cascade | Accepted | `packages/core/src/theme/`, `@refractor/no-raw-color` |
| [ADR-0004](./ADR-0004-semantic-versioning-and-release-workflow.md) | Semantic Versioning 2.0.0, Keep a Changelog & Release Governance | Accepted | `.github/ci-templates/release.yml`, `CHANGELOG.md`, `scripts/check-repo.mjs` |
| [ADR-0005](./ADR-0005-testing-adversarial-coverage-and-security-verification.md) | 93%+ Unit Test Coverage, Adversarial Validation & Security Invariants | Accepted | `vitest.config.ts`, `utils/sanitize.ts`, CI security audit |
| [ADR-0006](./ADR-0006-accessibility-and-optical-glass-design-standards.md) | Accessibility Contracts & Creative UX/UI Director 9.8/10+ Optical Glass Standard | Accepted | `docs/reviews/ux-ui-director-audit.md`, ARIA/keyboard rules |
