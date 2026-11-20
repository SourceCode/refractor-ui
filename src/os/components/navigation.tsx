import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Command,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';

/* 1. Top Navigation Bar */
export interface NavLinkItem {
  id: string;
  label: string;
}

export interface TopNavBarProps {
  brand: string;
  links: NavLinkItem[];
  activeLinkId: string;
  onSelectLink: (id: string) => void;
  onSearchClick?: () => void;
  userInitials?: string;
}

export const TopNavBar: React.FC<TopNavBarProps> = ({
  brand,
  links,
  activeLinkId,
  onSelectLink,
  onSearchClick,
  userInitials = 'CV',
}) => {
  return (
    <nav
      aria-label="Demo Top Navigation Bar"
      className="prism-crystal rounded-full px-5 py-2.5 flex items-center justify-between gap-6 w-full"
    >
      <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0">
        {brand}
      </span>

      <div className="hidden sm:flex items-center gap-5 text-xs font-medium">
        {links.map((link) => {
          const active = link.id === activeLinkId;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onSelectLink(link.id)}
              className={`whitespace-nowrap shrink-0 cursor-pointer transition-colors py-1 ${
                active
                  ? 'text-orange-600 dark:text-orange-400 font-semibold underline underline-offset-4'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onSearchClick && (
          <button
            type="button"
            aria-label="Quick search"
            onClick={onSearchClick}
            className="prism-well h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search</span>
          </button>
        )}
        <span
          aria-label="Signed in user"
          className="prism-btn-cobalt w-8 h-8 rounded-full inline-flex items-center justify-center text-xs font-semibold"
        >
          {userInitials}
        </span>
      </div>
    </nav>
  );
};

/* 2. Sidebar / Navigation Drawer */
export interface DrawerNavItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface SidebarDrawerProps {
  title: string;
  items: DrawerNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
  collapsible?: boolean;
}

export const SidebarDrawer: React.FC<SidebarDrawerProps> = ({
  title,
  items,
  activeId,
  onSelect,
  collapsible = true,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      aria-label={title}
      className={`prism-slab p-3 transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}
    >
      <div className="flex items-center justify-between px-2 py-1.5 mb-2">
        {!collapsed && (
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
            {title}
          </span>
        )}
        {collapsible && (
          <button
            type="button"
            aria-label={collapsed ? 'Expand navigation drawer' : 'Collapse navigation drawer'}
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-white/10 cursor-pointer"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
      <div className="space-y-1">
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-2xl text-xs font-medium cursor-pointer transition-all ${
                active
                  ? 'prism-btn-primary text-white'
                  : 'text-slate-700 dark:text-slate-200 hover:bg-white/55 dark:hover:bg-white/10'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0 relative z-10">
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                {!collapsed && <span className="truncate">{item.label}</span>}
              </span>
              {!collapsed && item.count !== undefined && (
                <span
                  className={`relative z-10 tabular-nums text-[11px] ${
                    active ? 'text-white/90' : 'text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};

/* 3. Tabs (Includes exact "⇕ Tabs" crystal pill specimen + full interactive tab bar) */
export interface TabItem {
  id: string;
  label: string;
  content?: React.ReactNode;
}

export interface PrismTabsProps {
  tabs: TabItem[];
  activeTabId: string;
  onChange: (id: string) => void;
  showSpecimenPill?: boolean;
}

export const PrismTabs: React.FC<PrismTabsProps> = ({
  tabs,
  activeTabId,
  onChange,
  showSpecimenPill = false,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  const cycleNextTab = () => {
    const idx = tabs.findIndex((t) => t.id === activeTabId);
    const next = tabs[(idx + 1) % tabs.length];
    if (next) onChange(next.id);
  };

  return (
    <div className="space-y-3 w-full">
      <div className="flex flex-wrap items-center gap-3">
        {showSpecimenPill && (
          <button
            type="button"
            onClick={cycleNextTab}
            aria-label="Cycle active tab"
            className="prism-crystal h-12 px-6 rounded-full inline-flex items-center gap-3 text-[15px] font-medium text-slate-800 dark:text-slate-100 cursor-pointer hover:-translate-y-0.5 transition-transform"
          >
            <ChevronsUpDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Tabs</span>
          </button>
        )}

        <div
          role="tablist"
          aria-label="Content views"
          className="prism-crystal p-1 rounded-full inline-flex items-center gap-1 overflow-x-auto max-w-full"
        >
          {tabs.map((tab) => {
            const active = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onChange(tab.id)}
                className={`h-9 px-4 rounded-full text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer transition-all ${
                  active
                    ? 'prism-well text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab?.content && (
        <div role="tabpanel" className="prism-slab p-4 text-sm text-slate-700 dark:text-slate-200">
          {activeTab.content}
        </div>
      )}
    </div>
  );
};

/* 4. Breadcrumbs */
export interface BreadcrumbCrumb {
  id: string;
  label: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbCrumb[];
  onNavigate: (id: string) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, onNavigate }) => {
  return (
    <nav aria-label="Breadcrumb" className="prism-crystal rounded-full px-4 py-2 inline-flex items-center">
      <ol className="flex items-center gap-2 text-xs">
        {items.map((crumb, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={crumb.id} className="inline-flex items-center gap-2">
              {isLast ? (
                <span
                  aria-current="page"
                  className="font-semibold text-slate-900 dark:text-white whitespace-nowrap"
                >
                  {crumb.label}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.id)}
                    className="text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {crumb.label}
                  </button>
                  <span aria-hidden="true" className="text-slate-400">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

/* 5. Pagination */
export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="inline-flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Previous page"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="prism-crystal w-9 h-9 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {pages.map((p) => {
        const active = p === currentPage;
        return (
          <button
            key={p}
            type="button"
            aria-label={`Page ${p}`}
            aria-current={active ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={`w-9 h-9 rounded-full text-xs font-mono tabular-nums font-medium cursor-pointer transition-transform ${
              active
                ? 'prism-btn-primary text-white font-semibold'
                : 'prism-crystal text-slate-700 dark:text-slate-200 hover:-translate-y-0.5'
            }`}
          >
            <span className="relative z-10">{p}</span>
          </button>
        );
      })}

      <button
        type="button"
        aria-label="Next page"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="prism-crystal w-9 h-9 rounded-full inline-flex items-center justify-center text-slate-700 dark:text-slate-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </nav>
  );
};

/* 6. Stepper */
export interface StepDefinition {
  id: string;
  title: string;
  subtitle?: string;
}

export interface StepperProps {
  steps: StepDefinition[];
  activeStepIndex: number;
  onStepClick?: (index: number) => void;
}

export const Stepper: React.FC<StepperProps> = ({ steps, activeStepIndex, onStepClick }) => {
  return (
    <ol className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
      {steps.map((step, index) => {
        const completed = index < activeStepIndex;
        const current = index === activeStepIndex;

        return (
          <li key={step.id} className="flex items-center gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => onStepClick?.(index)}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-mono tabular-nums font-semibold shrink-0 cursor-pointer ${
                completed
                  ? 'prism-emerald text-white'
                  : current
                    ? 'prism-btn-primary text-white'
                    : 'prism-crystal text-slate-600 dark:text-slate-300'
              }`}
            >
              <span className="relative z-10">
                {completed ? <Check className="w-4 h-4 stroke-[2.6]" /> : index + 1}
              </span>
            </button>
            <div className="min-w-0">
              <div
                className={`text-xs font-semibold truncate ${
                  current
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {step.title}
              </div>
              {step.subtitle && (
                <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {step.subtitle}
                </div>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                aria-hidden="true"
                className={`hidden sm:block flex-1 h-0.5 rounded-full mx-2 ${
                  completed ? 'bg-emerald-500/70' : 'bg-slate-300/70 dark:bg-slate-700'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
};

/* 7. Command Palette (Cmd+K / Ctrl+K) */
export interface CommandPaletteItem {
  id: string;
  label: string;
  group: string;
  shortcut?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, items }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const filtered = items.filter(
    (item) => item.label.toLowerCase().includes(q) || item.group.toLowerCase().includes(q)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/35 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="prism-slab w-full max-w-xl p-3 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="prism-well rounded-full h-12 px-4 flex items-center gap-3">
          <Command className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to any of the 46 components or run a theme command..."
            aria-label="Filter commands"
            className="w-full bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-mono text-slate-500 hover:text-slate-800 dark:hover:text-white px-2 py-0.5 rounded-md border border-slate-300/60 dark:border-slate-700 cursor-pointer"
          >
            ESC
          </button>
        </div>

        <div className="mt-2 max-h-80 overflow-y-auto divide-y divide-slate-200/50 dark:divide-slate-700/40">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching components or commands for "{query}"
            </div>
          ) : (
            <div className="py-1 space-y-0.5">
              {filtered.slice(0, 18).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    item.onSelect();
                    onClose();
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl flex items-center justify-between text-left hover:bg-white/65 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div>
                    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {item.label}
                    </span>
                    <span className="mx-2 text-slate-400">·</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{item.group}</span>
                  </div>
                  {item.shortcut && (
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
