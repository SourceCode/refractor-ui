import type { DocsCategoryFilter } from '../system/store';

export interface PropSpec {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}

export interface ComponentDocEntry {
  id: string;
  title: string;
  exportName: string;
  category: Exclude<DocsCategoryFilter, 'overview'>;
  categoryTitle: string;
  summary: string;
  codeSnippet: string;
  props: PropSpec[];
}

export interface CategoryMeta {
  id: Exclude<DocsCategoryFilter, 'overview'>;
  title: string;
  shortLabel: string;
  description: string;
}

export const DOC_CATEGORIES: CategoryMeta[] = [
  {
    id: 'buttons-actions',
    title: 'Buttons & Actions',
    shortLabel: 'Buttons',
    description: 'High-emphasis tangerine refractive capsules, cool crystal secondaries, segmented controls, and split triggers.',
  },
  {
    id: 'form-inputs',
    title: 'Form Inputs & Selection Controls',
    shortLabel: 'Inputs',
    description: 'Recessed frosted input wells inside crystal bezels, live search suggestions, emerald checkboxes, and liquid switches.',
  },
  {
    id: 'navigation',
    title: 'Navigation',
    shortLabel: 'Navigation',
    description: 'Wayfinding primitives from top crystal bars and collapsible drawers to keyboard-driven command palettes.',
  },
  {
    id: 'data-display',
    title: 'Data Display & Content',
    shortLabel: 'Data Display',
    description: 'Iridescent optical slab cards, sortable tabular grids, VFS tree explorers, calendars, and interactive SVG telemetry charts.',
  },
  {
    id: 'feedback-status',
    title: 'Feedback & System Status',
    shortLabel: 'Feedback',
    description: 'Warm-amber hairline toast pills, semantic banners, refractive progress bars, shimmer skeletons, and actionable empty states.',
  },
  {
    id: 'overlays-popups',
    title: 'Overlays & Popups',
    shortLabel: 'Overlays',
    description: 'Layered contextual glass popovers, modal dialogs, hover tooltips, right-click menus, and responsive slide-over sheets.',
  },
  {
    id: 'layout-workspace',
    title: 'Layout & Workspace Controls',
    shortLabel: 'Layout',
    description: 'Resizable refractive splitters, dockable floating panels, master-detail shells, 10k-row virtualized lists, masonry grids, and sticky bulk toolbars.',
  },
  {
    id: 'advanced-data',
    title: 'Advanced Data & Visualization',
    shortLabel: 'Data Viz',
    description: 'Enterprise inline-editable data grids, drag-and-drop pivot tables, Kanban workflow boards, Gantt schedulers, diff viewers, and KPI sparkline cards.',
  },
  {
    id: 'search-filtering',
    title: 'Advanced Search & Filtering',
    shortLabel: 'Search',
    description: 'Multi-criteria faceted filter bars, nested AND/OR visual query builders, multi-select token inputs, and multi-entity global search modals.',
  },
  {
    id: 'rich-input',
    title: 'Rich Input & Content Creation',
    shortLabel: 'Rich Input',
    description: 'XSS-sanitized WYSIWYG editors, syntax-highlighted code editors, HSV color pickers, inline editable fields, media croppers, and vector signature pads.',
  },
  {
    id: 'drag-and-drop',
    title: 'Interactive & Drag-and-Drop',
    shortLabel: 'Drag & Drop',
    description: 'Dual-listbox transfer controls, accessible sortable lists with grab handles, and infinite zoomable 2D node-graph flow canvases.',
  },
  {
    id: 'collaboration-guidance',
    title: 'Collaboration & Guidance',
    shortLabel: 'Collaboration',
    description: 'Real-time notification feeds, nested @mention discussion threads, live collaborator presence & cursors, and spotlight product tours.',
  },
  {
    id: 'ai-conversational',
    title: 'AI & Conversational Interfaces',
    shortLabel: 'AI Chat',
    description: 'Streaming message logs, expandable prompt composers, reasoning accordions, inline citation chips, response actions, and split artifact canvases.',
  },
  {
    id: 'media-spatial',
    title: 'Media, Audio & Spatial Controls',
    shortLabel: 'Media & 3D',
    description: 'Chapter-marked video players, audio waveform scrubbers, zoomable lightboxes, before/after comparison sliders, vector map viewers, and 360° orbit stages.',
  },
];

export const COMPONENT_REGISTRY: ComponentDocEntry[] = [
  /* ==================== BUTTONS & ACTIONS (6) ==================== */
  {
    id: 'primary-action-button',
    title: 'Primary Action Button',
    exportName: 'PrimaryButton',
    category: 'buttons-actions',
    categoryTitle: 'Buttons & Actions',
    summary: 'The main, highest-emphasis button on a screen used to trigger the primary goal such as starting a project or saving changes.',
    codeSnippet: `<PrimaryButton size="md" onClick={handleStart}>\n  Start project\n</PrimaryButton>`,
    props: [
      { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Controls capsule height and horizontal padding.' },
      { name: 'leadingIcon', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional icon rendered before the label.' },
      { name: 'disabled', type: 'boolean', defaultValue: 'false', description: 'Disables pointer interaction and dims optical glow.' },
    ],
  },
  {
    id: 'secondary-action-button',
    title: 'Secondary Action Button',
    exportName: 'SecondaryButton',
    category: 'buttons-actions',
    categoryTitle: 'Buttons & Actions',
    summary: 'A lower-emphasis cool crystal or cobalt refractive button paired with a primary button for alternative actions.',
    codeSnippet: `<SecondaryButton tone="crystal" onClick={handleCancel}>\n  Secondary\n</SecondaryButton>\n<SecondaryButton tone="cobalt">Pro plan</SecondaryButton>`,
    props: [
      { name: 'tone', type: "'crystal' | 'cobalt'", defaultValue: "'crystal'", description: 'Selects clear ice-blue crystal or deep cobalt glass.' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Matches PrimaryButton height scale.' },
    ],
  },
  {
    id: 'icon-only-button',
    title: 'Icon-Only Button',
    exportName: 'IconButton',
    category: 'buttons-actions',
    categoryTitle: 'Buttons & Actions',
    summary: 'A compact sculpted crystal squircle displaying only a universally understood symbol such as power, close, or add.',
    codeSnippet: `<IconButton aria-label="Toggle system power" onClick={togglePower}>\n  <Power className="w-5 h-5" />\n</IconButton>`,
    props: [
      { name: 'aria-label', type: 'string', defaultValue: 'required', description: 'Mandatory accessible name for screen readers.' },
      { name: 'active', type: 'boolean', defaultValue: 'false', description: 'Applies warm amber active ring state.' },
      { name: 'size', type: "'sm' | 'md' | 'lg'", defaultValue: "'md'", description: 'Squircle dimensions (36px, 48px, or 56px).' },
    ],
  },
  {
    id: 'button-group-segmented',
    title: 'Button Group / Segmented Control',
    exportName: 'SegmentedControl',
    category: 'buttons-actions',
    categoryTitle: 'Buttons & Actions',
    summary: 'A connected crystal row of buttons that lets users switch between closely related views or options in one place.',
    codeSnippet: `<SegmentedControl\n  value={view}\n  onChange={setView}\n  options={[\n    { value: 'preview', label: 'Preview' },\n    { value: 'tokens', label: 'Tokens' },\n    { value: 'specs', label: 'Specs' },\n  ]}\n/>`,
    props: [
      { name: 'options', type: 'SegmentOption[]', defaultValue: 'required', description: 'Array of value/label items.' },
      { name: 'value', type: 'string', defaultValue: 'required', description: 'Currently active segment value.' },
      { name: 'onChange', type: '(value: string) => void', defaultValue: 'required', description: 'Callback fired when a segment is pressed.' },
    ],
  },
  {
    id: 'split-button',
    title: 'Split Button',
    exportName: 'SplitButton',
    category: 'buttons-actions',
    categoryTitle: 'Buttons & Actions',
    summary: 'Combines a primary default action on the left with a refractive seam and dropdown trigger on the right for secondary actions.',
    codeSnippet: `<SplitButton\n  label="Deploy release"\n  onPrimaryClick={deployNow}\n  actions={[{ id: 'canary', label: 'Deploy Canary (10%)' }]}\n  onSelectAction={handleSecondary}\n/>`,
    props: [
      { name: 'label', type: 'string', defaultValue: 'required', description: 'Primary action button label.' },
      { name: 'actions', type: 'SplitActionItem[]', defaultValue: 'required', description: 'Dropdown menu options for secondary workflows.' },
      { name: 'tone', type: "'primary' | 'crystal'", defaultValue: "'primary'", description: 'Visual emphasis of the split capsule.' },
    ],
  },
  {
    id: 'floating-action-button',
    title: 'Floating Action Button (FAB)',
    exportName: 'FloatingActionButton',
    category: 'buttons-actions',
    categoryTitle: 'Buttons & Actions',
    summary: 'A circular or extended elevated glass button that hovers above content for quick access to a primary creation action.',
    codeSnippet: `<FloatingActionButton\n  aria-label="Create new component"\n  onClick={createItem}\n/>`,
    props: [
      { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Renders an extended pill FAB when provided.' },
      { name: 'tone', type: "'primary' | 'cobalt' | 'crystal'", defaultValue: "'primary'", description: 'Optical glass material finish.' },
    ],
  },

  /* ==================== FORM INPUTS & SELECTION CONTROLS (11) ==================== */
  {
    id: 'text-input-field',
    title: 'Text Input Field',
    exportName: 'TextInput',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'A single-line recessed frosted well framed by a crystal bezel for names, emails, or toggleable password fields.',
    codeSnippet: `<TextInput\n  label="Workspace Email"\n  placeholder="clara@refractor.design"\n  value={email}\n  onChange={(e) => setEmail(e.target.value)}\n/>`,
    props: [
      { name: 'label', type: 'string', defaultValue: 'undefined', description: 'Accessible input label bound via htmlFor.' },
      { name: 'type', type: "'text' | 'email' | 'password'", defaultValue: "'text'", description: 'Automatically adds show/hide toggle for password.' },
      { name: 'errorText', type: 'string', defaultValue: 'undefined', description: 'Displays validation error message and alert ring.' },
    ],
  },
  {
    id: 'multi-line-text-area',
    title: 'Multi-Line Text Area',
    exportName: 'TextArea',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'A taller, vertically resizable frosted crystal box designed for longer entries such as release notes or comments.',
    codeSnippet: `<TextArea\n  label="Architecture Notes"\n  maxCharacters={280}\n  value={notes}\n  onChange={(e) => setNotes(e.target.value)}\n/>`,
    props: [
      { name: 'maxCharacters', type: 'number', defaultValue: 'undefined', description: 'Enables live tabular character counter.' },
      { name: 'helperText', type: 'string', defaultValue: 'undefined', description: 'Guidance caption beneath the field.' },
    ],
  },
  {
    id: 'search-bar-suggestions',
    title: 'Search Bar with Suggestions',
    exportName: 'SearchWithSuggestions',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Recessed frosted search chamber paired with a magnifying glass, split quick-add crystal trigger, and live suggestion popover.',
    codeSnippet: `<SearchWithSuggestions\n  value={query}\n  onChange={setQuery}\n  suggestions={suggestions}\n  onSelectSuggestion={handlePick}\n/>`,
    props: [
      { name: 'suggestions', type: 'SearchSuggestion[]', defaultValue: 'required', description: 'Live candidate items filtered as user types.' },
      { name: 'onQuickAdd', type: '(query: string) => void', defaultValue: 'undefined', description: 'Handler for the integrated right + crystal button.' },
    ],
  },
  {
    id: 'dropdown-select-menu',
    title: 'Dropdown Select Menu',
    exportName: 'DropdownSelect',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Compact crystal capsule featuring an optical C-ring emblem and recessed emerald checkmark tray that opens an option list.',
    codeSnippet: `<DropdownSelect\n  value={role}\n  onChange={setRole}\n  options={[\n    { value: 'architect', label: 'Systems Architect' },\n    { value: 'designer', label: 'Principal Designer' },\n  ]}\n/>`,
    props: [
      { name: 'options', type: 'SelectOption[]', defaultValue: 'required', description: 'Selectable options list.' },
      { name: 'value', type: 'string', defaultValue: 'required', description: 'Selected option value.' },
    ],
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    exportName: 'Checkbox',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Translucent seafoam-emerald glass square that lets users toggle independent boolean options or mixed indeterminate states.',
    codeSnippet: `<Checkbox\n  checked={enabled}\n  onChange={setEnabled}\n  label="Enable hardware caustic acceleration"\n/>`,
    props: [
      { name: 'checked', type: 'boolean', defaultValue: 'required', description: 'Controlled checked state.' },
      { name: 'indeterminate', type: 'boolean', defaultValue: 'false', description: 'Renders mixed dash state for parent selections.' },
    ],
  },
  {
    id: 'radio-button-group',
    title: 'Radio Button Group',
    exportName: 'RadioGroup',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Circular crystal wells with an emerald refractive core where selecting one option automatically deselects all others.',
    codeSnippet: `<RadioGroup\n  name="Density"\n  value={density}\n  onChange={setDensity}\n  options={densityOptions}\n/>`,
    props: [
      { name: 'options', type: 'RadioOption[]', defaultValue: 'required', description: 'Mutually exclusive choices with optional descriptions.' },
      { name: 'value', type: 'string', defaultValue: 'required', description: 'Active option value.' },
    ],
  },
  {
    id: 'toggle-switch',
    title: 'Toggle Switch',
    exportName: 'ToggleSwitch',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Sliding translucent emerald liquid-glass track with a 3D porcelain circular thumb for immediate binary settings.',
    codeSnippet: `<ToggleSwitch\n  checked={refractionOn}\n  onChange={setRefractionOn}\n  label="Chromatic edge dispersion"\n/>`,
    props: [
      { name: 'checked', type: 'boolean', defaultValue: 'required', description: 'Immediate binary state.' },
      { name: 'onChange', type: '(checked: boolean) => void', defaultValue: 'required', description: 'Invoked immediately on toggle.' },
    ],
  },
  {
    id: 'range-slider',
    title: 'Range Slider',
    exportName: 'RangeSlider',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Crystal track with an emerald fill bar and tactile porcelain thumb for picking continuous numeric values.',
    codeSnippet: `<RangeSlider\n  label="Backdrop Blur Radius"\n  min={4}\n  max={32}\n  unit="px"\n  value={blur}\n  onChange={setBlur}\n/>`,
    props: [
      { name: 'min / max', type: 'number', defaultValue: '0 / 100', description: 'Numeric bounds of the track.' },
      { name: 'unit', type: 'string', defaultValue: "'%'", description: 'Suffix displayed next to tabular readout.' },
    ],
  },
  {
    id: 'date-time-picker',
    title: 'Date & Time Picker',
    exportName: 'DateTimePicker',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Interactive calendar month grid and time-slot selector inside an expandable crystal slab.',
    codeSnippet: `<DateTimePicker\n  dateIso={date}\n  timeSlot={time}\n  onChangeDate={setDate}\n  onChangeTime={setTime}\n/>`,
    props: [
      { name: 'dateIso', type: 'string', defaultValue: 'required', description: 'ISO 8601 date string (YYYY-MM-DD).' },
      { name: 'timeSlot', type: 'string', defaultValue: 'required', description: 'Formatted time slot label.' },
    ],
  },
  {
    id: 'file-uploader-dropzone',
    title: 'File Uploader / Dropzone',
    exportName: 'FileDropzone',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Drag-and-drop or click-to-browse crystal surface wired directly to the system Virtual File System (VFS).',
    codeSnippet: `<FileDropzone\n  files={uploadedFiles}\n  onUploadFiles={handleUpload}\n  onRemoveFile={handleRemove}\n/>`,
    props: [
      { name: 'files', type: 'UploadedFileSummary[]', defaultValue: '[]', description: 'Currently attached file metadata list.' },
      { name: 'onUploadFiles', type: '(files) => void', defaultValue: 'required', description: 'Receives dropped or selected device files.' },
    ],
  },
  {
    id: 'rating-control',
    title: 'Rating Control',
    exportName: 'RatingControl',
    category: 'form-inputs',
    categoryTitle: 'Form Inputs & Selection Controls',
    summary: 'Selectable row of warm amber optical stars with hover preview and tabular score indicator.',
    codeSnippet: `<RatingControl value={score} onChange={setScore} />`,
    props: [
      { name: 'value', type: 'number', defaultValue: 'required', description: 'Current integer score.' },
      { name: 'max', type: 'number', defaultValue: '5', description: 'Total selectable icons.' },
    ],
  },

  /* ==================== NAVIGATION (7) ==================== */
  {
    id: 'top-navigation-bar',
    title: 'Top Navigation Bar',
    exportName: 'TopNavBar',
    category: 'navigation',
    categoryTitle: 'Navigation',
    summary: 'Horizontal crystal strip holding the brand wordmark, primary navigation links, quick search trigger, and user avatar.',
    codeSnippet: `<TopNavBar\n  brand="Refractor"\n  links={navLinks}\n  activeLinkId={active}\n  onSelectLink={setActive}\n/>`,
    props: [
      { name: 'brand', type: 'string', defaultValue: 'required', description: 'Single-line brand wordmark.' },
      { name: 'links', type: 'NavLinkItem[]', defaultValue: 'required', description: 'Primary horizontal navigation items.' },
    ],
  },
  {
    id: 'sidebar-navigation-drawer',
    title: 'Sidebar / Navigation Drawer',
    exportName: 'SidebarDrawer',
    category: 'navigation',
    categoryTitle: 'Navigation',
    summary: 'Collapsible vertical crystal panel housing hierarchical menu links and item counters for workspace apps.',
    codeSnippet: `<SidebarDrawer\n  title="Workspace"\n  items={drawerItems}\n  activeId={section}\n  onSelect={setSection}\n/>`,
    props: [
      { name: 'collapsible', type: 'boolean', defaultValue: 'true', description: 'Allows compact icon-rail collapse.' },
      { name: 'items', type: 'DrawerNavItem[]', defaultValue: 'required', description: 'Navigation entries with icons and counts.' },
    ],
  },
  {
    id: 'tabs',
    title: 'Tabs',
    exportName: 'PrismTabs',
    category: 'navigation',
    categoryTitle: 'Navigation',
    summary: 'Selectable crystal headers paired with the signature Tabs specimen pill to organize related content into single-view panels.',
    codeSnippet: `<PrismTabs\n  tabs={tabItems}\n  activeTabId={activeTab}\n  onChange={setActiveTab}\n  showSpecimenPill\n/>`,
    props: [
      { name: 'tabs', type: 'TabItem[]', defaultValue: 'required', description: 'Tab definitions and associated panel content.' },
      { name: 'showSpecimenPill', type: 'boolean', defaultValue: 'false', description: 'Displays the reference ⇕ Tabs cycle pill.' },
    ],
  },
  {
    id: 'breadcrumbs',
    title: 'Breadcrumbs',
    exportName: 'Breadcrumbs',
    category: 'navigation',
    categoryTitle: 'Navigation',
    summary: 'Horizontal trail of links showing current location in a hierarchy and allowing instant jumps to parent levels.',
    codeSnippet: `<Breadcrumbs items={crumbs} onNavigate={handleJump} />`,
    props: [
      { name: 'items', type: 'BreadcrumbCrumb[]', defaultValue: 'required', description: 'Ordered path from root to active page.' },
    ],
  },
  {
    id: 'pagination',
    title: 'Pagination',
    exportName: 'Pagination',
    category: 'navigation',
    categoryTitle: 'Navigation',
    summary: 'Numbered crystal page orbs and Previous/Next buttons used to navigate multi-page datasets.',
    codeSnippet: `<Pagination\n  currentPage={page}\n  totalPages={5}\n  onPageChange={setPage}\n/>`,
    props: [
      { name: 'currentPage', type: 'number', defaultValue: '1', description: '1-indexed active page.' },
      { name: 'totalPages', type: 'number', defaultValue: 'required', description: 'Total number of available pages.' },
    ],
  },
  {
    id: 'stepper',
    title: 'Stepper',
    exportName: 'Stepper',
    category: 'navigation',
    categoryTitle: 'Navigation',
    summary: 'Visual sequence of numbered crystal steps with emerald completion checkmarks guiding users through multi-stage workflows.',
    codeSnippet: `<Stepper steps={workflowSteps} activeStepIndex={step} onStepClick={setStep} />`,
    props: [
      { name: 'steps', type: 'StepDefinition[]', defaultValue: 'required', description: 'Ordered stage titles and subtitles.' },
      { name: 'activeStepIndex', type: 'number', defaultValue: '0', description: 'Zero-based index of current stage.' },
    ],
  },
  {
    id: 'command-palette',
    title: 'Command Palette',
    exportName: 'CommandPalette',
    category: 'navigation',
    categoryTitle: 'Navigation',
    summary: 'Keyboard-triggered search overlay (Cmd+K or Ctrl+K) for jumping directly to any component or executing global actions.',
    codeSnippet: `<CommandPalette\n  open={paletteOpen}\n  onClose={() => setPaletteOpen(false)}\n  items={commands}\n/>`,
    props: [
      { name: 'open', type: 'boolean', defaultValue: 'false', description: 'Controls modal visibility.' },
      { name: 'items', type: 'CommandPaletteItem[]', defaultValue: 'required', description: 'Searchable actions and navigation targets.' },
    ],
  },

  /* ==================== DATA DISPLAY & CONTENT (12) ==================== */
  {
    id: 'card',
    title: 'Card',
    exportName: 'PrismCard',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Self-contained thick optical crystal slab with diagonal specular reflection and edge dispersion for grouping subject content.',
    codeSnippet: `<PrismCard title="Optical Surface Architecture" kicker="Design Token">\n  Multi-layered refractive glass container with 24px radius.\n</PrismCard>`,
    props: [
      { name: 'specimenSlab', type: 'boolean', defaultValue: 'false', description: 'Renders pure sculptural optical glass slab specimen.' },
      { name: 'footer', type: 'ReactNode', defaultValue: 'undefined', description: 'Optional bottom action bar.' },
    ],
  },
  {
    id: 'data-table-grid',
    title: 'Data Table / Grid',
    exportName: 'DataTable',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Structured high-density rows and columns with interactive sorting, status filtering, row selection, and tabular numerals.',
    codeSnippet: `<DataTable\n  rows={rows}\n  sortBy={sortBy}\n  sortDir={sortDir}\n  onSortChange={handleSort}\n  selectedIds={selected}\n  onToggleSelect={toggleRow}\n/>`,
    props: [
      { name: 'rows', type: 'ProjectRecord[]', defaultValue: 'required', description: 'Dataset records rendered in compact 44px rows.' },
      { name: 'sortBy / sortDir', type: 'keyof ProjectRecord / SortDirection', defaultValue: "'project' / 'asc'", description: 'Active column sort state.' },
    ],
  },
  {
    id: 'list',
    title: 'List',
    exportName: 'PrismList',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Vertical stack of uniform crystal rows displaying icons, primary/secondary text, tabular metadata, and quick actions.',
    codeSnippet: `<PrismList items={inboxItems} onItemAction={handleInspect} />`,
    props: [
      { name: 'items', type: 'PrismListItem[]', defaultValue: 'required', description: 'Uniform row items with optional leading icons.' },
    ],
  },
  {
    id: 'avatar',
    title: 'Avatar',
    exportName: 'Avatar',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Circular or squircle crystal-bezel portrait with automatic cobalt initials fallback if an image is absent.',
    codeSnippet: `<Avatar\n  src="/src/assets/images/avatar_product_lead_1795197572008.jpg"\n  alt="Clara Vance"\n  initials="CV"\n/>`,
    props: [
      { name: 'shape', type: "'circle' | 'squircle'", defaultValue: "'circle'", description: 'Outer crystal frame geometry.' },
      { name: 'initials', type: 'string', defaultValue: 'required', description: 'Resilient fallback initials.' },
    ],
  },
  {
    id: 'badge-status-dot',
    title: 'Badge / Status Dot',
    exportName: 'BadgeStatus',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Numerical notification counter or semantic status indicator always paired with an explicit accessible label.',
    codeSnippet: `<BadgeStatus count={12} label="Unread reviews" />\n<BadgeStatus tone="online" label="Storage synced" />`,
    props: [
      { name: 'count', type: 'number', defaultValue: 'undefined', description: 'Displays warm tangerine counter badge when defined.' },
      { name: 'tone', type: "'online' | 'warning' | 'offline'", defaultValue: "'online'", description: 'Semantic state paired with text.' },
    ],
  },
  {
    id: 'tag-chip',
    title: 'Tag / Chip',
    exportName: 'TagChip',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Compact interactive filter capsule used to toggle categories or dismiss active filter selections.',
    codeSnippet: `<TagChip\n  label="Refractive CSS"\n  selected={active}\n  onSelect={toggle}\n  onDismiss={remove}\n/>`,
    props: [
      { name: 'selected', type: 'boolean', defaultValue: 'false', description: 'Switches chip to emerald active glass.' },
      { name: 'onDismiss', type: '() => void', defaultValue: 'undefined', description: 'Renders trailing × dismiss button.' },
    ],
  },
  {
    id: 'accordion-collapsible',
    title: 'Accordion / Collapsible Panel',
    exportName: 'Accordion',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Vertically stacked crystal headers that expand or collapse to reveal detailed specifications while conserving vertical space.',
    codeSnippet: `<Accordion items={faqItems} allowMultiple />`,
    props: [
      { name: 'allowMultiple', type: 'boolean', defaultValue: 'false', description: 'Permits multiple sections open simultaneously.' },
    ],
  },
  {
    id: 'carousel-media-slider',
    title: 'Carousel / Media Slider',
    exportName: 'CarouselSlider',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Horizontal media showcase with crystal navigation buttons, contrast scrim captions, and slide indicator dots.',
    codeSnippet: `<CarouselSlider slides={studioSlides} />`,
    props: [
      { name: 'slides', type: 'CarouselSlide[]', defaultValue: 'required', description: 'Slides with image URL, title, and caption.' },
    ],
  },
  {
    id: 'tree-view',
    title: 'Tree View',
    exportName: 'TreeView',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Hierarchical expandable list rendering nested folders and files directly from the system Virtual File System.',
    codeSnippet: `<TreeView\n  nodes={vfsNodes}\n  selectedNodeId={selectedId}\n  onSelectNode={setSelectedNode}\n/>`,
    props: [
      { name: 'nodes', type: 'VfsNode[]', defaultValue: 'required', description: 'Flat VFS nodes linked via parentId.' },
    ],
  },
  {
    id: 'timeline',
    title: 'Timeline',
    exportName: 'Timeline',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Chronological vertical sequence of release and architecture events with numbered refractive markers.',
    codeSnippet: `<Timeline entries={releaseHistory} />`,
    props: [
      { name: 'entries', type: 'TimelineEntry[]', defaultValue: 'required', description: 'Ordered chronological milestones.' },
    ],
  },
  {
    id: 'calendar-view',
    title: 'Calendar View',
    exportName: 'CalendarView',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Full interactive month grid displaying scheduled milestones with inline date selection and event creation.',
    codeSnippet: `<CalendarView events={events} onAddEvent={scheduleMilestone} />`,
    props: [
      { name: 'events', type: 'CalendarEventItem[]', defaultValue: 'required', description: 'Scheduled date entries.' },
      { name: 'onAddEvent', type: '(dateIso, title) => void', defaultValue: 'undefined', description: 'Adds new milestone to selected day.' },
    ],
  },
  {
    id: 'charts-graphs',
    title: 'Charts & Graphs',
    exportName: 'OpticalCharts',
    category: 'data-display',
    categoryTitle: 'Data Display & Content',
    summary: 'Interactive visual representations of numeric telemetry supporting Bar Chart, Area/Line Graph, and Donut breakdown.',
    codeSnippet: `<OpticalCharts data={adoptionMetrics} />`,
    props: [
      { name: 'data', type: 'ChartPoint[]', defaultValue: 'required', description: 'Numeric series rendered across Bar, Line, and Donut modes.' },
    ],
  },

  /* ==================== FEEDBACK & SYSTEM STATUS (5) ==================== */
  {
    id: 'toast-snackbar',
    title: 'Toast / Snackbar',
    exportName: 'ToastSnackbar',
    category: 'feedback-status',
    categoryTitle: 'Feedback & System Status',
    summary: 'Crystal notification capsule with an inner warm-amber hairline ring and faceted prism emblem that confirms actions.',
    codeSnippet: `<ToastSnackbar\n  title="Toast"\n  description="Project configuration saved"\n  onDismiss={dismiss}\n/>`,
    props: [
      { name: 'tone', type: "'amber' | 'emerald' | 'info' | 'critical'", defaultValue: "'amber'", description: 'Prism emblem accent tone.' },
      { name: 'onDismiss', type: '() => void', defaultValue: 'undefined', description: 'Optional close button callback.' },
    ],
  },
  {
    id: 'alert-banner',
    title: 'Alert Banner',
    exportName: 'AlertBanner',
    category: 'feedback-status',
    categoryTitle: 'Feedback & System Status',
    summary: 'Prominent persistent slab communicating system updates, warnings, or validation errors with icon + explicit copy.',
    codeSnippet: `<AlertBanner\n  severity="warning"\n  title="Token schema migration"\n  message="Legacy shadow tokens map automatically to optics.refraction."\n/>`,
    props: [
      { name: 'severity', type: "'info' | 'success' | 'warning' | 'error'", defaultValue: "'info'", description: 'Semantic alert tone and icon.' },
    ],
  },
  {
    id: 'progress-loading-spinner',
    title: 'Progress Bar & Loading Spinner',
    exportName: 'ProgressAndSpinner',
    category: 'feedback-status',
    categoryTitle: 'Feedback & System Status',
    summary: 'Determinate warm-amber liquid progress bar paired with an indeterminate emerald optical C-ring spinner.',
    codeSnippet: `<ProgressAndSpinner progress={72} indeterminateSpinner />`,
    props: [
      { name: 'progress', type: 'number', defaultValue: 'required', description: 'Percentage completion from 0 to 100.' },
      { name: 'indeterminateSpinner', type: 'boolean', defaultValue: 'true', description: 'Shows active spinner pill.' },
    ],
  },
  {
    id: 'skeleton-loader',
    title: 'Skeleton Loader',
    exportName: 'SkeletonLoader',
    category: 'feedback-status',
    categoryTitle: 'Feedback & System Status',
    summary: 'Animated frosted placeholder shapes matching upcoming card layout geometry until live data resolves.',
    codeSnippet: `<SkeletonLoader loading={isLoading}>\n  <ResolvedProfileCard />\n</SkeletonLoader>`,
    props: [
      { name: 'loading', type: 'boolean', defaultValue: 'true', description: 'Toggles between skeleton placeholder and children.' },
    ],
  },
  {
    id: 'empty-state',
    title: 'Empty State',
    exportName: 'EmptyState',
    category: 'feedback-status',
    categoryTitle: 'Feedback & System Status',
    summary: 'Helpful crystal emblem, clear explanation, and primary call-to-action displayed when a dataset has zero records.',
    codeSnippet: `<EmptyState\n  title="No active snapshots"\n  description="Create a baseline snapshot or restore default records."\n  actionLabel="Restore sample dataset"\n  onAction={restore}\n/>`,
    props: [
      { name: 'actionLabel', type: 'string', defaultValue: 'required', description: 'CTA button text to populate data.' },
    ],
  },

  /* ==================== OVERLAYS & POPUPS (5) ==================== */
  {
    id: 'modal-dialog',
    title: 'Modal Dialog',
    exportName: 'ModalDialog',
    category: 'overlays-popups',
    categoryTitle: 'Overlays & Popups',
    summary: 'Centered frosted crystal window over a dimmed backdrop requiring user confirmation or Escape dismissal.',
    codeSnippet: `<ModalDialog\n  open={open}\n  title="Create Optical Preset"\n  onConfirm={savePreset}\n  onClose={() => setOpen(false)}\n>\n  ...\n</ModalDialog>`,
    props: [
      { name: 'open', type: 'boolean', defaultValue: 'false', description: 'Controls dialog visibility and Escape listener.' },
      { name: 'confirmLabel', type: 'string', defaultValue: "'Save changes'", description: 'Primary confirmation button label.' },
    ],
  },
  {
    id: 'popover-contextual-card',
    title: 'Popover / Contextual Card',
    exportName: 'ContextualPopover',
    category: 'overlays-popups',
    categoryTitle: 'Overlays & Popups',
    summary: 'Floating refractive card anchored to a trigger displaying quick file actions, collaborator controls, and a cobalt CTA.',
    codeSnippet: `<ContextualPopover\n  title="Find files..."\n  subtitle="Add collaborator"\n  ctaLabel="Pro plan"\n  onCtaClick={upgrade}\n/>`,
    props: [
      { name: 'inlineSpecimen', type: 'boolean', defaultValue: 'false', description: 'Renders always-visible specimen card.' },
      { name: 'ctaLabel', type: 'string', defaultValue: "'Pro plan'", description: 'Cobalt refractive pill CTA text.' },
    ],
  },
  {
    id: 'tooltip',
    title: 'Tooltip',
    exportName: 'Tooltip',
    category: 'overlays-popups',
    categoryTitle: 'Overlays & Popups',
    summary: 'Floating crystal micro-label appearing on hover or keyboard focus to clarify control purpose.',
    codeSnippet: `<Tooltip content="Toggle optical grid">\n  <IconButton aria-label="Grid"><Grid /></IconButton>\n</Tooltip>`,
    props: [
      { name: 'content', type: 'string', defaultValue: 'required', description: 'Concise tooltip text.' },
      { name: 'placement', type: "'top' | 'bottom'", defaultValue: "'top'", description: 'Anchor direction.' },
    ],
  },
  {
    id: 'context-menu-dropdown',
    title: 'Context Menu / Dropdown Menu',
    exportName: 'ContextMenuDropdown',
    category: 'overlays-popups',
    categoryTitle: 'Overlays & Popups',
    summary: 'Floating crystal menu of actions triggered either by clicking a menu button or right-clicking an interactive target zone.',
    codeSnippet: `<ContextMenuDropdown\n  actions={menuActions}\n  onSelect={handleMenuAction}\n/>`,
    props: [
      { name: 'actions', type: 'ContextMenuAction[]', defaultValue: 'required', description: 'Menu items with optional keyboard shortcuts.' },
    ],
  },
  {
    id: 'slide-over-bottom-sheet',
    title: 'Slide-Over Panel / Bottom Sheet',
    exportName: 'SlideOverSheet',
    category: 'overlays-popups',
    categoryTitle: 'Overlays & Popups',
    summary: 'Panel that slides in from the right desktop edge or mobile bottom edge to inspect details without leaving the page.',
    codeSnippet: `<SlideOverSheet\n  open={sheetOpen}\n  mode="right"\n  title="Inspector"\n  onClose={() => setSheetOpen(false)}\n>\n  ...\n</SlideOverSheet>`,
    props: [
      { name: 'mode', type: "'right' | 'bottom'", defaultValue: "'right'", description: 'Selects side Slide-Over or Bottom Sheet presentation.' },
    ],
  },

  /* ==================== LAYOUT & WORKSPACE CONTROLS (6) ==================== */
  {
    id: 'window-splitter',
    title: 'Window Splitter / Resizable Panes',
    exportName: 'WindowSplitter',
    category: 'layout-workspace',
    categoryTitle: 'Layout & Workspace Controls',
    summary: 'A draggable refractive divider bar placed between two or more panels for smooth manual and keyboard-accessible pane resizing.',
    codeSnippet: `<WindowSplitter\n  orientation="horizontal"\n  defaultSizes={[35, 65]}\n  panes={[\n    { id: 'left', label: 'Explorer', content: <Explorer /> },\n    { id: 'right', label: 'Canvas', content: <Canvas /> },\n  ]}\n/>`,
    props: [
      { name: 'panes', type: 'WindowSplitterPane[]', defaultValue: 'required', description: 'Array of 2+ resizable panes with minSize/maxSize constraints.' },
      { name: 'orientation', type: "'horizontal' | 'vertical'", defaultValue: "'horizontal'", description: 'Split axis direction.' },
      { name: 'defaultSizes', type: 'number[]', defaultValue: 'equal split', description: 'Initial percentage sizes summing to 100.' },
    ],
  },
  {
    id: 'dockable-panel',
    title: 'Dockable / Floating Panels',
    exportName: 'DockablePanel',
    category: 'layout-workspace',
    categoryTitle: 'Layout & Workspace Controls',
    summary: 'Modular optical-glass workspace window that users can dock to screen edges, collapse, or pop out and drag as a floating view.',
    codeSnippet: `<DockablePanel\n  title="Shader Inspector"\n  dockPosition={dock}\n  onDockPositionChange={setDock}\n>\n  ...\n</DockablePanel>`,
    props: [
      { name: 'dockPosition', type: "'left' | 'right' | 'bottom' | 'center' | 'floating'", defaultValue: "'right'", description: 'Active docked edge or floating window mode.' },
      { name: 'collapsed', type: 'boolean', defaultValue: 'false', description: 'Minimizes body to titlebar.' },
    ],
  },
  {
    id: 'master-detail-view',
    title: 'Master-Detail View',
    exportName: 'MasterDetailView',
    category: 'layout-workspace',
    categoryTitle: 'Layout & Workspace Controls',
    summary: 'Split-screen optical layout where selecting an item from a searchable master list immediately loads its full detail view adjacently.',
    codeSnippet: `<MasterDetailView\n  items={specs}\n  selectedId={selected}\n  onSelectItem={(item) => setSelected(item.id)}\n  renderDetail={(item) => <SpecDetail item={item} />}\n/>`,
    props: [
      { name: 'items', type: 'MasterDetailItem[]', defaultValue: 'required', description: 'Selectable records rendered in the master pane.' },
      { name: 'renderDetail', type: '(item: T) => ReactNode', defaultValue: 'required', description: 'Renders the active detail canvas.' },
    ],
  },
  {
    id: 'virtualized-list',
    title: 'Virtualized List / Infinite Scroller',
    exportName: 'VirtualizedList',
    category: 'layout-workspace',
    categoryTitle: 'Layout & Workspace Controls',
    summary: 'High-performance scrolling container rendering only the visible viewport window plus overscan across tens of thousands of rows.',
    codeSnippet: `<VirtualizedList\n  items={tenThousandRows}\n  itemHeight={46}\n  height={320}\n  renderItem={(row) => <Row item={row} />}\n/>`,
    props: [
      { name: 'items', type: 'T[]', defaultValue: 'required', description: 'Large dataset array (10,000+ rows supported smoothly).' },
      { name: 'itemHeight / height', type: 'number', defaultValue: '48 / 320', description: 'Fixed row height and scrollable viewport height in pixels.' },
      { name: 'onEndReached', type: '() => void', defaultValue: 'undefined', description: 'Infinite scroll trigger near list bottom.' },
    ],
  },
  {
    id: 'masonry-grid',
    title: 'Masonry Grid',
    exportName: 'MasonryGrid',
    category: 'layout-workspace',
    categoryTitle: 'Layout & Workspace Controls',
    summary: 'Multi-column optical brickwork layout packing variable-height cards tightly into shortest-column lanes without vertical gaps.',
    codeSnippet: `<MasonryGrid items={cards} columns={3} gapPx={16} />`,
    props: [
      { name: 'items', type: 'MasonryItem[]', defaultValue: 'required', description: 'Variable-height cards distributed into balanced columns.' },
      { name: 'columns', type: 'number', defaultValue: '3', description: 'Lane count clamped safely between 1 and 6.' },
    ],
  },
  {
    id: 'sticky-action-bar',
    title: 'Sticky Action Bar',
    exportName: 'StickyActionBar',
    category: 'layout-workspace',
    categoryTitle: 'Layout & Workspace Controls',
    summary: 'Floating or anchored optical toolbar staying locked in view when multiple items are selected to offer bulk workflow actions.',
    codeSnippet: `<StickyActionBar\n  selectedCount={selectedIds.length}\n  actions={bulkActions}\n  onClearSelection={clearAll}\n/>`,
    props: [
      { name: 'selectedCount', type: 'number', defaultValue: 'required', description: 'Active selection count; bar auto-hides at 0 unless alwaysVisible.' },
      { name: 'actions', type: 'StickyActionItem[]', defaultValue: 'required', description: 'Bulk action buttons supporting primary, secondary, cobalt, and destructive tones.' },
    ],
  },

  /* ==================== ADVANCED DATA & VISUALIZATION (6) ==================== */
  {
    id: 'advanced-data-grid',
    title: 'Advanced Data Grid',
    exportName: 'AdvancedDataGrid',
    category: 'advanced-data',
    categoryTitle: 'Advanced Data & Visualization',
    summary: 'Enterprise optical-glass grid supporting inline cell editing, column resizing/reordering, sticky column pinning, row grouping, and formula-safe CSV export.',
    codeSnippet: `<AdvancedDataGrid\n  columns={columns}\n  rows={rows}\n  onCellEdit={handleEdit}\n  onExportCsv={handleExport}\n/>`,
    props: [
      { name: 'columns', type: 'AdvancedGridColumn[]', defaultValue: 'required', description: 'Column descriptors supporting width, editable, pinned, and sortable.' },
      { name: 'rows', type: 'GridRowRecord[]', defaultValue: 'required', description: 'Strongly typed row records.' },
      { name: 'onExportCsv', type: '(csv, filename) => void', defaultValue: 'undefined', description: 'Formula-safe RFC 4180 CSV export callback.' },
    ],
  },
  {
    id: 'pivot-table',
    title: 'Pivot Table',
    exportName: 'PivotTable',
    category: 'advanced-data',
    categoryTitle: 'Advanced Data & Visualization',
    summary: 'Interactive cross-tabulation table with draggable field chips for Rows, Columns, and Values plus Sum/Avg/Count/Min/Max aggregation.',
    codeSnippet: `<PivotTable\n  data={records}\n  fields={fieldDefs}\n  defaultRowField="region"\n  defaultColumnField="quarter"\n  defaultValueField="revenue"\n/>`,
    props: [
      { name: 'data', type: 'PivotRecord[]', defaultValue: 'required', description: 'Flat dataset records aggregated using prototype-safe Maps.' },
      { name: 'fields', type: 'PivotFieldDef[]', defaultValue: 'required', description: 'Assignable row, column, and numeric value dimensions.' },
    ],
  },
  {
    id: 'kanban-board',
    title: 'Kanban Board',
    exportName: 'KanbanBoard',
    category: 'advanced-data',
    categoryTitle: 'Advanced Data & Visualization',
    summary: 'Multi-stage workflow board with draggable optical cards, WIP limit badges, quick-add composers, and full keyboard stage movement.',
    codeSnippet: `<KanbanBoard\n  columns={stages}\n  cards={cards}\n  onCardsChange={setCards}\n/>`,
    props: [
      { name: 'columns', type: 'KanbanColumnDef[]', defaultValue: 'required', description: 'Ordered workflow columns with optional wipLimit.' },
      { name: 'cards', type: 'KanbanCardItem[]', defaultValue: 'undefined', description: 'Controlled card records.' },
    ],
  },
  {
    id: 'gantt-chart',
    title: 'Gantt Chart / Resource Scheduler',
    exportName: 'GanttChart',
    category: 'advanced-data',
    categoryTitle: 'Advanced Data & Visualization',
    summary: 'Horizontal optical timeline grid visualizing overlapping tasks, durations, SVG dependency arrows, and team resource lanes across days, weeks, or months.',
    codeSnippet: `<GanttChart tasks={scheduleTasks} defaultScale="days" todayIso="2026-11-15" />`,
    props: [
      { name: 'tasks', type: 'GanttTaskItem[]', defaultValue: 'required', description: 'Scheduled tasks with dates, progress, assignee, and dependencies.' },
      { name: 'scale', type: "'days' | 'weeks' | 'months'", defaultValue: "'days'", description: 'Active timeline zoom scale.' },
    ],
  },
  {
    id: 'diff-viewer',
    title: 'Diff Viewer',
    exportName: 'DiffViewer',
    category: 'advanced-data',
    categoryTitle: 'Advanced Data & Visualization',
    summary: 'Side-by-side and unified comparison view powered by an LCS line diff engine highlighting additions, deletions, and line numbers safely.',
    codeSnippet: `<DiffViewer\n  original={beforeCode}\n  modified={afterCode}\n  defaultViewMode="split"\n/>`,
    props: [
      { name: 'original / modified', type: 'string', defaultValue: 'required', description: 'Source strings compared as pure escaped text nodes.' },
      { name: 'viewMode', type: "'split' | 'unified'", defaultValue: "'split'", description: 'Side-by-side or inline unified presentation.' },
    ],
  },
  {
    id: 'kpi-metric-card',
    title: 'KPI Metric Card (with Sparkline)',
    exportName: 'KpiMetricCard',
    category: 'advanced-data',
    categoryTitle: 'Advanced Data & Visualization',
    summary: 'Compact optical dashboard card pairing a headline tabular figure, directional percentage delta pill, and interactive SVG optical sparkline.',
    codeSnippet: `<KpiMetricCard\n  label="Weekly Downloads"\n  value="148.2K"\n  deltaPercent={18.6}\n  sparkline={[82, 91, 108, 134, 148]}\n/>`,
    props: [
      { name: 'value', type: 'string | number', defaultValue: 'required', description: 'Headline tabular KPI value.' },
      { name: 'deltaPercent', type: 'number', defaultValue: 'undefined', description: 'Signed percentage change badge.' },
      { name: 'sparkline', type: '(number | KpiSparklinePoint)[]', defaultValue: 'required', description: 'Trend series rendered as a token-driven SVG sparkline.' },
    ],
  },

  /* ==================== ADVANCED SEARCH & FILTERING (4) ==================== */
  {
    id: 'faceted-filter-bar',
    title: 'Faceted Search / Filter Bar',
    exportName: 'FacetedFilterBar',
    category: 'search-filtering',
    categoryTitle: 'Advanced Search & Filtering',
    summary: 'Multi-criteria optical filtering bar pairing search, category multi-select, numeric/price range, date bounds, active removable chips, and reset.',
    codeSnippet: `<FacetedFilterBar\n  categories={categories}\n  value={filters}\n  onChange={setFilters}\n  resultCount={42}\n/>`,
    props: [
      { name: 'categories', type: 'FacetCategoryOption[]', defaultValue: 'required', description: 'Selectable facet categories with optional item counts.' },
      { name: 'value / onChange', type: 'FacetedFilterState', defaultValue: 'optional', description: 'Controlled or uncontrolled multi-criteria filter state.' },
    ],
  },
  {
    id: 'visual-query-builder',
    title: 'Visual Query Builder',
    exportName: 'VisualQueryBuilder',
    category: 'search-filtering',
    categoryTitle: 'Advanced Search & Filtering',
    summary: 'Structured optical interface for composing nested AND/OR logical rules using type-aware field and operator dropdowns with live expression & JSON AST preview.',
    codeSnippet: `<VisualQueryBuilder\n  fields={queryFields}\n  defaultValue={initialGroup}\n  onChange={setAst}\n/>`,
    props: [
      { name: 'fields', type: 'QueryFieldSpec[]', defaultValue: 'required', description: 'Schema of text, number, date, and select fields.' },
      { name: 'maxDepth', type: 'number', defaultValue: '3', description: 'Maximum nested logical group depth (1..4).' },
    ],
  },
  {
    id: 'multi-select-combobox',
    title: 'Multi-Select Combobox / Token Input',
    exportName: 'MultiSelectCombobox',
    category: 'search-filtering',
    categoryTitle: 'Advanced Search & Filtering',
    summary: 'Frosted combobox input that searches, selects, and stacks multiple items as removable emerald pill tags directly inside the input chamber.',
    codeSnippet: `<MultiSelectCombobox\n  options={options}\n  value={selected}\n  onChange={setSelected}\n  creatable\n/>`,
    props: [
      { name: 'options', type: 'ComboboxOption[]', defaultValue: 'required', description: 'Searchable candidate tokens.' },
      { name: 'creatable', type: 'boolean', defaultValue: 'false', description: 'Allows pressing Enter to create custom tokens.' },
      { name: 'maxSelected', type: 'number', defaultValue: 'undefined', description: 'Optional maximum token count cap.' },
    ],
  },
  {
    id: 'global-search-modal',
    title: 'Global Search Modal',
    exportName: 'GlobalSearchModal',
    category: 'search-filtering',
    categoryTitle: 'Advanced Search & Filtering',
    summary: 'Full-featured search overlay querying across multiple content types simultaneously with category tabs, literal match highlighting, and arrow-key navigation.',
    codeSnippet: `<GlobalSearchModal\n  open={open}\n  onClose={() => setOpen(false)}\n  items={searchableItems}\n  onSelectItem={openItem}\n/>`,
    props: [
      { name: 'open / onClose', type: 'boolean / () => void', defaultValue: 'required', description: 'Controls modal overlay visibility.' },
      { name: 'items', type: 'GlobalSearchItem[]', defaultValue: 'required', description: 'Multi-entity items grouped automatically by type.' },
    ],
  },

  /* ==================== RICH INPUT & CONTENT CREATION (6) ==================== */
  {
    id: 'rich-text-editor',
    title: 'Rich Text / WYSIWYG Editor',
    exportName: 'RichTextEditor',
    category: 'rich-input',
    categoryTitle: 'Rich Input & Content Creation',
    summary: 'Optical formatting toolbar and writing canvas supporting bold, italic, underline, headings, lists, links, and embedded images with strict allowlist XSS sanitization.',
    codeSnippet: `<RichTextEditor\n  label="Release Notes"\n  value={doc}\n  onChange={setDoc}\n/>`,
    props: [
      { name: 'value / onChange', type: 'string / (sanitized: string) => void', defaultValue: 'optional', description: 'Controlled or uncontrolled sanitized document content.' },
      { name: 'showPreview', type: 'boolean', defaultValue: 'true', description: 'Enables Write / Split / Preview view switcher.' },
    ],
  },
  {
    id: 'code-editor',
    title: 'Code Editor',
    exportName: 'CodeEditor',
    category: 'rich-input',
    categoryTitle: 'Rich Input & Content Creation',
    summary: 'Optical IDE editor featuring synchronized line numbers, linear-time syntax highlighting (TypeScript/JSON/CSS), Tab/Enter auto-indentation, and inline diagnostic markers.',
    codeSnippet: `<CodeEditor\n  language="typescript"\n  value={code}\n  onChange={setCode}\n  diagnostics={diagnostics}\n/>`,
    props: [
      { name: 'language', type: "'typescript' | 'json' | 'css'", defaultValue: "'typescript'", description: 'Syntax tokenizer grammar.' },
      { name: 'diagnostics', type: 'CodeDiagnostic[]', defaultValue: '[]', description: 'Error and warning gutter markers.' },
    ],
  },
  {
    id: 'color-picker',
    title: 'Color Picker',
    exportName: 'ColorPicker',
    category: 'rich-input',
    categoryTitle: 'Rich Input & Content Creation',
    summary: 'Interactive HSV saturation/value spectrum, rainbow hue slider, alpha opacity control, synchronized Hex/RGB inputs, and live WCAG contrast readout.',
    codeSnippet: `<ColorPicker\n  value={hex}\n  alpha={alpha}\n  onChange={(h, a) => { setHex(h); setAlpha(a); }}\n/>`,
    props: [
      { name: 'value / alpha', type: 'string / number', defaultValue: "'#E75C24' / 1", description: 'Controlled hex color and 0..1 opacity.' },
      { name: 'presets', type: 'string[]', defaultValue: 'Refractor optical swatches', description: 'Quick-pick color pills.' },
    ],
  },
  {
    id: 'inline-editable-field',
    title: 'Inline Editable Field',
    exportName: 'InlineEditableField',
    category: 'rich-input',
    categoryTitle: 'Rich Input & Content Creation',
    summary: 'Plain typography that transforms smoothly into a frosted optical input field when clicked or activated via keyboard, with inline Save/Cancel and validation.',
    codeSnippet: `<InlineEditableField\n  value={title}\n  required\n  onSave={setTitle}\n/>`,
    props: [
      { name: 'value / onSave', type: 'string / (next: string) => void', defaultValue: 'optional', description: 'Commits validated edits on Enter or Save click.' },
      { name: 'multiline', type: 'boolean', defaultValue: 'false', description: 'Switches editor to multi-line textarea.' },
    ],
  },
  {
    id: 'image-cropper',
    title: 'Image Cropper & Media Editor',
    exportName: 'ImageCropper',
    category: 'rich-input',
    categoryTitle: 'Rich Input & Content Creation',
    summary: 'Interactive optical crop frame over uploaded media supporting drag/resize, aspect-ratio locks (Free, 1:1, 16:9, 4:3), zoom, and 90-degree rotation.',
    codeSnippet: `<ImageCropper\n  src="/assets/specimen.jpg"\n  defaultAspectRatio="16:9"\n  onApplyCrop={saveCrop}\n/>`,
    props: [
      { name: 'src', type: 'string', defaultValue: 'required', description: 'Image URL validated by sanitizeUrl allowlist.' },
      { name: 'defaultAspectRatio', type: "'free' | '1:1' | '16:9' | '4:3'", defaultValue: "'free'", description: 'Initial aspect-ratio lock.' },
    ],
  },
  {
    id: 'signature-pad',
    title: 'Signature Pad',
    exportName: 'SignaturePad',
    category: 'rich-input',
    categoryTitle: 'Rich Input & Content Creation',
    summary: 'Touch- and mouse-enabled vector drawing pad capturing crisp handwritten signatures with Undo, Clear, ink color controls, and deterministic SVG data URL export.',
    codeSnippet: `<SignaturePad\n  label="Authorizing Signature"\n  onSave={(data) => saveSvg(data.svgDataUrl)}\n/>`,
    props: [
      { name: 'strokeColor / strokeWidth', type: 'string / number', defaultValue: "'#18202C' / 2.5", description: 'Vector ink color and stroke thickness.' },
      { name: 'onSave', type: '(data: SignatureExportData) => void', defaultValue: 'undefined', description: 'Receives vector strokes and SVG data URL.' },
    ],
  },

  /* ==================== INTERACTIVE & DRAG-AND-DROP (3) ==================== */
  {
    id: 'transfer-list',
    title: 'Transfer List (Dual Listbox)',
    exportName: 'TransferList',
    category: 'drag-and-drop',
    categoryTitle: 'Interactive & Drag-and-Drop',
    summary: 'Two side-by-side optical listboxes with search filters and center crystal arrow controls moving items cleanly between Available and Selected pools.',
    codeSnippet: `<TransferList\n  items={items}\n  selectedIds={selected}\n  onChange={setSelected}\n/>`,
    props: [
      { name: 'items', type: 'TransferListItem[]', defaultValue: 'required', description: 'Master pool of transferable items supporting disabled guards.' },
      { name: 'selectedIds / onChange', type: 'string[]', defaultValue: 'optional', description: 'IDs currently in the right Selected listbox.' },
    ],
  },
  {
    id: 'sortable-list',
    title: 'Sortable Drag-and-Drop List',
    exportName: 'SortableList',
    category: 'drag-and-drop',
    categoryTitle: 'Interactive & Drag-and-Drop',
    summary: 'Optical crystal list equipped with grab handles, HTML5 drag-and-drop reordering, Alt+Arrow keyboard controls, and ARIA live announcements.',
    codeSnippet: `<SortableList\n  items={priorities}\n  onReorder={(next) => setPriorities(next)}\n/>`,
    props: [
      { name: 'items / defaultItems', type: 'SortableListItem[]', defaultValue: 'optional', description: 'Ordered items supporting locked guards.' },
      { name: 'onReorder', type: '(next, from, to) => void', defaultValue: 'undefined', description: 'Fired with immutably reordered items.' },
    ],
  },
  {
    id: 'node-graph-canvas',
    title: 'Node Graph / Flow Canvas',
    exportName: 'NodeGraphCanvas',
    category: 'drag-and-drop',
    categoryTitle: 'Interactive & Drag-and-Drop',
    summary: 'Infinite, zoomable, pannable 2D optical workspace where users drag glass nodes and wire input/output ports with smooth SVG cubic bezier curves.',
    codeSnippet: `<NodeGraphCanvas\n  defaultNodes={nodes}\n  defaultEdges={edges}\n  onNodesChange={setNodes}\n/>`,
    props: [
      { name: 'nodes / edges', type: 'FlowNode[] / FlowEdge[]', defaultValue: 'optional', description: 'Graph nodes and directed cubic bezier connections.' },
      { name: 'readOnly', type: 'boolean', defaultValue: 'false', description: 'Locks node edits and edge wiring.' },
    ],
  },

  /* ==================== COLLABORATION & GUIDANCE (4) ==================== */
  {
    id: 'notification-center',
    title: 'Notification Center / Activity Feed',
    exportName: 'NotificationCenter',
    category: 'collaboration-guidance',
    categoryTitle: 'Collaboration & Guidance',
    summary: 'Chronological optical dropdown, drawer, or inline feed aggregating alerts, mentions, and system updates with read/unread states and inline quick actions.',
    codeSnippet: `<NotificationCenter\n  items={notifications}\n  onItemsChange={setNotifications}\n  onActionClick={handleAction}\n/>`,
    props: [
      { name: 'items / defaultItems', type: 'NotificationItem[]', defaultValue: 'optional', description: 'Chronological notifications with category, read state, and actions.' },
      { name: 'mode', type: "'dropdown' | 'drawer' | 'inline'", defaultValue: "'dropdown'", description: 'Controls anchored popover, side drawer, or inline panel layout.' },
    ],
  },
  {
    id: 'comment-thread',
    title: 'Comment Thread',
    exportName: 'CommentThread',
    category: 'collaboration-guidance',
    categoryTitle: 'Collaboration & Guidance',
    summary: 'Nested optical discussion thread supporting inline replies, live @mentions autocomplete, emoji reaction toggle pills, and resolve tracking.',
    codeSnippet: `<CommentThread\n  comments={comments}\n  mentionUsers={team}\n  onCommentsChange={setComments}\n/>`,
    props: [
      { name: 'comments / defaultComments', type: 'CommentItem[]', defaultValue: 'optional', description: 'Nested discussion comments with reactions and replies.' },
      { name: 'mentionUsers', type: 'MentionUser[]', defaultValue: '[]', description: 'Teammates surfaced when typing @ in any composer.' },
      { name: 'maxDepth', type: 'number', defaultValue: '3', description: 'Maximum reply nesting depth clamped safely between 1 and 6.' },
    ],
  },
  {
    id: 'live-presence-indicator',
    title: 'Live Presence Indicator',
    exportName: 'LivePresenceIndicator',
    category: 'collaboration-guidance',
    categoryTitle: 'Collaboration & Guidance',
    summary: 'Overlapping crystal-bezel collaborator avatar stack with online/editing status rings, +N overflow popover, and optional live colored cursor stage.',
    codeSnippet: `<LivePresenceIndicator\n  users={collaborators}\n  maxVisible={4}\n  showCursors\n/>`,
    props: [
      { name: 'users', type: 'PresenceUser[]', defaultValue: 'required', description: 'Active workspace collaborators with status and optional live cursor.' },
      { name: 'maxVisible', type: 'number', defaultValue: '4', description: 'Maximum stacked avatars before rendering a +N overflow popover.' },
      { name: 'showCursors', type: 'boolean', defaultValue: 'false', description: 'Renders the optical live cursor stage below the avatar cluster.' },
    ],
  },
  {
    id: 'product-tour',
    title: 'Product Tour / Coachmarks',
    exportName: 'ProductTour',
    category: 'collaboration-guidance',
    categoryTitle: 'Collaboration & Guidance',
    summary: 'Guided sequence of optical spotlight frames and glass coachmark popovers walking first-time users step-by-step across workspace features.',
    codeSnippet: `<ProductTour\n  open={tourOpen}\n  onOpenChange={setTourOpen}\n  steps={tourSteps}\n  onComplete={finishTour}\n/>`,
    props: [
      { name: 'steps', type: 'TourStep[]', defaultValue: 'required', description: 'Ordered onboarding steps with optional CSS targetSelector.' },
      { name: 'mode', type: "'overlay' | 'inline'", defaultValue: "'overlay'", description: 'Full-screen spotlight scrim or embedded inline coachmark card.' },
      { name: 'closeOnEscape', type: 'boolean', defaultValue: 'true', description: 'Dismisses the tour cleanly when pressing Escape.' },
    ],
  },

  /* ==================== AI & CONVERSATIONAL INTERFACES (6) ==================== */
  {
    id: 'chat-message-stream',
    title: 'Chat Message Stream',
    exportName: 'ChatMessageStream',
    category: 'ai-conversational',
    categoryTitle: 'AI & Conversational Interfaces',
    summary: 'Scrollable optical conversation container distinguishing user, assistant, and system turns with sanitized avatars, timestamps, and streaming text indicators.',
    codeSnippet: `<ChatMessageStream messages={messages} maxHeightPx={380} />`,
    props: [
      { name: 'messages', type: 'ChatMessage[]', defaultValue: 'required', description: 'Ordered messages with role, content, timestamp, and optional streaming flag.' },
      { name: 'maxHeightPx', type: 'number', defaultValue: '420', description: 'Maximum scrollable stream viewport height (180..900px).' },
    ],
  },
  {
    id: 'prompt-composer',
    title: 'Prompt Composer',
    exportName: 'PromptComposer',
    category: 'ai-conversational',
    categoryTitle: 'AI & Conversational Interfaces',
    summary: 'Expandable multi-line optical prompt bar housing attachment triggers, voice-to-text toggles, inline model selection, IME-safe Enter submission, and Stop generation controls.',
    codeSnippet: `<PromptComposer\n  models={models}\n  onSubmit={(prompt, modelId) => send(prompt, modelId)}\n/>`,
    props: [
      { name: 'models', type: 'PromptModelOption[]', defaultValue: 'undefined', description: 'Optional selectable AI models displayed inside the composer toolbar.' },
      { name: 'isGenerating', type: 'boolean', defaultValue: 'false', description: 'Switches primary Send button to Stop invoking onStop.' },
    ],
  },
  {
    id: 'thinking-accordion',
    title: 'Thinking / Reasoning Accordion',
    exportName: 'ThinkingAccordion',
    category: 'ai-conversational',
    categoryTitle: 'AI & Conversational Interfaces',
    summary: 'Collapsible optical status panel surfacing step-by-step AI reasoning phases, tool invocations, and elapsed latency without cluttering the final answer.',
    codeSnippet: `<ThinkingAccordion title="Reasoning trace" steps={steps} isStreaming />`,
    props: [
      { name: 'steps', type: 'ThinkingStep[]', defaultValue: 'required', description: 'Reasoning steps with status, optional toolName, durationMs, and detail.' },
      { name: 'isStreaming', type: 'boolean', defaultValue: 'false', description: 'Displays live reasoning indicator badge.' },
    ],
  },
  {
    id: 'citation-chip',
    title: 'Citation / Source Chip',
    exportName: 'CitationChip',
    category: 'ai-conversational',
    categoryTitle: 'AI & Conversational Interfaces',
    summary: 'Compact inline optical reference pill linked to external or internal citations with a rich preview popover and strict URL protocol sanitization.',
    codeSnippet: `<CitationChip index={1} label="ADR-0003" title="Theme Engine" href="https://..." />`,
    props: [
      { name: 'label', type: 'string', defaultValue: 'required', description: 'Compact pill display text.' },
      { name: 'href', type: 'string', defaultValue: 'undefined', description: 'External link validated via sanitizeUrl allowlist.' },
    ],
  },
  {
    id: 'response-action-bar',
    title: 'Response Action Bar',
    exportName: 'ResponseActionBar',
    category: 'ai-conversational',
    categoryTitle: 'AI & Conversational Interfaces',
    summary: 'Subtle optical toolbar beneath generated output providing one-click copy confirmation, regenerate, share, and mutually exclusive thumbs-up/down feedback.',
    codeSnippet: `<ResponseActionBar contentToCopy={answer} onRegenerate={retry} />`,
    props: [
      { name: 'contentToCopy', type: 'string', defaultValue: 'undefined', description: 'Text copied to clipboard when clicking Copy.' },
      { name: 'feedback / onFeedbackChange', type: "'up' | 'down' | null", defaultValue: 'null', description: 'Controlled or uncontrolled helpfulness feedback state.' },
    ],
  },
  {
    id: 'split-artifact-canvas',
    title: 'Split Artifact / Preview Canvas',
    exportName: 'SplitArtifactCanvas',
    category: 'ai-conversational',
    categoryTitle: 'AI & Conversational Interfaces',
    summary: 'Side-by-side optical workspace pairing a live conversation pane with inspectable code, document, or rendered visual artifacts, version tabs, and copy/download controls.',
    codeSnippet: `<SplitArtifactCanvas conversationPane={<Chat />} artifacts={artifacts} />`,
    props: [
      { name: 'conversationPane', type: 'ReactNode', defaultValue: 'required', description: 'Left-hand conversation or prompt pane.' },
      { name: 'artifacts', type: 'ArtifactItem[]', defaultValue: 'required', description: 'Code, document, or live preview artifacts.' },
    ],
  },

  /* ==================== MEDIA, AUDIO & SPATIAL CONTROLS (6) ==================== */
  {
    id: 'custom-video-player',
    title: 'Custom Video Player',
    exportName: 'CustomVideoPlayer',
    category: 'media-spatial',
    categoryTitle: 'Media, Audio & Spatial Controls',
    summary: 'Optical media container with timeline scrubber, clickable chapter markers, playback speed selector, volume/mute slider, live captions overlay, and fullscreen control.',
    codeSnippet: `<CustomVideoPlayer title="Showcase" durationSeconds={240} chapters={chapters} />`,
    props: [
      { name: 'chapters', type: 'VideoChapter[]', defaultValue: '[]', description: 'Timestamped chapter markers clickable along the track.' },
      { name: 'defaultSpeed', type: 'number', defaultValue: '1', description: 'Initial playback speed multiplier.' },
    ],
  },
  {
    id: 'audio-waveform-player',
    title: 'Audio Waveform Player',
    exportName: 'AudioWaveformPlayer',
    category: 'media-spatial',
    categoryTitle: 'Media, Audio & Spatial Controls',
    summary: 'Visual optical sound-bar waveform player allowing click and keyboard scrubbing across voice notes, podcasts, or tracks with playback speed controls.',
    codeSnippet: `<AudioWaveformPlayer title="Voice Note" peaks={peaks} durationSeconds={120} />`,
    props: [
      { name: 'peaks', type: 'number[]', defaultValue: 'required', description: 'Normalized 0..1 amplitude peaks.' },
      { name: 'onSeek', type: '(seconds: number) => void', defaultValue: 'undefined', description: 'Fired when scrubbing to a timestamp.' },
    ],
  },
  {
    id: 'media-lightbox',
    title: 'Lightbox / Media Gallery Viewer',
    exportName: 'MediaLightbox',
    category: 'media-spatial',
    categoryTitle: 'Media, Audio & Spatial Controls',
    summary: 'Optical dark gallery overlay and inline viewer for high-resolution photos or videos with zoom, pan, filmstrip thumbnails, keyboard arrows, and URL allowlisting.',
    codeSnippet: `<MediaLightbox open={open} items={gallery} onOpenChange={setOpen} />`,
    props: [
      { name: 'items', type: 'LightboxMediaItem[]', defaultValue: 'required', description: 'Validated media items with titles and optional thumbnails.' },
      { name: 'mode', type: "'overlay' | 'inline'", defaultValue: "'overlay'", description: 'Fullscreen dark modal or embedded optical frame.' },
    ],
  },
  {
    id: 'before-after-slider',
    title: 'Before / After Comparison Slider',
    exportName: 'BeforeAfterSlider',
    category: 'media-spatial',
    categoryTitle: 'Media, Audio & Spatial Controls',
    summary: 'Overlapping visual comparator split by a draggable and keyboard-accessible vertical optical handle for inspecting edits, filters, or themes.',
    codeSnippet: `<BeforeAfterSlider beforeSrc={beforeImg} afterSrc={afterImg} defaultPosition={50} />`,
    props: [
      { name: 'beforeSrc / afterSrc', type: 'string', defaultValue: 'undefined', description: 'Sanitized image URLs for before/after frames.' },
      { name: 'position / defaultPosition', type: 'number', defaultValue: '50', description: 'Split percentage clamped 0..100.' },
    ],
  },
  {
    id: 'interactive-map-viewer',
    title: 'Interactive Map Viewer',
    exportName: 'InteractiveMapViewer',
    category: 'media-spatial',
    categoryTitle: 'Media, Audio & Spatial Controls',
    summary: 'Zoomable, pannable optical geographic canvas supporting custom pins, clustered markers, vector route polylines, and clickable optical info popups.',
    codeSnippet: `<InteractiveMapViewer pins={pins} routes={routes} />`,
    props: [
      { name: 'pins', type: 'MapPin[]', defaultValue: 'required', description: 'Location pins and optional cluster counts.' },
      { name: 'routes', type: 'MapRoute[]', defaultValue: '[]', description: 'Directed vector polylines linking pins.' },
    ],
  },
  {
    id: 'product-360-viewer',
    title: '3D / 360° Product Viewer',
    exportName: 'Product360Viewer',
    category: 'media-spatial',
    categoryTitle: 'Media, Audio & Spatial Controls',
    summary: 'Interactive drag-and-keyboard orbit viewport rotating 360° product frames or isometric refractive prism geometry with auto-spin and live degree telemetry.',
    codeSnippet: `<Product360Viewer title="Prismatic Lens" defaultAngle={35} />`,
    props: [
      { name: 'angle / defaultAngle', type: 'number', defaultValue: '0', description: 'Orbit azimuth normalized cleanly into 0..359 degrees.' },
      { name: 'autoRotate', type: 'boolean', defaultValue: 'false', description: 'Starts continuous 360° turntable rotation.' },
    ],
  },
];

export function filterComponents(
  entries: ComponentDocEntry[],
  category: DocsCategoryFilter,
  query: string
): ComponentDocEntry[] {
  const q = query.trim().toLowerCase();
  return entries.filter((item) => {
    const matchesCategory = category === 'overview' || item.category === category;
    const matchesQuery =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.exportName.toLowerCase().includes(q) ||
      item.summary.toLowerCase().includes(q) ||
      item.categoryTitle.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });
}

export function getCategoryCounts(entries: ComponentDocEntry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});
}
