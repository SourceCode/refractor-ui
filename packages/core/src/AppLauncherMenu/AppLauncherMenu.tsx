'use client';

import {
  useCallback,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Activity,
  Clock,
  Code2,
  Cpu,
  FileText,
  HardDrive,
  LayoutGrid,
  Lock,
  Moon,
  Palette,
  PenTool,
  Pin,
  PinOff,
  Power,
  RotateCw,
  Search,
  Sparkles,
  Terminal,
  Wrench,
  X,
} from 'lucide-react';
import type { BaseProps } from '../BaseProps';
import { stableClassName } from '../naming';
import { useComponentOverride } from '../theme/PrismThemeProvider';
import { cx, mergeProps } from '../utils/mergeProps';
import { STYLE_BORDER_DIVIDER, STYLE_INFO_MAIN, STYLE_PRIMARY_MAIN, STYLE_TEXT_PRIMARY, STYLE_TEXT_SECONDARY } from '../utils/styles';
import { memoWithDisplayName } from '../utils/memo';
import { themeProps } from '../utils/themeProps';

export type AppLauncherCategory =
  | 'pinned'
  | 'all'
  | 'design'
  | 'engineering'
  | 'utilities';

export type AppLauncherPowerAction = 'lock' | 'sleep' | 'restart' | 'shutdown';

export type AppLauncherTone = 'primary' | 'info' | 'emerald' | 'amber' | 'rose';

export interface AppLauncherItem {
  /** Stable unique identifier for the installed application. */
  id: string;
  /** Visible display name of the application. */
  name: string;
  /** Functional application category shown in category filters. */
  category: Exclude<AppLauncherCategory, 'pinned' | 'all'>;
  /** Whether the application is currently pinned to the Pinned view. */
  pinned: boolean;
  /** Optional concise status or edition badge (e.g., `'Pro'`, `'v2'`, `'Beta'`). */
  badge?: string;
  /** Semantic optical accent tone mapped strictly to `--prism-*` tokens (defaults to `'primary'`). */
  tone?: AppLauncherTone;
}

export interface AppLauncherRecentDoc {
  /** Stable unique identifier for the recent document entry. */
  id: string;
  /** File or document title. */
  title: string;
  /** Source application that last opened the document. */
  appName: string;
  /** Human-readable relative or formatted timestamp. */
  openedAt: string;
}

type AppLauncherMenuBaseProps = Omit<BaseProps<HTMLDivElement>, 'onChange'>;

export interface AppLauncherMenuProps extends AppLauncherMenuBaseProps {
  /** Profile display name rendered in the footer (defaults to `'Clara Vance'`). */
  userName?: string;
  /** Profile role or subtitle rendered beneath the user name (defaults to `'Principal Designer'`). */
  userRole?: string;
  /** Controlled list of installed applications. */
  apps?: ReadonlyArray<AppLauncherItem>;
  /** Initial uncontrolled list of installed applications (defaults to 8 realistic studio apps). */
  defaultApps?: ReadonlyArray<AppLauncherItem>;
  /** Recent documents rendered below the application grid (defaults to 4 recent studio documents). */
  recentDocs?: ReadonlyArray<AppLauncherRecentDoc>;
  /** Callback invoked when an application tile is launched via click or keyboard Enter/Space. */
  onLaunchApp?: (app: AppLauncherItem) => void;
  /** Callback invoked when an application's pinned state is toggled. */
  onTogglePin?: (appId: string, pinned: boolean) => void;
  /** Callback invoked when a recent document row is opened. */
  onOpenRecent?: (doc: AppLauncherRecentDoc) => void;
  /** Callback invoked when a footer power control (`lock`, `sleep`, `restart`, `shutdown`) is triggered. */
  onPowerAction?: (action: AppLauncherPowerAction) => void;
  /** Disables search, category filtering, app launching, pinning, recent files, and power controls. */
  disabled?: boolean;
}

interface CategorySpec {
  id: AppLauncherCategory;
  label: string;
  heading: string;
}

interface PowerControlSpec {
  action: AppLauncherPowerAction;
  label: string;
  tone: AppLauncherTone;
}

const DEFAULT_ARIA_LABEL = 'Application launcher';
const DEFAULT_USER_NAME = 'Clara Vance';
const DEFAULT_USER_ROLE = 'Principal Designer';

const LAUNCHER_CATEGORY_IDS: ReadonlyArray<AppLauncherCategory> = [
  'pinned',
  'all',
  'design',
  'engineering',
  'utilities',
];

function getCategorySpec(category: AppLauncherCategory): CategorySpec {
  switch (category) {
    case 'pinned':
      return { id: 'pinned', label: 'Pinned', heading: 'Pinned Applications' };
    case 'all':
      return { id: 'all', label: 'All Apps', heading: 'All Applications' };
    case 'design':
      return { id: 'design', label: 'Design', heading: 'Design Applications' };
    case 'engineering':
      return {
        id: 'engineering',
        label: 'Engineering',
        heading: 'Engineering Applications',
      };
    case 'utilities':
      return {
        id: 'utilities',
        label: 'Utilities',
        heading: 'Utility Applications',
      };
  }
}

const LAUNCHER_CATEGORIES: ReadonlyArray<CategorySpec> =
  LAUNCHER_CATEGORY_IDS.map(getCategorySpec);

const POWER_CONTROLS: ReadonlyArray<PowerControlSpec> = [
  { action: 'lock', label: 'Lock', tone: 'info' },
  { action: 'sleep', label: 'Sleep', tone: 'primary' },
  { action: 'restart', label: 'Restart', tone: 'amber' },
  { action: 'shutdown', label: 'Shut Down', tone: 'rose' },
];

const DEFAULT_LAUNCHER_APPS: ReadonlyArray<AppLauncherItem> = [
  {
    id: 'prism-studio',
    name: 'Prism Studio',
    category: 'design',
    pinned: true,
    badge: 'Pro',
    tone: 'primary',
  },
  {
    id: 'vector-forge',
    name: 'Vector Forge',
    category: 'design',
    pinned: true,
    tone: 'rose',
  },
  {
    id: 'refractor-ide',
    name: 'Refractor IDE',
    category: 'engineering',
    pinned: true,
    badge: 'v2',
    tone: 'info',
  },
  {
    id: 'terminal-mux',
    name: 'Terminal Mux',
    category: 'engineering',
    pinned: false,
    tone: 'emerald',
  },
  {
    id: 'shader-lab',
    name: 'Shader Lab',
    category: 'engineering',
    pinned: false,
    badge: 'Beta',
    tone: 'amber',
  },
  {
    id: 'color-optics',
    name: 'Color Optics',
    category: 'design',
    pinned: false,
    tone: 'amber',
  },
  {
    id: 'system-monitor',
    name: 'System Monitor',
    category: 'utilities',
    pinned: true,
    tone: 'emerald',
  },
  {
    id: 'vault-archive',
    name: 'Vault Archive',
    category: 'utilities',
    pinned: false,
    tone: 'info',
  },
];

const DEFAULT_RECENT_DOCS: ReadonlyArray<AppLauncherRecentDoc> = [
  {
    id: 'doc-tokens',
    title: 'Optical-Tokens-v2.prism',
    appName: 'Prism Studio',
    openedAt: '4m ago',
  },
  {
    id: 'doc-theme',
    title: 'createPrismTheme.ts',
    appName: 'Refractor IDE',
    openedAt: '22m ago',
  },
  {
    id: 'doc-icons',
    title: 'Refraction-Glyph-Set.svg',
    appName: 'Vector Forge',
    openedAt: '1h ago',
  },
  {
    id: 'doc-metrics',
    title: 'Frame-Budget-Audit.log',
    appName: 'System Monitor',
    openedAt: 'Yesterday',
  },
];

function getToneAccentVar(tone: AppLauncherTone): string {
  switch (tone) {
    case 'primary':
      return 'var(--prism-primary-main)';
    case 'info':
      return 'var(--prism-info-main)';
    case 'emerald':
      return 'var(--prism-success-main)';
    case 'amber':
      return 'var(--prism-warning-main)';
    case 'rose':
      return 'var(--prism-error-main)';
  }
}

function renderAppGlyph(app: AppLauncherItem): ReactNode {
  switch (app.id) {
    case 'prism-studio':
      return <Sparkles aria-hidden="true" className="w-5 h-5" />;
    case 'vector-forge':
      return <PenTool aria-hidden="true" className="w-5 h-5" />;
    case 'terminal-mux':
      return <Terminal aria-hidden="true" className="w-5 h-5" />;
    case 'shader-lab':
      return <Cpu aria-hidden="true" className="w-5 h-5" />;
    case 'system-monitor':
      return <Activity aria-hidden="true" className="w-5 h-5" />;
    case 'vault-archive':
      return <HardDrive aria-hidden="true" className="w-5 h-5" />;
    default:
      break;
  }

  switch (app.category) {
    case 'design':
      return <Palette aria-hidden="true" className="w-5 h-5" />;
    case 'engineering':
      return <Code2 aria-hidden="true" className="w-5 h-5" />;
    case 'utilities':
      return <Wrench aria-hidden="true" className="w-5 h-5" />;
  }
}

function renderPowerIcon(action: AppLauncherPowerAction): ReactNode {
  switch (action) {
    case 'lock':
      return <Lock aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'sleep':
      return <Moon aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'restart':
      return <RotateCw aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
    case 'shutdown':
      return <Power aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />;
  }
}

function dedupeById<T extends { id: string }>(list: ReadonlyArray<T>): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of list) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function matchesCategory(
  app: AppLauncherItem,
  category: AppLauncherCategory
): boolean {
  if (category === 'all') {
    return true;
  }
  if (category === 'pinned') {
    return app.pinned;
  }
  return app.category === category;
}

function matchesLinearQuery(
  normalizedQuery: string,
  fields: ReadonlyArray<string>
): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }
  for (const field of fields) {
    if (field.toLowerCase().includes(normalizedQuery)) {
      return true;
    }
  }
  return false;
}

function getDisplayAppName(app: AppLauncherItem): string {
  return app.name.trim() || 'Application';
}

function getDisplayDocTitle(doc: AppLauncherRecentDoc): string {
  return doc.title.trim() || 'Untitled document';
}

function getUserInitials(name: string): string {
  const trimmed = name.trim();
  const spaceIdx = trimmed.indexOf(' ');
  if (spaceIdx === -1) {
    return trimmed.slice(0, 2).toUpperCase();
  }
  const afterSpace = trimmed.slice(spaceIdx + 1).trimStart();
  return `${trimmed.charAt(0)}${afterSpace.charAt(0)}`.toUpperCase();
}

const headerClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'header');
const searchBarClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'search-bar');
const searchInputClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'search-input');
const categoryBarClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'category-bar');
const categoryPillClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'category-pill');
const appsSectionClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'apps-section');
const appsGridClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'apps-grid');
const appTileClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'app-tile');
const appLaunchBtnClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'app-launch-btn');
const appIconClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'app-icon');
const appBadgeClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'app-badge');
const appPinBtnClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'app-pin-btn');
const emptyClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'empty');
const recentSectionClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'recent-section');
const recentListClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'recent-list');
const recentRowClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'recent-row');
const footerClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'footer');
const userCardClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'user-card');
const userAvatarClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'user-avatar');
const powerControlsClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'power-controls');
const powerBtnClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'power-btn');
const statusClass = /*#__PURE__*/ stableClassName('app-launcher-menu', 'status');

function AppLauncherMenuInner({
  userName = DEFAULT_USER_NAME,
  userRole = DEFAULT_USER_ROLE,
  apps,
  defaultApps,
  recentDocs,
  onLaunchApp,
  onTogglePin,
  onOpenRecent,
  onPowerAction,
  disabled = false,
  'aria-label': ariaLabel,
  className,
  style,
  xstyle,
  ref,
  ...rest
}: AppLauncherMenuProps) {
  const override = useComponentOverride('AppLauncherMenu');
  const isControlled = apps !== undefined;

  const [internalApps, setInternalApps] = useState<AppLauncherItem[]>(() =>
    dedupeById(defaultApps ?? DEFAULT_LAUNCHER_APPS)
  );
  const [activeCategory, setActiveCategory] =
    useState<AppLauncherCategory>('pinned');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const currentApps = useMemo<ReadonlyArray<AppLauncherItem>>(
    () => (isControlled ? dedupeById(apps) : internalApps),
    [isControlled, apps, internalApps]
  );

  const currentRecentDocs = useMemo<ReadonlyArray<AppLauncherRecentDoc>>(
    () => dedupeById(recentDocs ?? DEFAULT_RECENT_DOCS),
    [recentDocs]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const isSearching = normalizedQuery.length > 0;
  const activeCategorySpec = getCategorySpec(activeCategory);

  const visibleApps = useMemo<ReadonlyArray<AppLauncherItem>>(
    () =>
      currentApps.filter(
        (app) =>
          matchesCategory(app, activeCategory) &&
          matchesLinearQuery(normalizedQuery, [
            app.name,
            app.category,
            app.badge ?? '',
          ])
      ),
    [currentApps, activeCategory, normalizedQuery]
  );

  const visibleRecentDocs = useMemo<ReadonlyArray<AppLauncherRecentDoc>>(
    () =>
      currentRecentDocs.filter((doc) =>
        matchesLinearQuery(normalizedQuery, [
          doc.title,
          doc.appName,
          doc.openedAt,
        ])
      ),
    [currentRecentDocs, normalizedQuery]
  );

  const isAppsEmpty = visibleApps.length === 0;
  const resolvedAriaLabel = ariaLabel?.trim() || DEFAULT_ARIA_LABEL;
  const displayUserName = userName.trim() || DEFAULT_USER_NAME;
  const displayUserRole = userRole.trim() || DEFAULT_USER_ROLE;
  const userInitials = getUserInitials(displayUserName);

  const handleCategorySelect = useCallback(
    (category: AppLauncherCategory) => {
      const spec = getCategorySpec(category);
      const count = currentApps.filter(
        (app) =>
          matchesCategory(app, category) &&
          matchesLinearQuery(normalizedQuery, [
            app.name,
            app.category,
            app.badge ?? '',
          ])
      ).length;
      setActiveCategory(category);
      setStatusMessage(
        `Showing ${spec.label} (${count} ${count === 1 ? 'app' : 'apps'}).`
      );
    },
    [currentApps, normalizedQuery]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setStatusMessage('Cleared search query.');
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Escape' && searchQuery.length > 0) {
        event.preventDefault();
        setSearchQuery('');
        setStatusMessage('Cleared search query.');
      }
    },
    [searchQuery]
  );

  const handleLaunchApp = useCallback(
    (app: AppLauncherItem) => {
      const displayName = getDisplayAppName(app);
      setStatusMessage(`Launched ${displayName}.`);
      onLaunchApp?.(app);
    },
    [onLaunchApp]
  );

  const handleLaunchKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>, app: AppLauncherItem) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleLaunchApp(app);
      }
    },
    [handleLaunchApp]
  );

  const handleTogglePin = useCallback(
    (app: AppLauncherItem) => {
      const nextPinned = !app.pinned;
      const displayName = getDisplayAppName(app);
      if (!isControlled) {
        setInternalApps((prev) =>
          prev.map((entry) =>
            entry.id === app.id ? { ...entry, pinned: nextPinned } : entry
          )
        );
      }
      setStatusMessage(
        nextPinned ? `Pinned ${displayName}.` : `Unpinned ${displayName}.`
      );
      onTogglePin?.(app.id, nextPinned);
    },
    [isControlled, onTogglePin]
  );

  const handleOpenRecent = useCallback(
    (doc: AppLauncherRecentDoc) => {
      const title = getDisplayDocTitle(doc);
      const sourceApp = doc.appName.trim() || 'Application';
      setStatusMessage(`Opened ${title} in ${sourceApp}.`);
      onOpenRecent?.(doc);
    },
    [onOpenRecent]
  );

  const handleRecentKeyDown = useCallback(
    (
      event: ReactKeyboardEvent<HTMLButtonElement>,
      doc: AppLauncherRecentDoc
    ) => {
      if (event.nativeEvent.isComposing) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOpenRecent(doc);
      }
    },
    [handleOpenRecent]
  );

  const handlePowerAction = useCallback(
    (action: AppLauncherPowerAction, label: string) => {
      setStatusMessage(`Power action: ${label}.`);
      onPowerAction?.(action);
    },
    [onPowerAction]
  );

  const defaultStatusText = `Showing ${visibleApps.length} ${visibleApps.length === 1 ? 'application' : 'applications'} in ${activeCategorySpec.label}.`;
  const liveStatusText = statusMessage ?? defaultStatusText;

  const merged = mergeProps({
    themeTarget: themeProps('app-launcher-menu', {
      category: activeCategory,
      disabled,
      empty: isAppsEmpty,
      searching: isSearching,
      appCount: visibleApps.length,
    }),
    baseClassName: cx(
      'prism-slab w-full min-w-0 max-w-full p-4 sm:p-5 flex flex-col gap-4',
      disabled && 'opacity-75'
    ),
    overrideClassName: override?.className,
    userClassName: className,
    overrideStyle: override?.style,
    xstyle,
    userStyle: style,
  });


  return (
    <div
      ref={ref}
      role="region"
      aria-label={resolvedAriaLabel}
      aria-disabled={disabled ? 'true' : undefined}
      {...rest}
      {...merged}
    >
      {/* Top Search & Category Bar */}
      <header
        data-part="header"
        className={cx(
          headerClass,
          'flex flex-col gap-3 min-w-0 max-w-full'
        )}
      >
        <div
          data-part="search-bar"
          className={cx(
            searchBarClass,
            'prism-well rounded-full px-3.5 py-2 flex flex-wrap items-center gap-2 min-w-0 max-w-full'
          )}
          style={{
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          <Search
            aria-hidden="true"
            className="w-4 h-4 shrink-0"
            style={STYLE_TEXT_SECONDARY}
          />
          <input
            type="search"
            aria-label="Search applications and recent files"
            placeholder="Search apps, categories, or recent files…"
            value={searchQuery}
            disabled={disabled}
            onChange={
              disabled
                ? undefined
                : (event) => {
                    setSearchQuery(event.target.value);
                    setStatusMessage(null);
                  }
            }
            onKeyDown={disabled ? undefined : handleSearchKeyDown}
            className={cx(
              searchInputClass,
              'prism-focus-ring flex-1 min-w-0 rounded-md bg-transparent text-sm outline-none disabled:cursor-not-allowed'
            )}
            style={STYLE_TEXT_PRIMARY}
          />
          {searchQuery.length > 0 ? (
            <button
              type="button"
              aria-label="Clear search"
              disabled={disabled}
              onClick={disabled ? undefined : handleClearSearch}
              className="prism-crystal prism-focus-ring w-6 h-6 rounded-full inline-flex items-center justify-center shrink-0 cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
              style={STYLE_TEXT_SECONDARY}
            >
              <X aria-hidden="true" className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="Application categories"
          data-part="category-bar"
          className={cx(
            categoryBarClass,
            'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full'
          )}
        >
          {LAUNCHER_CATEGORIES.map((categorySpec) => {
            const isSelected = activeCategory === categorySpec.id;
            const categoryCount = currentApps.filter((app) =>
              matchesCategory(app, categorySpec.id)
            ).length;

            return (
              <button
                key={categorySpec.id}
                type="button"
                aria-pressed={isSelected}
                disabled={disabled}
                data-category={categorySpec.id}
                data-active={isSelected ? 'true' : undefined}
                onClick={
                  disabled
                    ? undefined
                    : () => handleCategorySelect(categorySpec.id)
                }
                className={cx(
                  categoryPillClass,
                  'prism-focus-ring rounded-full px-3 py-1.5 inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap transition-[color,background-color,border-color,opacity,transform] cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                  isSelected
                    ? 'prism-btn-primary'
                    : 'prism-crystal enabled:hover:brightness-105'
                )}
                style={
                  isSelected
                    ? undefined
                    : STYLE_TEXT_PRIMARY
                }
              >
                <span>{categorySpec.label}</span>
                <span
                  aria-hidden="true"
                  className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-full"
                  style={
                    isSelected
                      ? {
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-primary-contrast) 22%, transparent)',
                          color: 'var(--prism-primary-contrast)',
                        }
                      : {
                          backgroundColor:
                            'color-mix(in srgb, var(--prism-text-secondary) 14%, transparent)',
                          color: 'var(--prism-text-secondary)',
                        }
                  }
                >
                  {categoryCount}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Installed Applications Grid */}
      <section
        aria-label={activeCategorySpec.heading}
        data-part="apps-section"
        className={cx(
          appsSectionClass,
          'flex flex-col gap-2.5 min-w-0 max-w-full'
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <h3
            className="text-xs font-semibold uppercase tracking-[0.06em]"
            style={STYLE_TEXT_SECONDARY}
          >
            {activeCategorySpec.heading}
          </h3>
          <span
            data-testid="app-launcher-visible-count"
            className="text-[11px] font-mono tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {visibleApps.length} {visibleApps.length === 1 ? 'app' : 'apps'}
          </span>
        </div>

        {isAppsEmpty ? (
          <div
            role="status"
            data-part="empty"
            data-testid="app-launcher-empty"
            className={cx(
              emptyClass,
              'prism-well rounded-2xl px-4 py-8 text-center flex flex-col items-center justify-center gap-2 min-w-0 max-w-full'
            )}
            style={{
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--prism-well-border)',
            }}
          >
            <span
              aria-hidden="true"
              className="prism-crystal w-10 h-10 rounded-2xl inline-flex items-center justify-center"
              style={STYLE_TEXT_SECONDARY}
            >
              <LayoutGrid className="w-5 h-5" />
            </span>
            <p
              className="text-sm font-semibold"
              style={STYLE_TEXT_PRIMARY}
            >
              No matching applications
            </p>
            <p
              className="text-xs max-w-sm break-words"
              style={STYLE_TEXT_SECONDARY}
            >
              {isSearching
                ? `No applications match "${searchQuery.trim()}" in ${activeCategorySpec.label}.`
                : activeCategory === 'pinned'
                  ? 'No pinned applications yet. Switch to All Apps to pin your favorites.'
                  : `No installed applications in ${activeCategorySpec.label}.`}
            </p>
            {isSearching ? (
              <button
                type="button"
                disabled={disabled}
                onClick={disabled ? undefined : handleClearSearch}
                className="prism-crystal prism-focus-ring mt-1 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
                style={STYLE_PRIMARY_MAIN}
              >
                Reset search
              </button>
            ) : activeCategory !== 'all' && currentApps.length > 0 ? (
              <button
                type="button"
                disabled={disabled}
                onClick={
                  disabled ? undefined : () => handleCategorySelect('all')
                }
                className="prism-crystal prism-focus-ring mt-1 rounded-full px-3 py-1 text-xs font-semibold cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed"
                style={STYLE_PRIMARY_MAIN}
              >
                Browse All Apps
              </button>
            ) : null}
          </div>
        ) : (
          <div
            role="list"
            aria-label="Installed applications"
            data-part="apps-grid"
            data-testid="app-launcher-grid"
            className={cx(
              appsGridClass,
              'grid grid-cols-2 sm:grid-cols-4 gap-2.5 min-w-0 max-w-full'
            )}
          >
            {visibleApps.map((app) => {
              const displayName = getDisplayAppName(app);
              const tone: AppLauncherTone = app.tone ?? 'primary';
              const accentVar = getToneAccentVar(tone);
              const trimmedBadge = app.badge?.trim() ?? '';

              return (
                <div
                  key={app.id}
                  role="listitem"
                  data-part="app-tile"
                  data-testid={`app-launcher-tile-${app.id}`}
                  data-app-id={app.id}
                  data-category={app.category}
                  data-pinned={app.pinned ? 'true' : 'false'}
                  data-tone={tone}
                  className={cx(
                    appTileClass,
                    'prism-crystal rounded-2xl p-2.5 flex flex-col gap-2 min-w-0 max-w-full'
                  )}
                  style={{
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: app.pinned
                      ? `color-mix(in srgb, ${accentVar} 34%, var(--prism-divider))`
                      : 'var(--prism-divider)',
                  }}
                >
                  <div className="flex items-center justify-between gap-1.5 min-w-0">
                    {trimmedBadge.length > 0 ? (
                      <span
                        data-part="app-badge"
                        className={cx(
                          appBadgeClass,
                          'rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide truncate max-w-[70%]'
                        )}
                        style={{
                          color: accentVar,
                          backgroundColor: `color-mix(in srgb, ${accentVar} 14%, transparent)`,
                          borderWidth: '1px',
                          borderStyle: 'solid',
                          borderColor: `color-mix(in srgb, ${accentVar} 30%, transparent)`,
                        }}
                      >
                        {trimmedBadge}
                      </span>
                    ) : (
                      <span aria-hidden="true" className="h-4" />
                    )}

                    <button
                      type="button"
                      aria-label={
                        app.pinned
                          ? `Unpin ${displayName}`
                          : `Pin ${displayName}`
                      }
                      aria-pressed={app.pinned}
                      disabled={disabled}
                      data-part="app-pin-btn"
                      data-testid={`app-launcher-pin-${app.id}`}
                      onClick={
                        disabled ? undefined : () => handleTogglePin(app)
                      }
                      className={cx(
                        appPinBtnClass,
                        'prism-focus-ring w-7 h-7 rounded-full inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed'
                      )}
                      style={{
                        color: app.pinned
                          ? 'var(--prism-primary-main)'
                          : 'var(--prism-text-secondary)',
                        backgroundColor: app.pinned
                          ? 'color-mix(in srgb, var(--prism-primary-main) 16%, transparent)'
                          : 'color-mix(in srgb, var(--prism-text-secondary) 10%, transparent)',
                      }}
                    >
                      {app.pinned ? (
                        <PinOff aria-hidden="true" className="w-3.5 h-3.5" />
                      ) : (
                        <Pin aria-hidden="true" className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    aria-label={`Launch ${displayName}`}
                    disabled={disabled}
                    data-part="app-launch-btn"
                    data-testid={`app-launcher-launch-${app.id}`}
                    onClick={disabled ? undefined : () => handleLaunchApp(app)}
                    onKeyDown={
                      disabled
                        ? undefined
                        : (event) => handleLaunchKeyDown(event, app)
                    }
                    className={cx(
                      appLaunchBtnClass,
                      'prism-focus-ring w-full min-w-0 rounded-xl p-1 flex flex-col items-start gap-2 text-left cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      data-part="app-icon"
                      className={cx(
                        appIconClass,
                        'w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0'
                      )}
                      style={{
                        color: accentVar,
                        background: `linear-gradient(145deg, color-mix(in srgb, ${accentVar} 24%, var(--prism-crystal-top)) 0%, color-mix(in srgb, ${accentVar} 10%, var(--prism-crystal-bottom)) 100%)`,
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        borderColor: `color-mix(in srgb, ${accentVar} 34%, var(--prism-divider))`,
                      }}
                    >
                      {renderAppGlyph(app)}
                    </span>

                    <span className="flex flex-col min-w-0 w-full">
                      <span
                        className="text-xs font-semibold truncate w-full"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {displayName}
                      </span>
                      <span
                        className="text-[10px] capitalize truncate w-full"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {app.category}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent Documents Section */}
      <section
        aria-label="Recent documents"
        data-part="recent-section"
        className={cx(
          recentSectionClass,
          'pt-3 border-t flex flex-col gap-2 min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
          <h3
            className="text-xs font-semibold uppercase tracking-[0.06em]"
            style={STYLE_TEXT_SECONDARY}
          >
            Recent Documents
          </h3>
          <span
            data-testid="app-launcher-recent-count"
            className="text-[11px] font-mono tabular-nums"
            style={STYLE_TEXT_SECONDARY}
          >
            {visibleRecentDocs.length}{' '}
            {visibleRecentDocs.length === 1 ? 'file' : 'files'}
          </span>
        </div>

        {visibleRecentDocs.length === 0 ? (
          <p
            data-testid="app-launcher-recent-empty"
            className="prism-well rounded-xl px-3.5 py-2.5 text-xs min-w-0 break-words"
            style={{
              color: 'var(--prism-text-secondary)',
              borderWidth: '1px',
              borderStyle: 'solid',
              borderColor: 'var(--prism-well-border)',
            }}
          >
            {isSearching
              ? `No recent documents match "${searchQuery.trim()}".`
              : 'No recent documents available.'}
          </p>
        ) : (
          <div
            role="list"
            aria-label="Recent documents list"
            data-part="recent-list"
            data-testid="app-launcher-recent-list"
            className={cx(
              recentListClass,
              'grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0 max-w-full'
            )}
          >
            {visibleRecentDocs.map((doc) => {
              const title = getDisplayDocTitle(doc);
              const sourceApp = doc.appName.trim() || 'Application';
              const openedAt = doc.openedAt.trim() || 'Recently';

              return (
                <div key={doc.id} role="listitem" className="min-w-0 max-w-full">
                  <button
                    type="button"
                    aria-label={`Open ${title} (${sourceApp}, ${openedAt})`}
                    disabled={disabled}
                    data-part="recent-row"
                    data-testid={`app-launcher-recent-${doc.id}`}
                    onClick={disabled ? undefined : () => handleOpenRecent(doc)}
                    onKeyDown={
                      disabled
                        ? undefined
                        : (event) => handleRecentKeyDown(event, doc)
                    }
                    className={cx(
                      recentRowClass,
                      'prism-well prism-focus-ring w-full rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-left min-w-0 max-w-full cursor-pointer enabled:hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                    style={{
                      borderWidth: '1px',
                      borderStyle: 'solid',
                      borderColor: 'var(--prism-well-border)',
                    }}
                  >
                    <span className="inline-flex items-center gap-2 min-w-0 flex-1">
                      <FileText
                        aria-hidden="true"
                        className="w-4 h-4 shrink-0"
                        style={STYLE_INFO_MAIN}
                      />
                      <span
                        className="text-xs font-medium truncate"
                        style={STYLE_TEXT_PRIMARY}
                      >
                        {title}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 shrink-0 max-w-full">
                      <span
                        className="prism-crystal rounded-full px-2 py-0.5 text-[10px] font-medium truncate max-w-[8rem]"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        {sourceApp}
                      </span>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-mono tabular-nums whitespace-nowrap"
                        style={STYLE_TEXT_SECONDARY}
                      >
                        <Clock aria-hidden="true" className="w-3 h-3 shrink-0" />
                        <span>{openedAt}</span>
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* User & Power Control Footer */}
      <footer
        data-part="footer"
        className={cx(
          footerClass,
          'pt-3 border-t flex flex-col gap-2.5 min-w-0 max-w-full'
        )}
        style={STYLE_BORDER_DIVIDER}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 min-w-0 max-w-full">
          <div
            data-part="user-card"
            className={cx(
              userCardClass,
              'inline-flex items-center gap-2.5 min-w-0 max-w-full'
            )}
          >
            <span
              aria-hidden="true"
              data-part="user-avatar"
              data-testid="app-launcher-avatar"
              className={cx(
                userAvatarClass,
                'prism-btn-primary w-9 h-9 rounded-full inline-flex items-center justify-center text-xs font-bold shrink-0'
              )}
            >
              {userInitials}
            </span>
            <div className="flex flex-col min-w-0">
              <span
                data-testid="app-launcher-user-name"
                className="text-xs font-semibold truncate"
                style={STYLE_TEXT_PRIMARY}
              >
                {displayUserName}
              </span>
              <span
                data-testid="app-launcher-user-role"
                className="text-[11px] truncate"
                style={STYLE_TEXT_SECONDARY}
              >
                {displayUserRole}
              </span>
            </div>
          </div>

          <div
            role="group"
            aria-label="Power controls"
            data-part="power-controls"
            className={cx(
              powerControlsClass,
              'flex flex-wrap items-center gap-1.5 min-w-0 max-w-full'
            )}
          >
            {POWER_CONTROLS.map((control) => {
              const accentVar = getToneAccentVar(control.tone);
              const isShutdown = control.action === 'shutdown';

              return (
                <button
                  key={control.action}
                  type="button"
                  disabled={disabled}
                  data-part="power-btn"
                  data-power-action={control.action}
                  data-testid={`app-launcher-power-${control.action}`}
                  onClick={
                    disabled
                      ? undefined
                      : () => handlePowerAction(control.action, control.label)
                  }
                  className={cx(
                    powerBtnClass,
                    'prism-crystal prism-focus-ring rounded-full px-2.5 py-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer enabled:hover:brightness-105 disabled:opacity-45 disabled:cursor-not-allowed'
                  )}
                  style={{
                    color: isShutdown
                      ? 'var(--prism-error-main)'
                      : 'var(--prism-text-primary)',
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: isShutdown
                      ? 'color-mix(in srgb, var(--prism-error-main) 34%, var(--prism-divider))'
                      : 'var(--prism-divider)',
                  }}
                >
                  <span style={{ color: accentVar }}>
                    {renderPowerIcon(control.action)}
                  </span>
                  <span>{control.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="prism-well rounded-xl px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] min-w-0 max-w-full"
          style={{
            color: 'var(--prism-text-secondary)',
            borderWidth: '1px',
            borderStyle: 'solid',
            borderColor: 'var(--prism-well-border)',
          }}
        >
          <span
            role={isAppsEmpty ? undefined : 'status'}
            aria-live="polite"
            aria-atomic="true"
            data-part="status"
            data-testid="app-launcher-status"
            className={cx(statusClass, 'truncate min-w-0 flex-1')}
          >
            {liveStatusText}
          </span>
          <span className="font-mono text-[10px] whitespace-nowrap shrink-0">
            Esc Clear Search · Enter Launch
          </span>
        </div>
      </footer>
    </div>
  );
}

export const AppLauncherMenu = /*#__PURE__*/ memoWithDisplayName(AppLauncherMenuInner, 'AppLauncherMenu');
