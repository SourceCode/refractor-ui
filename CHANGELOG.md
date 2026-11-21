# Changelog

All notable changes to **Refractor Optical Glass UI Kit** (`@refractor-ui/*`) are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres strictly to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-11-21

### Added
- **Media, Audio & Spatial Controls (6 new Astryx-standard optical-glass components — 87 total across 14 categories):**
  - `CustomVideoPlayer`: Media container with timeline scrubber, clickable chapter markers, playback speed selector, volume/mute controls, live optical captions overlay, and fullscreen toggle.
  - `AudioWaveformPlayer`: Interactive sound-bar waveform player supporting click & keyboard scrubbing, play/pause, tabular time readout, and playback speed selector.
  - `MediaLightbox`: Fullscreen dark overlay & inline gallery viewer with zoom, drag-to-pan, filmstrip thumbnails, keyboard navigation, and strict URL allowlisting.
  - `BeforeAfterSlider`: Draggable and keyboard-accessible vertical optical comparison handle splitting before/after images or visual panes.
  - `InteractiveMapViewer`: Zoomable, pannable optical geographic canvas with custom pins, clustered markers, vector route polylines, and clickable info popups.
  - `Product360Viewer`: Drag-and-keyboard 360° orbit viewport with live angle telemetry, auto-spin, and token-driven isometric refractive geometry.
- Added interactive playground demos and prop specs in `apps/docs` under `Media, Audio & Spatial Controls`.

## [1.1.0] - 2026-11-21

### Added
- **AI & Conversational Interfaces (6 new Astryx-standard optical-glass components — 81 total across 13 categories):**
  - `ChatMessageStream`: Scrollable optical conversation log distinguishing user, assistant, and system turns with sanitized avatars, timestamps, streaming caret indicators, and Jump-to-Latest control.
  - `PromptComposer`: Expandable multi-line prompt input bar with attachment trigger, voice-to-text toggle, inline model selector, IME-safe Enter submission, and Stop generation toggle.
  - `ThinkingAccordion`: Collapsible optical reasoning trace displaying step statuses, tool names, elapsed durations, and live streaming indicator.
  - `CitationChip`: Inline optical source reference pill with rich preview popover and strict URL protocol sanitization.
  - `ResponseActionBar`: Generated-response utility bar with clipboard copy confirmation, regenerate, share, and mutually exclusive thumbs-up/down feedback.
  - `SplitArtifactCanvas`: Side-by-side optical conversation and live artifact workspace with version switcher, Preview/Source toggle, copy, download, and focus modes.
- Added interactive playground demos and prop specs in `apps/docs` under `AI & Conversational Interfaces`.

## [1.0.0] - 2026-11-21

Initial public General Availability release of **Refractor Optical Glass UI Kit** (`@refractor-ui/*`).

### Added
- **Astryx-Aligned Monorepo & Open-Internals Architecture:**
  - Modular `pnpm` monorepo (`packages/core`, `packages/themes/*`, `packages/cli`, `apps/docs`, `internal/eslint-plugin-refractor`, `scripts/`, `docs/adr/`, `docs/reviews/`).
  - Core primitives infrastructure: `BaseProps`, `naming` (`refractor-*` stable class namespace), `themeProps()` (`data-*` state reflection), `mergeProps()` (non-clobbering class/style composition), `composeEventHandlers`, `useMergedRefs`, `useControllableState`, `colorMath`, `sanitize`, `diffAlgorithm`, `dateGrid`, `@layer base` `reset.css`, and `@layer components` `refractor.css`.
- **Dual MUI + Astryx Optical Theme Engine & 5 Official Theme Presets:**
  - `createPrismTheme()` auto-deriving `light`, `dark`, WCAG `>= 4.5:1` `contrastText`, and RGB caustic channels from single hex colors.
  - `defineTheme()` supporting `extends`, `[light, dark]` token tuples, and `components` style overrides.
  - Official theme packages: `@refractor-ui/theme-alabaster`, `@refractor-ui/theme-obsidian`, `@refractor-ui/theme-amethyst`, `@refractor-ui/theme-emerald-tide`, and `@refractor-ui/theme-solar-prism`.
- **75 Accessible Astryx-Standard React 19 Components Across 12 Categories:**
  - **Buttons & Actions (6):** `PrimaryButton`, `SecondaryButton`, `IconButton`, `SegmentedControl`, `SplitButton`, `FloatingActionButton`.
  - **Form Inputs & Selection Controls (11):** `TextInput`, `TextArea`, `SearchWithSuggestions`, `DropdownSelect`, `Checkbox`, `RadioGroup`, `ToggleSwitch`, `RangeSlider`, `DateTimePicker`, `FileDropzone`, `RatingControl`.
  - **Navigation (7):** `TopNavBar`, `SidebarDrawer`, `PrismTabs`, `Breadcrumbs`, `Pagination`, `Stepper`, `CommandPalette`.
  - **Data Display & Content (12):** `PrismCard`, `DataTable`, `PrismList`, `Avatar`, `BadgeStatus`, `TagChip`, `Accordion`, `CarouselSlider`, `TreeView`, `Timeline`, `CalendarView`, `OpticalCharts`.
  - **Feedback & System Status (5):** `ToastSnackbar`, `AlertBanner`, `ProgressAndSpinner`, `SkeletonLoader`, `EmptyState`.
  - **Overlays & Popups (5):** `ModalDialog`, `ContextualPopover`, `Tooltip`, `ContextMenuDropdown`, `SlideOverSheet`.
  - **Layout & Workspace Controls (6):** `WindowSplitter`, `DockablePanel`, `MasterDetailView`, `VirtualizedList`, `MasonryGrid`, `StickyActionBar`.
  - **Advanced Data & Visualization (6):** `AdvancedDataGrid`, `PivotTable`, `KanbanBoard`, `GanttChart`, `DiffViewer`, `KpiMetricCard`.
  - **Advanced Search & Filtering (4):** `FacetedFilterBar`, `VisualQueryBuilder`, `MultiSelectCombobox`, `GlobalSearchModal`.
  - **Rich Input & Content Creation (6):** `RichTextEditor`, `CodeEditor`, `ColorPicker`, `InlineEditableField`, `ImageCropper`, `SignaturePad`.
  - **Interactive & Drag-and-Drop (3):** `TransferList`, `SortableList`, `NodeGraphCanvas`.
  - **Collaboration & Guidance (4):** `NotificationCenter`, `CommentThread`, `LivePresenceIndicator`, `ProductTour`.
- **Agent-Ready CLI (`@refractor-ui/cli`):**
  - Supports `help`, `docs [principles|tokens|theme|architecture|--list] [--dense]`, `component --list`, `component <Name> [--dense | --detail full]`, `theme list`, `theme inspect <preset>`, path-traversal-hardened `swizzle <Name> --out <dir>`, and `check --strict`.
- **Full GitHub Pages Documentation Portal (`apps/docs`):**
  - Interactive landing hero, Getting Started guide, Theming & Colors guide with live preset switching, CLI & Swizzle guide, Architecture & Security guide, Reference Specimen Board, Live MUI+Astryx Optical Theme Studio, hash-routed deep links, and interactive playgrounds for all 75 components.
- **Two-Tier Astryx ESLint Plugin & Quality / Security Certification:**
  - 17 custom AST rules enforcing Astryx contracts and strict zero `any` / zero `unknown` TypeScript governance (`internal/eslint-plugin-refractor`, 16/16 plugin tests).
  - Cross-component OWASP security & adversarial test suite (`packages/core/src/__tests__/security.adversarial.test.tsx`), `>= 93%` V8 coverage gate (`99.4%` statements, `97.5%+` branches, `99.9%` functions, `99.8%` lines), and `0` high/critical vulnerabilities.
  - Six directive ADRs (`docs/adr/ADR-0001`–`ADR-0006`) and Creative UX/UI Director live browser audit certifying all 75 components `>= 9.8/10` (`9.92/10` mean) in `docs/reviews/ux-ui-director-audit.md`.

[Unreleased]: https://github.com/SourceCode/refractor-ui/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/SourceCode/refractor-ui/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/SourceCode/refractor-ui/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/SourceCode/refractor-ui/releases/tag/v1.0.0
