# `@refractor-ui/cli`

Agent-ready command-line interface for **Refractor Optical Glass UI Kit** — inspect documentation, browse all 75 components across 12 categories, explore optical theme presets, eject source code via `swizzle`, and run strict structural checks.

- **Live Docs:** https://sourcecode.github.io/refractor-ui/#/cli
- **Repository:** https://github.com/SourceCode/refractor-ui

## Usage

```bash
# Show usage help
npx @refractor-ui/cli help

# Browse all 75 components grouped across 12 canonical categories
npx @refractor-ui/cli component --list

# Inspect props, accessibility & usage (compact --dense mode for AI coding agents)
npx @refractor-ui/cli component PrimaryButton --dense
npx @refractor-ui/cli component AdvancedDataGrid --detail full

# Read architecture, token & theming guides
npx @refractor-ui/cli docs theme --dense

# List & inspect official optical theme presets
npx @refractor-ui/cli theme list
npx @refractor-ui/cli theme inspect amethyst

# Eject component source into your repo with clean @refractor-ui/core imports
npx @refractor-ui/cli swizzle PrimaryButton --out src/components/ui

# Verify monorepo invariants, SemVer lockstep, and zero any/unknown
npx @refractor-ui/cli check --strict
```
