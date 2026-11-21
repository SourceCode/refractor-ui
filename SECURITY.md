# Security Policy

## Supported Versions

We adhere strictly to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). Security updates are actively delivered for the latest `1.x` release line.

| Version | Supported |
| ------- | --------- |
| `1.x`   | Yes       |
| `< 1.0` | No        |

## Built-In Security Invariants

Refractor Optical Glass UI Kit enforces defense-in-depth at both lint time and runtime:

- **Zero Unsafe HTML Injection (`@refractor/no-dangerous-html`):** Components never render unsanitized HTML via `dangerouslySetInnerHTML`. `RichTextEditor` passes all content, links, and image sources through the strict allowlist sanitizer in `packages/core/src/utils/sanitize.ts`.
- **URL Protocol Allowlisting:** Only `http:`, `https:`, `mailto:`, relative paths, and (when explicitly allowed) safe raster data URIs are accepted; `javascript:`, `vbscript:`, `data:text/html`, and `data:image/svg+xml` URIs are stripped.
- **CSV / Excel Formula Injection Defense:** `AdvancedDataGrid` exports neutralize leading formula metacharacters (`=`, `+`, `-`, `@`, `\t`, `\r`) via `sanitizeCsvCell()`.
- **Prototype Pollution Immunity:** Dynamic grouping maps in `PivotTable`, `AdvancedDataGrid`, `VisualQueryBuilder`, and `GlobalSearchModal` use ES `Map` instances rather than unguarded plain-object indexing (`__proto__`, `constructor`, `prototype` safe).
- **CLI Path Traversal Guard:** `@refractor-ui/cli swizzle` strictly validates PascalCase component allowlists and rejects relative traversal segments (`..`) or null bytes.

## Reporting a Vulnerability

Please **do not** open public GitHub issues for security vulnerabilities. Report suspected vulnerabilities privately through [GitHub Security Advisories for `SourceCode/refractor-ui`](https://github.com/SourceCode/refractor-ui/security/advisories/new). We acknowledge reports within 48 hours and target remediated SemVer `PATCH` releases promptly.
