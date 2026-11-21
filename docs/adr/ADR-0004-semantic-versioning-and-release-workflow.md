# ADR-0004: Semantic Versioning 2.0.0, Keep a Changelog & Release Governance

- **Status:** Accepted
- **Date:** 2026-11-21
- **Decision Makers:** Refractor Release Engineering
- **Applies To:** All versions, commits, Git tags, GitHub Releases, and `CHANGELOG.md`

---

## 1. Context

A public open-source UI kit must provide rock-solid upgrade guarantees to downstream applications while keeping every workspace package, documentation site, changelog entry, and Git tag strictly synchronized.

## 2. Directives (Mandatory Invariants)

1. **Strict Semantic Versioning 2.0.0 (`https://semver.org/spec/v2.0.0.html`):**
   - Every release uses exact `MAJOR.MINOR.PATCH` versioning (e.g., `1.0.0`, `1.1.0`, `1.1.1`).
   - `MAJOR`: Breaking public API or CSS contract removals/changes.
   - `MINOR`: Backward-compatible new components, theme presets, props, or CLI features.
   - `PATCH`: Backward-compatible defect fixes, contrast/a11y refinements, or security remediations.
   - Root `package.json`, `packages/core/package.json`, `packages/cli/package.json`, `packages/themes/*/package.json`, `apps/docs/package.json`, and `internal/eslint-plugin-refractor/package.json` MUST remain synchronized in lockstep.
2. **Keep a Changelog 1.1.0 (`CHANGELOG.md`):**
   - Every release MUST have a dated `## [X.Y.Z] - YYYY-MM-DD` section grouped by `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`, plus comparison links at the bottom of `CHANGELOG.md`.
3. **Verified Release Workflow:**
   - Before cutting any tag `vX.Y.Z`, all verification gates (`pnpm check:repo`, `pnpm lint:plugin`, `pnpm lint:strict`, `pnpm typecheck`, `pnpm test:coverage >= 93%`, `pnpm build`, `pnpm build:pages`, and `pnpm audit --audit-level=high`) MUST exit 0.
   - Publish an annotated Git tag `vX.Y.Z`, create the matching GitHub Release with structured notes, and update the GitHub Pages documentation site (`gh-pages`).

## 3. Enforcement

- `.github/ci-templates/release.yml` verifies tag version matches `package.json`, `packages/core/package.json`, and `CHANGELOG.md`.
- `scripts/check-repo.mjs` validates SemVer 2.0.0 format, workspace version lockstep, and `CHANGELOG.md` coverage on every commit.

## 4. Consequences

- Consumers can safely pin `^1.0.0` knowing every `1.x` minor release adds new optical components without breaking existing imports.
- Public releases, npm packages, and GitHub Pages documentation remain 100% auditable and synchronized.
