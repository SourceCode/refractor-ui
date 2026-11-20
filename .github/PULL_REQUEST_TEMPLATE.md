## Summary

<!-- Link the Pinnacle RGU ticket(s) and SemVer release version (e.g., RGU-12 / v1.1.0) -->

- **Pinnacle Ticket(s):** `RGU-`
- **Target SemVer Release:** `x.y.z`
- **Primary Intent:** Feature / Bugfix / Architecture / Docs

## Architectural & Astryx Contract Checklist

- [ ] Every new or updated component lives under `packages/core/src/<ComponentName>/` with `<Name>.tsx`, `<Name>.doc.mjs`, `<Name>.test.tsx`, and `index.ts`.
- [ ] Component extends `BaseProps<Element>`, accepts React 19 `ref` as a standard prop (no `forwardRef`), emits stable `refractor-*` classes via `themeProps()`, and merges caller `className`/`style` via `mergeProps()`.
- [ ] Zero `any` and zero `unknown` types in all TypeScript files.
- [ ] All colors and optical glass tokens are driven by CSS custom properties (`--prism-*`) and work in Light, Dark, and custom MUI-style palette themes.
- [ ] `CHANGELOG.md` updated following Keep a Changelog 1.1.0 & SemVer 2.0.0.
- [ ] Relevant ADRs in `docs/adr/` reviewed or updated.

## Verification Gates

- [ ] `pnpm check:repo` exits 0
- [ ] `pnpm lint:strict` exits 0
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test:coverage` passes with >= 93% statements, branches, functions, and lines (including positive, negative, and adversarial tests)
- [ ] `pnpm build` exits 0
- [ ] Visual review verified >= 9.8/10 across composability, extendability, usability, and optical glass fidelity
