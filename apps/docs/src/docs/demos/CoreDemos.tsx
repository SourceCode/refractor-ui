import { useState } from 'react';
import {
  Bell,
  FolderKanban,
  Layers,
  Mail,
  Plus,
  Power,
  Shield,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import {
  Accordion,
  AlertBanner,
  Avatar,
  BadgeStatus,
  Breadcrumbs,
  CalendarView,
  CarouselSlider,
  Checkbox,
  ContextualPopover,
  ContextMenuDropdown,
  DataTable,
  DateTimePicker,
  DropdownSelect,
  EmptyState,
  FileDropzone,
  FloatingActionButton,
  IconButton,
  ModalDialog,
  OpticalCharts,
  Pagination,
  PrimaryButton,
  PrismCard,
  PrismList,
  PrismTabs,
  ProgressAndSpinner,
  RadioGroup,
  RangeSlider,
  RatingControl,
  SearchWithSuggestions,
  SecondaryButton,
  SegmentedControl,
  SidebarDrawer,
  SkeletonLoader,
  SlideOverSheet,
  SplitButton,
  Stepper,
  TagChip,
  TextArea,
  TextInput,
  Timeline,
  ToastSnackbar,
  ToggleSwitch,
  Tooltip,
  TopNavBar,
  TreeView,
} from '@refractor-ui/core';
import { queryProjectRecords, type SortDirection } from '../../system/storage';
import {
  addCalendarEvent,
  addCollaborator,
  addVfsFile,
  clearProjectRecords,
  pushToast,
  removeVfsNode,
  restoreProjectRecords,
  setCommandPaletteOpen,
  useAppDispatch,
  useAppSelector,
} from '../../system/store';
import { assetUrl } from '../assetUrl';

export interface CoreDemosProps {
  componentId: string;
}

export function CoreDemos({ componentId }: CoreDemosProps) {
  const dispatch = useAppDispatch();
  const vfsNodes = useAppSelector((s) => s.system.vfsNodes);
  const projectRecords = useAppSelector((s) => s.system.projectRecords);
  const calendarEvents = useAppSelector((s) => s.system.calendarEvents);
  const collaborators = useAppSelector((s) => s.system.collaborators);

  // Local interactive states for playgrounds
  const [clickCount, setClickCount] = useState(0);
  const [powerState, setPowerState] = useState(true);
  const [segment, setSegment] = useState('design');
  const [email, setEmail] = useState('clara.vance@refractor.io');
  const [password, setPassword] = useState('optics-2026');
  const [bio, setBio] = useState(
    'Multi-layered refractive crystal surfaces with calibrated 4.5:1 contrast and subtle corner caustics.'
  );
  const [searchQ, setSearchQ] = useState('');
  const [selectRole, setSelectRole] = useState('architect');
  const [checkA, setCheckA] = useState(true);
  const [checkB, setCheckB] = useState(false);
  const [radioVal, setRadioVal] = useState('standard');
  const [toggleVal, setToggleVal] = useState(true);
  const [sliderVal, setSliderVal] = useState(76);
  const [pickedDate, setPickedDate] = useState('2026-11-20');
  const [pickedTime, setPickedTime] = useState('10:30 AM');
  const [rating, setRating] = useState(5);

  const [navActive, setNavActive] = useState('components');
  const [drawerActive, setDrawerActive] = useState('tokens');
  const [tabId, setTabId] = useState('overview');
  const [crumbPath, setCrumbPath] = useState(['Workspace', 'Design System', 'Optical Primitives']);
  const [page, setPage] = useState(2);
  const [stepIdx, setStepIdx] = useState(1);

  const [tableSortBy, setTableSortBy] = useState<'project' | 'completion' | 'budgetUsd' | 'id' | 'owner' | 'status'>('completion');
  const [tableSortDir, setTableSortDir] = useState<SortDirection>('desc');
  const [tableStatus, setTableStatus] = useState('All');
  const [selectedRows, setSelectedRows] = useState<string[]>(['PRJ-101']);
  const [chips, setChips] = useState(['Refractive Glass', 'WCAG AA', 'TypeScript', 'Redux']);
  const [activeChip, setActiveChip] = useState('Refractive Glass');
  const [selectedTreeId, setSelectedTreeId] = useState<string | null>('file-primary-btn');

  const [bannerVisible, setBannerVisible] = useState(true);
  const [progressVal, setProgressVal] = useState(68);
  const [isSkeleton, setIsSkeleton] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [presetName, setPresetName] = useState('Alabaster Studio v2');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'right' | 'bottom'>('right');
  const [newCollab, setNewCollab] = useState('');

  switch (componentId) {
    /* ==================== BUTTONS & ACTIONS ==================== */
    case 'primary-action-button':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <PrimaryButton
            size="sm"
            onClick={() => setClickCount((c) => c + 1)}
          >
            Save draft
          </PrimaryButton>
          <PrimaryButton
            size="md"
            onClick={() => {
              setClickCount((c) => c + 1);
              dispatch(pushToast({ title: 'Start project triggered', tone: 'amber' }));
            }}
          >
            Start project
          </PrimaryButton>
          <PrimaryButton
            size="lg"
            leadingIcon={<Sparkles className="w-4 h-4" />}
            onClick={() => setClickCount((c) => c + 1)}
          >
            Publish Kit ({clickCount})
          </PrimaryButton>
        </div>
      );

    case 'secondary-action-button':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <SecondaryButton
            tone="crystal"
            onClick={() => dispatch(pushToast({ title: 'Secondary crystal action', tone: 'info' }))}
          >
            Secondary
          </SecondaryButton>
          <SecondaryButton
            tone="cobalt"
            onClick={() => dispatch(pushToast({ title: 'Upgraded to Pro plan', tone: 'emerald' }))}
          >
            Pro plan
          </SecondaryButton>
          <SecondaryButton size="sm" tone="crystal">
            Learn more
          </SecondaryButton>
        </div>
      );

    case 'icon-only-button':
      return (
        <div className="flex items-center gap-4">
          <IconButton
            size="lg"
            active={powerState}
            aria-label="Toggle optical bench power"
            onClick={() => setPowerState((s) => !s)}
          >
            <Power className="w-5 h-5" />
          </IconButton>
          <IconButton
            size="md"
            aria-label="Add new layer"
            onClick={() => dispatch(pushToast({ title: 'Added optical layer', tone: 'emerald' }))}
          >
            <Plus className="w-5 h-5" />
          </IconButton>
          <IconButton
            size="sm"
            aria-label="Close inspector"
            onClick={() => dispatch(pushToast({ title: 'Closed inspector', tone: 'amber' }))}
          >
            <X className="w-4 h-4" />
          </IconButton>
        </div>
      );

    case 'button-group-segmented':
      return (
        <div className="flex flex-col items-center gap-3">
          <SegmentedControl
            value={segment}
            onChange={setSegment}
            options={[
              { value: 'design', label: 'Design Surface' },
              { value: 'tokens', label: 'Refraction Tokens' },
              { value: 'a11y', label: 'Accessibility' },
            ]}
          />
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Active workspace mode: <strong className="capitalize">{segment}</strong>
          </p>
        </div>
      );

    case 'split-button':
      return (
        <div className="flex flex-wrap items-center gap-4">
          <SplitButton
            label="Start project"
            onPrimaryClick={() =>
              dispatch(pushToast({ title: 'Started default optical project', tone: 'amber' }))
            }
            actions={[
              { id: 'template', label: 'Start from UI Kit Template', description: 'Includes all 75 components' },
              { id: 'import', label: 'Import Design Tokens JSON', description: 'Syncs palette & radii' },
              { id: 'blank', label: 'Empty TypeScript Workspace', description: 'Minimal Vite shell' },
            ]}
            onSelectAction={(act) =>
              dispatch(pushToast({ title: act.label, description: act.description, tone: 'emerald' }))
            }
          />
          <SplitButton
            tone="crystal"
            label="Export bundle"
            onPrimaryClick={() => dispatch(pushToast({ title: 'Exported ESM bundle', tone: 'info' }))}
            actions={[
              { id: 'cjs', label: 'Export CommonJS' },
              { id: 'css', label: 'Export CSS Tokens Only' },
            ]}
            onSelectAction={(act) => dispatch(pushToast({ title: act.label, tone: 'info' }))}
          />
        </div>
      );

    case 'floating-action-button':
      return (
        <div className="flex flex-wrap items-center gap-5">
          <FloatingActionButton
            aria-label="Create component"
            onClick={() => dispatch(pushToast({ title: 'Quick create opened', tone: 'amber' }))}
          />
          <FloatingActionButton
            tone="cobalt"
            label="New Collaborator"
            onClick={() => dispatch(pushToast({ title: 'Collaborator invite ready', tone: 'info' }))}
          />
          <FloatingActionButton
            tone="crystal"
            aria-label="Configure optics"
            icon={<Sliders className="w-5 h-5" />}
            onClick={() => dispatch(pushToast({ title: 'Optics calibration active', tone: 'emerald' }))}
          />
        </div>
      );

    /* ==================== FORM INPUTS & SELECTION ==================== */
    case 'text-input-field':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
          <TextInput
            label="Lead Engineer Email"
            type="email"
            leadingIcon={<Mail className="w-4 h-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            errorText={email && !email.includes('@') ? 'Enter a valid email address' : undefined}
            helperText="Used for release notifications"
          />
          <TextInput
            label="Signing Key Passphrase"
            type="password"
            leadingIcon={<Shield className="w-4 h-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            helperText="Click eye icon to toggle visibility"
          />
        </div>
      );

    case 'multi-line-text-area':
      return (
        <div className="w-full max-w-lg">
          <TextArea
            label="Component Design Specification"
            maxCharacters={240}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            helperText="Supports multi-line markdown notes"
          />
        </div>
      );

    case 'search-bar-suggestions':
      return (
        <div className="w-full max-w-lg">
          <SearchWithSuggestions
            value={searchQ}
            onChange={setSearchQ}
            placeholder="With suggestions"
            suggestions={[
              { id: '1', label: 'Primary Action Button', category: 'Buttons' },
              { id: '2', label: 'Dropdown Select Menu', category: 'Inputs' },
              { id: '3', label: 'Command Palette (Cmd+K)', category: 'Navigation' },
              { id: '4', label: 'Data Table / Grid', category: 'Data Display' },
              { id: '5', label: 'Toast / Snackbar', category: 'Feedback' },
            ]}
            onSelectSuggestion={(item) => {
              setSearchQ(item.label);
              dispatch(pushToast({ title: `Matched: ${item.label}`, tone: 'emerald' }));
            }}
            onQuickAdd={(q) =>
              dispatch(
                pushToast({
                  title: q ? `Saved "${q}" to recent searches` : 'Type a query to save',
                  tone: 'amber',
                })
              )
            }
          />
        </div>
      );

    case 'dropdown-select-menu':
      return (
        <div className="w-full max-w-xs">
          <DropdownSelect
            label="Workspace Role"
            value={selectRole}
            onChange={setSelectRole}
            options={[
              { value: 'architect', label: 'Principal UI Architect' },
              { value: 'optics', label: 'Optical Shader Engineer' },
              { value: 'product', label: 'Design Systems Lead' },
              { value: 'qa', label: 'Accessibility Auditor' },
            ]}
          />
        </div>
      );

    case 'checkbox':
      return (
        <div className="space-y-3">
          <Checkbox
            checked={checkA}
            onChange={setCheckA}
            label="Specular top-edge meniscus highlight"
            description="Renders crisp inner white curvature reflection"
          />
          <Checkbox
            checked={checkB}
            onChange={setCheckB}
            label="Bottom-right chromatic dispersion"
            description="Adds warm amber and cyan caustic shadow"
          />
          <Checkbox
            checked={checkA && checkB}
            indeterminate={checkA !== checkB}
            onChange={(next) => {
              setCheckA(next);
              setCheckB(next);
            }}
            label="All optical shader effects (Parent group)"
          />
        </div>
      );

    case 'radio-button-group':
      return (
        <div className="w-full max-w-md">
          <RadioGroup
            name="Optical Glass Thickness"
            value={radioVal}
            onChange={setRadioVal}
            options={[
              {
                value: 'thin',
                label: ' Thin Wafer (12px blur)',
                description: 'Lightweight translucency for dense data toolbars.',
              },
              {
                value: 'standard',
                label: 'Sculpted Crystal (18px blur)',
                description: 'Balanced depth matching the reference studio specimen.',
              },
              {
                value: 'deep',
                label: 'Heavy Optical Block (26px blur)',
                description: 'Maximum refraction dispersion for hero cards and modals.',
              },
            ]}
          />
        </div>
      );

    case 'toggle-switch':
      return (
        <div className="flex flex-wrap items-center gap-8">
          <ToggleSwitch
            checked={toggleVal}
            onChange={setToggleVal}
            label={toggleVal ? 'Refraction Active' : 'Refraction Muted'}
          />
          <ToggleSwitch
            checked={!toggleVal}
            onChange={(v) => setToggleVal(!v)}
            label="Reduced Motion Safe"
          />
        </div>
      );

    case 'range-slider':
      return (
        <div className="w-full max-w-md">
          <RangeSlider
            label="Caustic Dispersion Intensity"
            min={0}
            max={100}
            value={sliderVal}
            unit="%"
            onChange={setSliderVal}
          />
        </div>
      );

    case 'date-time-picker':
      return (
        <div className="w-full max-w-sm">
          <DateTimePicker
            dateIso={pickedDate}
            timeSlot={pickedTime}
            onChangeDate={setPickedDate}
            onChangeTime={setPickedTime}
          />
        </div>
      );

    case 'file-uploader-dropzone': {
      const uploadedList = vfsNodes
        .filter((n) => n.type === 'file')
        .slice(0, 4)
        .map((n) => ({
          name: n.name,
          sizeBytes: n.sizeBytes ?? 2048,
          mimeType: n.mimeType ?? 'text/plain',
        }));

      return (
        <div className="w-full max-w-md">
          <FileDropzone
            files={uploadedList}
            onUploadFiles={(files) => {
              files.forEach((f) => dispatch(addVfsFile(f)));
              dispatch(
                pushToast({
                  title: `Stored ${files.length} file(s) in VFS`,
                  description: 'Visible immediately in Tree View.',
                  tone: 'emerald',
                })
              );
            }}
            onRemoveFile={(fileName) => {
              const target = vfsNodes.find((n) => n.name === fileName);
              if (target) dispatch(removeVfsNode(target.id));
            }}
          />
        </div>
      );
    }

    case 'rating-control':
      return <RatingControl value={rating} onChange={setRating} />;

    /* ==================== NAVIGATION ==================== */
    case 'top-navigation-bar':
      return (
        <div className="w-full">
          <TopNavBar
            brand="Refractor OS"
            activeLinkId={navActive}
            onSelectLink={setNavActive}
            onSearchClick={() => dispatch(setCommandPaletteOpen(true))}
            links={[
              { id: 'overview', label: 'Overview' },
              { id: 'components', label: 'Components' },
              { id: 'tokens', label: 'Tokens' },
              { id: 'releases', label: 'Releases' },
            ]}
          />
        </div>
      );

    case 'sidebar-navigation-drawer':
      return (
        <SidebarDrawer
          title="Design System"
          activeId={drawerActive}
          onSelect={setDrawerActive}
          items={[
            { id: 'tokens', label: 'Optical Tokens', count: 24, icon: <Sparkles className="w-4 h-4" /> },
            { id: 'layers', label: 'Surface Layers', count: 6, icon: <Layers className="w-4 h-4" /> },
            { id: 'projects', label: 'Active Sprints', count: 7, icon: <FolderKanban className="w-4 h-4" /> },
            { id: 'alerts', label: 'System Notices', count: 2, icon: <Bell className="w-4 h-4" /> },
          ]}
        />
      );

    case 'tabs':
      return (
        <div className="w-full max-w-xl">
          <PrismTabs
            showSpecimenPill
            activeTabId={tabId}
            onChange={setTabId}
            tabs={[
              {
                id: 'overview',
                label: 'Surface Physics',
                content:
                  'Optical glass surfaces combine a top 1.5px specular highlight with a 22px saturated backdrop blur and subtle bottom-right chromatic dispersion.',
              },
              {
                id: 'accessibility',
                label: 'Contrast & Focus',
                content:
                  'Every interactive element exposes semantic ARIA roles, keyboard navigation, and 4.5:1 foreground text legibility across Alabaster and Obsidian modes.',
              },
              {
                id: 'theming',
                label: 'MUI Theme Sync',
                content:
                  'createPrismTheme() mirrors Material-UI palette, typography, and shape contracts for seamless enterprise adoption.',
              },
            ]}
          />
        </div>
      );

    case 'breadcrumbs':
      return (
        <div className="flex flex-col items-center gap-2.5">
          <Breadcrumbs
            items={crumbPath.map((label, idx) => ({ id: String(idx), label }))}
            onNavigate={(id) => {
              const idx = Number(id);
              setCrumbPath((prev) => prev.slice(0, idx + 1));
            }}
          />
          {crumbPath.length < 3 && (
            <button
              type="button"
              onClick={() => setCrumbPath(['Workspace', 'Design System', 'Optical Primitives'])}
              className="text-xs text-orange-600 dark:text-orange-400 underline cursor-pointer"
            >
              Reset full path
            </button>
          )}
        </div>
      );

    case 'pagination':
      return (
        <div className="flex flex-col items-center gap-2">
          <Pagination currentPage={page} totalPages={5} onPageChange={setPage} />
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Showing page {page} of 5
          </span>
        </div>
      );

    case 'stepper':
      return (
        <div className="w-full space-y-4">
          <Stepper
            activeStepIndex={stepIdx}
            onStepClick={setStepIdx}
            steps={[
              { id: 's1', title: 'Token Calibration', subtitle: 'Refractive indices' },
              { id: 's2', title: 'Component Assembly', subtitle: '75 accessible primitives' },
              { id: 's3', title: 'Production Publish', subtitle: 'Verified bundle' },
            ]}
          />
          <div className="flex justify-end gap-2">
            <SecondaryButton
              size="sm"
              disabled={stepIdx === 0}
              onClick={() => setStepIdx((s) => Math.max(0, s - 1))}
            >
              Previous
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              onClick={() => setStepIdx((s) => (s < 2 ? s + 1 : 0))}
            >
              {stepIdx < 2 ? 'Next stage' : 'Restart flow'}
            </PrimaryButton>
          </div>
        </div>
      );

    case 'command-palette':
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <PrimaryButton onClick={() => dispatch(setCommandPaletteOpen(true))}>
            Open Command Palette (⌘K)
          </PrimaryButton>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Press <kbd className="font-mono px-1.5 py-0.5 rounded prism-well">Cmd+K</kbd> or{' '}
            <kbd className="font-mono px-1.5 py-0.5 rounded prism-well">Ctrl+K</kbd> anywhere on the site.
          </p>
        </div>
      );

    /* ==================== DATA DISPLAY & CONTENT ==================== */
    case 'card':
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full items-stretch">
          <PrismCard specimenSlab title="Card" className="mx-auto" />
          <PrismCard
            kicker="Optical Component · Surface"
            title="Dichroic Studio Architecture"
            footer={
              <>
                <span className="text-xs font-mono tabular-nums text-slate-500">24px Radius</span>
                <SecondaryButton
                  size="sm"
                  onClick={() => dispatch(pushToast({ title: 'Opened card specification', tone: 'info' }))}
                >
                  Inspect
                </SecondaryButton>
              </>
            }
          >
            Combines a sweeping diagonal specular reflection with single-elevation crystal depth.
          </PrismCard>
        </div>
      );

    case 'data-table-grid': {
      const result = queryProjectRecords(projectRecords, {
        statusFilter: tableStatus,
        sortBy: tableSortBy,
        sortDir: tableSortDir,
        page: 1,
        pageSize: 6,
      });

      return (
        <div className="w-full space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              ariaLabel="Filter rows by status"
              value={tableStatus}
              onChange={setTableStatus}
              options={[
                { value: 'All', label: 'All' },
                { value: 'Active', label: 'Active' },
                { value: 'Review', label: 'Review' },
              ]}
            />
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {selectedRows.length} selected · {result.totalFiltered} records
            </span>
          </div>

          {result.rows.length === 0 ? (
            <EmptyState
              title="No matching records"
              description="Restore the default engineering dataset to inspect sortable columns."
              actionLabel="Restore Records"
              onAction={() => {
                setTableStatus('All');
                dispatch(restoreProjectRecords());
              }}
            />
          ) : (
            <DataTable
              rows={result.rows}
              sortBy={tableSortBy}
              sortDir={tableSortDir}
              onSortChange={(col) => {
                if (col === tableSortBy) {
                  setTableSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                } else {
                  setTableSortBy(col as typeof tableSortBy);
                  setTableSortDir('asc');
                }
              }}
              selectedIds={selectedRows}
              onToggleSelect={(id) =>
                setSelectedRows((prev) =>
                  prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
                )
              }
            />
          )}
        </div>
      );
    }

    case 'list':
      return (
        <div className="w-full max-w-xl">
          <PrismList
            items={[
              {
                id: 'l1',
                title: 'Refraction Token Audit',
                subtitle: 'Verified contrast across Alabaster and Obsidian surfaces',
                meta: '2m ago',
                leading: <Sparkles className="w-4 h-4" />,
                actionLabel: 'View',
              },
              {
                id: 'l2',
                title: 'Virtual File System Snapshot',
                subtitle: '9 design system files indexed in browser storage',
                meta: '14m ago',
                leading: <FolderKanban className="w-4 h-4" />,
                actionLabel: 'Open',
              },
              {
                id: 'l3',
                title: 'Collaborator Seat Added',
                subtitle: `Active team: ${collaborators.join(', ')}`,
                meta: '1h ago',
                leading: <Mail className="w-4 h-4" />,
                actionLabel: 'Manage',
              },
            ]}
            onItemAction={(item) =>
              dispatch(pushToast({ title: item.title, description: item.subtitle, tone: 'info' }))
            }
          />
        </div>
      );

    case 'avatar':
      return (
        <div className="flex flex-wrap items-center gap-5">
          <Avatar
            size="lg"
            src={assetUrl('src/assets/images/avatar_product_lead_1795197572008.jpg')}
            alt="Clara Vance, Principal Product Designer"
            initials="CV"
          />
          <Avatar
            size="lg"
            shape="squircle"
            src={assetUrl('src/assets/images/avatar_design_engineer_1795197572097.jpg')}
            alt="Marcus Chen, Systems Architect"
            initials="MC"
          />
          <Avatar size="md" alt="Elena Rostova" initials="ER" />
          <Avatar size="sm" shape="squircle" alt="Refractor Core" initials="RC" />
        </div>
      );

    case 'badge-status-dot':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <BadgeStatus count={8} label="Pending PR reviews" />
          <BadgeStatus tone="online" label="VFS Storage Mounted" />
          <BadgeStatus tone="warning" label="Contrast Check Queued" />
          <BadgeStatus tone="offline" label="Archive Read-Only" />
        </div>
      );

    case 'tag-chip':
      return (
        <div className="flex flex-wrap items-center gap-2.5">
          {chips.map((chip) => (
            <TagChip
              key={chip}
              label={chip}
              selected={activeChip === chip}
              onSelect={() => setActiveChip(chip)}
              onDismiss={
                chips.length > 1
                  ? () => setChips((prev) => prev.filter((c) => c !== chip))
                  : undefined
              }
            />
          ))}
          {chips.length < 4 && (
            <button
              type="button"
              onClick={() => setChips(['Refractive Glass', 'WCAG AA', 'TypeScript', 'Redux'])}
              className="text-xs text-orange-600 dark:text-orange-400 underline ml-2 cursor-pointer"
            >
              Reset chips
            </button>
          )}
        </div>
      );

    case 'accordion-collapsible':
      return (
        <div className="w-full max-w-xl">
          <Accordion
            allowMultiple
            items={[
              {
                id: 'acc-1',
                title: 'How does the optical crystal material preserve legibility?',
                body: 'Each surface pairs high-blur backdrop saturation with a recessed opaque well for input text and calibrated dark/light foreground tokens exceeding 4.5:1 WCAG AA contrast.',
              },
              {
                id: 'acc-2',
                title: 'Are components decoupled from storage services?',
                body: 'Yes. Every component inside @refractor-ui/core receives pure typed props and callbacks with zero coupling to application state or storage engines.',
              },
              {
                id: 'acc-3',
                title: 'Can I customize refraction dispersion globally?',
                body: 'Use the Optical Dispersion selector in the workspace toolbar or update optics.refraction in createPrismTheme() between subtle, standard, and vivid.',
              },
            ]}
          />
        </div>
      );

    case 'carousel-media-slider':
      return (
        <div className="w-full max-w-xl">
          <CarouselSlider
            slides={[
              {
                id: 'slide-1',
                title: 'Dichroic Optical Crystal Study',
                caption: 'Warm amber and cool sky-cyan caustic dispersion on matte studio alabaster.',
                imageSrc: assetUrl('src/assets/images/carousel_optical_glass_1_1795197571956.jpg'),
              },
              {
                id: 'slide-2',
                title: 'Tactile Frosted Lens & Precision Dials',
                caption: 'Recessed frosted acrylic geometry paired with industrial precision controls.',
                imageSrc: assetUrl('src/assets/images/carousel_optical_glass_2_1795197571569.jpg'),
              },
            ]}
          />
        </div>
      );

    case 'tree-view':
      return (
        <div className="w-full max-w-md space-y-2">
          <TreeView
            nodes={vfsNodes}
            selectedNodeId={selectedTreeId}
            onSelectNode={(node) => setSelectedTreeId(node.id)}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 px-1 font-mono">
            Selected VFS node: {vfsNodes.find((n) => n.id === selectedTreeId)?.name ?? 'None'}
          </p>
        </div>
      );

    case 'timeline':
      return (
        <div className="w-full max-w-lg">
          <Timeline
            entries={[
              {
                id: 't1',
                timestamp: '09:15 AM',
                title: 'Optical Token Calibration',
                detail: 'Established specular highlight curves and warm-amber / cyan corner dispersion.',
                tone: 'emerald',
              },
              {
                id: 't2',
                timestamp: '11:40 AM',
                title: '75-Component Library Verification',
                detail: 'Completed keyboard, ARIA role, and dual-theme contrast audit across all 6 categories.',
                tone: 'cobalt',
              },
              {
                id: 't3',
                timestamp: '02:30 PM',
                title: 'Documentation Playground Live',
                detail: 'Interactive TSX snippets, live prop tables, and Cmd+K search published.',
                tone: 'amber',
              },
            ]}
          />
        </div>
      );

    case 'calendar-view':
      return (
        <div className="w-full max-w-xl">
          <CalendarView
            events={calendarEvents}
            onAddEvent={(dateIso, title) => {
              dispatch(
                addCalendarEvent({
                  dateIso,
                  title,
                  timeLabel: '12:00 PM',
                  category: 'Review',
                })
              );
              dispatch(pushToast({ title: `Scheduled "${title}"`, description: dateIso, tone: 'emerald' }));
            }}
          />
        </div>
      );

    case 'charts-graphs':
      return (
        <div className="w-full max-w-xl">
          <OpticalCharts
            data={[
              { label: 'Buttons', value: 420 },
              { label: 'Inputs', value: 385 },
              { label: 'Data Grid', value: 310 },
              { label: 'Overlays', value: 265 },
              { label: 'Nav', value: 290 },
            ]}
          />
        </div>
      );

    /* ==================== FEEDBACK & SYSTEM STATUS ==================== */
    case 'toast-snackbar':
      return (
        <div className="flex flex-wrap items-center justify-center gap-4">
          <ToastSnackbar
            title="Toast"
            description="Warm-amber hairline capsule"
            onDismiss={() => dispatch(pushToast({ title: 'Spawned live corner toast', tone: 'amber' }))}
          />
          <PrimaryButton
            size="sm"
            onClick={() =>
              dispatch(
                pushToast({
                  title: 'Configuration saved',
                  description: 'All optical tokens synced to Redux store.',
                  tone: 'emerald',
                })
              )
            }
          >
            Trigger Live Toast
          </PrimaryButton>
        </div>
      );

    case 'alert-banner':
      return (
        <div className="w-full max-w-xl space-y-3">
          {bannerVisible ? (
            <AlertBanner
              severity="warning"
              title="Refraction Shader Calibration Notice"
              message="High-dispersion mode increases caustic glow opacity to 135% on supported displays."
              actionLabel="Acknowledge"
              onAction={() =>
                dispatch(pushToast({ title: 'Calibration acknowledged', tone: 'emerald' }))
              }
              onDismiss={() => setBannerVisible(false)}
            />
          ) : (
            <SecondaryButton size="sm" onClick={() => setBannerVisible(true)}>
              Restore Alert Banner
            </SecondaryButton>
          )}
        </div>
      );

    case 'progress-loading-spinner':
      return (
        <div className="w-full max-w-md space-y-3">
          <ProgressAndSpinner progress={progressVal} indeterminateSpinner />
          <div className="flex gap-2">
            <SecondaryButton
              size="sm"
              onClick={() => setProgressVal((p) => (p >= 100 ? 20 : Math.min(100, p + 20)))}
            >
              Advance +20%
            </SecondaryButton>
          </div>
        </div>
      );

    case 'skeleton-loader':
      return (
        <div className="w-full max-w-md space-y-3">
          <div className="flex justify-end">
            <ToggleSwitch
              checked={isSkeleton}
              onChange={setIsSkeleton}
              label={isSkeleton ? 'Loading State' : 'Loaded Content'}
            />
          </div>
          <SkeletonLoader loading={isSkeleton}>
            <PrismCard kicker="Resolved Payload" title="Clara Vance · Design Systems">
              All 75 optical components hydrated cleanly with zero layout shift.
            </PrismCard>
          </SkeletonLoader>
        </div>
      );

    case 'empty-state':
      return (
        <div className="w-full">
          {projectRecords.length > 0 ? (
            <div className="flex flex-col items-center gap-3">
              <EmptyState
                title="No archived snapshots yet"
                description="When you archive a component milestone or clear project records, helpful recovery guidance appears here."
                actionLabel="Create Sample Snapshot"
                onAction={() =>
                  dispatch(
                    pushToast({
                      title: 'Baseline snapshot created',
                      description: 'Saved v2.4 optical token state.',
                      tone: 'emerald',
                    })
                  )
                }
              />
              <button
                type="button"
                onClick={() => dispatch(clearProjectRecords())}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white underline cursor-pointer"
              >
                Test empty state on Data Table
              </button>
            </div>
          ) : (
            <EmptyState
              title="Project table is currently empty"
              description="Click below to repopulate all 7 engineering records across Data Table and Charts."
              actionLabel="Restore Engineering Dataset"
              onAction={() => dispatch(restoreProjectRecords())}
            />
          )}
        </div>
      );

    /* ==================== OVERLAYS & POPUPS ==================== */
    case 'modal-dialog':
      return (
        <div>
          <PrimaryButton onClick={() => setModalOpen(true)}>Open Modal Dialog</PrimaryButton>
          <ModalDialog
            open={modalOpen}
            title="Save Optical Theme Preset"
            description="Persist current surface mode and dispersion intensity to workspace profile."
            confirmLabel="Save Preset"
            onConfirm={() =>
              dispatch(
                pushToast({
                  title: `Saved preset "${presetName}"`,
                  tone: 'emerald',
                })
              )
            }
            onClose={() => setModalOpen(false)}
          >
            <TextInput
              label="Preset Name"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
            />
          </ModalDialog>
        </div>
      );

    case 'popover-contextual-card':
      return (
        <div className="flex flex-wrap items-start justify-center gap-6 w-full">
          <ContextualPopover
            inlineSpecimen
            title="Find files..."
            subtitle="Add collaborator"
            ctaLabel="Pro plan"
            onCtaClick={() =>
              dispatch(
                pushToast({
                  title: 'Pro plan workspace active',
                  description: `Collaborators: ${collaborators.join(', ')}`,
                  tone: 'info',
                })
              )
            }
          />
          <ContextualPopover
            triggerLabel="Toggle Anchored Popover"
            title="Quick VFS Lookup"
            subtitle={`${vfsNodes.length} indexed items`}
            ctaLabel="Sync Storage"
            onCtaClick={() => dispatch(pushToast({ title: 'Storage synchronized', tone: 'emerald' }))}
          />
        </div>
      );

    case 'tooltip':
      return (
        <div className="flex flex-wrap items-center gap-6 py-4">
          <Tooltip content="Warm tangerine primary glass" placement="top">
            <PrimaryButton size="sm">Hover Top Tooltip</PrimaryButton>
          </Tooltip>
          <Tooltip content="Cool ice-blue crystal glass" placement="bottom">
            <SecondaryButton size="sm">Hover Bottom Tooltip</SecondaryButton>
          </Tooltip>
        </div>
      );

    case 'context-menu-dropdown':
      return (
        <div className="w-full max-w-lg">
          <ContextMenuDropdown
            actions={[
              { id: 'dup', label: 'Duplicate Component Token', shortcut: '⌘D' },
              { id: 'copy', label: 'Copy TSX Import Path', shortcut: '⌘C' },
              { id: 'inspect', label: 'Inspect Optical Bounds', shortcut: '⌥I' },
              { id: 'del', label: 'Reset Overrides', shortcut: '⌫', destructive: true },
            ]}
            onSelect={(act) =>
              dispatch(pushToast({ title: act.label, tone: act.destructive ? 'critical' : 'info' }))
            }
          />
        </div>
      );

    case 'slide-over-bottom-sheet':
      return (
        <div className="flex flex-wrap items-center gap-3">
          <PrimaryButton
            size="sm"
            onClick={() => {
              setSheetMode('right');
              setSheetOpen(true);
            }}
          >
            Open Right Slide-Over
          </PrimaryButton>
          <SecondaryButton
            size="sm"
            onClick={() => {
              setSheetMode('bottom');
              setSheetOpen(true);
            }}
          >
            Open Bottom Sheet
          </SecondaryButton>

          <SlideOverSheet
            open={sheetOpen}
            mode={sheetMode}
            title="Workspace Collaborators & Optics"
            subtitle="Manage active team members without leaving the current page"
            onClose={() => setSheetOpen(false)}
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                  Active Collaborators ({collaborators.length})
                </div>
                <ul className="space-y-1.5">
                  {collaborators.map((name) => (
                    <li
                      key={name}
                      className="prism-well px-3.5 py-2 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCollab.trim()) return;
                  dispatch(addCollaborator(newCollab));
                  dispatch(pushToast({ title: `Invited ${newCollab}`, tone: 'emerald' }));
                  setNewCollab('');
                }}
                className="space-y-2.5"
              >
                <TextInput
                  label="Add Collaborator"
                  placeholder="Enter teammate name..."
                  value={newCollab}
                  onChange={(e) => setNewCollab(e.target.value)}
                />
                <PrimaryButton type="submit" size="sm">
                  Add to Workspace
                </PrimaryButton>
              </form>
            </div>
          </SlideOverSheet>
        </div>
      );

    default:
      return null;
  }
}
