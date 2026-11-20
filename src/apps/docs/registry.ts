import { DocsCategoryFilter } from '../../system/store';

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
