# Changelog

All notable changes to **Refractor Optical Glass UI Kit** (`@refractor-ui/*`) are documented in this file.

The format is based on [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/),
and this project adheres strictly to [Semantic Versioning 2.0.0](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.20.0] - 2026-11-21

### Added
- **Chart Chrome & Interactive Controls (4 new token-driven optical-glass chart chrome primitives — 179 total across 32 categories):**
  - `InteractiveLegend`: Clickable & solo-capable series key legend supporting show/hide visibility, double-click/button solo isolation, hover/focus highlight handoff, and `Show All` reset.
  - `BrushRangeScrubber`: Miniature overview sparkline with dual keyboard/pointer brush handles, draggable selection pan window, `All`/`Last 50%`/`Last 25%` zoom presets, and live range slice readout.
  - `ChartCrosshairTooltip`: Multi-series SVG plot inspector with snapping vertical & horizontal dashed crosshair guides, click/Enter pin locking, delta calculations, and edge-safe glassmorphic floating readout.
  - `ChartThresholdMarker`: Interactive chart annotation overlay rendering shaded target SLA bands, horizontal dashed threshold lines with breach counts, and clickable pinned vertical event flags.
- Updated `apps/docs` GitHub Pages portal, `README.md`, package READMEs, CLI architecture metadata, security adversarial suite, and UX/UI Director audit report for the complete **179-component / 32-category** `v1.20.0` release.

## [1.19.0] - 2026-11-21

### Added
- **Geospatial & Map Visuals (3 new token-driven optical-glass map visualizations — 175 total across 31 categories):**
  - `ChoroplethMap`: Stylized vector regional choropleth map shading polygons along an optical `--prism-*` opacity ramp with sanitized custom SVG paths, `Low -> High` legend, and regional share telemetry.
  - `PointClusterMap`: Zoomable equirectangular lat/lng vector map dynamically grouping dense markers into numbered optical cluster bubbles that expand into individual pins on click or zoom (`1×`–`4×`).
  - `GeoFlowArcMap`: Origin-destination hub vector map plotting proportional quadratic-bezier curved flow arcs with directional midpoint arrows, route highlighting, and hub inbound/outbound inspection.
- Added interactive playground demos and prop specs in `apps/docs` under `Geospatial & Map Visuals`.

## [1.18.0] - 2026-11-21

### Added
- **KPI, Progress & Telemetry Visuals (4 new token-driven optical-glass monitoring visualizations — 172 total across 30 categories):**
  - `RadialGauge`: Configurable `180°` / `270°` optical SVG speedometer gauge with interactive threshold bands, radial target tick, tapered needle, and ARIA `role="meter"` semantics.
  - `BulletChart`: Compact horizontal bullet chart overlaying actual value bars and target threshold markers over 3 qualitative range bands with variance badges and band telemetry.
  - `CalendarHeatmap`: Pure UTC day-by-day calendar activity heatmap with 5-level optical intensity ramp, streak/total summary pills, and prototype-safe date aggregation.
  - `LiveTelemetryChart`: Continuously scrolling real-time SVG stream chart with `LIVE`/`PAUSED` snapshot freeze, rolling `20`/`40`/`60` sample window, warning threshold line, and live stats strip.
- Added interactive playground demos and prop specs in `apps/docs` under `KPI, Progress & Telemetry Visuals`.

## [1.17.0] - 2026-11-21

### Added
- **Relational & Flow Visuals (3 new token-driven optical-glass relational visualizations — 168 total across 29 categories):**
  - `SankeyDiagram`: Multi-stage proportional flow diagram with cubic-bezier ribbons, stage column layout, ribbon highlighting, and inflow/outflow node telemetry.
  - `NetworkForceGraph`: Deterministic seeded force-directed node-link topology graph with cluster group filter pills, zoom controls (`0.75×`–`2×`), and direct-neighbor highlight inspector.
  - `ChordDiagram`: Circular bi-directional flow diagram plotting proportional quadratic-bezier chords between perimeter entities with entity isolation and inbound/outbound telemetry.
- Added interactive playground demos and prop specs in `apps/docs` under `Relational & Flow Visuals`.

## [1.16.0] - 2026-11-21

### Added
- **Statistical & Distribution Visuals (5 new token-driven optical-glass analytical charts — 165 total across 28 categories):**
  - `ScatterBubblePlot`: X/Y correlation scatter & 3-variable bubble chart with group filters, optional midpoint quadrant guides, and point inspection readout.
  - `HistogramChart`: Continuous frequency distribution histogram with configurable bin count (`2..24`), dashed Mean/Median markers, and bin inspection.
  - `BoxWhiskerPlot`: Tukey 1.5×IQR statistical glyph chart visualizing min, Q1, median, Q3, max whiskers, and outlier points per series.
  - `MatrixHeatmap`: Prototype-safe 2D row × column intensity grid shaded via `--prism-*` optical opacity ramp with interactive cell telemetry.
  - `RadarSpiderChart`: Multi-axis radiating polygon web overlaying multi-variable entity profiles with interactive series toggles and axis comparison.
- Added interactive playground demos and prop specs in `apps/docs` under `Statistical & Distribution Visuals`.

## [1.15.0] - 2026-11-21

### Added
- **Part-to-Whole & Hierarchical Visuals (5 new token-driven optical-glass SVG visualizations — 160 total across 27 categories):**
  - `DonutPieChart`: Proportional SVG donut & pie chart with center headline readout, slice selection, Donut/Pie toggle, and percentage share legend.
  - `TreemapChart`: Space-filling binary-partitioned treemap sizing tiles proportionally and tinting semantically by positive/negative change delta.
  - `SunburstChart`: Multi-layered radial ring hierarchy with click-to-zoom sub-category drill-down, interactive breadcrumb trail, and Reset Zoom.
  - `FunnelChart`: Progressively narrowing optical conversion funnel surfacing overall conversion and stage-to-stage drop-off telemetry.
  - `WaterfallChart`: Floating P&L bridge chart connecting starting baseline, positive/negative deltas, and closing total with dashed running-total connectors.
- Added interactive playground demos and prop specs in `apps/docs` under `Part-to-Whole & Hierarchical Visuals`.

## [1.14.0] - 2026-11-21

### Added
- **Core & Trend Charts (5 new token-driven optical-glass SVG chart components — 155 total across 26 categories):**
  - `LineMultiSeriesChart`: Multi-series smooth/linear SVG line chart with dashed reference support, interactive series toggles, and point inspection readout.
  - `AreaStackedChart`: Luminous optical gradient area and cumulative stacked area chart with Stacked/Overlay switcher and index breakdown readout.
  - `BarColumnChart`: Vertical column and horizontal bar chart supporting grouped and stacked layouts with interactive bar focus.
  - `ComboDualAxisChart`: Dual Y-axis SVG chart overlaying left-axis volume bars with a right-axis percentage/rate trend line.
  - `SparklineChart`: Compact axis-free inline `line` and `bar` sparkline embeddable in tables/KPI cards with endpoint dots and percentage delta badge.
- Added interactive playground demos and prop specs in `apps/docs` under `Core & Trend Charts`.

## [1.13.0] - 2026-11-21

### Added
- **Complex Variations of Common Controls (7 new optical-glass components — 150 total across 25 categories):**
  - `TriStateCheckbox`: Accessible tri-state checkbox (`unchecked`/`checked`/`indeterminate`) syncing native DOM `indeterminate` and optional selection ratio pill.
  - `DualThumbSlider`: Optical dual-handle range slider enforcing min/max bounds and minimum separation across pointer and keyboard controls.
  - `HistogramRangeSlider`: Dual-thumb range slider layered over an optical SVG frequency histogram shading active bins and matched counts.
  - `CascadingSelect`: Multi-column hierarchical drill-down dropdown with breadcrumb readout and Clear control.
  - `CreatableCombobox`: Searchable optical combobox allowing users to pick existing options or create brand-new entries via IME-safe Enter.
  - `RichSelectionCards`: Large clickable optical tiles with icons, descriptions, and badges operating in single (`radio`) or multi (`checkbox`) modes.
  - `RotaryDial`: Circular drag-to-rotate 270° SVG knob control supporting pointer scrubbing, keyboard stepping, and double-click reset.
- Added interactive playground demos and prop specs in `apps/docs` under `Complex Variations of Common Controls`.

## [1.12.0] - 2026-11-21

### Added
- **Complex Button & Action Variations (5 new optical-glass components — 143 total across 24 categories):**
  - `ComboSplitButton`: Joined two-part optical action capsule pairing a default trigger body with an attached keyboard-navigable dropdown menu of secondary and destructive actions.
  - `HoldToConfirmButton`: Safety confirmation trigger requiring sustained pointer or keyboard hold while a live optical progress fill reaches 100%.
  - `StatefulAsyncButton`: Morphing action trigger cycling through Idle, Loading, Success, and Error states with duplicate-click protection and auto-reset.
  - `MultiStateCycleButton`: Single tactile button rotating through 3+ ordered states per click with semantic tone styling and step-dot indicators.
  - `SpeedDialButton`: Compact circular optical trigger fanning out secondary quick actions in stacked (`up`/`down`/`left`/`right`) or `radial` geometry.
- Added interactive playground demos and prop specs in `apps/docs` under `Complex Button & Action Variations`.

## [1.11.0] - 2026-11-21

### Added
- **Number, Currency & Formatted Type Fields (6 new optical-glass components — 138 total across 23 categories):**
  - `NumericStepper`: Accessible `role="spinbutton"` input flanked by `-`/`+` buttons with step clamping and Arrow/PageUp/PageDown/Home/End keyboard controls.
  - `ScrubbableNumberField`: Drag-to-scrub numeric field supporting Shift fine (0.1×) and Alt coarse (10×) pointer precision alongside direct keyboard input.
  - `CurrencyInput`: Thousands-separated decimal currency input paired with inline `USD`/`EUR`/`GBP`/`JPY`/`CAD`/`AUD` currency switching and dynamic decimal precision.
  - `MeasurementUnitInput`: Numeric field with attached unit switcher (`px`, `%`, `rem`, `ms`, `GB`, etc.) and optional linear unit conversion.
  - `InternationalPhoneInput`: Searchable country dial-code dropdown paired with region-adaptive phone masks and live E.164 readout.
  - `MaskedPatternInput`: Strict delimiter-inserting pattern input supporting IPv4, CIDR, MAC address, License Key, Tax ID presets, and custom patterns.
- Added interactive playground demos and prop specs in `apps/docs` under `Number, Currency & Formatted Type Fields`.

## [1.10.0] - 2026-11-21

### Added
- **Date, Time & Scheduling Fields (6 new optical-glass components — 132 total across 22 categories):**
  - `DateRangePicker`: Dual-calendar optical range selector with quick-select presets (`Last 7 Days`, `Last 30 Days`, `Month to Date`, `Last Quarter`) and auto-swapping bounds.
  - `CombinedDateTimePicker`: Unified month calendar grid paired with 12h/24h hour and minute controls in a single optical slab.
  - `DurationInput`: Structured days/hours/minutes/seconds stepper fields paired with linear-time natural shorthand parsing (`2h 30m`, `4d 12h`).
  - `RecurrenceBuilder`: Visual repeating-interval and 5-field cron schedule constructor with weekday pills, end conditions, and live human-readable summary.
  - `MonthQuarterYearPicker`: Zoomed-out period picker switching cleanly between Month, Quarter (`Q1`–`Q4`), and Decade Year grids.
  - `TimezoneSelector`: Searchable global IANA timezone dropdown displaying live UTC offsets and current local time via `Intl.DateTimeFormat`.
- Added interactive playground demos and prop specs in `apps/docs` under `Date, Time & Scheduling Fields`.

## [1.9.0] - 2026-11-21

### Added
- **Multi-Agent & Orchestration (4 new Astryx-standard optical-glass components — 126 total across 21 categories):**
  - `AgentRosterRail`: Horizontal strip or vertical sidebar rail listing specialized sub-agents with live status badges (`idle`/`thinking`/`tool`/`waiting`/`done`), current task, and keyboard arrow navigation.
  - `AgentExecutionTrace`: Optical waterfall timeline mapping LLM, tool, handoff, and retrieval spans with proportional latency bars, token totals, kind filters, and span detail inspector.
  - `HandoffDivider`: Optical conversation separator framing `fromAgent → toAgent` delegation badges, summary text, clickable artifact chips, and expandable literal payload inspection.
  - `ParallelComparisonView`: Side-by-side candidate output comparison grid with latency, token, and score badges, Select Winner highlighting, and Copy Winner clipboard confirmation.
- Expanded cross-component adversarial security suite (`packages/core/src/__tests__/security.adversarial.test.tsx`) to verify XSS, URL scheme sanitization, ANSI literal escaping, and prototype-pollution immunity across all 126 components.
- Updated GitHub Pages Documentation Portal, `README.md`, `@refractor-ui/core`, `@refractor-ui/cli`, and `docs/reviews/ux-ui-director-audit.md` for the full 126-component / 21-category catalog.

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

[Unreleased]: https://github.com/SourceCode/refractor-ui/compare/v1.20.0...HEAD
[1.20.0]: https://github.com/SourceCode/refractor-ui/compare/v1.19.0...v1.20.0
[1.19.0]: https://github.com/SourceCode/refractor-ui/compare/v1.18.0...v1.19.0
[1.18.0]: https://github.com/SourceCode/refractor-ui/compare/v1.17.0...v1.18.0
[1.17.0]: https://github.com/SourceCode/refractor-ui/compare/v1.16.0...v1.17.0
[1.16.0]: https://github.com/SourceCode/refractor-ui/compare/v1.15.0...v1.16.0
[1.15.0]: https://github.com/SourceCode/refractor-ui/compare/v1.14.0...v1.15.0
[1.14.0]: https://github.com/SourceCode/refractor-ui/compare/v1.13.0...v1.14.0
[1.13.0]: https://github.com/SourceCode/refractor-ui/compare/v1.12.0...v1.13.0
[1.12.0]: https://github.com/SourceCode/refractor-ui/compare/v1.11.0...v1.12.0
[1.11.0]: https://github.com/SourceCode/refractor-ui/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/SourceCode/refractor-ui/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/SourceCode/refractor-ui/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/SourceCode/refractor-ui/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/SourceCode/refractor-ui/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/SourceCode/refractor-ui/compare/v1.5.0...v1.6.0
[1.5.0]: https://github.com/SourceCode/refractor-ui/compare/v1.4.0...v1.5.0
[1.4.0]: https://github.com/SourceCode/refractor-ui/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/SourceCode/refractor-ui/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/SourceCode/refractor-ui/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/SourceCode/refractor-ui/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/SourceCode/refractor-ui/releases/tag/v1.0.0
