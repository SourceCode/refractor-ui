# ADR-0006: Accessibility Contracts & Creative UX/UI Director 9.8/10+ Optical Glass Standard

- **Status:** Accepted
- **Date:** 2026-11-20
- **Decision Makers:** Creative UX/UI Director & Accessibility Lead
- **Applies To:** All 75 UI components and `apps/docs` Optical Workbench

---

## 1. Context

Translucent and glassmorphic interfaces frequently fail accessibility and usability audits due to weak text contrast, inconsistent spacing, cluttered controls, or missing keyboard operability. Refractor proves that museum-grade refractive optical glass and strict WCAG 2.2 AA accessibility reinforce each other.

## 2. Directives (Mandatory Invariants)

1. **Optical Material Hierarchy (Fidelity to Reference Specimen):**
   - **Primary Emphasis (`.prism-btn-primary`):** Warm refractive capsule with top specular arc, subtle inner dark bottom bevel, and directional caustic drop glow. Reserved for primary CTAs and active selection badges.
   - **Secondary Emphasis (`.prism-btn-secondary` / `.prism-btn-cobalt`):** Ice-crystal or deep cobalt refractive glass pills.
   - **Structural Shells (`.prism-crystal` / `.prism-slab`):** Frosted translucent bezels and 24px optical slabs with crisp outer hairline, inner white bevel highlight, and warm+cool bottom-right edge caustics (`--prism-caustic-opacity`).
   - **Recessed Input Wells (`.prism-well`):** High-contrast inset frosted surfaces guaranteeing crisp >= 4.5:1 text legibility inside crystal frames.
   - **Active Toggles & Positive States (`.prism-emerald` + `.prism-thumb`):** Translucent emerald glass paired with tactile 3D porcelain thumb geometry.
2. **WCAG 2.2 AA & Keyboard Operability:**
   - All normal text MUST achieve >= 4.5:1 contrast; large text and non-text UI affordances >= 3:1 in both Light and Dark modes and across automatically derived MUI palette themes.
   - Every interactive control uses `:focus-visible` keyboard-only focus outlines (`@refractor/focus-outline-keyboard-only`), never traps focus unintentionally, honors `prefers-reduced-motion: reduce`, and uses semantic ARIA roles (`dialog`, `menu`, `listbox`, `tablist`, `separator`, `tree`, `grid`, `progressbar`, `status`, `alert`, `tooltip`).
   - Every drag-and-drop or pointer interaction (`WindowSplitter`, `DockablePanel`, `KanbanBoard`, `SortableList`, `ColorPicker`, `NodeGraphCanvas`) MUST provide an equivalent full keyboard workflow.
3. **Creative UX/UI Director Quality Rubric (>= 9.8 / 10 Gate):**
   Every component is visually inspected in a live browser and scored out of 10 across four equal dimensions:
   - **Composability (25%):** Clean slots, children/render props, controlled + uncontrolled ergonomics, seamless nesting inside cards/splitters/modals.
   - **Extendability (25%):** `BaseProps`, React 19 `ref`, `themeProps` (`refractor-*` + `data-*`), `mergeProps`, extensible variant maps, CSS variable hooks.
   - **Usability & Accessibility (25%):** Intuitive affordances, tabular numerals (`tabular-nums`), clear hover/active/disabled feedback, keyboard parity, zero overflow/clipping.
   - **Optical Glass Aesthetic Fidelity (25%):** Cohesive specular highlights, caustic dispersion balance, crisp typography hierarchy, and theme adaptability in Alabaster Light, Obsidian Dark, and custom palettes.
   Any component scoring below **9.8 / 10** MUST be refined and re-verified before release.

## 3. Enforcement

- Live browser visual inspection recorded in `docs/reviews/ux-ui-director-audit.md`.
- Automated accessibility & focus/hover/disabled lint rules in `internal/eslint-plugin-refractor`.

## 4. Consequences

- Every primitive—from a 36px `IconButton` to an enterprise `AdvancedDataGrid` or `NodeGraphCanvas`—shares one unmistakable, tactile optical-glass design language while remaining effortless to compose, theme, and navigate by keyboard.
