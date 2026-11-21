# Changelog

All notable changes to **Refractor Optical Glass UI Kit** (`@refractor-ui/*`) are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres strictly to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.8.0] - 2026-11-21

### Added
- **AI Context, Memory & Configuration (6 new Astryx-standard optical-glass components — 122 total across 20 categories):**
  - `ContextTokenMeter`: Segmented optical progress bar & SVG radial ring gauge tracking system/files/tools/history tokens against warning and critical thresholds.
  - `AttachedContextBar`: Horizontal removable context chip strip for files, folders, URLs, and snippets with token readouts and pin toggles.
  - `ModelParameterSwitcher`: Compact optical popover combining model selection with Web Search, Code Execution, Extended Thinking, and Temperature controls.
  - `MemoryPersonaInspector`: Inline or slide-over persistent memory catalog with Facts/Preferences/Rules filters, inline editing, Add, and Forget actions.
  - `ConnectedToolsDrawer`: MCP server & external tool directory with health status badges, permission scope pills, tool counts, and individual enable switches.
  - `ConfidenceIndicator`: Verified, high, moderate, and dashed needs-review confidence pill with expandable rationale popover and Mark Verified action.
- Added interactive playground demos and prop specs in `apps/docs` under `AI Context, Memory & Configuration`.

## [1.7.0] - 2026-11-21

### Added
- **AI Agent Execution & Control (7 new Astryx-standard optical-glass components — 116 total across 19 categories):**
  - `AgentPlanList`: Editable step-by-step agent roadmap with 5 lifecycle statuses (`pending`/`active`/`done`/`skipped`/`failed`) and refractive progress telemetry.
  - `ToolCallCard`: Collapsible tool execution card with category icon, status badge, elapsed duration, and structured key/value inputs & outputs.
  - `ApprovalGateCard`: Blocking Human-in-the-Loop confirmation card with semantic risk severity badge, editable parameters, and Approve / Edit & Approve / Reject actions.
  - `AgentControlBar`: Active-loop steering bar offering Pause/Resume, Stop/Abort, and IME-safe mid-flight Redirect prompt submission.
  - `CheckpointRollbackStrip`: Horizontal turn-snapshot selector displaying modified file counts with Rollback and Fork Conversation actions.
  - `InlineDiffReviewer`: Embedded diff reviewer grouping edits into hunks with per-hunk Accept/Reject, bulk Accept/Reject All, and literal escaped rendering.
  - `RecoveryRoutingCard`: Diagnostic failure banner with collapsible stack trace and targeted Retry / Edit / Switch / Skip recovery routes.
- Added interactive playground demos and prop specs in `apps/docs` under `AI Agent Execution & Control`.

## [1.6.0] - 2026-11-21

### Added
- **CLI & Terminal Surfaces (7 new Astryx-standard optical-glass components — 109 total across 18 categories):**
  - `TerminalEmulator`: Pure-React ANSI SGR tokenized shell emulator with Up/Down history, `Ctrl+L` clear, and zero `dangerouslySetInnerHTML`.
  - `CommandInputBar`: Monospace prompt input bar with Tab/ArrowRight inline ghost-text autocomplete and Up/Down command history.
  - `LiveLogStreamer`: Searchable live log feed with Debug/Info/Warn/Error severity filters, Follow/Pause toggle, and Jump-to-Bottom lock.
  - `CopyableCommandBlock`: Syntax-tokenized CLI strip with package-manager tab switching (`pnpm`/`npm`/`yarn`/`bun`) and clipboard confirmation.
  - `ProcessStatusPill`: Compact process lifecycle badge with elapsed duration, exit code, and conditional Stop/Retry actions.
  - `StructuredOutputViewer`: Strictly typed recursive `JsonValue` viewer switching between collapsible Tree, Table, and formatted Raw modes.
  - `TerminalMultiplexer`: Multi-session optical shell workspace with session tabs, side-by-side split panes, add/close controls, and per-pane prompts.
- Added interactive playground demos and prop specs in `apps/docs` under `CLI & Terminal Surfaces`.

## [1.5.0] - 2026-11-21

### Added
- **Mobile, Touch & System Utilities (5 new Astryx-standard optical-glass components — 102 total across 17 categories):**
  - `BottomNavigationBar`: Thumb-friendly horizontal destination bar with active indicator pill, clamped unread badge counters, keyboard arrow navigation, and `fixed`/`inline` modes.
  - `SwipeableActionRow`: Pointer/touch swipeable list row revealing semantic left/right quick-action trays with accessible keyboard reveal toggles.
  - `PullToRefresh`: Rubber-band top pull container with optical progress & spinner status plus accessible desktop Refresh button for sync/async reloads.
  - `KeycapBadge`: Sculpted crystal `<kbd>` shortcut chord indicator supporting `sm`/`md`/`lg` sizes and custom joiners.
  - `CookieConsentBanner`: Non-blocking `bar`/`card`/`inline` privacy banner with Accept All, Reject Non-Essential, expandable preference switches, locked Essential cookies, and URL-sanitized policy link.
- Added interactive playground demos and prop specs in `apps/docs` under `Mobile, Touch & System Utilities`.

## [1.4.0] - 2026-11-21

### Added
- **Commerce, Billing & Conversion (5 new Astryx-standard optical-glass components — 97 total across 16 categories):**
  - `PricingTierMatrix`: Multi-column optical pricing grid with Monthly/Annual billing toggle, savings pill, feature checklists, and highlighted Most Popular card.
  - `ProductVariantSelector`: Token-driven color swatches, size pills, and material chips with out-of-stock guards and live price calculation.
  - `ShoppingCartDrawer`: Slide-over & inline optical cart panel with quantity steppers, item removal, subtotal/discount/tax/total summary, and checkout CTA.
  - `PaymentCardInput`: Auto-formatting payment card input with automatic Visa/Mastercard/Amex/Discover brand detection, Luhn checksum validation, MM/YY expiry, and CVC.
  - `PromoCouponInput`: Compact coupon entry bar with Apply validation, inline error alert, and removable emerald discount badge.
- Added interactive playground demos and prop specs in `apps/docs` under `Commerce, Billing & Conversion`.

## [1.3.0] - 2026-11-21

### Added
- **Security, Auth & Account Management (5 new Astryx-standard optical-glass components — 92 total across 15 categories):**
  - `OtpCodeInput`: Individual 4–8 character verification wells with auto-advance, Backspace rewind, Arrow navigation, and multi-digit paste distribution.
  - `PasswordStrengthMeter`: Linear-time O(n) segmented optical progress bar and real-time complexity checklist.
  - `SecretKeyField`: Masked monospace credential display with Reveal/Hide toggle, clipboard copy confirmation, and optional Rotate action.
  - `RolePermissionsMatrix`: Prototype-safe RBAC checkbox grid with locked-role protection and column Select All.
  - `ActiveSessionsList`: Logged-in devices & geo-location panel with current-session badge, per-session Sign Out, and Sign Out All Others.
- Added interactive playground demos and prop specs in `apps/docs` under `Security, Auth & Account Management`.

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

[Unreleased]: https://github.com/SourceCode/refractor-ui/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/SourceCode/refractor-ui/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/SourceCode/refractor-ui/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/SourceCode/refractor-ui/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/SourceCode/refractor-ui/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/SourceCode/refractor-ui/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/SourceCode/refractor-ui/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/SourceCode/refractor-ui/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/SourceCode/refractor-ui/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/SourceCode/refractor-ui/releases/tag/v1.0.0
