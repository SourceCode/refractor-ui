# Security Policy

## Supported Versions

We adhere strictly to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html). Security updates are actively delivered for the latest `1.x` minor release line.

| Version | Supported |
| ------- | --------- |
| `1.x`   | Yes       |
| `< 1.0` | No        |

## Built-In Security Invariants

Refractor Glass UI enforces defense-in-depth at both lint time and runtime:

- **Zero Unsafe HTML Injection (`@refractor/no-dangerous-html`):** Components never render unsanitized HTML via `dangerouslySetInnerHTML`. `RichTextEditor` passes all content, links, and image sources through the strict allowlist sanitizer in `packages/core/src/utils/sanitize.ts`.
- **URL Protocol Allowlisting:** Only `http:`, `https:`, `mailto:`, and relative paths are accepted for user-supplied links and media sources; `javascript:`, `vbscript:`, and `data:text/html` URIs are stripped.
- **CSV / Excel Formula Injection Defense:** `AdvancedDataGrid` exports neutralize leading formula metacharacters (`=`, `+`, `-`, `@`, `\t`, `\r`) via `sanitizeCsvCell()`.
- **Prototype Pollution Immunity:** Dynamic grouping maps in `PivotTable`, `AdvancedDataGrid`, and `VisualQueryBuilder` use ES `Map` instances rather than unguarded plain-object indexing (`__proto__`, `constructor`, `prototype` safe).
- **CLI Path Traversal Guard:** `@refractor-ui/cli swizzle` strictly rejects relative traversal segments (`..`) and resolves output targets inside the canonical destination directory.

## Reporting a Vulnerability

Please **do not** open public GitHub issues for security vulnerabilities. Report suspected vulnerabilities privately through GitHub Security Advisories for `SourceCode/glass-ui-v1`. We acknowledge reports within 48 hours and target remediated SemVer `PATCH` releases promptly.
