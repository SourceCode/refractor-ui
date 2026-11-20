# ADR-0004: Semantic Versioning 2.0.0, Keep a Changelog & Pinnacle Release-First Workflow

- **Status:** Accepted
- **Date:** 2026-11-20
- **Decision Makers:** Refractor Release Engineering
- **Applies To:** All versions, commits, Git tags, `CHANGELOG.md`, and Pinnacle `RGU` backlog items

---

## 1. Context

A reusable enterprise UI kit must provide rock-solid upgrade guarantees to downstream applications while maintaining full audit traceability from planned requirements to tested, tagged releases.

## 2. Directives (Mandatory Invariants)

1. **Strict Semantic Versioning 2.0.0 (`https://semver.org/spec/v2.0.0.html`):**
   - Every release uses exact `MAJOR.MINOR.PATCH` versioning (e.g., `1.0.0`, `1.1.0`, ..., `1.7.0`).
   - `MAJOR`: Breaking public API or CSS contract removals/changes.
   - `MINOR`: Backward-compatible new components, theme presets, props, or CLI features.
   - `PATCH`: Backward-compatible defect fixes, contrast/a11y refinements, or security remediations.
   - Root `package.json`, `packages/core/package.json`, `packages/cli/package.json`, `packages/themes/*/package.json`, and `apps/docs/package.json` MUST remain synchronized to the active release version.
2. **Keep a Changelog 1.1.0 (`CHANGELOG.md`):**
   - Every release MUST have a dated `## [X.Y.Z] - YYYY-MM-DD` section grouped by `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, and `Security`, plus comparison links at the bottom of `CHANGELOG.md`.
3. **Pinnacle Release-First & Backlog-Driven Workflow (`RGU` on `nemesis`):**
   - Before writing feature code, the target SemVer release (`X.Y.Z`, no leading `v`), Feature Epic(s), and AI-agent-optimized Tickets (with file-level specs, >= 2 acceptance criteria, and >= 2 validation criteria) MUST exist in Pinnacle project `RGU` (`http://192.168.86.68:4201`).
   - Upon passing every verification gate (`check:repo`, `lint:strict`, `typecheck`, `test:coverage >= 93%`, `build`), verify criteria, record engineering evidence on each ticket, transition tickets to `Done`, complete epics, commit cleanly with conventional commit messages, create annotated Git tag `vX.Y.Z`, and push to GitHub.

## 3. Enforcement

- `.github/workflows/release.yml` verifies tag version matches `package.json`, `packages/core/package.json`, and `CHANGELOG.md`.
- `scripts/check-repo.mjs` validates SemVer 2.0.0 format and workspace version lockstep.

## 4. Consequences

- Consumers can safely pin `^1.0.0` knowing every `1.x` minor release adds new optical components without breaking existing imports.
- Pinnacle `RGU` and GitHub history remain 100% auditable end-to-end.
