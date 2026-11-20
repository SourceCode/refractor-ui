import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCode,
  Folder,
  FolderOpen,
  Plus,
  X,
} from 'lucide-react';
import {
  buildMonthGrid,
  CalendarEventItem,
  formatFileSize,
  getChildrenNodes,
  ProjectRecord,
  SortDirection,
  VfsNode,
} from '../../system/storage';

/* 1. Card (Includes exact iridescent optical crystal slab from bottom-left of reference) */
export interface PrismCardProps {
  title?: string;
  kicker?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  specimenSlab?: boolean;
  className?: string;
}

export const PrismCard: React.FC<PrismCardProps> = ({
  title,
  kicker,
  children,
  footer,
  specimenSlab = false,
  className = '',
}) => {
  if (specimenSlab) {
    return (
      <div
        className={`prism-slab relative h-44 w-full max-w-[260px] p-5 flex flex-col justify-between overflow-hidden select-none ${className}`}
      >
        {/* Sweeping glossy top-left optical reflection arc */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-10 -left-10 w-52 h-32 rounded-[40%] bg-gradient-to-br from-white/85 via-white/30 to-transparent -rotate-12"
        />
        {/* Subtle left & bottom chromatic edge dispersion */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-4 left-1.5 w-2 rounded-full bg-gradient-to-b from-sky-300/40 via-violet-300/25 to-amber-300/45 blur-[2px]"
        />
        <span />
        <div className="flex justify-end">
          <span className="text-base font-medium text-slate-800 dark:text-slate-100 tracking-[-0.01em]">
            {title || 'Card'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <article className={`prism-slab p-5 flex flex-col justify-between gap-4 ${className}`}>
      <div>
        {kicker && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{kicker}</div>
        )}
        {title && (
          <h4 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h4>
        )}
        {children && (
          <div className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {children}
          </div>
        )}
      </div>
      {footer && (
        <div className="pt-3 border-t border-slate-300/40 dark:border-slate-700/50 flex items-center justify-between gap-3">
          {footer}
        </div>
      )}
    </article>
  );
};

/* 2. Data Table / Grid */
export interface DataTableProps {
  rows: ProjectRecord[];
  sortBy: keyof ProjectRecord;
  sortDir: SortDirection;
  onSortChange: (col: keyof ProjectRecord) => void;
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  rows,
  sortBy,
  sortDir,
  onSortChange,
  selectedIds,
  onToggleSelect,
}) => {
  const renderHeader = (col: keyof ProjectRecord, label: string, alignRight = false) => {
    const active = sortBy === col;
    return (
      <th
        scope="col"
        className={`px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 ${
          alignRight ? 'text-right' : 'text-left'
        }`}
      >
        <button
          type="button"
          onClick={() => onSortChange(col)}
          className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white cursor-pointer ${
            alignRight ? 'ml-auto' : ''
          }`}
        >
          <span>{label}</span>
          {active &&
            (sortDir === 'asc' ? (
              <ArrowUp className="w-3 h-3 text-orange-500" />
            ) : (
              <ArrowDown className="w-3 h-3 text-orange-500" />
            ))}
        </button>
      </th>
    );
  };

  return (
    <div className="prism-slab overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="border-b border-slate-300/50 dark:border-slate-700/60 bg-white/30 dark:bg-white/[0.03]">
            <tr>
              <th scope="col" className="w-10 px-3.5 py-2.5 text-left">
                <span className="sr-only">Select row</span>
              </th>
              {renderHeader('id', 'ID')}
              {renderHeader('project', 'Component Track')}
              {renderHeader('owner', 'Lead')}
              {renderHeader('status', 'State')}
              {renderHeader('completion', 'Progress', true)}
              {renderHeader('budgetUsd', 'Allocation', true)}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/40">
            {rows.map((row) => {
              const checked = selectedIds.includes(row.id);
              return (
                <tr
                  key={row.id}
                  className={`h-11 transition-colors ${
                    checked
                      ? 'bg-emerald-500/10'
                      : 'hover:bg-white/45 dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <td className="px-3.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      aria-label={`Select ${row.project}`}
                      onChange={() => onToggleSelect(row.id)}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                  </td>
                  <td className="px-3.5 font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {row.id}
                  </td>
                  <td className="px-3.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {row.project}
                  </td>
                  <td className="px-3.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                    {row.owner}
                  </td>
                  <td className="px-3.5 text-xs font-medium whitespace-nowrap">
                    <span
                      className={
                        row.status === 'Active'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : row.status === 'Review'
                            ? 'text-amber-700 dark:text-amber-400'
                            : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-3.5 text-right font-mono text-xs tabular-nums text-slate-700 dark:text-slate-200">
                    {row.completion}%
                  </td>
                  <td className="px-3.5 text-right font-mono text-xs tabular-nums text-slate-800 dark:text-slate-100">
                    ${row.budgetUsd.toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* 3. List */
export interface PrismListItem {
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  leading?: React.ReactNode;
  actionLabel?: string;
}

export interface PrismListProps {
  items: PrismListItem[];
  onItemAction?: (item: PrismListItem) => void;
}

export const PrismList: React.FC<PrismListProps> = ({ items, onItemAction }) => {
  return (
    <ul className="prism-slab divide-y divide-slate-300/45 dark:divide-slate-700/50 overflow-hidden">
      {items.map((item) => (
        <li
          key={item.id}
          className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            {item.leading && (
              <span className="prism-crystal w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-200">
                {item.leading}
              </span>
            )}
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                {item.title}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {item.subtitle}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {item.meta && (
              <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {item.meta}
              </span>
            )}
            {item.actionLabel && onItemAction && (
              <button
                type="button"
                onClick={() => onItemAction(item)}
                className="prism-btn-secondary h-8 px-3.5 text-xs font-medium cursor-pointer"
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
};

/* 4. Avatar */
export interface AvatarProps {
  src?: string;
  alt: string;
  initials: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'squircle';
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt,
  initials,
  size = 'md',
  shape = 'circle',
}) => {
  const [imgError, setImgError] = useState(false);

  const dims =
    size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-14 h-14 text-base' : 'w-11 h-11 text-sm';
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl';

  return (
    <div
      className={`prism-crystal ${dims} ${radius} p-0.5 inline-flex items-center justify-center overflow-hidden shrink-0`}
    >
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover ${radius}`}
        />
      ) : (
        <span
          aria-label={alt}
          className={`prism-btn-cobalt w-full h-full ${radius} flex items-center justify-center font-semibold tracking-tight`}
        >
          {initials}
        </span>
      )}
    </div>
  );
};

/* 5. Badge / Status Dot */
export interface BadgeStatusProps {
  label: string;
  count?: number;
  tone?: 'online' | 'warning' | 'offline' | 'counter';
}

export const BadgeStatus: React.FC<BadgeStatusProps> = ({
  label,
  count,
  tone = 'online',
}) => {
  const dotClass =
    tone === 'online'
      ? 'bg-emerald-500'
      : tone === 'warning'
        ? 'bg-amber-500'
        : tone === 'offline'
          ? 'bg-slate-400'
          : 'bg-orange-500';

  return (
    <span className="prism-crystal rounded-full px-3.5 py-1.5 inline-flex items-center gap-2 text-xs font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
      {count !== undefined ? (
        <span className="prism-btn-primary h-5 min-w-5 px-1.5 rounded-full inline-flex items-center justify-center text-[11px] font-mono tabular-nums font-semibold">
          {count}
        </span>
      ) : (
        <span aria-hidden="true" className={`w-2 h-2 rounded-full ${dotClass}`} />
      )}
      <span>{label}</span>
    </span>
  );
};

/* 6. Tag / Chip */
export interface TagChipProps {
  label: string;
  selected?: boolean;
  onSelect?: () => void;
  onDismiss?: () => void;
}

export const TagChip: React.FC<TagChipProps> = ({
  label,
  selected = false,
  onSelect,
  onDismiss,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 h-8 pl-3.5 ${
        onDismiss ? 'pr-2' : 'pr-3.5'
      } rounded-full text-xs font-medium whitespace-nowrap transition-all ${
        selected
          ? 'prism-emerald text-white'
          : 'prism-crystal text-slate-800 dark:text-slate-100'
      }`}
    >
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          aria-pressed={selected}
          className="cursor-pointer focus:outline-none"
        >
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      {onDismiss && (
        <button
          type="button"
          aria-label={`Remove ${label} filter`}
          onClick={onDismiss}
          className="w-4 h-4 rounded-full inline-flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/15 cursor-pointer"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
};

/* 7. Accordion / Collapsible Panel */
export interface AccordionItem {
  id: string;
  title: string;
  body: string;
}

export interface AccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

export const Accordion: React.FC<AccordionProps> = ({ items, allowMultiple = false }) => {
  const [openIds, setOpenIds] = useState<string[]>([items[0]?.id ?? '']);

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      return allowMultiple ? [...prev, id] : [id];
    });
  };

  return (
    <div className="space-y-2.5 w-full">
      {items.map((item) => {
        const expanded = openIds.includes(item.id);
        return (
          <div key={item.id} className="prism-slab overflow-hidden">
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => toggle(item.id)}
              className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left cursor-pointer"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {item.title}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-slate-500 transition-transform duration-150 shrink-0 ${
                  expanded ? 'rotate-180' : ''
                }`}
              />
            </button>
            {expanded && (
              <div className="px-5 pb-4 pt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-slate-700/50">
                {item.body}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/* 8. Carousel / Media Slider */
export interface CarouselSlide {
  id: string;
  title: string;
  caption: string;
  imageSrc: string;
}

export interface CarouselSliderProps {
  slides: CarouselSlide[];
}

export const CarouselSlider: React.FC<CarouselSliderProps> = ({ slides }) => {
  const [index, setIndex] = useState(0);
  const [failedIds, setFailedIds] = useState<Record<string, boolean>>({});
  const current = slides[index] ?? slides[0];

  if (!current) return null;

  const prev = () => setIndex((i) => (i - 1 + slides.length) % slides.length);
  const next = () => setIndex((i) => (i + 1) % slides.length);

  return (
    <div className="prism-slab p-3 space-y-3">
      <div className="relative aspect-16/9 rounded-[18px] overflow-hidden bg-gradient-to-br from-slate-200 via-sky-100 to-amber-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800">
        {!failedIds[current.id] ? (
          <img
            src={current.imageSrc}
            alt={current.title}
            referrerPolicy="no-referrer"
            onError={() => setFailedIds((f) => ({ ...f, [current.id]: true }))}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm font-medium text-slate-600 dark:text-slate-300">
            {current.title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent flex flex-col justify-end p-5">
          <h4 className="text-base font-semibold text-white">{current.title}</h4>
          <p className="text-xs text-white/85 mt-0.5">{current.caption}</p>
        </div>

        <button
          type="button"
          aria-label="Previous slide"
          onClick={prev}
          className="prism-crystal absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-slate-900 dark:text-white cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          aria-label="Next slide"
          onClick={next}
          className="prism-crystal absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center text-slate-900 dark:text-white cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
          Slide {index + 1} of {slides.length}
        </span>
        <div className="flex items-center gap-1.5">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setIndex(idx)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === index ? 'w-6 bg-orange-500' : 'w-2 bg-slate-400/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

/* 9. Tree View */
export interface TreeViewProps {
  nodes: VfsNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: VfsNode) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
}) => {
  const [expandedIds, setExpandedIds] = useState<string[]>([
    'dir-root-design',
    'dir-root-components',
    'dir-buttons',
  ]);

  const toggleFolder = (id: string) => {
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const renderBranch = (parentId: string | null, depth: number): React.ReactNode => {
    const children = getChildrenNodes(nodes, parentId);
    if (children.length === 0) return null;

    return (
      <ul role={depth === 0 ? 'tree' : 'group'} className="space-y-0.5">
        {children.map((node) => {
          const isFolder = node.type === 'folder';
          const isOpen = expandedIds.includes(node.id);
          const isSelected = selectedNodeId === node.id;

          return (
            <li key={node.id} role="treeitem" aria-expanded={isFolder ? isOpen : undefined}>
              <button
                type="button"
                onClick={() => {
                  onSelectNode(node);
                  if (isFolder) toggleFolder(node.id);
                }}
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                className={`w-full pr-3 py-1.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors ${
                  isSelected
                    ? 'prism-emerald text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-200 hover:bg-white/55 dark:hover:bg-white/10'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  {isFolder ? (
                    isOpen ? (
                      <FolderOpen className="w-4 h-4 shrink-0 text-amber-500" />
                    ) : (
                      <Folder className="w-4 h-4 shrink-0 text-amber-500" />
                    )
                  ) : (
                    <FileCode className="w-4 h-4 shrink-0 opacity-80" />
                  )}
                  <span className="truncate">{node.name}</span>
                </span>
                {node.sizeBytes !== undefined && (
                  <span
                    className={`font-mono tabular-nums text-[11px] shrink-0 ${
                      isSelected ? 'text-white/90' : 'text-slate-400'
                    }`}
                  >
                    {formatFileSize(node.sizeBytes)}
                  </span>
                )}
              </button>
              {isFolder && isOpen && renderBranch(node.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return <div className="prism-slab p-3">{renderBranch(null, 0)}</div>;
};

/* 10. Timeline */
export interface TimelineEntry {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  tone?: 'emerald' | 'amber' | 'cobalt';
}

export interface TimelineProps {
  entries: TimelineEntry[];
}

export const Timeline: React.FC<TimelineProps> = ({ entries }) => {
  return (
    <ol className="prism-slab p-5 space-y-5">
      {entries.map((entry, idx) => {
        const markerClass =
          entry.tone === 'emerald'
            ? 'prism-emerald'
            : entry.tone === 'cobalt'
              ? 'prism-btn-cobalt'
              : 'prism-btn-primary';

        return (
          <li key={entry.id} className="relative flex items-start gap-4">
            {idx < entries.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-3.5 top-7 -bottom-5 w-px bg-slate-300/70 dark:bg-slate-700"
              />
            )}
            <span
              className={`${markerClass} w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-mono tabular-nums text-white shrink-0`}
            >
              {idx + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {entry.title}
                </span>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
                  {entry.timestamp}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                {entry.detail}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

/* 11. Calendar View */
export interface CalendarViewProps {
  events: CalendarEventItem[];
  onAddEvent?: (dateIso: string, title: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onAddEvent }) => {
  const [selectedDate, setSelectedDate] = useState('2026-11-20');
  const [draftTitle, setDraftTitle] = useState('');
  const cells = buildMonthGrid(2026, 10);
  const selectedEvents = events.filter((e) => e.dateIso === selectedDate);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim() || !onAddEvent) return;
    onAddEvent(selectedDate, draftTitle.trim());
    setDraftTitle('');
  };

  return (
    <div className="prism-slab p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">November 2026</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a date cell to inspect or schedule milestones
          </p>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-600 dark:text-slate-300">
          {events.length} scheduled
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-500">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.slice(0, 35).map((cell) => {
          const dayEvents = events.filter((ev) => ev.dateIso === cell.dateIso);
          const isSelected = cell.dateIso === selectedDate;
          return (
            <button
              key={cell.dateIso}
              type="button"
              onClick={() => setSelectedDate(cell.dateIso)}
              className={`min-h-[54px] p-1.5 rounded-2xl text-left flex flex-col justify-between cursor-pointer transition-all ${
                isSelected
                  ? 'prism-btn-primary text-white'
                  : cell.inCurrentMonth
                    ? 'prism-well text-slate-800 dark:text-slate-100 hover:brightness-98'
                    : 'opacity-40 text-slate-400'
              }`}
            >
              <span className="text-xs font-mono tabular-nums font-medium relative z-10">
                {cell.dayOfMonth}
              </span>
              {dayEvents.length > 0 && (
                <span
                  className={`text-[10px] truncate px-1 rounded relative z-10 ${
                    isSelected
                      ? 'bg-white/25 text-white'
                      : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-medium'
                  }`}
                >
                  {dayEvents[0].title}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="pt-3 border-t border-slate-300/45 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs">
          <span className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-100">
            {selectedDate}:
          </span>{' '}
          {selectedEvents.length === 0 ? (
            <span className="text-slate-500">No events scheduled</span>
          ) : (
            <span className="text-slate-700 dark:text-slate-200">
              {selectedEvents.map((e) => `${e.title} (${e.timeLabel})`).join(' · ')}
            </span>
          )}
        </div>

        {onAddEvent && (
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="New milestone..."
              aria-label="New calendar milestone"
              className="prism-well h-8 px-3 rounded-full text-xs text-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Add milestone"
              className="prism-btn-secondary h-8 px-3 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

/* 12. Charts & Graphs (Bar, Line, and Donut optical visualizations) */
export interface ChartPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

export interface OpticalChartsProps {
  data: ChartPoint[];
}

export const OpticalCharts: React.FC<OpticalChartsProps> = ({ data }) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'donut'>('bar');
  const [activeIdx, setActiveIdx] = useState<number>(0);

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;

  return (
    <div className="prism-slab p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
            Component Adoption Telemetry
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            Focused metric: {data[activeIdx]?.label} · {data[activeIdx]?.value.toLocaleString()} imports/wk
          </p>
        </div>
        <div className="prism-crystal p-1 rounded-full inline-flex gap-1">
          {(['bar', 'line', 'donut'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setChartType(mode)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize cursor-pointer ${
                chartType === mode
                  ? 'prism-well text-slate-900 dark:text-white font-semibold'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {chartType === 'bar' && (
        <div className="h-44 flex items-end justify-between gap-3 pt-4 px-2">
          {data.map((pt, idx) => {
            const heightPct = Math.max(12, Math.round((pt.value / maxVal) * 100));
            const selected = idx === activeIdx;
            return (
              <button
                key={pt.label}
                type="button"
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => setActiveIdx(idx)}
                className="flex-1 h-full flex flex-col justify-end items-center gap-2 group cursor-pointer focus:outline-none"
              >
                <span className="text-[11px] font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {pt.value}
                </span>
                <div className="w-full max-w-[44px] flex-1 flex items-end">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full rounded-t-2xl rounded-b-lg transition-all duration-200 ${
                      selected ? 'prism-btn-primary' : 'prism-emerald opacity-80 group-hover:opacity-100'
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate max-w-full">
                  {pt.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {chartType === 'line' && (
        <div className="h-44 w-full pt-2">
          <svg viewBox="0 0 400 140" className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="prismAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#27bd93" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#27bd93" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            {(() => {
              const stepX = data.length > 1 ? 360 / (data.length - 1) : 360;
              const points = data.map((d, i) => ({
                x: 20 + i * stepX,
                y: 115 - (d.value / maxVal) * 90,
                label: d.label,
              }));
              const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');
              const area = `20,120 ${polyline} ${points[points.length - 1]?.x ?? 380},120`;
              return (
                <>
                  <polygon points={area} fill="url(#prismAreaGrad)" />
                  <polyline
                    fill="none"
                    stroke="#169c78"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={polyline}
                  />
                  {points.map((p, idx) => (
                    <g
                      key={p.label}
                      className="cursor-pointer"
                      onClick={() => setActiveIdx(idx)}
                      onMouseEnter={() => setActiveIdx(idx)}
                    >
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={idx === activeIdx ? 6 : 4.5}
                        fill={idx === activeIdx ? '#e75c24' : '#ffffff'}
                        stroke="#169c78"
                        strokeWidth="2.5"
                      />
                      <text
                        x={p.x}
                        y={135}
                        textAnchor="middle"
                        className="fill-slate-600 dark:fill-slate-300 text-[10px]"
                      >
                        {p.label}
                      </text>
                    </g>
                  ))}
                </>
              );
            })()}
          </svg>
        </div>
      )}

      {chartType === 'donut' && (
        <div className="h-44 flex items-center justify-center gap-8">
          <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
            {(() => {
              let cumulative = 0;
              const colors = ['#e75c24', '#22b58b', '#0ea5e9', '#f59e0b', '#6366f1', '#14b8a6'];
              const circumference = 2 * Math.PI * 42;
              return data.map((d, idx) => {
                const frac = d.value / total;
                const dash = frac * circumference;
                const offset = -cumulative * circumference;
                cumulative += frac;
                return (
                  <circle
                    key={d.label}
                    cx="60"
                    cy="60"
                    r="42"
                    fill="transparent"
                    stroke={colors[idx % colors.length]}
                    strokeWidth={idx === activeIdx ? '18' : '14'}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={offset}
                    className="cursor-pointer transition-all"
                    onClick={() => setActiveIdx(idx)}
                  />
                );
              });
            })()}
          </svg>
          <div className="space-y-1.5 text-xs">
            {data.map((d, idx) => (
              <button
                key={d.label}
                type="button"
                onClick={() => setActiveIdx(idx)}
                className={`flex items-center justify-between gap-4 w-40 px-2.5 py-1 rounded-lg cursor-pointer ${
                  idx === activeIdx ? 'prism-well font-semibold' : ' opacity-80'
                }`}
              >
                <span className="text-slate-800 dark:text-slate-100">{d.label}</span>
                <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                  {Math.round((d.value / total) * 100)}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
