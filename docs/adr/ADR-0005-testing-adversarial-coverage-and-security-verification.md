# ADR-0005: 93%+ Unit Test Coverage, Adversarial Validation & Security Invariants

- **Status:** Accepted
- **Date:** 2026-11-20
- **Decision Makers:** Refractor Security & Quality Engineering
- **Applies To:** All packages and components in `@refractor-ui/*`

---

## 1. Context

Enterprise UI primitives such as rich text editors, data grids with CSV export, pivot tables, visual query builders, code editors, and CLI swizzlers directly process untrusted user input. Happy-path smoke tests are insufficient to catch XSS injection, formula injection, prototype pollution, ReDoS, or DOM crashes under malformed inputs.

## 2. Directives (Mandatory Invariants)

1. **Mandatory >= 93% V8 Coverage Floor (`vitest.config.ts`):**
   - Vitest `@vitest/coverage-v8` MUST enforce `thresholds: { statements: 93, branches: 93, functions: 93, lines: 93 }`.
   - Builds and releases MUST fail if any of the four metrics drops below 93%.
2. **Three-Pillar Testing Standard for Every Component (`<Name>.test.tsx`):**
   - **Positive Tests:** Happy-path interactions, controlled & uncontrolled modes, keyboard navigation, ARIA roles/attributes, React 19 `ref` forwarding, `className`/`style` merge without clobber, `data-*` passthrough, and theme customization.
   - **Negative Tests:** Disabled states, empty arrays/datasets, out-of-range numeric values, missing optional callbacks, invalid selections, and Escape/outside-click dismissals.
   - **Adversarial Tests:** XSS payload strings (`<script>alert(1)</script>`, `<img src=x onerror=alert(1)>`, `javascript:alert(1)`), prototype pollution keys (`__proto__`, `constructor`, `prototype`), CSV formula payloads (`=CMD|' /C calc'!A0`, `+1+1`, `@SUM(1+1)`), NaN/Infinity/negative geometry inputs, IME composition events (`isComposing: true`), and high-volume/extreme-length inputs.
3. **Runtime Security Primitives (`packages/core/src/utils/sanitize.ts`):**
   - `sanitizeHtml(input)`: Strict allowlist parser removing `<script>`, `<iframe>`, `<object>`, `<style>`, `on*` event attributes, and unsafe URLs.
   - `sanitizeUrl(url)`: Allows only `http:`, `https:`, `mailto:`, `#`, and relative `/`; rejects `javascript:`, `vbscript:`, `data:text/html`.
   - `sanitizeCsvCell(value)`: Neutralizes leading `=`, `+`, `-`, `@`, `\t`, `\r` formula triggers and properly escapes RFC 4180 quotes.
   - Dynamic key aggregation in `PivotTable`, `AdvancedDataGrid`, and `VisualQueryBuilder` MUST use `Map` (never unguarded `obj[userKey]`).
   - `@refractor-ui/cli swizzle` MUST validate component names against an exact allowlist and forbid `..` path traversal.

## 3. Enforcement

- `pnpm test:coverage` enforces the >= 93% floor automatically.
- `packages/core/src/__tests__/security.adversarial.test.tsx` runs dedicated cross-component security regressions.
- `.github/workflows/ci.yml` executes `pnpm audit --audit-level=high`.

## 4. Consequences

- High-confidence refactoring across all 75 components with verified immunity against common frontend security vulnerabilities.
