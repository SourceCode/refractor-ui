# ADR-0002: Strict TypeScript (Zero `any`/`unknown`) & Two-Tier Open-Internals Lint Governance

- **Status:** Accepted
- **Date:** 2026-11-20
- **Decision Makers:** Refractor Principal Architecture
- **Applies To:** All `.ts`, `.tsx`, `.js`, and `.mjs` files across the monorepo

---

## 1. Context

Weak TypeScript escape hatches (`any` and `unknown`) erode static type predictability, mask runtime defects at component boundaries, and degrade AI coding agent reliability. Similarly, ad-hoc linting allows styling leaks, broken focus outlines, clobbered `className` props, unguarded IME keyboard events, and deprecated `forwardRef` usage to creep into the codebase.

## 2. Directives (Mandatory Invariants)

1. **Zero `any` and Zero `unknown` Policy:**
   - The TypeScript `any` type is **strictly forbidden** (`@typescript-eslint/no-explicit-any: 'error'`).
   - The TypeScript `unknown` type is **strictly forbidden** (`@refractor/no-unknown-type: 'error'`).
   - Developers and AI agents MUST model concrete interfaces, discriminated unions, or bounded generic constraints (`<T extends Record<string, string | number | boolean>>`, explicit payload unions, typed JSON value unions) rather than top-level wildcard types.
   - `tsconfig.json` enforces `"strict": true`, `"noUncheckedIndexedAccess": true`, `"noImplicitOverride": true`, and `"noFallthroughCasesInSwitch": true`.
2. **Two-Tier Open-Internals Linting Philosophy (`eslint.config.js`):**
   - **Recommended Mode (default local `pnpm lint`):** Surfaces advisory rules as warnings for ergonomic local iteration while keeping critical soundness/security/type rules as hard errors.
   - **Strict Mode (`REFRACTOR_STRICT_LINT=1` or `CI=true` via `pnpm lint:strict`):** Elevates every rule to `'error'`. AI coding agents and CI pipelines **MUST** pass `pnpm lint:strict` with 0 errors and 0 warnings.
3. **Custom Open-Internals-Equivalent Rule Set (`internal/eslint-plugin-refractor`):**
   - `@refractor/no-unknown-type`: Disallows `TSUnknownKeyword`.
   - `@refractor/require-base-props`: Public component props interfaces in `packages/core/src/*/` must extend `BaseProps`.
   - `@refractor/require-ref-prop`: Public components accept React 19 `ref` prop; forbids `React.forwardRef`.
   - `@refractor/require-baseprops-passthrough`: Root elements must spread merged base props.
   - `@refractor/no-classname-clobber`: Forbids overwriting a spread `className` with a literal `className`.
   - `@refractor/no-raw-color`: Forbids raw hex/rgb/hsl color literals in component source outside approved theme/colorMath modules.
   - `@refractor/no-hover-on-disabled` & `@refractor/disabled-cursor`: Prevents misleading hover/pointer affordances on disabled controls.
   - `@refractor/focus-outline-keyboard-only`: Prevents `:focus` outlines without `:focus-visible`.
   - `@refractor/no-unguarded-ime-keydown`: Requires checking `isComposing` on text-input `onKeyDown` handlers handling `Enter`/`Escape`.
   - `@refractor/no-prevent-default-in-passive-react-handler`: Forbids `preventDefault()` in passive `onWheel`/`onTouchStart`/`onTouchMove` handlers.
   - `@refractor/no-react-namespace-hooks`: Enforces direct named hook imports (`useState`, `useEffect`) rather than `React.useState`.
   - `@refractor/no-unstable-merged-refs`: Forbids inline callback ref compositions where `useMergedRefs` is required.
   - `@refractor/no-internal-barrel-import`: Prevents intra-package circular imports through `../index`.
   - `@refractor/require-table-section`: Enforces `<thead>`/`<tbody>` wrappers inside `<table>`.
   - `@refractor/boolean-prop-naming`: Encourages clear boolean prop conventions.
   - `@refractor/no-dangerous-html`: Forbids `dangerouslySetInnerHTML` outside explicitly audited sanitizer wrappers.

## 3. Enforcement

- Enforced by `pnpm lint:strict`, `pnpm typecheck`, `node scripts/check-repo.mjs`, and `.github/workflows/ci.yml`.
- Every custom ESLint rule is verified by positive and negative AST test cases in `internal/eslint-plugin-refractor/tests/plugin.test.mjs`.

## 4. Consequences

- Eliminates entire classes of styling, accessibility, IME, and type-safety regressions before review.
- Every external contributor and AI agent operates under identical machine-verifiable standards.
